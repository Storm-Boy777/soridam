"use client";

// 스크립트 렌더러
// - 본문: 플레인 텍스트 (서론/본론/결론)
// - 핵심 정리: 7가지 학습 콘텐츠 + 인터랙티브 하이라이트

import { useState, useMemo } from "react";
import {
  Star,
  ListOrdered,
  Bookmark,
  MessageCircle,
  Repeat2,
  HelpCircle,
  Lightbulb,
  MousePointerClick,
  ChevronRight,
} from "lucide-react";
import type {
  ScriptParagraph,
  ReusablePattern,
  StructureSummaryItem,
  KeySentence,
  KeyExpression,
  DiscourseMarker,
  SimilarQuestion,
  TargetLevel,
} from "@/lib/types/scripts";

const PARAGRAPH_LABELS: Record<string, { en: string; ko: string }> = {
  introduction: { en: "Introduction", ko: "도입" },
  body: { en: "Body", ko: "본문" },
  conclusion: { en: "Conclusion", ko: "마무리" },
};

// ── 하이라이트 카테고리 설정 ──

type HighlightCategory = "key_sentence" | "key_expression" | "discourse_marker";

const CATEGORY_META: Record<HighlightCategory, { mark: string }> = {
  key_sentence: { mark: "bg-amber-100 text-amber-900" },
  key_expression: { mark: "bg-primary-100 text-primary-900" },
  discourse_marker: { mark: "bg-emerald-100 text-emerald-900" },
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
    .map((text) => ({ text, category: itemCategoryMap.get(text) }))
    .filter((item): item is { text: string; category: HighlightCategory } => !!item.category)
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
          {paragraphs.map((para, pi) => {
            const labels = PARAGRAPH_LABELS[para.type] || {
              en: para.type,
              ko: para.label || para.type,
            };
            const showHeader = pi === 0 || paragraphs[pi - 1].type !== para.type;
            return (
              <div key={`${para.type}-${pi}`}>
                {showHeader && (
                  <div className="flex items-center gap-2 border-b border-border bg-surface-secondary px-4 py-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600">
                      {labels.en}
                    </span>
                    <span className="text-[10px] text-foreground-muted">
                      {labels.ko}
                    </span>
                  </div>
                )}
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
          {paragraphs.map((para, pi) => {
            const labels = PARAGRAPH_LABELS[para.type] || {
              en: para.type,
              ko: para.label || para.type,
            };
            const showHeader = pi === 0 || paragraphs[pi - 1].type !== para.type;
            return (
              <div key={`${para.type}-${pi}`}>
                {showHeader && (
                  <div className="flex items-center gap-2 border-b border-border bg-surface-secondary px-4 py-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600">
                      {labels.en}
                    </span>
                    <span className="text-[10px] text-foreground-muted">
                      {labels.ko}
                    </span>
                  </div>
                )}
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
      {paragraphs.map((para, pi) => {
        const labels = PARAGRAPH_LABELS[para.type] || {
          en: para.type,
          ko: para.label || para.type,
        };
        const showHeader = pi === 0 || paragraphs[pi - 1].type !== para.type;
        return (
          <div key={`${para.type}-${pi}`}>
            {showHeader && (
              <div className="flex items-center gap-2 border-b border-border bg-surface-secondary px-4 py-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
                  {labels.en}
                </span>
                <span className="text-[11px] text-foreground-muted">
                  {labels.ko}
                </span>
              </div>
            )}
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

// ── 핵심 정리 뷰 — 7가지 학습 콘텐츠 + 인터랙티브 하이라이트 ──

export function ScriptSummaryView({
  fullTextEnglish,
  paragraphs,
  structureSummary,
  keySentences,
  keyExpressions,
  discourseMarkers,
  reusablePatterns,
  similarQuestions,
  expansionIdeas,
  targetLevel,
}: {
  fullTextEnglish?: string;
  paragraphs?: ScriptParagraph[];
  structureSummary?: StructureSummaryItem[];
  keySentences?: KeySentence[];
  keyExpressions?: KeyExpression[];
  discourseMarkers?: DiscourseMarker[];
  reusablePatterns?: ReusablePattern[];
  similarQuestions?: SimilarQuestion[];
  expansionIdeas?: string[];
  targetLevel?: TargetLevel | null;
}) {
  const [activeItems, setActiveItems] = useState<Set<string>>(new Set());

  const expressions = keyExpressions ?? [];

  // 하이라이트 매핑: 텍스트 → 카테고리
  const itemCategoryMap = useMemo(() => {
    const map = new Map<string, HighlightCategory>();
    keySentences?.forEach((ks) => map.set(ks.english, "key_sentence"));
    expressions.forEach((e) => map.set(e.en, "key_expression"));
    discourseMarkers?.forEach((dm) => map.set(dm.en, "discourse_marker"));
    return map;
  }, [keySentences, expressions, discourseMarkers]);

  const toggleItem = (text: string) => {
    setActiveItems((prev) => {
      const next = new Set(prev);
      if (next.has(text)) next.delete(text);
      else next.add(text);
      return next;
    });
  };

  const hasHighlightableItems = itemCategoryMap.size > 0;
  const patterns = reusablePatterns || [];
  const showExpansion = !!(
    expansionIdeas?.length &&
    targetLevel &&
    ["IM3", "IH", "AL"].includes(targetLevel)
  );
  const hasContent =
    (keySentences?.length ?? 0) > 0 ||
    (structureSummary?.length ?? 0) > 0 ||
    expressions.length > 0 ||
    (discourseMarkers?.length ?? 0) > 0 ||
    patterns.length > 0 ||
    (similarQuestions?.length ?? 0) > 0 ||
    showExpansion;

  if (!hasContent) return null;

  return (
    <div className="space-y-6">
      {/* ── 사용 가이드 ── */}
      {hasHighlightableItems && (
        <div className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-primary-100 bg-primary-50/50 px-4 py-3">
          <MousePointerClick size={16} className="mt-0.5 shrink-0 text-primary-500" />
          <p className="text-[13px] leading-relaxed text-foreground-secondary">
            표현을 <span className="font-semibold text-foreground">클릭</span>하면
            아래 스크립트에서 해당 위치가 하이라이트됩니다.
          </p>
        </div>
      )}

      {/* ── 1. 핵심 문장 ── */}
      {keySentences && keySentences.length > 0 && (
        <SummarySection
          icon={Star}
          iconColor="text-amber-500"
          title="핵심 문장"
          count={keySentences.length}
          subtitle="이것만 외워도 절반은 성공"
        >
          <div className="space-y-2">
            {keySentences.map((ks, i) => (
              <button
                key={i}
                onClick={() => toggleItem(ks.english)}
                className={`w-full rounded-[var(--radius-lg)] border px-4 py-3 text-left transition-all ${
                  activeItems.has(ks.english)
                    ? "border-amber-400 bg-amber-50 shadow-sm"
                    : "border-border bg-surface hover:border-amber-200"
                }`}
              >
                <p className="text-[14px] font-medium leading-relaxed text-foreground">
                  {ks.english}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-foreground-secondary">
                  {ks.reason}
                </p>
              </button>
            ))}
          </div>
        </SummarySection>
      )}

      {/* ── 2. 뼈대 구조 ── */}
      {structureSummary && structureSummary.length > 0 && (
        <SummarySection
          icon={ListOrdered}
          iconColor="text-blue-500"
          title="뼈대 구조"
          subtitle="흐름만 기억해"
        >
          <div className="flex flex-col gap-1">
            {structureSummary.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="flex flex-col items-center pt-1">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-blue-300 bg-blue-50">
                    <span className="text-[10px] font-bold text-blue-500">
                      {i + 1}
                    </span>
                  </div>
                  {i < structureSummary.length - 1 && (
                    <div className="mt-0.5 h-4 w-px bg-blue-200" />
                  )}
                </div>
                <div className="flex-1 pb-1">
                  <span className="block text-[12px] font-semibold text-blue-600 sm:inline">
                    {item.tag}
                  </span>
                  <span className="block text-[13px] text-foreground-secondary sm:ml-2 sm:inline">
                    {item.description}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SummarySection>
      )}

      {/* ── 3. 핵심 표현 ── */}
      {expressions.length > 0 && (
        <SummarySection
          icon={Bookmark}
          iconColor="text-primary-500"
          title="핵심 표현"
          count={expressions.length}
          subtitle="알아두면 좋은 표현"
        >
          <div className="space-y-2">
            {expressions.map((expr, i) => (
              <button
                key={i}
                onClick={() => toggleItem(expr.en)}
                className={`w-full rounded-[var(--radius-lg)] border px-4 py-3 text-left transition-all ${
                  activeItems.has(expr.en)
                    ? "border-primary-400 bg-primary-50 shadow-sm"
                    : "border-border bg-surface hover:border-primary-200"
                }`}
              >
                <p className="text-[14px] font-medium text-foreground">
                  {expr.en}
                </p>
                {expr.ko && (
                  <p className="mt-0.5 text-[12px] text-foreground-secondary">
                    {expr.ko}
                  </p>
                )}
                {expr.tip && (
                  <p className="mt-1 text-[11px] italic text-foreground-muted">
                    {expr.tip}
                  </p>
                )}
              </button>
            ))}
          </div>
        </SummarySection>
      )}

      {/* ── 4. 담화 장치 ── */}
      {discourseMarkers && discourseMarkers.length > 0 && (
        <SummarySection
          icon={MessageCircle}
          iconColor="text-emerald-500"
          title="담화 장치"
          count={discourseMarkers.length}
          subtitle="자연스러운 연결과 시간벌기"
        >
          <div className="space-y-2">
            {discourseMarkers.map((dm, i) => (
              <button
                key={i}
                onClick={() => toggleItem(dm.en)}
                className={`w-full rounded-[var(--radius-lg)] border px-4 py-2.5 text-left transition-all ${
                  activeItems.has(dm.en)
                    ? "border-emerald-400 bg-emerald-50 shadow-sm"
                    : "border-border bg-surface hover:border-emerald-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-foreground">
                    {dm.en}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    {dm.function}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-foreground-secondary">
                  {dm.ko} · {dm.usage}
                </p>
              </button>
            ))}
          </div>
        </SummarySection>
      )}

      {/* ── 5. 만능 패턴 ── */}
      {patterns.length > 0 && (
        <SummarySection
          icon={Repeat2}
          iconColor="text-secondary-500"
          title="만능 패턴"
          count={patterns.length}
          subtitle="다른 주제에서도 바로 써먹는 문장 틀"
        >
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
        </SummarySection>
      )}

      {/* ── 6. 유사 질문 ── */}
      {similarQuestions && similarQuestions.length > 0 && (
        <SummarySection
          icon={HelpCircle}
          iconColor="text-violet-500"
          title="유사 질문"
          count={similarQuestions.length}
          subtitle="이 구조로 이것도 답할 수 있어"
        >
          <div className="space-y-2">
            {similarQuestions.map((sq, i) => (
              <div
                key={i}
                className="rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3"
              >
                <p className="text-[14px] font-medium text-foreground">
                  {sq.question}
                </p>
                <p className="mt-1 text-[12px] text-foreground-secondary">
                  {sq.reuse_hint}
                </p>
              </div>
            ))}
          </div>
        </SummarySection>
      )}

      {/* ── 7. 확장 아이디어 (IM3+) ── */}
      {showExpansion && (
        <SummarySection
          icon={Lightbulb}
          iconColor="text-yellow-500"
          title="확장 아이디어"
          subtitle="더 말하고 싶을 때"
        >
          <div className="space-y-1.5">
            {expansionIdeas!.map((idea, i) => (
              <div key={i} className="flex items-start gap-2 text-[13px]">
                <ChevronRight
                  size={14}
                  className="mt-0.5 shrink-0 text-yellow-500"
                />
                <span className="text-foreground-secondary">{idea}</span>
              </div>
            ))}
          </div>
        </SummarySection>
      )}

      {/* ── 하이라이트 적용된 스크립트 전문 ── */}
      {fullTextEnglish && hasHighlightableItems && (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
          <div className="flex items-center gap-2 border-b border-border bg-surface-secondary px-4 py-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
              Script Preview
            </span>
            {activeItems.size > 0 && (
              <span className="text-[10px] font-medium text-primary-500">
                {activeItems.size}개 하이라이트 중
              </span>
            )}
          </div>
          {paragraphs && paragraphs.length > 0 ? (
            paragraphs.map((para, pi) => {
              const paraLabels = PARAGRAPH_LABELS[para.type] || {
                en: para.type,
                ko: para.label || para.type,
              };
              const showHeader =
                pi === 0 || paragraphs[pi - 1].type !== para.type;
              const slotTexts = para.slots.map((slot) =>
                slot.sentences.map((s) => s.english).join(" ")
              );

              return (
                <div key={`${para.type}-${pi}`}>
                  {showHeader && (
                    <div className="flex items-center gap-2 border-b border-border bg-surface-secondary/50 px-4 py-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600">
                        {paraLabels.en}
                      </span>
                      <span className="text-[10px] text-foreground-muted">
                        {paraLabels.ko}
                      </span>
                    </div>
                  )}
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
            <div className="p-5 text-[15px] leading-[2]">
              {buildHighlightedSegments(
                fullTextEnglish,
                activeItems,
                itemCategoryMap
              ).map((seg, i) =>
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
    </div>
  );
}

// ── 섹션 래퍼 ──

function SummarySection({
  icon: Icon,
  iconColor,
  title,
  count,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
  title: string;
  count?: number;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-1.5">
        <Icon size={15} className={iconColor} />
        <h4 className="text-[13px] font-bold text-foreground">{title}</h4>
        {count !== undefined && (
          <span className="text-[11px] text-foreground-muted">({count})</span>
        )}
        {subtitle && (
          <span className="ml-1 text-[11px] text-foreground-muted">
            — {subtitle}
          </span>
        )}
      </div>
      {children}
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
