"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { T } from "@/lib/constants/tables";
import type { PodcastRow, FreetalkRow, GameCardRow, GameCardGameType, PanelMember } from "@/lib/types/study-group";

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

/** 카테고리·토픽으로 실제 출제 콤보 조회 (시험후기 SSOT) */
export async function fetchTalklishCombos(input: {
  category: TalklishCategory;
  topic: string;
}): Promise<TalklishCombo[]> {
  const supabase = await createServerSupabaseClient();
  const comboTypeFilter = TALKLISH_COMBO_TYPES[input.category];

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
    .in("combo_type", comboTypeFilter)
    .eq("submissions.status", "complete")
    .eq("submissions.exam_approved", "approved");

  if (error || !rawData) return [];
  const filtered = rawData as unknown as RawRow[];

  // submission_id로 그루핑 → 콤보 단위
  type RawCombo = {
    submission_id: number;
    qids: string[];
    questions: TalklishComboQuestion[];
    exam_date: string;
    achieved_level: string | null;
  };

  const bySubmission = new Map<number, RawCombo>();
  for (const r of filtered.sort((a, b) => a.question_number - b.question_number)) {
    const sid = r.submission_id;
    const existing = bySubmission.get(sid);
    const item: TalklishComboQuestion = {
      id: r.question_id,
      question_type: r.questions.question_type_eng,
      question_type_kor: r.questions.question_type_kor,
      question_english: r.questions.question_english,
      question_korean: r.questions.question_korean,
      question_short: r.questions.question_short,
      audio_url: r.questions.audio_url,
      appearance_pct: 0,
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
  if (totalCombos === 0) return [];

  // 시그니처로 그루핑 → 빈도
  const bySig = new Map<string, RawCombo[]>();
  for (const rc of rawCombos) {
    const sig = buildComboSignature(rc.qids);
    const list = bySig.get(sig) ?? [];
    list.push(rc);
    bySig.set(sig, list);
  }

  // 토픽 전체 질문별 등장률
  const qidAppearance: Record<string, number> = {};
  for (const rc of rawCombos) {
    for (const qid of rc.qids) {
      qidAppearance[qid] = (qidAppearance[qid] || 0) + 1;
    }
  }

  // 결과 조립 — 빈도 내림차순 정렬
  const combos: TalklishCombo[] = Array.from(bySig.entries())
    .map(([sig, group]) => {
      const representative = group[0];
      const frequency = group.length;
      const appearancePct = totalCombos > 0 ? Math.round((frequency / totalCombos) * 100) : 0;
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
              ? Math.round(((qidAppearance[q.id] || 0) / totalCombos) * 100)
              : 0,
        })),
        example_exam_date: representative.exam_date,
        example_achieved_level: representative.achieved_level,
      };
    })
    .sort((a, b) => b.frequency - a.frequency);

  return combos;
}

// ─────────────────────────────────────────────────────────────────

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
