"use client";

// Step 2 (기존 스크립트 활용) — 완성된 영어 스크립트 붙여넣기
// AI는 내용·표현·등급을 유지하고 오타·관사·문법 등 기본 오류만 교열한다.

import { ArrowLeft, Loader2, FileText, ShieldCheck } from "lucide-react";

interface ExternalQuestion {
  question_english: string;
  question_korean: string;
}

export function Step2ExternalInput({
  question,
  externalText,
  onExternalTextChange,
  isConverting,
  hasCredit,
  onBack,
  onConvert,
}: {
  question: ExternalQuestion;
  externalText: string;
  onExternalTextChange: (v: string) => void;
  isConverting: boolean;
  hasCredit: boolean;
  onBack: () => void;
  onConvert: () => void;
}) {
  const tooShort = externalText.trim().length < 20;

  return (
    <div className="space-y-6">
      {/* 선택된 질문 */}
      <div className="rounded-[var(--radius-lg)] border border-primary-200 bg-primary-50/30 p-4">
        <p className="text-sm font-medium text-foreground">
          {question.question_english}
        </p>
        <p className="mt-1 text-xs text-foreground-secondary">
          {question.question_korean}
        </p>
      </div>

      {/* 안내: 기본 교열 정책 */}
      <div className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-emerald-100 bg-emerald-50/50 px-4 py-3">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-500" />
        <p className="text-[13px] leading-relaxed text-foreground-secondary">
          붙여넣은 스크립트의{" "}
          <span className="font-semibold text-foreground">내용·표현·수준은 그대로</span> 두고,
          오타·관사·문법 같은{" "}
          <span className="font-semibold text-foreground">기본적인 실수만 교정</span>해
          드려요. 무엇을 고쳤는지 결과에서 확인할 수 있어요.
        </p>
      </div>

      {/* 입력 */}
      <div>
        <label className="text-sm font-semibold text-foreground">
          완성된 영어 스크립트
        </label>
        <p className="mt-1 text-xs text-foreground-muted">
          학원·교재 답변이나 이미 외운 답변을 영어로 붙여넣으세요.
        </p>
        <textarea
          value={externalText}
          onChange={(e) => onExternalTextChange(e.target.value)}
          placeholder="I usually go to the park near my house on weekends. I love taking a walk and relaxing there..."
          rows={9}
          className="mt-2 w-full rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-foreground-muted/50 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          maxLength={5000}
        />
        <div className="mt-1 text-right text-xs text-foreground-muted">
          {externalText.length}/5000자
        </div>
      </div>

      {/* 액션 */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-foreground-secondary hover:text-foreground"
        >
          <ArrowLeft size={14} />
          이전
        </button>

        <button
          onClick={onConvert}
          disabled={isConverting || !hasCredit || tooShort}
          className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 px-5 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isConverting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              변환 중...
            </>
          ) : (
            <>
              <FileText size={16} />
              교정하고 변환하기
            </>
          )}
        </button>
      </div>

      {!hasCredit && (
        <p className="text-center text-xs text-red-500">
          크레딧이 부족합니다.{" "}
          <a href="/store" className="underline">
            충전하기
          </a>
        </p>
      )}
    </div>
  );
}
