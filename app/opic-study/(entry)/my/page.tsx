/**
 * 오픽 스터디 마이페이지
 *
 * - 사용자 프로필
 * - 학습한 콤보 이력 (그룹 단위 합산)
 * - BP 모음 (TODO: 실제 데이터 모델 정의 — 일단 빈 상태)
 *
 * 디자인: docs/디자인/opic/project/hf-extra.jsx (MyHifi)
 */

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import {
  getMyActiveGroups,
  getMyClosedGroups,
  getMyStudySummary,
} from "@/lib/actions/opic-study";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { OpicStudyMyClient } from "../../_pages/OpicStudyMyClient";

export default async function OpicStudyMyPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/opic-study/my");

  // 사용자 정보
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const userName =
    (meta?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "회원";
  const userInitial = userName.charAt(0).toUpperCase();

  const supabase = await createServerSupabaseClient();
  const [{ data: profile }, activeRes, closedRes] = await Promise.all([
    supabase.from("profiles").select("target_grade").eq("id", user.id).maybeSingle(),
    getMyActiveGroups(),
    getMyClosedGroups(),
  ]);
  const activeGroups = activeRes.data ?? [];
  const closedGroups = closedRes.data ?? [];

  // 활성 그룹 우선, 없으면 종료 그룹 사용
  const primaryGroup = activeGroups[0] ?? closedGroups[0];

  const emptySummary = {
    stats: {
      participated_sessions: 0,
      answer_count: 0,
      skip_count: 0,
      coach_note_count: 0,
      last_date_label: "─",
      active_session_id: null,
    },
    topic_stats: [],
    recent_sessions: [],
    coach_notes: {
      strengths: [],
      improvements: [],
      next_focus: null,
      recent: [],
    },
    my_answers: [],
  };

  const summary = primaryGroup
    ? (await getMyStudySummary(primaryGroup.id)).data ?? emptySummary
    : emptySummary;
  const targetGrade = (profile?.target_grade as string | null) ?? "AL";

  return (
    <OpicStudyMyClient
      userName={userName}
      userInitial={userInitial}
      targetGrade={targetGrade}
      group={
        primaryGroup
          ? {
              id: primaryGroup.id,
              name: primaryGroup.name,
              status: primaryGroup.status,
              startDate: primaryGroup.start_date,
              endDate: primaryGroup.end_date,
            }
          : null
      }
      summary={summary}
    />
  );
}
