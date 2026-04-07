
import type { ReactElement } from "react";
import type { UniversalPattern } from "@/lib/types/patterns";
import { PatternTtsButton } from "./pattern-tts-button";

interface PatternCardProps {
  pattern: UniversalPattern;
  /** 1-based 번호 (Phase 내 순번) */
  number: number;
  /** Phase 색상 (1~4) */
  phaseColor: string;
  /** 패턴 타입 (폴더명, 예: "description") */
  patternType: string;
  /** 학습 모드에서는 예시 기본 숨김 */
  studyMode?: boolean;
}

/** 템플릿에서 [변수] 부분을 인라인 뱃지로 렌더링 */
function renderTemplate(template: string) {
  const parts = template.split(/(\[.*?\])/g);
  return parts.map((part, i) =>
    part.startsWith("[") && part.endsWith("]") ? (
      <span
        key={i}
        className="inline-block rounded bg-primary-500/15 px-1.5 py-0.5 font-semibold text-primary-600"
      >
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/** 예시 문장에서 highlight 부분을 강조 표시 */
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
          className="font-medium text-primary-600 underline decoration-primary-300 underline-offset-2"
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

/** Phase별 좌측 액센트 + 번호 뱃지 색상 (톤온톤) */
const PHASE_STYLES: Record<string, { accent: string; number: string }> = {
  green: {
    accent: "border-l-primary-400",
    number: "bg-primary-100 text-primary-700",
  },
  blue: {
    accent: "border-l-primary-500",
    number: "bg-primary-200 text-primary-700",
  },
  orange: {
    accent: "border-l-primary-600",
    number: "bg-primary-300 text-primary-800",
  },
  red: {
    accent: "border-l-primary-700",
    number: "bg-primary-500 text-white",
  },
};

export function PatternCard({
  pattern,
  number,
  phaseColor,
  patternType,
  studyMode = false,
}: PatternCardProps) {
  const styles = PHASE_STYLES[phaseColor] ?? PHASE_STYLES.green;

  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-surface transition-shadow hover:shadow-sm"
    >
      {/* 패턴 영역: 번호 + 템플릿 + 번역 */}
      <div className="px-3 py-3 sm:px-5 sm:py-5">
        <div className="flex items-start gap-2.5 sm:gap-3">
          {/* 패턴 번호 뱃지 */}
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold sm:h-6 sm:w-6 sm:text-xs ${styles.number}`}
          >
            {number}
          </span>
          <div className="flex-1 min-w-0">
            {/* 영어 템플릿 */}
            <p className="text-[13px] font-bold leading-relaxed text-foreground sm:text-base">
              {renderTemplate(pattern.template)}
            </p>
            {/* 한국어 번역 */}
            <p className="mt-1 text-[12px] leading-snug text-foreground-secondary sm:mt-1.5 sm:text-sm">
              {pattern.translation}
            </p>
          </div>
        </div>
      </div>

      {/* 예시 목록 */}
      <div className="border-t border-border/50">
        <div className="divide-y divide-border/40 px-3 sm:px-5">
          {pattern.examples.map((ex, i) => (
            <div key={i} className="flex items-center gap-2 py-2.5 sm:gap-3 sm:py-3">
              <span className="inline-flex min-w-12 shrink-0 items-center justify-center rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700 whitespace-nowrap sm:min-w-14 sm:px-2.5 sm:text-xs">
                {ex.topic}
              </span>
              <p className="flex-1 text-[12px] leading-relaxed text-foreground sm:text-[15px]">
                {renderExample(ex.sentence, ex.highlight)}
              </p>
              <PatternTtsButton
                audioSrc={`/patterns-audio/${patternType}/${pattern.id}_${i}.mp3`}
                size="sm"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
