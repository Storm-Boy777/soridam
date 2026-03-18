"use client";

// 진단 탭: S3(Top3) + S5(유형맵) + S6(반복패턴) + S7(발음·습관)
import { useState } from "react";
import {
  Target,
  BookOpen,
  Repeat,
  Volume2,
  Mic2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Star,
} from "lucide-react";
import type {
  MockTestReport,
  CoachingReport,
  Top3Priority,
  QuestionTypeMapItem,
  RecurringPattern,
} from "@/lib/types/mock-exam";
import { getPronunciationLabel } from "@/lib/types/mock-exam";
import {
  QT_KO,
  TYPE_MAP_KO,
  CATEGORY_KO,
  AREA_KO,
  AREA_COLOR,
  STATUS_KO,
  getStatusColor,
  getSeverityColor,
} from "./shared-helpers";

interface DiagnosisTabProps {
  report: MockTestReport;
  coaching: CoachingReport | null;
}

export function DiagnosisTab({ report, coaching }: DiagnosisTabProps) {
  const priorities = coaching?.top3_priorities;
  const typeMap = coaching?.question_type_map;
  const patterns = coaching?.recurring_patterns;
  const di = coaching?.delivery_interpretation;
  const strengths = coaching?.strengths;

  return (
    <div className="space-y-4">
      {/* ═══ S3: 먼저 고칠 Top 3 ═══ */}
      {priorities && priorities.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
          <h4 className="flex items-center gap-2 font-semibold text-foreground mb-4">
            <Target size={16} className="text-primary-500" />
            먼저 고칠 Top 3
          </h4>
          <div className="space-y-3">
            {priorities.map((p) => (
              <PriorityCard key={p.rank} priority={p} />
            ))}
          </div>
        </div>
      )}

      {/* ═══ S5: 유형별 진단 맵 ═══ */}
      {typeMap && typeMap.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
          <h4 className="flex items-center gap-2 font-semibold text-foreground mb-4">
            <BookOpen size={16} className="text-primary-500" />
            유형별 진단
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {typeMap.map((item) => (
              <div
                key={item.type}
                className={`rounded-lg border p-2.5 ${
                  item.priority ? "border-red-200 bg-red-50/30" : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-center gap-1 mb-1">
                  <span className="text-xs font-medium text-foreground">
                    {TYPE_MAP_KO[item.type] || QT_KO[item.type] || item.type}
                  </span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold shrink-0 ${getStatusColor(item.status)}`}>
                    {STATUS_KO[item.status] || item.status}
                  </span>
                </div>
                <p className="text-[11px] text-foreground-muted leading-relaxed">{item.comment}</p>
                {item.priority && (
                  <p className="mt-1 text-[10px] font-medium text-red-500 flex items-center gap-0.5">
                    <Target size={8} />
                    우선 훈련
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ S6: 반복 오류 패턴 ═══ */}
      {patterns && patterns.length > 0 && <PatternsSection patterns={patterns} />}

      {/* ═══ S7: 말하기 습관/발음 + 강점 ═══ */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        <h4 className="flex items-center gap-2 font-semibold text-foreground mb-4">
          <Volume2 size={16} className="text-primary-500" />
          말하기 습관 & 발음
        </h4>

        {report.avg_accuracy_score != null && Number(report.avg_accuracy_score) > 0 && (
          <div className="flex flex-wrap gap-3 mb-3">
            {[
              { label: "정확도", value: Number(report.avg_accuracy_score) || 0 },
              { label: "운율", value: Number(report.avg_prosody_score) || 0 },
              { label: "유창성", value: Number(report.avg_fluency_score) || 0 },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <Mic2 size={12} className="text-primary-400" />
                <span className="text-xs text-foreground-secondary">{item.label}</span>
                <span className={`text-sm font-bold ${getPronunciationLabel(item.value).color}`}>
                  {item.value.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        )}

        {di && (
          <div className="space-y-2">
            {[
              { label: "답변 길이", text: di.duration_comment },
              { label: "필러", text: di.filler_comment },
              { label: "침묵", text: di.pause_comment },
              { label: "발음", text: di.pronunciation_comment },
              { label: "전반 전달", text: di.overall_delivery },
            ]
              .filter((item) => item.text)
              .map((item) => (
                <div key={item.label} className="flex items-start gap-2">
                  <span className="w-14 shrink-0 text-xs font-medium text-foreground-muted mt-0.5">{item.label}</span>
                  <p className="text-xs text-foreground-secondary leading-relaxed">{item.text}</p>
                </div>
              ))}
          </div>
        )}

        {strengths && strengths.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs font-medium text-green-600 mb-2 flex items-center gap-1">
              <Star size={12} />
              이번 시험에서 잘한 점
            </p>
            {strengths.map((s, i) => (
              <div key={i} className="rounded-lg bg-green-50/50 p-2.5 mb-1.5">
                <p className="text-xs font-medium text-foreground">{s.label}</p>
                <p className="text-xs text-foreground-secondary mt-0.5">{s.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 우선 처방 카드 ──

function PriorityCard({ priority: p }: { priority: Top3Priority }) {
  return (
    <div className="rounded-lg border border-border bg-surface-secondary/20 p-3 sm:p-4">
      {/* 헤더: 순위 + 영역 + 제목 — 인라인 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-600">
          {p.rank}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium border ${AREA_COLOR[p.area] || "bg-surface-secondary text-foreground-muted"}`}>
          {AREA_KO[p.area] || p.area}
        </span>
        <span className="text-sm font-medium text-foreground">{p.label}</span>
      </div>

      {/* 설명 */}
      <p className="text-xs text-foreground-secondary mb-2">{p.why}</p>

      {/* BEFORE/AFTER — 레이블 위, 내용 아래 */}
      {p.before && p.after && (
        <div className="rounded-lg bg-surface-secondary/50 p-2.5 text-xs space-y-1.5">
          <div>
            <span className="text-red-400 text-[11px] font-medium">BEFORE</span>
            <p className="text-foreground-secondary line-through mt-0.5">{p.before}</p>
          </div>
          <div>
            <span className="text-green-600 text-[11px] font-medium">AFTER</span>
            <p className="text-foreground font-medium mt-0.5">{p.after}</p>
          </div>
        </div>
      )}

      {/* 팁 */}
      {p.fix && (
        <p className="mt-2 text-xs text-primary-600 flex items-start gap-1">
          <Lightbulb size={10} className="shrink-0 mt-0.5" />
          {p.fix}
        </p>
      )}

      {/* 발견 위치 */}
      {p.where && p.where.length > 0 && (
        <p className="mt-1 text-[11px] text-foreground-muted">{p.where.join(", ")}에서 발견</p>
      )}
    </div>
  );
}

// ── 반복 오류 패턴 (아코디언) ──

function PatternsSection({ patterns }: { patterns: RecurringPattern[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h4 className="flex items-center gap-2 font-semibold text-foreground mb-3">
        <Repeat size={16} className="text-primary-500" />
        반복 오류 패턴 ({patterns.length})
      </h4>
      <div className="space-y-2">
        {patterns.map((p, i) => (
          <div key={i} className="rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-secondary/30"
            >
              <div className={`w-1 h-8 rounded-full ${getSeverityColor(p.severity)}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{p.label}</span>
                  <span className="text-[11px] rounded-full bg-surface-secondary px-1.5 py-0.5 text-foreground-muted">
                    {CATEGORY_KO[p.category] || p.category}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-foreground-muted">
                  <span>{p.frequency}회 반복</span>
                  {p.where && p.where.length > 0 && <span>· {p.where.join(", ")}</span>}
                </div>
              </div>
              <div className="w-16 h-2 rounded-full bg-surface-secondary shrink-0">
                <div
                  className={`h-2 rounded-full ${getSeverityColor(p.severity)}`}
                  style={{ width: `${Math.min((p.frequency / 14) * 100, 100)}%` }}
                />
              </div>
              {expandedIdx === i ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {expandedIdx === i && (
              <div className="border-t border-border px-3 py-3 space-y-2 bg-surface-secondary/10">
                {p.before && p.after && (
                  <div className="flex gap-2 text-xs">
                    <span className="text-red-500 line-through">{p.before}</span>
                    <ArrowRight size={10} className="shrink-0 mt-0.5 text-foreground-muted" />
                    <span className="text-green-700">{p.after}</span>
                  </div>
                )}
                {p.why_recurring && (
                  <p className="text-xs text-foreground-secondary">{p.why_recurring}</p>
                )}
                {p.fix_principle && (
                  <p className="text-xs text-primary-600 flex items-start gap-1">
                    <Lightbulb size={10} className="shrink-0 mt-0.5" />
                    {p.fix_principle}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
