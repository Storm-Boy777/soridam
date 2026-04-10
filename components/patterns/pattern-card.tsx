"use client";

import { useState, type ReactElement } from "react";
import type { UniversalPattern } from "@/lib/types/patterns";
import { PatternTtsButton } from "./pattern-tts-button";

interface PatternCardProps {
  pattern: UniversalPattern;
  number: number;
  phaseColor: string;
  patternType: string;
  studyMode?: boolean;
}

/** 템플릿에서 [변수] 부분을 dashed 슬롯 뱃지로 렌더링 */
function renderTemplate(template: string) {
  const parts = template.split(/(\[.*?\])/g);
  return parts.map((part, i) =>
    part.startsWith("[") && part.endsWith("]") ? (
      <span
        key={i}
        className="inline-block rounded border border-dashed border-primary-300 bg-primary-50 px-1.5 py-0.5 font-bold text-primary-700"
      >
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/** 템플릿의 [변수]를 실제 예시 하이라이트로 채워서 렌더링 */
function renderFilledTemplate(template: string, highlights: string[]) {
  const parts = template.split(/(\[.*?\])/g);
  let hlIdx = 0;
  return parts.map((part, i) => {
    if (part.startsWith("[") && part.endsWith("]")) {
      const filled = highlights[hlIdx] || part;
      hlIdx++;
      return (
        <span
          key={i}
          className="inline-block rounded bg-primary-50 px-1 py-0.5 font-semibold text-primary-700"
        >
          {filled}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/** 예시의 highlight 문자열을 배열로 분리 */
function parseHighlights(highlight: string): string[] {
  return highlight.split(/,?\s*\.\.\.\s*/).map((s) => s.trim()).filter(Boolean);
}

/** 예시 문장에서 highlight 부분을 배경 강조 표시 */
function renderExample(sentence: string, highlight: string) {
  if (!highlight) return sentence;

  const highlightParts = highlight.split(/,?\s*\.\.\.\s*/);
  let result: (string | ReactElement)[] = [sentence];

  highlightParts.forEach((part, partIdx) => {
    const trimmed = part.trim();
    if (!trimmed) return;

    const newResult: (string | ReactElement)[] = [];
    result.forEach((segment) => {
      if (typeof segment !== "string") {
        newResult.push(segment);
        return;
      }
      const idx = segment.toLowerCase().indexOf(trimmed.toLowerCase());
      if (idx === -1) {
        newResult.push(segment);
        return;
      }
      if (idx > 0) newResult.push(segment.slice(0, idx));
      newResult.push(
        <span
          key={`hl-${partIdx}-${idx}`}
          className="rounded bg-primary-50 px-0.5 font-semibold text-primary-700"
        >
          {segment.slice(idx, idx + trimmed.length)}
        </span>
      );
      if (idx + trimmed.length < segment.length)
        newResult.push(segment.slice(idx + trimmed.length));
    });
    result = newResult;
  });

  return <>{result}</>;
}

/** Phase별 번호 뱃지 색상 */
const PHASE_STYLES: Record<string, { number: string }> = {
  green: { number: "bg-primary-100 text-primary-700" },
  blue: { number: "bg-primary-200 text-primary-700" },
  orange: { number: "bg-primary-300 text-primary-800" },
  red: { number: "bg-primary-500 text-white" },
};

export function PatternCard({
  pattern,
  number,
  phaseColor,
  patternType,
}: PatternCardProps) {
  const styles = PHASE_STYLES[phaseColor] ?? PHASE_STYLES.green;
  const [activeIdx, setActiveIdx] = useState(0);
  const activeExample = pattern.examples[activeIdx];
  const highlights = activeExample ? parseHighlights(activeExample.highlight) : [];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface transition-shadow hover:shadow-sm">
      {/* 패턴 영역: 번호 + 채워진 템플릿 + 번역 */}
      <div className="px-3 py-3 sm:px-5 sm:py-5">
        <div className="flex items-start gap-2.5 sm:gap-3">
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold sm:h-6 sm:w-6 sm:text-xs ${styles.number}`}
          >
            {number}
          </span>
          <div className="min-w-0 flex-1">
            {/* 채워진 영어 템플릿 */}
            <p className="text-[13px] font-bold leading-relaxed text-foreground sm:text-base">
              {highlights.length > 0
                ? renderFilledTemplate(pattern.template, highlights)
                : renderTemplate(pattern.template)}
            </p>
            {/* 한국어 번역 (원본 템플릿) */}
            <p className="mt-1 text-[12px] leading-snug text-foreground-secondary sm:mt-1.5 sm:text-sm">
              {pattern.translation}
            </p>
          </div>
        </div>
      </div>

      {/* 토픽 칩 + 선택된 예시 */}
      <div className="border-t border-border/50 px-3 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-2">
          {/* 토픽 칩 */}
          <div className="flex flex-1 flex-wrap gap-1.5">
            {pattern.examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all sm:text-xs ${
                  i === activeIdx
                    ? "bg-primary-500 text-white shadow-sm"
                    : "bg-primary-50 text-primary-600 hover:bg-primary-100"
                }`}
              >
                {ex.topic}
              </button>
            ))}
          </div>
          {/* TTS */}
          <PatternTtsButton
            audioSrc={`/patterns-audio/${patternType}/${pattern.id}_${activeIdx}.mp3`}
            size="sm"
          />
        </div>

        {/* 선택된 예시 문장 */}
        {activeExample && (
          <p className="mt-2.5 text-[12px] leading-relaxed text-foreground sm:text-[15px]">
            {renderExample(activeExample.sentence, activeExample.highlight)}
          </p>
        )}
      </div>
    </div>
  );
}
