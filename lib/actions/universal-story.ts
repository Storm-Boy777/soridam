"use server";

// 만능 스토리 — 서버 액션 (정적 JSON 반환)
//   시제 만능 아크와 동일하게 인증/DB 무관한 학습 레퍼런스라 lib/data 정적 JSON을 그대로 반환.
//   클라이언트는 useQuery(staleTime Infinity)로 1회 로드 후 카드/뷰어를 derive.

import type { ActionResult } from "@/lib/types/coaching";
import type { UniversalStory } from "@/lib/types/universal-story";
import { STORY_ORDER } from "@/lib/types/universal-story";
import data from "@/lib/data/universal-stories.json";

const ALL = data as unknown as UniversalStory[];

const orderOf = (id: string) => {
  const i = STORY_ORDER.indexOf(id);
  return i < 0 ? 999 : i;
};

const SORTED = [...ALL].sort(
  (a, b) => orderOf(a.id) - orderOf(b.id) || a.id.localeCompare(b.id)
);

export async function getUniversalStories(): Promise<ActionResult<UniversalStory[]>> {
  try {
    return { data: SORTED };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "만능 스토리 조회 실패" };
  }
}
