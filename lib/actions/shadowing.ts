"use server";

// 쉐도잉(답변뱅크) — 서버 액션 (현재 questions DB 기준)
//   유형(question_type_eng) → 토픽 → 질문을 DB에서 로드하고, 모범답안을 id로 join.
//   질문 음성(audio_url)은 DB 값 그대로 사용. 모범답안은 정적 JSON.

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { T } from "@/lib/constants/tables";
import type { ActionResult, QuestionType } from "@/lib/types/coaching";
import {
  QUESTION_TYPE_LABELS,
  QUESTION_TYPE_DESCRIPTIONS,
  BODY_QUESTION_TYPES,
} from "@/lib/types/coaching";
import { TYPE_TO_ENGINE } from "@/lib/types/shadowing";
import type {
  RawBankEntry,
  ShadowQuestion,
  ShadowTypeCard,
  SlotSeg,
} from "@/lib/types/shadowing";
import bankData from "@/lib/data/answer-bank.json";
import gapData from "@/lib/data/answer-bank-gap.json";
import structureData from "@/lib/data/answer-structure.json";

const BANK = bankData as unknown as RawBankEntry[];
const GAP = gapData as unknown as RawBankEntry[];
const STRUCTURE = structureData as Record<string, SlotSeg[]>;

const normTxt = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
const structMatches = (a: RawBankEntry) => {
  const segs = STRUCTURE[a.id];
  return segs ? normTxt(segs.map((s) => s.text).join(" ")) === normTxt(a.answer) : false;
};

// id → 모범답안 / 도메인.
//   같은 id가 둘이면(중복 9건) 구조 분해와 일치하는(업그레이드된) 답변을 우선한다.
const ANSWER_BY_ID = new Map<string, string>();
const DOMAIN_BY_ID = new Map<string, string | null>();
const STRUCT_LOCKED = new Set<string>();
for (const a of [...BANK, ...GAP]) {
  const matched = structMatches(a);
  if (!ANSWER_BY_ID.has(a.id)) {
    ANSWER_BY_ID.set(a.id, a.answer);
    DOMAIN_BY_ID.set(a.id, a.domain ?? null);
    if (matched) STRUCT_LOCKED.add(a.id);
  } else if (matched && !STRUCT_LOCKED.has(a.id)) {
    ANSWER_BY_ID.set(a.id, a.answer);
    DOMAIN_BY_ID.set(a.id, a.domain ?? null);
    STRUCT_LOCKED.add(a.id);
  }
}

// 서빙 답변과 분해가 일치할 때만 구조 제공 (안전 가드)
function structOf(id: string): SlotSeg[] | null {
  const segs = STRUCTURE[id];
  if (!segs) return null;
  const ans = ANSWER_BY_ID.get(id);
  return ans && normTxt(segs.map((s) => s.text).join(" ")) === normTxt(ans) ? segs : null;
}

// 유형 노출 순서 — 앞쪽(묘사~경험)은 유형별 탭과 동일, 뒤를 롤플레이→어드밴스→기타로
const SHADOW_TYPE_ORDER: QuestionType[] = [
  "description", // 묘사
  "routine", // 루틴
  "comparison", // 비교
  "past_childhood", // 경험_어릴적/처음
  "past_recent", // 경험_최근
  "past_special", // 경험_특별한
  "rp_11", // 질문하기
  "rp_12", // 대안제시
  "adv_14", // 비교/변화
  "adv_15", // 사회적이슈
];

// ── 1. 유형 카드 (본문 10유형 + 기타) ──
export async function getShadowingTypeCards(): Promise<ActionResult<ShadowTypeCard[]>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from(T.questions).select("id, question_type_eng");
    if (error) throw error;
    const rows = (data ?? []) as { id: string; question_type_eng: string | null }[];

    const dbIds = new Set(rows.map((r) => r.id));

    const byType = new Map<string, { total: number; answered: number }>();
    for (const r of rows) {
      const t = r.question_type_eng;
      if (!t || !BODY_QUESTION_TYPES.includes(t as QuestionType)) continue;
      const agg = byType.get(t) ?? { total: 0, answered: 0 };
      agg.total += 1;
      if (ANSWER_BY_ID.has(r.id)) agg.answered += 1;
      byType.set(t, agg);
    }

    const cards: ShadowTypeCard[] = SHADOW_TYPE_ORDER.filter((t) => byType.has(t)).map((t) => {
      const agg = byType.get(t)!;
      return {
        type: t,
        label: QUESTION_TYPE_LABELS[t],
        desc: QUESTION_TYPE_DESCRIPTIONS[t],
        total: agg.total,
        answered: agg.answered,
      };
    });

    // 기타 — DB에 없는 뱅크 답변 (보존용)
    const orphanCount = new Set(BANK.filter((a) => !dbIds.has(a.id)).map((a) => a.id)).size;
    if (orphanCount > 0) {
      cards.push({
        type: "etc",
        label: "기타",
        desc: "현재 DB에 없는 추가 모범답안 (보존용)",
        total: orphanCount,
        answered: orphanCount,
      });
    }

    return { data: cards };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "유형 조회 실패" };
  }
}

// ── 2. 유형 질문 (전체, 모범답안 join) — topic 옵션 ──
//   유형 → 질문 직행 (토픽 단계 없음). topic 주면 해당 토픽만 필터.
export async function getShadowingQuestions(
  type: QuestionType,
  topic?: string | null
): Promise<ActionResult<ShadowQuestion[]>> {
  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from(T.questions)
      .select("id, topic, question_english, question_korean, audio_url")
      .eq("question_type_eng", type);
    if (topic) query = query.eq("topic", topic);
    const { data, error } = await query.order("id");
    if (error) throw error;
    const rows = (data ?? []) as {
      id: string;
      topic: string | null;
      question_english: string | null;
      question_korean: string | null;
      audio_url: string | null;
    }[];

    const items: ShadowQuestion[] = rows.map((q) => ({
      id: q.id,
      topic: q.topic ?? topic ?? "기타",
      domain: DOMAIN_BY_ID.get(q.id) ?? null,
      engineKey:
        type === "description"
          ? (DOMAIN_BY_ID.get(q.id) ?? null)
          : (TYPE_TO_ENGINE[type] ?? type),
      question_english: q.question_english ?? "",
      question_korean: q.question_korean,
      audio_url: q.audio_url,
      answer: ANSWER_BY_ID.get(q.id) ?? null,
      structure: structOf(q.id),
    }));

    return { data: items };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "질문 조회 실패" };
  }
}

// ── 4. 기타 — DB에 없는 뱅크 답변 ──
export async function getShadowingOrphans(): Promise<ActionResult<ShadowQuestion[]>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from(T.questions).select("id");
    if (error) throw error;
    const dbIds = new Set(((data ?? []) as { id: string }[]).map((r) => r.id));

    const seen = new Set<string>();
    const items: ShadowQuestion[] = [];
    for (const a of BANK) {
      if (dbIds.has(a.id) || seen.has(a.id)) continue;
      seen.add(a.id);
      items.push({
        id: a.id,
        topic: a.topic,
        domain: a.domain ?? null,
        engineKey: a.domain ?? null,
        question_english: a.question,
        question_korean: null,
        audio_url: null,
        answer: a.answer,
        structure: structOf(a.id),
      });
    }
    items.sort((a, b) => a.topic.localeCompare(b.topic, "ko"));

    return { data: items };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "기타 조회 실패" };
  }
}
