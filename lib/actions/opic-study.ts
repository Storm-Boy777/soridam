"use server";

// 오픽 스터디 모듈 — 사용자용 Server Actions
// 설계서: docs/설계/오픽스터디.md

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { T } from "@/lib/constants/tables";
import type {
  ActionResult,
  StudyGroup,
  StudyGroupWithStats,
  ActiveSessionLite,
  OpicStudySession,
  OpicStudyAnswer,
  SessionHistoryItem,
  CategoryStat,
  TopicForStudy,
  ComboForStudy,
  StudyCategory,
  SessionStep,
} from "@/lib/types/opic-study";

// ============================================================
// 헬퍼
// ============================================================

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다");
  return { supabase, userId: user.id };
}

/** 사용자가 그룹의 멤버인지 확인 (멤버 아니면 throw) */
async function requireGroupMember(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, groupId: string, userId: string) {
  const { data, error } = await supabase
    .from(T.study_group_members)
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("멤버십 조회 실패");
  if (!data) throw new Error("그룹 멤버가 아닙니다");
}

/** 세션의 group_id 조회 + 멤버 검증 */
async function requireSessionMember(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, sessionId: string, userId: string): Promise<string> {
  const { data: session, error } = await supabase
    .from(T.opic_study_sessions)
    .select("group_id")
    .eq("id", sessionId)
    .single();
  if (error || !session) throw new Error("세션을 찾을 수 없습니다");
  await requireGroupMember(supabase, session.group_id, userId);
  return session.group_id;
}

/** 정렬된 시그니처 (그루핑용 — 순서 무관) */
function buildComboSignature(questionIds: string[]): string {
  return [...questionIds].sort().join("|");
}

/** combo_type → category 매핑 */
function comboTypeToCategory(combo_type: string): StudyCategory {
  if (combo_type.startsWith("general")) return "general";
  if (combo_type === "roleplay") return "roleplay";
  return "advance";
}

// ============================================================
// 1. 그룹/세션 조회 (5개)
// ============================================================

/** 내가 속한 활성 그룹 + 통계 */
export async function getMyActiveGroups(): Promise<ActionResult<StudyGroupWithStats[]>> {
  try {
    const { supabase, userId } = await requireUser();

    // 내 멤버십 → 활성 그룹들
    const { data: memberships } = await supabase
      .from(T.study_group_members)
      .select("group_id")
      .eq("user_id", userId);

    const groupIds = (memberships || []).map((m) => m.group_id);
    if (groupIds.length === 0) return { data: [] };

    const { data: groups, error } = await supabase
      .from(T.study_groups)
      .select("*")
      .in("id", groupIds)
      .eq("status", "active")
      .order("start_date", { ascending: false });

    if (error) return { error: "그룹 조회 실패" };
    if (!groups || groups.length === 0) return { data: [] };

    // 통계 계산 (각 그룹별)
    const stats = await Promise.all(
      groups.map(async (g) => {
        const [{ count: memberCount }, { count: activeCount }, { count: completedCount }] = await Promise.all([
          supabase.from(T.study_group_members).select("*", { count: "exact", head: true }).eq("group_id", g.id),
          supabase.from(T.opic_study_sessions).select("*", { count: "exact", head: true }).eq("group_id", g.id).eq("status", "active"),
          supabase.from(T.opic_study_sessions).select("*", { count: "exact", head: true }).eq("group_id", g.id).eq("status", "completed"),
        ]);
        return {
          ...(g as StudyGroup),
          member_count: memberCount ?? 0,
          active_session_count: activeCount ?? 0,
          completed_session_count: completedCount ?? 0,
        } as StudyGroupWithStats;
      })
    );

    return { data: stats };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "그룹 조회 실패" };
  }
}

/** 내가 속한 종료 그룹 (이력용) */
export async function getMyClosedGroups(): Promise<ActionResult<StudyGroup[]>> {
  try {
    const { supabase, userId } = await requireUser();

    const { data: memberships } = await supabase
      .from(T.study_group_members)
      .select("group_id")
      .eq("user_id", userId);

    const groupIds = (memberships || []).map((m) => m.group_id);
    if (groupIds.length === 0) return { data: [] };

    const { data, error } = await supabase
      .from(T.study_groups)
      .select("*")
      .in("id", groupIds)
      .eq("status", "closed")
      .order("end_date", { ascending: false });

    if (error) return { error: "이력 조회 실패" };
    return { data: (data || []) as StudyGroup[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "이력 조회 실패" };
  }
}

/** 그룹 세션 이력 (완료 + 진행 중) */
export async function getGroupHistory(groupId: string): Promise<ActionResult<SessionHistoryItem[]>> {
  try {
    const { supabase, userId } = await requireUser();
    await requireGroupMember(supabase, groupId, userId);

    const { data: sessions, error } = await supabase
      .from(T.opic_study_sessions)
      .select("id, selected_category, selected_topic, selected_combo_sig, started_at, ended_at, status")
      .eq("group_id", groupId)
      .order("started_at", { ascending: false })
      .limit(50);

    if (error) return { error: "이력 조회 실패" };

    // 그룹 멤버 + 프로필 조회 (한 번만)
    const { data: rawMembers } = await supabase
      .from(T.study_group_members)
      .select("user_id, display_name")
      .eq("group_id", groupId);
    const memberUserIds = (rawMembers ?? []).map((m) => m.user_id as string);
    const { data: profiles } = memberUserIds.length > 0
      ? await supabase
          .from(T.profiles)
          .select("id, email, display_name")
          .in("id", memberUserIds)
      : { data: [] };
    const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p]));
    const colors: Array<"a" | "b" | "c" | "d"> = ["a", "b", "c", "d"];
    const memberMeta = new Map<string, { name: string; initial: string; color: "a" | "b" | "c" | "d" }>();
    (rawMembers ?? []).forEach((m, idx) => {
      const uid = m.user_id as string;
      const p = profileMap.get(uid);
      const name =
        (m.display_name as string | null) ??
        (p?.display_name as string | null) ??
        (p?.email as string | undefined)?.split("@")[0] ??
        "멤버";
      memberMeta.set(uid, {
        name,
        initial: name.charAt(0).toUpperCase(),
        color: colors[idx % 4],
      });
    });
    const memberCount = rawMembers?.length ?? 0;

    // 세션별 데이터 집계
    const enriched = await Promise.all(
      (sessions || []).map(async (s) => {
        // 답변 + feedback_result 조회 (한 쿼리)
        const { data: answers } = await supabase
          .from(T.opic_study_answers)
          .select("user_id, feedback_result")
          .eq("session_id", s.id);

        // 멤버별 첫 strength/improvement 한 줄씩
        type FbAcc = { strength: string | null; improvement: string | null };
        const memberFb = new Map<string, FbAcc>();
        for (const a of answers ?? []) {
          const uid = a.user_id as string;
          const fb = a.feedback_result as { strengths?: string[]; improvements?: string[] } | null;
          if (!fb) continue;
          if (!memberFb.has(uid)) {
            memberFb.set(uid, {
              strength: fb.strengths?.[0] ?? null,
              improvement: fb.improvements?.[0] ?? null,
            });
          }
        }

        const memberHighlights = Array.from(memberFb.entries()).map(([uid, fb]) => {
          const meta = memberMeta.get(uid) ?? {
            name: "멤버",
            initial: "M",
            color: "a" as const,
          };
          return {
            user_id: uid,
            name: meta.name,
            initial: meta.initial,
            color: meta.color,
            strength: fb.strength,
            improvement: fb.improvement,
          };
        });

        return {
          ...s,
          total_answers: answers?.length ?? 0,
          member_count: memberCount,
          member_highlights: memberHighlights.length > 0 ? memberHighlights : undefined,
        } as SessionHistoryItem;
      })
    );

    return { data: enriched };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "이력 조회 실패" };
  }
}

/** 그룹의 진행 중 세션 (있으면 1개) */
export async function getActiveSession(groupId: string): Promise<ActionResult<ActiveSessionLite | null>> {
  try {
    const { supabase, userId } = await requireUser();
    await requireGroupMember(supabase, groupId, userId);

    const { data, error } = await supabase
      .from(T.opic_study_sessions)
      .select("id, step, current_speaker_user_id, selected_topic, selected_category, started_at")
      .eq("group_id", groupId)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { error: "활성 세션 조회 실패" };
    if (!data) return { data: null };

    // 발화자 이름 조회 (있을 때)
    let speakerName: string | null = null;
    if (data.current_speaker_user_id) {
      const { data: profile } = await supabase
        .from(T.profiles)
        .select("display_name")
        .eq("id", data.current_speaker_user_id)
        .maybeSingle();
      speakerName = profile?.display_name ?? null;
    }

    return {
      data: {
        ...data,
        current_speaker_name: speakerName,
      } as ActiveSessionLite,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "활성 세션 조회 실패" };
  }
}

/** 세션 룸 데이터 (룸 입장 시) */
export async function getSessionDetail(sessionId: string): Promise<ActionResult<OpicStudySession>> {
  try {
    const { supabase, userId } = await requireUser();
    await requireSessionMember(supabase, sessionId, userId);

    const { data, error } = await supabase
      .from(T.opic_study_sessions)
      .select("*")
      .eq("id", sessionId)
      .single();

    if (error || !data) return { error: "세션 조회 실패" };
    return { data: data as OpicStudySession };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "세션 조회 실패" };
  }
}

// ============================================================
// 2. 세션 CRUD (3개)
// ============================================================

/** 새 세션 생성 (활성 세션 있으면 합류 안내) */
export async function createSession(groupId: string): Promise<ActionResult<{ session_id: string }>> {
  try {
    const { supabase, userId } = await requireUser();
    await requireGroupMember(supabase, groupId, userId);

    // 활성 세션 체크 (있으면 합류 권유)
    const { data: existing } = await supabase
      .from(T.opic_study_sessions)
      .select("id")
      .eq("group_id", groupId)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      return { error: `이미 진행 중인 세션이 있습니다 (id: ${existing.id})` };
    }

    const { data, error } = await supabase
      .from(T.opic_study_sessions)
      .insert({
        group_id: groupId,
        created_by: userId,
        // 나머지 필드는 DEFAULT
      })
      .select("id")
      .single();

    if (error || !data) return { error: "세션 생성 실패" };
    return { data: { session_id: data.id } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "세션 생성 실패" };
  }
}

/** 세션 종료 (정상 완료) */
export async function endSession(sessionId: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();
    await requireSessionMember(supabase, sessionId, userId);

    const { error } = await supabase
      .from(T.opic_study_sessions)
      .update({
        status: "completed",
        step: "completed",
        ended_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) return { error: "세션 종료 실패" };
    return { data: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "세션 종료 실패" };
  }
}

/** 세션 포기 (중도 이탈) */
export async function abandonSession(sessionId: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();
    await requireSessionMember(supabase, sessionId, userId);

    const { error } = await supabase
      .from(T.opic_study_sessions)
      .update({
        status: "abandoned",
        ended_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) return { error: "세션 포기 실패" };
    return { data: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "세션 포기 실패" };
  }
}

// ============================================================
// 3. 학습 콘텐츠 (3개) — 콤보 빈도
// ============================================================

/** Step 2: 카테고리별 통계 (전체 풀 기준) */
export async function getCategoryStats(): Promise<ActionResult<CategoryStat[]>> {
  try {
    const { supabase } = await requireUser();

    // 시험후기 모듈에서 직접 집계
    const { data, error } = await supabase
      .from(T.submission_combos)
      .select("topic, combo_type, submissions!inner(status, exam_approved)")
      .eq("submissions.status", "complete")
      .eq("submissions.exam_approved", "approved");

    if (error) return { error: "카테고리 통계 조회 실패" };

    // 클라이언트(서버)에서 그루핑
    const groups: Record<StudyCategory, { topics: Set<string>; combos: number }> = {
      general: { topics: new Set(), combos: 0 },
      roleplay: { topics: new Set(), combos: 0 },
      advance: { topics: new Set(), combos: 0 },
    };

    for (const row of data || []) {
      const cat = comboTypeToCategory(row.combo_type as string);
      groups[cat].combos++;
      groups[cat].topics.add(row.topic as string);
    }

    const stats: CategoryStat[] = (["general", "roleplay", "advance"] as const).map((cat) => ({
      category: cat,
      topic_count: groups[cat].topics.size,
      combo_count: groups[cat].combos,
    }));

    return { data: stats };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "카테고리 통계 조회 실패" };
  }
}

/** Step 3: 토픽 목록 (콤보 빈도순) + 그룹 학습 이력 */
export async function getTopicsForStudy(input: { category: StudyCategory; groupId: string }): Promise<ActionResult<TopicForStudy[]>> {
  try {
    const { supabase, userId } = await requireUser();
    await requireGroupMember(supabase, input.groupId, userId);

    // 1. 시험후기 raw 데이터
    const { data: combos, error } = await supabase
      .from(T.submission_combos)
      .select("topic, combo_type, submissions!inner(status, exam_approved)")
      .eq("submissions.status", "complete")
      .eq("submissions.exam_approved", "approved");

    if (error) return { error: "토픽 조회 실패" };

    // 2. 카테고리 필터 + 토픽별 카운트
    const filtered = (combos || []).filter((c) => comboTypeToCategory(c.combo_type as string) === input.category);
    const counts: Record<string, number> = {};
    for (const c of filtered) {
      counts[c.topic as string] = (counts[c.topic as string] || 0) + 1;
    }

    // 3. 그룹 학습 이력
    const { data: studied } = await supabase
      .from(T.opic_study_sessions)
      .select("selected_topic, selected_category")
      .eq("group_id", input.groupId)
      .eq("status", "completed")
      .eq("selected_category", input.category)
      .not("selected_topic", "is", null);

    const studyCounts: Record<string, number> = {};
    for (const s of studied || []) {
      const t = s.selected_topic as string;
      if (t) studyCounts[t] = (studyCounts[t] || 0) + 1;
    }

    // 4. 결과 조립
    const topics: TopicForStudy[] = Object.entries(counts)
      .map(([topic, combo_count]) => ({
        topic,
        category: input.category,
        combo_count,
        studied_count: studyCounts[topic] || 0,
      }))
      .sort((a, b) => b.combo_count - a.combo_count);

    return { data: topics };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "토픽 조회 실패" };
  }
}

/** Step 4: 콤보 목록 (출제 빈도순) + 학습 이력 */
export async function getCombosForStudy(input: {
  category: StudyCategory;
  topic: string;
  groupId: string;
}): Promise<ActionResult<ComboForStudy[]>> {
  try {
    const { supabase, userId } = await requireUser();
    await requireGroupMember(supabase, input.groupId, userId);

    // 1. 시험후기 raw 질문 데이터 (토픽+카테고리 필터)
    type RawRow = {
      submission_id: number;
      combo_type: string;
      question_number: number;
      question_id: string;
      questions: {
        question_english: string;
        question_korean: string | null;
        question_type_eng: string;
      };
      submissions: {
        status: string;
        exam_approved: string;
        exam_date: string;
        achieved_level: string | null;
      };
    };

    const { data: rawData, error } = await supabase
      .from(T.submission_questions)
      .select(
        "submission_id, combo_type, question_number, question_id, " +
          "questions!inner(question_english, question_korean, question_type_eng), " +
          "submissions!inner(status, exam_approved, exam_date, achieved_level)"
      )
      .eq("topic", input.topic)
      .eq("submissions.status", "complete")
      .eq("submissions.exam_approved", "approved");

    if (error) return { error: "콤보 조회 실패" };

    const rows = (rawData ?? []) as unknown as RawRow[];

    // 2. 카테고리 필터
    const filtered = rows.filter(
      (r) => comboTypeToCategory(r.combo_type) === input.category
    );

    // 3. submission_id로 그루핑 → 콤보 객체
    type RawCombo = {
      submission_id: number;
      qids: string[];                                          // 출제 순서
      questions: Array<{
        id: string;
        question_type: string;
        question_english: string;
        question_korean: string | null;
      }>;
      exam_date: string;
      achieved_level: string | null;
    };

    const bySubmission = new Map<number, RawCombo>();
    for (const r of filtered.sort((a, b) => a.question_number - b.question_number)) {
      const sid = r.submission_id;
      const existing = bySubmission.get(sid);
      const item = {
        id: r.question_id,
        question_type: r.questions.question_type_eng,
        question_english: r.questions.question_english,
        question_korean: r.questions.question_korean,
      };
      if (existing) {
        existing.qids.push(r.question_id);
        existing.questions.push(item);
      } else {
        bySubmission.set(sid, {
          submission_id: sid,
          qids: [r.question_id],
          questions: [item],
          exam_date: r.submissions.exam_date,
          achieved_level: r.submissions.achieved_level,
        });
      }
    }

    const rawCombos = Array.from(bySubmission.values());
    const totalCombos = rawCombos.length;
    if (totalCombos === 0) return { data: [] };

    // 4. 시그니처(정렬)로 그루핑 → 빈도 계산
    const bySig = new Map<string, RawCombo[]>();
    for (const rc of rawCombos) {
      const sig = buildComboSignature(rc.qids);
      const list = bySig.get(sig) ?? [];
      list.push(rc);
      bySig.set(sig, list);
    }

    // 5. 토픽 전체 질문별 등장률 계산
    const qidAppearance: Record<string, number> = {};
    for (const rc of rawCombos) {
      for (const qid of rc.qids) {
        qidAppearance[qid] = (qidAppearance[qid] || 0) + 1;
      }
    }

    // 6. 학습 이력 (그룹 + 사용자) 병렬 조회
    const [{ data: groupSigs }, { data: userQs }] = await Promise.all([
      supabase
        .from(T.opic_study_sessions)
        .select("selected_combo_sig")
        .eq("group_id", input.groupId)
        .eq("status", "completed")
        .not("selected_combo_sig", "is", null),
      supabase
        .from(T.opic_study_answers)
        .select("question_id")
        .eq("user_id", userId)
        .not("feedback_result", "is", null),
    ]);

    const studiedSigs = new Set((groupSigs || []).map((s) => s.selected_combo_sig as string));
    const studiedQids = new Set((userQs || []).map((a) => a.question_id as string));

    // 7. 결과 조립
    const combos: ComboForStudy[] = Array.from(bySig.entries())
      .map(([sig, group]) => {
        const representative = group[0];
        const frequency = group.length;
        const appearancePct = Math.round((frequency / totalCombos) * 100);

        return {
          sig,
          representative_qids: representative.qids,
          frequency,
          appearance_pct: appearancePct,
          questions: representative.questions.map((q) => ({
            ...q,
            appearance_pct: Math.round((qidAppearance[q.id] / totalCombos) * 100),
            studied_by_user: studiedQids.has(q.id),
          })),
          studied_in_group: studiedSigs.has(sig),
          examples: group.slice(0, 3).map((g) => ({
            submission_id: g.submission_id,
            exam_date: g.exam_date,
            achieved_level: g.achieved_level as ComboForStudy["examples"] extends Array<{ achieved_level: infer L }> | undefined ? L : never,
          })),
        } as ComboForStudy;
      })
      .sort((a, b) => b.frequency - a.frequency);

    return { data: combos };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "콤보 조회 실패" };
  }
}

// ============================================================
// 4. 세션 진행 (8개) — first-write-wins
// ============================================================

/** Step 1: 모드 선택 */
export async function selectMode(sessionId: string, online: boolean): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();
    await requireSessionMember(supabase, sessionId, userId);

    const { data, error } = await supabase
      .from(T.opic_study_sessions)
      .update({ online_mode: online, step: "category_select" })
      .eq("id", sessionId)
      .eq("step", "mode_select")
      .select("id");

    if (error) return { error: "모드 선택 실패" };
    if (!data || data.length === 0) return { error: "이미 다른 단계로 진행됐습니다" };
    return { data: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "모드 선택 실패" };
  }
}

/** Step 2: 카테고리 선택 */
export async function selectCategory(sessionId: string, category: StudyCategory): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();
    await requireSessionMember(supabase, sessionId, userId);

    const { data, error } = await supabase
      .from(T.opic_study_sessions)
      .update({ selected_category: category, step: "topic_select" })
      .eq("id", sessionId)
      .eq("step", "category_select")
      .is("selected_category", null)
      .select("id");

    if (error) return { error: "카테고리 선택 실패" };
    if (!data || data.length === 0) return { error: "이미 선택됐거나 단계가 다릅니다" };
    return { data: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "카테고리 선택 실패" };
  }
}

/** Step 3: 주제 선택 */
export async function selectTopic(sessionId: string, topic: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();
    await requireSessionMember(supabase, sessionId, userId);

    const { data, error } = await supabase
      .from(T.opic_study_sessions)
      .update({ selected_topic: topic, step: "combo_select" })
      .eq("id", sessionId)
      .eq("step", "topic_select")
      .is("selected_topic", null)
      .select("id");

    if (error) return { error: "주제 선택 실패" };
    if (!data || data.length === 0) return { error: "이미 선택됐거나 단계가 다릅니다" };
    return { data: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "주제 선택 실패" };
  }
}

/** Step 4: 콤보 선택 */
export async function selectCombo(
  sessionId: string,
  comboSig: string,
  questionIds: string[]
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();
    await requireSessionMember(supabase, sessionId, userId);

    const { data, error } = await supabase
      .from(T.opic_study_sessions)
      .update({
        selected_combo_sig: comboSig,
        selected_question_ids: questionIds,
        step: "guide",
      })
      .eq("id", sessionId)
      .eq("step", "combo_select")
      .is("selected_combo_sig", null)
      .select("id");

    if (error) return { error: "콤보 선택 실패" };
    if (!data || data.length === 0) return { error: "이미 선택됐거나 단계가 다릅니다" };
    return { data: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "콤보 선택 실패" };
  }
}

/** Step 5 → 6: 가이드 표시 후 학습 시작 */
export async function startRecording(sessionId: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();
    await requireSessionMember(supabase, sessionId, userId);

    const { data, error } = await supabase
      .from(T.opic_study_sessions)
      .update({ step: "recording" })
      .eq("id", sessionId)
      .eq("step", "guide")
      .select("id");

    if (error) return { error: "학습 시작 실패" };
    if (!data || data.length === 0) return { error: "이미 진행됐거나 단계가 다릅니다" };
    return { data: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "학습 시작 실패" };
  }
}

/** Step 6-1: 발화권 자임 ("내가 답변") */
export async function claimSpeaker(sessionId: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();
    await requireSessionMember(supabase, sessionId, userId);

    const { data, error } = await supabase
      .from(T.opic_study_sessions)
      .update({ current_speaker_user_id: userId })
      .eq("id", sessionId)
      .eq("step", "recording")
      .is("current_speaker_user_id", null)
      .select("id");

    if (error) return { error: "발화권 자임 실패" };
    if (!data || data.length === 0) return { error: "다른 멤버가 이미 발화권을 가졌어요" };
    return { data: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "발화권 자임 실패" };
  }
}

/** Step 6-7a: 다음 발화자 (현재 발화자 해제 — 새 발화자는 자임으로) */
export async function nextSpeaker(sessionId: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();
    await requireSessionMember(supabase, sessionId, userId);

    const { error } = await supabase
      .from(T.opic_study_sessions)
      .update({ current_speaker_user_id: null })
      .eq("id", sessionId)
      .eq("step", "recording");

    if (error) return { error: "발화자 전환 실패" };
    return { data: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "발화자 전환 실패" };
  }
}

/** Step 6-7b: 다음 질문 (마지막 질문이면 종료) */
export async function nextQuestion(sessionId: string): Promise<ActionResult<{ completed: boolean }>> {
  try {
    const { supabase, userId } = await requireUser();
    await requireSessionMember(supabase, sessionId, userId);

    // 현재 세션 상태 조회
    const { data: session, error: fetchErr } = await supabase
      .from(T.opic_study_sessions)
      .select("current_question_idx, selected_question_ids")
      .eq("id", sessionId)
      .single();
    if (fetchErr || !session) return { error: "세션 조회 실패" };

    const totalQuestions = (session.selected_question_ids as string[]).length;
    const nextIdx = session.current_question_idx + 1;
    const isLast = nextIdx >= totalQuestions;

    const updatePayload: Record<string, unknown> = {
      current_question_idx: nextIdx,
      current_speaker_user_id: null,
    };

    if (isLast) {
      updatePayload.status = "completed";
      updatePayload.step = "completed";
      updatePayload.ended_at = new Date().toISOString();
    } else {
      updatePayload.step = "recording";
    }

    const { error: updErr } = await supabase
      .from(T.opic_study_sessions)
      .update(updatePayload)
      .eq("id", sessionId)
      .eq("current_question_idx", session.current_question_idx); // 멱등성

    if (updErr) return { error: "다음 질문 진행 실패" };
    return { data: { completed: isLast } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "다음 질문 진행 실패" };
  }
}

// ============================================================
// 5. AI 트리거 (2개) — fire-and-forget EF
// ============================================================

/** AI 가이드 생성 트리거 (Step 4 → 5 진입 시) */
export async function generateGuide(sessionId: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();
    await requireSessionMember(supabase, sessionId, userId);

    // 이미 가이드가 있으면 skip
    const { data: session } = await supabase
      .from(T.opic_study_sessions)
      .select("ai_guide_text")
      .eq("id", sessionId)
      .single();
    if (session?.ai_guide_text) return { data: null };

    // EF fire-and-forget (호출자 user_id 함께 전달 → api_usage_logs 기록용)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    fetch(`${url}/functions/v1/opic-study-guide`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ session_id: sessionId, triggered_by: userId }),
    }).catch(() => {
      // 에러는 EF 내부에서 처리. 클라이언트는 Realtime으로 결과 수신.
    });

    return { data: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "가이드 생성 트리거 실패" };
  }
}

/** 답변 제출 (사전 INSERT + EF fire-and-forget) */
export async function submitAnswer(input: {
  sessionId: string;
  questionId: string;
  questionIdx: number;
  audioUrl: string;
}): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();
    await requireSessionMember(supabase, input.sessionId, userId);

    // 1. 사전 INSERT (audio_url만, F/B 결과는 EF가 채움)
    const { error: insertErr } = await supabase
      .from(T.opic_study_answers)
      .insert({
        session_id: input.sessionId,
        user_id: userId,
        question_id: input.questionId,
        question_idx: input.questionIdx,
        audio_url: input.audioUrl,
      });

    if (insertErr) {
      // UNIQUE 위반 등
      return { error: "답변 기록 실패 (이미 답변했거나 권한 없음)" };
    }

    // 2. 발화권 해제 (다음 발화자 대기)
    await supabase
      .from(T.opic_study_sessions)
      .update({ current_speaker_user_id: null })
      .eq("id", input.sessionId)
      .eq("current_speaker_user_id", userId);

    // 3. EF fire-and-forget (F/B 생성)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    fetch(`${url}/functions/v1/opic-study-feedback`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: input.sessionId,
        user_id: userId,
        question_id: input.questionId,
        question_idx: input.questionIdx,
        audio_url: input.audioUrl,
      }),
    }).catch(() => {
      // 에러는 EF 내부에서 처리
    });

    return { data: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "답변 제출 실패" };
  }
}

// ============================================================
// 6. 세션 답변 조회 (UI용)
// ============================================================

/** 세션의 모든 답변 조회 (Step 6-4, 6-6, 7에서 사용) */
export async function getSessionAnswers(sessionId: string): Promise<ActionResult<OpicStudyAnswer[]>> {
  try {
    const { supabase, userId } = await requireUser();
    await requireSessionMember(supabase, sessionId, userId);

    const { data, error } = await supabase
      .from(T.opic_study_answers)
      .select("*")
      .eq("session_id", sessionId)
      .order("question_idx", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) return { error: "답변 조회 실패" };
    return { data: (data || []) as OpicStudyAnswer[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "답변 조회 실패" };
  }
}
