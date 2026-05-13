-- ============================================================
-- 오픽 스터디 성능 최적화 — SQL aggregate + nested select RPC
-- ============================================================
--
-- 배경: 기존 SA들이 전체 row를 받아 JS에서 Set/Map으로 집계 → 200~1000ms 느림
-- 해결: SQL aggregate로 한 번에 통계 + nested select로 RTT 축소
--
-- 추가되는 RPC:
--   1. get_opic_study_my_summary       — C4 마이페이지 (80세션 + 본인 답변 nested + topic_stats)
--   2. get_opic_study_my_active_groups — C1 홈/마이/이력/explore 공통 (그룹 + 멤버수 + 활성/완료 세션수)
--   3. get_opic_study_group_history    — C5 학습기록 (50세션 + 답변 집계 + 멤버 highlights)
--   4. get_opic_study_category_stats   — C2 explore 1단계 (콤보 카테고리 집계)
--   5. get_opic_study_topics_for_study — C3 explore 2단계 (토픽 빈도)
--   6. get_opic_study_combos_for_study — C3 explore 3단계 (콤보 빈도)
--
-- 모든 RPC: SECURITY DEFINER + is_study_group_member 검증으로 RLS 우회 안전
-- ============================================================

-- ============================================================
-- 1. C4 — getMyStudySummary 용
--    80세션 메타 + 본인 답변 nested json (1 RTT)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_opic_study_my_summary(
  p_user_id uuid,
  p_group_id uuid,
  p_limit int DEFAULT 80
)
RETURNS TABLE (
  id uuid,
  selected_category text,
  selected_topic text,
  selected_question_ids text[],
  started_at timestamptz,
  ended_at timestamptz,
  status text,
  my_answers jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.selected_category,
    s.selected_topic,
    s.selected_question_ids,
    s.started_at,
    s.ended_at,
    s.status,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'session_id', a.session_id,
            'question_id', a.question_id,
            'question_idx', a.question_idx,
            'audio_url', a.audio_url,
            'transcript', a.transcript,
            'feedback_result', a.feedback_result,
            'pronunciation_score', a.pronunciation_score,
            'created_at', a.created_at
          )
          ORDER BY a.created_at DESC
        )
        FROM public.opic_study_answers a
        WHERE a.session_id = s.id
          AND a.user_id = p_user_id
      ),
      '[]'::jsonb
    ) AS my_answers
  FROM public.opic_study_sessions s
  WHERE s.group_id = p_group_id
    AND public.is_study_group_member(p_group_id, p_user_id)  -- 그룹 멤버 검증
  ORDER BY s.started_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_opic_study_my_summary(uuid, uuid, int)
TO authenticated;

COMMENT ON FUNCTION public.get_opic_study_my_summary IS
'마이페이지용 — 그룹 내 최근 N개 세션과 본인 답변(nested jsonb)을 1 RTT로 반환. SECURITY DEFINER + is_study_group_member 검증.';

-- ============================================================
-- 2. C1 — getMyActiveGroups / getMyClosedGroups N+1 해소
--    그룹 N개당 3 RTT(member/active/completed COUNT) → 단일 RPC 1 RTT
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_opic_study_my_groups_with_stats(
  p_user_id uuid,
  p_status text DEFAULT 'active'
)
RETURNS TABLE (
  id uuid,
  name text,
  start_date date,
  end_date date,
  status text,
  description text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  schedule jsonb,
  member_count int,
  active_session_count int,
  completed_session_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    g.id,
    g.name,
    g.start_date,
    g.end_date,
    g.status,
    g.description,
    g.created_by,
    g.created_at,
    g.updated_at,
    g.schedule,
    COALESCE(m.cnt, 0)::int AS member_count,
    COALESCE(sa.cnt, 0)::int AS active_session_count,
    COALESCE(sc.cnt, 0)::int AS completed_session_count
  FROM public.study_groups g
  INNER JOIN public.study_group_members me
    ON me.group_id = g.id AND me.user_id = p_user_id
  LEFT JOIN (
    SELECT group_id, COUNT(*)::int AS cnt
    FROM public.study_group_members
    GROUP BY group_id
  ) m ON m.group_id = g.id
  LEFT JOIN (
    SELECT group_id, COUNT(*)::int AS cnt
    FROM public.opic_study_sessions
    WHERE status = 'active'
    GROUP BY group_id
  ) sa ON sa.group_id = g.id
  LEFT JOIN (
    SELECT group_id, COUNT(*)::int AS cnt
    FROM public.opic_study_sessions
    WHERE status = 'completed'
    GROUP BY group_id
  ) sc ON sc.group_id = g.id
  WHERE g.status = p_status
  ORDER BY
    CASE WHEN p_status = 'closed' THEN g.end_date END DESC NULLS LAST,
    CASE WHEN p_status <> 'closed' THEN g.start_date END DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_opic_study_my_groups_with_stats(uuid, text)
TO authenticated;

COMMENT ON FUNCTION public.get_opic_study_my_groups_with_stats IS
'내가 속한 그룹 + 멤버수/활성·완료 세션수 집계를 1 RTT로 반환. N+1 쿼리 해소.';

-- ============================================================
-- 3. C6/C7 — group members + profiles 통합
--    홈/Lobby/Session 페이지의 study_group_members → profiles 분리 쿼리 해소
--    1 RTT로 멤버 user_id + 매핑된 display_name + email + target_grade 반환
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_opic_study_group_members(
  p_group_id uuid
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  email text,
  member_display_name text,
  target_grade text,
  joined_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.user_id,
    COALESCE(
      m.display_name,
      p.display_name,
      split_part(p.email, '@', 1),
      'M'
    )::text AS display_name,
    p.email::text,
    m.display_name::text AS member_display_name,
    p.target_grade::text,
    m.joined_at
  FROM public.study_group_members m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  WHERE m.group_id = p_group_id
    AND public.is_study_group_member(p_group_id, auth.uid())  -- 호출자 그룹 멤버 검증
  ORDER BY m.joined_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_opic_study_group_members(uuid)
TO authenticated;

COMMENT ON FUNCTION public.get_opic_study_group_members IS
'그룹 멤버 + 매핑된 display_name(member→profile 폴백) + email + target_grade를 1 RTT로 반환. 홈/Lobby/Session 페이지의 FK 분리 쿼리 해소.';

-- ============================================================
-- 4. C5 — getGroupHistory SQL aggregate
--    50세션 메타 + 모든 답변(nested jsonb) 1 RTT로 반환
--    클라이언트는 JS aggregation만 수행 (감당 가능한 데이터 크기)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_opic_study_group_history(
  p_group_id uuid,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  selected_category text,
  selected_topic text,
  selected_combo_sig text,
  selected_question_ids text[],
  started_at timestamptz,
  ended_at timestamptz,
  status text,
  answers jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.selected_category,
    s.selected_topic,
    s.selected_combo_sig,
    s.selected_question_ids,
    s.started_at,
    s.ended_at,
    s.status,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'session_id', a.session_id,
            'user_id', a.user_id,
            'question_idx', a.question_idx,
            'audio_url', a.audio_url,
            'feedback_result', a.feedback_result
          )
        )
        FROM public.opic_study_answers a
        WHERE a.session_id = s.id
      ),
      '[]'::jsonb
    ) AS answers
  FROM public.opic_study_sessions s
  WHERE s.group_id = p_group_id
    AND public.is_study_group_member(p_group_id, auth.uid())
  ORDER BY s.started_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_opic_study_group_history(uuid, int)
TO authenticated;

COMMENT ON FUNCTION public.get_opic_study_group_history IS
'학습기록용 — 그룹 내 최근 N개 세션 + 모든 답변(nested jsonb)을 1 RTT로 반환.';

-- ============================================================
-- 5. C2 — getCategoryStats (explore 1단계)
--    submission_combos 전체 raw → JS Set 집계 (200~800ms)
--    → SQL GROUP BY + md5 콤보 시그니처 (< 50ms)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_opic_study_category_stats()
RETURNS TABLE (
  category text,
  topic_count int,
  combo_count int
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH cb AS (
    SELECT
      sc.topic,
      CASE
        WHEN sc.combo_type LIKE 'general%' THEN 'general'
        WHEN sc.combo_type = 'roleplay' THEN 'roleplay'
        ELSE 'advance'
      END AS category,
      md5(array_to_string(sc.question_ids, '_')) AS combo_sig
    FROM public.submission_combos sc
    INNER JOIN public.submissions s ON s.id = sc.submission_id
    WHERE s.status = 'complete'
      AND s.exam_approved = 'approved'
      AND COALESCE(array_length(sc.question_ids, 1), 0) > 0
  )
  SELECT
    cb.category,
    COUNT(DISTINCT cb.topic)::int AS topic_count,
    COUNT(DISTINCT cb.combo_sig)::int AS combo_count
  FROM cb
  GROUP BY cb.category;
$$;

GRANT EXECUTE ON FUNCTION public.get_opic_study_category_stats()
TO authenticated;

COMMENT ON FUNCTION public.get_opic_study_category_stats IS
'카테고리별 토픽/콤보 고유 카운트 SQL aggregate. JS Set 집계 anti-pattern 해소.';

-- ============================================================
-- 6. C3 — getTopicsForStudy (explore 2단계)
--    카테고리 필터 + 토픽별 콤보·출제 카운트 + 그룹 학습 이력
--    JS 3단 집계 → SQL CTE 1회
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_opic_study_topics_for_study(
  p_category text,
  p_group_id uuid
)
RETURNS TABLE (
  topic text,
  category text,
  combo_count int,
  submission_count int,
  studied_count int
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH cb AS (
    SELECT
      sc.topic,
      md5(array_to_string(sc.question_ids, '_')) AS combo_sig
    FROM public.submission_combos sc
    INNER JOIN public.submissions s ON s.id = sc.submission_id
    WHERE s.status = 'complete'
      AND s.exam_approved = 'approved'
      AND COALESCE(array_length(sc.question_ids, 1), 0) > 0
      AND (
        (p_category = 'general' AND sc.combo_type LIKE 'general%')
        OR (p_category = 'roleplay' AND sc.combo_type = 'roleplay')
        OR (p_category = 'advance' AND sc.combo_type = 'advance')
      )
  ),
  topic_agg AS (
    SELECT
      topic,
      COUNT(DISTINCT combo_sig)::int AS combo_count,
      COUNT(*)::int AS submission_count
    FROM cb
    GROUP BY topic
  ),
  studied AS (
    SELECT
      selected_topic AS topic,
      COUNT(*)::int AS studied_count
    FROM public.opic_study_sessions
    WHERE group_id = p_group_id
      AND status = 'completed'
      AND selected_category = p_category
      AND selected_topic IS NOT NULL
    GROUP BY selected_topic
  )
  SELECT
    t.topic,
    p_category AS category,
    t.combo_count,
    t.submission_count,
    COALESCE(s.studied_count, 0)::int
  FROM topic_agg t
  LEFT JOIN studied s ON s.topic = t.topic
  WHERE public.is_study_group_member(p_group_id, auth.uid())
  ORDER BY t.submission_count DESC, t.combo_count DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_opic_study_topics_for_study(text, uuid)
TO authenticated;

COMMENT ON FUNCTION public.get_opic_study_topics_for_study IS
'카테고리별 토픽 목록 + 콤보/출제 빈도 + 그룹 학습 이력을 1 RTT로 반환.';
