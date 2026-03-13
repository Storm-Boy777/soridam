"use server";

// 관리자 기출 입력 Server Actions
// 1) matchAdminQuestions — 설명 텍스트 → AI 매칭
// 2) saveAdminReview — 컨펌된 매칭 결과 → DB 저장

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import {
  matchQuestionsGlobal,
  type DBQuestion,
  type QuestionMatch,
} from "@/lib/utils/question-matcher";
import type { ComboType } from "@/lib/types/reviews";

// ── 서비스 역할 클라이언트 (RLS 우회) ──

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── placeholder 설문 값 (NOT NULL 제약 충족용) ──
const ADMIN_PLACEHOLDER = {
  exam_purpose: "self_development",
  study_methods: ["self_study"],
  prep_duration: "under_1w",
  attempt_count: "first",
  perceived_difficulty: "normal",
  actual_duration: "25_30",
  pre_exam_level: "none",
  used_recommended_survey: true,
  exam_difficulty: "5-5",
} as const;

// ── 세트 구조 ──

const SET_CONFIG: { setNumber: number; comboType: ComboType; questionNumbers: number[] }[] = [
  { setNumber: 1, comboType: "general_1", questionNumbers: [2, 3, 4] },
  { setNumber: 2, comboType: "general_2", questionNumbers: [5, 6, 7] },
  { setNumber: 3, comboType: "general_3", questionNumbers: [8, 9, 10] },
  { setNumber: 4, comboType: "roleplay", questionNumbers: [11, 12, 13] },
  { setNumber: 5, comboType: "advance", questionNumbers: [14, 15] },
];

// ── 1) AI 매칭 ──

export async function matchAdminQuestions(
  descriptions: { index: number; text: string }[]
): Promise<{ matches: QuestionMatch[]; error?: string }> {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const { data: dbQuestions, error: dbError } = await supabase
      .from("questions")
      .select("id, topic, category, question_short, question_english, question_korean, question_type_eng, question_type_kor, survey_type");

    if (dbError || !dbQuestions) {
      return { matches: [], error: `DB 질문 로드 실패: ${dbError?.message}` };
    }

    // 빈 입력 필터링
    const validDescriptions = descriptions.filter((d) => d.text.trim().length > 0);
    if (validDescriptions.length === 0) {
      return { matches: [], error: "입력된 질문이 없습니다" };
    }

    const matches = await matchQuestionsGlobal(validDescriptions, dbQuestions as DBQuestion[]);
    return { matches };
  } catch (error) {
    return {
      matches: [],
      error: error instanceof Error ? error.message : "매칭 오류",
    };
  }
}

// ── 2) 수동 매칭용 질문 후보 조회 ──

export interface CandidateQuestion {
  id: string;
  topic: string;
  category: string;
  question_short: string | null;
  question_english: string | null;
  question_korean: string;
  question_type_eng: string | null;
  question_type_kor: string | null;
  survey_type: string;
}

export async function getAdminQuestionCandidates(): Promise<{
  questions: CandidateQuestion[];
  error?: string;
}> {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("questions")
      .select("id, topic, category, question_short, question_english, question_korean, question_type_eng, question_type_kor, survey_type")
      .neq("topic", "자기소개")
      .order("topic")
      .order("id");

    if (error || !data) {
      return { questions: [], error: error?.message };
    }
    return { questions: data };
  } catch (error) {
    return {
      questions: [],
      error: error instanceof Error ? error.message : "조회 오류",
    };
  }
}

// ── 3) 컨펌된 매칭 결과 저장 ──

export interface ConfirmedQuestion {
  questionNumber: number;  // 2~15
  questionId: string | null;
  topic: string;
  description: string;     // 원본 설명 (매칭 실패 시 custom_question_text로 사용)
}

export async function saveAdminReview(
  confirmedQuestions: ConfirmedQuestion[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, userEmail } = await requireAdmin();
    const supabase = createServiceClient();

    // 자기소개 question_id 조회
    const { data: selfIntroData } = await supabase
      .from("questions")
      .select("id")
      .eq("topic", "자기소개")
      .limit(1)
      .maybeSingle();

    // submissions 껍데기 INSERT
    const { data: submission, error: subError } = await supabase
      .from("submissions")
      .insert({
        user_id: userId,
        exam_date: new Date().toISOString().split("T")[0],
        exam_difficulty: ADMIN_PLACEHOLDER.exam_difficulty,
        pre_exam_level: ADMIN_PLACEHOLDER.pre_exam_level,
        achieved_level: null,
        exam_purpose: ADMIN_PLACEHOLDER.exam_purpose,
        study_methods: ADMIN_PLACEHOLDER.study_methods,
        prep_duration: ADMIN_PLACEHOLDER.prep_duration,
        attempt_count: ADMIN_PLACEHOLDER.attempt_count,
        perceived_difficulty: ADMIN_PLACEHOLDER.perceived_difficulty,
        actual_duration: ADMIN_PLACEHOLDER.actual_duration,
        used_recommended_survey: ADMIN_PLACEHOLDER.used_recommended_survey,
        one_line_review: null,
        tips: null,
        status: "complete",
        step_completed: 3,
        source: "admin",
        exam_approved: "approved",
        exam_approved_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (subError || !submission) {
      return { success: false, error: `후기 저장 실패: ${subError?.message}` };
    }

    const submissionId = submission.id;

    // submission_questions INSERT (Q1 자기소개 + Q2~Q15)
    const allQuestions = [
      {
        submission_id: submissionId,
        question_number: 1,
        combo_type: "self_intro",
        topic: "자기소개",
        question_id: selfIntroData?.id || null,
        custom_question_text: null,
        is_not_remembered: false,
      },
      ...confirmedQuestions.map((q) => {
        const setConfig = SET_CONFIG.find((s) =>
          s.questionNumbers.includes(q.questionNumber)
        );
        return {
          submission_id: submissionId,
          question_number: q.questionNumber,
          combo_type: setConfig?.comboType || "general_1",
          topic: q.topic,
          question_id: q.questionId,
          custom_question_text: q.questionId ? null : q.description,
          is_not_remembered: !q.questionId,
        };
      }),
    ];

    const { error: qError } = await supabase
      .from("submission_questions")
      .insert(allQuestions);

    if (qError) {
      return { success: false, error: `질문 저장 실패: ${qError.message}` };
    }

    // submission_combos INSERT (세트별 토픽 + question_ids)
    const combos: {
      submission_id: number;
      combo_type: ComboType;
      topic: string;
      question_ids: string[];
    }[] = [];

    for (const set of SET_CONFIG) {
      const setQuestions = confirmedQuestions.filter((q) =>
        set.questionNumbers.includes(q.questionNumber)
      );
      if (setQuestions.length === 0) continue;

      // 세트 내 토픽 (가장 많이 나온 토픽 사용)
      const topicCounts = new Map<string, number>();
      for (const q of setQuestions) {
        topicCounts.set(q.topic, (topicCounts.get(q.topic) || 0) + 1);
      }
      const mainTopic = [...topicCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];

      const questionIds = setQuestions
        .map((q) => q.questionId)
        .filter((id): id is string => id !== null);

      combos.push({
        submission_id: submissionId,
        combo_type: set.comboType,
        topic: mainTopic,
        question_ids: questionIds,
      });
    }

    if (combos.length > 0) {
      const { error: comboError } = await supabase
        .from("submission_combos")
        .insert(combos);

      if (comboError) {
        return { success: false, error: `콤보 저장 실패: ${comboError.message}` };
      }
    }

    // 감사 로그
    await supabase.from("admin_audit_log").insert({
      admin_id: userId,
      admin_email: userEmail,
      action: "import_review",
      target_type: "submission",
      target_id: String(submissionId),
      details: { question_count: confirmedQuestions.length },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "서버 오류",
    };
  }
}
