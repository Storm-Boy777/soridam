"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, FileText, Trash2, ChevronRight, CheckCircle2 } from "lucide-react";
import { WizardStep1 } from "./wizard-step1";
import { WizardStep2 } from "./wizard-step2";
import { WizardStep3 } from "./wizard-step3";
import { getMySubmissions, deleteSubmission } from "@/lib/actions/reviews";
import type { Submission } from "@/lib/types/reviews";
import {
  ACHIEVED_LEVEL_OPTION_LABELS,
  PRE_EXAM_LEVEL_LABELS,
  type AchievedLevelOption,
  type PreExamLevel,
} from "@/lib/types/reviews";

export function SubmitTab() {
  const queryClient = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);

  const { data: submissions = [] } = useQuery({
    queryKey: ["my-submissions"],
    queryFn: async () => {
      const result = await getMySubmissions();
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5분
  });

  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const result = await deleteSubmission(id);
    if (!result.error) {
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
    }
  };

  // 위저드 완료
  const handleComplete = () => {
    setCompleted(true);
    queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
    queryClient.invalidateQueries({ queryKey: ["review-frequency"] });
    setWizardOpen(false);
    setCurrentStep(1);
    setSubmissionId(null);
  };

  // 위저드 모드
  if (wizardOpen) {
    return (
      <div className="space-y-6">
        {/* 스텝 인디케이터 */}
        <div className="flex items-center gap-3">
          {[
            { step: 1, label: "기본 정보" },
            { step: 2, label: "출제 질문" },
            { step: 3, label: "후기 작성" },
          ].map((s, i) => (
            <div key={s.step} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  currentStep === s.step
                    ? "bg-primary-500 text-white"
                    : currentStep > s.step
                      ? "bg-primary-100 text-primary-700"
                      : "bg-surface-secondary text-foreground-muted"
                }`}
              >
                {currentStep > s.step ? <CheckCircle2 size={14} /> : s.step}
              </div>
              <span
                className={`text-xs font-medium ${
                  currentStep === s.step
                    ? "text-foreground"
                    : "text-foreground-muted"
                }`}
              >
                {s.label}
              </span>
              {i < 2 && (
                <ChevronRight size={14} className="text-foreground-muted" />
              )}
            </div>
          ))}
        </div>

        {/* 스텝 콘텐츠 — 각 스텝이 자체 카드를 관리 */}
        {currentStep === 1 && (
          <WizardStep1
            onComplete={(id) => {
              setSubmissionId(id);
              setCurrentStep(2);
            }}
          />
        )}
        {currentStep === 2 && submissionId && (
          <WizardStep2
            submissionId={submissionId}
            onComplete={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}
        {currentStep === 3 && submissionId && (
          <WizardStep3
            submissionId={submissionId}
            onComplete={handleComplete}
            onBack={() => setCurrentStep(2)}
          />
        )}

        {/* 취소 */}
        <div className="text-center">
          <button
            onClick={() => {
              setWizardOpen(false);
              setCurrentStep(1);
              setSubmissionId(null);
            }}
            className="text-xs text-foreground-muted underline hover:text-foreground-secondary"
          >
            취소하고 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 완료 메시지 */}
      {completed && (
        <div className="flex items-start gap-3 rounded-[var(--radius-xl)] border border-green-200 bg-green-50/50 p-4">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-800">
              후기가 성공적으로 제출되었습니다!
            </p>
            <p className="mt-0.5 text-xs text-green-600">
              스크립트 크레딧 2개가 지급되었습니다. 감사합니다.
            </p>
          </div>
        </div>
      )}

      {/* 제출 가이드 + CTA */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h3 className="font-semibold text-foreground">시험 후기 제출하기</h3>
        <p className="mt-1 text-sm text-foreground-secondary">
          OPIc 시험을 본 후 어떤 질문이 나왔는지 공유해 주세요.
          모두의 데이터가 더 정확한 빈도 분석을 만듭니다.
        </p>

        {/* 3단계 안내 */}
        <div className="mt-6 space-y-4">
          {[
            { step: 1, title: "기본 정보 + 설문", desc: "시험 날짜, 등급, 시험 배경과 체감 후기를 입력합니다" },
            { step: 2, title: "출제 질문 입력", desc: "2~15번 문항에 어떤 질문이 나왔는지 선택합니다" },
            { step: 3, title: "후기 작성", desc: "한줄 후기와 팁/조언을 남기면 완료!" },
          ].map((s, i) => (
            <div key={s.step} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-surface-secondary text-sm font-bold text-foreground-muted">
                  {s.step}
                </div>
                {i < 2 && <div className="mt-1 h-6 w-px bg-border" />}
              </div>
              <div className="pb-1">
                <p className="font-semibold text-foreground">{s.title}</p>
                <p className="text-sm text-foreground-secondary">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-6 border-t border-border pt-4">
          <button
            onClick={() => {
              setWizardOpen(true);
              setCompleted(false);
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 px-5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            <Send size={16} />
            후기 제출 시작하기
          </button>
        </div>
      </div>

      {/* 내 제출 이력 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h3 className="font-semibold text-foreground">내 제출 이력</h3>
        {submissions.length === 0 ? (
          <div className="mt-6 flex flex-col items-center py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
              <Send size={24} className="text-foreground-muted" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground-secondary">
              아직 제출한 후기가 없습니다
            </p>
            <p className="mt-1 text-xs text-foreground-muted">
              시험 후기를 제출하면 여기에 이력이 표시됩니다
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-secondary">
                  {sub.status === "complete" ? (
                    <FileText size={16} className="text-primary-500" />
                  ) : (
                    <FileText size={16} className="text-foreground-muted" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {sub.exam_date}
                    </span>
                    <span className="rounded-full bg-surface-secondary px-1.5 py-0.5 text-[10px] font-medium text-foreground-muted">
                      {PRE_EXAM_LEVEL_LABELS[sub.pre_exam_level as PreExamLevel]}
                    </span>
                    <span className="text-[10px] text-foreground-muted">→</span>
                    <span className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700">
                      {ACHIEVED_LEVEL_OPTION_LABELS[sub.achieved_level as AchievedLevelOption]}
                    </span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        sub.status === "complete"
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {sub.status === "complete" ? "완료" : "작성 중"}
                    </span>
                  </div>
                  {sub.one_line_review && (
                    <p className="mt-0.5 text-xs text-foreground-secondary">
                      {sub.one_line_review}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(sub.id)}
                  className="shrink-0 rounded-[var(--radius-md)] p-1.5 text-foreground-muted transition-colors hover:bg-accent-50 hover:text-accent-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
