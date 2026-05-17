-- ============================================================================
-- 080_coaching_common_IH_participial_strengthen.sql
-- common_IH.coaching_focus 강화 — 분사구문 의무 짚기
-- ============================================================================
-- Dogfooding 검증 결과 (음악 IH 답변 3회):
--   분사구문 짚기 일관성 70/100 — 호출마다 짚을 때도 있고 누락도 있음.
--   학생 답변에 `When I + V + ing` 패턴(예: "When I watch him playing")이
--   명백히 있는데 EF가 항상 짚지는 않음.
--
-- 자료 #1 강사 etalon에서 분사구문은 5순위 핵심 격상:
--   - When I watch him playing → Watching him play
--   - I drive listening to music
--   - Sometimes I watch YouTube, sometimes crying, sometimes laughing,
--     depending on the content I consume
--
-- 수정: common_IH.coaching_focus 2순위에 "분사구문 기회 발견 시 의무 짚기"
--       명시 강화 + 자주 출현하는 패턴 카탈로그 추가
-- ============================================================================

BEGIN;

UPDATE coaching_specs
SET coaching_focus = $FOCUS$
[IH 공통 코칭 우선순위 — 자료 #1 강사 짚는 순서 etalon 그대로]

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
4. ★★ **분사구문 (-ing/PP) — 기회 발견 시 의무 짚기**

   학생 답변에 아래 패턴 발견 시 **반드시 짚고 시범**:
   - `When I + V + ing` 패턴 → `Verb-ing` 분사구문 (자료 #1 핵심 격상)
     · 예: "When I watch him playing the piano" → "Watching him play the piano, ..."
     · 예: "When I drive in the car" → "Driving in the car, I listen to music"
   - 두 문장이 같은 주어로 이어짐 → 한 문장은 분사구문으로
     · 예: "I sit on the sofa. I watch TV." → "Sitting on the sofa, I watch TV."
     · 예: "I listen to music and I read a book." → "Listening to music, I read a book."
   - 동시 동작 묘사 → `V + V-ing` 추가 묘사 형식
     · 예: "I watch YouTube, I cry, I laugh." → "I watch YouTube, sometimes crying, sometimes laughing, depending on the content I consume."
   - 결과·인과 묘사 → `V-ing` 또는 `leading to ...`
     · 예: "X happens, so Y" → "X happens, leading to the fact that Y"
   - 수동·상태 묘사 → `V-ed/PP` 분사구문
     · 예: "Korea is on the peninsula and it is surrounded by sea" → "Korea is on the Korean peninsula, surrounded by the sea on three sides"

   ★ 학생 답변에 위 패턴이 하나라도 있으면 issue 1건으로 의무 등록.
   ★ 통합 답변(model_answer)에는 반드시 분사구문 2개 이상 적용.

5. **강조 표현 — without being bothered by others / to the fullest / without a doubt / without a care**

**3순위 — 단락 구조 (학생 답변 정확 확인 후)**
6. **closing tag 부재** — That's about it (Q2) / pretty much about it (Q5) / all I can say (Q8). ★ 학생 답변 끝에 진짜 없을 때만.
7. **Skeleton 슬롯 부족** — ★ 학생이 transition·supporting·concluding 모두 진짜 사용 안 했을 때만.

**4순위 — Cohesive 다양화 (선택)**
8. Cohesive devices 4~5 카테고리 (도입·반전·예시·추가·결론도입·마무리). first ... first ... first 반복 흠.

**짚지 말 것** (AL 베타 허용만):
- 위치별 표지 다양화 (Q2/Q5/Q8) — IH는 1세트 일관 OK
- 비교급 / 가정법 / 토론적 마무리 — AL 전용

※ **1순위 흠이 있는데 3순위만 짚으면 코칭 실패**. 학생 답변을 정밀히 읽고 어휘·Agreement부터 짚을 것. 1회차 IH 학생이면 위 항목에서 3~5개 흠을 거의 항상 찾을 수 있다.
※ **분사구문 패턴은 IH→AL 격상의 핵심 신호**. `When I + V + ing` 같은 명백한 분사구문 기회를 짚지 않으면 코칭 실패.
$FOCUS$,
    updated_at = now()
WHERE guide_id = 'common_IH';

COMMIT;
