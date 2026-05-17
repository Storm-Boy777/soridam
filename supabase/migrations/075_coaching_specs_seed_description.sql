-- ============================================================================
-- 075_coaching_specs_seed_description.sql
-- AI 코치 v5 — 1차 시드: 묘사(description) × 6 등급 = 6 row
-- ============================================================================
-- 설계 문서:
--   docs/설계/스피킹코치_재설계.md
--   §5.1.1  spec 카탈로그 (14 spec_id × 6 등급)
--   §5.9    LEVEL GATE 등급별 코칭 우선순위 매트릭스
--   §11.7.2 묘사 자료 #1 + #5 풀 보강 (G~N — 집 토픽 풀 모범 3종)
-- 자료 출처:
--   자료 #1 — 1:1 묘사(집) 코칭 세션 (페르소나·짚는 순서 etalon)
--   자료 #5 — Skeleton paragraph 강의 (집 토픽 Q2/Q5/Q8 풀 모범 3종 + 학습법)
-- 1차 MVP 활성: description 6 등급 → Dogfooding 검증 사이클 즉시 가능
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- description_IL
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_IL',
  'description',
  'IL',
  $IL_EVAL$
[IL 평가 — 단어 위주 발화 ↔ 단순 문장 진입]
- 측정 영역: (1) 단순 현재 시제 일관성 (2) 한 문장 완전 발화 (3) 토픽과 직접 관련된 단어·구 사용
- 흠 (강도): 시제 혼선 [강] / 단어 나열만 (불완전 문장) [강] / 주어 부재 [강]
- 흠 (약 — 코칭 X): Skeleton 부재 / Cohesive devices 부재 / 어휘 폭 부족 / 분사구문 부재
  → IL 단계에서는 격상 요소 강요 X. 단순 문장으로 발화 가능하게 격려.
$IL_EVAL$,
  $IL_FOCUS$
[IL 코칭 우선순위]
1. 한 문장씩 완전 문장으로 발화 (주어+동사+목적어)
2. 단순 현재 시제 일관성 유지 (혼선 X)
3. 본인 환경 묘사 가능한 키워드 1~3개 영어로 자연스럽게
4. 격려 중심 — "외우려 하지 마세요. 자신의 이야기로 한 문장씩 만들어 보세요"
※ 짚는 순서 etalon 1~3단계만 (첫 문장 리듬 / 어색한 단어 / 불가산 명사). 단락·분사·격상 어휘는 다루지 X.
$IL_FOCUS$,
  $IL_SPEC$
[IL model_answer 톤]
- 분량: 6~10 문장 (60~80 단어)
- 어휘: 단순 일상 어휘 (apartment / family / room / bedroom / living room / TV / comfortable / like)
- 문법: 단순 현재 시제 위주. I am / I have / I like / We get along.
- 구조: Skeleton 강요 X. 자연스러운 나열도 OK. 단 시제·주어 일관성 필수.
- 금지: 분사구문 / 비교급 / 격상 어휘(numerous/captivated 등) / 가정법
$IL_SPEC$,
  60,
  '{"max_issues":2,"min_skeleton_slots":0,"max_filler_ratio":0.15,"require_consistent_tense":true}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,4],"5+":[1,2]}'::jsonb,
  $IL_MODEL$
My house is an apartment. I live with my family. We have three bedrooms and two bathrooms. The living room is comfortable. I like to watch TV there. My family is important to me. I love my parents. I have my own room. I sleep and study in my room. That's about it.
$IL_MODEL$,
  $IL_TONE$
[IL 톤 — 격려 중심, 부담 경감]
- "잘 시작하셨어요. 한 문장씩 완성해보세요."
- "외우려 하지 마세요. 자신의 이야기로 한 문장씩 만들면 됩니다."
- 칭찬 → 한 가지 짚기 → 시범 → 따라하기. 한 번에 많이 짚지 않음.
- 등급·점수·약점 코드 일절 노출 X.
$IL_TONE$
);

-- ----------------------------------------------------------------------------
-- description_IM1
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_IM1',
  'description',
  'IM1',
  $IM1_EVAL$
[IM1 평가 — 단순 문장 1개씩 발화 OK ↔ 빈도 부사·기본 격상 어휘 도입]
- 측정 영역: (1) 시제 일관성 (2) 빈도 부사 1~2개 사용 (3) 기본 격상 어휘 1~2개 사용 (4) 가족·이웃 등 emphasis 표현 1개
- 흠 (강도): 시제 혼선 [강] / 3인칭 단수 -s 누락 [강] / 빈도 부사 전무 [중] / 어휘 반복 (every sentence에 like/have/is만) [중]
- 흠 (약 — 코칭 X): Skeleton 미흡 / Cohesive 부재 / 분사구문 부재
$IM1_EVAL$,
  $IM1_FOCUS$
[IM1 코칭 우선순위]
1. 빈도 부사 도입 (usually / sometimes / always / every day)
2. 어휘 1~2개 격상 시도 (good → nice/great / many → a lot of / live → spend time)
3. 가족·이웃 emphasis 표현 1개 (Family is important / I love my neighbors)
4. 3인칭 단수 -s 정확성 (My mom cooks / She likes)
※ 짚는 순서 etalon 1~3단계 + 4단계 진입 시도(단락 구조 베이타). Cohesive·분사·고급 어휘는 아직 X.
$IM1_FOCUS$,
  $IM1_SPEC$
[IM1 model_answer 톤]
- 분량: 8~12 문장 (80~110 단어)
- 어휘: 일상 어휘 + 빈도 부사 2~3개 + 기본 격상 어휘 1~2개 (a lot of / nice / spend time)
- 문법: 단순 현재 + 빈도 부사 위치 정확. 3인칭 단수 -s 정확.
- 구조: 자연스러운 나열 OK. Topic sentence 베타 시도 가능 (My house is ...).
- 금지: 복잡한 분사 구문 / 비교급 / 격상 어휘 풀(numerous/captivated 등) / 가정법
$IM1_SPEC$,
  80,
  '{"max_issues":2,"min_skeleton_slots":0,"min_freq_adverbs":2,"max_filler_ratio":0.12,"require_consistent_tense":true}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,4],"5+":[1,3]}'::jsonb,
  $IM1_MODEL$
My house is an apartment in Seoul. I live with my family of four. We have three bedrooms and two bathrooms. My mom usually cooks for everyone in the kitchen. The living room is really comfortable, and we sometimes watch TV together. I love my family. We always get along well. I have my own room, and I spend a lot of time there. Sometimes I listen to music. Sometimes I watch YouTube. I really like my home.
$IM1_MODEL$,
  $IM1_TONE$
[IM1 톤 — 격려 + 한 가지 격상 시범]
- "이거 한 번 따라해볼래요? 'usually'만 넣어도 훨씬 자연스러워요."
- "내용은 자신의 이야기로 하시면 됩니다. 외우지 마세요."
- 칭찬 → 한 가지 짚기 → 시범 → 따라하기 → 칭찬.
- 등급·점수 노출 X.
$IM1_TONE$
);

-- ----------------------------------------------------------------------------
-- description_IM2
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_IM2',
  'description',
  'IM2',
  $IM2_EVAL$
[IM2 평가 — 두 문장 묶기 OK ↔ 종속절·Skeleton 4 슬롯 시도]
- 측정 영역: (1) and/but/so로 문장 묶기 (2) 종속절(where/when) 도입 (3) Topic sentence 도입 (To talk about ...) (4) Skeleton 4 슬롯(topic+supporting 2+concluding)
- 흠 (강도): 단순 문장만 나열 (묶기 부재) [강] / 시제 혼선 [강] / 단조로움 (모든 문장 I + 동사) [중] / 어휘 폭 부족 [중]
- 흠 (약): Skeleton 완성 부재 / Cohesive 다양성 부족 / 격상 어휘 부재 / 분사구문 부재
$IM2_EVAL$,
  $IM2_FOCUS$
[IM2 코칭 우선순위]
1. 두 문장 → and/but/so/where로 묶기 (단조로움 회피)
2. 종속절 도입 (where I usually relax / when I have time)
3. Topic sentence 도입 (To talk about my house, ...)
4. 어휘 2~3개 격상 (many → a lot of / good → comfortable·nice·peaceful)
5. Skeleton 4 슬롯 베타 시도 (topic + supporting 2 + concluding)
※ 짚는 순서 etalon 1~4단계. 분사·고급 어휘는 베타 시도 OK.
$IM2_FOCUS$,
  $IM2_SPEC$
[IM2 model_answer 톤]
- 분량: 10~15 문장 (100~140 단어)
- 어휘: 일상 어휘 + 격상 어휘 2~3개 (comfortable / peaceful / supportive / get along well)
- 문법: 단순 현재 + 종속절(where/when) 2~3개 + and/but/so 묶기. 3인칭 단수 -s 정확.
- 구조: Topic sentence + 자연스러운 단락. Skeleton 4 슬롯 충족 권장 (강요 X).
- 베타 허용: 단순 분사구문 1개 (lying on the bed / watching TV)
- 금지: 복잡한 비교급 / 가정법 / 격상 어휘 풀(numerous/captivated 등)
$IM2_SPEC$,
  100,
  '{"max_issues":2,"min_skeleton_slots":4,"min_subordinate_clauses":2,"max_filler_ratio":0.10,"require_consistent_tense":true}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,3],"5+":[1,2]}'::jsonb,
  $IM2_MODEL$
To talk about my house, I live in an apartment with my family of four. The apartment has three bedrooms and two bathrooms, where my mom usually cooks for everyone in the kitchen. The living room is comfortable, and I often watch TV there with my family. My family is important to me, and we get along well. My parents are supportive, so I love them a lot. I have my own bedroom where I can do what I want. I sometimes listen to music, and sometimes I watch YouTube lying on the bed. Overall, I really like my home. That's about it.
$IM2_MODEL$,
  $IM2_TONE$
[IM2 톤 — 격려 + 한 단락 묶기 시범]
- "이번에는 두 문장을 'and'나 'where'로 묶어볼까요?"
- "'To talk about my house' 이렇게 시작하면 단락이 자연스러워져요."
- 칭찬 → 한 가지 짚기 → 시범 → 따라하기 → 다음 도전.
$IM2_TONE$
);

-- ----------------------------------------------------------------------------
-- description_IM3
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_IM3',
  'description',
  'IM3',
  $IM3_EVAL$
[IM3 평가 — 종속절+연속 문장 OK ↔ Skeleton paragraph 골격 도입]
- 측정 영역: (1) Skeleton 5~6 슬롯 (topic+transition+supporting 3+concluding) (2) Cohesive devices 2~3 카테고리 (firstly/another/lastly) (3) 어휘 격상 매트릭스 3~4개 (4) 분사구문 1~2개 (5) Closing tag (that's about it)
- 흠 (강도): Skeleton 부재 (sentences string 수준) [강] / 어휘 폭 부족 (many·like·have 반복) [강] / Cohesive 부재 [중] / 분사구문 부재 [중]
- 흠 (약): 위치별 표지 단조로움 / 강조 표현 부족
$IM3_EVAL$,
  $IM3_FOCUS$
[IM3 코칭 우선순위]
1. Skeleton 6 슬롯 골격 확정 (topic + transition + supporting × 3 + concluding + closing)
2. Cohesive devices 2~3 카테고리 도입 (firstly + another + lastly + in conclusion)
3. 어휘 격상 매트릭스 시도 (many → numerous / use → take advantage of / good → comfortable·peaceful)
4. where/whenever 부사 구문 다양화 (where I usually watch TV / whenever I have time)
5. 분사구문 1~2개 시도 (lying on the bed / watching YouTube)
※ 짚는 순서 etalon 1~5단계. 단락 구조가 핵심. 격상 어휘는 1~2개씩 점진.
$IM3_FOCUS$,
  $IM3_SPEC$
[IM3 model_answer 톤]
- 분량: 12~18 문장 (130~170 단어)
- 어휘: 일상 + 격상 어휘 3~4개 (comfortable / peaceful / supportive / vibrant / well maintained)
- 문법: 단순 현재 + 종속절 + 분사구문 1~2개. 3인칭 단수 -s 정확.
- 구조: Skeleton 5~6 슬롯 충족 + Cohesive 2~3 카테고리.
- 위치별 표지: Q2 위치 표지 1세트 일관 사용 (To talk about / to get into more details / the first/second/last thing is that / Overall / That's about it)
- 베타 허용: 강조 표현 1개 (without being bothered / which is my favorite thing)
- 금지: 비교급 격상 / 가정법 / 토론적 마무리
$IM3_SPEC$,
  130,
  '{"max_issues":2,"min_skeleton_slots":5,"min_cohesive_categories":2,"min_participials":1,"max_filler_ratio":0.08}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,3],"5+":[1,2]}'::jsonb,
  $IM3_MODEL$
To talk about my house, I live in an apartment that offers both convenience and a strong sense of community. To get into more details, the first thing is that I live with my family consisting of four members — my parents, my sister, and me. Family is everything to me. Another thing is that my apartment has three bedrooms and two bathrooms, where my mom usually cooks for everyone in the kitchen. There is also a living room, where I often watch TV and relax on the sofa. And the last thing is that I have my own bedroom where I can do whatever I want. I sometimes listen to music lying on the bed, which is my favorite thing. Overall, my apartment provides a comfortable living environment that fits my needs. That's about it.
$IM3_MODEL$,
  $IM3_TONE$
[IM3 톤 — 격려 + Skeleton 골격 명시]
- "이제 단락으로 묶어볼 수 있어요. 'To talk about ... / first ... / another ... / last ... / Overall ...' 이 흐름만 익히면 IH로 가는 거예요."
- "단어 하나만 더 격상해볼까요? 'many' 대신 'numerous'를 써보세요."
- 칭찬 → 한 가지 짚기 → 시범 → 따라하기 → 다음 도전.
$IM3_TONE$
);

-- ----------------------------------------------------------------------------
-- description_IH (★ MVP 핵심 등급)
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_IH',
  'description',
  'IH',
  $IH_EVAL$
[IH 평가 — Skeleton 완성 ↔ 위치별 표지 다양화·Cohesive 6 카테고리 동원]
- 측정 영역: (1) Skeleton 6 슬롯 확정 (2) 위치별 표지 다양화 (Q2/Q5/Q8 다른 표지) (3) Cohesive devices 4~5 카테고리 (도입·반전·예시·추가·결론·마무리에서 골고루) (4) 어휘 격상 매트릭스 풀 적용 (many → numerous/countless/large number of) (5) 강조 표현 카탈로그 2~3개 (without being bothered / to the fullest / without a doubt)
- 흠 (강도): Skeleton 6 슬롯 미달 [강] / Cohesive repetitive (first ... first ... first 반복) [강] / 어휘 폭 부족 (many·use 반복) [강] / 위치별 표지 단조로움 [중]
- 흠 (약): 분사구문 부족 / 비교급 부재 / 가정법 부재 / 토론적 마무리 부재
$IH_EVAL$,
  $IH_FOCUS$
[IH 코칭 우선순위]
1. **Skeleton 6 슬롯 확정** (topic + transition + supporting × 3 + concluding + closing)
2. **위치별 표지 다양화** — 같은 답변 안에서 Q2/Q5/Q8 표지를 일관 사용 (시험 위치 인식)
   - Q2: To talk about / to get into more details / the first/second/last thing is that / Overall / that's about it
   - Q5: Speaking of / speaking of that / one/another/last thing is that / The conclusion is that / that's pretty much about it
   - Q8: When it comes to / speaking of which / the good/another good/best thing is that / The bottom line is that / that's all I can say
3. **Cohesive devices 6 카테고리 골고루** (도입·반전·예시·추가·결론도입·마무리)
4. **어휘 격상 매트릭스 풀 적용** (many → numerous/countless/large number of, use → take advantage of, good → comfortable/peaceful, people → large number of people)
5. **강조 표현 도입** (without being bothered by others / to the fullest / without a doubt / without a care)
6. 분사구문 1~2개 (lying on the bed / watching YouTube)
※ 짚는 순서 etalon 1~6단계. 위치별 표지가 IH 결정 신호.
$IH_FOCUS$,
  $IH_SPEC$
[IH model_answer 톤]
- 분량: 15~20 문장 (160~200 단어)
- 어휘: 격상 어휘 5~6개 + 강조 표현 2~3개 + 일상 어휘
- 문법: 단순 현재 + 종속절 + 분사구문 2~3개 + 부사 구문. Agreement/Preposition 무결.
- 구조: Skeleton 6 슬롯 + 위치별 표지 정확 + Cohesive 4~5 카테고리.
- AL 베타 허용: 비교급 1개 (more comfortable than ...) / 격상 동사 1개 (treat me really nice)
- 금지: 가정법 / 토론적 마무리 (AL 전용)
$IH_SPEC$,
  160,
  '{"max_issues":1,"min_skeleton_slots":6,"min_cohesive_categories":4,"min_emphasis_phrases":2,"min_participials":1,"max_filler_ratio":0.06}'::jsonb,
  '{"1-2":[3,5],"3-4":[2,3],"5+":[1,2]}'::jsonb,
  $IH_MODEL$
Speaking of my house, living in an apartment offers both convenience and a strong sense of community. I love my neighbors. We are like a family. Speaking of that, one thing is that I live in an apartment with my family consisting of four members — my parents, my sister, and me. Personally, I put my family as the first thing in my life. Family comes first. I prioritize my family. Another thing is that it has three bedrooms and two bathrooms along with the kitchen and the living room, where I enjoy watching TV and relaxing on the sofa without a care, without being bothered by others, which is my favorite thing. And the last thing is that my favorite room is my room, of course, without a doubt, because I can do everything I want to do with a sense of freedom. I can watch YouTube sometimes laughing, sometimes crying. I can listen to music lying on the bed without thinking. That makes me empty my mind. The conclusion is that my apartment provides a comfortable and vibrant living environment that perfectly suits my needs for living. That's pretty much about it.
$IH_MODEL$,
  $IH_TONE$
[IH 톤 — 격려 + AL 격상 신호 제시]
- "Skeleton 완성도 좋아요. 이제 위치별 표지만 다양화하면 AL 후보예요."
- "'first/first/first' 반복은 채점관이 흠으로 봐요. 'one/another/last'로 한 번 바꿔볼까요?"
- 칭찬 → 한 가지 짚기 → 시범 → 따라하기 → AL 격상 신호 1개 미리 보여주기.
$IH_TONE$
);

-- ----------------------------------------------------------------------------
-- description_AL (★ 최고 등급)
-- ----------------------------------------------------------------------------
INSERT INTO coaching_specs (
  guide_id, question_type, target_grade,
  evaluation_criteria, coaching_focus, model_answer_spec, model_answer_min_words,
  graduation_thresholds, issue_count_per_attempt,
  example_model_answer, tone_adjustment
) VALUES (
  'description_AL',
  'description',
  'AL',
  $AL_EVAL$
[AL 평가 — Skeleton·Cohesive·격상 어휘 완성 ↔ 분사·강조·비교급·가정법·토론적 마무리]
- 측정 영역: (1) Skeleton·Cohesive·어휘 격상 무결 (2) 분사구문 (-ing/PP) 풀 동원 (3) 강조 표현 카탈로그 풀 적용 (4) 비교급 1~2개 (5) 가정법 회상 1개 (선택) (6) 격상 동사 (offers / fills / treats) (7) Topic sentence 격상 (offers both convenience and a strong sense of community)
- 흠 (강도): Agreement 위반 [매우 강 — AL 불가] / Preposition 위반 [매우 강] / Syntax 단조로움 [매우 강] / Cohesive repetitive [매우 강] / 분사구문 부재 [강] / 강조 표현 부재 [강]
- 흠 (중): 비교급 부재 / 가정법 부재 / 토론적 마무리 부재
- AL 진입 조건: 5대 평가축 모두 무결 + 격상 신호 3종 이상 (분사·강조·비교급 중)
$AL_EVAL$,
  $AL_FOCUS$
[AL 코칭 우선순위]
1. Skeleton·Cohesive·격상 어휘 유지 (IH 완성형 전제)
2. **분사구문 (-ing/PP) 풀 동원** (lying on the bed, sometimes laughing / situated on the Korean peninsula / surrounded by ... / leading to the fact that ...)
3. **강조 표현 카탈로그 풀 적용** (자료 #5 K 8 카테고리 — without being bothered / to the fullest / just like there's no tomorrow / without a care / without a doubt / without thinking)
4. **비교급 동원** (more comfortable than ever / significantly more / much more)
5. **가정법 회상** (Looking back, I couldn't have asked for a better ... / Had I known back then, ...)
6. **격상 동사** (offers / fills me with immense pride / treats me really nice / provides a perfectly suited)
7. Topic sentence 격상 (단순 묘사 X — "offers both X and Y" 같은 종합 명제)
※ Agreement·Preposition·Syntax 무결 필수. 위반 시 AL 자동 박탈.
$AL_FOCUS$,
  $AL_SPEC$
[AL model_answer 톤]
- 분량: 18~25 문장 (200~280 단어)
- 어휘: 격상 어휘 8+ 개 + 강조 표현 3+ 개 + 일상 어휘
- 문법: 분사구문 4+ 개 + 종속절 + 부사 구문 + 비교급 2+ 개 + (선택) 가정법 1개
- 구조: Skeleton 6 슬롯 + Cohesive 5~6 카테고리 + 위치별 표지 일관 + 토픽 sentence 격상
- AL 결정 신호: 토론적 마무리 또는 메타 메시지 (집 토픽의 경우 personal sanctuary 메시지 등)
- 무결 필수: Agreement (3인칭 -s / various+복수 / one of the+복수) / Preposition (on Friday / at 7pm) / Syntax 다양성
$AL_SPEC$,
  200,
  '{"max_issues":1,"min_skeleton_slots":6,"min_cohesive_categories":5,"min_emphasis_phrases":3,"min_participials":3,"min_comparatives":1,"max_filler_ratio":0.04,"require_agreement":true,"require_preposition":true}'::jsonb,
  '{"1-2":[2,4],"3-4":[1,3],"5+":[1,2]}'::jsonb,
  $AL_MODEL$
When it comes to my house, living in an apartment offers both convenience and a strong sense of community, and I genuinely love my neighbors who treat me really nice. Speaking of which, the good thing is that I live in an apartment which is clean, well maintained, and remarkably peaceful — significantly more comfortable than any place I have ever lived. Another good thing is that I live with my family consisting of four members. To me, family is my whole world without a doubt. My parents are incredibly supportive whenever I am in trouble, so I love them more than anything. And the best thing is that I can stream Netflix lying on the sofa, sometimes laughing, sometimes crying, completely lost in the moment. I can even take a nap without a care, without being bothered by others. Looking back, I could not have imagined a more perfectly suited place for me. Basically, you can say I can do whatever I want to do, fully enjoying my me time and my privacy to the fullest. The bottom line is that my apartment provides a comfortable, vibrant living environment that perfectly suits my needs for living. That's all I can say.
$AL_MODEL$,
  $AL_TONE$
[AL 톤 — 격려 + 토론적 마무리 격상 신호]
- "이거 AL 진입 후보예요. 분사·강조·비교급 모두 자연스러워요."
- "토론적 마무리만 한 줄 더 붙이면 완전체. 예를 들어 'A home is not just a place — it is where we recharge.' 같은 메타 멘트."
- 칭찬 → AL 결정 신호 강화 → 시범 → 따라하기 → 졸업 임박 안내 가능.
$AL_TONE$
);

COMMIT;

-- ============================================================================
-- 검증: 6 row 적재 확인
-- ============================================================================
-- SELECT guide_id, target_grade, model_answer_min_words,
--        length(evaluation_criteria) AS eval_len,
--        length(coaching_focus) AS focus_len,
--        length(example_model_answer) AS model_len
-- FROM coaching_specs
-- WHERE question_type='description'
-- ORDER BY array_position(ARRAY['IL','IM1','IM2','IM3','IH','AL']::text[], target_grade);

-- ============================================================================
-- 다음 단계 (사용자 검토 후):
--   2차: description_random × 4 그룹 × 6 등급 = 24 row (자료 #11~#14)
--   3차: rp_11 / rp_12 × 6 = 12 row (자료 #2/#6/#7)
--   4차: past 3종 × 6 = 18 row (자료 #8/#9/#10)
--   5차: adv_14 / adv_15 × 6 = 12 row (자료 #3/#4/#15/#16/#17)
--   6차: routine / comparison × 6 = 12 row (DB 합성)
--   7차: common 폴백 × 6 = 6 row
-- ============================================================================
