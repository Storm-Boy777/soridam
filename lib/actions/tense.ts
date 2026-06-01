"use server";

// 시제 만능 아크 — 서버 액션 (정적 JSON 반환)
//   내러티브는 인증/DB 무관한 학습 레퍼런스라 lib/data 정적 JSON을 서버에서 그대로 반환.
//   클라이언트는 useQuery(staleTime Infinity)로 1회 로드 후 카드/뷰어를 derive.

import type { ActionResult } from "@/lib/types/coaching";
import type { TenseNarrative } from "@/lib/types/tense";
import { TENSE_DOMAIN_ORDER } from "@/lib/types/tense";
import data from "@/lib/data/tense-narratives.json";

const ALL = data as unknown as TenseNarrative[];

const orderOf = (id: string) => {
  const i = TENSE_DOMAIN_ORDER.indexOf(id);
  return i < 0 ? 999 : i;
};

const SORTED = [...ALL].sort((a, b) => orderOf(a.id) - orderOf(b.id) || a.id.localeCompare(b.id));

export async function getTenseNarratives(): Promise<ActionResult<TenseNarrative[]>> {
  try {
    return { data: SORTED };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "시제 아크 조회 실패" };
  }
}
