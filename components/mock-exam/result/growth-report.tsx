"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Target,
  Lightbulb,
  AlertTriangle,
  Zap,
  BarChart3,
  BookOpen,
} from "lucide-react";
import type {
  MockTestReport,
  GrowthComparison,
  GrowthAnalysis,
} from "@/lib/types/mock-exam";
import { OPIC_LEVEL_ORDER, FACT_LABELS } from "@/lib/types/mock-exam";

// question_type 한글 매핑
const QT_KO: Record<string, string> = {
  description: "묘사",
  routine: "루틴",
  rp_11: "질문하기",
  comparison: "비교",
  past_childhood: "어릴 때",
  past_special: "특별 경험",
  past_recent: "최근 경험",
  past_habitual: "과거 습관",
  rp_12: "대안제시",
  adv_14: "비교변화",
  adv_15: "의견제시",
};

// FACT 색상 매핑
const FACT_COLORS: Record<string, string> = {
  F: "text-blue-600",
  A: "text-green-600",
  C: "text-orange-600",
  T: "text-purple-600",
};

// 훈련 유형 한글 매핑
const TRAINING_KO: Record<string, string> = {
  epp: "표현 확장 훈련",
  forced_variation: "경험 확장 훈련",
  timed_practice: "시간 제한 훈련",
  self_repair: "자기 수정 훈련",
  oral_transformation: "문법 교정 훈련",
};

interface GrowthReportProps {
  report: MockTestReport;
}

export function GrowthReport({ report }: GrowthReportProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const comparison = report.growth_comparison;
  const analysis = report.growth_analysis;

  // 1회차이거나 데이터 없으면 표시 안 함
  if (!comparison || !comparison.previous_session_id) return null;
  // analysis 없으면 비교 데이터만 표시
  const hasAnalysis = !!analysis;

  return (
    <div className="rounded-xl border-2 border-primary-100 bg-surface">
      {/* 헤더 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 sm:p-6"
      >
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-primary-500" />
          <h3 className="font-semibold text-foreground">성장 리포트</h3>
          <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-600">
            {comparison.session_count}회차
          </span>
        </div>
        <span className="flex items-center gap-1 text-sm text-primary-500">
          {isExpanded ? "접기" : "펼치기"}
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-border px-4 pb-4 space-y-4 sm:px-6 sm:pb-6">
          {/* ① 한 줄 요약 */}
          {report.growth_summary && (
            <div className="rounded-lg bg-primary-50/50 p-3 mt-4">
              <p className="text-sm font-medium text-foreground leading-relaxed">
                {report.growth_summary}
              </p>
            </div>
          )}

          {/* ② 결과 변화 표 */}
          <ComparisonTable report={report} comparison={comparison} />

          {/* ③ 등급 변화 원인 */}
          {hasAnalysis && analysis.level_change_reason && (
            <Section
              icon={<BarChart3 size={14} className="text-primary-500" />}
              title="등급 변화 원인"
            >
              <p className="text-[12px] text-foreground-secondary leading-relaxed">
                {analysis.level_change_reason}
              </p>
            </Section>
          )}

          {/* ④ FACT별 해석 */}
          {hasAnalysis && analysis.fact_comments && (
            <Section
              icon={<Lightbulb size={14} className="text-primary-500" />}
              title="영역별 변화 해석"
            >
              <div className="space-y-2">
                {(["F", "A", "C", "T"] as const).map((key) => {
                  const comment = analysis.fact_comments[key];
                  if (!comment) return null;
                  const diff = comparison[`score_${key.toLowerCase()}_diff` as keyof GrowthComparison] as number;
                  return (
                    <div key={key} className="flex items-start gap-2">
                      <span className={`shrink-0 text-[11px] font-bold mt-0.5 w-16 ${FACT_COLORS[key]}`}>
                        {FACT_LABELS[key]}
                        {diff != null && (
                          <span className={`ml-1 text-[9px] ${diff > 0 ? "text-green-500" : diff < 0 ? "text-red-400" : "text-foreground-muted"}`}>
                            {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                          </span>
                        )}
                      </span>
                      <p className="text-[11px] text-foreground-secondary leading-relaxed">{comment}</p>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* ⑤ 유형별 비교 */}
          {comparison.type_comparison && comparison.type_comparison.length > 0 && (
            <TypeComparisonSection items={comparison.type_comparison} />
          )}

          {/* ⑥ 병목 분석 */}
          {hasAnalysis && analysis.bottleneck && (
            <Section
              icon={<AlertTriangle size={14} className="text-yellow-500" />}
              title="현재 병목"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${FACT_COLORS[analysis.bottleneck.primary]} bg-surface-secondary`}>
                  {FACT_LABELS[analysis.bottleneck.primary] || analysis.bottleneck.primary}
                </span>
                <span className="text-[10px] text-foreground-muted">
                  다음 등급 진입의 가장 큰 장벽
                </span>
              </div>
              <p className="text-[11px] text-foreground-secondary leading-relaxed">
                {analysis.bottleneck.reason}
              </p>
            </Section>
          )}

          {/* ⑦ 추천 행동 + 튜터링 CTA */}
          {hasAnalysis && analysis.recommended_actions && analysis.recommended_actions.length > 0 && (
            <RecommendedActions actions={analysis.recommended_actions} />
          )}

          {/* 성장 패턴 안내 (Phase D: 3회차+) */}
          {hasAnalysis && analysis.growth_pattern && analysis.pattern_message && (
            <div className="rounded-lg border border-primary-100 bg-primary-50/30 p-3">
              <p className="text-[10px] font-medium text-primary-600 mb-1">
                성장 패턴 감지
              </p>
              <p className="text-[11px] text-foreground-secondary leading-relaxed">
                {analysis.pattern_message}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 섹션 래퍼 ──

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <h5 className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
        {icon}
        {title}
      </h5>
      {children}
    </div>
  );
}

// ── ② 결과 변화 표 ──

function ComparisonTable({
  report,
  comparison,
}: {
  report: MockTestReport;
  comparison: GrowthComparison;
}) {
  const rows = [
    {
      label: "예상 등급",
      prev: comparison.previous_level,
      curr: report.final_level || "—",
      diff: comparison.level_diff,
      type: "level" as const,
    },
    {
      label: "총점",
      prev: comparison.previous_total_score?.toFixed(1),
      curr: Number(report.total_score ?? 0).toFixed(1),
      diff: comparison.score_diff,
      type: "score" as const,
    },
    {
      label: FACT_LABELS.F,
      prev: comparison.previous_score_f?.toFixed(1),
      curr: Number(report.score_f ?? 0).toFixed(1),
      diff: comparison.score_f_diff,
      type: "score" as const,
    },
    {
      label: FACT_LABELS.A,
      prev: comparison.previous_score_a?.toFixed(1),
      curr: Number(report.score_a ?? 0).toFixed(1),
      diff: comparison.score_a_diff,
      type: "score" as const,
    },
    {
      label: FACT_LABELS.C,
      prev: comparison.previous_score_c?.toFixed(1),
      curr: Number(report.score_c ?? 0).toFixed(1),
      diff: comparison.score_c_diff,
      type: "score" as const,
    },
    {
      label: FACT_LABELS.T,
      prev: comparison.previous_score_t?.toFixed(1),
      curr: Number(report.score_t ?? 0).toFixed(1),
      diff: comparison.score_t_diff,
      type: "score" as const,
    },
  ];

  return (
    <div className="rounded-lg border border-border overflow-hidden mt-3">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="bg-surface-secondary/50">
            <th className="py-2 px-3 text-left font-medium text-foreground-muted">항목</th>
            <th className="py-2 px-2 text-right font-medium text-foreground-muted">이전</th>
            <th className="py-2 px-2 text-right font-medium text-foreground-muted">현재</th>
            <th className="py-2 px-3 text-right font-medium text-foreground-muted">변화</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-border/50">
              <td className="py-2 px-3 font-medium text-foreground-secondary">{row.label}</td>
              <td className="py-2 px-2 text-right text-foreground-muted">{row.prev}</td>
              <td className="py-2 px-2 text-right font-medium text-foreground">{row.curr}</td>
              <td className="py-2 px-3 text-right">
                <DiffBadge diff={row.diff} type={row.type} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiffBadge({ diff, type }: { diff: number; type: "level" | "score" }) {
  if (diff == null || diff === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-foreground-muted">
        <Minus size={10} />
        유지
      </span>
    );
  }

  const isUp = diff > 0;
  const color = isUp ? "text-green-600" : "text-red-500";
  const Icon = isUp ? TrendingUp : TrendingDown;
  const label = type === "level"
    ? `${isUp ? "+" : ""}${diff}단계`
    : `${isUp ? "+" : ""}${diff.toFixed(1)}`;

  return (
    <span className={`inline-flex items-center gap-0.5 font-medium ${color}`}>
      <Icon size={10} />
      {label}
    </span>
  );
}

// ── ⑤ 유형별 비교 ──

function TypeComparisonSection({
  items,
}: {
  items: GrowthComparison["type_comparison"];
}) {
  const [showAll, setShowAll] = useState(false);
  const displayItems = showAll ? items : items.slice(0, 5);

  return (
    <Section
      icon={<BookOpen size={14} className="text-primary-500" />}
      title="유형별 달성률 비교"
    >
      <div className="space-y-1.5">
        {displayItems.map((item) => (
          <div key={item.type} className="flex items-center gap-2">
            <span className="w-16 text-[10px] text-foreground-secondary shrink-0">
              {QT_KO[item.type] || item.type}
            </span>
            {/* 프로그레스 바 */}
            <div className="flex-1 h-2 rounded-full bg-surface-secondary relative">
              {/* 이전 (점선) */}
              {item.previous_pass_rate != null && (
                <div
                  className="absolute top-0 h-2 border-r-2 border-dashed border-foreground-muted/40"
                  style={{ left: `${Math.min(item.previous_pass_rate * 100, 100)}%` }}
                />
              )}
              {/* 현재 */}
              <div
                className={`h-2 rounded-full transition-all ${
                  item.current_pass_rate >= 0.9 ? "bg-green-400" :
                  item.current_pass_rate < 0.7 ? "bg-red-400" :
                  "bg-primary-400"
                }`}
                style={{ width: `${Math.min(item.current_pass_rate * 100, 100)}%` }}
              />
            </div>
            <span className="w-10 text-right text-[10px] font-medium text-foreground">
              {(item.current_pass_rate * 100).toFixed(0)}%
            </span>
            {/* 변화 */}
            <span className={`w-10 text-right text-[9px] font-medium ${
              item.change == null ? "text-foreground-muted" :
              item.change > 0 ? "text-green-600" :
              item.change < 0 ? "text-red-500" : "text-foreground-muted"
            }`}>
              {item.change == null
                ? "신규"
                : item.change > 0
                  ? `+${(item.change * 100).toFixed(0)}%`
                  : item.change < 0
                    ? `${(item.change * 100).toFixed(0)}%`
                    : "±0"}
            </span>
          </div>
        ))}
      </div>
      {items.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 text-[10px] text-primary-500 hover:text-primary-600"
        >
          {showAll ? "접기" : `+${items.length - 5}개 더보기`}
        </button>
      )}
    </Section>
  );
}

// ── ⑦ 추천 행동 + 튜터링 CTA ──

function RecommendedActions({
  actions,
}: {
  actions: GrowthAnalysis["recommended_actions"];
}) {
  const labels = ["이번 주 반드시", "다음 모의고사 전", "시험장에서 주의"];

  return (
    <div className="rounded-xl border-2 border-primary-200 bg-primary-50/30 p-3 sm:p-4">
      <h5 className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-3">
        <Target size={14} className="text-primary-500" />
        추천 행동
      </h5>
      <div className="space-y-2.5">
        {actions.map((action, i) => (
          <div key={action.priority} className="flex items-start gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-600">
              {action.priority}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-primary-600 font-medium mb-0.5">
                {labels[i] || `우선순위 ${action.priority}`}
              </p>
              <p className="text-[11px] text-foreground-secondary leading-relaxed">
                {action.action}
              </p>
              {action.training_type && TRAINING_KO[action.training_type] && (
                <a
                  href={`/tutoring?tab=prescription&focus=${action.training_type}`}
                  className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-1 text-[9px] font-medium text-primary-700 hover:bg-primary-200 transition-colors"
                >
                  <Zap size={10} />
                  {TRAINING_KO[action.training_type]} 시작
                  <ArrowRight size={8} />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
