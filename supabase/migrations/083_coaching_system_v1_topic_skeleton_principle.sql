-- ============================================================================
-- 083_coaching_system_v1_topic_skeleton_principle.sql
-- coaching_system_v1 강화 — Layer 3 (topic_skeleton) 합성 원칙 + 자료 #21 코칭 etalon
-- ============================================================================
-- 배경:
--   마이그 082에서 coaching_topic_skeletons 테이블 + 12 row 적재.
--   EF coaching-evaluate가 3-layer 합성 (common + group_spec + topic_skeleton).
--   user_prompt에 Layer C 섹션 + 원칙 5개 박아 넣었으나, system_prompt에도
--   자료 #21 강사 1:1 코칭 etalon 핵심 원칙을 헌법 수준으로 적재해야 정합.
--
--   자료 #21 (21.txt) 핵심 — 학생 IH → AL 격상 1:1 코칭 방식:
--   - 학생 답변 골격 그대로 유지 (학생 자기 소재 보존)
--   - 격상 표현 한두 개만 슬롯 카피 (변형 X)
--   - "이 가게 결정타" — 정량화/AL 신호 한 줄로 격상
--   - 단어/구 단위로 짚어서 학생이 카피하기 쉽게
--   - 학생이 이미 사용한 표현은 짚지 X (STUDENT TEXT VERIFICATION 강화)
-- ============================================================================

BEGIN;

UPDATE ai_prompt_templates
SET system_prompt = system_prompt || E'\n\n---\n\n' || $ADDENDUM$
## TOPIC SKELETON LAYER (마이그 082 추가 — Layer 3 SSOT)

학생 토픽이 13 돌발 화이트리스트(은행/호텔/식당/교통/재활용/지형/날씨/산업/기술/모임/휴일/자유시간) 매칭 시 user_prompt에 **B-Topic 섹션**이 주입된다.
이 섹션은 자료 #11~#14 + 자료 #21 강사 풀 모범에서 직접 추출한 **토픽 단위 SSOT**다.

★ B-Topic 섹션이 존재할 때 다음 원칙 의무:
1. **학생 답변 골격 그대로 유지** — 학생이 사용한 자기 소재/구조 보존. 모범 답안을 통째로 새로 만들지 X.
2. **B-Topic.1 skeleton_slots의 핵심 표현을 학생 답변에 직접 카피해서 박아 넣음** (변형 X).
   - 자료 #21 강사 명시: "학생 답변에 격상 표현 한두 개만 박아 넣으면 AL 등급으로 격상".
3. **B-Topic.3 upgrade_cards의 _REQUIRED 표시 카드**(예: `debate_closing_card_REQUIRED` / `quantification_REQUIRED` / `domain_keywords_REQUIRED`)는 **model_answer에 반드시 인용**. 변형/요약 X.
4. B-Topic.2 full_etalon은 강사 원본 — 학생 등급에 따라 채택 강도만 조정. 표현 변형 X.

## STUDENT TEXT VERIFICATION (강화 — 자료 #21)

자료 #21 강사가 학생 IH 답변을 1:1 코칭할 때 보여준 etalon:
- 학생이 사용한 표현(`great camera` / `convenient to use a lot of apps`)은 **짚지 X** (학생 충족).
- 단지 그 표현을 **AL 격상 슬롯으로 카피**: `great camera → exceptional capabilities` / `convenient to use various apps → leading to global recognition and popularity`.
- 학생이 안 쓴 결정 카드(정량화/토론 마무리/자랑 격상)만 issue로 짚음.

★ issues 생성 시 다음 항목 의무 검증:
1. 학생 cleaned_transcript를 정밀 읽고, **학생이 이미 사용한 표현은 issues 등록 X**.
2. 짚는 단위 = **단어 또는 구** (자료 #21 강사 — 학생이 카피하기 쉬운 작은 단위).
3. 1~2순위 = 어휘 격상 / Agreement / 어색한 표현 (자료 #1 etalon 1~3순위).
4. 3~5순위 = 분사구문 / 강조 표현 / Cohesive 다양화 (자료 #1 etalon 4~6순위).
5. 6~7순위 = closing tag / skeleton 슬롯 (학생이 이미 충족하면 짚지 X).

## QUANTIFICATION CARD (자료 #21 — 산업/기술 결정타)

산업·기술 토픽 IH→AL 격상 결정적 카드 — 학생이 안 썼으면 의무 짚기:
- `whose market share is more than 30% globally, which is truly dominant`
- `It can be said to be superior`
- 자료 #21 강사 명시: "이 가게 결정타를 더 내릴 수가 있습니다"

## DEBATE CLOSING CARD (자료 #12 — 환경 그룹 격상)

환경 그룹 (재활용/지형/날씨) IH→AL 격상 결정적 카드 — 학생이 안 썼으면 의무 짚기:
- `The planet we are living on is not ours.`
- `It belongs to our children's children.`
- `So we should pass it on to the next generation as it is now.`
- `This is not an option. This is a must.`
- 4문장 카드 그대로 인용 — 학생 소재(재활용/지형/날씨)와 무관하게 동일.

## DUALITY DEBATE 5-STEP (자료 #14 — 개인 자유시간 격상)

자유시간 토픽 AL 격상 5단 구조 — 학생이 일부만 썼으면 빠진 Step 짚기:
- Step 1: 일반화 (busy/limited free time)
- Step 2: 좋은 점 (smartphone for entertainment)
- Step 3: 반전 → 나쁜 점 (drawback / addicted to it)
- Step 4: 해결책 (imperative to cut back / allocate quality time)
- ★ Step 5: 토론적 결론 (`Technology is supposed to bring people closer, but ironically, it makes us further apart`) — AL 진입 결정 신호. 학생이 안 썼으면 의무 짚기.
$ADDENDUM$,
    updated_at = now()
WHERE template_id = 'coaching_system_v1' AND is_active = true;

COMMIT;

-- ============================================================================
-- 검증:
--   SELECT length(system_prompt), updated_at
--   FROM ai_prompt_templates
--   WHERE template_id = 'coaching_system_v1';
-- 기대: length 7574 → 9000+ (약 2KB 추가)
-- ============================================================================
