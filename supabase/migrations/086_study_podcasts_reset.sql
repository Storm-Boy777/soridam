-- =============================================
-- 086: study_podcasts 전체 리셋
-- =============================================
-- BP 슬라이드 덱 UI 재설계 + Supadata 기반 EF로 자료 전부 재생성한다.
-- 기존 9개 row는 구버전 어휘 구조(3필드: english/korean/example)라
-- 신버전(7필드: expression/meaning_ko/meaning_en/examples/...)과 호환되지 않으므로
-- 깨끗이 비우고 다시 시작.
--
-- 컬럼 스키마는 그대로 유지. 데이터만 삭제.

DELETE FROM study_podcasts;
