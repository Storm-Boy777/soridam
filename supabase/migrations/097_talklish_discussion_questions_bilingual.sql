-- 097: Talklish 토론 질문 이중언어화 (string[] → {en, ko}[])
--
-- 배경: 5페이지(토론)에서 질문에 자연스러운 한글 번역을 토글로 보여주기 위해
--   discussion_questions 구조를 "영문 문자열 배열"에서 "{ en, ko } 객체 배열"로 전환한다.
--   (어휘 예문 examples · 가라오케 자막과 동일한 패턴 → 코드베이스 일관성)
--
-- 기존 자료: 영문 질문은 en 에 보존하고 ko 는 빈 문자열로 둔다.
--   → 재생성 전까지는 ko 가 비어 있어 토글해도 한글이 표시되지 않음 (의도된 동작).
-- 새 자료: EF study-podcast-generate 가 처음부터 { en, ko } 로 생성.
--
-- 멱등성: 이미 객체로 변환된 행은 건드리지 않는다 (string 원소가 남아 있는 배열만 변환).

UPDATE study_podcasts
SET discussion_questions = COALESCE(
  (
    SELECT jsonb_agg(
      CASE
        WHEN jsonb_typeof(elem) = 'string'
          THEN jsonb_build_object('en', elem #>> '{}', 'ko', '')
        ELSE elem
      END
      ORDER BY ord
    )
    FROM jsonb_array_elements(discussion_questions) WITH ORDINALITY AS t(elem, ord)
  ),
  '[]'::jsonb
)
WHERE jsonb_typeof(discussion_questions) = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(discussion_questions) AS e
    WHERE jsonb_typeof(e) = 'string'
  );
