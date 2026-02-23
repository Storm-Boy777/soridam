"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Loader2, Check } from "lucide-react";
import { TopicPagination } from "./topic-pagination";
import { QuestionSelector } from "./question-selector";
import type { SelectedQuestion } from "./question-selector";
import { saveQuestions } from "@/lib/actions/reviews";
import { COMBO_STEPS, type QuestionItem } from "@/lib/types/reviews";

interface WizardStep2Props {
  submissionId: number;
  onComplete: () => void;
  onBack: () => void;
}

// 콤보별 선택된 질문 상태
interface ComboResult {
  questions: SelectedQuestion[];
}

export function WizardStep2({ submissionId, onComplete, onBack }: WizardStep2Props) {
  const [currentComboIdx, setCurrentComboIdx] = useState(0);
  const [comboResults, setComboResults] = useState<Record<string, ComboResult>>({});
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentCombo = COMBO_STEPS[currentComboIdx];
  const currentResult = comboResults[currentCombo.comboType] || { questions: [] };

  // 현재 콤보의 카테고리 (TopicPagination용)
  const category = currentCombo.category;

  // 모든 콤보 완료 여부
  const allComplete = COMBO_STEPS.every(
    (step) => (comboResults[step.comboType]?.questions.length || 0) >= step.questionCount
  );

  // 현재 콤보 완료 여부
  const isCurrentComplete = currentResult.questions.length >= currentCombo.questionCount;

  // 질문 선택 핸들러
  const handleSelectQuestion = useCallback(
    (question: SelectedQuestion) => {
      if (isCurrentComplete) return;
      setComboResults((prev) => ({
        ...prev,
        [currentCombo.comboType]: {
          questions: [
            ...(prev[currentCombo.comboType]?.questions || []),
            question,
          ],
        },
      }));
    },
    [currentCombo.comboType, isCurrentComplete]
  );

  // 질문 제거 핸들러
  const handleRemoveQuestion = useCallback(
    (index: number) => {
      setComboResults((prev) => ({
        ...prev,
        [currentCombo.comboType]: {
          questions: (prev[currentCombo.comboType]?.questions || []).filter(
            (_, i) => i !== index
          ),
        },
      }));
    },
    [currentCombo.comboType]
  );

  // 주제 선택
  const handleSelectTopic = (topic: string) => {
    setSelectedTopic(topic);
    setIsCustomMode(false);
  };

  // 기억 안남 — 부모에서 직접 bulk 처리 (useEffect 루프 버그 방지)
  const handleNotRemembered = () => {
    const remaining = currentCombo.questionCount - currentResult.questions.length;
    const notRememberedQuestions: SelectedQuestion[] = Array.from(
      { length: remaining },
      () => ({
        master_question_id: null,
        custom_question_text: null,
        is_not_remembered: true,
        topic: "기억 안남",
        question_text: "기억 안남",
      })
    );

    setComboResults((prev) => ({
      ...prev,
      [currentCombo.comboType]: {
        questions: [
          ...(prev[currentCombo.comboType]?.questions || []),
          ...notRememberedQuestions,
        ],
      },
    }));
    setSelectedTopic(null);
    setIsCustomMode(false);
  };

  // 직접 입력
  const handleCustomInput = () => {
    setSelectedTopic("직접 입력");
    setIsCustomMode(true);
  };

  // 다음 콤보로
  const handleNextCombo = () => {
    if (currentComboIdx < COMBO_STEPS.length - 1) {
      setCurrentComboIdx((prev) => prev + 1);
      setSelectedTopic(null);
      setIsCustomMode(false);
    }
  };

  // 이전 콤보로
  const handlePrevCombo = () => {
    if (currentComboIdx > 0) {
      setCurrentComboIdx((prev) => prev - 1);
      setSelectedTopic(null);
      setIsCustomMode(false);
    }
  };

  // 현재 콤보 초기화
  const handleResetCombo = () => {
    setComboResults((prev) => ({
      ...prev,
      [currentCombo.comboType]: { questions: [] },
    }));
    setSelectedTopic(null);
    setIsCustomMode(false);
  };

  // 전체 제출
  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    // 14개 질문 배열 구성
    const allQuestions: QuestionItem[] = [];
    for (const step of COMBO_STEPS) {
      const result = comboResults[step.comboType];
      if (!result || result.questions.length < step.questionCount) {
        setError(`${step.label} 질문이 부족합니다`);
        setSubmitting(false);
        return;
      }
      result.questions.forEach((q, idx) => {
        allQuestions.push({
          question_number: step.questionNumbers[idx],
          combo_type: step.comboType,
          topic: q.topic,
          master_question_id: q.master_question_id,
          custom_question_text: q.custom_question_text,
          is_not_remembered: q.is_not_remembered,
        });
      });
    }

    const result = await saveQuestions({
      submission_id: submissionId,
      questions: allQuestions,
    });

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onComplete();
  };

  return (
    <div className="space-y-4">
      {/* 진행 상태 바 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-foreground-secondary">
          <span>{currentCombo.label}</span>
          <span>{currentComboIdx + 1} / {COMBO_STEPS.length}</span>
        </div>
        <div className="flex gap-1">
          {COMBO_STEPS.map((step, idx) => {
            const stepResult = comboResults[step.comboType];
            const isComplete = (stepResult?.questions.length || 0) >= step.questionCount;
            return (
              <div
                key={step.comboType}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  isComplete
                    ? "bg-primary-500"
                    : idx === currentComboIdx
                      ? "bg-primary-300"
                      : "bg-surface-secondary"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* 콤보 헤더 */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              {currentCombo.label}
            </h4>
            <p className="text-xs text-foreground-muted">
              {currentCombo.questionNumbers.join(", ")}번 문항 ({currentCombo.questionCount}개)
            </p>
          </div>
          {isCurrentComplete && (
            <div className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs text-green-700">
              <Check size={12} />
              완료
            </div>
          )}
        </div>

        {isCurrentComplete && (
          <button
            onClick={handleResetCombo}
            className="mt-2 text-xs text-foreground-muted underline hover:text-foreground-secondary"
          >
            다시 선택하기
          </button>
        )}
      </div>

      {/* 주제 선택 (아직 주제 미선택 + 완료 아닐 때) */}
      {!selectedTopic && !isCurrentComplete && (
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
          <p className="mb-3 text-sm font-medium text-foreground">
            주제를 선택해주세요
          </p>
          <TopicPagination
            category={category}
            selectedTopic={selectedTopic}
            onSelectTopic={handleSelectTopic}
            onNotRemembered={handleNotRemembered}
            onCustomInput={handleCustomInput}
          />
        </div>
      )}

      {/* 질문 선택 (주제 선택됨) */}
      {selectedTopic && !isCurrentComplete && (
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {isCustomMode
                ? "직접 입력"
                : `"${selectedTopic}" 질문`}
            </p>
            <button
              onClick={() => {
                setSelectedTopic(null);
                setIsCustomMode(false);
              }}
              className="text-xs text-foreground-muted underline hover:text-foreground-secondary"
            >
              주제 다시 선택
            </button>
          </div>
          <QuestionSelector
            topic={selectedTopic}
            category={category}
            questionCount={currentCombo.questionCount}
            selectedQuestions={currentResult.questions}
            onSelect={handleSelectQuestion}
            onRemove={handleRemoveQuestion}
            isCustomMode={isCustomMode}
          />
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="rounded-[var(--radius-md)] bg-accent-50 p-3 text-sm text-accent-600">
          {error}
        </div>
      )}

      {/* 네비게이션 */}
      <div className="flex items-center gap-3">
        <button
          onClick={currentComboIdx === 0 ? onBack : handlePrevCombo}
          className="flex items-center gap-1 rounded-[var(--radius-lg)] border border-border px-4 py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary"
        >
          <ChevronLeft size={16} />
          {currentComboIdx === 0 ? "이전 단계" : "이전 콤보"}
        </button>

        <div className="flex-1" />

        {isCurrentComplete && currentComboIdx < COMBO_STEPS.length - 1 && (
          <button
            onClick={handleNextCombo}
            className="flex items-center gap-1 rounded-[var(--radius-lg)] bg-primary-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            다음 콤보
            <ChevronRight size={16} />
          </button>
        )}

        {allComplete && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            다음 단계로
          </button>
        )}
      </div>
    </div>
  );
}
