"use client";

import { useState } from "react";
import {
  TrendingUp,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Target,
  Mic2,
  BookOpen,
  Repeat,
  BarChart3,
  Lightbulb,
  Zap,
  Map,
  AlertTriangle,
  Star,
  Volume2,
} from "lucide-react";
import type {
  MockTestReport,
  MockTestEvaluation,
  MockTestAnswer,
  MockExamHistoryItem,
  OpicLevel,
  CoachingReport,
  Top3Priority,
  QuestionTypeMapItem,
  RecurringPattern,
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
  previous: OpicLevel | null,
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
  rp_11: "질문하기",
  comparison: "비교",
  past_childhood: "어릴 때",
  past_special: "특별 경험",
  past_recent: "최근 경험",
  past_habitual: "과거 습관",
  rp_12: "대안제시",
  adv_14: "비교변화",
  adv_15: "의견제시",
  // v2 호환
  asking_questions: "질문하기",
  experience_specific: "특정경험",
  experience_habitual: "습관경험",
  experience_past: "과거경험",
  suggest_alternatives: "대안제시",
  comparison_change: "비교변화",
  social_issue: "사회이슈",
};

// GPT 유형맵 키 → 한글 (유형별 진단, 집중처방 태그)
const TYPE_MAP_KO: Record<string, string> = {
  description_detail: "구체적 묘사",
  routine_sequence: "일상 순서",
  comparison_frame: "비교 구조",
  past_narrative: "과거 경험",
  roleplay_questions: "질문하기",
  roleplay_recovery: "대안·회복",
  opinion_support: "의견 근거",
  social_perspective: "사회적 관점",
  detail_expansion: "세부 확장",
  filler_reduction: "필러 줄이기",
};

// 반복 오류 카테고리 → 한글
const CATEGORY_KO: Record<string, string> = {
  structure: "구조",
  task_performance: "과제수행",
  delivery_habit: "전달습관",
  expression: "표현",
  grammar: "문법",
  vocabulary: "어휘",
};

// 영역별 상태 색상
function getStatusColor(status: string): string {
  switch (status) {
    case "strong": return "bg-green-100 text-green-700";
    case "stable": return "bg-blue-100 text-blue-700";
    case "weak": return "bg-yellow-100 text-yellow-700";
    case "very_weak": return "bg-red-100 text-red-600";
    default: return "bg-surface-secondary text-foreground-muted";
  }
}
const STATUS_KO: Record<string, string> = {
  strong: "강함",
  stable: "안정",
  weak: "약함",
  very_weak: "매우 약함",
};

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

  // v3 coaching_report (v2 폴백)
  const coaching = report.coaching_report as CoachingReport | null;
  const levelDiff = getLevelDiff(
    report.final_level,
    previousResult?.final_level ?? null,
  );

  return (
    <div className="space-y-4">
      {/* ═══ 섹션 1: 결과 스냅샷 ═══ */}
      <Section1Snapshot
        report={report}
        coaching={coaching}
        levelDiff={levelDiff}
        sessionDate={sessionDate}
        mode={mode}
        previousResult={previousResult}
      />

      {/* ═══ 섹션 2: 왜 이 등급인지 ═══ */}
      {coaching?.grade_explanation && (
        <Section2GradeExplanation
          report={report}
          coaching={coaching}
        />
      )}

      {/* ═══ 섹션 3: 먼저 고칠 Top 3 ═══ */}
      {coaching?.top3_priorities && coaching.top3_priorities.length > 0 && (
        <Section3Top3 priorities={coaching.top3_priorities} />
      )}

      {/* ═══ 섹션 4: 목표 등급 로드맵 ═══ */}
      {coaching?.roadmap && (
        <Section4Roadmap
          roadmap={coaching.roadmap}
          currentLevel={report.final_level}
          targetLevel={report.target_level}
        />
      )}

      {/* ═══ 섹션 5: 유형별 진단 맵 ═══ */}
      {coaching?.question_type_map && coaching.question_type_map.length > 0 && (
        <Section5TypeMap typeMap={coaching.question_type_map} />
      )}

      {/* ═══ 섹션 6: 반복 오류 패턴 ═══ */}
      {coaching?.recurring_patterns && coaching.recurring_patterns.length > 0 && (
        <Section6Patterns patterns={coaching.recurring_patterns} />
      )}

      {/* ═══ 섹션 7: 말하기 습관/발음 + 강점 ═══ */}
      <Section7Delivery report={report} coaching={coaching} />

      {/* ═══ 섹션 8: 문항별 다시 보기 ═══ */}
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

      {/* ═══ 섹션 9: 맞춤 훈련 CTA ═══ */}
      {coaching?.training_recommendation && (
        <Section9CTA recommendation={coaching.training_recommendation} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// 섹션 1: 결과 스냅샷
// ══════════════════════════════════════════════════════

function Section1Snapshot({
  report,
  coaching,
  levelDiff,
  sessionDate,
  mode,
  previousResult,
}: {
  report: MockTestReport;
  coaching: CoachingReport | null;
  levelDiff: ReturnType<typeof getLevelDiff>;
  sessionDate: string;
  mode: string;
  previousResult?: MockExamHistoryItem | null;
}) {
  const snapshot = coaching?.snapshot;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">나의 모의고사</h3>
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

        {/* 등급 해석 */}
        <p className="mt-2 text-sm text-foreground-secondary text-center">
          {snapshot?.grade_interpretation ||
            (report.final_level ? OPIC_LEVEL_DESC[report.final_level as OpicLevel] : "등급 미산출")}
        </p>

        {/* 목표 등급 표시 */}
        {report.target_level && report.final_level && (
          <div className="mt-1.5 flex items-center gap-2 text-xs text-foreground-muted">
            <span>{report.final_level}</span>
            <ArrowRight size={10} />
            <span className="font-medium text-primary-500">{report.target_level}</span>
            <span className="text-foreground-muted">(목표)</span>
          </div>
        )}

        {/* FACT 영역별 점수 */}
        {report.score_f != null && (
          <div className="mt-2 flex items-center gap-3 text-sm">
            <span className="text-foreground-secondary">F <span className="font-bold text-foreground">{report.score_f}</span></span>
            <span className="text-foreground-secondary">A <span className="font-bold text-foreground">{report.score_a}</span></span>
            <span className="text-foreground-secondary">C <span className="font-bold text-foreground">{report.score_c}</span></span>
            <span className="text-foreground-secondary">T <span className="font-bold text-foreground">{report.score_t}</span></span>
          </div>
        )}
      </div>

      {/* 한줄 총평 */}
      {snapshot?.headline && (
        <div className="mt-4 rounded-lg bg-surface-secondary/50 p-3">
          <p className="text-sm leading-relaxed text-foreground">
            {snapshot.headline}
          </p>
        </div>
      )}

      {/* 진단 태그 */}
      {snapshot?.diagnosis_tags && snapshot.diagnosis_tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
          {snapshot.diagnosis_tags.map((tag, i) => (
            <span
              key={i}
              className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-medium text-primary-600"
            >
              {tag}
            </span>
          ))}
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
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    levelDiff.direction === "up"
                      ? "bg-green-100 text-green-600"
                      : "bg-red-100 text-red-500"
                  }`}
                >
                  {levelDiff.direction === "up" ? "+" : ""}
                  {levelDiff.diff}단계
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// 섹션 2: 왜 이 등급인지
// ══════════════════════════════════════════════════════

function Section2GradeExplanation({
  report,
  coaching,
}: {
  report: MockTestReport;
  coaching: CoachingReport;
}) {
  const ge = coaching.grade_explanation;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h4 className="flex items-center gap-2 font-semibold text-foreground mb-4">
        <BarChart3 size={16} className="text-primary-500" />
        왜 이 등급인지
      </h4>

      {/* FACT 점수 바 + 해석 */}
      <div className="space-y-3">
        {(["F", "A", "C", "T"] as const).map((key) => {
          const field = `score_${key.toLowerCase()}` as keyof typeof report;
          const value = Number(report[field]) || 0;
          const interpretation = ge.fact_interpretation?.[key];

          return (
            <div key={key}>
              <div className="flex items-center gap-3">
                <span className="w-20 text-xs text-foreground-secondary">
                  {FACT_LABELS[key]}
                </span>
                <div className="flex-1">
                  <div className="h-2.5 rounded-full bg-surface-secondary">
                    <div
                      className="h-2.5 rounded-full bg-primary-500 transition-all"
                      style={{ width: `${(value / 10) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="w-10 text-right text-sm font-medium text-foreground">
                  {value.toFixed(1)}
                </span>
              </div>
              {interpretation && (
                <p className="mt-0.5 ml-[calc(5rem+0.75rem)] text-[10px] text-foreground-muted leading-relaxed">
                  {interpretation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* 난이도별 통과율 */}
      {ge.difficulty_interpretation && (
        <div className="mt-4 rounded-lg bg-surface-secondary/50 p-3">
          <div className="flex gap-4 mb-1.5 text-xs text-foreground-secondary">
            <span>기초 달성도: <strong className="text-foreground">{((Number(report.int_pass_rate) || 0) * 100).toFixed(0)}%</strong></span>
            <span>심화 달성도: <strong className="text-foreground">{((Number(report.adv_pass_rate) || 0) * 100).toFixed(0)}%</strong></span>
          </div>
          <p className="text-[11px] text-foreground-muted">{ge.difficulty_interpretation}</p>
        </div>
      )}

      {/* Q1 안내 */}
      <p className="mt-2 text-[10px] text-foreground-muted">
        * Q1 자기소개는 평가 제외
      </p>

      {/* 등급 결정 핵심 사유 */}
      {ge.grade_blockers && ge.grade_blockers.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-yellow-500" />
            등급 결정 핵심 사유
          </p>
          <ol className="space-y-1.5">
            {ge.grade_blockers.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-[9px] font-bold text-yellow-700">
                  {i + 1}
                </span>
                <span className="text-[11px] text-foreground-secondary leading-relaxed">{b}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// 섹션 3: 먼저 고칠 Top 3
// ══════════════════════════════════════════════════════

const AREA_KO: Record<string, string> = {
  task_performance: "과제수행",
  content_structure: "내용구조",
  delivery: "전달",
};

const AREA_COLOR: Record<string, string> = {
  task_performance: "bg-blue-50 text-blue-700 border-blue-200",
  content_structure: "bg-purple-50 text-purple-700 border-purple-200",
  delivery: "bg-orange-50 text-orange-700 border-orange-200",
};

function Section3Top3({ priorities }: { priorities: Top3Priority[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h4 className="flex items-center gap-2 font-semibold text-foreground mb-4">
        <Target size={16} className="text-primary-500" />
        먼저 고칠 Top 3
      </h4>

      <div className="space-y-3">
        {priorities.map((p) => (
          <div
            key={p.rank}
            className="rounded-lg border border-border bg-surface-secondary/20 p-3 sm:p-4"
          >
            <div className="flex items-start gap-3">
              {/* 순위 */}
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-600">
                {p.rank}
              </span>
              <div className="flex-1 min-w-0">
                {/* 영역 + 라벨 */}
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-medium border ${
                      AREA_COLOR[p.area] || "bg-surface-secondary text-foreground-muted"
                    }`}
                  >
                    {AREA_KO[p.area] || p.area}
                  </span>
                  <span className="text-sm font-medium text-foreground">{p.label}</span>
                </div>

                {/* 왜 중요한지 */}
                <p className="text-[11px] text-foreground-secondary mb-2">{p.why}</p>

                {/* Before → After */}
                {p.before && p.after && (
                  <div className="flex flex-col gap-1 rounded-lg bg-surface-secondary/50 p-2 text-[11px]">
                    <div className="flex items-start gap-1.5">
                      <span className="shrink-0 text-red-400 text-[9px] font-medium mt-0.5">BEFORE</span>
                      <span className="text-foreground-secondary line-through">{p.before}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="shrink-0 text-green-600 text-[9px] font-medium mt-0.5">AFTER</span>
                      <span className="text-foreground font-medium">{p.after}</span>
                    </div>
                  </div>
                )}

                {/* 교정 원칙 */}
                {p.fix && (
                  <p className="mt-1.5 text-[10px] text-primary-600 flex items-start gap-1">
                    <Lightbulb size={10} className="shrink-0 mt-0.5" />
                    {p.fix}
                  </p>
                )}

                {/* 문항 표시 */}
                {p.where && p.where.length > 0 && (
                  <p className="mt-1 text-[9px] text-foreground-muted">
                    {p.where.join(", ")}에서 발견
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// 섹션 4: 목표 등급 로드맵
// ══════════════════════════════════════════════════════

function Section4Roadmap({
  roadmap,
  currentLevel,
  targetLevel,
}: {
  roadmap: CoachingReport["roadmap"];
  currentLevel: OpicLevel | null;
  targetLevel: string | null;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h4 className="flex items-center gap-2 font-semibold text-foreground mb-4">
        <Map size={16} className="text-primary-500" />
        목표 등급 로드맵
      </h4>

      {/* 등급 진행 경로: 현재 → 중간 등급들 → 목표 */}
      <div className="flex items-center justify-center gap-2 mb-4 text-sm flex-wrap">
        {(() => {
          const levels: OpicLevel[] = ["NH", "IL", "IM1", "IM2", "IM3", "IH", "AL"];
          const currentIdx = currentLevel ? levels.indexOf(currentLevel) : -1;
          const target = (targetLevel || roadmap.current_to_next.split("→")[1]?.trim()) as OpicLevel;
          const targetIdx = target ? levels.indexOf(target) : -1;

          // 현재 등급부터 목표 등급까지의 경로
          const path: OpicLevel[] = [];
          if (currentIdx >= 0 && targetIdx > currentIdx) {
            for (let i = currentIdx; i <= targetIdx; i++) {
              path.push(levels[i]);
            }
          } else if (currentLevel) {
            // 폴백: GPT 데이터 기반
            path.push(currentLevel);
            const next = roadmap.current_to_next.split("→")[1]?.trim() as OpicLevel;
            if (next && next !== currentLevel) path.push(next);
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

      {/* 개인 장벽 */}
      {roadmap.personal_blockers && roadmap.personal_blockers.length > 0 && (
        <div className="rounded-lg bg-yellow-50/50 p-3 mb-3">
          <p className="text-[10px] font-medium text-yellow-700 mb-1.5">지금 넘어야 할 장벽</p>
          <ul className="space-y-1">
            {roadmap.personal_blockers.map((b, i) => (
              <li key={i} className="text-[11px] text-foreground-secondary flex items-start gap-1.5">
                <AlertTriangle size={10} className="shrink-0 mt-0.5 text-yellow-500" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 장기 목표 */}
      {roadmap.long_term_goals && roadmap.long_term_goals.length > 0 && (
        <div className="rounded-lg bg-primary-50/50 p-3">
          <p className="text-[10px] font-medium text-primary-600 mb-1.5">장기 목표</p>
          <ul className="space-y-1">
            {roadmap.long_term_goals.map((g, i) => (
              <li key={i} className="text-[11px] text-foreground-secondary flex items-start gap-1.5">
                <Target size={10} className="shrink-0 mt-0.5 text-primary-400" />
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// 섹션 5: 유형별 진단 맵
// ══════════════════════════════════════════════════════

function Section5TypeMap({ typeMap }: { typeMap: QuestionTypeMapItem[] }) {
  return (
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
              <span className="text-[11px] font-medium text-foreground">
                {TYPE_MAP_KO[item.type] || QT_KO[item.type] || item.type}
              </span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold shrink-0 ${getStatusColor(item.status)}`}
              >
                {STATUS_KO[item.status] || item.status}
              </span>
            </div>
            <p className="text-[9px] text-foreground-muted leading-relaxed">
              {item.comment}
            </p>
            {item.priority && (
              <p className="mt-1 text-[8px] font-medium text-red-500 flex items-center gap-0.5">
                <Target size={8} />
                우선 훈련
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// 섹션 6: 반복 오류 패턴
// ══════════════════════════════════════════════════════

function Section6Patterns({ patterns }: { patterns: RecurringPattern[] }) {
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
                  <span className="text-[9px] rounded-full bg-surface-secondary px-1.5 py-0.5 text-foreground-muted">
                    {CATEGORY_KO[p.category] || p.category}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-foreground-muted">
                  <span>{p.frequency}회 반복</span>
                  {p.where && p.where.length > 0 && (
                    <span>· {p.where.join(", ")}</span>
                  )}
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
                {/* Before → After */}
                {p.before && p.after && (
                  <div className="flex gap-2 text-[11px]">
                    <span className="text-red-500 line-through">{p.before}</span>
                    <ArrowRight size={10} className="shrink-0 mt-0.5 text-foreground-muted" />
                    <span className="text-green-700">{p.after}</span>
                  </div>
                )}

                {/* 반복 원인 */}
                {p.why_recurring && (
                  <p className="text-[10px] text-foreground-secondary">{p.why_recurring}</p>
                )}

                {/* 교정 원칙 */}
                {p.fix_principle && (
                  <p className="text-[10px] text-primary-600 flex items-start gap-1">
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

// ══════════════════════════════════════════════════════
// 섹션 7: 말하기 습관/발음 + 강점
// ══════════════════════════════════════════════════════

function Section7Delivery({
  report,
  coaching,
}: {
  report: MockTestReport;
  coaching: CoachingReport | null;
}) {
  const di = coaching?.delivery_interpretation;
  const strengths = coaching?.strengths;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h4 className="flex items-center gap-2 font-semibold text-foreground mb-4">
        <Volume2 size={16} className="text-primary-500" />
        말하기 습관 & 발음
      </h4>

      {/* 발음 수치 */}
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
              <span
                className={`text-sm font-bold ${getPronunciationLabel(item.value).color}`}
              >
                {item.value.toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 해석 문장 */}
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
                <span className="w-14 shrink-0 text-[10px] font-medium text-foreground-muted mt-0.5">
                  {item.label}
                </span>
                <p className="text-[11px] text-foreground-secondary leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
        </div>
      )}

      {/* 강점 */}
      {strengths && strengths.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs font-medium text-green-600 mb-2 flex items-center gap-1">
            <Star size={12} />
            이번 시험에서 잘한 점
          </p>
          {strengths.map((s, i) => (
            <div key={i} className="rounded-lg bg-green-50/50 p-2.5 mb-1.5">
              <p className="text-[11px] font-medium text-foreground">{s.label}</p>
              <p className="text-[10px] text-foreground-secondary mt-0.5">{s.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// 섹션 9: 맞춤 훈련 CTA
// ══════════════════════════════════════════════════════

function Section9CTA({
  recommendation,
}: {
  recommendation: CoachingReport["training_recommendation"];
}) {
  return (
    <div className="rounded-xl border-2 border-primary-200 bg-primary-50/30 p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100">
          <Zap size={20} className="text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground mb-1">
            {recommendation.course_title}
          </h4>
          <div className="flex flex-wrap gap-2 text-[11px] text-foreground-secondary mb-3">
            <span>하루 {recommendation.estimated_daily_minutes}분</span>
            <span>·</span>
            <span>{recommendation.session_count}회 세션</span>
          </div>

          {recommendation.focus_areas && recommendation.focus_areas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {recommendation.focus_areas.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary-100 px-2 py-0.5 text-[9px] font-medium text-primary-700"
                >
                  {TYPE_MAP_KO[tag] || CATEGORY_KO[tag] || tag}
                </span>
              ))}
            </div>
          )}

          {/* 튜터링 CTA */}
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
  );
}
