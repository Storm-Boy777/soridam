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
import { OpicStudySessionClient } from "../../_pages/OpicStudySessionClient";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function OpicStudySessionPage({ params }: PageProps) {
  const { sessionId } = await params;

  const user = await getUser();
  if (!user) redirect(`/login?next=/opic-study/session/${sessionId}`);

  const supabase = await createServerSupabaseClient();

  // 세션 + 그룹 정보 조회
  const { data: session, error } = await supabase
    .from("opic_study_sessions")
    .select(
      "*, study_groups!inner(name, target_level)"
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

  // 그룹 멤버 + profile 조회 (FK 분리)
  const { data: rawMembers } = await supabase
    .from("study_group_members")
    .select("user_id, display_name")
    .eq("group_id", session.group_id);

  const memberUserIds = (rawMembers ?? []).map((m) => m.user_id as string);
  const { data: profiles } = memberUserIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id, email, display_name")
        .in("id", memberUserIds)
    : { data: [] };
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p])
  );

  const members = (rawMembers ?? []).map((m, idx) => {
    const colors: Array<"a" | "b" | "c" | "d"> = ["a", "b", "c", "d"];
    const color = colors[idx % 4];
    const userId = m.user_id as string;
    const p = profileMap.get(userId);
    const name =
      (m.display_name as string | null) ??
      (p?.display_name as string | null) ??
      (p?.email as string | undefined)?.split("@")[0] ??
      "멤버";
    return {
      key: color,
      userId,
      name,
      initial: name.charAt(0).toUpperCase(),
    };
  });

  const groupMeta = session.study_groups as unknown as {
    name: string;
    target_level: string;
  };

  return (
    <OpicStudySessionClient
      sessionId={sessionId}
      currentUserId={user.id}
      groupId={session.group_id}
      groupName={groupMeta.name}
      groupLevel={groupMeta.target_level}
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
        ai_guide_text: session.ai_guide_text,
        ai_guide_key_points: session.ai_guide_key_points,
      }}
    />
  );
}
