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
