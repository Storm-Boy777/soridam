"use server";

// 스피킹 코치 모듈 — 사용자용 Server Actions
// PRD v2: C:/Users/js777/Desktop/소리담_AI코치_PRD.md
// 마이그레이션: 068_coaching_module.sql

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { T, RPC } from "@/lib/constants/tables";
import type {
  ActionResult,
  QuestionType,
  TypeCard,
  TopicCard,
  TopicsByType,
  StartSessionResult,
  SubmitAttemptResult,
  AttemptDisplay,
  SessionDetail,
  MarkMasteredResult,
  CoachingAttempt,
  CoachingSession,
  InputMode,
  SurveyType,
  QuestionListItem,
  QuestionListByTopic,
  CoachingCategoryQuestion,
  ResumableSession,
} from "@/lib/types/coaching";
import {
  BODY_QUESTION_TYPES,
  ACTIVE_QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPE_DESCRIPTIONS,
} from "@/lib/types/coaching";
import { QUESTION_TYPE_ORDER } from "@/lib/types/reviews";
import { ESTIMATED_COST_CENTS } from "@/lib/constants/estimated-costs";

// 같은 유형의 토픽 N개 졸업 시 유형 마스터
const TYPE_MASTERY_REQUIRED_TOPICS = 5;

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

// ============================================================
// 크레딧 잔액 확인 — 스피킹 코치 1회 답변 평가 비용 기준
// ============================================================

export async function checkCoachingCredit(): Promise<
  ActionResult<{ hasCredit: boolean; balanceCents: number; estimatedCostCents: number }>
> {
  try {
    const { supabase, userId } = await requireUser();
    const { data: balance } = await supabase
      .from(T.polar_balances)
      .select("balance_cents")
      .eq("user_id", userId)
      .single();
    const balanceCents = balance?.balance_cents ?? 0;
    const estimatedCostCents = ESTIMATED_COST_CENTS.coaching;
    return {
      data: {
        hasCredit: balanceCents >= estimatedCostCents,
        balanceCents,
        estimatedCostCents,
      },
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ============================================================
// 1. Step 1 — 유형 카드 11개 + 사용자별 진척
// ============================================================

export async function getTypeCards(): Promise<ActionResult<TypeCard[]>> {
  try {
    const { supabase, userId } = await requireUser();

    // 사용자의 토픽 마스터 수 (유형별)
    const { data: topicMastery } = await supabase
      .from(T.coaching_topic_mastery)
      .select("question_type")
      .eq("user_id", userId);

    // 사용자의 유형 마스터 (체화 완료)
    const { data: typeMastery } = await supabase
      .from(T.coaching_type_mastery)
      .select("question_type")
      .eq("user_id", userId);

    // 사용자의 최근 세션 (유형별 last_session_at)
    const { data: recentSessions } = await supabase
      .from(T.coaching_sessions)
      .select("question_type, last_attempt_at, started_at")
      .eq("user_id", userId)
      .order("last_attempt_at", { ascending: false, nullsFirst: false });

    // 유형별 집계
    const topicCountByType = new Map<string, number>();
    (topicMastery ?? []).forEach((r: { question_type: string }) => {
      topicCountByType.set(r.question_type, (topicCountByType.get(r.question_type) ?? 0) + 1);
    });

    const typeMasteredSet = new Set((typeMastery ?? []).map((r: { question_type: string }) => r.question_type));

    const lastSessionByType = new Map<string, string>();
    (recentSessions ?? []).forEach((s: { question_type: string; last_attempt_at: string | null; started_at: string }) => {
      if (!lastSessionByType.has(s.question_type)) {
        lastSessionByType.set(s.question_type, s.last_attempt_at ?? s.started_at);
      }
    });

    // 자기소개 + 본문 10유형 = 11카드
    const allTypes: QuestionType[] = ["self_intro", ...BODY_QUESTION_TYPES];

    const cards: TypeCard[] = allTypes.map((qt) => ({
      question_type: qt,
      label: QUESTION_TYPE_LABELS[qt],
      description: QUESTION_TYPE_DESCRIPTIONS[qt],
      is_active: ACTIVE_QUESTION_TYPES.includes(qt),
      user_progress: {
        topics_mastered_count: topicCountByType.get(qt) ?? 0,
        type_mastered: typeMasteredSet.has(qt),
        last_session_at: lastSessionByType.get(qt) ?? null,
      },
    }));

    return { data: cards };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "유형 카드 조회 실패" };
  }
}

// ============================================================
// 2. Step 2 — 토픽 선택 (선택형/공통형 그룹핑)
// ============================================================

export async function getTopicsByType(
  question_type: QuestionType
): Promise<ActionResult<TopicsByType>> {
  try {
    const { supabase, userId } = await requireUser();

    if (question_type === "self_intro") {
      return { error: "자기소개는 별도 흐름입니다 (강의 없음)" };
    }

    // questions에서 해당 유형의 토픽별 대표 질문 (각 토픽당 1개)
    const { data: questions, error: qErr } = await supabase
      .from(T.questions)
      .select("id, topic, survey_type, question_korean, question_english")
      .eq("question_type_eng", question_type)
      .not("survey_type", "is", null)
      .order("topic");
    if (qErr) throw qErr;

    // 토픽별로 1개씩만 (첫 등장)
    const topicMap = new Map<
      string,
      { id: string; survey_type: SurveyType; question_korean: string | null; question_english: string | null }
    >();
    (questions ?? []).forEach(
      (q: {
        id: string;
        topic: string | null;
        survey_type: string | null;
        question_korean: string | null;
        question_english: string | null;
      }) => {
        if (!q.topic || !q.survey_type) return;
        if (topicMap.has(q.topic)) return;
        topicMap.set(q.topic, {
          id: q.id,
          survey_type: q.survey_type as SurveyType,
          question_korean: q.question_korean,
          question_english: q.question_english,
        });
      }
    );

    // 사용자별 진척 + 토픽별 출제 빈도 (시험후기 콤보 SSOT)
    const [{ data: mastery }, { data: activeSessions }, { data: combos }] = await Promise.all([
      supabase
        .from(T.coaching_topic_mastery)
        .select("topic")
        .eq("user_id", userId)
        .eq("question_type", question_type),
      supabase
        .from(T.coaching_sessions)
        .select("id, topic, attempt_count")
        .eq("user_id", userId)
        .eq("question_type", question_type)
        .eq("status", "active"),
      supabase.from(T.submission_combos).select("topic"),
    ]);

    // 토픽별 출제 빈도 집계
    const freqCounts = new Map<string, number>();
    (combos ?? []).forEach((c: { topic: string | null }) => {
      if (!c.topic) return;
      freqCounts.set(c.topic, (freqCounts.get(c.topic) || 0) + 1);
    });

    const masteredTopics = new Set((mastery ?? []).map((r: { topic: string }) => r.topic));
    const activeByTopic = new Map<string, { id: string; attempt_count: number }>();
    (activeSessions ?? []).forEach((s: { id: string; topic: string; attempt_count: number }) => {
      activeByTopic.set(s.topic, { id: s.id, attempt_count: s.attempt_count });
    });

    // 그룹핑
    const selective: TopicCard[] = [];
    const common: TopicCard[] = [];

    for (const [topic, info] of topicMap.entries()) {
      const active = activeByTopic.get(topic);
      const card: TopicCard = {
        topic,
        survey_type: info.survey_type,
        question_id: info.id,
        question_korean: info.question_korean,
        question_english: info.question_english,
        user_progress: {
          mastered: masteredTopics.has(topic),
          in_progress_session_id: active?.id,
          attempt_count: active?.attempt_count,
        },
      };
      if (info.survey_type === "선택형") selective.push(card);
      else if (info.survey_type === "공통형") common.push(card);
    }

    // 출제 빈도순 정렬 (동률이면 가나다순)
    const byFrequency = (a: TopicCard, b: TopicCard) =>
      (freqCounts.get(b.topic) || 0) - (freqCounts.get(a.topic) || 0) ||
      a.topic.localeCompare(b.topic, "ko");
    selective.sort(byFrequency);
    common.sort(byFrequency);

    return { data: { selective, common } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "토픽 조회 실패" };
  }
}

// ============================================================
// 2.5. 한 토픽의 질문 리스트 + 사용자별 진척
// ============================================================

export async function getQuestionsByTopicAndType(
  question_type: QuestionType,
  topic: string
): Promise<ActionResult<QuestionListByTopic>> {
  try {
    const { supabase, userId } = await requireUser();

    if (question_type === "self_intro") {
      return { error: "자기소개는 별도 흐름입니다" };
    }

    const { data: questions, error: qErr } = await supabase
      .from(T.questions)
      .select("id, question_korean, question_english, question_short, audio_url, survey_type")
      .eq("question_type_eng", question_type)
      .eq("topic", topic)
      .order("id");
    if (qErr) throw qErr;
    if (!questions || questions.length === 0) {
      return { error: `${topic} 토픽에 ${question_type} 유형 질문이 없습니다` };
    }

    const surveyType = (questions[0].survey_type as SurveyType) ?? "공통형";
    const questionIds = questions.map((q: { id: string }) => q.id);

    // 사용자별 진척: 각 질문에 대한 세션/졸업 상태
    const [sessionsRes, masteryRes] = await Promise.all([
      supabase
        .from(T.coaching_sessions)
        .select("id, question_id, attempt_count, last_grade, last_attempt_at, status")
        .eq("user_id", userId)
        .eq("question_type", question_type)
        .eq("topic", topic)
        .in("question_id", questionIds),
      supabase
        .from(T.coaching_topic_mastery)
        .select("topic, session_id")
        .eq("user_id", userId)
        .eq("question_type", question_type)
        .eq("topic", topic)
        .maybeSingle(),
    ]);

    const sessionsByQ = new Map<
      string,
      { id: string; attempt_count: number; last_grade: string | null; last_attempt_at: string | null; status: string }
    >();
    (sessionsRes.data ?? []).forEach(
      (s: { id: string; question_id: string; attempt_count: number; last_grade: string | null; last_attempt_at: string | null; status: string }) => {
        sessionsByQ.set(s.question_id, s);
      }
    );

    const items: QuestionListItem[] = questions.map(
      (q: {
        id: string;
        question_korean: string | null;
        question_english: string | null;
        question_short: string | null;
        audio_url: string | null;
      }) => {
        const session = sessionsByQ.get(q.id);
        return {
          question_id: q.id,
          question_type: question_type,
          question_korean: q.question_korean,
          question_english: q.question_english ?? "",
          question_short: q.question_short,
          audio_url: q.audio_url,
          user_progress: {
            has_session: !!session,
            session_id: session?.id,
            attempt_count: session?.attempt_count,
            last_grade: session?.last_grade ?? null,
            last_attempt_at: session?.last_attempt_at,
            mastered: session?.status === "mastered",
          },
        };
      }
    );

    return { data: { type: question_type, topic, survey_type: surveyType, questions: items } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "질문 조회 실패" };
  }
}

// ============================================================
// 2.7. 주제별 탭 — 카테고리+토픽 기준 질문 (유형 섞임) + 사용자별 진척
//   유형별 탭과 동일한 진행/졸업 상태를 표시하기 위해 coaching_sessions를
//   question_id 기준으로 매칭한다 (유형 무관).
// ============================================================

export async function getCoachingQuestionsByCategoryTopic(
  category: "일반" | "롤플레이" | "어드밴스",
  topic: string
): Promise<ActionResult<CoachingCategoryQuestion[]>> {
  try {
    const { supabase, userId } = await requireUser();

    const { data: questions, error: qErr } = await supabase
      .from(T.questions)
      .select("id, question_korean, question_english, question_short, audio_url, question_type_eng")
      .eq("category", category)
      .eq("topic", topic)
      .order("id");
    if (qErr) throw qErr;
    if (!questions || questions.length === 0) {
      return { data: [] };
    }

    const questionIds = questions.map((q: { id: string }) => q.id);

    // 사용자별 진척: 이 질문들에 대한 코칭 세션 (question_id로 매칭 — 유형 무관)
    // 한 질문에 졸업+재시작 세션이 모두 있을 수 있어 최근 세션을 우선한다.
    const { data: sessions } = await supabase
      .from(T.coaching_sessions)
      .select("id, question_id, attempt_count, last_grade, last_attempt_at, status")
      .eq("user_id", userId)
      .in("question_id", questionIds)
      .order("last_attempt_at", { ascending: false, nullsFirst: false });

    const sessionsByQ = new Map<
      string,
      {
        id: string;
        attempt_count: number;
        last_grade: string | null;
        last_attempt_at: string | null;
        status: string;
      }
    >();
    (sessions ?? []).forEach(
      (s: {
        id: string;
        question_id: string;
        attempt_count: number;
        last_grade: string | null;
        last_attempt_at: string | null;
        status: string;
      }) => {
        if (!sessionsByQ.has(s.question_id)) sessionsByQ.set(s.question_id, s);
      }
    );

    const items: CoachingCategoryQuestion[] = questions.map(
      (q: {
        id: string;
        question_korean: string | null;
        question_english: string | null;
        question_short: string | null;
        audio_url: string | null;
        question_type_eng: string | null;
      }) => {
        const session = sessionsByQ.get(q.id);
        const qType = (q.question_type_eng ?? "description") as QuestionType;
        const isActiveType =
          q.question_type_eng != null &&
          ACTIVE_QUESTION_TYPES.includes(q.question_type_eng as QuestionType);
        return {
          question_id: q.id,
          question_type: qType,
          question_korean: q.question_korean,
          question_english: q.question_english ?? "",
          question_short: q.question_short,
          audio_url: q.audio_url,
          is_active_type: isActiveType,
          user_progress: {
            has_session: !!session,
            session_id: session?.id,
            attempt_count: session?.attempt_count,
            last_grade: session?.last_grade ?? null,
            last_attempt_at: session?.last_attempt_at,
            mastered: session?.status === "mastered",
          },
        };
      }
    );

    // 유형 순 → 같은 유형이면 가나다순 (스크립트 생성 방식과 동일)
    items.sort((a, b) => {
      const orderA = QUESTION_TYPE_ORDER[a.question_type] ?? 99;
      const orderB = QUESTION_TYPE_ORDER[b.question_type] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return (a.question_korean ?? "").localeCompare(b.question_korean ?? "", "ko");
    });

    return { data: items };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "질문 조회 실패" };
  }
}

// ============================================================
// 3. 세션 시작 또는 재진입
// ============================================================

export async function startOrResumeSession(input: {
  question_type: QuestionType;
  topic: string;
  question_id: string;
}): Promise<ActionResult<StartSessionResult>> {
  try {
    const { supabase, userId } = await requireUser();

    // 질문 정보 1회 조회 (survey_type 캐시 + 반환용 — 중복 조회 제거)
    const { data: question } = await supabase
      .from(T.questions)
      .select("id, question_korean, question_english, survey_type")
      .eq("id", input.question_id)
      .single();
    if (!question) throw new Error("질문을 찾을 수 없습니다");

    // 기존 active 세션 있나?
    const { data: existing } = await supabase
      .from(T.coaching_sessions)
      .select("id, attempt_count")
      .eq("user_id", userId)
      .eq("question_type", input.question_type)
      .eq("topic", input.topic)
      .eq("status", "active")
      .maybeSingle();

    let sessionId: string;
    let attemptCount: number;
    let isResumed: boolean;

    if (existing) {
      sessionId = existing.id;
      attemptCount = existing.attempt_count;
      isResumed = true;
    } else {
      // v5 — 세션 생성 시 profile.target_grade를 target_level에 캐시
      // EF가 등급별 spec 조회 시 우선 사용. 학생이 즉석 변경 가능(향후).
      const { data: profile } = await supabase
        .from(T.profiles)
        .select("target_grade")
        .eq("id", userId)
        .maybeSingle();

      const { data: inserted, error: insErr } = await supabase
        .from(T.coaching_sessions)
        .insert({
          user_id: userId,
          question_type: input.question_type,
          topic: input.topic,
          question_id: input.question_id,
          survey_type: question.survey_type ?? null,
          target_level: profile?.target_grade ?? "IH",
          status: "active",
          attempt_count: 0,
        })
        .select("id, attempt_count")
        .single();

      if (insErr || !inserted) throw new Error(insErr?.message ?? "세션 생성 실패");
      sessionId = inserted.id;
      attemptCount = inserted.attempt_count;
      isResumed = false;
    }

    return {
      data: {
        session_id: sessionId,
        attempt_count: attemptCount,
        is_resumed: isResumed,
        question: {
          id: question.id,
          korean: question.question_korean ?? "",
          english: question.question_english ?? "",
        },
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "세션 시작 실패" };
  }
}

// ============================================================
// 4. 답변 제출 (fire-and-forget으로 평가 EF 호출)
// ============================================================

export async function submitAttempt(input: {
  session_id: string;
  input_mode: InputMode;
  audio_url?: string;
  audio_duration?: number;
  text?: string; // 텍스트 모드일 때
}): Promise<ActionResult<SubmitAttemptResult>> {
  try {
    const { supabase, userId } = await requireUser();

    // 세션 본인 소유 확인
    const { data: session, error: sErr } = await supabase
      .from(T.coaching_sessions)
      .select("id, user_id, status")
      .eq("id", input.session_id)
      .single();
    if (sErr || !session) throw new Error("세션을 찾을 수 없습니다");
    if (session.user_id !== userId) throw new Error("권한이 없습니다");
    if (session.status === "mastered") throw new Error("이미 졸업한 세션입니다");

    // 회차 번호 원자적 발급 — 동시 제출 레이스 컨디션 방지
    // (attempt_count 증가 + last_attempt_at 갱신을 DB 단일 UPDATE로 수행)
    const { data: claimedNumber, error: rpcErr } = await supabase.rpc(
      RPC.coaching_claim_attempt_number,
      { p_session_id: input.session_id, p_user_id: userId }
    );
    if (rpcErr || claimedNumber == null) {
      throw new Error(rpcErr?.message ?? "회차 발급 실패 — 세션 상태를 확인하세요");
    }
    const nextAttemptNumber = claimedNumber as number;

    // attempt 행 생성
    const { data: attempt, error: aErr } = await supabase
      .from(T.coaching_attempts)
      .insert({
        session_id: input.session_id,
        attempt_number: nextAttemptNumber,
        input_mode: input.input_mode,
        audio_url: input.audio_url ?? null,
        audio_duration: input.audio_duration ?? null,
        raw_transcript: input.input_mode === "text" ? (input.text ?? null) : null,
        status: input.input_mode === "text" ? "evaluating" : "pending",
      })
      .select("id, attempt_number")
      .single();

    if (aErr || !attempt) throw new Error(aErr?.message ?? "시도 기록 실패");

    // fire-and-forget으로 coaching-evaluate EF 호출
    void triggerCoachingEvaluate(attempt.id);

    return {
      data: {
        attempt_id: attempt.id,
        attempt_number: attempt.attempt_number,
        is_processing: true,
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "답변 제출 실패" };
  }
}

// Fire-and-forget으로 EF 호출 (응답 안 기다림)
async function triggerCoachingEvaluate(attempt_id: string): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("[coaching] EF 호출 실패: env 누락");
    return;
  }
  try {
    await fetch(`${supabaseUrl}/functions/v1/coaching-evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ attempt_id }),
    }).catch((e) => {
      console.error("[coaching] coaching-evaluate fetch 실패:", e);
    });
  } catch (e) {
    console.error("[coaching] EF 트리거 예외:", e);
  }
}

// ============================================================
// 5. 세션 상세 (학습 룸용 — 같은 세션의 모든 회차 + 질문)
// ============================================================

export async function getSessionDetail(
  session_id: string
): Promise<ActionResult<SessionDetail>> {
  try {
    const { supabase, userId } = await requireUser();

    const { data: session, error: sErr } = await supabase
      .from(T.coaching_sessions)
      .select("*")
      .eq("id", session_id)
      .single();
    if (sErr || !session) throw new Error("세션을 찾을 수 없습니다");
    if (session.user_id !== userId) throw new Error("권한이 없습니다");

    const [{ data: question }, { data: attempts }] = await Promise.all([
      session.question_id
        ? supabase
            .from(T.questions)
            .select("id, question_korean, question_english, audio_url")
            .eq("id", session.question_id)
            .single()
        : Promise.resolve({ data: null }),
      supabase
        .from(T.coaching_attempts)
        .select(
          `id, attempt_number, status, input_mode,
           cleaned_transcript, stt_fix_log, coaching_json,
           word_count, filler_count, audio_duration, audio_url,
           evaluation, created_at, completed_at`
        )
        .eq("session_id", session_id)
        .order("attempt_number", { ascending: true }),
    ]);

    if (!question) throw new Error("질문을 찾을 수 없습니다");

    const attemptDisplays: AttemptDisplay[] = (attempts ?? []).map(
      (a: {
        id: string;
        attempt_number: number;
        status: CoachingAttempt["status"];
        input_mode: InputMode;
        cleaned_transcript: string | null;
        stt_fix_log: CoachingAttempt["stt_fix_log"];
        coaching_json: CoachingAttempt["coaching_json"];
        word_count: number | null;
        filler_count: number | null;
        audio_duration: number | null;
        audio_url: string | null;
        evaluation: CoachingAttempt["evaluation"];
        created_at: string;
        completed_at: string | null;
      }) => {
        const evaluation = a.evaluation;
        const skeletonScore = evaluation?.skeleton_완성도;
        const displaySummary: AttemptDisplay["display_summary"] | undefined = evaluation
          ? {
              skeleton_filled: skeletonScore
                ? `${[
                    skeletonScore.topic_sentence,
                    skeletonScore.transition,
                    skeletonScore.supporting_1,
                    skeletonScore.supporting_2,
                    skeletonScore.supporting_3,
                    skeletonScore.concluding,
                    skeletonScore.ending,
                  ].filter(Boolean).length}/7`
                : "—",
              filler_count: a.filler_count ?? 0,
              흠_count: evaluation.흠_총_개수 ?? 0,
              progress_from_prev: evaluation.전회차_대비_진척
                ? `개선점 ${evaluation.전회차_대비_진척.흠_count_delta >= 0 ? "+" : ""}${evaluation.전회차_대비_진척.흠_count_delta}`
                : undefined,
            }
          : undefined;

        return {
          id: a.id,
          attempt_number: a.attempt_number,
          status: a.status,
          input_mode: a.input_mode,
          cleaned_transcript: a.cleaned_transcript,
          stt_fix_log: a.stt_fix_log,
          coaching_json: a.coaching_json,
          word_count: a.word_count,
          audio_duration: a.audio_duration,
          audio_url: a.audio_url,
          display_summary: displaySummary,
          created_at: a.created_at,
          completed_at: a.completed_at,
        };
      }
    );

    return {
      data: {
        session: session as CoachingSession,
        question: {
          id: question.id,
          korean: question.question_korean ?? "",
          english: question.question_english ?? "",
          audio_url: (question as { audio_url?: string | null }).audio_url ?? null,
        },
        attempts: attemptDisplays,
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "세션 상세 조회 실패" };
  }
}

// ============================================================
// 6. 토픽 졸업 마킹 (학생 명시적 또는 시스템 자동)
// ============================================================

export async function markTopicMastered(
  session_id: string
): Promise<ActionResult<MarkMasteredResult>> {
  try {
    const { supabase, userId } = await requireUser();

    const { data: session, error: sErr } = await supabase
      .from(T.coaching_sessions)
      .select("id, user_id, status, question_type, topic, attempt_count, last_grade, last_issue_count")
      .eq("id", session_id)
      .single();
    if (sErr || !session) throw new Error("세션을 찾을 수 없습니다");
    if (session.user_id !== userId) throw new Error("권한이 없습니다");
    if (session.status === "mastered") throw new Error("이미 졸업한 세션이에요");
    // 평가가 완료된 답변이 한 번도 없으면 졸업 불가
    // (last_issue_count는 done 평가 후에만 채워짐)
    if (session.last_issue_count == null) {
      throw new Error("평가가 완료된 답변이 있어야 졸업할 수 있어요");
    }

    // 세션 mastered 표기
    await supabase
      .from(T.coaching_sessions)
      .update({
        status: "mastered",
        mastered_at: new Date().toISOString(),
      })
      .eq("id", session_id);

    // topic_mastery 등록 (UPSERT)
    const { error: tmErr } = await supabase
      .from(T.coaching_topic_mastery)
      .upsert(
        {
          user_id: userId,
          question_type: session.question_type,
          topic: session.topic,
          session_id: session.id,
          final_issue_count: session.last_issue_count,
          total_attempts: session.attempt_count,
          final_grade: session.last_grade,
        },
        { onConflict: "user_id,question_type,topic" }
      );
    if (tmErr) throw new Error(tmErr.message);

    // 유형 마스터 체크
    const { data: masteredTopics } = await supabase
      .from(T.coaching_topic_mastery)
      .select("topic, total_attempts")
      .eq("user_id", userId)
      .eq("question_type", session.question_type);

    const masteredCount = masteredTopics?.length ?? 0;
    const masteredTopicList = (masteredTopics ?? []).map((r: { topic: string }) => r.topic);
    // 유형 마스터의 total_attempts는 졸업한 토픽들의 시도 합계 (마지막 세션만 X)
    const cumulativeAttempts = (masteredTopics ?? []).reduce(
      (sum: number, r: { total_attempts: number | null }) => sum + (r.total_attempts ?? 0),
      0
    );

    let typeMastered = false;
    if (masteredCount >= TYPE_MASTERY_REQUIRED_TOPICS) {
      const { error: tymErr } = await supabase
        .from(T.coaching_type_mastery)
        .upsert(
          {
            user_id: userId,
            question_type: session.question_type,
            topics_mastered: masteredTopicList,
            total_attempts: cumulativeAttempts,
          },
          { onConflict: "user_id,question_type" }
        );
      if (!tymErr) typeMastered = true;
    }

    return {
      data: {
        topic_mastered: true,
        type_mastered: typeMastered,
        total_topics_mastered: masteredCount,
        required_for_type_mastery: TYPE_MASTERY_REQUIRED_TOPICS,
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "토픽 졸업 실패" };
  }
}

// ============================================================
// 7. 이어하기 — 진행 중(active) 세션 목록 (허브 복원 배너용)
// ============================================================

export async function getResumableSessions(): Promise<ActionResult<ResumableSession[]>> {
  try {
    const { supabase, userId } = await requireUser();

    // 답변을 1회 이상 한 active 세션만 (attempt_count > 0)
    const { data, error } = await supabase
      .from(T.coaching_sessions)
      .select("id, question_type, topic, attempt_count, last_attempt_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .gt("attempt_count", 0)
      .order("last_attempt_at", { ascending: false, nullsFirst: false });
    if (error) throw error;

    const sessions: ResumableSession[] = (data ?? []).map(
      (s: {
        id: string;
        question_type: string;
        topic: string;
        attempt_count: number;
        last_attempt_at: string | null;
      }) => ({
        session_id: s.id,
        question_type: s.question_type as QuestionType,
        topic: s.topic,
        attempt_count: s.attempt_count,
        last_attempt_at: s.last_attempt_at,
      })
    );

    return { data: sessions };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "진행 중 세션 조회 실패" };
  }
}
