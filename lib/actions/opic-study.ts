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
  SessionHistoryDetail,
  MyStudySummary,
  CategoryStat,
  TopicForStudy,
  ComboForStudy,
  CombosForStudyResponse,
  GroupSchedule,
  StudyCategory,
  SessionStep,
  QuestionTypeGuide,
  ComboGuideCache,
  ExamLibraryItem,
  ExamLibraryPage,
  ExamLibraryCombo,
  ExamLibraryQuestion,
} from "@/lib/types/opic-study";
import { isSessionExpired, getModeForDate } from "@/lib/opic-study/schedule";

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

/** category → combo_types 매핑 (시험후기 빈도 분석과 동일 — FREQUENCY_COMBO_MAP) */
const CATEGORY_TO_COMBO_TYPES: Record<StudyCategory, string[]> = {
  general: ["general_1", "general_2", "general_3"],
  roleplay: ["roleplay"],
  advance: ["advance"],
};

type StudyMemberMeta = {
  name: string;
  initial: string;
  color: "a" | "b" | "c" | "d";
};

async function getStudyMemberMeta(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  groupId: string
) {
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
  const memberMeta = new Map<string, StudyMemberMeta>();

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

  return {
    rawMembers: rawMembers ?? [],
    memberMeta,
    memberCount: rawMembers?.length ?? 0,
  };
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
      .select("id, selected_category, selected_topic, selected_combo_sig, selected_question_ids, started_at, ended_at, status")
      .eq("group_id", groupId)
      .order("started_at", { ascending: false })
      .limit(50);

    if (error) return { error: "이력 조회 실패" };
    if (!sessions || sessions.length === 0) return { data: [] };

    const { memberMeta, memberCount } = await getStudyMemberMeta(supabase, groupId);
    const sessionIds = sessions.map((s) => s.id as string);
    const { data: allAnswers } = await supabase
      .from(T.opic_study_answers)
      .select("session_id, user_id, question_idx, audio_url, feedback_result")
      .in("session_id", sessionIds);

    const answersBySession = new Map<string, NonNullable<typeof allAnswers>>();
    for (const answer of allAnswers ?? []) {
      const sid = answer.session_id as string;
      const list = answersBySession.get(sid) ?? [];
      list.push(answer);
      answersBySession.set(sid, list);
    }

    const enriched = sessions.map((s) => {
      const answers = answersBySession.get(s.id as string) ?? [];
      const answerCount = answers.filter((a) => !!a.audio_url).length;
      const skipCount = answers.filter((a) => !a.audio_url).length;
      const coachNoteCount = answers.filter((a) => !!a.feedback_result).length;
      const participantCount = new Set(answers.map((a) => a.user_id as string)).size;
      const selectedQuestionIds = (s.selected_question_ids as string[] | null) ?? [];
      const maxAnsweredQuestionIdx = Math.max(
        -1,
        ...answers.map((a) => Number(a.question_idx ?? -1))
      );
      const totalQuestions = Math.max(selectedQuestionIds.length, maxAnsweredQuestionIdx + 1);

      type FbAcc = { strength: string | null; improvement: string | null };
      const memberFb = new Map<string, FbAcc>();
      for (const a of answers) {
        const uid = a.user_id as string;
        const fb = a.feedback_result as { strengths?: string[]; improvements?: string[] } | null;
        if (!fb || memberFb.has(uid)) continue;
        memberFb.set(uid, {
          strength: fb.strengths?.[0] ?? null,
          improvement: fb.improvements?.[0] ?? null,
        });
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
        selected_question_ids: selectedQuestionIds,
        total_answers: answerCount,
        total_skips: skipCount,
        total_questions: totalQuestions,
        participant_count: participantCount,
        member_count: memberCount,
        member_highlights:
          coachNoteCount > 0 && memberHighlights.length > 0
            ? memberHighlights
            : undefined,
      } as SessionHistoryItem;
    });

    return { data: enriched };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "이력 조회 실패" };
  }
}

/** 완료 세션 이력 상세 (읽기 전용) */
export async function getSessionHistoryDetail(
  sessionId: string
): Promise<ActionResult<SessionHistoryDetail>> {
  try {
    const { supabase, userId } = await requireUser();
    const groupId = await requireSessionMember(supabase, sessionId, userId);

    const { data: session, error } = await supabase
      .from(T.opic_study_sessions)
      .select(
        "id, group_id, online_mode, selected_category, selected_topic, selected_question_ids, started_at, ended_at, status, study_groups!inner(name)"
      )
      .eq("id", sessionId)
      .maybeSingle();

    if (error || !session) return { error: "세션을 찾을 수 없습니다" };

    const { memberMeta, memberCount } = await getStudyMemberMeta(supabase, groupId);
    const { data: answers } = await supabase
      .from(T.opic_study_answers)
      .select("user_id, question_id, question_idx, audio_url, feedback_result")
      .eq("session_id", sessionId);

    const answerRows = answers ?? [];
    const selectedQuestionIds = (session.selected_question_ids as string[] | null) ?? [];
    const answerQuestionIds = Array.from(
      new Set(answerRows.map((a) => a.question_id as string).filter(Boolean))
    );
    const questionIds = selectedQuestionIds.length > 0 ? selectedQuestionIds : answerQuestionIds;

    const { data: questions } = questionIds.length > 0
      ? await supabase
          .from(T.questions)
          .select("id, question_english, question_short, question_type_kor")
          .in("id", questionIds)
      : { data: [] };

    const questionMap = new Map((questions ?? []).map((q) => [q.id as string, q]));
    const maxQuestionIdx = Math.max(
      -1,
      ...answerRows.map((a) => Number(a.question_idx ?? -1))
    );
    const totalQuestions = Math.max(questionIds.length, maxQuestionIdx + 1);

    const questionSummaries: SessionHistoryDetail["questions"] = Array.from(
      { length: totalQuestions },
      (_, i) => {
        const questionId = questionIds[i] ?? null;
        const question = questionId ? questionMap.get(questionId) : null;
        const questionAnswers = answerRows.filter((a) => Number(a.question_idx) === i);
        const answerCount = questionAnswers.filter((a) => !!a.audio_url).length;
        const skipCount = questionAnswers.filter((a) => !a.audio_url).length;
        const coachNoteCount = questionAnswers.filter((a) => !!a.feedback_result).length;
        const status =
          answerCount > 0 && skipCount > 0
            ? "mixed"
            : answerCount > 0
              ? "completed"
              : skipCount > 0
                ? "skipped"
                : "waiting";

        return {
          number: i + 1,
          question_id: questionId,
          label:
            (question?.question_short as string | null) ||
            (question?.question_english as string | null) ||
            `${session.selected_topic ?? "콤보"} ${i + 1}번 질문`,
          question_english: (question?.question_english as string | null) ?? null,
          question_type_kor: (question?.question_type_kor as string | null) ?? null,
          answer_count: answerCount,
          skip_count: skipCount,
          coach_note_count: coachNoteCount,
          status,
        };
      }
    );

    const participantIds = Array.from(new Set(answerRows.map((a) => a.user_id as string)));
    const memberSummaries = participantIds.map((uid) => {
      const meta = memberMeta.get(uid) ?? {
        name: "멤버",
        initial: "M",
        color: "a" as const,
      };
      const memberAnswers = answerRows.filter((a) => a.user_id === uid);
      return {
        user_id: uid,
        name: meta.name,
        initial: meta.initial,
        color: meta.color,
        answered_count: memberAnswers.filter((a) => !!a.audio_url).length,
        skipped_count: memberAnswers.filter((a) => !a.audio_url).length,
        coach_note_count: memberAnswers.filter((a) => !!a.feedback_result).length,
      };
    });

    const groupMeta = session.study_groups as unknown as { name: string };
    const answerCount = answerRows.filter((a) => !!a.audio_url).length;
    const skipCount = answerRows.filter((a) => !a.audio_url).length;
    const coachNoteCount = answerRows.filter((a) => !!a.feedback_result).length;

    return {
      data: {
        id: session.id as string,
        group_id: groupId,
        group_name: groupMeta.name,
        selected_category: session.selected_category as StudyCategory | null,
        selected_topic: session.selected_topic as string | null,
        started_at: session.started_at as string,
        ended_at: session.ended_at as string | null,
        status: session.status as SessionHistoryDetail["status"],
        online_mode: Boolean(session.online_mode),
        stats: {
          group_member_count: memberCount,
          participant_count: participantIds.length,
          total_questions: totalQuestions,
          answer_count: answerCount,
          skip_count: skipCount,
          coach_note_count: coachNoteCount,
        },
        questions: questionSummaries,
        members: memberSummaries,
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "세션 이력 조회 실패" };
  }
}

/** 오픽 스터디 마이페이지용 개인 요약 */
export async function getMyStudySummary(
  groupId: string
): Promise<ActionResult<MyStudySummary>> {
  try {
    const { supabase, userId } = await requireUser();
    await requireGroupMember(supabase, groupId, userId);

    const { data: sessions, error } = await supabase
      .from(T.opic_study_sessions)
      .select("id, selected_category, selected_topic, selected_question_ids, started_at, ended_at, status")
      .eq("group_id", groupId)
      .order("started_at", { ascending: false })
      .limit(80);

    if (error) return { error: "내 학습 요약 조회 실패" };
    if (!sessions || sessions.length === 0) {
      return {
        data: {
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
        },
      };
    }

    const sessionIds = sessions.map((s) => s.id as string);
    const { data: answers } = await supabase
      .from(T.opic_study_answers)
      .select("session_id, question_idx, audio_url, feedback_result, created_at")
      .eq("user_id", userId)
      .in("session_id", sessionIds);

    const answerRows = answers ?? [];
    const answersBySession = new Map<string, typeof answerRows>();
    for (const answer of answerRows) {
      const sid = answer.session_id as string;
      const list = answersBySession.get(sid) ?? [];
      list.push(answer);
      answersBySession.set(sid, list);
    }

    const activeSession =
      sessions.find((s) => s.status === "active") ?? null;
    const participatedSessions = sessions.filter(
      (s) =>
        s.status === "completed" &&
        (answersBySession.get(s.id as string)?.length ?? 0) > 0
    );

    const answerCount = answerRows.filter((a) => !!a.audio_url).length;
    const skipCount = answerRows.filter((a) => !a.audio_url).length;
    const coachNoteCount = answerRows.filter((a) => !!a.feedback_result).length;
    const lastSession = participatedSessions[0] ?? activeSession;

    const topicMap = new Map<
      string,
      {
        topic: string;
        session_count: number;
        answer_count: number;
        skip_count: number;
        last_date_label: string;
      }
    >();

    const recentSessions = participatedSessions.slice(0, 8).map((session) => {
      const rows = answersBySession.get(session.id as string) ?? [];
      const topic = (session.selected_topic as string | null) ?? "미선택";
      const answerCountForSession = rows.filter((a) => !!a.audio_url).length;
      const skipCountForSession = rows.filter((a) => !a.audio_url).length;
      const coachNoteCountForSession = rows.filter((a) => !!a.feedback_result).length;
      const selectedQuestionIds = (session.selected_question_ids as string[] | null) ?? [];
      const totalQuestions = Math.max(
        selectedQuestionIds.length,
        ...rows.map((a) => Number(a.question_idx ?? -1) + 1),
        0
      );
      const dateLabel = formatShortDate(
        (session.ended_at as string | null) ?? (session.started_at as string)
      );

      const current = topicMap.get(topic) ?? {
        topic,
        session_count: 0,
        answer_count: 0,
        skip_count: 0,
        last_date_label: dateLabel,
      };
      current.session_count += 1;
      current.answer_count += answerCountForSession;
      current.skip_count += skipCountForSession;
      topicMap.set(topic, current);

      return {
        id: session.id as string,
        date_label: dateLabel,
        topic,
        category: session.selected_category as StudyCategory | null,
        total_questions: totalQuestions,
        answer_count: answerCountForSession,
        skip_count: skipCountForSession,
        coach_note_count: coachNoteCountForSession,
      };
    });

    type LegacyFeedback = {
      summary?: string;
      strengths?: string[];
      improvements?: string[];
      good_expressions?: Array<{ note?: string; quote?: string }>;
      refine_expressions?: Array<{ suggestion?: string; issue?: string; quote?: string }>;
      pronunciation_patterns?: string[];
      next_speaker_tip?: { take?: string; enhance?: string };
    };

    const recentCoachNotes: MyStudySummary["coach_notes"]["recent"] = [];
    const strengths: string[] = [];
    const improvements: string[] = [];

    for (const session of sessions) {
      const rows = answersBySession.get(session.id as string) ?? [];
      const topic = (session.selected_topic as string | null) ?? "미선택";
      const dateLabel = formatShortDate(
        (session.ended_at as string | null) ?? (session.started_at as string)
      );

      for (const row of rows) {
        const fb = row.feedback_result as LegacyFeedback | null;
        if (!fb) continue;
        const take =
          fb.next_speaker_tip?.take ??
          fb.strengths?.[0] ??
          fb.good_expressions?.[0]?.note ??
          null;
        const enhance =
          fb.next_speaker_tip?.enhance ??
          fb.improvements?.[0] ??
          fb.refine_expressions?.[0]?.suggestion ??
          fb.pronunciation_patterns?.[0] ??
          null;
        if (take) strengths.push(take);
        if (enhance) improvements.push(enhance);
        if (recentCoachNotes.length < 5) {
          recentCoachNotes.push({
            session_id: session.id as string,
            date_label: dateLabel,
            topic,
            summary: fb.summary ?? take ?? enhance ?? "코치노트가 생성됐어요.",
            take,
            enhance,
          });
        }
      }
    }

    return {
      data: {
        stats: {
          participated_sessions: participatedSessions.length,
          answer_count: answerCount,
          skip_count: skipCount,
          coach_note_count: coachNoteCount,
          last_date_label: lastSession
            ? formatShortDate(
                (lastSession.ended_at as string | null) ??
                  (lastSession.started_at as string)
              )
            : "─",
          active_session_id: activeSession ? (activeSession.id as string) : null,
        },
        topic_stats: Array.from(topicMap.values()).sort(
          (a, b) => b.session_count - a.session_count || b.answer_count - a.answer_count
        ),
        recent_sessions: recentSessions,
        coach_notes: {
          strengths: uniqueFirst(strengths, 3),
          improvements: uniqueFirst(improvements, 3),
          next_focus: improvements[0] ?? null,
          recent: recentCoachNotes,
        },
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "내 학습 요약 조회 실패" };
  }
}

function formatShortDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "─";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function uniqueFirst(items: string[], limit: number) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= limit) break;
  }
  return result;
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

    // ──────────────────────────────────────────────────────
    // Lazy 정리 — 운영 종료 + grace(60분) 지난 세션은 자동 abandoned
    // ──────────────────────────────────────────────────────
    const { data: groupRow } = await supabase
      .from(T.study_groups)
      .select("schedule")
      .eq("id", groupId)
      .maybeSingle();
    const schedule = (groupRow?.schedule as GroupSchedule | null) ?? null;

    if (schedule && isSessionExpired(data.started_at as string, schedule)) {
      await supabase
        .from(T.opic_study_sessions)
        .update({ status: "abandoned", ended_at: new Date().toISOString() })
        .eq("id", data.id);
      return { data: null };
    }

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

    // 활성 세션 체크 (있으면 합류 권유) — 만료된 좀비는 자동 정리
    const { data: existing } = await supabase
      .from(T.opic_study_sessions)
      .select("id, started_at")
      .eq("group_id", groupId)
      .eq("status", "active")
      .maybeSingle();

    // 그룹 schedule 조회 — 좀비 정리 + 모드 결정 양쪽에 사용
    const { data: groupRow } = await supabase
      .from(T.study_groups)
      .select("schedule")
      .eq("id", groupId)
      .maybeSingle();
    const schedule = (groupRow?.schedule as GroupSchedule | null) ?? null;

    if (existing) {
      if (schedule && isSessionExpired(existing.started_at as string, schedule)) {
        // 만료된 좀비 세션 → 자동 abandoned 처리 후 새 세션 생성 진행
        await supabase
          .from(T.opic_study_sessions)
          .update({ status: "abandoned", ended_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        return { error: `이미 진행 중인 세션이 있습니다 (id: ${existing.id})` };
      }
    }

    // 오늘 모드 결정 — 그룹 schedule 기반 (요일별 override 우선, 없으면 default_mode)
    const todayMode = schedule ? getModeForDate(schedule) : "online";

    // step은 DB DEFAULT('mode_select') 사용 — 첫 입장자는 lobby에서 멤버 모이는 거 보고 시작.
    // 두 번째 이후 합류자는 step 보고 자동으로 세션 룸 직진(라우팅 단에서 분기).
    const { data, error } = await supabase
      .from(T.opic_study_sessions)
      .insert({
        group_id: groupId,
        created_by: userId,
        online_mode: todayMode === "online",
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

    // 시험후기 모듈에서 직접 집계 — question_ids로 콤보 시그니처 생성하여 고유 카운트
    const { data, error } = await supabase
      .from(T.submission_combos)
      .select(
        "topic, combo_type, question_ids, submissions!inner(status, exam_approved)"
      )
      .eq("submissions.status", "complete")
      .eq("submissions.exam_approved", "approved");

    if (error) return { error: "카테고리 통계 조회 실패" };

    // 카테고리별 그루핑 — comboSigs Set으로 고유 콤보 카운트
    // (같은 콤보가 여러 시험에 출제되어도 1개로 카운트)
    const groups: Record<
      StudyCategory,
      { topics: Set<string>; comboSigs: Set<string> }
    > = {
      general: { topics: new Set(), comboSigs: new Set() },
      roleplay: { topics: new Set(), comboSigs: new Set() },
      advance: { topics: new Set(), comboSigs: new Set() },
    };

    for (const row of data || []) {
      const cat = comboTypeToCategory(row.combo_type as string);
      const qids = (row.question_ids as string[] | null) ?? [];
      if (qids.length === 0) continue;
      groups[cat].comboSigs.add(buildComboSignature(qids));
      groups[cat].topics.add(row.topic as string);
    }

    const stats: CategoryStat[] = (["general", "roleplay", "advance"] as const).map((cat) => ({
      category: cat,
      topic_count: groups[cat].topics.size,
      combo_count: groups[cat].comboSigs.size,
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

    // 1. 시험후기 raw 데이터 — question_ids로 콤보 시그니처 만들어 고유 카운트
    const { data: combos, error } = await supabase
      .from(T.submission_combos)
      .select(
        "topic, combo_type, question_ids, submissions!inner(status, exam_approved)"
      )
      .eq("submissions.status", "complete")
      .eq("submissions.exam_approved", "approved");

    if (error) return { error: "토픽 조회 실패" };

    // 2. 카테고리 필터 + 토픽별 (a) 고유 콤보 시그니처 Set, (b) 실제 출제 row 수
    //    - combo_count = 고유 콤보 종류 수 (화면 표시 "콤보 X개")
    //    - submission_count = 실제 출제 횟수 (정렬 주 지표 — 사용자 지시)
    const filtered = (combos || []).filter(
      (c) => comboTypeToCategory(c.combo_type as string) === input.category
    );
    const topicSigs: Record<string, Set<string>> = {};
    const topicSubmissionCount: Record<string, number> = {};
    for (const c of filtered) {
      const topic = c.topic as string;
      const qids = (c.question_ids as string[] | null) ?? [];
      if (qids.length === 0) continue;
      if (!topicSigs[topic]) topicSigs[topic] = new Set();
      topicSigs[topic].add(buildComboSignature(qids));
      topicSubmissionCount[topic] = (topicSubmissionCount[topic] || 0) + 1;
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

    // 4. 결과 조립 — submission_count desc 정렬 (실제 출제 빈도)
    //    동률 시 combo_count desc (콤보 다양성)로 보조 정렬
    const topics: TopicForStudy[] = Object.entries(topicSigs)
      .map(([topic, sigs]) => ({
        topic,
        category: input.category,
        combo_count: sigs.size,
        submission_count: topicSubmissionCount[topic] || 0,
        studied_count: studyCounts[topic] || 0,
      }))
      .sort((a, b) => {
        if (b.submission_count !== a.submission_count) {
          return b.submission_count - a.submission_count;
        }
        return b.combo_count - a.combo_count;
      });

    return { data: topics };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "토픽 조회 실패" };
  }
}

/** Step 4: 콤보 목록 (출제 빈도순) + 학습 이력 + 헤더 메타 */
export async function getCombosForStudy(input: {
  category: StudyCategory;
  topic: string;
  groupId: string;
}): Promise<ActionResult<CombosForStudyResponse>> {
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
        question_short: string | null;
        question_type_eng: string;
        question_type_kor: string | null;
        audio_url: string | null;
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
          "questions!inner(question_english, question_korean, question_short, question_type_eng, question_type_kor, audio_url), " +
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
        question_type_kor: string | null;
        question_english: string;
        question_korean: string | null;
        question_short: string | null;
        audio_url: string | null;
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
        question_type_kor: r.questions.question_type_kor,
        question_english: r.questions.question_english,
        question_korean: r.questions.question_korean,
        question_short: r.questions.question_short,
        audio_url: r.questions.audio_url,
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
    if (totalCombos === 0) {
      return {
        data: { combos: [], topic_category_count: 0, total_submissions: 0 },
      };
    }

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

    // 6. 학습 이력 + 전체 승인 시험 수 (시험후기 빈도 분석과 동일 모수) 병렬 조회
    const [{ data: groupSigs }, { data: userQs }, { count: totalSubsCount }] = await Promise.all([
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
      supabase
        .from(T.submissions)
        .select("id", { count: "exact", head: true })
        .eq("status", "complete")
        .eq("exam_approved", "approved"),
    ]);

    const studiedSigs = new Set((groupSigs || []).map((s) => s.selected_combo_sig as string));
    const studiedQids = new Set((userQs || []).map((a) => a.question_id as string));
    const totalSubmissions = totalSubsCount ?? 0;

    // 7. 결과 조립 — 카드 분모: 카테고리 한정 (totalCombos), 헤더 메타: 전체 승인 시험
    const combos: ComboForStudy[] = Array.from(bySig.entries())
      .map(([sig, group]) => {
        const representative = group[0];
        const frequency = group.length;
        const appearancePct =
          totalCombos > 0 ? Math.round((frequency / totalCombos) * 100) : 0;

        return {
          sig,
          representative_qids: representative.qids,
          frequency,
          total_in_category: totalCombos,
          appearance_pct: appearancePct,
          questions: representative.questions.map((q) => ({
            ...q,
            appearance_pct:
              totalCombos > 0
                ? Math.round(
                    ((qidAppearance[q.id] || 0) / totalCombos) * 100
                  )
                : 0,
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

    return {
      data: {
        combos,
        topic_category_count: totalCombos,
        total_submissions: totalSubmissions,
      },
    };
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

/**
 * lobby에서 "세션 룸 입장" 누를 때 — step만 category_select로 변경.
 *
 * 모드는 그룹 schedule에서 createSession 시점에 이미 결정·저장됨.
 * first-write-wins: 누가 먼저 누르면 step 진입, 다른 멤버는 다음 진입 시 자동 합류.
 */
export async function advanceLobby(sessionId: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();
    await requireSessionMember(supabase, sessionId, userId);

    const { data, error } = await supabase
      .from(T.opic_study_sessions)
      .update({ step: "category_select" })
      .eq("id", sessionId)
      .eq("step", "mode_select")
      .select("id");

    if (error) return { error: "세션 시작 실패" };
    // 이미 진행 중이면 OK — 다른 멤버가 먼저 시작했을 뿐
    return { data: null };
    void data;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "세션 시작 실패" };
  }
}

/**
 * 단계 되돌리기 (Step 3/4의 ← 뒤로 버튼) — 그룹 모두 함께 이전 단계로
 *
 * - "category_select" 으로 되돌리면: selected_category null. 현재 step이 topic_select일 때만.
 * - "topic_select" 으로 되돌리면: selected_topic, selected_combo_sig, selected_question_ids 모두 reset.
 *   현재 step이 combo_select일 때만.
 *
 * Realtime sync로 모든 멤버 화면이 자동으로 이전 단계로 이동.
 * 답변(recording) 단계 이후에는 사용 불가 — 답변/코칭 손실 방지.
 */
export async function rollbackStep(
  sessionId: string,
  targetStep: "category_select" | "topic_select"
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();
    await requireSessionMember(supabase, sessionId, userId);

    if (targetStep === "category_select") {
      // Step 3 (topic_select) → Step 2 (category_select)
      const { error } = await supabase
        .from(T.opic_study_sessions)
        .update({
          step: "category_select",
          selected_category: null,
        })
        .eq("id", sessionId)
        .eq("step", "topic_select");
      if (error) return { error: "단계 되돌리기 실패" };
    } else if (targetStep === "topic_select") {
      // Step 4 (combo_select) → Step 3 (topic_select)
      const { error } = await supabase
        .from(T.opic_study_sessions)
        .update({
          step: "topic_select",
          selected_topic: null,
          selected_combo_sig: null,
          selected_question_ids: [],
        })
        .eq("id", sessionId)
        .eq("step", "combo_select");
      if (error) return { error: "단계 되돌리기 실패" };
    } else {
      return { error: "지원하지 않는 단계입니다" };
    }
    return { data: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "단계 되돌리기 실패",
    };
  }
}

/** Step 2: 카테고리 선택 — last-write-wins (progressive disclosure UX, scripts/create 패턴) */
export async function selectCategory(sessionId: string, category: StudyCategory): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();
    await requireSessionMember(supabase, sessionId, userId);

    // 카테고리 변경 시 하위 선택 모두 리셋. step은 항상 topic_select.
    const { data, error } = await supabase
      .from(T.opic_study_sessions)
      .update({
        selected_category: category,
        step: "topic_select",
        selected_topic: null,
        selected_combo_sig: null,
        selected_question_ids: [],
      })
      .eq("id", sessionId)
      .in("step", ["category_select", "topic_select"])
      .select("id");

    if (error) return { error: "카테고리 선택 실패" };
    if (!data || data.length === 0)
      return { error: "단계가 진행되어 변경할 수 없어요" };
    return { data: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "카테고리 선택 실패" };
  }
}

/** Step 3: 주제 선택 — last-write-wins (같은 step 내 주제 변경 자유) */
export async function selectTopic(sessionId: string, topic: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();
    await requireSessionMember(supabase, sessionId, userId);

    // 주제 변경 시 콤보 리셋 + step은 combo_select로
    const { data, error } = await supabase
      .from(T.opic_study_sessions)
      .update({
        selected_topic: topic,
        step: "combo_select",
        selected_combo_sig: null,
        selected_question_ids: [],
      })
      .eq("id", sessionId)
      .in("step", ["topic_select", "combo_select"])
      .select("id");

    if (error) return { error: "주제 선택 실패" };
    if (!data || data.length === 0)
      return { error: "단계가 진행되어 변경할 수 없어요" };
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

/** 이번 질문 패스 — 본인이 답변/패스 기록 없는 상태에서 호출
 * INSERT opic_study_answers with audio_url=null (skip 마커)
 * + 발화권 해제 (본인이 발화자였다면)
 * → 본인은 이 질문에서 더 이상 자임 못 함 (myAnswered 통과)
 */
export async function skipQuestion(input: {
  sessionId: string;
  questionId: string;
  questionIdx: number;
}): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();
    await requireSessionMember(supabase, input.sessionId, userId);

    // 1. INSERT skip record (audio_url=null이 패스 마커)
    const { error: insertErr } = await supabase
      .from(T.opic_study_answers)
      .insert({
        session_id: input.sessionId,
        user_id: userId,
        question_id: input.questionId,
        question_idx: input.questionIdx,
        audio_url: null,
      });
    if (insertErr) {
      // UNIQUE 위반 등 — 이미 답변/패스 처리됨. idempotent로 OK 처리
      // (UI에서 "이미 처리됨" 같은 메시지 안 띄움)
    }

    // 2. 발화권 해제 (본인이 발화자였다면)
    await supabase
      .from(T.opic_study_sessions)
      .update({ current_speaker_user_id: null })
      .eq("id", input.sessionId)
      .eq("current_speaker_user_id", userId);

    return { data: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "패스 실패" };
  }
}

/** 본인 발화권 해제 — 업로드/제출 실패 등 복구용 (본인이 발화자일 때만 동작) */
export async function releaseSpeaker(sessionId: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();
    await requireSessionMember(supabase, sessionId, userId);

    const { error } = await supabase
      .from(T.opic_study_sessions)
      .update({ current_speaker_user_id: null })
      .eq("id", sessionId)
      .eq("current_speaker_user_id", userId); // 본인이 발화자일 때만

    if (error) return { error: "발화권 해제 실패" };
    return { data: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "발화권 해제 실패" };
  }
}

/** 발화자 강제 해제 — 발화자가 stuck (3분+ 진행 X) 시 다른 멤버가 풀어줌 */
export async function forceReleaseSpeaker(
  sessionId: string
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();
    await requireSessionMember(supabase, sessionId, userId);

    // 누구든 멤버면 해제 가능 (단, 답변이 INSERT된 발화자는 해제 X — F/B 대기는 정상)
    const { data: session } = await supabase
      .from(T.opic_study_sessions)
      .select("current_speaker_user_id, current_question_idx")
      .eq("id", sessionId)
      .maybeSingle();

    if (!session?.current_speaker_user_id) {
      return { data: null }; // 이미 해제됨 — idempotent
    }

    // 발화자의 답변이 이미 INSERT됐는지 확인 (F/B 대기 중이면 강제 해제 X)
    const { data: existingAnswer } = await supabase
      .from(T.opic_study_answers)
      .select("id")
      .eq("session_id", sessionId)
      .eq("user_id", session.current_speaker_user_id)
      .eq("question_idx", session.current_question_idx)
      .maybeSingle();

    if (existingAnswer) {
      return {
        error: "이미 답변 제출됨 — 코칭 대기 중이에요. 잠시만 기다려주세요.",
      };
    }

    const { error } = await supabase
      .from(T.opic_study_sessions)
      .update({ current_speaker_user_id: null })
      .eq("id", sessionId);

    if (error) return { error: "발화자 해제 실패" };
    return { data: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "발화자 해제 실패" };
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
      .select("ai_guide_intro")
      .eq("id", sessionId)
      .single();
    if (session?.ai_guide_intro) return { data: null };

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

/**
 * 답변 EF 재시도 — F/B 생성 실패/지연 시 사용자가 수동 재시도.
 * 이미 INSERT된 답변의 audio_url을 사용해 EF만 다시 fire-and-forget.
 */
export async function retryFeedback(input: {
  sessionId: string;
  questionIdx: number;
}): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireUser();
    await requireSessionMember(supabase, input.sessionId, userId);

    const { data: ans, error: ansErr } = await supabase
      .from(T.opic_study_answers)
      .select("audio_url, question_id")
      .eq("session_id", input.sessionId)
      .eq("user_id", userId)
      .eq("question_idx", input.questionIdx)
      .maybeSingle();

    if (ansErr || !ans?.audio_url) {
      return { error: "답변 음성을 찾을 수 없어요" };
    }

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
        question_id: ans.question_id,
        question_idx: input.questionIdx,
        audio_url: ans.audio_url,
      }),
    }).catch(() => undefined);

    return { data: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "재시도 실패" };
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

// ============================================================
// 7. 학습 통계 (멤버 홈 LearnStatsRow)
// ============================================================

/**
 * 내 오픽 스터디 학습 통계 — 마지막 참여일 + 누적 답변 수
 *
 * - 답변 0건: { totalAnswers: 0, lastParticipationDaysAgo: null }
 * - 답변 1건+: { totalAnswers: N, lastParticipationDaysAgo: Math.floor((now - max(created_at)) / day) }
 *
 * 두 쿼리 병렬 (count head + 최신 1건)
 */
export async function getMyLearnStats(): Promise<
  ActionResult<{
    lastParticipationDaysAgo: number | null;
    totalAnswers: number;
  }>
> {
  try {
    const { supabase, userId } = await requireUser();

    const [countRes, latestRes] = await Promise.all([
      supabase
        .from(T.opic_study_answers)
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from(T.opic_study_answers)
        .select("created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (countRes.error) return { error: "학습 통계 조회 실패" };

    const totalAnswers = countRes.count ?? 0;
    let lastParticipationDaysAgo: number | null = null;

    if (totalAnswers > 0 && latestRes.data?.created_at) {
      const lastAt = new Date(latestRes.data.created_at as string);
      const diffMs = Date.now() - lastAt.getTime();
      lastParticipationDaysAgo = Math.max(0, Math.floor(diffMs / 86400_000));
    }

    return {
      data: {
        lastParticipationDaysAgo,
        totalAnswers,
      },
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "학습 통계 조회 실패",
    };
  }
}

// ============================================================
// 8. 콤보 둘러보기 (Explore) — 학습 가이드 라이브러리
// ============================================================

/** 질문 유형별 한글 가이드 전체 조회 (활성 가이드만, display_order 순) */
export async function getQuestionTypeGuides(): Promise<ActionResult<QuestionTypeGuide[]>> {
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase
      .from("question_type_guides")
      .select(
        "type_id, type_label_kor, type_short_kor, essence_kor, answer_flow, key_points, recommended_word_min, recommended_word_max, prompt_reference, is_active, display_order"
      )
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      return { error: "유형 가이드 조회 실패" };
    }
    return { data: (data ?? []) as QuestionTypeGuide[] };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "유형 가이드 조회 실패",
    };
  }
}

/**
 * 승인된 기출 1건 페이지 조회 — 기출 둘러보기 (한 페이지에 1건씩, 등록 최신순)
 *
 * 본인 후기 포함, 자기소개 포함.
 * 정렬: created_at DESC (최신 등록 먼저).
 */
export async function getApprovedExamPool(input: {
  page: number; // 1-based
}): Promise<ActionResult<ExamLibraryPage>> {
  try {
    const { supabase, userId } = await requireUser();

    const page = Math.max(1, Math.floor(input.page));

    // 1. 전체 count
    const { count: totalCount, error: countErr } = await supabase
      .from(T.submissions)
      .select("id", { count: "exact", head: true })
      .eq("status", "complete")
      .eq("exam_approved", "approved");

    if (countErr) {
      return { error: "기출 개수 조회 실패" };
    }

    const total = totalCount ?? 0;
    if (total === 0) {
      return { data: { exam: null, page, total: 0 } };
    }

    if (page > total) {
      return { data: { exam: null, page, total } };
    }

    // 2. 해당 페이지의 기출 1건 조회 (최신순 페이지네이션)
    const offset = page - 1;
    const { data: subs, error: sErr } = await supabase
      .from(T.submissions)
      .select("id, user_id, exam_date, achieved_level, created_at")
      .eq("status", "complete")
      .eq("exam_approved", "approved")
      .order("created_at", { ascending: false })
      .range(offset, offset);

    if (sErr || !subs || subs.length === 0) {
      return { data: { exam: null, page, total } };
    }
    const sub = subs[0];

    // 3. 응시자 표시명
    const isMy = sub.user_id === userId;
    let userDisplayName: string | null = null;
    if (!isMy) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("id", sub.user_id)
        .maybeSingle();
      userDisplayName =
        (profile?.display_name as string | null) ??
        (profile?.email as string | undefined)?.split("@")[0] ??
        "익명";
    }

    // 4. 콤보 + 질문 조회
    const [{ data: combos }, { data: subQuestionRows }] = await Promise.all([
      supabase
        .from(T.submission_combos)
        .select("combo_type, topic, question_ids")
        .eq("submission_id", sub.id),
      supabase
        .from(T.submission_questions)
        .select(
          "question_number, combo_type, topic, question_id, custom_question_text"
        )
        .eq("submission_id", sub.id)
        .order("question_number", { ascending: true }),
    ]);

    // 5. questions 마스터 조회 (질문 메타)
    const questionIds = (subQuestionRows ?? [])
      .map((q) => q.question_id as string | null)
      .filter((id): id is string => !!id);

    const { data: questionsMeta } = questionIds.length > 0
      ? await supabase
          .from(T.questions)
          .select(
            "id, question_english, question_korean, question_short, question_type_eng, audio_url"
          )
          .in("id", questionIds)
      : { data: [] };

    const qMetaMap = new Map(
      (questionsMeta ?? []).map((q) => [q.id as string, q])
    );

    // 6. combo_type → category 매핑
    const comboTypeToCategoryV2 = (
      ct: string
    ): "self_intro" | "general" | "roleplay" | "advance" => {
      if (ct === "self_intro" || ct === "자기소개") return "self_intro";
      if (ct.startsWith("general")) return "general";
      if (ct === "roleplay") return "roleplay";
      return "advance";
    };

    const comboLabel = (
      ct: string,
      cat: "self_intro" | "general" | "roleplay" | "advance"
    ): string => {
      if (cat === "self_intro") return "자기소개";
      if (cat === "general") {
        // "general 1" / "general1" / "general" → 라벨 추출
        const num = ct.match(/(\d)/)?.[1];
        return num ? `일반콤보 ${num}` : "일반콤보";
      }
      if (cat === "roleplay") return "롤플레이";
      return "어드밴스";
    };

    // 7. 콤보 그룹화 — submission_combos 기준
    const comboMap = new Map<string, ExamLibraryCombo>();

    // 콤보 row 우선 등록 (자기소개 제외 — submission_combos에 없을 수 있음)
    for (const c of combos ?? []) {
      const ct = c.combo_type as string;
      const cat = comboTypeToCategoryV2(ct);
      const qids = (c.question_ids as string[]) ?? [];
      const sig = qids.length > 0 ? [...qids].sort().join("|") : null;
      comboMap.set(ct, {
        combo_type: ct,
        category: cat,
        category_label: comboLabel(ct, cat),
        topic: c.topic as string,
        sig,
        questions: [],
      });
    }

    // 자기소개는 submission_combos에 없을 가능성 — submission_questions에서 self_intro 식별
    // 동시에 자기소개를 별도 콤보로 추가
    for (const q of subQuestionRows ?? []) {
      const ct = q.combo_type as string;
      const cat = comboTypeToCategoryV2(ct);
      if (cat === "self_intro" && !comboMap.has(ct)) {
        comboMap.set(ct, {
          combo_type: ct,
          category: "self_intro",
          category_label: "자기소개",
          topic: (q.topic as string) ?? "",
          sig: null,
          questions: [],
        });
      }
    }

    // 질문 매칭
    for (const q of subQuestionRows ?? []) {
      const ct = q.combo_type as string;
      const block = comboMap.get(ct);
      if (!block) continue;
      const meta = q.question_id ? qMetaMap.get(q.question_id as string) : null;
      const englishText =
        (meta?.question_english as string | undefined) ??
        (q.custom_question_text as string | null) ??
        "(질문 없음)";

      block.questions.push({
        question_number: q.question_number as number,
        question_id: (q.question_id as string | null) ?? null,
        question_english: englishText,
        question_korean: (meta?.question_korean as string | null) ?? null,
        question_short: (meta?.question_short as string | null) ?? null,
        question_type_eng: (meta?.question_type_eng as string | null) ?? null,
        audio_url: (meta?.audio_url as string | null) ?? null,
      });
    }

    // 콤보 정렬 — 자기소개 → 일반1~3 → 롤플레이 → 어드밴스
    const orderRank = (cat: ExamLibraryCombo["category"]): number =>
      cat === "self_intro" ? 0 : cat === "general" ? 1 : cat === "roleplay" ? 2 : 3;
    const orderedCombos = Array.from(comboMap.values()).sort((a, b) => {
      const ra = orderRank(a.category);
      const rb = orderRank(b.category);
      if (ra !== rb) return ra - rb;
      // 일반콤보 1/2/3 순서
      const na = parseInt(a.combo_type.match(/(\d)/)?.[1] ?? "0", 10);
      const nb = parseInt(b.combo_type.match(/(\d)/)?.[1] ?? "0", 10);
      return na - nb;
    });

    // 각 콤보 내 질문 정렬
    for (const c of orderedCombos) {
      c.questions.sort((a, b) => a.question_number - b.question_number);
    }

    const exam: ExamLibraryItem = {
      submission_id: sub.id as number,
      exam_date: sub.exam_date as string,
      achieved_level: (sub.achieved_level as string | null) ?? null,
      is_my_submission: isMy,
      user_display_name: userDisplayName,
      combos: orderedCombos,
    };

    return { data: { exam, page, total } };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "기출 조회 실패",
    };
  }
}

/**
 * 콤보 캐시 조회 + 미스 시 EF 트리거 — 둘러보기 + 스터디 룸 공유 캐시
 *
 * 흐름:
 *   1. combo_guide_cache 조회
 *   2. HIT → 즉시 반환 (cache_hit: true)
 *   3. MISS → opic-study-guide EF 호출 (mode='explore') → 응답 대기 → 반환
 *
 * 응답 시간:
 *   - HIT: ~50ms (DB SELECT)
 *   - MISS: ~1~3s (GPT 호출 + 캐시 저장)
 */
export async function getOrGenerateComboCache(
  sig: string,
  hint?: {
    topic?: string;
    category?: StudyCategory;
  }
): Promise<ActionResult<ComboGuideCache>> {
  try {
    const { supabase, userId } = await requireUser();

    if (!sig || !sig.includes("|")) {
      return { error: "잘못된 콤보 시그니처" };
    }

    const PROMPT_VERSION = 2; // EF의 PROMPT_VERSION과 일치

    // 1. 캐시 조회 (현행 prompt_version만)
    const { data: cached } = await supabase
      .from("combo_guide_cache")
      .select("sig, topic, category, intro_text, approaches, generated_at, prompt_version")
      .eq("sig", sig)
      .eq("prompt_version", PROMPT_VERSION)
      .maybeSingle();

    if (cached) {
      return { data: cached as ComboGuideCache };
    }

    // 2. 미스 → EF 호출 (클라이언트 컨텍스트 hint 전달)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const efResponse = await fetch(`${url}/functions/v1/opic-study-guide`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sig,
        triggered_by: userId,
        topic: hint?.topic,
        category: hint?.category,
      }),
    });

    if (!efResponse.ok) {
      return { error: "가이드 생성 실패. 잠시 후 다시 시도해주세요." };
    }

    // 3. 캐시 재조회 (EF가 INSERT 했음)
    const { data: regenerated } = await supabase
      .from("combo_guide_cache")
      .select("sig, topic, category, intro_text, approaches, generated_at, prompt_version")
      .eq("sig", sig)
      .eq("prompt_version", PROMPT_VERSION)
      .maybeSingle();

    if (!regenerated) {
      return { error: "가이드 저장 실패" };
    }
    return { data: regenerated as ComboGuideCache };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "콤보 가이드 조회 실패",
    };
  }
}

/**
 * 단일 콤보 상세 조회 — 콤보 둘러보기 상세 페이지용
 * sig (정렬된 question_ids '|' join)으로 조회.
 *
 * 출제 빈도/학습 이력은 그룹 컨텍스트(groupId)가 있을 때만 채움.
 */
export async function getComboBySig(input: {
  sig: string;
  groupId?: string;
  category?: StudyCategory;       // 카테고리 필터 (분모 한정 — 시험후기 빈도 분석 BM)
}): Promise<ActionResult<ComboForStudy>> {
  try {
    const { supabase, userId } = await requireUser();

    if (input.groupId) {
      await requireGroupMember(supabase, input.groupId, userId);
    }

    const questionIds = input.sig.split("|").filter(Boolean);
    if (questionIds.length === 0) {
      return { error: "잘못된 콤보 시그니처" };
    }

    // 1. 질문 정보 조회
    const { data: questions, error: qErr } = await supabase
      .from("questions")
      .select("id, question_type_eng, question_type_kor, question_english, question_korean, question_short, audio_url, topic, category")
      .in("id", questionIds);

    if (qErr || !questions || questions.length === 0) {
      return { error: "콤보를 찾을 수 없습니다" };
    }

    // 토픽/카테고리 결정 — input.category 우선, 없으면 questions에서 추론
    const topic = questions[0].topic as string;
    // questions.category는 한글("일반"/"롤플레이"/"어드밴스")일 수 있음 → 입력 우선
    const inferredCategory: StudyCategory = (() => {
      const raw = ((questions[0].category as string) ?? "").trim();
      if (raw === "일반" || raw.startsWith("general")) return "general";
      if (raw === "롤플레이" || raw === "roleplay") return "roleplay";
      if (raw === "어드밴스" || raw === "advance") return "advance";
      return "general";
    })();
    const category: StudyCategory = input.category ?? inferredCategory;

    // 2. 분자 — 같은 토픽 + 같은 카테고리에서 이 sig 출제 시험 수
    const allowedComboTypes = CATEGORY_TO_COMBO_TYPES[category];
    const [{ data: combosRaw }, { count: totalSubsCount }] = await Promise.all([
      supabase
        .from(T.submission_combos)
        .select("question_ids, combo_type, submissions!inner(status, exam_approved)")
        .eq("topic", topic)
        .in("combo_type", allowedComboTypes)
        .eq("submissions.status", "complete")
        .eq("submissions.exam_approved", "approved"),
      // 분모 — 전체 승인 시험 수 (시험후기 빈도 분석과 동일 모수)
      supabase
        .from(T.submissions)
        .select("id", { count: "exact", head: true })
        .eq("status", "complete")
        .eq("exam_approved", "approved"),
    ]);

    type ComboRow = { question_ids: string[] };
    const allCombos = (combosRaw ?? []) as unknown as ComboRow[];

    const targetSig = buildComboSignature(questionIds);
    let frequency = 0;
    const totalSubmissions = totalSubsCount ?? 0;
    const totalCombosInCategory = allCombos.length; // 카드 비율 분모
    const qidAppearance: Record<string, number> = {};

    for (const c of allCombos) {
      const sig = buildComboSignature(c.question_ids ?? []);
      if (sig === targetSig) frequency++;
      for (const qid of c.question_ids ?? []) {
        qidAppearance[qid] = (qidAppearance[qid] || 0) + 1;
      }
    }

    // 카드 점유율 — 카테고리 분모
    const appearance_pct =
      totalCombosInCategory > 0
        ? Math.round((frequency / totalCombosInCategory) * 100)
        : 0;

    // 3. 그룹 학습 이력 (groupId 있을 때만)
    let studied_in_group = false;
    if (input.groupId) {
      const { data: studied } = await supabase
        .from(T.opic_study_sessions)
        .select("id")
        .eq("group_id", input.groupId)
        .eq("selected_combo_sig", targetSig)
        .limit(1);
      studied_in_group = (studied?.length ?? 0) > 0;
    }

    // 4. 출제 순서 보존 — questions를 questionIds 순서로 정렬
    const orderedQuestions = questionIds
      .map((qid) => questions.find((q) => q.id === qid))
      .filter((q): q is NonNullable<typeof q> => !!q);

    const result: ComboForStudy = {
      sig: targetSig,
      representative_qids: questionIds,
      frequency,
      total_in_category: totalCombosInCategory,
      total_submissions: totalSubmissions,
      appearance_pct,
      questions: orderedQuestions.map((q) => ({
        id: q.id as string,
        question_type: q.question_type_eng as string,
        question_type_kor: (q.question_type_kor as string | null) ?? null,
        question_english: q.question_english as string,
        question_korean: q.question_korean as string | null,
        question_short: q.question_short as string | null,
        audio_url: (q.audio_url as string | null) ?? null,
        // 질문별 등장률 — 카테고리 분모 (헤더와 동일 의미: 카테고리 안 점유율)
        appearance_pct:
          totalCombosInCategory > 0
            ? Math.round(
                ((qidAppearance[q.id as string] || 0) / totalCombosInCategory) *
                  100
              )
            : 0,
        studied_by_user: false, // explore 페이지에서는 미사용
      })),
      studied_in_group,
    };

    return { data: result };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "콤보 조회 실패",
    };
  }
}
