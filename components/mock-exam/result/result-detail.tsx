"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Mic2,
  AlertTriangle,
  MessageSquare,
  SkipForward,
} from "lucide-react";
import type {
  MockTestEvaluation,
  MockTestAnswer,
  CheckboxResult,
  CorrectionItem,
  DeepAnalysis,
  PronunciationAssessment,
} from "@/lib/types/mock-exam";
import { EVAL_STATUS_LABELS } from "@/lib/types/mock-exam";

// ── Props ──

interface ResultDetailProps {
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

// ── 메인 ──

export function ResultDetail({
  evaluations,
  answers,
  questions,
}: ResultDetailProps) {
  // question_id → question 맵
  const qMap = new Map(questions.map((q) => [q.id, q]));
  // question_number → evaluation 맵
  const evalMap = new Map(evaluations.map((e) => [e.question_number, e]));
  // question_number → answer 맵
  const ansMap = new Map(answers.map((a) => [a.question_number, a]));

  // Q1(자기소개)은 평가 대상이 아니므로 Q2~Q15만
  const questionNumbers = Array.from({ length: 14 }, (_, i) => i + 2);

  return (
    <div className="mt-4 space-y-2">
      {questionNumbers.map((qNum) => {
        const ans = ansMap.get(qNum);
        const ev = evalMap.get(qNum);
        // question_id가 있으면 질문 정보 조회
        const questionId = ans?.question_id || ev?.question_id;
        const question = questionId ? qMap.get(questionId) : undefined;

        return (
          <QuestionAccordion
            key={qNum}
            questionNumber={qNum}
            answer={ans || null}
            evaluation={ev || null}
            question={question || null}
          />
        );
      })}
    </div>
  );
}

// ── 문항 아코디언 ──

function QuestionAccordion({
  questionNumber,
  answer,
  evaluation,
  question,
}: {
  questionNumber: number;
  answer: MockTestAnswer | null;
  evaluation: MockTestEvaluation | null;
  question: {
    id: string;
    question_english: string;
    question_korean: string;
    question_type_eng: string;
    topic: string;
    category: string;
  } | null;
}) {
  const [open, setOpen] = useState(false);

  const isSkipped = answer?.skipped || evaluation?.skipped;
  const evalStatus = answer?.eval_status || "pending";
  const passRate = evaluation?.pass_rate;

  // 상태 색상
  const statusColor = isSkipped
    ? "text-foreground-muted"
    : evalStatus === "completed"
      ? "text-green-600"
      : evalStatus === "failed"
        ? "text-red-500"
        : "text-yellow-600";

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* 헤더 */}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-surface-secondary/30 sm:gap-3 sm:px-4 sm:py-3"
      >
        {/* 번호 */}
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-[10px] font-bold text-foreground-secondary">
          {questionNumber}
        </span>

        {/* 질문 정보 */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {question?.question_korean || `문항 ${questionNumber}`}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {question?.question_type_eng && (
              <span className="text-[10px] text-foreground-muted">
                {QT_KO[question.question_type_eng] || question.question_type_eng}
              </span>
            )}
            {question?.topic && (
              <span className="text-[10px] text-foreground-muted">
                · {question.topic}
              </span>
            )}
          </div>
        </div>

        {/* 상태 뱃지 */}
        <div className="flex items-center gap-2 shrink-0">
          {isSkipped ? (
            <span className="flex items-center gap-1 rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] text-foreground-muted">
              <SkipForward size={10} />
              건너뜀
            </span>
          ) : passRate != null ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                passRate >= 0.7
                  ? "bg-green-50 text-green-600"
                  : passRate >= 0.4
                    ? "bg-yellow-50 text-yellow-600"
                    : "bg-red-50 text-red-500"
              }`}
            >
              {(passRate * 100).toFixed(0)}%
            </span>
          ) : (
            <span className={`text-[10px] ${statusColor}`}>
              {EVAL_STATUS_LABELS[evalStatus as keyof typeof EVAL_STATUS_LABELS] || evalStatus}
            </span>
          )}
          {open ? (
            <ChevronUp size={14} className="text-foreground-muted" />
          ) : (
            <ChevronDown size={14} className="text-foreground-muted" />
          )}
        </div>
      </button>

      {/* 펼침 콘텐츠 */}
      {open && (
        <div className="space-y-3 border-t border-border bg-surface-secondary/20 px-3 py-3 sm:space-y-4 sm:px-4 sm:py-4">
          {isSkipped ? (
            <p className="text-sm text-foreground-muted">이 문항은 건너뛰었습니다.</p>
          ) : !evaluation || evaluation.skipped ? (
            <p className="text-sm text-foreground-muted">평가 데이터가 없습니다.</p>
          ) : (
            <>
              {/* 질문 원문 */}
              {question && (
                <div>
                  <p className="text-xs font-medium text-foreground-muted mb-1">질문</p>
                  <p className="text-sm text-foreground">{question.question_english}</p>
                </div>
              )}

              {/* 답변 트랜스크립트 */}
              {evaluation.transcript && (
                <div>
                  <p className="text-xs font-medium text-foreground-muted mb-1">나의 답변</p>
                  <p className="whitespace-pre-wrap rounded-lg bg-surface p-3 text-sm leading-relaxed text-foreground">
                    {evaluation.transcript}
                  </p>
                  <div className="mt-1 flex gap-3 text-[10px] text-foreground-muted">
                    {evaluation.wpm != null && <span>WPM: {evaluation.wpm}</span>}
                    {evaluation.audio_duration != null && (
                      <span>{evaluation.audio_duration.toFixed(0)}초</span>
                    )}
                    {evaluation.filler_count != null && evaluation.filler_count > 0 && (
                      <span>필러: {evaluation.filler_count}개</span>
                    )}
                    {evaluation.long_pause_count != null && evaluation.long_pause_count > 0 && (
                      <span>긴 침묵: {evaluation.long_pause_count}</span>
                    )}
                  </div>
                </div>
              )}

              {/* 체크박스 통과 현황 */}
              {evaluation.checkboxes && (
                <CheckboxSection
                  checkboxes={evaluation.checkboxes}
                  passCount={evaluation.pass_count}
                  failCount={evaluation.fail_count}
                  checkboxType={evaluation.checkbox_type}
                />
              )}

              {/* 교정 사항 */}
              {evaluation.corrections && evaluation.corrections.length > 0 && (
                <CorrectionsSection corrections={evaluation.corrections} />
              )}

              {/* 심층 분석 */}
              {evaluation.deep_analysis && (
                <DeepAnalysisSection analysis={evaluation.deep_analysis} />
              )}

              {/* 발음 점수 */}
              {evaluation.pronunciation_assessment && (
                <PronunciationSection assessment={evaluation.pronunciation_assessment} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── 체크박스 섹션 ──

function CheckboxSection({
  checkboxes,
  passCount,
  failCount,
  checkboxType,
}: {
  checkboxes: Record<string, CheckboxResult>;
  passCount: number | null;
  failCount: number | null;
  checkboxType: string | null;
}) {
  const [showAll, setShowAll] = useState(false);

  const entries = Object.entries(checkboxes);
  const passed = entries.filter(([, v]) => v.pass);
  const failed = entries.filter(([, v]) => !v.pass);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-foreground-muted">
          체크박스 ({checkboxType})
        </p>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-0.5 text-green-600">
            <CheckCircle2 size={10} /> {passCount ?? passed.length}
          </span>
          <span className="flex items-center gap-0.5 text-red-500">
            <XCircle size={10} /> {failCount ?? failed.length}
          </span>
        </div>
      </div>

      {/* 실패 항목 (기본 표시) */}
      {failed.length > 0 && (
        <div className="space-y-1">
          {failed.slice(0, showAll ? undefined : 5).map(([id, cb]) => (
            <div
              key={id}
              className="flex items-start gap-2 rounded bg-red-50/50 px-2 py-1.5"
            >
              <XCircle size={12} className="mt-0.5 shrink-0 text-red-400" />
              <div className="min-w-0">
                <span className="text-[10px] font-mono text-red-500">{id}</span>
                {cb.evidence && (
                  <p className="text-[10px] text-foreground-secondary leading-relaxed">
                    {cb.evidence}
                  </p>
                )}
              </div>
            </div>
          ))}
          {!showAll && failed.length > 5 && (
            <button
              onClick={() => setShowAll(true)}
              className="text-[10px] text-primary-500 hover:underline"
            >
              실패 항목 {failed.length - 5}개 더 보기
            </button>
          )}
        </div>
      )}

      {/* 통과 항목 (접기) */}
      {passed.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[10px] text-green-600 hover:underline">
            통과 항목 {passed.length}개 보기
          </summary>
          <div className="mt-1 space-y-1">
            {passed.map(([id, cb]) => (
              <div
                key={id}
                className="flex items-start gap-2 rounded bg-green-50/50 px-2 py-1"
              >
                <CheckCircle2 size={10} className="mt-0.5 shrink-0 text-green-400" />
                <span className="text-[10px] font-mono text-green-600">{id}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ── 교정 섹션 ──

function CorrectionsSection({
  corrections,
}: {
  corrections: CorrectionItem[];
}) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground-muted mb-2 flex items-center gap-1">
        <AlertTriangle size={12} className="text-yellow-500" />
        교정 사항 ({corrections.length})
      </p>
      <div className="space-y-2">
        {corrections.map((c, i) => (
          <div
            key={i}
            className="rounded-lg border border-yellow-100 bg-yellow-50/30 p-2.5"
          >
            {c.error_parts && c.error_parts.length > 0 && (
              <p className="text-[11px] text-red-500 line-through">
                {c.error_parts.join(" ")}
              </p>
            )}
            {c.corrected_segment && (
              <p className="text-[11px] font-medium text-green-700">
                → {c.corrected_segment}
              </p>
            )}
            {c.tip_korean && (
              <p className="mt-1 text-[10px] text-foreground-secondary">
                💡 {c.tip_korean}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 심층 분석 섹션 ──

function DeepAnalysisSection({ analysis }: { analysis: DeepAnalysis }) {
  const [expanded, setExpanded] = useState(false);

  const sections = [
    { label: "전체 평가", text: analysis.overall_assessment },
    { label: "언어적 분석", text: analysis.linguistic_analysis },
    { label: "의사소통 효과", text: analysis.communicative_effectiveness },
    { label: "숙련도 갭", text: analysis.proficiency_gap },
    { label: "학습 권장", text: analysis.recommendation },
  ].filter((s) => s.text);

  if (sections.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs font-medium text-foreground-muted hover:text-foreground-secondary"
      >
        <MessageSquare size={12} className="text-primary-400" />
        심층 분석
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          {sections.map((s, i) => (
            <div key={i}>
              <p className="text-[10px] font-medium text-primary-500">{s.label}</p>
              <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground-secondary">
                {s.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 발음 섹션 ──

function PronunciationSection({
  assessment,
}: {
  assessment: PronunciationAssessment;
}) {
  const scores = [
    { label: "정확도", value: assessment.accuracy_score },
    { label: "운율", value: assessment.prosody_score },
    { label: "유창성", value: assessment.fluency_score },
  ];

  // 오발음 단어
  const mispronounced = assessment.words?.filter(
    (w) => w.errorType !== "None"
  );

  return (
    <div>
      <p className="text-xs font-medium text-foreground-muted mb-2 flex items-center gap-1">
        <Mic2 size={12} className="text-primary-400" />
        발음 평가
      </p>
      <div className="flex gap-4">
        {scores.map((s) => {
          const v = s.value ?? 0;
          const color =
            v >= 70 ? "text-green-600" : v >= 40 ? "text-yellow-600" : "text-red-500";
          return (
            <div key={s.label} className="text-center">
              <p className="text-[10px] text-foreground-muted">{s.label}</p>
              <p className={`text-base font-bold ${color}`}>
                {v > 0 ? v.toFixed(0) : "-"}
              </p>
            </div>
          );
        })}
      </div>

      {/* 오발음 단어 */}
      {mispronounced && mispronounced.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] text-foreground-muted mb-1">
            오발음 단어 ({mispronounced.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {mispronounced.slice(0, 10).map((w, i) => (
              <span
                key={i}
                className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-500"
              >
                {w.word}{" "}
                <span className="text-red-400">({w.accuracyScore})</span>
              </span>
            ))}
            {mispronounced.length > 10 && (
              <span className="text-[10px] text-foreground-muted">
                +{mispronounced.length - 10}개
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
