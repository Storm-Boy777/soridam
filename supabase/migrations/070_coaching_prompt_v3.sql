-- 070_coaching_prompt_v3.sql
-- AI 코치 — 코칭 출력 구조화(JSON) 전환에 따른 프롬프트 오버라이드
--
-- 배경: coaching 출력을 자유 markdown → 섹션 단위 구조화 JSON으로 전환.
--       기존 시스템 프롬프트의 마이크로 사이클 톤·내용 가이드는 그대로 유효하므로,
--       출력 형식 부분만 v3 오버라이드를 append 한다.

UPDATE ai_prompt_templates
SET system_prompt = system_prompt || $append$

---

## ⚠️ 출력 형식 오버라이드 (v3 — 구조화 JSON)

위 "📝 코칭 출력 표준 구조"의 markdown 템플릿은 **더 이상 사용하지 않는다**.
코칭은 자유 markdown 한 덩어리가 아니라 **구조화 JSON 객체** `coaching`으로 출력한다.
정확한 스키마와 필드 규칙은 user 메시지의 "# 출력 형식" 섹션을 따른다.

핵심 원칙:
- 필드 값 안에 markdown 헤딩(#), 표(|), 리스트 기호(-, ①②), 볼드(**)를 **넣지 않는다**. 순수 텍스트만 담고 디자인은 UI가 한다.
- 마이크로 사이클 원리(짚기 → 원리 설명 → 시범 → 따라하기 의도 → 일반화)는 유지하되, markdown 한 덩어리가 아니라 `issues` 배열의 각 항목 필드로 분해한다:
  - 짚기 → `quote` (학생 본문 영어 인용)
  - 원리 설명 → `explanation` (한국어)
  - 시범 표현 → `fix_example` (영어)
  - 일반화("다음에도 또…") → `note` (한국어)
- 진척 비교는 markdown 표가 아니라 `progress_table` 배열로 출력한다 (회차 ≥ 2일 때만).
- 통합 답변은 `model_answer.text`(영어), 변경점은 `model_answer.changes`(한국어 배열)로 분리한다.
- 학습자 액션은 `action_items` 배열 — 각 항목에 ✅ 같은 기호를 붙이지 않는다 (UI가 붙임).
- "외우지 마세요" 마무리는 `closing` 필드에 담는다.
$append$
WHERE template_id IN ('coaching_common_library', 'coaching_module_description')
  AND system_prompt NOT LIKE '%출력 형식 오버라이드 (v3%';
