// Question Selection Engine (QSE)
// DB 질의 기반 질문 선택 — LLM이 아닌 규칙 엔진
// 설계서: docs/설계/튜터링.md — "Question Selection Engine의 역할"

import { SupabaseClient } from "@supabase/supabase-js";
import type { SelectionPolicy, QuestionCandidate, QuestionPool } from "@/lib/types/tutoring";

/**
 * QSE: Prompt D의 selection_policy를 받아 실제 question bank에서 후보를 검색
 * - Q1: 같은 type + 같은 topic (익숙한 환경에서 구조 학습)
 * - Q2: 같은 type + 같은/인접 topic (적용 확인)
 * - Q3: 같은 type + 다른 topic (transfer 확인)
 */
export async function selectQuestions(
  supabase: SupabaseClient,
  policy: SelectionPolicy
): Promise<QuestionPool> {
  const { question_type, primary_topic, topic_mode, exclude_recent_question_ids, candidate_limit } = policy;
  const excludeIds = exclude_recent_question_ids ?? [];
  const limit = candidate_limit ?? 12;

  // Q1: 같은 type + 같은 topic
  const q1 = await queryQuestions(supabase, {
    questionType: question_type,
    topic: primary_topic,
    excludeIds,
    limit: Math.min(limit, 5),
  });

  // Q2: 같은 type + 같은 topic (Q1과 다른 질문) 또는 인접 topic
  const q1Ids = q1.map((q) => q.question_id);
  const q2ExcludeIds = [...excludeIds, ...q1Ids];

  let q2: QuestionCandidate[];
  if (topic_mode === "same_only") {
    // 같은 topic에서만
    q2 = await queryQuestions(supabase, {
      questionType: question_type,
      topic: primary_topic,
      excludeIds: q2ExcludeIds,
      limit: Math.min(limit, 5),
    });
  } else {
    // 같은 topic 먼저, 부족하면 다른 topic
    q2 = await queryQuestions(supabase, {
      questionType: question_type,
      topic: primary_topic,
      excludeIds: q2ExcludeIds,
      limit: Math.min(limit, 3),
    });
    if (q2.length < 2) {
      const moreQ2 = await queryQuestions(supabase, {
        questionType: question_type,
        excludeTopic: primary_topic,
        excludeIds: [...q2ExcludeIds, ...q2.map((q) => q.question_id)],
        limit: 3,
      });
      q2 = [...q2, ...moreQ2];
    }
  }

  // Q3: 같은 type + 다른 topic (transfer)
  const allPrevIds = [...q2ExcludeIds, ...q2.map((q) => q.question_id)];
  let q3: QuestionCandidate[];
  if (topic_mode === "same_only") {
    q3 = await queryQuestions(supabase, {
      questionType: question_type,
      topic: primary_topic,
      excludeIds: allPrevIds,
      limit: Math.min(limit, 3),
    });
  } else {
    q3 = await queryQuestions(supabase, {
      questionType: question_type,
      excludeTopic: primary_topic,
      excludeIds: allPrevIds,
      limit: Math.min(limit, 5),
    });
  }

  return {
    q1_candidates: q1,
    q2_candidates: q2,
    q3_candidates: q3,
  };
}

// ── DB 질의 헬퍼 ──

interface QueryOptions {
  questionType: string;
  topic?: string;
  excludeTopic?: string;
  excludeIds?: string[];
  limit?: number;
}

async function queryQuestions(
  supabase: SupabaseClient,
  opts: QueryOptions
): Promise<QuestionCandidate[]> {
  let query = supabase
    .from("questions")
    .select("id, question_type_eng, topic, question_english")
    .eq("question_type_eng", opts.questionType);

  if (opts.topic) {
    query = query.eq("topic", opts.topic);
  }
  if (opts.excludeTopic) {
    query = query.neq("topic", opts.excludeTopic);
  }
  if (opts.excludeIds && opts.excludeIds.length > 0) {
    query = query.not("id", "in", `(${opts.excludeIds.join(",")})`);
  }

  const { data, error } = await query.limit(opts.limit ?? 5);

  if (error || !data) return [];

  return data.map((row) => ({
    question_id: row.id,
    question_type: row.question_type_eng,
    topic: row.topic,
    question_english: row.question_english,
  }));
}
