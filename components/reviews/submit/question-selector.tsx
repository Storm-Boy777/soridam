"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, X, HelpCircle } from "lucide-react";
import { getQuestionsByTopic } from "@/lib/queries/master-questions";
import { QUESTION_TYPE_LABELS, QUESTION_TYPE_COLORS } from "@/lib/types/reviews";

interface Question {
  id: string;
  question_short: string;
  question_english: string;
  question_korean: string;
  question_type_eng: string | null;
  topic: string;
}

export interface SelectedQuestion {
  question_id: string | null;
  custom_question_text: string | null;
  is_not_remembered: boolean;
  topic: string;
  question_text?: string;
  question_title?: string;
}

interface QuestionSelectorProps {
  topic: string;
  category: "일반" | "롤플레이" | "어드밴스";
  questionCount: number;
  selectedQuestions: SelectedQuestion[];
  onSelect: (question: SelectedQuestion) => void;
  onRemove: (index: number) => void;
  isCustomMode?: boolean;
  isNotRememberedMode?: boolean;
  // 스크립트 위저드 전용: 이미 생성된 스크립트의 question_id → script_id 매핑
  existingScriptIds?: Map<string, string>;
  onViewExistingScript?: (scriptId: string) => void;
  // 체험판: 이 질문 ID만 선택 가능, 나머지 비활성
  trialQuestionId?: string;
}

export function QuestionSelector({
  topic,
  category,
  questionCount,
  selectedQuestions,
  onSelect,
  onRemove,
  isCustomMode = false,
  isNotRememberedMode = false,
  existingScriptIds,
  onViewExistingScript,
  trialQuestionId,
}: QuestionSelectorProps) {
  const [customText, setCustomText] = useState("");

  const remainingCount = questionCount - selectedQuestions.length;

  const { data: questions = [], isLoading: loading } = useQuery({
    queryKey: ["questions", topic, category],
    queryFn: () => getQuestionsByTopic(topic, category),
    staleTime: Infinity, // 고정 데이터, 세션 내 1회 로드
    enabled: !isNotRememberedMode && !isCustomMode,
  });

  // 선택 완료 여부
  const isComplete = selectedQuestions.length >= questionCount;

  // 이미 선택된 질문 ID
  const selectedIds = new Set(
    selectedQuestions
      .map((q) => q.question_id)
      .filter(Boolean)
  );

  const handleCustomSubmit = () => {
    if (!customText.trim() || isComplete) return;
    onSelect({
      question_id: null,
      custom_question_text: customText.trim(),
      is_not_remembered: false,
      topic,
      question_text: customText.trim(),
    });
    setCustomText("");
  };

  return (
    <div className="space-y-3">
      {/* 선택된 질문 */}
      {selectedQuestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground-secondary">
            선택된 질문 ({selectedQuestions.length}/{questionCount})
          </p>
          {selectedQuestions.map((q, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 rounded-[var(--radius-md)] border border-primary-200 bg-primary-50/50 p-2.5"
            >
              <Check
                size={14}
                className="mt-0.5 shrink-0 text-primary-500"
              />
              <p className="flex-1 text-xs text-foreground">
                {q.is_not_remembered
                  ? "기억 안남"
                  : q.custom_question_text
                    ? `[직접 입력] ${q.custom_question_text}`
                    : q.question_text || q.question_id}
              </p>
              <button
                onClick={() => onRemove(idx)}
                className="shrink-0 text-foreground-muted hover:text-accent-500"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 완료 메시지 */}
      {isComplete && (
        <div className="rounded-[var(--radius-md)] bg-green-50 p-3 text-center text-xs text-green-700">
          이 콤보의 질문 선택이 완료되었습니다
        </div>
      )}

      {/* 기억 안남 모드 안내 */}
      {isNotRememberedMode && !isComplete && (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-surface-secondary p-3 text-xs text-foreground-secondary">
          <HelpCircle size={14} />
          <span>모든 질문이 &quot;기억 안남&quot;으로 표시됩니다</span>
        </div>
      )}

      {/* 직접 입력 모드 */}
      {isCustomMode && !isComplete && (
        <div className="space-y-2">
          <p className="text-xs text-foreground-secondary">
            기억나는 질문을 직접 입력해주세요 (남은 {remainingCount}개)
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
              placeholder="질문 내용을 입력하세요..."
              className="flex-1 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary-500 focus:outline-none"
            />
            <button
              onClick={handleCustomSubmit}
              disabled={!customText.trim()}
              className="shrink-0 rounded-[var(--radius-md)] bg-primary-500 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              추가
            </button>
          </div>
          {/* 기억 안남으로 채우기 */}
          <button
            onClick={() => {
              for (let i = 0; i < remainingCount; i++) {
                onSelect({
                  question_id: null,
                  custom_question_text: null,
                  is_not_remembered: true,
                  topic: "기억 안남",
                  question_text: "기억 안남",
                });
              }
            }}
            className="text-xs text-foreground-muted underline hover:text-foreground-secondary"
          >
            나머지는 &quot;기억 안남&quot;으로 채우기
          </button>
        </div>
      )}

      {/* 질문 목록 (일반 모드) */}
      {!isNotRememberedMode && !isCustomMode && !isComplete && (
        <>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-[var(--radius-md)] bg-surface-secondary"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-foreground-secondary">
                질문을 선택해주세요 (남은 {remainingCount}개)
              </p>
              {questions.map((q) => {
                const isSelected = selectedIds.has(q.id);
                const existingScriptId = existingScriptIds?.get(q.id);
                const hasExistingScript = !!existingScriptId;
                const isTrialDisabled = !!trialQuestionId && q.id !== trialQuestionId;
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      if (isSelected || isComplete || isTrialDisabled) return;
                      // 이미 생성된 스크립트 → 기존 스크립트 보기
                      if (hasExistingScript && onViewExistingScript) {
                        onViewExistingScript(existingScriptId);
                        return;
                      }
                      onSelect({
                        question_id: q.id,
                        custom_question_text: null,
                        is_not_remembered: false,
                        topic,
                        question_text: q.question_korean,
                        question_title: q.question_short,
                      });
                    }}
                    disabled={isSelected || isComplete || isTrialDisabled}
                    className={`w-full rounded-[var(--radius-md)] border p-3 text-left transition-all ${
                      isSelected
                        ? "border-primary-300 bg-primary-50/50 opacity-50"
                        : isTrialDisabled
                          ? "cursor-not-allowed border-border bg-surface-secondary/50 opacity-40"
                          : hasExistingScript
                            ? "border-green-200 bg-green-50/30 hover:border-green-300"
                            : "border-border bg-surface hover:border-primary-300"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {q.question_type_eng && (
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            QUESTION_TYPE_COLORS[q.question_type_eng] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {QUESTION_TYPE_LABELS[q.question_type_eng] || q.question_type_eng}
                        </span>
                      )}
                      {hasExistingScript && (
                        <span className="ml-auto shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                          생성됨
                        </span>
                      )}
                      {isSelected && (
                        <Check size={12} className="shrink-0 text-primary-500" />
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-foreground">
                      {q.question_english}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-foreground-muted">
                      {q.question_korean}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
