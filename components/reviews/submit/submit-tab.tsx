"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, FileText, Trash2, ChevronRight, ChevronDown, CheckCircle2 } from "lucide-react";
import { SubmissionDetail } from "./submission-detail";
import { WizardStep1 } from "./wizard-step1";
import { WizardStep2, type ComboResult } from "./wizard-step2";
import { WizardStep3, type CreditResult } from "./wizard-step3";
import { getMySubmissions, deleteSubmission, getDraftQuestions } from "@/lib/actions/reviews";
import type { Submission } from "@/lib/types/reviews";
import {
  ACHIEVED_LEVEL_OPTION_LABELS,
  PRE_EXAM_LEVEL_LABELS,
  type AchievedLevelOption,
  type PreExamLevel,
} from "@/lib/types/reviews";

interface SubmitTabProps {
  initialSubmissions?: Submission[];
}

export function SubmitTab({ initialSubmissions }: SubmitTabProps) {
  const queryClient = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);
  const [creditResult, setCreditResult] = useState<CreditResult | null>(null);
  const [comboResults, setComboResults] = useState<Record<string, ComboResult>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: submissions = [] } = useQuery({
    queryKey: ["my-submissions"],
    queryFn: async () => {
      const result = await getMySubmissions();
      return result.data || [];
    },
    initialData: initialSubmissions,
    initialDataUpdatedAt: Date.now(),
    staleTime: 5 * 60 * 1000, // 5분
  });

  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const result = await deleteSubmission(id);
    if (!result.error) {
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
    }
  };

  // 이어쓰기
  const handleResume = async (sub: Submission) => {
    setSubmissionId(sub.id);
    setCompleted(false);

    // step_completed에 따라 진입 Step 결정
    const nextStep = Math.min((sub.step_completed || 0) + 1, 3);

    // Step 2 완료된 draft → comboResults 복원 (Step 3 → Step 2 뒤로가기 대비)
    if (sub.step_completed >= 2) {
      const result = await getDraftQuestions(sub.id);
      if (result.data) {
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
      }
    } else {
      setComboResults({});
    }

    setCurrentStep(nextStep);
    setWizardOpen(true);
  };

  // 위저드 완료
  const handleComplete = (result: CreditResult) => {
    setCompleted(true);
    setCreditResult(result);
    queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
    queryClient.invalidateQueries({ queryKey: ["review-frequency"] });
    queryClient.invalidateQueries({ queryKey: ["user-credits"] });
    setWizardOpen(false);
    setCurrentStep(1);
    setSubmissionId(null);
    setComboResults({});
  };

  // 위저드 모드
  if (wizardOpen) {
    return (
      <div className="space-y-6">
        {/* 스텝 인디케이터 */}
        <div className="flex items-center gap-3">
          {[
            { step: 1, label: "시험 정보" },
            { step: 2, label: "출제 질문" },
            { step: 3, label: "후기 + 팁" },
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
        <div className="text-center">
          <button
            onClick={() => {
              setWizardOpen(false);
              setCurrentStep(1);
              setSubmissionId(null);
              setComboResults({});
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
            {creditResult?.creditGranted ? (
              <p className="mt-0.5 text-xs text-green-600">
                스크립트 패키지 생성권 2개가 지급되었습니다. 감사합니다.
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-foreground-secondary">
                소중한 후기 감사합니다! 스크립트 무료 생성권은 OPIc 응시 규정에 따라
                마지막 지급일로부터 25일 이후 후기 제출 시 지급됩니다. (최초 2회는 즉시 지급)
              </p>
            )}
          </div>
        </div>
      )}

      {/* 제출 가이드 + CTA */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h3 className="font-semibold text-foreground">시험 후기 제출하기</h3>
        <p className="mt-1 text-sm text-foreground-secondary">
          시험 후기를 제출하면 스크립트 패키지 생성권 2개가 지급됩니다.
          여러분의 데이터가 더 정확한 빈도 분석을 만듭니다.
        </p>

        {/* 3단계 안내 */}
        <div className="relative mt-6">
          {[
            { step: 1, title: "시험 정보 + 배경 설문", desc: "시험 날짜, Self-Assessment, 등급, 서베이 선택 등을 입력합니다" },
            { step: 2, title: "출제 질문 입력", desc: "콤보별로 어떤 주제와 질문이 나왔는지 선택합니다" },
            { step: 3, title: "한줄 후기 + 팁", desc: "간단한 후기와 팁을 남기면 완료!" },
          ].map((s, i) => (
            <div key={s.step} className="relative flex gap-4 pb-5 last:pb-0">
              {/* 연결선 — 마지막 제외 */}
              {i < 2 && (
                <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />
              )}
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-border bg-surface-secondary text-sm font-bold text-foreground-muted">
                {s.step}
              </div>
              <div className="pt-0.5">
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
              setCreditResult(null);
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
            {submissions.map((sub) => {
              const isExpanded = expandedId === sub.id;
              return (
                <div
                  key={sub.id}
                  className="rounded-[var(--radius-lg)] border border-border p-3"
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-secondary sm:flex">
                      {sub.status === "complete" ? (
                        <FileText size={16} className="text-primary-500" />
                      ) : (
                        <FileText size={16} className="text-foreground-muted" />
                      )}
                    </div>
                    <div
                      className={`min-w-0 flex-1 ${sub.status === "complete" ? "cursor-pointer" : ""}`}
                      onClick={() => {
                        if (sub.status === "complete") {
                          setExpandedId(isExpanded ? null : sub.id);
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground">
                          {sub.exam_date}
                        </span>
                        <span className="rounded-full bg-surface-secondary px-1.5 py-0.5 text-[10px] font-medium text-foreground-muted">
                          {sub.pre_exam_level === 'none' ? '첫 응시' : sub.pre_exam_level}
                        </span>
                        <span className="text-[10px] text-foreground-muted">→</span>
                        <span className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700">
                          {sub.achieved_level || '발표 전'}
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
                        <p className="mt-0.5 truncate text-xs text-foreground-secondary">
                          {sub.one_line_review}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {sub.status === "complete" && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                          className="rounded-[var(--radius-md)] p-1.5 text-foreground-muted transition-colors hover:bg-surface-secondary"
                        >
                          <ChevronDown
                            size={14}
                            className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </button>
                      )}
                      {sub.status === "draft" && (
                        <>
                          <button
                            onClick={() => handleResume(sub)}
                            className="rounded-[var(--radius-md)] px-2 py-1.5 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50"
                          >
                            이어쓰기
                          </button>
                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="rounded-[var(--radius-md)] p-1.5 text-foreground-muted transition-colors hover:bg-accent-50 hover:text-accent-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {/* 상세 내용 (완료된 후기만) */}
                  {isExpanded && sub.status === "complete" && (
                    <SubmissionDetail submissionId={sub.id} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
