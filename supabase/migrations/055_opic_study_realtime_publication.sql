-- =============================================
-- 055: 오픽 스터디 Realtime publication 추가
--
-- 문제:
--   opic_study_sessions / opic_study_answers 테이블이
--   supabase_realtime publication에 미등록 → postgres_changes
--   listen이 작동하지 않아 멤버 간 step/answer sync 안 됨.
--
-- 해결:
--   두 테이블을 supabase_realtime publication에 추가.
--   DO 블록으로 idempotent 보장 (이미 등록된 경우 skip).
--
-- 영향:
--   - MemberLobby: 다른 멤버가 advanceLobby 시 자동 따라가기 작동
--   - OpicStudySessionClient: step/answers 변경 모든 멤버 화면 sync 작동
-- =============================================

-- 1. opic_study_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'opic_study_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.opic_study_sessions;
  END IF;
END $$;

-- 2. opic_study_answers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'opic_study_answers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.opic_study_answers;
  END IF;
END $$;
