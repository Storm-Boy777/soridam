-- ============================================================================
-- 077_coaching_specs_description_IH_strengthen.sql
-- spec.description_IH 강화 — 자료 #1 강사 etalon 그대로 재정렬
-- ============================================================================
-- 1차 Dogfooding 결과 반영:
--   기존 coaching_focus가 "Skeleton 6슬롯 확정"을 1순위로 → EF가 학생 답변에 있는
--   transition·closing 무시하고 Skeleton만 짚음. 단어 단위 흠 누락.
-- 수정:
--   coaching_focus: 강사 etalon 그대로 (단어 1순위 / 구문 2순위 / 구조 3순위)
--   evaluation_criteria: 각 흠의 강도 명시 + 학생 답변 정확 확인 의무 강조
-- ============================================================================

BEGIN;

UPDATE coaching_specs
SET evaluation_criteria = $EVAL$
[IH 평가 — 단어·문장 단위 흠 + Skeleton 완성 + Cohesive 다양성]
- 측정 영역:
  (1) **어휘 반복 / 격상 매트릭스** — really/like/many/use/good/amazing/incredible 반복 여부. 격상 풀 적용 정도.
  (2) **Agreement / Preposition / 불가산 명사** — 3인칭 -s / some of+복수는 are / on Friday / many furniture→pieces of.
  (3) **Skeleton 6 슬롯** — topic + transition + supporting × 3 + concluding + closing tag.
      ★ 학생 답변에 **진짜로 있는지** 정확 확인. 학생이 사용한 표현(`To get into more details` 등)은 충족으로 간주.
  (4) **Cohesive devices 다양성** — 1~2 카테고리만 반복하면 흠 (repartitive). 4~5 카테고리 목표.
  (5) **분사구문 1~2개 / 강조 표현 1~2개** (AL 베타 허용 신호).

- 흠 (강도):
  * 어휘 반복 [매우 강 — 학생 답변에 거의 항상 있음] — 1순위 짚을 것
  * Agreement / Preposition 위반 [강] — 1순위 짚을 것
  * 불가산 명사 [강]
  * 어색한 단어·표현 [중]
  * closing tag 부재 [중] — 학생 답변에 진짜 없을 때만
  * Skeleton 슬롯 진짜 부족 [중] — 학생이 사용한 슬롯은 충족으로 간주
  * Cohesive 단조로움 [중]

- 흠 (약 — IH 코칭 X · AL 베타 허용만):
  * 위치별 표지 단조로움 (Q2/Q5/Q8 — AL 신호. IH는 1세트 일관 OK)
  * 비교급 부재 / 가정법 부재 / 토론적 마무리 부재 (AL 전용)
$EVAL$,
    coaching_focus = $FOCUS$
[IH 코칭 우선순위 — 자료 #1 강사 짚는 순서 etalon 그대로]

★ **STUDENT TEXT FIRST**: 짚기 전에 학생 답변 원문을 정밀히 읽고 진짜로 부재인 것·반복인 것만 짚을 것. 학생이 이미 사용한 표현(`To get into more details` / `That's about it` / `the first thing is that` 등)은 충족으로 간주하고 짚지 X.

**1순위 — 단어·문장 단위 흠 (강사 etalon 1~4단계, 즉각적 효과 大)**
1. **어휘 반복·격상 매트릭스** (학생 답변에 거의 항상 있음 — 가장 먼저 짚을 것)
   - really 반복 → genuinely / truly / incredibly / remarkably
   - like 반복 → enjoy / appreciate / be fond of / adore
   - many → numerous / countless / large number of
   - use → take advantage of / make use of
   - good → comfortable / peaceful / sophisticated / well-maintained
   - amazing/incredible 반복 → captivating / mesmerizing / unparalleled
2. **Agreement / Preposition / 불가산 명사**
   - some of + 복수는 are (is X) / one of + 복수 / 3인칭 -s 정확
   - on Friday / on the weekend / at 7pm
   - many furniture → many pieces of furniture (advice/information/music 동일)
3. **어색한 단어·표현** — list→listen / his all songs→all his songs / makes me really comfortable→make me really comfortable

**2순위 — 구문·표현 격상 (강사 etalon 5~6단계)**
4. **분사구문 (-ing/PP)** — `When I watch him playing → Watching him play` / `I drive listening to music` / `Sometimes I watch YouTube, sometimes crying, sometimes laughing, depending on the content I consume`
5. **강조 표현** — without being bothered by others / to the fullest / without a doubt / without a care

**3순위 — 단락 구조 (강사 etalon 7~8단계, 학생 답변 정확 확인 후)**
6. **closing tag 부재** — That's about it (Q2) / That's pretty much about it (Q5) / That's all I can say (Q8). ★ 학생 답변 끝에 진짜 없을 때만.
7. **Skeleton 슬롯 부족** — ★ 학생이 transition·supporting·concluding 모두 진짜 사용 안 했을 때만. 학생 답변에 표지 있으면 짚지 X.

※ **1순위 흠이 있는데 3순위만 짚으면 코칭 실패**. 학생 답변을 정밀히 읽고 어휘 반복·Agreement·불가산부터 짚을 것. 1회차 IH 학생이면 위 항목에서 3~5개 흠을 거의 항상 찾을 수 있다.
$FOCUS$,
    updated_at = now()
WHERE guide_id = 'description_IH';

COMMIT;
