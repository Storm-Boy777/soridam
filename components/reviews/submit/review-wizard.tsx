"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { WizardStep1 } from "./wizard-step1";
import { WizardStep2, type ComboResult } from "./wizard-step2";
import { WizardStep3, type CreditResult } from "./wizard-step3";
import { getDraftQuestions } from "@/lib/actions/reviews";

/* ── 위저드 3단계 정의 ── */

const WIZARD_STEPS = [
  { label: "시험 정보" },
  { label: "출제 질문" },
  { label: "후기 + 팁" },
];

interface ReviewWizardProps {
  resumeSubmissionId?: number;
}

export function ReviewWizard({ resumeSubmissionId }: ReviewWizardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [submissionId, setSubmissionId] = useState<number | null>(
    resumeSubmissionId ?? null
  );
  const [comboResults, setComboResults] = useState<Record<string, ComboResult>>(
    {}
  );
  const [loading, setLoading] = useState(!!resumeSubmissionId);

  // 이어쓰기: resume 시 draft 데이터 복원
  useEffect(() => {
    if (!resumeSubmissionId) return;

    (async () => {
      try {
        // step_completed 정보를 가져오기 위해 getDraftQuestions 호출
        const result = await getDraftQuestions(resumeSubmissionId);
        if (result.data && result.data.length > 0) {
          // step_completed가 2 이상이면 comboResults 복원
          const restored: Record<string, ComboResult> = {};
          for (const q of result.data) {
            if (!restored[q.combo_type]) {
              restored[q.combo_type] = { questions: [] };
            }
            restored[q.combo_type].questions.push({
              question_id: q.question_id,
              custom_question_text: q.custom_question_text,
              is_not_remembered: q.is_not_remembered,
              topic: q.topic,
              question_text: q.question_korean || undefined,
              question_title: q.question_title || undefined,
            });
          }
          setComboResults(restored);
          // 질문이 있으면 Step 2 이상 완료된 것 → Step 3으로
          setCurrentStep(3);
        } else {
          // 질문 없으면 Step 1만 완료된 것 → Step 2로
          setCurrentStep(2);
        }
      } catch {
        // 복원 실패 시 Step 1부터
        setCurrentStep(1);
      } finally {
        setLoading(false);
      }
    })();
  }, [resumeSubmissionId]);

  // 위저드 완료
  const handleComplete = (result: CreditResult) => {
    queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
    queryClient.invalidateQueries({ queryKey: ["review-frequency"] });
    queryClient.invalidateQueries({ queryKey: ["user-credits"] });
    router.push(
      `/reviews?completed=true&credit=${result.creditGranted ? "true" : "false"}`
    );
  };

  // 취소
  const handleCancel = () => {
    router.push("/reviews");
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-0 min-h-0 flex-grow flex-col md:h-auto md:flex-1">
      {/* ── 단계 표시 (3단계) ── */}
      <div className="border-b border-border bg-surface px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 sm:gap-3">
          {WIZARD_STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold sm:h-7 sm:w-7 sm:text-xs ${
                    i + 1 < currentStep
                      ? "bg-green-500 text-white"
                      : i + 1 === currentStep
                        ? "bg-primary-500 text-white"
                        : "border border-border bg-surface-secondary text-foreground-muted"
                  }`}
                >
                  {i + 1 < currentStep ? <Check size={12} className="sm:hidden" /> : null}
                  {i + 1 < currentStep ? <Check size={14} className="hidden sm:block" /> : null}
                  {i + 1 >= currentStep ? i + 1 : null}
                </div>
                <span
                  className={`text-[11px] sm:text-xs ${
                    i + 1 === currentStep
                      ? "font-semibold text-foreground"
                      : i + 1 < currentStep
                        ? "font-medium text-green-600"
                        : "text-foreground-muted"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < WIZARD_STEPS.length - 1 && (
                <div className="h-px w-4 bg-border sm:w-8" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 스텝 콘텐츠 — 단일 스크롤 영역 ── */}
      <div className="relative h-0 flex-grow md:h-auto md:flex-1">
        <div className="absolute inset-0 overflow-y-auto md:relative md:inset-auto md:h-full mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-6 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
        {currentStep === 1 && (
          <WizardStep1
            submissionId={submissionId}
            onComplete={(id) => {
              setSubmissionId(id);
              setCurrentStep(2);
            }}
          />
        )}
        {currentStep === 2 && submissionId && (
          <WizardStep2
            submissionId={submissionId}
            comboResults={comboResults}
            setComboResults={setComboResults}
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
        <div className="pb-4 pt-3 text-center sm:pt-4">
          <button
            onClick={handleCancel}
            className="text-xs text-foreground-muted underline hover:text-foreground-secondary"
          >
            취소하고 돌아가기
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
