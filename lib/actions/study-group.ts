"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { T } from "@/lib/constants/tables";
import type { PodcastRow, FreetalkRow, GameCardRow, GameCardGameType, PanelMember, YoutubeChannelRow, TalklishGameSet } from "@/lib/types/study-group";

// ─── Talklish 수요일(OPIc) 콤보 조회 헬퍼 ─────────────────────────
// /opic-study/explore와 동일 데이터 소스 — submission_questions 기반
// 실제 출제된 콤보 + 출제 빈도. 차이: group context 없음 (학습 이력 X).

/** 정렬된 시그니처 (그루핑용 — 순서 무관) */
function buildComboSignature(questionIds: string[]): string {
  return [...questionIds].sort().join("|");
}

type TalklishCategory = "일반" | "롤플레이" | "어드밴스";

/** 한글 카테고리 → combo_type 매핑 (시험후기 빈도 분석과 동일) */
const TALKLISH_COMBO_TYPES: Record<TalklishCategory, string[]> = {
  "일반": ["general_1", "general_2", "general_3"],
  "롤플레이": ["roleplay"],
  "어드밴스": ["advance"],
};

export interface TalklishComboQuestion {
  id: string;
  question_type: string;
  question_type_kor: string | null;
  question_english: string;
  question_korean: string | null;
  question_short: string | null;
  audio_url: string | null;
  appearance_pct: number;          // 토픽 내 이 질문 등장률
}

export interface TalklishCombo {
  sig: string;
  representative_qids: string[];
  frequency: number;               // 같은 콤보 출제 시험 수 (카테고리 한정)
  total_in_category: number;       // 카테고리 한정 분모
  appearance_pct: number;          // frequency / total_in_category
  questions: TalklishComboQuestion[];
  example_exam_date: string | null;
  example_achieved_level: string | null;
}

/** 카테고리·토픽으로 실제 출제 콤보 조회 (submission_combos SSOT)
 *
 * 핵심: submission_combos는 콤보 단위로 한 행씩 저장되어 있음.
 * 한 콤보 = 한 행 = question_ids 배열 (일반·롤플 3문항, 어드 2문항).
 *
 * 1. submission_combos에서 (topic + combo_type) 필터로 콤보 행 직접 조회
 * 2. 같은 question_ids 시그니처(정렬+조인)로 그루핑 → 빈도 계산
 * 3. 콤보 내 질문 메타는 questions IN 단발 조회로 매핑
 */
export async function fetchTalklishCombos(input: {
  category: TalklishCategory;
  topic: string;
}): Promise<TalklishCombo[]> {
  const supabase = await createServerSupabaseClient();
  const comboTypeFilter = TALKLISH_COMBO_TYPES[input.category];

  type ComboRow = {
    submission_id: number;
    combo_type: string;
    question_ids: string[];
    submissions: {
      status: string;
      exam_approved: string;
      exam_date: string;
      achieved_level: string | null;
    };
  };

  // 1. 콤보 행 직접 조회 (승인된 시험만)
  const { data: rawData, error } = await supabase
    .from(T.submission_combos)
    .select(
      "submission_id, combo_type, question_ids, " +
        "submissions!inner(status, exam_approved, exam_date, achieved_level)"
    )
    .eq("topic", input.topic)
    .in("combo_type", comboTypeFilter)
    .eq("submissions.status", "complete")
    .eq("submissions.exam_approved", "approved");

  if (error || !rawData) return [];
  const comboRows = rawData as unknown as ComboRow[];
  const totalCombos = comboRows.length;
  if (totalCombos === 0) return [];

  // 2. 시그니처로 그루핑 → 빈도
  type Group = {
    sig: string;
    representativeQids: string[];        // 출제 순서 유지
    frequency: number;
    exampleExamDate: string;
    exampleAchievedLevel: string | null;
  };
  const bySig = new Map<string, Group>();

  for (const r of comboRows) {
    const sig = buildComboSignature(r.question_ids);
    const existing = bySig.get(sig);
    if (existing) {
      existing.frequency += 1;
    } else {
      bySig.set(sig, {
        sig,
        representativeQids: r.question_ids,
        frequency: 1,
        exampleExamDate: r.submissions.exam_date,
        exampleAchievedLevel: r.submissions.achieved_level,
      });
    }
  }

  // 3. 토픽 전체 질문별 등장률 계산
  const qidAppearance: Record<string, number> = {};
  for (const r of comboRows) {
    for (const qid of r.question_ids) {
      qidAppearance[qid] = (qidAppearance[qid] || 0) + 1;
    }
  }

  // 4. 모든 question_id 수집 → questions 메타 단발 조회
  const allQids = Array.from(
    new Set(Array.from(bySig.values()).flatMap((g) => g.representativeQids))
  );

  type QRow = {
    id: string;
    question_english: string;
    question_korean: string | null;
    question_short: string | null;
    question_type_eng: string;
    question_type_kor: string | null;
    audio_url: string | null;
  };

  const { data: qData } = await supabase
    .from(T.questions)
    .select("id, question_english, question_korean, question_short, question_type_eng, question_type_kor, audio_url")
    .in("id", allQids);

  const qMap = new Map<string, QRow>();
  for (const q of (qData ?? []) as QRow[]) {
    qMap.set(q.id, q);
  }

  // 5. 결과 조립 — 빈도 내림차순
  const combos: TalklishCombo[] = Array.from(bySig.values())
    .map((g) => {
      const appearancePct = totalCombos > 0 ? Math.round((g.frequency / totalCombos) * 100) : 0;
      const questions: TalklishComboQuestion[] = g.representativeQids
        .map((qid) => {
          const q = qMap.get(qid);
          if (!q) return null;
          return {
            id: q.id,
            question_type: q.question_type_eng,
            question_type_kor: q.question_type_kor,
            question_english: q.question_english,
            question_korean: q.question_korean,
            question_short: q.question_short,
            audio_url: q.audio_url,
            appearance_pct:
              totalCombos > 0
                ? Math.round(((qidAppearance[q.id] || 0) / totalCombos) * 100)
                : 0,
          };
        })
        .filter((q): q is TalklishComboQuestion => q !== null);

      return {
        sig: g.sig,
        representative_qids: g.representativeQids,
        frequency: g.frequency,
        total_in_category: totalCombos,
        appearance_pct: appearancePct,
        questions,
        example_exam_date: g.exampleExamDate,
        example_achieved_level: g.exampleAchievedLevel,
      };
    })
    .sort((a, b) => b.frequency - a.frequency);

  return combos;
}

// ─── Talklish 완료 콤보 학습 이력 (089 마이그레이션) ──────────────
// 스터디 모임 단위 전역 1세트 — 누가 진행자든 같은 완료 목록을 본다.

/** 전역 완료 콤보 시그니처 Set (수요일 OpicStage 뱃지용) */
export async function fetchTalklishCompletedSigs(): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from(T.talklish_completed_combos)
    .select("combo_sig");
  return (data ?? []).map((r) => r.combo_sig as string);
}

/** 콤보 완료 표시 — ClosingPhase "세션 완료" 클릭 시 호출.
 *  같은 시그니처가 있으면 completed_at + completed_by 갱신 (upsert). */
export async function markTalklishComboCompleted(input: {
  combo_sig: string;
  category: string;
  topic: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from(T.talklish_completed_combos)
    .upsert(
      {
        combo_sig: input.combo_sig,
        category: input.category,
        topic: input.topic,
        completed_by: user.id,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "combo_sig" }
    );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** 완료 표시 취소 — Closing "완료 취소" 클릭 시 (전역 row 삭제) */
export async function unmarkTalklishComboCompleted(
  combo_sig: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from(T.talklish_completed_combos)
    .delete()
    .eq("combo_sig", combo_sig);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Talklish 완료 팟캐스트 학습 이력 (095 마이그레이션) ──────────
// 089(콤보)와 동일 모델 — 스터디 모임 단위 전역 1세트.

/** 전역 완료 팟캐스트 — podcast_id → completed_at 매핑 (월요일 자료 정렬/뱃지용) */
export async function fetchTalklishCompletedPodcasts(): Promise<Record<string, string>> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from(T.talklish_completed_podcasts)
    .select("podcast_id, completed_at");
  const map: Record<string, string> = {};
  for (const r of data ?? []) {
    map[r.podcast_id as string] = r.completed_at as string;
  }
  return map;
}

/** 자료 완료 표시 — 월요일 ClosingSlide "세션 완료" 클릭 시.
 *  같은 podcast_id 가 있으면 completed_at 갱신 (upsert). */
export async function markTalklishPodcastCompleted(
  podcast_id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from(T.talklish_completed_podcasts)
    .upsert(
      {
        podcast_id,
        completed_by: user.id,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "podcast_id" }
    );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** 자료 완료 취소 — Closing "완료 취소" 클릭 시 (전역 row 삭제) */
export async function unmarkTalklishPodcastCompleted(
  podcast_id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from(T.talklish_completed_podcasts)
    .delete()
    .eq("podcast_id", podcast_id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────

// 월요일 자료 준비용 유튜버 채널 바로가기 (활성만, sort_order 순) — manage 페이지용
export async function fetchTalklishYoutubeChannels(): Promise<YoutubeChannelRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from(T.talklish_youtube_channels)
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) return [];
  return data as YoutubeChannelRow[];
}

// 팟캐스트 목록 (활성만, sort_order 순)
export async function fetchPodcasts(): Promise<PodcastRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from(T.study_podcasts)
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) return [];
  return data as PodcastRow[];
}

// 프리토킹 주제 (활성만, 카테고리 필터 선택적)
export async function fetchFreetalkTopics(category?: string): Promise<FreetalkRow[]> {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from(T.study_freetalk)
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (category) {
    query = query.eq("category", category);
  }
  const { data, error } = await query;
  if (error) return [];
  return data as FreetalkRow[];
}

// 게임 카드 (활성만, game_type 필터)
export async function fetchGameCards(gameType: GameCardGameType): Promise<GameCardRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from(T.study_game_cards)
    .select("*")
    .eq("is_active", true)
    .eq("game_type", gameType)
    .order("sort_order");
  if (error) return [];
  return data as GameCardRow[];
}

// 패널 멤버 (활성만, sort_order 순) — Talklish 화면 표시용
export async function fetchPanelMembers(): Promise<PanelMember[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from(T.study_panel_members)
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) return [];
  return data as PanelMember[];
}

// ─── 멤버 자료 생성 (관리자 결석 대비 — /talklish/manage에서 멤버가 직접) ───
// 권한: 관리자 OR 활성 패널 멤버. RLS(092)가 멤버 INSERT/UPDATE를 허용.

/** 활성 패널 멤버 또는 관리자인지 확인 (멤버 자료 생성 게이트) */
async function assertPanelMemberOrAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };
  if (user.app_metadata?.role === "admin") return { ok: true, userId: user.id };
  const { data: member } = await supabase
    .from(T.study_panel_members)
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!member) return { ok: false, error: "스터디 패널 멤버만 자료를 만들 수 있습니다" };
  return { ok: true, userId: user.id };
}

/** 멤버가 만든 팟캐스트 자료 저장 */
export async function createTalklishPodcast(
  input: Omit<PodcastRow, "id" | "created_by" | "created_at" | "updated_at">
): Promise<{ success: boolean; error?: string; data?: PodcastRow }> {
  const gate = await assertPanelMemberOrAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from(T.study_podcasts)
    .insert({ ...input, created_by: gate.userId })
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as PodcastRow };
}

/** 기존 팟캐스트 자료 수정 (멤버 권한, 092 member_update RLS) */
export async function updateTalklishPodcast(
  id: string,
  input: Omit<PodcastRow, "id" | "created_by" | "created_at" | "updated_at">
): Promise<{ success: boolean; error?: string }> {
  const gate = await assertPanelMemberOrAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from(T.study_podcasts)
    .update(input)
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** 멤버 자료 수정용 — 활성/비활성 모두 조회 (sort_order 순) */
export async function fetchTalklishPodcastsForEdit(): Promise<PodcastRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from(T.study_podcasts)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return data as PodcastRow[];
}

// ─── 금요일 AI 게임 세트 (099_study_freetalk_sets) ───────────────
// 세션 단위 세트 — 월요일 study_podcasts와 동일 모델 (한 행 = 한 세트).

/** 활성 게임 세트 목록 (라이브 화면 세트 선택자용, sort_order 순) */
export async function fetchTalklishGameSets(): Promise<TalklishGameSet[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from(T.study_freetalk_sets)
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) return [];
  return data as TalklishGameSet[];
}

/** 수정용 — 활성/비활성 모두 (created_at 내림차순) */
export async function fetchTalklishGameSetsForEdit(): Promise<TalklishGameSet[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from(T.study_freetalk_sets)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return data as TalklishGameSet[];
}

/** 게임 세트 저장 (멤버/관리자) */
export async function createTalklishGameSet(
  input: Omit<TalklishGameSet, "id" | "created_by" | "created_at" | "updated_at">
): Promise<{ success: boolean; error?: string; data?: TalklishGameSet }> {
  const gate = await assertPanelMemberOrAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from(T.study_freetalk_sets)
    .insert({ ...input, created_by: gate.userId })
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as TalklishGameSet };
}

/** 게임 세트 수정 (멤버/관리자) */
export async function updateTalklishGameSet(
  id: string,
  input: Omit<TalklishGameSet, "id" | "created_by" | "created_at" | "updated_at">
): Promise<{ success: boolean; error?: string }> {
  const gate = await assertPanelMemberOrAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from(T.study_freetalk_sets)
    .update(input)
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/* ═══════════════════════════════════════════════
   098: 수요일 OPIc — 세션 · 답변 · 가이드 캐시
   ═══════════════════════════════════════════════ */

/** 하루 1세션 */
export interface TalklishSession {
  id: string;
  session_date: string; // YYYY-MM-DD (KST)
  started_at: string;
  ended_at: string | null;
  created_by: string | null;
  created_at: string;
}

/** talklish-coach EF 코칭 결과 (opic-stage CoachingResult와 동일 구조) */
export interface TalklishCoaching {
  summary: string;
  good_points: { quote: string; note: string }[];
  improve_points: { quote: string; issue: string; suggestion: string }[];
  upgrade_points: { tip: string; example?: string }[];
  next_speaker_tip: string;
}

/** 발표자 답변 + 코칭 (talklish_answers 행) */
export interface TalklishAnswer {
  id: number;
  session_id: string;
  panel_member_id: string;
  user_id: string | null;
  combo_sig: string;
  category: string | null;
  topic: string | null;
  question_id: string;
  question_idx: number | null;
  question_type: string | null;
  question_english: string | null;
  question_korean: string | null;
  audio_url: string | null;
  transcript: string | null;
  coaching: TalklishCoaching | null;
  created_at: string;
}

/** 세션 요약 (히스토리 목록용) */
export interface TalklishSessionSummary extends TalklishSession {
  answer_count: number;
  combo_count: number;
  topics: string[];
}

/** 콤보 가이드 (talklish-guide EF 출력) */
export interface TalklishGuideQuestion {
  question_idx: number;
  type_label: string;
  answer_flow: string[];
  vocab: { en: string; ko: string }[];
  example: string;
}
export interface TalklishComboGuide {
  intro: string;
  questions: TalklishGuideQuestion[];
}

/** KST 기준 오늘 날짜 (YYYY-MM-DD) */
function todayKstDate(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/** 오늘 세션 get-or-create (하루 1세션, session_date UNIQUE) */
export async function getOrCreateTodaySession(): Promise<{
  success: boolean;
  error?: string;
  data?: TalklishSession;
}> {
  const gate = await assertPanelMemberOrAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const supabase = await createServerSupabaseClient();
  const dateStr = todayKstDate();

  const { data: existing } = await supabase
    .from(T.talklish_sessions)
    .select("*")
    .eq("session_date", dateStr)
    .maybeSingle();
  if (existing) return { success: true, data: existing as TalklishSession };

  const { data, error } = await supabase
    .from(T.talklish_sessions)
    .insert({ session_date: dateStr, created_by: gate.userId })
    .select()
    .single();
  if (error) {
    // 동시 생성 레이스 → 재조회
    const { data: retry } = await supabase
      .from(T.talklish_sessions)
      .select("*")
      .eq("session_date", dateStr)
      .maybeSingle();
    if (retry) return { success: true, data: retry as TalklishSession };
    return { success: false, error: error.message };
  }
  return { success: true, data: data as TalklishSession };
}

/** 발표자 답변 + 코칭 저장 */
export async function saveTalklishAnswer(input: {
  session_id: string;
  panel_member_id: string;
  user_id?: string | null;
  combo_sig: string;
  category?: string | null;
  topic?: string | null;
  question_id: string;
  question_idx?: number | null;
  question_type?: string | null;
  question_english?: string | null;
  question_korean?: string | null;
  audio_url?: string | null;
  transcript?: string | null;
  coaching?: TalklishCoaching | null;
}): Promise<{ success: boolean; error?: string; data?: TalklishAnswer }> {
  const gate = await assertPanelMemberOrAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from(T.talklish_answers)
    .insert({
      session_id: input.session_id,
      panel_member_id: input.panel_member_id,
      user_id: input.user_id ?? null,
      combo_sig: input.combo_sig,
      category: input.category ?? null,
      topic: input.topic ?? null,
      question_id: input.question_id,
      question_idx: input.question_idx ?? null,
      question_type: input.question_type ?? null,
      question_english: input.question_english ?? null,
      question_korean: input.question_korean ?? null,
      audio_url: input.audio_url ?? null,
      transcript: input.transcript ?? null,
      coaching: input.coaching ?? null,
    })
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as TalklishAnswer };
}

/** 세션 답변 전체 (정리/히스토리 상세 — 멤버별 탭 구성) */
export async function getTalklishSessionAnswers(
  sessionId: string
): Promise<TalklishAnswer[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from(T.talklish_answers)
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as TalklishAnswer[];
}

/** 오늘 세션 조회 (없으면 null — 생성하지 않음) */
export async function getTodayTalklishSession(): Promise<TalklishSession | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from(T.talklish_sessions)
    .select("*")
    .eq("session_date", todayKstDate())
    .maybeSingle();
  return (data as TalklishSession) ?? null;
}

/** 히스토리 — 세션 목록 + 요약 (날짜 내림차순) */
export async function listTalklishSessions(): Promise<TalklishSessionSummary[]> {
  const supabase = await createServerSupabaseClient();
  const { data: sessions } = await supabase
    .from(T.talklish_sessions)
    .select("*")
    .order("session_date", { ascending: false });
  if (!sessions || sessions.length === 0) return [];

  const { data: answers } = await supabase
    .from(T.talklish_answers)
    .select("session_id, combo_sig, topic");

  const agg = new Map<string, { combos: Set<string>; topics: Set<string>; count: number }>();
  for (const a of (answers ?? []) as {
    session_id: string;
    combo_sig: string;
    topic: string | null;
  }[]) {
    const e =
      agg.get(a.session_id) ?? { combos: new Set<string>(), topics: new Set<string>(), count: 0 };
    e.combos.add(a.combo_sig);
    if (a.topic) e.topics.add(a.topic);
    e.count += 1;
    agg.set(a.session_id, e);
  }

  return (sessions as TalklishSession[]).map((s) => {
    const e = agg.get(s.id);
    return {
      ...s,
      answer_count: e?.count ?? 0,
      combo_count: e?.combos.size ?? 0,
      topics: e ? Array.from(e.topics) : [],
    };
  });
}

/** 세션 종료 표시 (ended_at 기록) */
export async function endTalklishSession(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  const gate = await assertPanelMemberOrAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from(T.talklish_sessions)
    .update({ ended_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** 콤보 가이드 — 캐시 조회만 */
export async function getTalklishComboGuide(
  sig: string
): Promise<TalklishComboGuide | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from(T.talklish_combo_guide_cache)
    .select("guide")
    .eq("sig", sig)
    .maybeSingle();
  return (data?.guide as TalklishComboGuide) ?? null;
}

/** 콤보 가이드 — 캐시 우선, 없으면 talklish-guide EF로 생성 후 캐시 */
export async function getOrGenerateTalklishGuide(input: {
  sig: string;
  question_ids: string[];
  topic: string;
  category: string;
}): Promise<{ success: boolean; error?: string; data?: TalklishComboGuide }> {
  const gate = await assertPanelMemberOrAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  // 1. 캐시 우선
  const cached = await getTalklishComboGuide(input.sig);
  if (cached) return { success: true, data: cached };

  // 2. 미스 → talklish-guide EF 생성 (EF가 캐시 UPSERT)
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.functions.invoke("talklish-guide", {
    body: {
      sig: input.sig,
      question_ids: input.question_ids,
      topic: input.topic,
      category: input.category,
      triggered_by: gate.userId,
    },
  });
  if (error) return { success: false, error: error.message };
  if (!data?.ok || !data?.data) {
    return { success: false, error: data?.error || "가이드 생성에 실패했습니다" };
  }
  return { success: true, data: data.data as TalklishComboGuide };
}
