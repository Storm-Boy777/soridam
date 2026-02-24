"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { getSubmissionWithQuestions } from "@/lib/actions/reviews";
import {
  COMBO_STEPS,
  EXAM_PURPOSE_LABELS,
  STUDY_METHOD_LABELS,
  PREP_DURATION_LABELS,
  ATTEMPT_COUNT_LABELS,
  PERCEIVED_DIFFICULTY_LABELS,
  ACTUAL_DURATION_LABELS,
  PRE_EXAM_LEVEL_LABELS,
  ACHIEVED_LEVEL_OPTION_LABELS,
  type ExamPurpose,
  type StudyMethod,
  type PrepDuration,
  type AttemptCount,
  type PerceivedDifficulty,
  type ActualDuration,
  type PreExamLevel,
  type AchievedLevelOption,
} from "@/lib/types/reviews";

interface SubmissionDetailProps {
  submissionId: number;
}

export function SubmissionDetail({ submissionId }: SubmissionDetailProps) {
  // 1 RTT: submission + questions 한 번에 조회
  const { data: submission, isLoading } = useQuery({
    queryKey: ["submission-detail", submissionId],
    queryFn: async () => {
      const result = await getSubmissionWithQuestions(submissionId);
      return result.data || null;
    },
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={16} className="animate-spin text-foreground-muted" />
      </div>
    );
  }

  if (!submission) return null;

  const questions = submission.submission_questions || [];

  // 콤보별 질문 그룹핑
  const questionsByCombo = new Map<string, typeof questions>();
  for (const q of questions) {
    const list = questionsByCombo.get(q.combo_type) || [];
    list.push(q);
    questionsByCombo.set(q.combo_type, list);
  }

  return (
    <div className="space-y-4 border-t border-border pt-3">
      {/* 시험 정보 */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">시험 정보</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div className="text-foreground-muted">등급 변화</div>
          <div className="text-foreground">
            {PRE_EXAM_LEVEL_LABELS[submission.pre_exam_level as PreExamLevel]} →{" "}
            {submission.achieved_level
              ? ACHIEVED_LEVEL_OPTION_LABELS[submission.achieved_level as AchievedLevelOption]
              : "발표 전"}
          </div>
          {submission.exam_difficulty && (
            <>
              <div className="text-foreground-muted">난이도 설정</div>
              <div className="text-foreground">{submission.exam_difficulty}</div>
            </>
          )}
          <div className="text-foreground-muted">시험 목적</div>
          <div className="text-foreground">
            {EXAM_PURPOSE_LABELS[submission.exam_purpose as ExamPurpose]}
          </div>
          <div className="text-foreground-muted">공부 방법</div>
          <div className="text-foreground">
            {(submission.study_methods || [])
              .map((m: string) => STUDY_METHOD_LABELS[m as StudyMethod] || m)
              .join(", ")}
          </div>
          <div className="text-foreground-muted">준비 기간</div>
          <div className="text-foreground">
            {PREP_DURATION_LABELS[submission.prep_duration as PrepDuration]}
          </div>
          <div className="text-foreground-muted">응시 횟수</div>
          <div className="text-foreground">
            {ATTEMPT_COUNT_LABELS[submission.attempt_count as AttemptCount]}
          </div>
          <div className="text-foreground-muted">체감 난이도</div>
          <div className="text-foreground">
            {PERCEIVED_DIFFICULTY_LABELS[submission.perceived_difficulty as PerceivedDifficulty]}
          </div>
          <div className="text-foreground-muted">실제 소요</div>
          <div className="text-foreground">
            {ACTUAL_DURATION_LABELS[submission.actual_duration as ActualDuration]}
          </div>
        </div>
      </div>

      {/* 출제 질문 */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">출제 질문</p>
        <div className="space-y-2">
          {/* Q1 자기소개 (항상 첫 번째) */}
          {questionsByCombo.has("self_intro") && (() => {
            const selfIntroQ = questionsByCombo.get("self_intro")?.[0];
            return (
              <div className="rounded-[var(--radius-md)] bg-surface-secondary p-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-foreground-muted">
                    1번 문항
                  </span>
                  <span className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700">
                    자기소개
                  </span>
                </div>
                <div className="mt-1.5 space-y-0.5 pl-0.5 text-xs">
                  <p className="text-foreground-secondary">
                    {selfIntroQ?.master_questions?.question_english || "Let's start the interview now. Tell me something about yourself."}
                  </p>
                  <p className="text-foreground-muted">
                    {selfIntroQ?.master_questions?.question_korean || "그럼 인터뷰를 시작하겠습니다. 본인에 대해 간단히 소개해 주세요."}
                  </p>
                </div>
              </div>
            );
          })()}
          {/* 콤보별 질문 (2~15번) */}
          {COMBO_STEPS.map((step) => {
            const comboQuestions = questionsByCombo.get(step.comboType);
            if (!comboQuestions || comboQuestions.length === 0) return null;
            // 주제 추출 (첫 번째 질문의 topic)
            const topic = comboQuestions[0].topic;
            return (
              <div key={step.comboType} className="rounded-[var(--radius-md)] bg-surface-secondary p-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-foreground-muted">
                    {step.label}
                  </span>
                  <span className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700">
                    {topic}
                  </span>
                </div>
                <div className="mt-1.5 space-y-1">
                  {comboQuestions.map((q, idx) => (
                    <div key={idx} className="flex items-baseline gap-2 text-xs">
                      <span className="shrink-0 font-medium text-foreground-muted">
                        {step.questionNumbers[idx]}번
                      </span>
                      {q.is_not_remembered ? (
                        <span className="text-foreground-secondary">기억 안남</span>
                      ) : q.custom_question_text ? (
                        <span className="text-foreground-secondary">[직접 입력] {q.custom_question_text}</span>
                      ) : (
                        <div className="space-y-0.5">
                          <p className="text-foreground-secondary">
                            {q.master_questions?.question_english || "—"}
                          </p>
                          <p className="text-foreground-muted">
                            {q.master_questions?.question_korean || "—"}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 후기 */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">후기</p>
        <div className="space-y-1.5 text-xs">
          <div>
            <span className="text-foreground-muted">한줄 후기: </span>
            <span className="text-foreground">{submission.one_line_review || "—"}</span>
          </div>
          {submission.tips && (
            <div>
              <span className="text-foreground-muted">팁/조언: </span>
              <span className="text-foreground">{submission.tips}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
