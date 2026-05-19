-- ============================================================================
-- 081_coaching_specs_seed_description_random.sql
-- AI 코치 v5 — 2차 시드: 돌발(description_random) × 4 그룹 × 6 등급 = 24 row
-- ============================================================================
-- 설계 문서: docs/설계/스피킹코치_재설계.md
--   §5.1.1   spec 카탈로그 (description_random_{current_affairs,environment,industry_tech,personal})
--   §5.1.2   돌발 4 그룹의 공통 base 참조 구조 (common SSOT 위에 차별 요소만 적재)
--   §5.10    돌발 4 그룹 분기 EF 진입 로직 (resolveSpecId 매칭)
--   §11.7.10 돌발 유형 본문 (자료 #11~#14 풀 분석)
--
-- 자료 출처:
--   자료 #11 (`10.txt`) — 시사: 은행/호텔/식당 IH→AL 격상 매트릭스
--   자료 #12 (`11.txt`) — 환경: 재활용/지리/지구온난화/날씨 + 토론적 마무리 카드
--   자료 #13 (`12.txt`) — 산업·기술: Breath of Vocabulary 심화 + 시장 점유율 정량화
--   자료 #14 (`13.txt`) — 개인: 양면 토론 구조(자유시간 100% 스마트폰)
--
-- 적재 원칙:
--   - common × 6 (마이그 078)에 만능 패턴 7 Step + 4대 AL 기준 + Cohesive 6 카테고리 이미 정의됨
--   - 각 row(type spec)는 그룹별 차별 요소만 적재 — 중복 X
--   - IL~IM2: 만능 패턴 부담 경감 (학생이 무리 X). 코칭은 1~3 슬롯 발화 + 핵심 어휘 1~2개
--   - IM3~AL: 만능 패턴 본격 적용 (7 Step + 어휘 격상 매트릭스 + 토론적 마무리)
--   - example_model_answer: 자료 #11~#14 풀 모범을 등급별 분량(IL 60w / IM1 80w / IM2 100w / IM3 130w / IH 160w / AL 200w)으로 다듬음
-- ============================================================================

BEGIN;

-- ============================================================================
-- [GROUP 1] description_random_current_affairs (시사 — 은행·호텔·음식점·교통)
-- 자료 #11 — 어휘 격상 매트릭스 + 디지털 대체(mobile banking/online booking instead of physically visiting in person)
-- 대표 토픽: 은행 (IH 출발 → AL 격상 표 그대로 — 자료 #11 C)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- description_random_current_affairs_IL
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_current_affairs_IL', 'description_random_current_affairs', 'IL',
  $EVAL$
[IL × 돌발 시사 — 부담 경감 우선]
- 돌발은 학생에게 가장 부담. IL 단계에서 만능 패턴 7 Step 강요 X.
- 측정: (1) 토픽(은행/호텔/식당/교통) 한 가지 골라 단순 문장 1~3개 발화 (2) 본인이 그 장소에서 무엇 하는지 단순 묘사
- 흠 (강도): 발화 자체 포기 [강] / 시제 혼선 [강] / 토픽 무관 [중]
- 흠 (약 — 코칭 X): 만능 패턴 부재 / 어휘 격상 부재 / 디지털 대체 부재
$EVAL$,
  $FOCUS$
[IL × 돌발 시사 코칭 우선순위]
1. "어렵게 생각 마세요. 본인이 그 장소에서 뭐 하는지만 떠올려보세요" — 부담 경감
2. Step 0 시간 벌기 1개 시범 ("It's a tough question. I'll do my best.") — 외워두면 무엇이든 답변 시작 가능
3. 단순 현재 시제로 본인 경험 1~3 문장 ("I go to the bank to get money. I use the ATM. It's easy.")
※ 만능 패턴 7 Step / 어휘 격상 매트릭스 / 디지털 대체 표현은 IL 단계에서 X.
$FOCUS$,
  $SPEC$
[IL × 돌발 시사 model_answer 톤]
- 분량: 5~8 문장 (50~70 단어)
- 어휘: 일상 어휘 (bank/ATM/money/people/use/go)
- 문법: 단순 현재. I + 동사 위주.
- 구조: 만능 패턴 X. 본인 경험 단순 묘사.
- 금지: 격상 어휘(numerous/captivated 등) / 디지털 대체 표현 / 외국인 반응 / 토론적 마무리
$SPEC$,
  50,
  '{"max_issues":2,"max_filler_ratio":0.15,"require_consistent_tense":true}'::jsonb,
  '{"1-2":[2,4],"3-4":[1,3],"5+":[1,2]}'::jsonb,
  $MODEL$
It's a tough question. I'll do my best. There are many banks in Korea. I go to the bank sometimes. I use the ATM to get money. People in Korea also use mobile banking on their phones. It's easy and fast. That's about it.
$MODEL$,
  $TONE$
[IL × 돌발 톤 — 부담 경감 최우선]
- "돌발 주제는 누구나 어려워요. 한 문장씩만 만들어보세요."
- Step 0 한 줄 외우면 어떤 돌발도 시작 가능 — 격려 중심.
- 칭찬 → 한 문장 시범 → 따라하기.
$TONE$
);

-- ----------------------------------------------------------------------------
-- description_random_current_affairs_IM1
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_current_affairs_IM1', 'description_random_current_affairs', 'IM1',
  $EVAL$
[IM1 × 돌발 시사 — Step 0 + 일반화 도입]
- 측정: (1) Step 0 시간 벌기 (2) 일반화 1문장 (There are many ... in Korea) (3) 본인 경험 2~3 문장
- 흠 (강도): Step 0 부재 [중] / 일반화 부재 [중] / 시제 혼선 [강]
- 흠 (약): 어휘 격상 부재 / 디지털 대체 부재 / 외국인 반응 부재
$EVAL$,
  $FOCUS$
[IM1 × 돌발 시사 코칭 우선순위]
1. Step 0 시간 벌기 강화 — 2개 이상 ("It's a tough question. I haven't thought about it. I'll do my best.")
2. 일반화 문장 1개 도입 — "There are many banks in Korea." / "Wherever you go, you can see at least one bank."
3. 본인 경험 2~3 문장 (단순 현재)
4. (베타) 디지털 대체 1문장 — "These days a lot of people use mobile banking."
※ 어휘 격상 매트릭스(numerous/spot/refer to) / 외국인 반응 / 토론적 마무리는 IM1에서 X.
$FOCUS$,
  $SPEC$
[IM1 × 돌발 시사 model_answer 톤]
- 분량: 8~12 문장 (70~90 단어)
- 어휘: 일상 어휘 + 빈도 부사 1~2개
- 문법: 단순 현재 + and/so 묶기
- 구조: Step 0 → 일반화 → 본인 경험 → (베타) 디지털 대체
$SPEC$,
  70,
  '{"max_issues":2,"max_filler_ratio":0.12,"require_consistent_tense":true}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,4],"5+":[1,3]}'::jsonb,
  $MODEL$
It's a tough question. I haven't thought about it, but I'll do my best. There are many banks in Korea. Wherever you go, you can see at least one bank. I go to the bank sometimes to get money or to make deposits. The ATM is convenient and easy to use. These days a lot of people use mobile banking instead of going to the bank. It's much faster. That's about it.
$MODEL$,
  $TONE$
[IM1 × 돌발 톤]
- "Step 0 두 줄 외워두면 어떤 돌발도 시작 가능해요."
- "일반화 한 문장만 더 붙이면 자연스러운 단락이 돼요."
- 칭찬 → 일반화 시범 → 따라하기.
$TONE$
);

-- ----------------------------------------------------------------------------
-- description_random_current_affairs_IM2
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_current_affairs_IM2', 'description_random_current_affairs', 'IM2',
  $EVAL$
[IM2 × 돌발 시사 — 만능 패턴 4 슬롯 베타]
- 측정: (1) Step 0 + Step 1 일반화 (2) Step 2 종류·분류 (분사구문 시도 OK) (3) 디지털 대체 도입 (4) 일치(Agreement: many people go (X) → many people go의 일치 점검)
- 흠 (강도): Step 1 일반화 부재 [중] / Step 2 종류 분류 부재 [중] / Agreement 위반 [강]
- 흠 (약): 외국인 반응 부재 / 토론적 마무리 부재
$EVAL$,
  $FOCUS$
[IM2 × 돌발 시사 코칭 우선순위]
1. Step 1 일반화 + Step 2 종류 분류 — "Talking about banks in Korea, we have central banks and private banks."
2. Step 3 사용자·이용 양상 — "People go to the bank for many reasons. They go to get loans or to make deposits."
3. Step 4 디지털 대체 — "These days a lot of people use mobile banking instead of physically visiting the bank."
4. Agreement 점검 (3인칭 단수 -s / one of the + 복수)
5. (베타) 외국인 반응 1문장 — "Foreigners are often amazed by mobile banking."
※ 어휘 격상 매트릭스(numerous/spot/large portion of the population)는 1~2개만 베타. 토론적 마무리 X.
$FOCUS$,
  $SPEC$
[IM2 × 돌발 시사 model_answer 톤]
- 분량: 10~14 문장 (90~120 단어)
- 어휘: 일상 + 격상 어휘 1~2개 (a lot of / mobile banking / instead of)
- 문법: 단순 현재 + and/but/so + 종속절 1~2개. 3인칭 단수 -s 정확.
- 구조: 만능 패턴 4 슬롯 (Step 0 → 1 → 2 → 3 → 4) — 5~7 슬롯은 베타 OK
- 베타 허용: 분사구문 1개 (Talking about banks ...)
$SPEC$,
  90,
  '{"max_issues":2,"min_skeleton_slots":4,"max_filler_ratio":0.10,"require_consistent_tense":true}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,3],"5+":[1,2]}'::jsonb,
  $MODEL$
It's a tough question. I haven't thought about it, but I'll do my best. There are many banks in Korea. Wherever you go, you can see at least one bank on the street. Talking about banks in Korea, we have central banks and private banks. What they do is provide financial products to bank users. People go to the bank for many reasons. They go to get loans or to make deposits. These days a lot of people use mobile banking instead of physically visiting the bank. Foreigners are often amazed by mobile banking and good banking services. That's about it.
$MODEL$,
  $TONE$
[IM2 × 돌발 톤]
- "Step 1~4까지만 익혀도 단락이 완성돼요."
- "'Talking about ...' 이 분사구문 하나만 익혀두세요. 어떤 돌발에도 통용돼요."
- 칭찬 → 만능 패턴 한 슬롯 시범 → 따라하기.
$TONE$
);

-- ----------------------------------------------------------------------------
-- description_random_current_affairs_IM3
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_current_affairs_IM3', 'description_random_current_affairs', 'IM3',
  $EVAL$
[IM3 × 돌발 시사 — 만능 패턴 5~6 슬롯 + 어휘 격상 매트릭스 1~2개]
- 측정: (1) 만능 패턴 5~6 슬롯 (Step 0~5) (2) 어휘 격상 1~2개 (many → numerous / see → spot / for many reasons → for various purposes) (3) Cohesive 2~3 카테고리 (4) Agreement·Preposition 무결
- 흠 (강도): 만능 패턴 4 슬롯 이하 [강] / 어휘 반복(many·see·use 반복) [강] / Agreement 위반 [매우 강]
- 흠 (약): Step 6 자랑 부재 / 토론적 마무리 부재 / 시장 점유율 정량화 부재
$EVAL$,
  $FOCUS$
[IM3 × 돌발 시사 코칭 우선순위]
1. 만능 패턴 5~6 슬롯 확정 (Step 0 → 1 → 2 → 3 → 4 → 5 외국인 반응)
2. 어휘 격상 매트릭스 1~2개 도입 — many → numerous / see → spot / have → refer to / for many reasons → for various purposes
3. 디지털 대체 풀 표현 — "It is often said that these days a large number of people frequently use mobile banking instead of physically visiting the bank in person."
4. 외국인 반응 1문장 — "Foreigners are often amazed by mobile banking and good banking services."
5. Cohesive 2~3 카테고리 골고루 (However/Therefore/In conclusion)
※ 자랑 격상("It fills me with immense pride") / 토론적 마무리 / 시장 점유율 정량화는 IH 격상 신호로 베타 시도 OK.
$FOCUS$,
  $SPEC$
[IM3 × 돌발 시사 model_answer 톤]
- 분량: 13~18 문장 (120~150 단어)
- 어휘: 격상 어휘 2~3개 (numerous / spot / refer to / for various purposes) + 일상 어휘
- 문법: 분사구문 1~2개 + 종속절. Agreement·Preposition 무결.
- 구조: 만능 패턴 5~6 슬롯 + Cohesive 2~3 카테고리.
- 베타: 자랑 멘트 1개 ("I'm so proud of that as a Korean")
- 금지: 토론적 마무리(AL 전용) / 시장 점유율 정량화(IH·AL 전용)
$SPEC$,
  120,
  '{"max_issues":2,"min_skeleton_slots":5,"min_cohesive_categories":2,"max_filler_ratio":0.08}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,3],"5+":[1,2]}'::jsonb,
  $MODEL$
It's a tough question. I haven't thought about it, but I'll do my best. There are numerous banks here in Korea. Wherever you go, you can spot at least one bank on the street. Talking about banks in Korea, we refer to central banks and private banks. What they do is provide financial products to bank users. A large number of people go to the bank for various purposes. They go to get loans or to make deposits. However, these days a lot of people use mobile banking instead of physically visiting the bank. When foreigners come to Korea, they are often amazed by mobile banking and good banking services. I'm so proud of that as a Korean. In conclusion, we are doing well. That's about it.
$MODEL$,
  $TONE$
[IM3 × 돌발 톤]
- "만능 패턴 5~6 슬롯 완성도 좋아요. 이제 어휘 한두 개만 격상하면 IH로 가요."
- "'many'를 'numerous'로, 'see'를 'spot'으로 바꿔보세요."
- 칭찬 → 어휘 1개 격상 시범 → 따라하기 → IH 격상 신호 1개 미리 보여주기.
$TONE$
);

-- ----------------------------------------------------------------------------
-- description_random_current_affairs_IH (★ 핵심 등급)
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_current_affairs_IH', 'description_random_current_affairs', 'IH',
  $EVAL$
[IH × 돌발 시사 — 만능 패턴 7 슬롯 + 어휘 격상 매트릭스 풀]
- 측정: (1) 만능 패턴 7 슬롯 (Step 0~7) (2) 어휘 격상 매트릭스 3~4개 (numerous/spot/refer to/large portion of the population/for various purposes/frequent/patronize) (3) Cohesive 4 카테고리 (4) 디지털 대체 풀 표현 (5) 외국인 반응 + 자랑
- 흠 (강도): 어휘 반복(many·see·use·good·people 반복) [매우 강 — IH 자체 위협] / Agreement 위반 [매우 강 — AL 자동 박탈] / Preposition 위반 [매우 강] / Syntax 단조로움 [강]
- 흠 (약): 시장 점유율 정량화 부재 / 토론적 마무리 부재 / 자랑 격상("immense sense of pride") 부재
$EVAL$,
  $FOCUS$
[IH × 돌발 시사 코칭 우선순위]
1. **어휘 격상 매트릭스 풀 적용** (자료 #11 C 표 그대로):
   - many → numerous / countless / large number of / great deal of
   - see → spot / visually spot / observe / observe without a doubt
   - have → refer to (의미 격상)
   - people → large number of people / large portion of the population / substantial number of individuals
   - for many reasons → for various purposes
   - go to → frequent / patronize (식당의 경우 patronize는 동사로 격상)
2. **만능 패턴 7 슬롯 확정** (Step 0~7)
3. **디지털 대체 풀 표현** — "It is often said that these days a large number of people frequently use mobile banking instead of physically visiting the bank in person."
4. **자랑 셋업** — "When foreign people come to Korea, they are often fascinated/captivated/amazed by the high-level/sophisticated/highly advanced banking services offered by our banks. I'm so proud of that as a Korean."
5. **결론·전망** — "In conclusion, we are performing well based on the trend so far. We hope to achieve even greater success in the foreseeable future."
6. Cohesive 4 카테고리 골고루 (however / on top of that / leading to the fact that / in conclusion)
※ Agreement·Preposition·Syntax 무결 필수. 위반 시 AL 자동 박탈. 호텔(hospitality services/online booking) / 식당(franchise restaurants/patronize) 동일 패턴.
$FOCUS$,
  $SPEC$
[IH × 돌발 시사 model_answer 톤]
- 분량: 16~20 문장 (150~180 단어)
- 어휘: 격상 어휘 5~6개 + 일상 어휘
- 문법: 분사구문 2~3개 (Talking about ... / Wherever you go, you can spot ...) + 종속절. Agreement·Preposition 무결.
- 구조: 만능 패턴 7 슬롯 + Cohesive 4 카테고리 + 자랑 셋업.
- 베타: 자랑 격상 1개 ("It fills me with an immense sense of pride")
- 금지: 토론적 마무리(AL 전용) / 시장 점유율 정량화(AL 전용)
$SPEC$,
  150,
  '{"max_issues":1,"min_skeleton_slots":6,"min_cohesive_categories":4,"min_participials":2,"max_filler_ratio":0.06,"require_agreement":true,"require_preposition":true}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,3],"5+":[1,2]}'::jsonb,
  $MODEL$
It's a tough question. I haven't thought about it, but I'll do my best. There are numerous banks out there in Korea. Wherever you go, you can spot at least one bank on the street. Talking about banks in Korea, we refer to central banks and private banks. What they do is provide financial products to bank users. A large portion of the population frequents banks for various purposes. They physically go to the bank to obtain loans or to make deposits accordingly. However, it is often said that these days a large number of people frequently use mobile banking instead of physically visiting the bank in person. When foreign people come to Korea, they are often fascinated by mobile banking and high-level banking services offered by our banks. I'm so proud of that as a Korean. In conclusion, we are performing well based on the trend so far. We hope to achieve even greater success in the foreseeable future. I hope this trend continues just like this. That's pretty much about it.
$MODEL$,
  $TONE$
[IH × 돌발 톤 — AL 격상 신호 제시]
- "만능 패턴 7 슬롯 완성도 좋아요. 어휘 격상 매트릭스도 적용되고 있어요."
- "'I'm so proud'를 'It fills me with an immense sense of pride'로 격상하면 AL 신호예요."
- "Agreement만 무결하면 AL 후보. 'a large portion of the population frequents' 단수 일치 정확해요."
- 칭찬 → 격상 1개 시범 → 따라하기 → AL 격상 신호 1개 미리 보여주기.
$TONE$
);

-- ----------------------------------------------------------------------------
-- description_random_current_affairs_AL
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_current_affairs_AL', 'description_random_current_affairs', 'AL',
  $EVAL$
[AL × 돌발 시사 — 4대 AL 기준 무결 + 자랑 격상 + 결론·전망 풀]
- 측정: (1) 어휘 격상 매트릭스 풀 무결 (2) Agreement·Preposition·Syntax 무결 (3) Cohesive 5~6 카테고리 골고루 (4) 자랑 격상 ("It fills me with an immense sense of pride") (5) 결론·전망 풀 ("performing well based on the trend so far / in the foreseeable future")
- 흠 (매우 강 — AL 자동 박탈): Agreement 위반 / Preposition 위반 / Syntax 단조로움 / Cohesive repetitive (first ... first ... first)
- 흠 (강): 어휘 폭 부족 / 분사구문 부재 / 자랑 격상 부재
- AL 진입 조건: 4대 AL 기준 무결 + 어휘 격상 매트릭스 5+ 적용 + 자랑 격상 1개 이상
$EVAL$,
  $FOCUS$
[AL × 돌발 시사 코칭 우선순위]
1. **4대 AL 기준 무결** (Vocab / Agreement / Preposition / Syntax) — 위반 시 AL 자동 박탈
2. **어휘 격상 매트릭스 풀 적용** (5+ 카테고리에서 격상)
3. **자랑 격상** — "I'm so proud" → "It fills me with an immense sense of pride" / "I have a strong sense of pride"
4. **결론·전망 풀** — "we are performing well based on the trend so far. We hope to achieve even greater success in the foreseeable future / in the near future"
5. **Cohesive 5~6 카테고리** — 도입/반전/예시/추가/결론도입/마무리 골고루
6. 시설 칭찬 풀 (식당 — "well maintained, clean and comfortable / the staff are very kind and friendly, welcoming, ready to serve")
※ 호텔(hospitality services/captivated by online booking) / 교통(metropolitan transit/well-developed infrastructure) 동일 패턴. 시장 점유율 정량화는 산업·기술에서 등장. 토론적 마무리는 환경/개인 그룹에서 우선.
$FOCUS$,
  $SPEC$
[AL × 돌발 시사 model_answer 톤]
- 분량: 20~26 문장 (190~250 단어)
- 어휘: 격상 어휘 8+ 개 + 자랑 격상 표현 + 결론·전망 풀
- 문법: 분사구문 3+ 개 + 종속절 + 부사 구문. Agreement·Preposition·Syntax 무결.
- 구조: 만능 패턴 7 슬롯 + Cohesive 5~6 카테고리 + 자랑 격상 + 결론·전망 풀
- 무결 필수: 3인칭 단수 -s / a large portion of the population + 단수 동사 / on Friday / at 7pm
$SPEC$,
  190,
  '{"max_issues":1,"min_skeleton_slots":7,"min_cohesive_categories":5,"min_participials":3,"max_filler_ratio":0.04,"require_agreement":true,"require_preposition":true}'::jsonb,
  '{"1-2":[2,4],"3-4":[1,3],"5+":[1,2]}'::jsonb,
  $MODEL$
It's a tough question. I haven't thought about it, but I'll give you my best shot. There are numerous banks out there in Korea. Wherever you go, you can visually spot at least one bank on the street without a doubt. Talking about banks in Korea, we refer to central banks and private banks. What they do is provide a wide range of financial products to bank users. A large portion of the population frequents banks for various purposes. They physically go to the bank to obtain loans or to make deposits accordingly. However, it is often said that these days a large number of people frequently use mobile banking instead of physically visiting the bank in person. Meanwhile, when foreign people come to Korea, they are often captivated by the highly advanced mobile banking system and the sophisticated banking services offered by our banks. I'm genuinely proud of that as a Korean. In fact, it fills me with an immense sense of pride. In conclusion, we are performing well based on the trend so far. We hope to achieve even greater success in the foreseeable future. I hope this trend continues just like this forever. We can keep it up. That's all I can say.
$MODEL$,
  $TONE$
[AL × 돌발 톤 — 졸업 임박]
- "이거 AL 진입 후보예요. 4대 AL 기준 무결, 어휘 격상 매트릭스 풀 적용."
- "자랑 격상('It fills me with an immense sense of pride')도 자연스러워요."
- "결론·전망 풀('based on the trend so far / in the foreseeable future')도 동원되고 있어요."
- 칭찬 → AL 결정 신호 강화 → 졸업 임박 안내 가능.
$TONE$
);

-- ============================================================================
-- [GROUP 2] description_random_environment (환경 — 재활용·지형·날씨)
-- 자료 #12 — Cohesive devices 6 카테고리 강조 + 토론적 마무리 카드("the planet belongs to children's children")
-- 대표 토픽: 재활용 (자료 #12 B) + 지형/날씨 (D/F)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- description_random_environment_IL
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_environment_IL', 'description_random_environment', 'IL',
  $EVAL$
[IL × 돌발 환경 — 부담 경감]
- 측정: 토픽(재활용/지형/날씨) 한 가지 골라 단순 문장 1~3개
- 흠 (강): 발화 자체 포기 / 시제 혼선
- 흠 (약 — 코칭 X): Cohesive 다양화 / 토론적 마무리 / 분사구문
$EVAL$,
  $FOCUS$
[IL × 돌발 환경 코칭 우선순위]
1. "재활용은 분리수거 정도만 떠올려도 돼요." — 부담 경감
2. Step 0 시간 벌기 1개 시범
3. 단순 현재 시제로 본인 행동 1~3 문장 ("I recycle every week. I separate paper and plastic. It's easy.")
※ Cohesive 다양화 / 토론적 마무리("the planet belongs to children's children") / Skeleton 골격 X.
$FOCUS$,
  $SPEC$
[IL × 돌발 환경 model_answer 톤]
- 분량: 5~8 문장 (50~70 단어)
- 어휘: 일상 (recycle / paper / plastic / weather / mountain / season)
- 문법: 단순 현재
- 금지: 격상 어휘 / 토론적 마무리 / 분사구문
$SPEC$,
  50,
  '{"max_issues":2,"max_filler_ratio":0.15,"require_consistent_tense":true}'::jsonb,
  '{"1-2":[2,4],"3-4":[1,3],"5+":[1,2]}'::jsonb,
  $MODEL$
It's a tough question. I'll do my best. In Korea, we recycle every week. We separate paper, plastic, and glass. The government is strict about recycling. If you don't recycle, you get a fine. So most people do it well. That's about it.
$MODEL$,
  $TONE$
[IL × 환경 톤 — 부담 경감]
- "환경 주제는 본인이 실천하는 작은 행동만 떠올려보세요."
- 칭찬 → 한 문장 시범 → 따라하기.
$TONE$
);

-- ----------------------------------------------------------------------------
-- description_random_environment_IM1
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_environment_IM1', 'description_random_environment', 'IM1',
  $EVAL$
[IM1 × 돌발 환경 — Step 0 + 일반화 도입]
- 측정: Step 0 + 일반화 1문장 + 본인 경험 2~3 문장 + (베타) 정부 규칙 1문장
- 흠 (강): Step 0 부재 / 일반화 부재 / 시제 혼선
$EVAL$,
  $FOCUS$
[IM1 × 돌발 환경 코칭 우선순위]
1. Step 0 시간 벌기 강화
2. 일반화 — "These days environmental issues are emerging. One of them is recycling."
3. 본인 행동 — "We recycle regularly. We separate paper, plastic, and glass."
4. (베타) 정부 규칙 — "The government has strict rules on recycling. If you don't do it, you get fined."
※ Cohesive 6 카테고리 / 토론적 마무리 / Skeleton 4 슬롯 이상 X.
$FOCUS$,
  $SPEC$
[IM1 × 환경 model_answer 톤]
- 분량: 8~12 문장 (70~90 단어)
- 어휘: 일상 + 빈도 부사
- 구조: Step 0 → 일반화 → 본인 행동 → 정부 규칙
$SPEC$,
  70,
  '{"max_issues":2,"max_filler_ratio":0.12,"require_consistent_tense":true}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,4],"5+":[1,3]}'::jsonb,
  $MODEL$
It's a tough question. I haven't thought about it, but I'll do my best. These days environmental issues are emerging. One of them is recycling. We recycle every week. We separate paper, plastic, and glass. The government has strict rules on recycling. If you don't do it, you get fined. So most people in Korea recycle without problems. That's about it.
$MODEL$,
  $TONE$
[IM1 × 환경 톤]
- "정부 규칙 한 문장만 더 붙이면 단락이 자연스러워요."
- 칭찬 → 일반화 시범 → 따라하기.
$TONE$
);

-- ----------------------------------------------------------------------------
-- description_random_environment_IM2
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_environment_IM2', 'description_random_environment', 'IM2',
  $EVAL$
[IM2 × 돌발 환경 — 만능 패턴 4~5 슬롯 + Cohesive 2~3 카테고리 베타]
- 측정: Step 0 + Step 1 일반화 + Step 2 종류 + Step 3 본인 행동 + Step 4 정부 규칙 + Cohesive 2~3 카테고리
- 흠 (강): Cohesive repetitive (first ... first 반복) / Step 1 일반화 부재
- 흠 (약): 외국인 반응 부재 / 토론적 마무리 부재
$EVAL$,
  $FOCUS$
[IM2 × 환경 코칭 우선순위]
1. Step 1~4 만능 패턴 적용 — "Generally speaking, these days environmental issues are emerging. One of them is recycling."
2. Cohesive 2~3 카테고리 도입 — "first of all / besides / in addition / on top of that"
3. 정부 규칙 + 본인 행동 묶기
4. (베타) 외국인 반응 1문장 — "Foreigners are fascinated by our well-practiced recycling."
※ 토론적 마무리("the planet belongs to children's children") / Cohesive 6 카테고리 풀은 IH·AL 전용.
$FOCUS$,
  $SPEC$
[IM2 × 환경 model_answer 톤]
- 분량: 10~14 문장 (90~120 단어)
- 어휘: 일상 + 격상 어휘 1~2개
- 문법: 단순 현재 + and/but/so + 종속절 1~2개. Agreement 정확.
- 구조: 만능 패턴 4~5 슬롯 + Cohesive 2~3 카테고리
$SPEC$,
  90,
  '{"max_issues":2,"min_skeleton_slots":4,"min_cohesive_categories":2,"max_filler_ratio":0.10,"require_consistent_tense":true}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,3],"5+":[1,2]}'::jsonb,
  $MODEL$
It's a tough question. I haven't thought about it, but I'll do my best. Generally speaking, these days environmental issues are emerging. One of them is recycling. To talk about recycling, first of all, we recycle regularly. We separate paper, plastic, and glass. Besides, the government has strict rules on recycling. If you don't do it, you get fined. In addition, a lot of foreigners come to Korea and they are fascinated by our well-practiced recycling. I'm so proud of being Korean. That's about it.
$MODEL$,
  $TONE$
[IM2 × 환경 톤]
- "'first of all / besides / in addition' 이 세 카테고리만 익혀도 단락이 풍부해져요."
- 칭찬 → Cohesive 1개 시범 → 따라하기.
$TONE$
);

-- ----------------------------------------------------------------------------
-- description_random_environment_IM3
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_environment_IM3', 'description_random_environment', 'IM3',
  $EVAL$
[IM3 × 돌발 환경 — Cohesive 4 카테고리 + 토론적 마무리 베타 시도]
- 측정: 만능 패턴 5~6 슬롯 + Cohesive 4 카테고리(도입/추가/결론도입/마무리) + 외국인 반응
- 흠 (강): Cohesive repetitive(같은 device 반복) / 만능 패턴 4 슬롯 이하
- 흠 (약): 토론적 마무리 부재 / 분사구문 부재
$EVAL$,
  $FOCUS$
[IM3 × 환경 코칭 우선순위]
1. Cohesive 4 카테고리 골고루 — "firstly / however / for instance / besides / leading to the fact that / in conclusion"
2. 만능 패턴 5~6 슬롯 (Step 0~5 + 결론)
3. 외국인 반응 1문장 + 자랑 베타 — "Foreigners are fascinated by our well-practiced recycling. I'm so proud of being Korean."
4. (베타) 토론적 마무리 1문장 시도 — "The planet we are living on belongs to our children's children."
※ 토론적 마무리 풀 카드(4문장 모두) / 분사구문 풀 동원은 IH·AL 전용.
$FOCUS$,
  $SPEC$
[IM3 × 환경 model_answer 톤]
- 분량: 13~18 문장 (120~150 단어)
- 어휘: 격상 어휘 2~3개 (numerous / sophisticated / leading to the fact that) + 일상 어휘
- 문법: 분사구문 1개 + 종속절. Agreement 무결.
- 구조: 만능 패턴 5~6 슬롯 + Cohesive 4 카테고리
- 베타: 토론적 마무리 1문장
$SPEC$,
  120,
  '{"max_issues":2,"min_skeleton_slots":5,"min_cohesive_categories":4,"max_filler_ratio":0.08}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,3],"5+":[1,2]}'::jsonb,
  $MODEL$
It's a tough question. I haven't thought about it, but I'll do my best. Generally speaking, it is often said that these days environmental issues are emerging. One of them would be recycling. We take it very seriously. To talk about recycling, first of all, we recycle regularly. Therefore, we have a sophisticated recycling system for materials like paper, plastic, and glass. As long as I know, the government has strict rules on recycling. If you don't do it, you get fined. Besides, a lot of foreign people come to Korea. They are fascinated by our well-practiced recycling. I'm so proud of being Korean. In conclusion, the planet we are living on belongs to our children's children. So we should pass it on as it is now. That's pretty much about it.
$MODEL$,
  $TONE$
[IM3 × 환경 톤]
- "Cohesive 4 카테고리 도입 좋아요. 'leading to the fact that' 한 번만 더 써보세요."
- "토론적 마무리 카드('the planet belongs to our children's children')가 들어가면 IH 신호예요."
- 칭찬 → Cohesive 1개 격상 시범 → 따라하기.
$TONE$
);

-- ----------------------------------------------------------------------------
-- description_random_environment_IH (★ 환경 핵심)
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_environment_IH', 'description_random_environment', 'IH',
  $EVAL$
[IH × 돌발 환경 — Cohesive 5 카테고리 풀 + 토론적 마무리 카드 도입]
- 측정: (1) 만능 패턴 7 슬롯 (2) Cohesive 5 카테고리(도입/반전/예시/추가/결론도입/마무리) (3) 분사구문 2~3개 (Korea is situated on the Korean peninsula, surrounded by the sea on three sides, leading to the fact that we have thousands of islands) (4) 토론적 마무리 카드 1~2문장
- 흠 (매우 강): Cohesive repetitive(first ... first ... first 반복) — 자료 #12 강사 명시 "IH에서 reparative 흠 大"
- 흠 (강): Agreement 위반 / 분사구문 부재 / 토론적 마무리 부재
$EVAL$,
  $FOCUS$
[IH × 환경 코칭 우선순위]
1. **Cohesive 5 카테고리 풀 골고루** — 도입(firstly/generally speaking/above all) / 반전(however/on the other hand) / 예시(for instance/to give you some details) / 추가(meanwhile/moreover/besides/in addition/on top of that) / 결론도입(therefore/thus/leading to the fact that) / 마무리(in conclusion/to sum up/the bottom line is that). ★ 같은 device 반복 X.
2. **분사구문 풀 동원** — "Korea is situated on the Korean peninsula, surrounded by the sea on three sides" / "leading to the fact that we have thousands of islands" / "with 70% of our territory being mountainous"
3. **토론적 마무리 카드 도입** (자료 #12 C — AL 격상 핵심):
   - "The planet we are living on is not ours. It belongs to our children's children."
   - "So we should pass it on to the next generation as it is now."
   - "This is not an option. This is a must."
4. 외국인 반응 + 자랑 — "When foreign people come to Korea, they are so fascinated and captivated by the beautiful nature of Korea."
5. Step 1~7 만능 패턴 확정
※ 지구온난화 토픽도 동일 — global temperature/melting of icebergs/sea levels rising/habitat decrease 어휘 추가. 날씨는 four distinct seasons + spring/summer/fall/winter 각 묘사.
$FOCUS$,
  $SPEC$
[IH × 환경 model_answer 톤]
- 분량: 16~22 문장 (160~200 단어)
- 어휘: 격상 어휘 5+ 개 + 분사구문 표현
- 문법: 분사구문 2~3개 + 종속절. Agreement 무결.
- 구조: 만능 패턴 7 슬롯 + Cohesive 5 카테고리 + 토론적 마무리 1~2문장
- AL 신호: 토론적 마무리 풀 카드(4문장 모두) 베타 시도
- 금지: 가정법 (AL 전용)
$SPEC$,
  160,
  '{"max_issues":1,"min_skeleton_slots":6,"min_cohesive_categories":5,"min_participials":2,"max_filler_ratio":0.06,"require_agreement":true,"require_preposition":true}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,3],"5+":[1,2]}'::jsonb,
  $MODEL$
It's a tough question. I haven't thought about it, but I'll do my best. Generally speaking, it is often said that these days environmental issues are emerging. One of them would be recycling. There is no doubt that we take it very seriously. To talk about recycling, first of all, we recycle regularly on a regular basis. Therefore, leading to the fact that we have a sophisticated recycling system for materials like plastic and aluminum and glass. As long as I know, the government has strict rules on recycling. If you don't do it, you get fined. Besides, a lot of foreign people come to Korea. They are fascinated by our well-practiced recycling. I'm so proud of being Korean. In conclusion, the planet we are living on is not ours. It belongs to our children's children. So we should pass it on to the next generation as it is now. By doing this, we can make a better world. That's pretty much about it.
$MODEL$,
  $TONE$
[IH × 환경 톤 — AL 격상 신호]
- "Cohesive 5 카테고리 골고루 사용 좋아요. repetitive 흠 없어요."
- "토론적 마무리 카드 도입 자연스러워요. 'This is not an option. This is a must.' 한 문장 더 붙이면 AL 후보."
- 칭찬 → 토론적 마무리 강화 시범 → 따라하기.
$TONE$
);

-- ----------------------------------------------------------------------------
-- description_random_environment_AL
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_environment_AL', 'description_random_environment', 'AL',
  $EVAL$
[AL × 돌발 환경 — Cohesive 6 카테고리 무결 + 토론적 마무리 풀 카드 + 분사구문 풀]
- 측정: (1) Cohesive 6 카테고리 풀 (2) 토론적 마무리 풀 카드 (4문장 모두) (3) 분사구문 풀 동원 (4) 격상 어휘 매트릭스 풀
- 흠 (매우 강 — AL 박탈): Cohesive repetitive / Agreement·Preposition·Syntax 위반
- 흠 (강): 토론적 마무리 부재 / 분사구문 부재
$EVAL$,
  $FOCUS$
[AL × 환경 코칭 우선순위]
1. **Cohesive 6 카테고리 무결** (도입/반전/예시/추가/결론도입/마무리 모두 다른 device)
2. **토론적 마무리 풀 카드** (자료 #12 C — 4문장 모두):
   - "The planet we are living on is not ours. It belongs to our children's children."
   - "So we should pass it on to the next generation as it is now."
   - "This is not an option. This is a must."
   - "By doing this, we can make a better world. We can make a better Korea."
3. **분사구문 풀 동원** — "Korea is situated on the Korean peninsula, surrounded by the sea on three sides, leading to the fact that we have thousands of islands along the coast" / "with 70% of our territory being mountainous"
4. **격상 어휘 풀** — `unequably true / undoubtedly true / sophisticated / highly advanced / well-practiced / fascinated / captivated`
5. **(선택) 가정법** — "If I had to choose one, it would be recycling."
※ 지리(situated on the Korean peninsula/blessed with abundant seafood/UNESCO recognized) / 지구온난화(gradually warming/melting/habitat decrease/ecosystem heavily influenced) / 날씨(four distinct seasons/scorching/sticky hot/freezing cold) 동일 패턴.
$FOCUS$,
  $SPEC$
[AL × 환경 model_answer 톤]
- 분량: 20~26 문장 (200~250 단어)
- 어휘: 격상 어휘 8+ 개 + 토론적 마무리 카드
- 문법: 분사구문 3+ 개 + 종속절 + 가정법 1개(선택). Agreement·Preposition·Syntax 무결.
- 구조: 만능 패턴 7 슬롯 + Cohesive 6 카테고리 + 토론적 마무리 풀
- 무결 필수: 단복수 일치 / 시간 전치사 / 다양한 syntax
$SPEC$,
  200,
  '{"max_issues":1,"min_skeleton_slots":7,"min_cohesive_categories":6,"min_participials":3,"max_filler_ratio":0.04,"require_agreement":true,"require_preposition":true}'::jsonb,
  '{"1-2":[2,4],"3-4":[1,3],"5+":[1,2]}'::jsonb,
  $MODEL$
It's a tough question. I haven't thought about it, but I'll give you my best shot. Generally speaking, it is often said that these days environmental issues are emerging. One of them would be recycling. If I had to choose one, it would be recycling. There is no doubt that we take it very seriously. It is undoubtedly true that we take it very seriously. To talk about recycling, first of all, generally speaking, we recycle regularly on a regular basis. Therefore, leading to the fact that we have a highly advanced recycling system for materials like plastic and aluminum and glass. As long as I know, the government has strict rules on recycling. If you don't do it, you get fined. Besides, a large number of foreign people come to Korea. They are absolutely fascinated by our well-practiced recycling. I'm genuinely proud of being Korean. In conclusion, I think we are performing well based on the trend so far. We hope to continue improving in the foreseeable future. The planet we are living on is not ours. It belongs to our children's children. So we should pass it on to the next generation as it is now. This is not an option. This is a must. By doing this, we can make a better world. We can make a better Korea. That's all I can say.
$MODEL$,
  $TONE$
[AL × 환경 톤 — 졸업 임박]
- "토론적 마무리 풀 카드 완성. 'This is not an option. This is a must.'까지 자연스러워요."
- "Cohesive 6 카테고리 무결. 분사구문도 풀 동원되고 있어요."
- "AL 진입 결정 신호 완성. 졸업 후보."
$TONE$
);

-- ============================================================================
-- [GROUP 3] description_random_industry_tech (산업·기술 — 산업·기술)
-- 자료 #13 — Breath of Vocabulary 심화 + 시장 점유율 정량화 + 외국인 captivated/unparalleled
-- 대표 토픽: 반도체/스마트폰 + 한류 (자료 #13 D)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- description_random_industry_tech_IL
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_industry_tech_IL', 'description_random_industry_tech', 'IL',
  $EVAL$
[IL × 돌발 산업·기술 — 부담 경감]
- 측정: 본인이 아는 한국 회사·제품 1~2개 단순 묘사
- 흠 (강): 발화 자체 포기 / 시제 혼선
$EVAL$,
  $FOCUS$
[IL × 산업·기술 코칭 우선순위]
1. "한국 회사 하나만 떠올려보세요. Samsung, LG, Hyundai 등."
2. Step 0 시간 벌기 1개
3. 단순 현재 시제로 1~3 문장 ("Samsung is a famous Korean company. They make phones and TVs. Many people use them.")
※ 어휘 격상 매트릭스 / 시장 점유율 정량화 / 한류 풀 X.
$FOCUS$,
  $SPEC$
[IL × 산업·기술 model_answer 톤]
- 분량: 5~8 문장 (50~70 단어)
- 어휘: 일상 (Samsung / LG / company / phone / car / make / use)
- 금지: 격상 어휘 / 정량화 / 한류 풀
$SPEC$,
  50,
  '{"max_issues":2,"max_filler_ratio":0.15,"require_consistent_tense":true}'::jsonb,
  '{"1-2":[2,4],"3-4":[1,3],"5+":[1,2]}'::jsonb,
  $MODEL$
It's a tough question. I'll do my best. Korea has many industries. Samsung is famous for phones and TVs. Hyundai makes cars. A lot of people around the world use these products. I'm proud of Korean companies. That's about it.
$MODEL$,
  $TONE$
[IL × 산업·기술 톤]
- "회사 이름 하나만 떠올려도 충분해요. Samsung, Hyundai, BTS 다 좋아요."
- 칭찬 → 한 문장 시범 → 따라하기.
$TONE$
);

-- ----------------------------------------------------------------------------
-- description_random_industry_tech_IM1
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_industry_tech_IM1', 'description_random_industry_tech', 'IM1',
  $EVAL$
[IM1 × 산업·기술 — Step 0 + 회사 종류 나열]
- 측정: Step 0 + 산업 종류 2~3개 나열 + 본인 사용 경험
- 흠 (강): 시제 혼선 / Step 0 부재
$EVAL$,
  $FOCUS$
[IM1 × 산업·기술 코칭 우선순위]
1. Step 0 강화
2. 산업 종류 2~3개 — "Korea has many industries like IT, automobile, and semiconductor."
3. 본인 사용 경험 — "I use a Samsung phone every day."
4. (베타) 자랑 — "I'm so proud of Korean companies."
※ 어휘 격상 매트릭스(numerous/sophisticated) / 시장 점유율 정량화 X.
$FOCUS$,
  $SPEC$
[IM1 × 산업·기술 model_answer 톤]
- 분량: 8~12 문장 (70~90 단어)
- 어휘: 일상 + 산업 어휘 (IT industry / automobile / semiconductor)
$SPEC$,
  70,
  '{"max_issues":2,"max_filler_ratio":0.12,"require_consistent_tense":true}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,4],"5+":[1,3]}'::jsonb,
  $MODEL$
It's a tough question. I haven't thought about it, but I'll do my best. Korea has many industries. There is the IT industry, the automobile industry, and the semiconductor industry. Samsung is famous for phones, and Hyundai makes cars. I use a Samsung phone every day, and I think it's a great product. K-pop is also popular all around the world. I'm so proud of Korean companies and K-pop. That's about it.
$MODEL$,
  $TONE$
[IM1 × 산업·기술 톤]
- "산업 종류 2~3개 나열만 해도 단락이 풍부해져요."
- 칭찬 → 산업 1개 추가 시범 → 따라하기.
$TONE$
);

-- ----------------------------------------------------------------------------
-- description_random_industry_tech_IM2
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_industry_tech_IM2', 'description_random_industry_tech', 'IM2',
  $EVAL$
[IM2 × 산업·기술 — 만능 패턴 4~5 슬롯 + 어휘 격상 1~2개]
- 측정: Step 0 + Step 1 일반화 + 산업 종류 나열 + 본인 선택 1개 + 외국인 반응 베타
- 흠 (강): 시제 혼선 / Agreement 위반 / 어휘 반복(many·good 반복)
$EVAL$,
  $FOCUS$
[IM2 × 산업·기술 코칭 우선순위]
1. Step 1~4 만능 패턴 — "Generally speaking, there are many industries in Korea, such as IT, food, automobile, semiconductor."
2. 본인 선택 1개 — "If I had to choose one, it would be the smartphone industry."
3. 어휘 격상 1~2개 — "many → a lot of / numerous" / "good → famous"
4. (베타) 외국인 반응 1문장 — "Foreigners use Samsung phones a lot."
※ 시장 점유율 정량화 / 'gain fame/booming/captivated' 풀 / 'immense sense of pride'는 IH·AL 전용.
$FOCUS$,
  $SPEC$
[IM2 × 산업·기술 model_answer 톤]
- 분량: 10~14 문장 (90~120 단어)
- 어휘: 일상 + 격상 어휘 1~2개 + 산업명
- 구조: 만능 패턴 4~5 슬롯
$SPEC$,
  90,
  '{"max_issues":2,"min_skeleton_slots":4,"max_filler_ratio":0.10,"require_consistent_tense":true}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,3],"5+":[1,2]}'::jsonb,
  $MODEL$
It's a tough question. I haven't thought about it, but I'll do my best. Generally speaking, there are many industries in Korea, such as the IT industry, food industry, automobile industry, and semiconductor industry. If I had to choose one, it would be the smartphone industry. Samsung is famous for its smartphones. A lot of people around the world use Samsung phones. K-pop is also popular. BTS is famous everywhere. I'm so proud of Korea as a Korean. That's about it.
$MODEL$,
  $TONE$
[IM2 × 산업·기술 톤]
- "'If I had to choose one, it would be ...' 이 표현 외워두세요. 어떤 돌발에도 통용돼요."
- 칭찬 → 본인 선택 표현 시범 → 따라하기.
$TONE$
);

-- ----------------------------------------------------------------------------
-- description_random_industry_tech_IM3
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_industry_tech_IM3', 'description_random_industry_tech', 'IM3',
  $EVAL$
[IM3 × 산업·기술 — 어휘 격상 매트릭스 도입 + 한류 1~2 문장]
- 측정: 만능 패턴 5~6 슬롯 + 격상 어휘 매트릭스 2~3개 (numerous/gain fame/booming) + 한류 1~2 문장
- 흠 (강): 어휘 반복 / Cohesive repetitive / Agreement 위반
$EVAL$,
  $FOCUS$
[IM3 × 산업·기술 코칭 우선순위]
1. **어휘 격상 매트릭스 2~3개 도입** (자료 #13 C):
   - many → numerous / a large number of
   - famous → gain fame / on the rise
   - amazing → captivated
2. 한류 1~2 문장 — "K-pop is on the rise. BTS has gained fame all around the world."
3. 만능 패턴 5~6 슬롯 (Step 0~5)
4. (베타) 시장 점유율 정량화 — "Samsung's market share is more than 30% globally."
※ 'unparalleled excellence' / 'immense sense of pride' 풀 / 결론·전망 풀은 IH·AL 전용.
$FOCUS$,
  $SPEC$
[IM3 × 산업·기술 model_answer 톤]
- 분량: 13~18 문장 (120~150 단어)
- 어휘: 격상 어휘 2~3개 + 산업·기술명 + 한류 어휘
- 구조: 만능 패턴 5~6 슬롯 + Cohesive 2~3 카테고리
$SPEC$,
  120,
  '{"max_issues":2,"min_skeleton_slots":5,"min_cohesive_categories":2,"max_filler_ratio":0.08}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,3],"5+":[1,2]}'::jsonb,
  $MODEL$
It's a tough question. I haven't thought about it, but I'll do my best. There are numerous industries here in Korea, such as the IT industry, food industry, automobile industry, semiconductor industry, and pharmaceutical industry. If I had to choose one, it would be the smartphone industry. Samsung Electronics has gained fame all around the world. Their market share is more than 30% globally. K-pop is also on the rise. BTS has become trendy and sensational. A large number of foreigners come to Korea because of K-pop and Korean culture. I'm so proud of that as a Korean. In conclusion, we are doing well. That's about it.
$MODEL$,
  $TONE$
[IM3 × 산업·기술 톤]
- "'gain fame / on the rise / market share is more than 30%' 이런 격상 표현 도입 좋아요."
- "'It fills me with an immense sense of pride' 한 표현만 더 격상하면 IH 신호."
- 칭찬 → 어휘 격상 1개 시범 → 따라하기.
$TONE$
);

-- ----------------------------------------------------------------------------
-- description_random_industry_tech_IH (★ 산업·기술 핵심)
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_industry_tech_IH', 'description_random_industry_tech', 'IH',
  $EVAL$
[IH × 산업·기술 — Breath of Vocabulary 풀 + 시장 점유율 정량화 + 한류 풀]
- 측정: (1) 만능 패턴 7 슬롯 (2) 어휘 격상 매트릭스 풀(자료 #13 C — 8 카테고리) (3) 시장 점유율 정량화 1+ (4) 한류 풀 (5) Cohesive 4 카테고리
- 흠 (매우 강): 어휘 반복(many·good·famous·amazing·people 반복) — 자료 #13 강사 명시 "어휘 폭이 결정적"
- 흠 (강): Agreement 위반 / 시장 점유율 정량화 부재 / 자랑 격상 부재
$EVAL$,
  $FOCUS$
[IH × 산업·기술 코칭 우선순위]
1. **Breath of Vocabulary 풀 적용** (자료 #13 C 8 카테고리):
   - many → numerous / countless / thousands of / millions of / a large number of / a great deal of
   - good → high-level / sophisticated / highly advanced / superior
   - famous → gain fame / on the rise / booming / getting more attention from the public / become trendy and sensational
   - foreign people → numerous international visitors
   - amazed → captivated / fascinated / stunned
   - best features → unparalleled excellence and characteristics
   - I'm so proud → It fills me with an immense sense of pride / I have a strong sense of pride
2. **시장 점유율 정량화 1+** — "Samsung Electronics has gained fame all around the world, whose market share is more than 30% globally, which is truly dominant."
3. **산업 = 기술 같은 패턴** — 강사 메시지 ("산업과 기술은 다르지 않다") 인지. 동일 답변 사용 OK.
4. **한류 풀** — "Korean wave has gained fame all around the world. K-pop is booming. New Jeans is on the rise. It has become trendy and sensational."
5. **외국인 반응 격상** — "Numerous international visitors come to Korea. They are captivated by its unparalleled excellence and characteristics."
6. **자랑 격상** — "I'm so proud of that as a Korean. It fills me with an immense sense of pride."
※ Agreement·Preposition·Syntax 무결 필수. 어휘 반복 발견 시 IH 자체 위협.
$FOCUS$,
  $SPEC$
[IH × 산업·기술 model_answer 톤]
- 분량: 18~24 문장 (170~210 단어)
- 어휘: 격상 어휘 6+ 개 (numerous / sophisticated / gain fame / on the rise / booming / captivated / unparalleled)
- 문법: 분사구문 2~3개 + 종속절. Agreement 무결.
- 구조: 만능 패턴 7 슬롯 + Cohesive 4 카테고리 + 한류 풀 + 정량화 1+
$SPEC$,
  170,
  '{"max_issues":1,"min_skeleton_slots":6,"min_cohesive_categories":4,"min_participials":2,"max_filler_ratio":0.06,"require_agreement":true,"require_preposition":true}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,3],"5+":[1,2]}'::jsonb,
  $MODEL$
It's a tough question. I haven't thought about it. I don't have much to talk about, but I'll do my best. There are numerous kinds of industries here in Korea, such as the IT industry, food industry, secondary battery industry, automobile industry, petrol chemical industry, and pharmaceutical industry, among others. If I had to choose one, it would be the smartphone industry. Samsung Electronics has gained fame all around the world, whose market share is more than 30% globally, which is truly dominant. On top of that, semiconductor technology is on the rise. Metaverse is booming. AI has become trendy and sensational. Korean wave has also gained fame all around the world. K-pop is booming. BTS and New Jeans are on the rise. Numerous international visitors come to Korea. They are captivated by its unparalleled excellence and characteristics. I'm so proud of that as a Korean. It fills me with an immense sense of pride. In conclusion, we are performing well based on the trend so far. I hope we continue to improve in the foreseeable future. That's pretty much about it.
$MODEL$,
  $TONE$
[IH × 산업·기술 톤 — AL 격상 신호]
- "Breath of Vocabulary 풀 적용 좋아요. 어휘 폭이 IH 신호 충족."
- "'It fills me with an immense sense of pride' 자랑 격상도 자연스러워요."
- "Agreement만 무결하면 AL 후보. 'whose market share is more than 30% globally' 정량화 정확해요."
- 칭찬 → 한류 풀 추가 시범 → 따라하기.
$TONE$
);

-- ----------------------------------------------------------------------------
-- description_random_industry_tech_AL
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_industry_tech_AL', 'description_random_industry_tech', 'AL',
  $EVAL$
[AL × 산업·기술 — Breath of Vocabulary 매트릭스 무결 + 정량화 풀 + 결론·전망 풀]
- 측정: (1) 어휘 격상 매트릭스 8 카테고리 무결 (2) 시장 점유율 정량화 풀 (3) Cohesive 5~6 카테고리 (4) 결론·전망 풀
- 흠 (매우 강 — AL 박탈): 어휘 반복 / Agreement·Preposition·Syntax 위반
$EVAL$,
  $FOCUS$
[AL × 산업·기술 코칭 우선순위]
1. **어휘 격상 매트릭스 8 카테고리 무결** (자료 #13 C 전부)
2. **시장 점유율 정량화 풀** — "whose market share is more than 30% globally, which is truly dominant / tremendous. It can be said to be superior."
3. **외국인 반응 풀** — "Numerous international visitors come to Korea. They are captivated by its unparalleled excellence and characteristics."
4. **자랑 격상 풀** — "It fills me with an immense sense of pride. I have a strong sense of pride."
5. **결론·전망 풀** — "we are performing well based on the trend so far. I hope we continue to improve in the foreseeable future. I hope this trend continues just like this forever. We can keep it up."
6. Cohesive 5~6 카테고리 골고루
※ 강사 메시지: "내가 못 쓰는 표현 한두 개 박아 넣기" — 전부 어려운 어휘 X. 자연스러움 + 일부 격상.
$FOCUS$,
  $SPEC$
[AL × 산업·기술 model_answer 톤]
- 분량: 22~28 문장 (210~270 단어)
- 어휘: 격상 어휘 8+ 개 매트릭스 풀 + 정량화 + 결론·전망 풀
- 문법: 분사구문 3+ 개 + 종속절. Agreement·Preposition·Syntax 무결.
- 구조: 만능 패턴 7 슬롯 + Cohesive 5~6 카테고리 + 한류 풀
$SPEC$,
  210,
  '{"max_issues":1,"min_skeleton_slots":7,"min_cohesive_categories":5,"min_participials":3,"max_filler_ratio":0.04,"require_agreement":true,"require_preposition":true}'::jsonb,
  '{"1-2":[2,4],"3-4":[1,3],"5+":[1,2]}'::jsonb,
  $MODEL$
It's a tough question. I haven't thought about it. I don't have much to talk about, but I'll give you my best shot. There are numerous kinds of industries here in Korea, such as the IT industry, food industry, secondary battery industry, automobile industry, petrol chemical industry, and pharmaceutical industry, among others. If I had to choose one, it would be the smartphone industry or, more broadly, smartphone technology. Samsung Electronics has gained fame all around the world, whose market share is more than 30% globally, which is truly dominant. It can be said to be superior. Furthermore, metaverse is on the rise. Cloud computing services are booming. AI has become trendy and sensational, getting more attention from the public every day. Korean wave has also gained fame all around the world. K-pop is booming. New Jeans is on the rise. K-pop is truly getting more attention from the public all around the world. Numerous international visitors come to Korea. They are absolutely captivated by its unparalleled excellence and characteristics. I'm genuinely proud of that as a Korean. It fills me with an immense sense of pride. In conclusion, I think we are performing well based on the trend so far. I hope we continue to improve in the foreseeable future. I hope this trend continues just like this forever. We can keep it up. That's all I can say.
$MODEL$,
  $TONE$
[AL × 산업·기술 톤 — 졸업 임박]
- "Breath of Vocabulary 매트릭스 8 카테고리 무결. 정량화도 자연스러워요."
- "결론·전망 풀('based on the trend so far / in the foreseeable future / We can keep it up')도 동원되고 있어요."
- "AL 진입 결정 신호 완성. 졸업 후보."
$TONE$
);

-- ============================================================================
-- [GROUP 4] description_random_personal (개인 — 모임·휴일·자유시간)
-- 자료 #14 — 양면 토론 구조(자유시간 100% 스마트폰) + 가족 emphasis + 추석 풀 모범
-- 대표 토픽: 자유시간(스마트폰 양면 토론) + 추석
-- ============================================================================

-- ----------------------------------------------------------------------------
-- description_random_personal_IL
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_personal_IL', 'description_random_personal', 'IL',
  $EVAL$
[IL × 돌발 개인 — 부담 경감 (개인 돌발은 가장 쉬움)]
- 측정: 본인 자유시간/휴일 활동 1~3 문장 단순 묘사
- 흠 (강): 발화 자체 포기 / 시제 혼선
$EVAL$,
  $FOCUS$
[IL × 개인 코칭 우선순위]
1. "개인 돌발은 가장 쉬워요. 본인 일상만 떠올리면 됩니다."
2. Step 0 시간 벌기 1개
3. 단순 현재 시제로 본인 활동 1~3 문장 ("In my free time, I watch YouTube. I also like to listen to music. It makes me happy.")
※ 양면 토론 구조 / 가족 emphasis 풀 / 추석 전통 어휘는 IL X.
$FOCUS$,
  $SPEC$
[IL × 개인 model_answer 톤]
- 분량: 5~8 문장 (50~70 단어)
- 어휘: 일상 (free time / YouTube / music / family / weekend)
- 금지: 격상 어휘 / 양면 토론 / 토론적 결론
$SPEC$,
  50,
  '{"max_issues":2,"max_filler_ratio":0.15,"require_consistent_tense":true}'::jsonb,
  '{"1-2":[2,4],"3-4":[1,3],"5+":[1,2]}'::jsonb,
  $MODEL$
It's a tough question. I'll do my best. In my free time, I watch YouTube. I also listen to music. Sometimes I spend time with my family on weekends. It makes me happy. That's about it.
$MODEL$,
  $TONE$
[IL × 개인 톤]
- "개인 주제는 누구나 답변 가능해요. 본인 일상 한 가지만 떠올리면 됩니다."
- 칭찬 → 한 문장 시범 → 따라하기.
$TONE$
);

-- ----------------------------------------------------------------------------
-- description_random_personal_IM1
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_personal_IM1', 'description_random_personal', 'IM1',
  $EVAL$
[IM1 × 개인 — Step 0 + 일반화 + 본인 활동]
- 측정: Step 0 + 일반화 1문장 + 본인 활동 2~3 문장
- 흠 (강): Step 0 부재 / 시제 혼선
$EVAL$,
  $FOCUS$
[IM1 × 개인 코칭 우선순위]
1. Step 0 시간 벌기 강화
2. 일반화 — "These days I've been busy. But I have free time on weekends."
3. 본인 활동 — "I usually watch YouTube and listen to music."
4. (베타) 가족 emphasis — "I love my family."
※ 양면 토론 구조 / 토론적 결론은 IM1 X.
$FOCUS$,
  $SPEC$
[IM1 × 개인 model_answer 톤]
- 분량: 8~12 문장 (70~90 단어)
- 어휘: 일상 + 빈도 부사
$SPEC$,
  70,
  '{"max_issues":2,"max_filler_ratio":0.12,"require_consistent_tense":true}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,4],"5+":[1,3]}'::jsonb,
  $MODEL$
It's a tough question. I haven't thought about it, but I'll do my best. These days I've been busy with work. But I have free time on weekends. I usually watch YouTube on my smartphone. I also listen to music. Sometimes I spend time with my family. I love them a lot. It makes me happy. That's about it.
$MODEL$,
  $TONE$
[IM1 × 개인 톤]
- "본인 일상 + 가족 한 문장 추가하면 단락이 풍부해져요."
- 칭찬 → 가족 emphasis 시범 → 따라하기.
$TONE$
);

-- ----------------------------------------------------------------------------
-- description_random_personal_IM2
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_personal_IM2', 'description_random_personal', 'IM2',
  $EVAL$
[IM2 × 개인 — 만능 패턴 4 슬롯 + 가족 emphasis]
- 측정: Step 0 + 일반화 + 본인 활동 + 가족·휴일 강조 + Cohesive 2~3 카테고리
- 흠 (강): Cohesive repetitive / Agreement 위반
$EVAL$,
  $FOCUS$
[IM2 × 개인 코칭 우선순위]
1. 만능 패턴 4~5 슬롯 베타 적용
2. 가족 emphasis 강화 — "Family is important to me. I love spending time with my family."
3. Cohesive 2~3 카테고리 — "first of all / besides / in addition"
4. (베타) 자유시간 = 스마트폰 패턴 — "Most of the time I use my smartphone for YouTube."
※ 양면 토론 구조 / 토론적 결론은 IH·AL 전용.
$FOCUS$,
  $SPEC$
[IM2 × 개인 model_answer 톤]
- 분량: 10~14 문장 (90~120 단어)
- 어휘: 일상 + 가족·휴일 어휘
- 구조: 만능 패턴 4~5 슬롯 + 가족 emphasis
$SPEC$,
  90,
  '{"max_issues":2,"min_skeleton_slots":4,"max_filler_ratio":0.10,"require_consistent_tense":true}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,3],"5+":[1,2]}'::jsonb,
  $MODEL$
It's a tough question. I haven't thought about it, but I'll do my best. Generally speaking, these days I've been busy with work. But I have free time on weekends or holidays. First of all, most of the time I use my smartphone for entertainment. I watch YouTube videos that I'm interested in. Besides, I also spend time with my family. Family is important to me. I love spending time with them. It makes me happy. In addition, we share meals and talk about our day. That's about it.
$MODEL$,
  $TONE$
[IM2 × 개인 톤]
- "가족 emphasis ('Family is important to me') 한 문장 더 추가하면 자연스러워요."
- "'most of the time I use my smartphone' 이 패턴 외워두세요. 자유시간 만능 표현."
$TONE$
);

-- ----------------------------------------------------------------------------
-- description_random_personal_IM3
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_personal_IM3', 'description_random_personal', 'IM3',
  $EVAL$
[IM3 × 개인 — 자유시간 100% 스마트폰 패턴 + 양면 토론 구조 베타]
- 측정: 만능 패턴 5~6 슬롯 + 자유시간 100% 스마트폰 도입 + 좋은 점 1~2개 + 나쁜 점 베타 1문장
- 흠 (강): Cohesive repetitive / 어휘 반복 / Agreement 위반
$EVAL$,
  $FOCUS$
[IM3 × 개인 코칭 우선순위]
1. **자유시간 = 100% 스마트폰 패턴** (자료 #14 D) — "Most of the time I use my smartphone for entertainment / for entertaining purposes."
2. 좋은 점 — "The best part is that it is absolutely free. It doesn't cost anything."
3. (베타) 나쁜 점 1문장 — "On the other hand, sometimes I get addicted to it."
4. Cohesive 3 카테고리 (first of all / on the other hand / in conclusion)
5. 가족 emphasis 강화
※ 양면 토론 풀 (해결책 + 토론적 결론) / 토론적 결론("Technology is supposed to ...")은 IH·AL 전용.
$FOCUS$,
  $SPEC$
[IM3 × 개인 model_answer 톤]
- 분량: 13~18 문장 (120~150 단어)
- 어휘: 격상 어휘 2~3개 + 자유시간 스마트폰 어휘
- 구조: 만능 패턴 5~6 슬롯 + 양면 토론 베타 (좋은 점 + 나쁜 점 1문장)
$SPEC$,
  120,
  '{"max_issues":2,"min_skeleton_slots":5,"min_cohesive_categories":3,"max_filler_ratio":0.08}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,3],"5+":[1,2]}'::jsonb,
  $MODEL$
It's a tough question. I haven't thought about it, but I'll do my best. Generally speaking, these days I've been incredibly busy with work, especially on weekdays. However, I do have free time on weekends or holidays. First of all, most of the time I use my smartphone for entertainment. I watch YouTube videos that I'm interested in. The best part is that it is absolutely free. It doesn't cost anything. On the other hand, sometimes I get addicted to it. I feel like I waste my time. Besides, I also spend quality time with my family. Family is everything to me. In conclusion, I love my free time. That's about it.
$MODEL$,
  $TONE$
[IM3 × 개인 톤]
- "양면 토론 구조 베타 시도 좋아요. '좋은 점 → 나쁜 점' 패턴이 IH 신호예요."
- "'The best part is that ... / On the other hand ...' 이 두 표현이 양면 토론의 핵심이에요."
- 칭찬 → 양면 토론 강화 시범 → 따라하기.
$TONE$
);

-- ----------------------------------------------------------------------------
-- description_random_personal_IH (★ 개인 핵심)
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_personal_IH', 'description_random_personal', 'IH',
  $EVAL$
[IH × 개인 — 양면 토론 구조 풀 + 가족 emphasis 풀 + 해결책 도입]
- 측정: (1) 만능 패턴 7 슬롯 (2) 양면 토론 4단 (좋은 점 → 반전 → 나쁜 점 → 해결책) (3) Cohesive 5 카테고리 (4) 가족 emphasis 풀 (5) 분사구문 2~3개
- 흠 (매우 강): Cohesive repetitive / Agreement 위반 / 양면 토론 부재(좋은 점만 나열)
- 흠 (강): 토론적 결론(Step 5) 부재 / 분사구문 부재
$EVAL$,
  $FOCUS$
[IH × 개인 코칭 우선순위]
1. **양면 토론 구조 4단 적용** (자료 #14 D — AL 격상 골격):
   - Step 1 일반화: "These days I've been incredibly busy / extremely busy, especially on weekdays. However, I do have free time on weekends."
   - Step 2 좋은 점: "Most of the time I use my smartphone for entertainment. The best part is that it is absolutely free. I can dive deep into many favorite subjects."
   - Step 3 반전 → 나쁜 점: "On the other hand, the bad thing is that I become someone addicted to it. The drawback is that when I don't have my smartphone with me, I get this strange feeling like something is missing in my life."
   - Step 4 해결책: "Therefore, I realized I need to cut back on this addiction. It is imperative to cut back on the usage of a smartphone."
2. **가족 emphasis 풀** — "I'd like to allocate my quality time with my family." / "Family is my whole world. Family comes first."
3. **추석 토픽 — 가족 bonding** (자료 #14 C): "Chuseok is a day of thanksgiving when families gather together to spend time with each other. Family is my whole world. Some people say celebrating holidays is for relaxation, but to me it is a family bonding time."
4. **분사구문** — "Sometimes crying, sometimes laughing" / "completely lost in the moment"
5. Cohesive 5 카테고리 골고루
※ Step 5 토론적 결론("Technology is supposed to make people's lives convenient ...") 풀은 AL 격상 신호. IH는 베타 시도.
$FOCUS$,
  $SPEC$
[IH × 개인 model_answer 톤]
- 분량: 18~24 문장 (170~210 단어)
- 어휘: 격상 어휘 5+ 개 + 양면 토론 어휘 (the best part / on the other hand / the drawback / imperative to cut back)
- 문법: 분사구문 2~3개 + 종속절. Agreement 무결.
- 구조: 만능 패턴 7 슬롯 + 양면 토론 4단 (좋은 점 → 반전 → 나쁜 점 → 해결책)
- 베타: 토론적 결론 1문장 시도
$SPEC$,
  170,
  '{"max_issues":1,"min_skeleton_slots":6,"min_cohesive_categories":5,"min_participials":2,"max_filler_ratio":0.06,"require_agreement":true,"require_preposition":true}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,3],"5+":[1,2]}'::jsonb,
  $MODEL$
It's a tough question. I haven't thought about it, but I'll do my best. Generally speaking, it is often said that these days I've been incredibly busy, especially on weekdays. Therefore, I've had limited free time. However, I do have a lot of free time on weekends or holidays. Most of the time I use my smartphone for entertainment. It is a good source for videos that I'm interested in, sometimes crying, sometimes laughing. The best part is that it is absolutely free. It doesn't cost anything. I can dive deep into many favorite subjects and have unlimited access to my interests. On the other hand, the bad thing is that I become someone addicted to it. The drawback is that when I don't watch YouTube, I get this strange feeling like something is missing in my life. Therefore, I realized I need to cut back on this addiction and find the solution soon. I'd like to allocate my quality time with my family. Family is my whole world. Family comes first. That's pretty much about it.
$MODEL$,
  $TONE$
[IH × 개인 톤 — AL 격상 신호]
- "양면 토론 4단 구조 완성도 좋아요. '좋은 점 → 반전 → 나쁜 점 → 해결책' 모두 들어갔어요."
- "'The drawback is that ... / It is imperative to cut back on ...' 격상 표현도 자연스러워요."
- "Step 5 토론적 결론('Technology is supposed to make people's lives convenient, but ironically ...') 한 문장 더 붙이면 AL 후보."
- 칭찬 → 토론적 결론 시범 → 따라하기.
$TONE$
);

-- ----------------------------------------------------------------------------
-- description_random_personal_AL
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_random_personal_AL', 'description_random_personal', 'AL',
  $EVAL$
[AL × 개인 — 양면 토론 5단 + 토론적 결론 풀 + 메타 메시지]
- 측정: (1) 양면 토론 5단 (좋은 점 → 반전 → 나쁜 점 → 해결책 → **토론적 결론**) (2) 토론적 결론 풀 (3) 메타 메시지 (4) Cohesive 6 카테고리
- 흠 (매우 강 — AL 박탈): 토론적 결론 부재 / Agreement·Preposition·Syntax 위반 / Cohesive repetitive
- 흠 (강): 분사구문 부재 / 양면 토론 4단 이하
$EVAL$,
  $FOCUS$
[AL × 개인 코칭 우선순위]
1. **양면 토론 5단 완성** (자료 #14 D — 마지막 Step 5 토론적 결론이 AL 결정):
   - Step 5 토론적 결론: "Technology is supposed to make people's lives convenient. It is one thing, but the other thing is that it makes us unable to sustain healthy relationships with others — which is a big shame. Technological development is supposed to bring people closer, but ironically, it makes us further apart."
2. **메타 메시지** — 개인 주제를 사회·문화적 통찰로 격상
3. **Cohesive 6 카테고리 무결**
4. **분사구문 풀 동원** — "completely lost in the moment" / "sometimes crying, sometimes laughing"
5. **격상 어휘 풀** — `incredibly busy / significantly busy / limited free time / dive deep into / unlimited access / imperative to cut back / allocate my quality time / sustain healthy relationships`
6. 가족 emphasis 풀 + 추석 토픽 양면 — "Some people say celebrating holidays is for relaxation, but to me it is a family bonding time."
$FOCUS$,
  $SPEC$
[AL × 개인 model_answer 톤]
- 분량: 22~28 문장 (210~270 단어)
- 어휘: 격상 어휘 8+ 개 + 양면 토론 어휘 + 토론적 결론 카드
- 문법: 분사구문 3+ 개 + 종속절. Agreement·Preposition·Syntax 무결.
- 구조: 만능 패턴 7 슬롯 + 양면 토론 5단 + 토론적 결론 풀 + 메타 메시지
$SPEC$,
  210,
  '{"max_issues":1,"min_skeleton_slots":7,"min_cohesive_categories":6,"min_participials":3,"max_filler_ratio":0.04,"require_agreement":true,"require_preposition":true}'::jsonb,
  '{"1-2":[2,4],"3-4":[1,3],"5+":[1,2]}'::jsonb,
  $MODEL$
It's a tough question. I haven't thought about it, but I'll give you my best shot. Generally speaking, it is often said that these days I've been incredibly busy, especially on weekdays. Therefore, I've had limited free time, leading to the fact that I rarely get a chance to relax. However, I do have a lot of free time on weekends or holidays. Most of the time I use my smartphone for entertainment. It is a good source for videos that I'm interested in, sometimes crying, sometimes laughing, completely lost in the moment. The best part is that it is absolutely free. It doesn't cost anything. I can dive deep into many favorite subjects and have unlimited access to my interests. On the other hand, the bad thing is that I become someone addicted to it. The drawback is that when I don't have my smartphone with me, I get this strange feeling like something is missing in my life. Therefore, I realized I need to cut back on this addiction and find the solution soon. It is imperative to cut back on the usage of a smartphone. I'd like to allocate my quality time with my family. Family is my whole world. Honestly, technology is supposed to make people's lives convenient. It is one thing, but the other thing is that it makes us unable to sustain healthy relationships with others — which is a big shame. Technological development is supposed to bring people closer, but ironically, it makes us further apart. That's all I can say.
$MODEL$,
  $TONE$
[AL × 개인 톤 — 졸업 임박]
- "양면 토론 5단 완성. 토론적 결론('Technology is supposed to bring people closer, but ironically, it makes us further apart')도 자연스러워요."
- "메타 메시지로 개인 주제를 사회·문화적 통찰로 격상시켰어요."
- "AL 진입 결정 신호 완성. 졸업 후보."
$TONE$
);

COMMIT;

-- ============================================================================
-- 검증 (적용 후):
--   SELECT guide_id, target_grade, model_answer_min_words,
--          length(coaching_focus) AS focus_len, length(example_model_answer) AS model_len
--   FROM coaching_specs
--   WHERE question_type LIKE 'description_random_%'
--   ORDER BY question_type,
--            array_position(ARRAY['IL','IM1','IM2','IM3','IH','AL']::text[], target_grade);
--
-- 기대: 24 row (4 그룹 × 6 등급), focus_len/model_len 등급별로 증가
-- ============================================================================

-- ============================================================================
-- 롤백 스크립트:
--   DELETE FROM coaching_specs WHERE question_type LIKE 'description_random_%';
-- ============================================================================
