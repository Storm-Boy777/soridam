"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { T } from "@/lib/constants/tables";
import { FREQUENCY_COMBO_MAP, QUESTION_TYPE_ORDER } from "@/lib/types/reviews";

// 카테고리 → combo_type 매핑
const CATEGORY_COMBO_TYPES: Record<string, string[]> = {
  "일반": FREQUENCY_COMBO_MAP["일반"],
  "롤플레이": FREQUENCY_COMBO_MAP["롤플레이"],
  "어드밴스": FREQUENCY_COMBO_MAP["어드밴스"],
};

// 전체 주제 목록 (스크립트 생성 위저드용)
export async function getTopics() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from(T.questions)
    .select("topic, category")
    .neq("topic", "자기소개");

  if (error) return [];

  // 유니크 (topic, category) 쌍
  const seen = new Set<string>();
  const topics: { topic: string; category: string }[] = [];
  for (const row of data) {
    const key = `${row.category}::${row.topic}`;
    if (!seen.has(key)) {
      seen.add(key);
      topics.push(row);
    }
  }
  return topics.sort((a, b) => a.topic.localeCompare(b.topic, "ko"));
}

// 카테고리별 질문 목록 (스크립트 생성 위저드용 — category 기준)
export async function getQuestionsByCategory(category: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from(T.questions)
    .select("id, question_short, question_english, question_korean, question_type_eng, topic, category")
    .eq("category", category)
    .neq("topic", "자기소개")
    .order("topic")
    .order("id");

  if (error) return [];
  return data;
}

// 카테고리별 주제 목록 (Step 2 TopicPagination용) — 카테고리별 빈도순 정렬
export async function getTopicsByCategory(category: "일반" | "롤플레이" | "어드밴스") {
  const supabase = await createServerSupabaseClient();
  const comboTypes = CATEGORY_COMBO_TYPES[category];

  // 주제 목록 + 해당 카테고리 빈도 데이터 병렬 조회
  const [topicResult, freqResult] = await Promise.all([
    supabase
      .from(T.questions)
      .select("topic")
      .eq("category", category)
      .neq("topic", "자기소개"),
    supabase
      .from(T.submission_combos)
      .select("topic, combo_type")
      .in("combo_type", comboTypes),
  ]);

  if (topicResult.error) return [];

  // 유니크 주제 + 각 주제별 질문 수
  const topicCounts = new Map<string, number>();
  for (const row of topicResult.data) {
    topicCounts.set(row.topic, (topicCounts.get(row.topic) || 0) + 1);
  }

  // 주제별 출제 빈도 (해당 카테고리만)
  const freqCounts = new Map<string, number>();
  for (const row of freqResult.data || []) {
    freqCounts.set(row.topic, (freqCounts.get(row.topic) || 0) + 1);
  }

  return Array.from(topicCounts.entries())
    .map(([topic, count]) => ({ topic, count, frequency: freqCounts.get(topic) || 0 }))
    .sort((a, b) => b.frequency - a.frequency || a.topic.localeCompare(b.topic, "ko"));
}

// 주제별 질문 목록 (Step 2 QuestionSelector용)
export async function getQuestionsByTopic(
  topic: string,
  category: "일반" | "롤플레이" | "어드밴스"
) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from(T.questions)
    .select("id, question_short, question_english, question_korean, question_type_eng, topic, audio_url")
    .eq("category", category)
    .eq("topic", topic)
    .order("id");

  if (error) return [];

  // question_type_eng 순 → 같은 타입이면 가나다순
  return data.sort((a, b) => {
    const orderA = QUESTION_TYPE_ORDER[a.question_type_eng || ""] ?? 99;
    const orderB = QUESTION_TYPE_ORDER[b.question_type_eng || ""] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return (a.question_korean || "").localeCompare(b.question_korean || "", "ko");
  });
}
