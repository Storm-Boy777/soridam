"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Target,
  Mic2,
  BookOpen,
  AlertTriangle,
  Repeat,
  BarChart3,
  MessageCircle,
  Lightbulb,
  Zap,
} from "lucide-react";
import type {
  MockTestReport,
  MockTestEvaluation,
  MockTestAnswer,
  MockExamHistoryItem,
  OpicLevel,
  CoachingReport,
  CoachDiagnosis,
  RecurringMistake,
  ActionPlanItem,
  SkillScore,
} from "@/lib/types/mock-exam";
import {
  OPIC_LEVEL_ORDER,
  OPIC_LEVEL_DESC,
  FACT_LABELS,
  getPronunciationLabel,
} from "@/lib/types/mock-exam";
import { ResultDetail } from "./result-detail";

// ── Props ──

interface ResultSummaryProps {
  report: MockTestReport;
  evaluations: MockTestEvaluation[];
  answers: MockTestAnswer[];
  questions: Array<{
    id: string;
    question_english: string;
    question_korean: string;
    question_type_eng: string;
    topic: string;
    category: string;
  }>;
  sessionDate: string;
  mode: string;
  previousResult?: MockExamHistoryItem | null;
}

// ── 헬퍼 ──

function getLevelDiff(
  current: OpicLevel | null,
  previous: OpicLevel | null
): { direction: "up" | "down" | "same"; diff: number } | null {
  if (!current || !previous) return null;
  const curr = OPIC_LEVEL_ORDER[current] ?? 0;
  const prev = OPIC_LEVEL_ORDER[previous] ?? 0;
  return {
    direction: curr > prev ? "up" : curr < prev ? "down" : "same",
    diff: curr - prev,
  };
}

// question_type 한글
const QT_KO: Record<string, string> = {
  description: "묘사",
  routine: "루틴",
  asking_questions: "질문하기",
  comparison: "비교",
  experience_specific: "특정경험",
  experience_habitual: "습관경험",
  experience_past: "과거경험",
  suggest_alternatives: "대안제시",
  comparison_change: "비교변화",
  social_issue: "사회이슈",
};

// 영역별 severity 색상
function getSeverityColor(severity: string): string {
  if (severity === "high") return "bg-red-500";
  if (severity === "medium") return "bg-yellow-500";
  return "bg-surface-secondary";
}

// ── 메인 ──

export function ResultSummary({
  report,
  evaluations,
  answers,
  questions,
  sessionDate,
  mode,
  previousResult,
}: ResultSummaryProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  const coaching = report.coaching_report as CoachingReport | null;
  const diagnosis = coaching?.coach_diagnosis;
  const levelDiff = getLevelDiff(
    report.final_level,
    previousResult?.final_level ?? null
  );

  return (
    <div className="space-y-4">
      {/* ═══ 1. 등급 + 코치 진단 ═══ */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">모의고사 결과</h3>
          <span className="text-xs text-foreground-muted">
            {new Date(sessionDate).toLocaleDateString("ko-KR")} ·{" "}
            {mode === "training" ? "훈련" : "실전"}
          </span>
        </div>

        {/* 등급 배지 */}
        <div className="flex flex-col items-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary-50 ring-4 ring-primary-100 sm:h-24 sm:w-24">
            <span className="text-2xl font-bold text-primary-600 sm:text-3xl">
              {report.final_level || "—"}
            </span>
            {levelDiff?.direction === "up" && (
              <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-green-500">
                <TrendingUp size={14} className="text-white" />
              </div>
            )}
          </div>

          {/* 등급 한줄 설명 (V2) */}
          <p className="mt-2 text-sm text-foreground-secondary">
            {report.final_level
              ? (diagnosis?.level_description || OPIC_LEVEL_DESC[report.final_level as OpicLevel] || report.final_level)
              : "등급 미산출"}
          </p>

          {/* 신뢰 범위 */}
          {diagnosis?.confidence_band != null && report.final_level && (
            <p className="mt-0.5 text-[10px] text-foreground-muted">
              신뢰 범위: ±{diagnosis.confidence_band} 등급
            </p>
          )}

          {/* FACT 총점 */}
          {report.total_score != null && (
            <p className="mt-2 text-3xl font-bold text-foreground">
              {report.total_score.toFixed(1)}
              <span className="text-base font-normal text-foreground-muted"> / 100</span>
            </p>
          )}
        </div>

        {/* 코치 진단 (V2) */}
        {diagnosis && (
          <div className="mt-4 space-y-3">
            {/* 왜 이 등급인지 */}
            {diagnosis.why_this_level && (
              <div className="rounded-lg bg-surface-secondary/50 p-3">
                <p className="text-sm leading-relaxed text-foreground">
                  {diagnosis.why_this_level}
                </p>
              </div>
            )}

            {/* 핵심 강점/약점/다음 등급 경로 */}
            <div className="grid gap-2 sm:grid-cols-2">
              {diagnosis.key_strength && (
                <div className="rounded-lg bg-green-50/50 p-2.5">
                  <p className="text-[10px] font-medium text-green-600 mb-0.5">핵심 강점</p>
                  <p className="text-[11px] text-foreground-secondary leading-relaxed">
                    {diagnosis.key_strength}
                  </p>
                </div>
              )}
              {diagnosis.key_weakness && (
                <div className="rounded-lg bg-red-50/50 p-2.5">
                  <p className="text-[10px] font-medium text-red-500 mb-0.5">핵심 약점</p>
                  <p className="text-[11px] text-foreground-secondary leading-relaxed">
                    {diagnosis.key_weakness}
                  </p>
                </div>
              )}
            </div>

            {/* 다음 등급 경로 */}
            {diagnosis.next_level_path && (
              <div className="flex items-start gap-2 rounded-lg bg-primary-50/50 p-3">
                <Lightbulb size={14} className="mt-0.5 shrink-0 text-primary-500" />
                <p className="text-sm leading-relaxed text-foreground">
                  {diagnosis.next_level_path}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 이전 비교 */}
        {previousResult && previousResult.final_level && (
          <div className="mt-4 rounded-lg border border-primary-100 bg-primary-50/30 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-secondary">이전 대비</span>
              <div className="flex items-center gap-2">
                <span className="text-foreground-muted">{previousResult.final_level}</span>
                <ArrowRight size={12} className="text-foreground-muted" />
                <span className="font-bold text-foreground">{report.final_level}</span>
                {levelDiff && levelDiff.direction !== "same" && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    levelDiff.direction === "up" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
                  }`}>
                    {levelDiff.direction === "up" ? "+" : ""}{levelDiff.diff}단계
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ 2. 등급 비교 예시 (V2) ═══ */}
      {coaching?.level_comparison && (
        <LevelComparisonCard comparison={coaching.level_comparison} />
      )}

      {/* ═══ 3. 영역별 분석 + FACT ═══ */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        <h4 className="flex items-center gap-2 font-semibold text-foreground mb-4">
          <BarChart3 size={16} className="text-primary-500" />
          영역별 분석
        </h4>

        {/* 스킬 레이더 (V2) */}
        {coaching?.skill_radar && (
          <SkillRadarSection radar={coaching.skill_radar} />
        )}

        {/* FACT 점수 */}
        <div className="mt-4 space-y-2.5">
          <p className="text-xs font-medium text-foreground-muted">FACT 점수</p>
          {(["F", "A", "C", "T"] as const).map((key) => {
            const field = `score_${key.toLowerCase()}` as keyof typeof report;
            const value = report[field] as number | null;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-20 text-xs text-foreground-secondary">
                  {FACT_LABELS[key]}({key})
                </span>
                <div className="flex-1">
                  <div className="h-2.5 rounded-full bg-surface-secondary">
                    <div
                      className="h-2.5 rounded-full bg-primary-500 transition-all"
                      style={{ width: `${((value ?? 0) / 10) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="w-12 text-right text-sm font-medium text-foreground">
                  {(value ?? 0).toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>

        {/* 발음 이해도 (V2 라벨) */}
        {report.avg_accuracy_score != null && report.avg_accuracy_score > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <Mic2 size={14} className="text-primary-400" />
              <span className="text-xs text-foreground-muted">발음 이해도:</span>
              <span className={`text-sm font-bold ${getPronunciationLabel(report.avg_accuracy_score).color}`}>
                {getPronunciationLabel(report.avg_accuracy_score).label}
              </span>
              <span className="text-[10px] text-foreground-muted">
                (정확도 {report.avg_accuracy_score.toFixed(0)} · 운율 {(report.avg_prosody_score ?? 0).toFixed(0)} · 유창성 {(report.avg_fluency_score ?? 0).toFixed(0)})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ═══ 4. 반복 실수 패턴 (V2) ═══ */}
      {coaching?.recurring_mistakes && coaching.recurring_mistakes.length > 0 && (
        <RecurringMistakesCard mistakes={coaching.recurring_mistakes} />
      )}

      {/* ═══ 5. 유형별 진단 (V2) ═══ */}
      {coaching?.question_type_analysis && (
        <QuestionTypeAnalysisCard analysis={coaching.question_type_analysis} />
      )}

      {/* ═══ 6. 실천 계획 + 훈련 연결 (V2) ═══ */}
      {coaching?.action_plan && coaching.action_plan.length > 0 && (
        <ActionPlanCard
          actionPlan={coaching.action_plan}
          recommendations={coaching.training_recommendations}
        />
      )}

      {/* ═══ 7. 상세 분석 (접힘) ═══ */}
      {coaching?.detailed_analysis && (
        <div className="rounded-xl border border-border bg-surface">
          <button
            onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
            className="flex w-full items-center justify-between p-4 sm:p-6"
          >
            <h4 className="text-sm font-semibold text-foreground">상세 분석</h4>
            <span className="flex items-center gap-1 text-sm text-primary-500">
              {showDetailedAnalysis ? "접기" : "펼치기"}
              {showDetailedAnalysis ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </button>
          {showDetailedAnalysis && (
            <div className="border-t border-border px-4 pb-4 sm:px-6 sm:pb-6 space-y-3">
              {coaching.detailed_analysis.strengths_detail?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-green-600 mb-1">강점 상세</p>
                  <ul className="space-y-0.5">
                    {coaching.detailed_analysis.strengths_detail.map((s, i) => (
                      <li key={i} className="text-[11px] text-foreground-secondary">• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {coaching.detailed_analysis.weaknesses_detail?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-red-500 mb-1">약점 상세</p>
                  <ul className="space-y-0.5">
                    {coaching.detailed_analysis.weaknesses_detail.map((s, i) => (
                      <li key={i} className="text-[11px] text-foreground-secondary">• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {coaching.detailed_analysis.int_adv_gap && (
                <div>
                  <p className="text-xs font-medium text-primary-500 mb-1">INT/ADV 격차</p>
                  <p className="text-[11px] text-foreground-secondary leading-relaxed">
                    {coaching.detailed_analysis.int_adv_gap}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ 8. 문항별 상세 (접힘) ═══ */}
      <div className="rounded-xl border border-border bg-surface">
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="flex w-full items-center justify-between p-4 sm:p-6"
        >
          <h4 className="text-sm font-semibold text-foreground sm:text-base">
            문항별 상세 분석
          </h4>
          <span className="flex items-center gap-1 text-sm text-primary-500">
            {showDetail ? "접기" : "펼치기"}
            {showDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </button>
        {showDetail && (
          <div className="border-t border-border px-3 pb-4 sm:px-6 sm:pb-6">
            <ResultDetail
              evaluations={evaluations}
              answers={answers}
              questions={questions}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── 서브 컴포넌트 ──

// 등급 비교 카드 (V2)
function LevelComparisonCard({ comparison }: { comparison: CoachingReport["level_comparison"] }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h4 className="flex items-center gap-2 font-semibold text-foreground mb-3">
        <MessageCircle size={16} className="text-primary-500" />
        등급 비교 — {comparison.current_level} vs {comparison.next_level}
      </h4>

      <p className="text-xs text-foreground-muted mb-3">
        Q: {comparison.comparison_question}
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {/* 현재 등급 답변 */}
        <div className="rounded-lg bg-surface-secondary/50 p-3">
          <p className="text-[10px] font-medium text-foreground-muted mb-1">
            {comparison.current_level} 수준
          </p>
          <p className="text-[11px] leading-relaxed text-foreground">
            {comparison.current_level_answer}
          </p>
        </div>

        {/* 다음 등급 답변 */}
        <div className="rounded-lg bg-primary-50/50 p-3">
          <p className="text-[10px] font-medium text-primary-600 mb-1">
            {comparison.next_level} 수준
          </p>
          <p className="text-[11px] leading-relaxed text-foreground">
            {comparison.next_level_answer}
          </p>
        </div>
      </div>

      {/* 핵심 차이 */}
      {comparison.key_differences && comparison.key_differences.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-medium text-foreground-muted mb-1">핵심 차이</p>
          <ul className="space-y-0.5">
            {comparison.key_differences.map((d, i) => (
              <li key={i} className="text-[10px] text-foreground-secondary flex items-start gap-1">
                <ArrowRight size={10} className="shrink-0 mt-0.5 text-primary-400" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// 스킬 레이더 (V2)
function SkillRadarSection({ radar }: { radar: Record<string, SkillScore> }) {
  const skillLabels: Record<string, string> = {
    fluency: "유창성",
    accuracy: "정확성",
    content: "내용",
    structure: "구조",
    pronunciation: "발음이해도",
  };

  function getColor(score: number): string {
    if (score >= 7) return "bg-green-500";
    if (score >= 5) return "bg-yellow-500";
    if (score >= 3) return "bg-orange-500";
    return "bg-red-400";
  }

  return (
    <div className="space-y-2">
      {Object.entries(radar).map(([key, skill]) => (
        <div key={key} className="flex items-center gap-3">
          <span className="w-16 text-xs text-foreground-secondary">
            {skillLabels[key] || key}
          </span>
          <div className="flex-1">
            <div className="h-2.5 rounded-full bg-surface-secondary">
              <div
                className={`h-2.5 rounded-full ${getColor(skill.score)} transition-all`}
                style={{ width: `${(skill.score / 10) * 100}%` }}
              />
            </div>
          </div>
          <span className="w-8 text-right text-sm font-bold text-foreground">
            {skill.score}
          </span>
          <span className="w-14 text-[10px] text-foreground-muted">
            {skill.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// 반복 실수 패턴 (V2)
function RecurringMistakesCard({ mistakes }: { mistakes: RecurringMistake[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h4 className="flex items-center gap-2 font-semibold text-foreground mb-3">
        <Repeat size={16} className="text-primary-500" />
        반복 실수 패턴 ({mistakes.length})
      </h4>

      <div className="space-y-2">
        {mistakes.map((m, i) => (
          <div key={i} className="rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-secondary/30"
            >
              {/* 심각도 바 */}
              <div className={`w-1 h-8 rounded-full ${getSeverityColor(m.severity)}`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{m.pattern_name}</span>
                  <span className="text-[9px] rounded-full bg-surface-secondary px-1.5 py-0.5 text-foreground-muted">
                    {m.category}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-foreground-muted">
                  <span>{m.frequency}문항에서 발생</span>
                  <span>· Q{m.affected_questions?.join(", Q")}</span>
                </div>
              </div>

              {/* 빈도 바 */}
              <div className="w-16 h-2 rounded-full bg-surface-secondary shrink-0">
                <div
                  className={`h-2 rounded-full ${getSeverityColor(m.severity)}`}
                  style={{ width: `${Math.min((m.frequency / 14) * 100, 100)}%` }}
                />
              </div>

              {expandedIdx === i ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {expandedIdx === i && (
              <div className="border-t border-border px-3 py-3 space-y-2 bg-surface-secondary/10">
                {/* 예시 */}
                <div className="flex gap-2 text-[11px]">
                  <span className="text-red-500 line-through">{m.example_wrong}</span>
                  <ArrowRight size={10} className="shrink-0 mt-0.5 text-foreground-muted" />
                  <span className="text-green-700">{m.example_correct}</span>
                </div>

                {/* 팁 */}
                {m.tip && (
                  <p className="text-[10px] text-foreground-secondary">{m.tip}</p>
                )}

                {/* 연습 문장 */}
                {m.practice_sentences && m.practice_sentences.length > 0 && (
                  <div>
                    <p className="text-[9px] font-medium text-foreground-muted mb-1">연습 문장</p>
                    {m.practice_sentences.map((s, j) => (
                      <p key={j} className="text-[10px] text-foreground-secondary">{s}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 유형별 진단 (V2)
function QuestionTypeAnalysisCard({ analysis }: { analysis: CoachingReport["question_type_analysis"] }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h4 className="flex items-center gap-2 font-semibold text-foreground mb-3">
        <BookOpen size={16} className="text-primary-500" />
        유형별 진단
      </h4>

      <div className="space-y-3">
        {/* 강한 유형 */}
        {analysis.strong_types && analysis.strong_types.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-green-600 mb-1.5">강한 유형</p>
            {analysis.strong_types.map((t, i) => (
              <div key={i} className="flex items-start gap-2 mb-1">
                <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
                  {t.label}
                </span>
                <p className="text-[10px] text-foreground-secondary">{t.reason}</p>
              </div>
            ))}
          </div>
        )}

        {/* 약한 유형 */}
        {analysis.weak_types && analysis.weak_types.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-red-500 mb-1.5">약한 유형</p>
            {analysis.weak_types.map((t, i) => (
              <div key={i} className="rounded-lg bg-red-50/30 p-2 mb-1.5">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-500">
                    {t.label}
                  </span>
                </div>
                <p className="text-[10px] text-foreground-secondary">{t.reason}</p>
                {t.strategy && (
                  <p className="mt-1 text-[10px] text-primary-600">
                    {t.strategy}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 우선 집중 */}
        {analysis.priority_focus && (
          <div className="flex items-start gap-2 rounded-lg bg-primary-50/50 p-2.5">
            <Target size={12} className="mt-0.5 shrink-0 text-primary-500" />
            <div>
              <p className="text-[10px] font-medium text-primary-600">
                우선 집중: {analysis.priority_focus.label}
              </p>
              <p className="text-[10px] text-foreground-secondary">
                {analysis.priority_focus.reason}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 실천 계획 + 훈련 연결 (V2)
function ActionPlanCard({
  actionPlan,
  recommendations,
}: {
  actionPlan: ActionPlanItem[];
  recommendations?: CoachingReport["training_recommendations"];
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h4 className="flex items-center gap-2 font-semibold text-foreground mb-3">
        <Zap size={16} className="text-primary-500" />
        실천 계획
      </h4>

      <div className="space-y-3">
        {actionPlan.map((plan, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface-secondary/30 p-3">
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-600">
                {plan.priority}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{plan.action}</p>
                <p className="mt-0.5 text-[10px] text-foreground-secondary">{plan.why}</p>
                {plan.how && (
                  <p className="mt-1 text-[10px] text-primary-600">{plan.how}</p>
                )}
                {plan.expected_result && (
                  <p className="mt-0.5 text-[9px] text-foreground-muted italic">
                    {plan.expected_result}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 훈련 연결 CTA */}
      {recommendations && recommendations.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs font-medium text-foreground-muted mb-2">
            <Sparkles size={12} className="inline mr-1 text-primary-400" />
            추천 훈련
          </p>
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start justify-between gap-3 rounded-lg bg-primary-50/30 p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-foreground">
                    {rec.category} — {rec.target_label}
                  </p>
                  <p className="text-[10px] text-foreground-secondary">{rec.reason}</p>
                  {rec.practice_tip && (
                    <p className="mt-0.5 text-[10px] text-primary-600">{rec.practice_tip}</p>
                  )}
                </div>
                <Link
                  href={`/scripts?type=${rec.target_type}`}
                  className="shrink-0 flex items-center gap-0.5 text-[10px] font-medium text-primary-500 hover:text-primary-600"
                >
                  스크립트
                  <ArrowRight size={10} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
