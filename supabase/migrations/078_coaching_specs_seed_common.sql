-- ============================================================================
-- 078_coaching_specs_seed_common.sql
-- common × 6 등급 시드 — 등급별 공통 코칭 헌법 SSOT
-- ============================================================================
-- 통합 소스:
--   §11.4.2 ACTFL FACT 4축 등급별 요건 (Functions/Text Type/Accuracy/Strategies)
--   §11.5.6 평가엔진 등급 변별 핵심 신호 (74 체크박스 → 등급 경계 신호)
--   §5.9 LEVEL GATE 매트릭스 (강사 정의 등급별 발화 패턴)
--   자료 #5 Q1 (IL/IM1/IM2/IM3/IH/AL 발화 패턴)
--   자료 #1 (페르소나·짚는 순서 etalon)
--   자료 #11~#16 (5대 AL 평가축·만능 패턴)
--   자료 #15·#16·#17 (AL 격상 신호 — 분사·강조·비교급·가정법·토론적 마무리)
--
-- 역할:
--   common_{등급} = 모든 유형 코칭이 자기 등급 base로 참조하는 SSOT
--   유형별 spec(description/routine/comparison/past_*/adv_*/rp_*)은 common 위에 차별 요소만
--
-- EF 흐름 (다음 단계):
--   resolveSpecId(question) → (유형 spec_id) + common 같은 등급 두 row fetch
--   → User Prompt 조립 시 둘 다 주입 (Layer 2 common base + Layer 3 유형 차별)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- common_IL — Intermediate Low
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'common_IL',
  'common',
  'IL',
  $EVAL$
[IL 공통 평가 기준 — ACTFL Intermediate Low + 평가엔진 정합]
- ACTFL FACT (§11.4.2):
  * Functions: 한정 비복잡 과업, 반응적(reactive). 단순 정보 교환·기본 생존 영역.
  * Text Type: **개별 단순 문장**. Short sentences. 자가 정정/반복/망설임 잦음.
  * Accuracy: 학습자 익숙한 청자가 이해 가능. 발음·어휘·구문 다른 언어 영향 강함.
  * Communication Strategies: 질문/clarification 요청/자가 정정.
- 평가엔진 정합 (§11.5.6):
  * IL 결정 신호: INT 통과율 ≥65%, INT-1-1~3 (어휘·청해·문장수준) 일부 pass.
- 흠 (강도):
  * 시제 혼선 [강] / 주어 부재 [강] / 단어만 나열 (불완전 문장) [강]
- 흠 (약 — IL 코칭 X):
  * Skeleton 부재 / Cohesive devices 부재 / 어휘 폭 부족 / 분사구문 부재 / 격상 어휘 부재
  → IL 단계에서 격상 요소 강요 X. 단순 문장으로 의사소통 가능하면 통과.
$EVAL$,
  $FOCUS$
[IL 공통 코칭 우선순위 — 모든 유형 적용]

★ ACTFL IL은 "단순 문장으로 의사소통 가능"이 목표. 단락·격상은 다음 등급(IM1+).

**1순위 (의무 짚기)**
1. **완전 문장 발화** (주어+동사+목적어 — 단어 나열 X)
2. **단순 현재 시제 일관성** (과거/현재 혼선 X)
3. **자기 환경 묘사 단어 1~3개 영어로** (가족/집/일/취미 등)

**2순위 (격려용)**
4. 한국어 친숙 단어를 영어로 매끄럽게 (식당=restaurant, 공원=park 등)
5. clarification 요청 표현 ("Could you say that again?" 같은 1문장)

**격려 중심 톤** — 자료 #1 페르소나:
- "잘 시작하셨어요. 한 문장씩 완성해보세요."
- "외우려고 하지 마세요. 자신의 이야기로 한 문장씩 만들면 됩니다."
- 한 번에 많이 짚지 X. 1~2개만 짚고 시범+따라하기.

**짚지 말 것** (격상 요소 강요 금지):
- Skeleton 6 슬롯 / Cohesive devices / 분사구문 / 격상 어휘 / 비교급 / 가정법
$FOCUS$,
  $SPEC$
[IL 공통 model_answer 톤]
- ACTFL Text Type: 개별 단순 문장. 6~10 문장 (60~80 단어).
- 어휘: 단순 일상 어휘 (apartment / family / room / TV / like / comfortable). High-frequency만.
- 문법: 단순 현재 시제 위주. I am / I have / I like / We go.
- 구조: Skeleton 강요 X. 자연스러운 나열 OK. 단 시제·주어 일관성 필수.
- 금지: 분사구문 / 비교급 / 격상 어휘(numerous/captivated) / 가정법 / 부사구문
$SPEC$,
  60,
  '{"max_issues":2,"min_skeleton_slots":0,"max_filler_ratio":0.15,"require_consistent_tense":true,"require_complete_sentences":true}'::jsonb,
  '{"1-2":[2,4],"3-4":[2,3],"5+":[1,2]}'::jsonb,
  NULL,
  $TONE$
[IL 공통 톤 — 격려 중심·부담 경감]
- ACTFL "Low" sublevel = "baseline 안정" (§11.4.3) — 다음 등급 entering 신호는 짚지 X
- 칭찬 → 한 가지 짚기 → 시범 → 따라하기 → 칭찬
- "잘 시작하셨어요" / "외우지 마세요. 자기 이야기로"
- 등급·점수·약점 코드 노출 일절 X
$TONE$
);

-- ----------------------------------------------------------------------------
-- common_IM1 — Intermediate Mid (한국 OPIc 하위)
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'common_IM1',
  'common',
  'IM1',
  $EVAL$
[IM1 공통 평가 기준 — ACTFL IM + 평가엔진 정합]
- ACTFL FACT (§11.4.2): IM1/IM2/IM3 셋 다 ACTFL Intermediate Mid 단일. 한국 OPIc 세분.
  * Functions: 다양한 비복잡 직설 social/transactional. 정보·지시·가격·서비스 등 다양한 질문 생성.
  * Text Type: **Strings of sentences** (sentence-level → 짧은 연속 문장). 망설임/재구성 잦음.
  * Accuracy: High-frequency vocab. 익숙한 구조.
  * Communication Strategies: 질문 생성 / clarification / circumlocution (모르는 어휘 우회).
- 평가엔진 정합 (§11.5.6):
  * IL→IM1 결정 신호: INT ≥65%, INT-2-2 (some sentences) 시도 출현.
- IM1 변별 (한국 OPIc 운영 §11.4.2):
  * Strings of sentences 가끔 끊김 / 자가 정정 잦음 / 발화량 짧음 / 어휘 반복 多 (good/really/like).
- 흠 (강도):
  * 시제 혼선 [강] / 3인칭 단수 -s 누락 [강] / 빈도 부사 전무 [중] / 어휘 반복 [중]
- 흠 (약): Skeleton 미흡 / Cohesive 부재 / 분사구문 부재
$EVAL$,
  $FOCUS$
[IM1 공통 코칭 우선순위 — 모든 유형 적용]

★ ACTFL IM 진입 baseline. Strings of sentences로 안정.

**1순위 (의무 짚기)**
1. **빈도 부사 도입** (usually / sometimes / always / often / every day)
2. **격상 어휘 1~2개** (good → nice/great / many → a lot of / live → spend time)
3. **3인칭 단수 -s 정확** (My mom cooks / She likes)
4. **자가 정정 줄이기** — "I... I mean..." 같은 망설임 ½로

**2순위 (격려용)**
5. 가족·이웃 emphasis 표현 1개 (Family is important / I love my neighbors)
6. circumlocution 1회 (모르는 어휘 우회 — "the thing that you use to write" 같은 1회)
7. Topic sentence 베타 (My house is in Seoul)

**짚지 말 것**:
- 단락 구조 / Cohesive 6 카테고리 / 격상 어휘 풀(numerous/captivated) / 분사구문 / 비교급 / 가정법
$FOCUS$,
  $SPEC$
[IM1 공통 model_answer 톤]
- ACTFL Text Type: Strings of sentences. 8~12 문장 (80~110 단어).
- 어휘: 일상 어휘 + 빈도 부사 2~3개 + 기본 격상 어휘 1~2개 (a lot of / nice / spend time)
- 문법: 단순 현재 + 빈도 부사 위치 정확. 3인칭 단수 -s 정확. 단순과거 일부 OK.
- 구조: 자연스러운 나열 OK. Topic sentence 베타 시도 가능 (My house is ...).
- 금지: 복잡한 분사 구문 / 비교급 / 격상 어휘 풀(numerous/captivated) / 가정법
$SPEC$,
  80,
  '{"max_issues":2,"min_skeleton_slots":0,"min_freq_adverbs":2,"max_filler_ratio":0.12,"require_consistent_tense":true}'::jsonb,
  '{"1-2":[2,4],"3-4":[2,3],"5+":[1,2]}'::jsonb,
  NULL,
  $TONE$
[IM1 공통 톤 — 격려 + 한 가지 격상 시범]
- "이거 한 번 따라해볼래요? 'usually'만 넣어도 훨씬 자연스러워요."
- "내용은 자신의 이야기로 하시면 됩니다. 외우지 마세요."
- 칭찬 → 한 가지 짚기 → 시범 → 따라하기 → 다음 도전 1개 미리 보여주기
$TONE$
);

-- ----------------------------------------------------------------------------
-- common_IM2 — Intermediate Mid (한국 OPIc 중위)
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'common_IM2',
  'common',
  'IM2',
  $EVAL$
[IM2 공통 평가 기준 — ACTFL IM 표준 + 평가엔진 정합]
- ACTFL FACT (§11.4.2): IM 공통 — Strings of sentences. 다양한 질문 생성. circumlocution.
- IM2 변별 (한국 OPIc 운영 §11.4.2):
  * Strings 안정 / 다양한 질문 답변 가능 / 어휘 반복 줄어듦 / 일부 connector 사용 (and/but/so) / IM 표준 성과.
- 평가엔진 정합 (§11.5.6): IM1→IM2 결정 = INT ≥75%, INT-2-2 안정.
- 흠 (강도):
  * 단순 문장 나열만 (묶기 부재) [강] / 시제 혼선 [강] / 단조로움 (I+동사 반복) [중] / 어휘 폭 부족 [중]
- 흠 (약): Skeleton 완성 부재 / Cohesive 다양성 부족 / 격상 어휘 부재 / 분사구문 부재
$EVAL$,
  $FOCUS$
[IM2 공통 코칭 우선순위 — 모든 유형 적용]

★ ACTFL IM 표준. Strings 안정 + Skeleton 진입 베타.

**1순위 (의무 짚기)**
1. **두 문장 묶기** (and/but/so/because — 단조로움 회피)
2. **종속절 도입** (where/when/if — where I usually relax / when I have time)
3. **어휘 격상 2~3개** (many → a lot of / good → comfortable·nice·peaceful / really → quite)
4. **Topic sentence 도입** (To talk about my house, ...)

**2순위 (격려용 / Skeleton 베타)**
5. Skeleton 4 슬롯 시도 (topic + supporting × 2 + concluding) — 강요 X, 권유 O
6. Cohesive devices 2 카테고리 베타 (firstly / and/but/so)
7. 단순 분사구문 1개 베타 (lying on the bed / watching TV — 권유만)

**짚지 말 것**:
- Skeleton 6 슬롯 완성 / 격상 어휘 풀(numerous/captivated) / 비교급 / 가정법 / 토론적 마무리
$FOCUS$,
  $SPEC$
[IM2 공통 model_answer 톤]
- ACTFL Text Type: Strings of sentences (안정) + Skeleton 4 슬롯 베타. 10~15 문장 (100~140 단어).
- 어휘: 일상 어휘 + 격상 어휘 2~3개 (comfortable / peaceful / supportive / get along well)
- 문법: 단순 현재 + 종속절(where/when) 2~3개 + and/but/so 묶기. 3인칭 -s 정확.
- 구조: Topic sentence + 자연스러운 단락. Skeleton 4 슬롯 충족 권장 (강요 X).
- 베타 허용: 단순 분사구문 1개 (lying on the bed / watching TV)
- 금지: 복잡한 비교급 / 가정법 / 격상 어휘 풀(numerous/captivated 등)
$SPEC$,
  100,
  '{"max_issues":2,"min_skeleton_slots":4,"min_subordinate_clauses":2,"max_filler_ratio":0.10,"require_consistent_tense":true}'::jsonb,
  '{"1-2":[2,4],"3-4":[2,3],"5+":[1,2]}'::jsonb,
  NULL,
  $TONE$
[IM2 공통 톤 — 격려 + 한 단락 묶기 시범]
- "이번에는 두 문장을 'and'나 'where'로 묶어볼까요?"
- "'To talk about my house' 이렇게 시작하면 단락이 자연스러워져요."
- 칭찬 → 한 가지 짚기 → 시범 → 따라하기 → IM3 진입 신호 1개 미리 보여주기
$TONE$
);

-- ----------------------------------------------------------------------------
-- common_IM3 — Intermediate Mid (한국 OPIc 상위, IH 진입 직전)
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'common_IM3',
  'common',
  'IM3',
  $EVAL$
[IM3 공통 평가 기준 — ACTFL IM 상한 + 평가엔진 정합]
- ACTFL FACT (§11.4.2): IM 공통 + IH 진입 직전 신호.
- IM3 변별 (한국 OPIc 운영 §11.4.2):
  * Strings → 단락 구조 시도 출현 (불완전하더라도) / 일부 paragraph-length 시도 / Advanced 과업(시제 다양화, 상세 묘사) 부분 성공 / IH의 breakdown features 양상 시작.
- 평가엔진 정합 (§11.5.6):
  * IM2→IM3 결정 = INT ≥95%, INT-2-3 (mostly sentences) 안정.
  * IM3→IH 결정 = ADV ≥70%(RESPOND) + Sympathetic ≥Required_at_times + ADV-2-SP3,4 (strings/connected sentences) 시도 출현.
- 흠 (강도):
  * Skeleton 부재 (sentences string 수준) [강] / 어휘 폭 부족 (many·like·have 반복) [강] / Cohesive 부재 [중] / 분사구문 부재 [중]
- 흠 (약): 위치별 표지 단조로움 / 강조 표현 부족
$EVAL$,
  $FOCUS$
[IM3 공통 코칭 우선순위 — 모든 유형 적용]

★ IM 상한 + IH 진입 직전. Skeleton paragraph 골격 도입이 결정 신호.

**1순위 (의무 짚기) — IH 진입 신호 강화**
1. **Skeleton 6 슬롯 골격 확정** (topic + transition + supporting × 3 + concluding + closing)
2. **Cohesive devices 2~3 카테고리 도입** (firstly + another + lastly + in conclusion)
3. **어휘 격상 매트릭스 시도** (many → numerous / use → take advantage of / good → comfortable·peaceful)
4. **where/whenever 부사 구문 다양화** (where I usually watch TV / whenever I have time)

**2순위 (격려용 / IH 베타)**
5. 분사구문 1~2개 시도 (lying on the bed / watching YouTube)
6. closing tag 1개 (That's about it / pretty much / all I can say)

**짚지 말 것**:
- 위치별 표지 다양화 (Q2/Q5/Q8 다른 표지 — IH·AL 신호) / 비교급 / 가정법 / 토론적 마무리 / 격상 동사 풀
$FOCUS$,
  $SPEC$
[IM3 공통 model_answer 톤]
- ACTFL Text Type: Strings → paragraph 시도. 12~18 문장 (130~170 단어).
- 어휘: 일상 + 격상 어휘 3~4개 (comfortable / peaceful / supportive / vibrant / well maintained)
- 문법: 단순 현재 + 종속절 + 분사구문 1~2개. 3인칭 단수 -s 정확.
- 구조: Skeleton 5~6 슬롯 충족 + Cohesive 2~3 카테고리.
- 위치별 표지: Q2 위치 표지 1세트 일관 사용
  (To talk about / to get into more details / the first/second/last thing is that / Overall / That's about it)
- 베타 허용: 강조 표현 1개 (without being bothered / which is my favorite thing)
- 금지: 비교급 격상 / 가정법 / 토론적 마무리
$SPEC$,
  130,
  '{"max_issues":2,"min_skeleton_slots":5,"min_cohesive_categories":2,"min_participials":1,"max_filler_ratio":0.08}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,3],"5+":[1,2]}'::jsonb,
  NULL,
  $TONE$
[IM3 공통 톤 — 격려 + Skeleton 골격 명시]
- "이제 단락으로 묶어볼 수 있어요. 'To talk about ... / first ... / another ... / last ... / Overall ...' 이 흐름만 익히면 IH로 가는 거예요."
- "단어 하나만 더 격상해볼까요? 'many' 대신 'numerous'를 써보세요."
- 칭찬 → 한 가지 짚기 → 시범 → 따라하기 → IH 신호 1개 미리 보여주기
$TONE$
);

-- ----------------------------------------------------------------------------
-- common_IH — Intermediate High (★ Skeleton 완성 등급)
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'common_IH',
  'common',
  'IH',
  $EVAL$
[IH 공통 평가 기준 — ACTFL Intermediate High + 평가엔진 정합]
- ACTFL FACT (§11.4.2):
  * Functions: Routine tasks 자신감으로 처리. Advanced 과업(서술/묘사·전 시제) 상당 부분 수행하나 항상 지속 X.
  * Text Type: **Connected discourse of paragraph length 시도 가능**. 단 breakdown features 출현.
  * Accuracy: 어휘 폭·언어 통제력 충분. pause·reformulation 감소.
  * Communication Strategies: Advanced 일부 (rephrasing, 자가 편집).
- IH 핵심 변별 (breakdown patterns — §11.4.2):
  1. 시제 일관성 무너짐 (과거 narration 중 현재 회귀)
  2. 단락 시작했으나 supporting 1~2개 후 흐름 끊김
  3. 후반부 어휘 단순화 (good/like으로 회귀)
  4. Connector 일부 사용하나 mechanical (first/second/however 반복)
  5. 묘사 → 나열로 전환
- 평가엔진 정합 (§11.5.6):
  * IM3→IH 결정 = ADV-2-SP3,4 (strings/connected sentences) 시도 출현.
  * IH→AL 결정 = ADV-2-SP5 (skeletal paragraphs) + ADV-2-CD (cohesive devices) + AL 게이트키퍼 4개 모두 pass.
- 강사 정의 (자료 #1 E): "speaking like a native speaker but not all the time" — not all the time 영역이 breakdown.
- 흠 (강도 — 자료 #1 짚는 순서 etalon 1~3순위):
  * 어휘 반복 [매우 강 — really/like/many/use 거의 항상 있음] · 1순위 짚기
  * Agreement 위반 (some of+is / 3인칭 -s) [강] · 1순위 짚기
  * 불가산 명사 (many furniture 등) [강]
  * 어색한 단어·표현 (list→listen, his all songs→all his songs) [중]
  * Cohesive repetitive (first ... first ... first 반복) [중]
  * Skeleton 슬롯 진짜 부족 [중] — ★ 학생 답변에 진짜 없을 때만
  * closing tag 부재 [중]
- 흠 (약 — IH 코칭 X · AL 베타 허용만):
  * 비교급 부재 / 가정법 부재 / 토론적 마무리 부재 (AL 전용)
  * 위치별 표지 단조로움 (Q2/Q5/Q8 — AL 신호. IH는 1세트 일관 OK)

★ STUDENT TEXT VERIFICATION: 학생 답변에 이미 있는 transition·closing·표지는 절대 부재로 잡지 X (자료 #1 정합).
$EVAL$,
  $FOCUS$
[IH 공통 코칭 우선순위 — 모든 유형 적용, 자료 #1 강사 etalon 그대로]

★ STUDENT TEXT FIRST: 학생 답변 원문을 정밀히 읽고 진짜 부재·반복만 짚을 것. 학생이 사용한 표현은 충족.

**1순위 — 단어·문장 단위 흠 (강사 etalon 1~4단계, 즉각적 효과 大)**
1. **어휘 반복·격상 매트릭스** (가장 먼저 짚을 것 — 거의 항상 있음)
   - really 반복 → genuinely / truly / incredibly / remarkably
   - like 반복 → enjoy / appreciate / be fond of / adore
   - many → numerous / countless / large number of
   - use → take advantage of / make use of
   - good → comfortable / peaceful / sophisticated / well-maintained
   - amazing/incredible 반복 → captivating / mesmerizing / unparalleled
   - people → large number of people / large portion of the population
   - famous → gain fame / on the rise / become trendy and sensational
2. **Agreement / Preposition / 불가산 명사**
   - some of + 복수는 are (is X) / one of + 복수 / 3인칭 -s
   - on Friday / on the weekend / at 7pm
   - many furniture → many pieces of furniture (advice/information/music 동일)
3. **어색한 단어·표현** — list→listen / his all songs→all his songs / makes me really comfortable→make me feel comfortable

**2순위 — 구문·표현 격상 (강사 etalon 5~6단계)**
4. **분사구문 (-ing/PP)** — When I watch → Watching / I drive listening to music / Sometimes I watch YouTube, sometimes crying, sometimes laughing
5. **강조 표현** — without being bothered by others / to the fullest / without a doubt / without a care

**3순위 — 단락 구조 (학생 답변 정확 확인 후)**
6. **closing tag 부재** — That's about it (Q2) / pretty much about it (Q5) / all I can say (Q8). ★ 학생 답변 끝에 진짜 없을 때만.
7. **Skeleton 슬롯 부족** — ★ 학생이 transition·supporting·concluding 모두 진짜 사용 안 했을 때만.

**4순위 — Cohesive 다양화 (선택)**
8. Cohesive devices 4~5 카테고리 (도입·반전·예시·추가·결론도입·마무리). first ... first ... first 반복 흠.

**짚지 말 것** (AL 베타 허용만):
- 위치별 표지 다양화 (Q2/Q5/Q8) — IH는 1세트 일관 OK
- 비교급 / 가정법 / 토론적 마무리 — AL 전용

※ **1순위 흠이 있는데 3순위만 짚으면 코칭 실패**. 학생 답변을 정밀히 읽고 어휘·Agreement부터 짚을 것. 1회차 IH 학생이면 위 항목에서 3~5개 흠을 거의 항상 찾을 수 있다.
$FOCUS$,
  $SPEC$
[IH 공통 model_answer 톤]
- ACTFL Text Type: Connected discourse of paragraph length (breakdown features 자연스럽게 포함). 15~20 문장 (160~200 단어).
- 어휘: 격상 어휘 5~6개 + 강조 표현 2~3개 + 일상 어휘
- 문법: 단순 현재 + 종속절 + 분사구문 2~3개 + 부사 구문. Agreement/Preposition 무결.
- 구조: Skeleton 6 슬롯 + Cohesive 4~5 카테고리.
- 위치별 표지: Q2 또는 Q5 위치 표지 1세트 일관 사용 (시험 위치 인식).
  - Q2: To talk about / to get into more details / the first/second/last thing is that / Overall / That's about it
  - Q5: Speaking of / speaking of that / one/another/last thing is that / The conclusion is that / That's pretty much about it
- AL 베타 허용: 비교급 1개 (more comfortable than ever) / 격상 동사 1개 (treats me really nice)
- 금지: 가정법 / 토론적 마무리 (AL 전용)
$SPEC$,
  160,
  '{"max_issues":1,"min_skeleton_slots":6,"min_cohesive_categories":4,"min_emphasis_phrases":2,"min_participials":1,"max_filler_ratio":0.06,"require_agreement":true,"require_preposition":true}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,3],"5+":[1,2]}'::jsonb,
  NULL,
  $TONE$
[IH 공통 톤 — 격려 + AL 격상 신호 미리 보여주기]
- "Skeleton 완성도 좋아요. 이제 위치별 표지만 다양화하면 AL 후보예요."
- "'first/first/first' 반복은 채점관이 흠으로 봐요. 'one/another/last'로 한 번 바꿔볼까요?"
- 칭찬 → 한 가지 짚기 → 시범 → 따라하기 → AL 격상 신호 1개 미리 보여주기
$TONE$
);

-- ----------------------------------------------------------------------------
-- common_AL — Advanced Low (★ 최고 등급)
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'common_AL',
  'common',
  'AL',
  $EVAL$
[AL 공통 평가 기준 — ACTFL Advanced Low + 평가엔진 정합]
- ACTFL FACT (§11.4.2):
  * Functions: 다양한 communication tasks. 대부분 informal + 일부 formal. **모든 주요 시제 narrate·describe with some control of aspect**.
  * Text Type: **Sentences를 연결해 paragraph-length connected discourse**. 단 narration·description 분리 처리 경향.
  * Accuracy: 의도 전달 충분 accuracy·clarity·precision.
  * Communication Strategies: **rephrasing, circumlocution**로 의사소통 유지·복구.
- AL vs IH 결정 신호 (§11.4.2):
  | 축 | IH (breakdown) | AL (sustained) |
  |---|--------------|-------------|
  | Paragraph 지속 | 끊김 | **유지** |
  | 시제 통제 | 일관성 무너짐 | **모든 시제 with some control of aspect** |
  | 복잡 상황 대응 | 어려움 | **complication·unexpected turn 대응** |
  | 어휘 breadth | 후반 축소 | **유지** |
  | Discourse 구조 | mechanical connector | sequencing·linking phrases for cohesion |
- 평가엔진 정합 (§11.5.6):
  * IH→AL 결정 = ADV ≥90%(SUSTAIN) + AL 게이트키퍼 4개 모두 pass (AL-14-PS,CD + AL-15-AS,CD) + AL ≥70% + Sympathetic Not_required + INT ≥90%.
  * **ADV-2-SP5 (skeletal paragraphs) + ADV-2-CD (cohesive devices) 안정 sustained**.
- 자료 #11~#16 통합 4대 AL 기준 (AL_GATEKEEPER):
  1. Breath of Vocabulary (어휘 폭) — many/use/good/people 반복 → AL 불가
  2. Agreement — 3인칭 -s / various+복수 / one of+복수 / some of+복수 위반 시 AL 박탈
  3. Preposition — 시간·날짜 정확
  4. Syntax — 분사구문·부사구문 풀 동원
  5. Cohesive devices — 6 카테고리 다양화 (repetitive 흠)
- 흠 (강도):
  * Agreement / Preposition 위반 [매우 강 — AL 자동 박탈]
  * Syntax 단조로움 (분사구문 부재) [매우 강]
  * Cohesive repetitive [매우 강]
  * 어휘 격상 부족 [매우 강]
  * 강조 표현 부재 [강]
  * 비교급 부재 / 가정법 부재 / 토론적 마무리 부재 [중]
- AL 진입 조건: 5대 평가축 모두 무결 + 격상 신호 3종 이상 (분사·강조·비교급·가정법·토론적 마무리 중)
$EVAL$,
  $FOCUS$
[AL 공통 코칭 우선순위 — 모든 유형 적용]

★ AL은 IH 완성형 전제. Skeleton·Cohesive·격상 어휘 무결 + AL 격상 신호.

**0순위 — IH 무결 (전제)**
- 위 IH 1~3순위 (어휘·Agreement·Skeleton·Cohesive) 무결 필수. 위반 시 AL 박탈.

**1순위 — AL 격상 결정 신호 (자료 #15·#16·#17 통합)**
1. **분사구문 (-ing/PP) 풀 동원** (강사 자료 #1 K — 핵심 격상)
   - lying on the bed / Watching him play / sometimes laughing, sometimes crying / depending on the content I consume
   - situated on the Korean peninsula / surrounded by ... / leading to the fact that ... / with 70% of our territory being mountainous
2. **강조 표현 카탈로그 풀 적용** (자료 #5 K 8 카테고리)
   - without being bothered by others / to the fullest / just like there's no tomorrow / without a care / without a doubt / without thinking
3. **비교급 동원** (자료 #16 — AL 결정 신호)
   - more comfortable than ever / significantly more / much more / way more / dramatically less
4. **가정법 과거완료** (자료 #10 — AL 결정 신호)
   - Looking back, I could not have asked for a better ... / Had I known back then, ... / It could have been better
5. **격상 동사 & X-wise 패턴** (자료 #17 / 자료 #1)
   - take some initiative to address this issue / open up unlimited possibilities / fills me with an immense sense of pride
   - presentation-wise / taste-wise / price-wise / personality-wise / capability-wise
6. **Topic sentence 격상** — 단순 묘사 X. "offers both X and Y" 같은 종합 명제.
   - living in an apartment offers both convenience and a strong sense of community
7. **위치별 표지 다양화** — Q2/Q5/Q8 다른 표지 사용 (시험 위치 인식)
8. **토론적 마무리** (자료 #11·#14)
   - 환경: "The planet we are living on is not ours. It belongs to our children's children."
   - 개인: 양면 토론 구조 (좋은 점 → 반전 → 나쁜 점 → 해결책 → 토론적 결론)

**2순위 — 자료 #11~#14 만능 패턴** (돌발 4 그룹 spec 활성화 시만)
- 7 Step 패턴 적용 (Step 0~7)
- 4대 AL 기준 흠 판정 강화

※ Agreement·Preposition·Syntax 무결 필수. 위반 시 AL 자동 박탈.
$FOCUS$,
  $SPEC$
[AL 공통 model_answer 톤]
- ACTFL Text Type: Sustained paragraph-length connected discourse. 18~25 문장 (200~280 단어).
- 어휘: 격상 어휘 8+ 개 + 강조 표현 3+ 개 + 일상 어휘
- 문법: 분사구문 4+ 개 + 종속절 + 부사 구문 + 비교급 2+ 개 + (선택) 가정법 1개
- 구조: Skeleton 6 슬롯 + Cohesive 5~6 카테고리 + 위치별 표지 일관 + Topic sentence 격상
- AL 결정 신호: 토론적 마무리 또는 메타 메시지 (집 = personal sanctuary, 환경 = planet, 자유시간 = technology balance 등)
- 무결 필수: Agreement (3인칭 -s / some of 복수는 are / one of 복수) / Preposition (on Friday / at 7pm) / Syntax 다양성
$SPEC$,
  200,
  '{"max_issues":1,"min_skeleton_slots":6,"min_cohesive_categories":5,"min_emphasis_phrases":3,"min_participials":3,"min_comparatives":1,"max_filler_ratio":0.04,"require_agreement":true,"require_preposition":true,"require_advanced_syntax":true}'::jsonb,
  '{"1-2":[2,4],"3-4":[1,3],"5+":[1,2]}'::jsonb,
  NULL,
  $TONE$
[AL 공통 톤 — 격려 + AL 결정 신호 강화 + 토론적 마무리 격상]
- "이거 AL 진입 후보예요. 분사·강조·비교급 모두 자연스러워요."
- "토론적 마무리만 한 줄 더 붙이면 완전체. 예를 들어 'A home is not just a place — it is where we recharge.' 같은 메타 멘트."
- 칭찬 → AL 결정 신호 강화 → 시범 → 따라하기 → 졸업 임박 안내 가능.
- ACTFL "Low" sublevel 톤 (§11.4.3) — sustained 안정 + AH 진입 신호 보강.
$TONE$
);

COMMIT;

-- ============================================================================
-- 검증
-- ============================================================================
-- SELECT guide_id, target_grade, model_answer_min_words,
--        length(evaluation_criteria) AS eval_len,
--        length(coaching_focus) AS focus_len,
--        length(model_answer_spec) AS spec_len,
--        length(tone_adjustment) AS tone_len
-- FROM coaching_specs WHERE question_type='common'
-- ORDER BY array_position(ARRAY['IL','IM1','IM2','IM3','IH','AL']::text[], target_grade);

-- ============================================================================
-- 다음 단계:
--   1. EF 코드 변경 — fetchSpec이 두 row(유형 spec + common 같은 등급) fetch
--   2. User Prompt 조립 — 두 spec 모두 주입 (common base + 유형 차별)
--   3. EF 재배포
--   4. 묘사 IH 재테스트 — 일관성 검증
-- ============================================================================
