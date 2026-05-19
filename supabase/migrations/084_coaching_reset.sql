-- ============================================================================
-- 084_coaching_reset.sql
-- 코칭 프롬프트 자산 청산 — 백지 재시작
-- ============================================================================
-- 청산 대상:
--   - coaching_specs 테이블 + 모든 row (등급별·유형별·그룹별 spec)
--   - coaching_topic_skeletons 테이블 + 모든 row (토픽 카탈로그)
--   - ai_prompt_templates의 coaching_* row 전부 (system prompt / common library / persona / module)
--
-- 유지:
--   - coaching_sessions / coaching_attempts (학생 회차 기록)
--   - coaching_topic_mastery / coaching_type_mastery (학생 졸업 추적)
--   - coaching_access (관리자 권한)
--   - Storage 버킷 coaching-recordings (학생 음성)
--   - coaching-preprocess EF (STT 정제는 유지)
--
-- 이후 새 구조 마이그가 새 테이블·새 row를 별도로 적재.
-- ============================================================================

BEGIN;

-- 1) ai_prompt_templates의 coaching 관련 row 삭제 (preprocess는 유지)
DELETE FROM ai_prompt_templates
WHERE template_id IN (
  'coaching_system_v1',
  'coaching_common_library',
  'coaching_module_description',
  'coaching_persona_stoic_coach'
);

-- 2) coaching_specs 테이블 drop (CASCADE — 의존하는 외래키 X이라 안전)
DROP TABLE IF EXISTS coaching_specs CASCADE;

-- 3) coaching_topic_skeletons 테이블 drop
DROP TABLE IF EXISTS coaching_topic_skeletons CASCADE;

-- 4) coaching_sessions.target_level 컬럼은 유지 (학생 목표 등급 — 새 구조에서도 사용)

-- 5) coaching_attempts.coaching_json 컬럼은 유지 (학생 회차 코칭 결과 — 새 구조에서도 동일 컬럼 사용)
--    기존 json 데이터는 그대로 — 학생이 과거 회차 다시 볼 수 있어야 함

COMMIT;

-- ============================================================================
-- 검증:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public' AND table_name LIKE 'coaching%';
--
--   기대 (5개만 남음):
--     coaching_access
--     coaching_attempts
--     coaching_sessions
--     coaching_topic_mastery
--     coaching_type_mastery
--
--   SELECT template_id FROM ai_prompt_templates WHERE template_id LIKE 'coaching%';
--   기대 (1개만):
--     coaching_preprocess
-- ============================================================================
