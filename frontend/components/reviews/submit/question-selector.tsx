"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, X, HelpCircle } from "lucide-react";
import { getQuestionsByTopic } from "@/lib/queries/master-questions";

// answer_type 뱃지 색상
const ANSWER_TYPE_COLORS: Record<string, string> = {
  description: "bg-blue-100 text-blue-700",
  routine: "bg-green-100 text-green-700",
  comparison: "bg-purple-100 text-purple-700",
  past_experience_memorable: "bg-amber-100 text-amber-700",
  past_experience_recent: "bg-orange-100 text-orange-700",
  past_experience_childhood: "bg-rose-100 text-rose-700",
  roleplay_11: "bg-teal-100 text-teal-700",
  roleplay_12: "bg-cyan-100 text-cyan-700",
  roleplay_13: "bg-indigo-100 text-indigo-700",
  advanced_14: "bg-red-100 text-red-700",
  advanced_15: "bg-pink-100 text-pink-700",
};

const ANSWER_TYPE_LABELS: Record<string, string> = {
  description: "묘사",
  routine: "루틴",
  comparison: "비교",
  past_experience_memorable: "경험(인상)",
  past_experience_recent: "경험(최근)",
  past_experience_childhood: "경험(어린시절)",
  roleplay_11: "상황설명",
  roleplay_12: "문제해결",
  roleplay_13: "대안제시",
  advanced_14: "비교/의견",
  advanced_15: "경험/변화",
};

interface MasterQuestion {
  question_id: string;
  question_english: string;
  question_korean: string;
  answer_type: string | null;
  topic: string;
}

export interface SelectedQuestion {
  master_question_id: string | null;
  custom_question_text: string | null;
  is_not_remembered: boolean;
  topic: string;
  question_text?: string;
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
      .map((q) => q.master_question_id)
      .filter(Boolean)
  );

  const handleCustomSubmit = () => {
    if (!customText.trim() || isComplete) return;
    onSelect({
      master_question_id: null,
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
                    : q.question_text || q.master_question_id}
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
                  master_question_id: null,
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
                const isSelected = selectedIds.has(q.question_id);
                return (
                  <button
                    key={q.question_id}
                    onClick={() => {
                      if (isSelected || isComplete) return;
                      onSelect({
                        master_question_id: q.question_id,
                        custom_question_text: null,
                        is_not_remembered: false,
                        topic,
                        question_text: q.question_korean,
                      });
                    }}
                    disabled={isSelected || isComplete}
                    className={`w-full rounded-[var(--radius-md)] border p-3 text-left transition-all ${
                      isSelected
                        ? "border-primary-300 bg-primary-50/50 opacity-50"
                        : "border-border bg-surface hover:border-primary-300"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {q.answer_type && (
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            ANSWER_TYPE_COLORS[q.answer_type] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {ANSWER_TYPE_LABELS[q.answer_type] || q.answer_type}
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
