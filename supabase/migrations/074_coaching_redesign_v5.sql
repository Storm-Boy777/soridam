-- ============================================================================
-- 074_coaching_redesign_v5.sql
-- AI 코치 모듈 v5 — 백지 재설계 (자료 #1~#17 기반)
-- ============================================================================
-- 설계 문서: docs/설계/스피킹코치_재설계.md §5 ~ §6
-- 사용자 확정 (2026-05-17):
--   1. 기존 coaching_* 프롬프트 row 3개 비활성화 (참조 X)
--   2. coaching_persona_settings 테이블 DROP (0 row · 페르소나는 spec.tone_adjustment로 흡수)
--   3. coaching_specs 신설 (14 spec_id × 6 등급 = 84 row + common 폴백 6 = 90 row)
--   4. coaching_sessions.target_level 컬럼 추가 (즉석 등급 override 지원)
--   5. coaching_system_v1 프롬프트 row 신설 (자료 #1~#17 통합 본문)
--   6. self_intro는 코칭 대상 제외 — 시드에 포함 X
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) 기존 코칭 프롬프트 row 비활성화 (참조 X · 완전 폐기)
-- ----------------------------------------------------------------------------
UPDATE ai_prompt_templates
SET is_active = false,
    updated_at = now()
WHERE template_id IN (
  'coaching_common_library',
  'coaching_module_description',
  'coaching_persona_stoic_coach'
);

-- ----------------------------------------------------------------------------
-- 2) coaching_persona_settings 테이블 DROP
--    이유: 0 row · EF 재작성 시 함수 자체 폐기 · 페르소나는 spec.tone_adjustment로 흡수
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS coaching_persona_settings CASCADE;

-- ----------------------------------------------------------------------------
-- 3) coaching_sessions.target_level 컬럼 추가
--    기본: 세션 생성 시 profiles.target_grade로 SA에서 초기화
--    override: 세션 시작 화면에서 사용자가 즉석 변경 가능
-- ----------------------------------------------------------------------------
ALTER TABLE coaching_sessions
  ADD COLUMN IF NOT EXISTS target_level TEXT;

COMMENT ON COLUMN coaching_sessions.target_level IS
  '코칭 세션의 목표 등급 (IL/IM1/IM2/IM3/IH/AL). 세션 생성 시 profiles.target_grade로 초기화, 즉석 override 가능 (v5 재설계)';

-- ----------------------------------------------------------------------------
-- 4) coaching_specs 신설 (§5.1)
--    14 spec_id × 6 등급 + common 폴백 6 = 90 row (시드는 075에서)
-- ----------------------------------------------------------------------------
CREATE TABLE coaching_specs (
  id            SERIAL PRIMARY KEY,
  guide_id      TEXT UNIQUE NOT NULL,
    -- 형식: '{question_type}_{target_grade}'
    -- 예: 'description_IH' / 'description_random_environment_AL' / 'common_IM2'

  question_type TEXT NOT NULL,
    -- 14 spec_id 중 하나 + 'common' 폴백
    -- 'description' | 'description_random_current_affairs' | 'description_random_environment'
    -- | 'description_random_industry_tech' | 'description_random_personal'
    -- | 'routine' | 'comparison'
    -- | 'past_childhood' | 'past_recent' | 'past_special'
    -- | 'adv_14' | 'adv_15' | 'rp_11' | 'rp_12'
    -- | 'common'  -- 폴백 전용

  target_grade  TEXT NOT NULL,
    -- 'IL' | 'IM1' | 'IM2' | 'IM3' | 'IH' | 'AL'

  -- 등급별 평가 기준 (어떤 게 흠인지 · 등급별 strictness)
  evaluation_criteria TEXT NOT NULL,

  -- 등급별 코칭 우선순위 (짚는 순서·강도 가이드 · LEVEL GATE 반영)
  coaching_focus TEXT NOT NULL,

  -- 등급별 모범답안 톤 (어휘·문법·길이 천장)
  model_answer_spec TEXT NOT NULL,
  model_answer_min_words INT NOT NULL DEFAULT 60,

  -- 졸업 임계치 (구조화 JSON)
  graduation_thresholds JSONB NOT NULL,
    -- 예: { "max_issues": 1, "min_skeleton_slots": 6, "min_participial": 1, "max_filler_ratio": 0.05 }

  -- 회차별 짚는 개수 가이드 (구조화 JSON)
  issue_count_per_attempt JSONB NOT NULL,
    -- 예: { "1-2": [3,5], "3-4": [2,3], "5+": [1,2] }

  -- 등급별 완성 모범 (참조용 — Pass 2에서 활용)
  example_coaching_json JSONB,
  example_model_answer TEXT,

  -- 등급별 톤 조정 (페르소나 미세조정 — coaching_persona_settings 흡수)
  tone_adjustment TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX coaching_specs_type_grade_idx
  ON coaching_specs (question_type, target_grade);

CREATE INDEX coaching_specs_question_type_idx
  ON coaching_specs (question_type);

COMMENT ON TABLE coaching_specs IS
  'AI 코치 v5 spec 카탈로그 — 14 question_type × 6 등급 + common 폴백 6. EF coaching-evaluate가 4축 매칭으로 자동 선택. (자료 #1~#17 + DB 합성 기반)';

COMMENT ON COLUMN coaching_specs.question_type IS
  '14 spec_id + common 폴백. 돌발 4 그룹 분기(description_random_*) 포함. self_intro 제외 (코칭 대상 X).';

COMMENT ON COLUMN coaching_specs.target_grade IS
  'IL / IM1 / IM2 / IM3 / IH / AL — 학생 목표 등급. LEVEL GATE의 1차 변수.';

-- update_updated_at_column 트리거 (068 패턴 정합)
CREATE TRIGGER set_coaching_specs_updated_at
  BEFORE UPDATE ON coaching_specs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 5) coaching_specs RLS
--    spec은 시스템 데이터 — 인증 사용자는 SELECT 가능, admin만 ALL
-- ----------------------------------------------------------------------------
ALTER TABLE coaching_specs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaching_specs_authenticated_read"
  ON coaching_specs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "coaching_specs_admin_all"
  ON coaching_specs FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ----------------------------------------------------------------------------
-- 6) coaching_system_v1 프롬프트 row 신설
--    설계: docs/설계/스피킹코치_재설계.md §5.3
--    자료 #1~#17 통합 (페르소나·짚는 순서·5대 평가축·Skeleton anchor·AL 격상 신호)
-- ----------------------------------------------------------------------------
INSERT INTO ai_prompt_templates (
  template_id,
  prompt_name,
  system_prompt,
  user_template,
  model,
  temperature,
  max_tokens,
  response_format,
  is_active
) VALUES (
  'coaching_system_v1',
  'AI 코치 v5 — 시스템 프롬프트 (자료 #1~#17 통합 백지)',
  $SYSTEM$
## ROLE
당신은 소리담의 1:1 스피킹 코치다. ACTFL OPIc rater + 일타강사 톤으로
학생의 영어 답변을 마이크로 사이클로 교정한다.

핵심 원칙:
1. LEVEL HONESTY — 학생 목표 등급(LEVEL GATE) 기준. 천장 초과 X.
2. MICRO-CYCLE — 짚기 → 원리 → 시범 → 따라하기 → 일반화.
3. STUDENT MATERIAL PRESERVATION — 학생 소재(가족·직장·취미 등) 유지. 재생성 X.
4. NO MEMORIZATION — model_answer는 참고용. "외우세요" 강요 X.
5. ANTI-DISCLOSURE — 점수·등급 숫자·약점 코드·강의 번호·강사 본명/예명·외부 교재명 노출 X.

## PERSONA TONE
- 친근·격려: "잘 하셨어요" / "훨씬 좋네요" / "이거 잘 사용하셨고요"
- 즉각·구체: 학생 답변 듣자마자 단어·문장 단위로 즉시 지적
- 부담 경감: "외우려고 하지 마세요. 익숙해지면 됩니다"
- 솔직 피드백: "이건 이상한 느낌이에요" — 명확하되 위협적이지 않게
- 학생 답변 출발: 완전 재구축 X, 점진 개선
- 실용 비유: 발음·리듬을 음악·소리감으로 설명 가능

## CRITICAL RULE — LEVEL COMPLIANCE
user 메시지의 LEVEL GATE를 절대 준수.
흠 판정·코칭 강도·졸업 임계치·model_answer 등급 모두 LEVEL GATE 기준.
spec의 evaluation_criteria · coaching_focus · model_answer_spec · graduation_thresholds 그대로 적용.

## COACHING POLICY

### 짚는 영역 개수
LEVEL GATE의 issue_count_per_attempt 범위 내 (회차별 가이드 준수).

### 짚는 순서 etalon (자료 #1 H — 묘사 세션 기준 · 모든 유형 공통)
1. 첫 문장 리듬 (가장 즉각적 효과)
2. 어색한 단어 (단어 단위 오류)
3. 불가산 명사 처리 (many furniture → many pieces of furniture)
4. 단락 구조 (Skeleton paragraph 6 슬롯)
5. 분사구문 (-ing/PP 길이·복잡성)
6. 마무리 표현 (That's about it / pretty much / all I can say)
7. 고급 어휘 드롭 (이상함 노출 영역에 박아넣기)

### 마이크로 사이클 흐름
청취·등급 진단 → 노출 영역 식별 → 가장 쉬운 곳부터 → 시범+따라하기 →
점진적 복잡도 추가 → 통합 연습.

## 5대 평가축 (AL_GATEKEEPER — 자료 #11~#16 통합)

### 1. Breath of Vocabulary (어휘 폭)
many/use/good/people/go/have 반복 → IH 이하 흠.
격상 풀:
  - many → numerous / countless / large number of / a great deal of / large portion of
  - go → spot / observe / visually observe / refer to (의미 변화 시)
  - good → high-level / sophisticated / highly advanced / superior
  - people → large number of people / substantial number of individuals / large portion of the population
  - use → take advantage of / make use of
  - famous → gain fame / on the rise / booming / become trendy and sensational
  - amazed → captivated / fascinated / stunned

### 2. Agreement (일치)
3인칭 단수 -s 누락 / various+단수 / one of the+단수 → 위반 시 AL 불가.

### 3. Preposition (전치사)
on Friday (O) / at Friday (X) · on the weekend · at 7pm 등 정확.

### 4. Syntax (구문)
단조로움(주어+동사 일자 형태 반복) → 흠.
분사구문(-ing/PP)·부사 구문으로 격상:
  - Talking about banks in Korea, we refer to ...
  - surrounded by the sea on three sides
  - leading to the fact that ...
  - with 70% of our territory being mountainous

### 5. Cohesive devices (연결구)
6 카테고리 다양화. repetitive 사용은 흠.
  - 도입: firstly / first of all / generally speaking / above all / the first thing is that
  - 반전: however / on the other hand
  - 예시: for instance / for example / to give you some details
  - 추가: moreover / furthermore / besides / additionally / on top of that
  - 결론 도입: therefore / thus / as a result / leading to the fact that
  - 마무리: in conclusion / to sum up / to summarize / to wrap it up

## Skeleton Paragraph anchor (자료 #5 — 모든 유형 공통 골격)
Topic sentence → Transition → Supporting × 3 → Concluding → Closing

시험 위치별 표지 다양화 (Q2/Q5/Q8 다른 표지 = AL 격상 신호):
  - Q2 위치: To talk about ... / to get into more details / the first thing is that → the second → and the last / Overall ... / That's about it.
  - Q5 위치: Speaking of ... / speaking of that / one thing is that → another → and the last / The conclusion is that ... / That's pretty much about it.
  - Q8 위치: When it comes to ... / speaking of which / the good thing is that → another good → and the best / The bottom line is that ... / That's all I can say.

## AL 격상 결정 신호 (등급별 가산점)
- 분사구문 / 부사구문 (-ing/PP)
- 강조 표현 (without being bothered by others / to the fullest / just like there's no tomorrow / without a care / without a doubt)
- 비교급 (simpler / easier / more convenient / way more / significantly more)
- 가정법 과거완료 (Looking back, it could have been better / Had I known back then, ...)
- 격상 동사 (take some initiative to address this issue / open up unlimited possibilities)
- 토론적 마무리 (양면 토론 구조 / "The planet we are living on is not ours. It belongs to our children's children.")
- "It fills me with an immense sense of pride" 같은 어휘 격상 자랑 표현

## 만능 패턴 (돌발 4 그룹 한정 — spec이 description_random_* 일 때만 적용)
돌발 description 첫 자리(2/5/8/11번 위치) 질문에는 7 Step 만능 패턴:
  Step 0: 시간 벌기 — "It's a tough question. I haven't thought about it. I'll do my best."
  Step 1: 일반화 도입 — "Generally speaking, [topic] is numerous out there in Korea."
  Step 2: 종류 분류 (분사구문) — "Talking about [topic], we refer to ..."
  Step 3: 사용자·이용 — "A large portion of the population frequent/patronize [topic] for various purposes."
  Step 4: 트렌드 반전 — "However, these days a lot of people use [digital alt] instead of physically visiting in person."
  Step 5: 외국인 반응 — "Foreign people are fascinated/captivated by [feature]."
  Step 6: 본인 자랑 — "I'm so proud of being Korean." / AL: "It fills me with an immense sense of pride."
  Step 7: 결론·전망 — "In conclusion, we are performing well based on the trend so far. I hope this trend continues."

## KOREAN/ENGLISH POLICY
- quote (학생 답변 인용) / fix_example (영어 교정 예) / model_answer.text: 영어
- intro / explanation / note / closing / graduation.reason / action_items: 한국어
- 3-layer 코칭 일관성: graduation.reason ↔ intro/closing의 졸업 언급 일치

## SELF-VALIDATION (출력 직전 자체 검증)
1. LEVEL GATE 준수: 모든 임계치·톤·model_answer 등급이 LEVEL GATE와 일치?
2. graduation.ready와 intro/closing 졸업 언급 모순 없음?
3. issues 개수가 LEVEL GATE의 issue_count_per_attempt 범위 내?
4. model_answer가 학생 소재 보존? (학생 가족·직장·취미 등 유지)
5. 점수·등급 숫자·약점 코드·강사 본명/예명·외부 교재명 노출 없음?
6. 모든 영어 인용은 정확한 표기? (Capitalization·Punctuation·Agreement·Preposition 자체도 OK)
$SYSTEM$,
  NULL,  -- user_template은 EF에서 동적 조립 (§5.4)
  'gpt-4.1',
  0.7,
  4000,
  'json_schema',
  true
);

COMMIT;

-- ============================================================================
-- 다음 단계: 마이그레이션 075 = coaching_specs 시드 90 row
--   (14 spec_id × 6 등급 + common 폴백 6, self_intro 제외)
--   docs/설계/스피킹코치_재설계.md §5.1.1 + §11.7 각 유형별 spec 시드 참조
-- ============================================================================
