"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Mic2,
  Target,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type {
  MockTestReport,
  MockTestEvaluation,
  MockTestAnswer,
  MockExamHistoryItem,
  OpicLevel,
  TrainingRecommendation,
} from "@/lib/types/mock-exam";
import { OPIC_LEVEL_LABELS, OPIC_LEVEL_ORDER } from "@/lib/types/mock-exam";
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

function ScoreBar({ label, value, max = 10 }: { label: string; value: number | null; max?: number }) {
  const v = value ?? 0;
  const pct = max > 0 ? (v / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-6 text-center text-sm font-bold text-foreground">{label}</span>
      <div className="flex-1">
        <div className="h-3 rounded-full bg-surface-secondary">
          <div
            className="h-3 rounded-full bg-primary-500 transition-all"
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>
      <span className="w-14 text-right text-sm font-medium text-foreground">
        {v.toFixed(1)}/{max}
      </span>
    </div>
  );
}

function PronScore({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0;
  const color = v >= 70 ? "text-green-600" : v >= 40 ? "text-yellow-600" : "text-red-500";
  return (
    <div className="text-center">
      <p className="text-xs text-foreground-muted">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{v > 0 ? v.toFixed(0) : "-"}</p>
    </div>
  );
}

// question_type 한글 매핑
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

// ── 메인 컴포넌트 ──

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
  const [showFeedback, setShowFeedback] = useState(false);

  const levelDiff = getLevelDiff(
    report.final_level,
    previousResult?.final_level ?? null
  );
  const scoreDiff =
    report.total_score != null && previousResult?.total_score != null
      ? report.total_score - previousResult.total_score
      : null;

  return (
    <div className="space-y-6">
      {/* 1. 등급 + FACT 요약 카드 */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">모의고사 결과</h3>
          <span className="text-xs text-foreground-muted">
            {new Date(sessionDate).toLocaleDateString("ko-KR")} ·{" "}
            {mode === "training" ? "훈련" : "실전"}
          </span>
        </div>

        {/* 등급 배지 */}
        <div className="mt-6 flex flex-col items-center">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary-50 ring-4 ring-primary-100">
            <span className="text-3xl font-bold text-primary-600">
              {report.final_level || "—"}
            </span>
            {levelDiff?.direction === "up" && (
              <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-green-500">
                <TrendingUp size={14} className="text-white" />
              </div>
            )}
          </div>
          <p className="mt-2 text-sm text-foreground-secondary">
            {report.final_level
              ? OPIC_LEVEL_LABELS[report.final_level as OpicLevel] || report.final_level
              : "등급 미산출"}
          </p>

          {/* FACT 총점 */}
          {report.total_score != null && (
            <p className="mt-2 text-3xl font-bold text-foreground">
              {report.total_score.toFixed(1)}
              <span className="text-base font-normal text-foreground-muted"> / 100</span>
            </p>
          )}
        </div>

        {/* 이전 비교 (UX 5-1) */}
        {previousResult && previousResult.final_level && (
          <div className="mt-4 rounded-lg border border-primary-100 bg-primary-50/30 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-secondary">이전 대비</span>
              <div className="flex items-center gap-2">
                <span className="text-foreground-muted">
                  {previousResult.final_level}
                </span>
                <ArrowRight size={12} className="text-foreground-muted" />
                <span className="font-bold text-foreground">
                  {report.final_level}
                </span>
                {levelDiff && levelDiff.direction === "up" && (
                  <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-600">
                    +{levelDiff.diff}단계
                  </span>
                )}
                {levelDiff && levelDiff.direction === "down" && (
                  <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                    {levelDiff.diff}단계
                  </span>
                )}
              </div>
            </div>
            {scoreDiff != null && (
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-foreground-muted">FACT 점수</span>
                <span className={scoreDiff > 0 ? "font-medium text-green-600" : scoreDiff < 0 ? "font-medium text-red-500" : "text-foreground-muted"}>
                  {previousResult.total_score?.toFixed(1)} → {report.total_score?.toFixed(1)}
                  {" "}({scoreDiff > 0 ? "+" : ""}{scoreDiff.toFixed(1)})
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. FACT 영역별 점수 */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h4 className="flex items-center gap-2 font-semibold text-foreground">
          <Target size={16} className="text-primary-500" />
          FACT 영역별 점수
        </h4>
        <div className="mt-4 space-y-3">
          <ScoreBar label="F" value={report.score_f} />
          <ScoreBar label="A" value={report.score_a} />
          <ScoreBar label="C" value={report.score_c} />
          <ScoreBar label="T" value={report.score_t} />
        </div>
        {/* FACT 이전 비교 (간략) */}
        {previousResult && previousResult.score_f != null && (
          <div className="mt-3 grid grid-cols-4 gap-2 border-t border-border pt-3">
            {(["score_f", "score_a", "score_c", "score_t"] as const).map((key, i) => {
              const labels = ["F", "A", "C", "T"];
              const curr = report[key] ?? 0;
              const prev = previousResult[key] ?? 0;
              const diff = curr - prev;
              return (
                <div key={key} className="text-center text-[10px]">
                  <span className="text-foreground-muted">{labels[i]} 변화</span>
                  <div className={`font-medium ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-500" : "text-foreground-muted"}`}>
                    {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. 영역별 분석 (INT/ADV/AL 통과율) */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h4 className="flex items-center gap-2 font-semibold text-foreground">
          <BookOpen size={16} className="text-primary-500" />
          영역별 분석
        </h4>
        <div className="mt-4 space-y-3">
          {/* INT */}
          <AreaRow
            label="INT (기초)"
            passRate={report.int_pass_rate}
            subLabel={report.floor_status ? `Floor: ${report.floor_level || report.floor_status}` : undefined}
          />
          {/* ADV */}
          <AreaRow
            label="ADV (심화)"
            passRate={report.adv_pass_rate}
            subLabel={report.ceiling_status ? `Ceiling: ${report.ceiling_status}` : undefined}
          />
          {/* AL */}
          <AreaRow
            label="AL (고급)"
            passRate={report.al_pass_rate}
            subLabel={report.al_judgment || undefined}
          />
        </div>

        {/* 부가 정보 */}
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
          {report.sympathetic_listener && (
            <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] text-foreground-secondary">
              Sympathetic: {report.sympathetic_listener}
            </span>
          )}
          {report.q12_gatekeeper && (
            <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] text-foreground-secondary">
              Q12 Gate: {report.q12_gatekeeper}
            </span>
          )}
          {report.valid_question_count != null && (
            <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] text-foreground-secondary">
              유효 문항: {report.valid_question_count}개
            </span>
          )}
        </div>
      </div>

      {/* 4. 발음 통계 */}
      {(report.avg_accuracy_score || report.avg_prosody_score || report.avg_fluency_score) && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <h4 className="flex items-center gap-2 font-semibold text-foreground">
            <Mic2 size={16} className="text-primary-500" />
            발음 평균 점수
          </h4>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <PronScore label="정확도" value={report.avg_accuracy_score} />
            <PronScore label="운율" value={report.avg_prosody_score} />
            <PronScore label="유창성" value={report.avg_fluency_score} />
          </div>
        </div>
      )}

      {/* 5. 훈련 권장 + 스크립트 CTA (UX 5-2) */}
      {report.training_recommendations && report.training_recommendations.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <h4 className="flex items-center gap-2 font-semibold text-foreground">
            <Sparkles size={16} className="text-primary-500" />
            우선 훈련 항목
          </h4>
          <div className="mt-4 space-y-3">
            {report.training_recommendations.map((rec: TrainingRecommendation, i: number) => (
              <div key={i} className="rounded-lg border border-border bg-surface-secondary/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-600">
                      {rec.priority || i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {rec.reason_ko}
                      </p>
                      <p className="mt-0.5 text-[10px] text-foreground-muted">
                        {QT_KO[rec.question_type] || rec.question_type}
                      </p>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/scripts?type=${rec.question_type}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-500 hover:text-primary-600"
                >
                  이 유형 스크립트 만들기
                  <ArrowRight size={10} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. 종합 피드백 (접기/펼치기) */}
      {(report.comprehensive_feedback || report.overall_comments_ko) && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <button
            onClick={() => setShowFeedback(!showFeedback)}
            className="flex w-full items-center justify-between"
          >
            <h4 className="font-semibold text-foreground">종합 피드백</h4>
            {showFeedback ? (
              <ChevronUp size={16} className="text-foreground-muted" />
            ) : (
              <ChevronDown size={16} className="text-foreground-muted" />
            )}
          </button>
          {showFeedback && (
            <div className="mt-4 space-y-3">
              {report.overall_comments_ko && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground-secondary">
                  {report.overall_comments_ko}
                </p>
              )}
              {report.comprehensive_feedback && (
                <div className="rounded-lg bg-surface-secondary/50 p-3">
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground-secondary">
                    {report.comprehensive_feedback}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 7. 문항별 상세 보기 토글 */}
      <div className="rounded-xl border border-border bg-surface">
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="flex w-full items-center justify-between p-6"
        >
          <h4 className="font-semibold text-foreground">문항별 상세 분석</h4>
          <span className="flex items-center gap-1 text-sm text-primary-500">
            {showDetail ? "접기" : "펼치기"}
            {showDetail ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
          </span>
        </button>
        {showDetail && (
          <div className="border-t border-border px-6 pb-6">
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

function AreaRow({
  label,
  passRate,
  subLabel,
}: {
  label: string;
  passRate: number | null;
  subLabel?: string;
}) {
  const rate = passRate ?? 0;
  const pct = rate * 100;
  const color =
    pct >= 80
      ? "bg-green-500"
      : pct >= 60
        ? "bg-yellow-500"
        : pct >= 40
          ? "bg-orange-500"
          : "bg-red-400";

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-foreground-secondary">
          {pct > 0 ? `${pct.toFixed(0)}%` : "—"}
          {subLabel && (
            <span className="ml-1.5 text-[10px] text-foreground-muted">
              ({subLabel})
            </span>
          )}
        </span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-surface-secondary">
        <div
          className={`h-2 rounded-full ${color} transition-all`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}
