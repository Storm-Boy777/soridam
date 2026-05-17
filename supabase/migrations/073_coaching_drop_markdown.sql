-- 073_coaching_drop_markdown.sql
-- AI 코치 — 레거시 coaching_markdown 컬럼 제거
-- v3에서 coaching_json(구조화 JSON)으로 전환 완료. 구버전 회차 데이터도 전량 삭제하여
-- markdown 폴백 렌더링이 더 이상 불필요 → 컬럼 제거.

alter table coaching_attempts drop column if exists coaching_markdown;
