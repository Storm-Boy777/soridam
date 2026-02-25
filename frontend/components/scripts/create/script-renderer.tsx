"use client";

// 스크립트 렌더러
// - 본문: 플레인 텍스트 (서론/본론/결론)
// - 핵심 정리: 인터랙티브 하이라이트 (뱃지 클릭 → 해당 항목만 스크립트에서 강조)

import { useState, useMemo } from "react";
import {
  Bookmark,
  ArrowRightLeft,
  MessageCircle,
  Repeat2,
  MousePointerClick,
} from "lucide-react";
import type {
  ScriptParagraph,
  ReusablePattern,
} from "@/lib/types/scripts";

const PARAGRAPH_LABELS: Record<string, { en: string; ko: string }> = {
  introduction: { en: "Introduction", ko: "도입" },
  body: { en: "Body", ko: "본문" },
  conclusion: { en: "Conclusion", ko: "마무리" },
};

// ── 하이라이트 카테고리 설정 ──

type HighlightCategory = "expression" | "connector" | "filler";

const CATEGORY_META: Record<
  HighlightCategory,
  {
    label: string;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    iconColor: string;
    pill: string;
    pillActive: string;
    mark: string;
  }
> = {
  expression: {
    label: "핵심 표현",
    Icon: Bookmark,
    iconColor: "text-primary-500",
    pill: "border-primary-200 bg-primary-50 text-primary-700",
    pillActive: "border-primary-500 bg-primary-500 text-white shadow-sm",
    mark: "bg-primary-100 text-primary-900",
  },
  connector: {
    label: "연결어",
    Icon: ArrowRightLeft,
    iconColor: "text-emerald-500",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
    pillActive: "border-emerald-500 bg-emerald-500 text-white shadow-sm",
    mark: "bg-emerald-100 text-emerald-900",
  },
  filler: {
    label: "필러",
    Icon: MessageCircle,
    iconColor: "text-foreground-muted",
    pill: "border-border bg-surface-secondary text-foreground-secondary",
    pillActive:
      "border-foreground-muted bg-foreground-muted text-white shadow-sm",
    mark: "bg-amber-100 text-amber-900",
  },
};

// ── 텍스트 하이라이트 유틸리티 ──

interface TextSegment {
  text: string;
  category?: HighlightCategory;
}

function buildHighlightedSegments(
  scriptText: string,
  activeItems: Set<string>,
  itemCategoryMap: Map<string, HighlightCategory>
): TextSegment[] {
  if (activeItems.size === 0) {
    return [{ text: scriptText }];
  }

  // 활성 아이템만 필터 → 길이 내림차순 정렬 (긴 것 우선 매칭)
  const items = Array.from(activeItems)
    .map((text) => ({ text, category: itemCategoryMap.get(text)! }))
    .filter((item) => item.category)
    .sort((a, b) => b.text.length - a.text.length);

  // 매칭 위치 탐색 (대소문자 무시)
  const matches: { start: number; end: number; category: HighlightCategory }[] =
    [];
  const lowerScript = scriptText.toLowerCase();

  for (const item of items) {
    const lowerItem = item.text.toLowerCase().trim();
    if (!lowerItem) continue;

    let pos = 0;
    while ((pos = lowerScript.indexOf(lowerItem, pos)) !== -1) {
      // 기존 매칭과 겹치지 않는지 확인
      const overlaps = matches.some(
        (m) => pos < m.end && pos + lowerItem.length > m.start
      );
      if (!overlaps) {
        matches.push({
          start: pos,
          end: pos + lowerItem.length,
          category: item.category,
        });
      }
      pos += 1;
    }
  }

  if (matches.length === 0) {
    return [{ text: scriptText }];
  }

  // 위치순 정렬 → 세그먼트 구축
  matches.sort((a, b) => a.start - b.start);

  const segments: TextSegment[] = [];
  let lastEnd = 0;

  for (const match of matches) {
    if (match.start > lastEnd) {
      segments.push({ text: scriptText.substring(lastEnd, match.start) });
    }
    segments.push({
      text: scriptText.substring(match.start, match.end),
      category: match.category,
    });
    lastEnd = match.end;
  }

  if (lastEnd < scriptText.length) {
    segments.push({ text: scriptText.substring(lastEnd) });
  }

  return segments;
}

// ── 단락 기반 스크립트 렌더러 (4가지 보기 모드) ──

export type ScriptViewMode = "both" | "en" | "ko" | "split";

export function ScriptRenderer({
  paragraphs,
  mode = "both",
}: {
  paragraphs: ScriptParagraph[];
  mode?: ScriptViewMode;
}) {
  // 영/한 구분: 영어 전체 → 한글 전체
  if (mode === "split") {
    return (
      <div className="space-y-3">
        {/* 영어 블록 */}
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
          {paragraphs.map((para) => {
            const labels = PARAGRAPH_LABELS[para.type] || {
              en: para.type,
              ko: para.label || para.type,
            };
            return (
              <div key={para.type}>
                <div className="flex items-center gap-2 border-b border-border bg-surface-secondary px-4 py-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600">
                    {labels.en}
                  </span>
                  <span className="text-[10px] text-foreground-muted">
                    {labels.ko}
                  </span>
                </div>
                <div className="px-4 py-3 sm:px-5">
                  <div className="space-y-2">
                    {para.slots.map((slot, si) => (
                      <p key={si} className="text-[15px] leading-[1.9]">
                        {slot.sentences.map((s) => s.english).join(" ")}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* 한글 블록 */}
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
          {paragraphs.map((para) => {
            const labels = PARAGRAPH_LABELS[para.type] || {
              en: para.type,
              ko: para.label || para.type,
            };
            return (
              <div key={para.type}>
                <div className="flex items-center gap-2 border-b border-border bg-surface-secondary px-4 py-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600">
                    {labels.en}
                  </span>
                  <span className="text-[10px] text-foreground-muted">
                    {labels.ko}
                  </span>
                </div>
                <div className="px-4 py-3 sm:px-5">
                  <div className="space-y-2">
                    {para.slots.map((slot, si) => (
                      <p
                        key={si}
                        className="text-[14px] leading-relaxed text-foreground-secondary"
                      >
                        {slot.sentences.map((s) => s.korean).join(" ")}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // both / en / ko: 단락별 슬롯 기반 렌더링
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
      {paragraphs.map((para) => {
        const labels = PARAGRAPH_LABELS[para.type] || {
          en: para.type,
          ko: para.label || para.type,
        };
        return (
          <div key={para.type}>
            <div className="flex items-center gap-2 border-b border-border bg-surface-secondary px-4 py-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
                {labels.en}
              </span>
              <span className="text-[11px] text-foreground-muted">
                {labels.ko}
              </span>
            </div>
            <div className="px-4 py-3.5 sm:px-5">
              <div className="space-y-3">
                {para.slots.map((slot, si) => {
                  const enText = slot.sentences
                    .map((s) => s.english)
                    .join(" ");
                  const koText = slot.sentences
                    .map((s) => s.korean)
                    .join(" ");
                  return (
                    <div key={si}>
                      {mode !== "ko" && (
                        <p className="text-[15px] leading-[1.9]">{enText}</p>
                      )}
                      {mode !== "en" && koText && (
                        <p
                          className={`text-[13px] leading-relaxed text-foreground-secondary ${
                            mode === "both"
                              ? "mt-1.5 border-l-2 border-primary-200 pl-3"
                              : ""
                          }`}
                        >
                          {koText}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 핵심 정리 뷰 — 인터랙티브 하이라이트 ──

export function ScriptSummaryView({
  fullTextEnglish,
  paragraphs,
  keyExpressions,
  reusablePatterns,
  connectors,
  fillers,
}: {
  fullTextEnglish?: string;
  paragraphs?: ScriptParagraph[];
  keyExpressions?: string[];
  reusablePatterns?: ReusablePattern[];
  connectors?: string[];
  fillers?: string[];
}) {
  const [activeItems, setActiveItems] = useState<Set<string>>(new Set());

  // 카테고리 → 아이템 목록
  const categoryItems = useMemo(() => {
    const map = new Map<HighlightCategory, string[]>();
    if (keyExpressions?.length) map.set("expression", keyExpressions);
    if (connectors?.length) map.set("connector", connectors);
    if (fillers?.length) map.set("filler", fillers);
    return map;
  }, [keyExpressions, connectors, fillers]);

  // 아이템 → 카테고리 역매핑 (하이라이트 색상 결정용)
  const itemCategoryMap = useMemo(() => {
    const map = new Map<string, HighlightCategory>();
    for (const [cat, items] of categoryItems) {
      for (const item of items) {
        map.set(item, cat);
      }
    }
    return map;
  }, [categoryItems]);

  // 개별 아이템 토글
  const toggleItem = (text: string) => {
    setActiveItems((prev) => {
      const next = new Set(prev);
      if (next.has(text)) next.delete(text);
      else next.add(text);
      return next;
    });
  };

  // 카테고리 전체 토글
  const toggleCategory = (category: HighlightCategory) => {
    const items = categoryItems.get(category) || [];
    setActiveItems((prev) => {
      const next = new Set(prev);
      const allActive = items.every((i) => next.has(i));
      if (allActive) {
        items.forEach((i) => next.delete(i));
      } else {
        items.forEach((i) => next.add(i));
      }
      return next;
    });
  };

  // 하이라이트 세그먼트 생성
  const segments = useMemo(
    () =>
      fullTextEnglish
        ? buildHighlightedSegments(fullTextEnglish, activeItems, itemCategoryMap)
        : [],
    [fullTextEnglish, activeItems, itemCategoryMap]
  );

  const patterns = reusablePatterns || [];
  const hasContent = categoryItems.size > 0 || patterns.length > 0;

  if (!hasContent) return null;

  return (
    <div className="space-y-5">
      {/* ── 사용 가이드 ── */}
      {categoryItems.size > 0 && (
        <div className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-primary-100 bg-primary-50/50 px-4 py-3">
          <MousePointerClick size={16} className="mt-0.5 shrink-0 text-primary-500" />
          <p className="text-[13px] leading-relaxed text-foreground-secondary">
            아래 표현을 <span className="font-semibold text-foreground">클릭</span>하면
            스크립트에서 해당 위치가 하이라이트됩니다.
            카테고리 이름을 클릭하면 전체 선택/해제됩니다.
          </p>
        </div>
      )}

      {/* ── 카테고리별 클릭 가능한 뱃지 ── */}
      {Array.from(categoryItems.entries()).map(([category, items]) => {
        const meta = CATEGORY_META[category];
        const { Icon } = meta;
        const allActive = items.every((i) => activeItems.has(i));
        const someActive = items.some((i) => activeItems.has(i));

        return (
          <div key={category}>
            {/* 카테고리 헤더 (클릭 → 전체 토글) */}
            <button
              onClick={() => toggleCategory(category)}
              className="group mb-2 flex items-center gap-1.5"
            >
              <Icon size={15} className={meta.iconColor} />
              <span className="text-[13px] font-bold text-foreground group-hover:text-primary-600 transition-colors">
                {meta.label}
              </span>
              <span className="text-[11px] text-foreground-muted">
                ({items.length})
              </span>
              {allActive && (
                <span className="ml-1 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-600">
                  ON
                </span>
              )}
              {someActive && !allActive && (
                <span className="ml-1 rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] font-medium text-foreground-muted">
                  일부
                </span>
              )}
            </button>

            {/* 개별 아이템 필 */}
            <div className="flex flex-wrap gap-1.5">
              {items.map((item, i) => {
                const isActive = activeItems.has(item);
                return (
                  <button
                    key={i}
                    onClick={() => toggleItem(item)}
                    className={`inline-flex rounded-full border px-3 py-1.5 text-[13px] font-medium transition-all duration-150 ${
                      isActive ? meta.pillActive : meta.pill
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── 하이라이트 적용된 스크립트 전문 (단락별 정렬) ── */}
      {fullTextEnglish && (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
          {paragraphs && paragraphs.length > 0 ? (
            paragraphs.map((para) => {
              const paraLabels = PARAGRAPH_LABELS[para.type] || {
                en: para.type,
                ko: para.label || para.type,
              };
              // 이 단락의 전체 텍스트를 슬롯별로 추출
              const slotTexts = para.slots.map((slot) =>
                slot.sentences.map((s) => s.english).join(" ")
              );

              return (
                <div key={para.type}>
                  {/* 단락 헤더 */}
                  <div className="flex items-center gap-2 border-b border-border bg-surface-secondary px-4 py-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600">
                      {paraLabels.en}
                    </span>
                    <span className="text-[10px] text-foreground-muted">
                      {paraLabels.ko}
                    </span>
                  </div>
                  {/* 슬롯별 텍스트 + 하이라이트 */}
                  <div className="px-4 py-3 sm:px-5">
                    <div className="space-y-2 text-[15px] leading-[1.9]">
                      {slotTexts.map((slotText, si) => {
                        const slotSegments = buildHighlightedSegments(
                          slotText,
                          activeItems,
                          itemCategoryMap
                        );
                        return (
                          <p key={si}>
                            {slotSegments.map((seg, j) =>
                              seg.category ? (
                                <mark
                                  key={j}
                                  className={`${CATEGORY_META[seg.category].mark} rounded-sm px-0.5 font-semibold`}
                                >
                                  {seg.text}
                                </mark>
                              ) : (
                                <span key={j}>{seg.text}</span>
                              )
                            )}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            // paragraphs 없으면 fullText 폴백
            <div className="p-5 text-[15px] leading-[2]">
              {segments.map((seg, i) =>
                seg.category ? (
                  <mark
                    key={i}
                    className={`${CATEGORY_META[seg.category].mark} rounded-sm px-0.5 font-semibold`}
                  >
                    {seg.text}
                  </mark>
                ) : (
                  <span key={i}>{seg.text}</span>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 만능 패턴 카드 ── */}
      {patterns.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-1.5">
            <Repeat2 size={15} className="text-secondary-500" />
            <h4 className="text-[13px] font-bold text-foreground">
              만능 패턴
              <span className="ml-1.5 text-xs font-normal text-foreground-muted">
                — 다른 주제에서도 바로 써먹는 문장 틀
              </span>
            </h4>
          </div>
          <div className="space-y-2">
            {patterns.map((p, i) => (
              <div
                key={i}
                className="rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3.5"
              >
                <div className="text-[14px] font-semibold leading-relaxed text-secondary-500">
                  {p.template.split("___").map((seg, si, arr) => (
                    <span key={si}>
                      {seg}
                      {si < arr.length - 1 && (
                        <span className="mx-0.5 inline-block min-w-[50px] border-b-2 border-dashed border-secondary-300 text-xs font-normal text-foreground-muted">
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                        </span>
                      )}
                    </span>
                  ))}
                </div>
                <div className="mt-1.5 text-xs leading-relaxed text-foreground-secondary">
                  <span className="font-medium text-foreground-muted">KO</span>{" "}
                  {p.description_ko}
                </div>
                {p.example && (
                  <div className="mt-1 text-xs italic text-foreground-muted">
                    ex. {p.example}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 플랫 텍스트 폴백 (paragraphs가 없을 때) ──

export function ScriptFlatText({
  englishText,
  koreanTranslation,
  mode = "both",
}: {
  englishText: string;
  koreanTranslation?: string | null;
  mode?: ScriptViewMode;
}) {
  return (
    <div className="space-y-3">
      {mode !== "ko" && (
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
          <div className="whitespace-pre-wrap text-[15px] leading-[2] text-foreground">
            {englishText}
          </div>
        </div>
      )}
      {mode !== "en" && koreanTranslation && (
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground-secondary">
            {koreanTranslation}
          </div>
        </div>
      )}
    </div>
  );
}
