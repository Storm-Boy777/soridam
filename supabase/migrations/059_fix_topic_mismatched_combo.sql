-- 059_fix_topic_mismatched_combo.sql
-- 토픽 혼재 콤보 정정 — 자유시간 + 지형 혼합 → 지형 콤보로 통일
--
-- 배경:
--   - submission #38의 general_1 콤보가 {COM_FRE_N2_02, COM_GEO_N_C4_01, COM_GEO_N_C4_06}
--   - 등록 시 topic은 "지형"으로 분류했으나 첫 질문이 "자유시간" 토픽
--   - 콤보 둘러보기에서 매칭 어색 (자유시간 1 + 지형 2)
--
-- 정정:
--   - q#2 (자유시간 COM_FRE_N2_02) → 지형 COM_GEO_N_C4_02 (한국 지리/자연환경)
--   - q#3 (지형 COM_GEO_N_C4_01) → 지형 COM_GEO_N_C4_03 (인기 야외 활동)
--   - q#4 (지형 COM_GEO_N_C4_06) → 유지
--
-- 결과 콤보: 지형 묘사 + 야외활동 묘사 + 어릴 적 자연 명소 추억 (사용자 의도 매칭)
--
-- 멱등성: WHERE 조건에 변경 전 question_id 명시 → 이미 정정된 row는 영향 X

BEGIN;

-- 1. submission_questions 정정
UPDATE submission_questions
SET question_id = 'COM_GEO_N_C4_02', topic = '지형'
WHERE submission_id = 38
  AND question_number = 2
  AND question_id = 'COM_FRE_N2_02';

UPDATE submission_questions
SET question_id = 'COM_GEO_N_C4_03'
WHERE submission_id = 38
  AND question_number = 3
  AND question_id = 'COM_GEO_N_C4_01';

-- 2. submission_combos.question_ids 동기화
UPDATE submission_combos
SET question_ids = ARRAY['COM_GEO_N_C4_02','COM_GEO_N_C4_03','COM_GEO_N_C4_06']
WHERE id = 181
  AND question_ids = ARRAY['COM_FRE_N2_02','COM_GEO_N_C4_01','COM_GEO_N_C4_06'];

-- 3. combo_guide_cache의 잘못된 sig 무효화 (다음 진입 시 새 sig로 자동 재생성)
DELETE FROM combo_guide_cache
WHERE sig = 'COM_FRE_N2_02|COM_GEO_N_C4_01|COM_GEO_N_C4_06';

-- 4. opic_study_sessions에 잘못된 sig 사용한 세션 있으면 새 sig로 업데이트
UPDATE opic_study_sessions
SET selected_combo_sig = 'COM_GEO_N_C4_02|COM_GEO_N_C4_03|COM_GEO_N_C4_06',
    selected_question_ids = ARRAY['COM_GEO_N_C4_02','COM_GEO_N_C4_03','COM_GEO_N_C4_06']
WHERE selected_combo_sig = 'COM_FRE_N2_02|COM_GEO_N_C4_01|COM_GEO_N_C4_06';

COMMIT;
