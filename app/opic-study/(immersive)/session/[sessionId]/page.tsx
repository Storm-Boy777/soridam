/**
 * 오픽 스터디 세션 룸
 *
 * Step 1~7 + 6-1~6-6을 한 페이지에서 step에 따라 분기.
 * Realtime으로 멤버들이 같은 화면을 동기화해서 봄.
 *
 * 디자인: docs/디자인/opic/project/hf-step1.jsx + hf-front.jsx + hf-loop.jsx + hf-step64.jsx + hf-step66.jsx
 */

import { redirect, notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { OpicStudySessionClient } from "../../../_pages/OpicStudySessionClient";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function OpicStudySessionPage({ params }: PageProps) {
  const { sessionId } = await params;

  const user = await getUser();
  if (!user) redirect(`/login?next=/opic-study/session/${sessionId}`);

  const supabase = await createServerSupabaseClient();

  // 세션 + 그룹 정보 조회 (그룹 등급 X — 멤버별 target_grade 사용)
  const { data: session, error } = await supabase
    .from("opic_study_sessions")
    .select(
      "*, study_groups!inner(name)"
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !session) notFound();

  // 멤버십 확인
  const { data: membership } = await supabase
    .from("study_group_members")
    .select("id")
    .eq("group_id", session.group_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect("/opic-study?reason=not-member");
  }

  // 성능 최적화 — 멤버+profile 매핑 + 본인 target_grade 병렬 (RPC 066, FK 분리 해소)
  const [rawMembersRes, meProfileRes] = await Promise.all([
    supabase.rpc("get_opic_study_group_members", {
      p_group_id: session.group_id,
    }),
    supabase
      .from("profiles")
      .select("target_grade")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const colors: Array<"a" | "b" | "c" | "d"> = ["a", "b", "c", "d"];
  const members = ((rawMembersRes.data ?? []) as Array<{
    user_id: string;
    display_name: string;
  }>).map((m, idx) => ({
    key: colors[idx % 4],
    userId: m.user_id,
    name: m.display_name,
    initial: (m.display_name || "M").charAt(0).toUpperCase(),
  }));

  const groupMeta = session.study_groups as unknown as {
    name: string;
  };

  const myTargetGrade =
    ((meProfileRes.data as { target_grade?: string } | null)?.target_grade) ||
    "AL";

  return (
    <OpicStudySessionClient
      sessionId={sessionId}
      currentUserId={user.id}
      groupId={session.group_id}
      groupName={groupMeta.name}
      myTargetGrade={myTargetGrade}
      members={members}
      initialSession={{
        id: session.id,
        step: session.step,
        status: session.status,
        online_mode: session.online_mode,
        selected_category: session.selected_category,
        selected_topic: session.selected_topic,
        selected_combo_sig: session.selected_combo_sig,
        selected_question_ids: session.selected_question_ids ?? [],
        current_question_idx: session.current_question_idx,
        current_speaker_user_id: session.current_speaker_user_id,
        ai_guide_intro: session.ai_guide_intro,
        ai_guide_approaches: session.ai_guide_approaches,
      }}
    />
  );
}
