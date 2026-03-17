"use client";

// 종합 탭: S1(등급 스냅샷) + S2(FACT 영역) + S4(로드맵) + CTA
import {
  ArrowRight,
  BarChart3,
  AlertTriangle,
  Map,
  Target,
  Zap,
} from "lucide-react";
import type {
  MockTestReport,
  MockExamHistoryItem,
  CoachingReportV3,
  OpicLevel,
} from "@/lib/types/mock-exam";
import { FACT_LABELS } from "@/lib/types/mock-exam";
import { getLevelDiff, TYPE_MAP_KO, CATEGORY_KO } from "./shared-helpers";

interface OverviewTabProps {
  report: MockTestReport;
  coaching: CoachingReportV3 | null;
  sessionDate: string;
  mode: string;
  previousResult?: MockExamHistoryItem | null;
}

export function OverviewTab({
  report,
  coaching,
  sessionDate,
  mode,
  previousResult,
}: OverviewTabProps) {
  const snapshot = coaching?.snapshot;
  const levelDiff = getLevelDiff(
    report.final_level,
    previousResult?.final_level ?? null,
  );
  const ge = coaching?.grade_explanation;
  const roadmap = coaching?.roadmap;
  const recommendation = coaching?.training_recommendation;

  return (
    <div className="space-y-4">
      {/* ═══ S1: 결과 스냅샷 ═══ */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 border-b border-border/50">
          <h3 className="font-semibold text-foreground">나의 모의고사</h3>
          <div className="flex items-center gap-2">
            {previousResult && previousResult.final_level && levelDiff && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  levelDiff.direction === "up"
                    ? "bg-emerald-50 text-emerald-600"
                    : levelDiff.direction === "down"
                      ? "bg-red-50 text-red-500"
                      : "bg-surface-secondary text-foreground-muted"
                }`}
              >
                {levelDiff.direction === "up"
                  ? `↑${levelDiff.diff}단계`
                  : levelDiff.direction === "down"
                    ? `↓${Math.abs(levelDiff.diff)}단계`
                    : "이전 유지"}
              </span>
            )}
            <span className="text-xs text-foreground-muted">
              {new Date(sessionDate).toLocaleDateString("ko-KR")} ·{" "}
              {mode === "training" ? "훈련" : "실전"}
            </span>
          </div>
        </div>

        {/* 등급 | FACT 영역 */}
        <div className="grid grid-cols-2">
          <div className="flex flex-col items-center border-r border-border py-4">
            <span className="text-[10px] text-foreground-muted">등급</span>
            <span className="mt-1 text-2xl font-bold text-primary-600 sm:text-3xl">
              {report.final_level || "—"}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center py-4">
            <span className="text-[10px] text-foreground-muted">FACT 영역</span>
            <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-foreground-secondary">F <span className="font-semibold text-foreground">{report.score_f ?? "—"}</span></span>
              <span className="text-foreground-secondary">A <span className="font-semibold text-foreground">{report.score_a ?? "—"}</span></span>
              <span className="text-foreground-secondary">C <span className="font-semibold text-foreground">{report.score_c ?? "—"}</span></span>
              <span className="text-foreground-secondary">T <span className="font-semibold text-foreground">{report.score_t ?? "—"}</span></span>
            </div>
          </div>
        </div>

        {/* 등급 위치 — NL~AL 스펙트럼 */}
        {report.final_level && report.target_level && (() => {
          const LEVELS = ["NL", "NM", "NH", "IL", "IM1", "IM2", "IM3", "IH", "AL"];
          const curIdx = LEVELS.indexOf(report.final_level);
          const tgtIdx = LEVELS.indexOf(report.target_level);
          if (curIdx < 0 || tgtIdx < 0) return null;

          return (
            <div className="mt-2 px-4 sm:px-6 pb-5">
              <div className="flex items-center pb-5 pt-4">
                {LEVELS.map((level, i) => {
                  const isCurrent = i === curIdx;
                  const isTarget = i === tgtIdx;

                  return (
                    <div
                      key={level}
                      className={`flex items-center ${i < LEVELS.length - 1 ? "flex-1" : ""}`}
                    >
                      <div className="relative flex-shrink-0">
                        <div
                          className={`rounded-full ${
                            isCurrent
                              ? "h-4 w-4 bg-primary-500 ring-[3px] ring-primary-100"
                              : isTarget
                                ? "h-3.5 w-3.5 border-2 border-primary-400 bg-primary-50"
                                : i < curIdx
                                  ? "h-2 w-2 bg-primary-300"
                                  : "h-2 w-2 bg-border"
                          }`}
                        />
                        {/* 목표: 상단 레이블 */}
                        {isTarget && !isCurrent && (
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2">
                            <span className="text-[10px] font-medium text-primary-400 whitespace-nowrap">
                              목표
                            </span>
                          </div>
                        )}
                        {/* 하단 등급명 — 모든 등급 표시 */}
                        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2">
                          <span
                            className={`text-[10px] whitespace-nowrap ${
                              isCurrent
                                ? "font-bold text-primary-600"
                                : isTarget
                                  ? "font-medium text-primary-400"
                                  : i < curIdx
                                    ? "text-primary-300"
                                    : "text-foreground-muted/60"
                            }`}
                          >
                            {level}
                          </span>
                        </div>
                      </div>
                      {i < LEVELS.length - 1 && (
                        <div
                          className={`h-[2px] flex-1 mx-0.5 ${
                            i < curIdx
                              ? "bg-primary-300"
                              : i >= curIdx && i < tgtIdx
                                ? "bg-primary-200"
                                : "bg-border/50"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* 한줄 총평 */}
        {snapshot?.headline && (
          <div className="mx-4 sm:mx-6 mb-3 rounded-lg bg-surface-secondary/50 p-3">
            <p className="text-sm leading-relaxed text-foreground">{snapshot.headline}</p>
          </div>
        )}

        {/* 진단 태그 */}
        {snapshot?.diagnosis_tags && snapshot.diagnosis_tags.length > 0 && (
          <div className="px-4 sm:px-6 pb-5">
            <div className="flex flex-wrap gap-1.5">
              {snapshot.diagnosis_tags.map((tag, i) => (
                <span
                  key={i}
                  className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600 border border-primary-100"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ S2: 왜 이 등급인지 ═══ */}
      {ge && (
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
          <h4 className="flex items-center gap-2 font-semibold text-foreground mb-4">
            <BarChart3 size={16} className="text-primary-500" />
            왜 이 등급인지
          </h4>

          <div className="space-y-3">
            {(["F", "A", "C", "T"] as const).map((key) => {
              const field = `score_${key.toLowerCase()}` as keyof typeof report;
              const value = Number(report[field]) || 0;
              const interpretation = ge.fact_interpretation?.[key];
              return (
                <div key={key}>
                  <div className="flex items-center gap-3">
                    <span className="w-20 text-xs text-foreground-secondary">{FACT_LABELS[key]}</span>
                    <div className="flex-1">
                      <div className="h-2.5 rounded-full bg-surface-secondary">
                        <div
                          className="h-2.5 rounded-full bg-primary-500 transition-all"
                          style={{ width: `${(value / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-10 text-right text-sm font-medium text-foreground">{value.toFixed(1)}</span>
                  </div>
                  {interpretation && (
                    <p className="mt-0.5 ml-[calc(5rem+0.75rem)] text-xs text-foreground-muted leading-relaxed">
                      {interpretation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {ge.difficulty_interpretation && (
            <div className="mt-4 rounded-lg bg-surface-secondary/50 p-3">
              <div className="flex gap-4 mb-1.5 text-xs text-foreground-secondary">
                <span>기초 달성도: <strong className="text-foreground">{((Number(report.int_pass_rate) || 0) * 100).toFixed(0)}%</strong></span>
                <span>심화 달성도: <strong className="text-foreground">{((Number(report.adv_pass_rate) || 0) * 100).toFixed(0)}%</strong></span>
              </div>
              <p className="text-xs text-foreground-muted">{ge.difficulty_interpretation}</p>
            </div>
          )}

          <p className="mt-2 text-xs text-foreground-muted">* Q1 자기소개는 평가 제외</p>

          {ge.grade_blockers && ge.grade_blockers.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-yellow-500" />
                등급 결정 핵심 사유
              </p>
              <ol className="space-y-1.5">
                {ge.grade_blockers.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-[11px] font-bold text-yellow-700">
                      {i + 1}
                    </span>
                    <span className="text-xs text-foreground-secondary leading-relaxed">{b}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* ═══ S4: 목표 등급 로드맵 ═══ */}
      {roadmap && (
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
          <h4 className="flex items-center gap-2 font-semibold text-foreground mb-4">
            <Map size={16} className="text-primary-500" />
            목표 등급 로드맵
          </h4>

          <div className="flex items-center justify-center gap-2 mb-4 text-sm flex-wrap">
            {(() => {
              const levels: OpicLevel[] = ["NH", "IL", "IM1", "IM2", "IM3", "IH", "AL"];
              const current = report.final_level;
              const target = (report.target_level || roadmap.current_to_next.split("→")[1]?.trim()) as OpicLevel;
              const currentIdx = current ? levels.indexOf(current) : -1;
              const targetIdx = target ? levels.indexOf(target) : -1;

              const path: OpicLevel[] = [];
              if (currentIdx >= 0 && targetIdx > currentIdx) {
                for (let i = currentIdx; i <= targetIdx; i++) path.push(levels[i]);
              } else {
                if (current) path.push(current);
                const next = roadmap.current_to_next.split("→")[1]?.trim() as OpicLevel;
                if (next && next !== current) path.push(next);
              }

              return path.map((level, i) => (
                <span key={level} className="flex items-center gap-2">
                  {i > 0 && <ArrowRight size={16} className={i === path.length - 1 ? "text-foreground-muted" : "text-primary-400"} />}
                  <span className={`rounded-lg px-3 py-1.5 font-bold ${
                    i === 0
                      ? "bg-surface-secondary text-foreground"
                      : i === path.length - 1
                        ? "bg-primary-50 text-primary-600 ring-2 ring-primary-200"
                        : "bg-surface-secondary text-foreground-secondary"
                  }`}>
                    {level}
                  </span>
                </span>
              ));
            })()}
          </div>

          {roadmap.personal_blockers && roadmap.personal_blockers.length > 0 && (
            <div className="rounded-lg bg-yellow-50/50 p-3 mb-3">
              <p className="text-xs font-medium text-yellow-700 mb-1.5">지금 넘어야 할 장벽</p>
              <ul className="space-y-1">
                {roadmap.personal_blockers.map((b, i) => (
                  <li key={i} className="text-xs text-foreground-secondary flex items-start gap-1.5">
                    <AlertTriangle size={10} className="shrink-0 mt-0.5 text-yellow-500" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {roadmap.long_term_goals && roadmap.long_term_goals.length > 0 && (
            <div className="rounded-lg bg-primary-50/50 p-3">
              <p className="text-xs font-medium text-primary-600 mb-1.5">장기 목표</p>
              <ul className="space-y-1">
                {roadmap.long_term_goals.map((g, i) => (
                  <li key={i} className="text-xs text-foreground-secondary flex items-start gap-1.5">
                    <Target size={10} className="shrink-0 mt-0.5 text-primary-400" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ═══ CTA ═══ */}
      {recommendation && (
        <div className="rounded-xl border-2 border-primary-200 bg-primary-50/30 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100">
              <Zap size={20} className="text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground mb-1">{recommendation.course_title}</h4>
              <div className="flex flex-wrap gap-2 text-xs text-foreground-secondary mb-3">
                <span>하루 {recommendation.estimated_daily_minutes}분</span>
                <span>·</span>
                <span>{recommendation.session_count}회 세션</span>
              </div>
              {recommendation.focus_areas && recommendation.focus_areas.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {recommendation.focus_areas.map((tag) => (
                    <span key={tag} className="rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                      {TYPE_MAP_KO[tag] || CATEGORY_KO[tag] || tag}
                    </span>
                  ))}
                </div>
              )}
              <a
                href="/tutoring?tab=prescription"
                className="flex items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
              >
                <Zap size={14} />
                맞춤 훈련 시작하기
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
