"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Mic2,
  SkipForward,
  Lightbulb,
  ArrowRight,
  BookOpen,
  BarChart3,
  Target,
} from "lucide-react";
import type {
  MockTestEvaluation,
  MockTestAnswer,
  CoachingFeedback,
  KeyCorrection,
  SkillScore,
  PronunciationAssessment,
  CheckboxResult,
} from "@/lib/types/mock-exam";
import { EVAL_STATUS_LABELS, getPronunciationLabel } from "@/lib/types/mock-exam";

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

// checkbox_type 한글
const CB_KO: Record<string, string> = {
  INT: "기초",
  ADV: "심화",
  AL: "고급",
};

// skill_summary 라벨 색상 (1~5)
function getSkillColor(score: number): string {
  if (score >= 4) return "text-green-600 bg-green-50";
  if (score >= 3) return "text-yellow-600 bg-yellow-50";
  return "text-red-500 bg-red-50";
}

// impact 색상
function getImpactColor(impact: string): string {
  if (impact === "high") return "bg-red-100 text-red-600";
  if (impact === "medium") return "bg-yellow-100 text-yellow-700";
  return "bg-surface-secondary text-foreground-muted";
}

// ── 메인 ──

export function ResultDetail({
  evaluations,
  answers,
  questions,
}: ResultDetailProps) {
  const qMap = new Map(questions.map((q) => [q.id, q]));
  const evalMap = new Map(evaluations.map((e) => [e.question_number, e]));
  const ansMap = new Map(answers.map((a) => [a.question_number, a]));

  // Q2~Q15
  const questionNumbers = Array.from({ length: 14 }, (_, i) => i + 2);

  return (
    <div className="mt-4 space-y-2">
      {questionNumbers.map((qNum) => {
        const ans = ansMap.get(qNum);
        const ev = evalMap.get(qNum);
        const questionId = ans?.question_id || ev?.question_id;
        const question = questionId ? qMap.get(questionId) : undefined;

        return (
          <QuestionCard
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

// ── 문항 카드 (V2 5-Layer) ──

function QuestionCard({
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
  const coaching = evaluation?.coaching_feedback as CoachingFeedback | null;

  // 상태 표시: 코칭 한줄평이 있으면 그걸 미리보기로
  const previewText = coaching?.one_line_insight;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* 헤더 */}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-surface-secondary/30 sm:gap-3 sm:px-4 sm:py-3"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-[10px] font-bold text-foreground-secondary mt-0.5">
          {questionNumber}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground line-clamp-1">
            {question?.question_korean || `문항 ${questionNumber}`}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {question?.question_type_eng && (
              <span className="text-[10px] text-foreground-muted">
                {QT_KO[question.question_type_eng] || question.question_type_eng}
              </span>
            )}
            {evaluation?.checkbox_type && (
              <span className="text-[10px] text-foreground-muted">
                · {CB_KO[evaluation.checkbox_type] || evaluation.checkbox_type}
              </span>
            )}
          </div>
          {/* V2: 한줄 인사이트 미리보기 */}
          {!open && previewText && !isSkipped && (
            <p className="mt-1 text-[11px] text-foreground-secondary line-clamp-1">
              {previewText}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {isSkipped ? (
            <span className="flex items-center gap-1 rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] text-foreground-muted">
              <SkipForward size={10} />
              건너뜀
            </span>
          ) : evalStatus !== "completed" ? (
            <span className="text-[10px] text-yellow-600">
              {EVAL_STATUS_LABELS[evalStatus as keyof typeof EVAL_STATUS_LABELS] || evalStatus}
            </span>
          ) : null}
          {open ? (
            <ChevronUp size={14} className="text-foreground-muted" />
          ) : (
            <ChevronDown size={14} className="text-foreground-muted" />
          )}
        </div>
      </button>

      {/* 펼침: V2 5-Layer */}
      {open && (
        <div className="border-t border-border bg-surface-secondary/10">
          {isSkipped ? (
            <p className="px-4 py-3 text-sm text-foreground-muted">이 문항은 건너뛰었습니다.</p>
          ) : !evaluation || evaluation.skipped ? (
            <p className="px-4 py-3 text-sm text-foreground-muted">평가 데이터가 없습니다.</p>
          ) : coaching ? (
            <V2CoachingContent
              evaluation={evaluation}
              coaching={coaching}
              question={question}
            />
          ) : (
            // 폴백: coaching_feedback이 없는 경우 기본 정보만
            <div className="px-3 py-3 sm:px-4 space-y-3">
              {evaluation.transcript && (
                <TranscriptSection transcript={evaluation.transcript} evaluation={evaluation} />
              )}
              {evaluation.checkboxes && (
                <CheckboxSection
                  checkboxes={evaluation.checkboxes}
                  passCount={evaluation.pass_count}
                  failCount={evaluation.fail_count}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── V2 코칭 콘텐츠 (5-Layer) ──

function V2CoachingContent({
  evaluation,
  coaching,
  question,
}: {
  evaluation: MockTestEvaluation;
  coaching: CoachingFeedback;
  question: {
    question_english: string;
  } | null;
}) {
  const [showDeep, setShowDeep] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showCheckboxes, setShowCheckboxes] = useState(false);

  return (
    <div className="divide-y divide-border/50">
      {/* 질문 원문 */}
      {question && (
        <div className="px-3 py-2.5 sm:px-4">
          <p className="text-xs text-foreground-muted">Question</p>
          <p className="text-sm text-foreground mt-0.5">{question.question_english}</p>
        </div>
      )}

      {/* Layer 1: AI 코치 한줄 평가 */}
      <div className="px-3 py-3 sm:px-4">
        <div className="flex items-start gap-2 rounded-lg bg-primary-50/50 p-3">
          <Lightbulb size={14} className="mt-0.5 shrink-0 text-primary-500" />
          <p className="text-sm leading-relaxed text-foreground">
            {coaching.one_line_insight}
          </p>
        </div>
      </div>

      {/* Layer 2: 핵심 교정 */}
      {coaching.key_corrections && coaching.key_corrections.length > 0 && (
        <div className="px-3 py-3 sm:px-4">
          <p className="text-xs font-medium text-foreground-muted mb-2">
            핵심 교정 ({coaching.key_corrections.length})
          </p>
          <div className="space-y-2.5">
            {coaching.key_corrections.map((c, i) => (
              <CorrectionCard key={i} correction={c} index={i + 1} />
            ))}
          </div>
        </div>
      )}

      {/* Layer 3: 답변 개선 */}
      {coaching.answer_improvement && (
        <div className="px-3 py-3 sm:px-4">
          <p className="text-xs font-medium text-foreground-muted mb-2">
            이렇게 말하면 더 좋아요
          </p>
          <AnswerImprovementSection improvement={coaching.answer_improvement} />
        </div>
      )}

      {/* Layer 4: 영역별 분석 + 구조 */}
      <div className="px-3 py-3 sm:px-4 space-y-3">
        {/* 영역별 점수 */}
        {coaching.skill_summary && (
          <div>
            <p className="text-xs font-medium text-foreground-muted mb-2 flex items-center gap-1">
              <BarChart3 size={12} className="text-primary-400" />
              영역별 분석
            </p>
            <SkillSummaryGrid skills={coaching.skill_summary} />
          </div>
        )}

        {/* 구조 평가 */}
        {coaching.structure_evaluation && (
          <div>
            <p className="text-xs font-medium text-foreground-muted mb-2">답변 구조</p>
            <StructureSection structure={coaching.structure_evaluation} />
          </div>
        )}

        {/* 발음 이해도 */}
        {evaluation.pronunciation_assessment && (
          <PronunciationSection assessment={evaluation.pronunciation_assessment} />
        )}
      </div>

      {/* Layer 5 + 부가 섹션 (접힘) */}
      <div className="px-3 py-2.5 sm:px-4 space-y-1">
        {/* 심층 분석 */}
        {coaching.deep_analysis && (
          <button
            onClick={() => setShowDeep(!showDeep)}
            className="flex w-full items-center justify-between py-1.5 text-xs text-foreground-secondary hover:text-foreground"
          >
            <span className="flex items-center gap-1">
              <BookOpen size={12} />
              심층 분석 보기
            </span>
            {showDeep ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
        {showDeep && coaching.deep_analysis && (
          <DeepAnalysisV2 analysis={coaching.deep_analysis} />
        )}

        {/* 내 답변 원문 */}
        {evaluation.transcript && (
          <>
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="flex w-full items-center justify-between py-1.5 text-xs text-foreground-secondary hover:text-foreground"
            >
              <span>내 답변 원문 + 오디오</span>
              {showTranscript ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showTranscript && (
              <TranscriptSection transcript={evaluation.transcript} evaluation={evaluation} />
            )}
          </>
        )}

        {/* 체크박스 상세 */}
        {evaluation.checkboxes && (
          <>
            <button
              onClick={() => setShowCheckboxes(!showCheckboxes)}
              className="flex w-full items-center justify-between py-1.5 text-xs text-foreground-secondary hover:text-foreground"
            >
              <span>체크박스 상세 ({evaluation.pass_count}/{(evaluation.pass_count || 0) + (evaluation.fail_count || 0)})</span>
              {showCheckboxes ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showCheckboxes && (
              <CheckboxSection
                checkboxes={evaluation.checkboxes}
                passCount={evaluation.pass_count}
                failCount={evaluation.fail_count}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── 교정 카드 (Layer 2) ──

function CorrectionCard({ correction, index }: { correction: KeyCorrection; index: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-100 text-[9px] font-bold text-primary-600">
          {index}
        </span>
        <span className={`rounded-full px-1.5 py-0 text-[9px] font-medium ${getImpactColor(correction.impact)}`}>
          {correction.impact === "high" ? "영향 큼" : correction.impact === "medium" ? "보통" : "낮음"}
        </span>
      </div>
      {/* wrong → correct */}
      <div className="space-y-1 text-[11px]">
        <p className="text-red-500 line-through">{correction.original}</p>
        <p className="text-green-700 flex items-center gap-1">
          <ArrowRight size={10} className="shrink-0" />
          {correction.corrected}
        </p>
        {correction.better && (
          <p className="text-primary-600 flex items-center gap-1">
            <Target size={10} className="shrink-0" />
            {correction.better}
          </p>
        )}
      </div>
      {correction.why && (
        <p className="mt-1.5 text-[10px] text-foreground-secondary leading-relaxed">
          {correction.why}
        </p>
      )}
    </div>
  );
}

// ── 답변 개선 (Layer 3) ──

function AnswerImprovementSection({ improvement }: { improvement: CoachingFeedback["answer_improvement"] }) {
  return (
    <div className="space-y-2.5">
      {/* 내 답변 요약 */}
      {improvement.student_summary && (
        <p className="text-[11px] text-foreground-muted italic">
          {improvement.student_summary}
        </p>
      )}

      {/* 교정 답변 */}
      <div className="rounded-lg bg-green-50/50 p-2.5">
        <p className="text-[10px] font-medium text-green-700 mb-1">교정 답변 — 문법만 수정</p>
        <p className="text-[11px] leading-relaxed text-foreground">
          {improvement.corrected_version}
        </p>
      </div>

      {/* 더 나은 답변 */}
      <div className="rounded-lg bg-primary-50/50 p-2.5">
        <p className="text-[10px] font-medium text-primary-600 mb-1">더 나은 답변 — 목표 등급 수준</p>
        <p className="text-[11px] leading-relaxed text-foreground">
          {improvement.better_version}
        </p>
      </div>

      {/* 개선 포인트 */}
      {improvement.what_changed && improvement.what_changed.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-foreground-muted mb-1">개선 포인트</p>
          <ul className="space-y-0.5">
            {improvement.what_changed.map((point, i) => (
              <li key={i} className="text-[10px] text-foreground-secondary flex items-start gap-1">
                <span className="text-primary-400 mt-0.5">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── 영역별 분석 그리드 (Layer 4) ──

function SkillSummaryGrid({ skills }: { skills: Record<string, SkillScore> }) {
  const skillLabels: Record<string, string> = {
    fluency: "유창성",
    accuracy: "정확성",
    content: "내용",
    structure: "구조",
    pronunciation: "발음이해도",
  };

  const entries = Object.entries(skills);

  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
      {entries.map(([key, skill]) => (
        <div
          key={key}
          className={`rounded-lg p-2 text-center ${getSkillColor(skill.score)}`}
        >
          <p className="text-[9px] font-medium opacity-80">
            {skillLabels[key] || key}
          </p>
          <p className="text-sm font-bold">{skill.score}</p>
          <p className="text-[8px] opacity-70">{skill.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── 구조 평가 (Layer 4) ──

function StructureSection({ structure }: { structure: CoachingFeedback["structure_evaluation"] }) {
  const td = structure.time_distribution;

  return (
    <div className="rounded-lg bg-surface-secondary/50 p-2.5">
      <div className="flex items-center gap-2 mb-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
          structure.structure_score >= 4 ? "bg-green-50 text-green-600" :
          structure.structure_score >= 3 ? "bg-yellow-50 text-yellow-600" :
          "bg-red-50 text-red-500"
        }`}>
          {structure.structure_score}/5 {structure.structure_label}
        </span>
        <div className="flex gap-1 text-[9px]">
          {structure.has_intro && <span className="rounded bg-green-50 px-1 text-green-600">도입</span>}
          {structure.has_body && <span className="rounded bg-green-50 px-1 text-green-600">본문</span>}
          {structure.has_conclusion && <span className="rounded bg-green-50 px-1 text-green-600">마무리</span>}
          {!structure.has_intro && <span className="rounded bg-red-50 px-1 text-red-400">도입 없음</span>}
          {!structure.has_conclusion && <span className="rounded bg-red-50 px-1 text-red-400">마무리 없음</span>}
        </div>
      </div>

      {/* 시간 분배 바 */}
      {td && (
        <div className="h-2.5 rounded-full overflow-hidden flex bg-surface-secondary">
          {td.intro_pct > 0 && (
            <div className="bg-blue-400 h-full" style={{ width: `${td.intro_pct}%` }} />
          )}
          <div className="bg-primary-400 h-full" style={{ width: `${td.body_pct}%` }} />
          {td.conclusion_pct > 0 && (
            <div className="bg-green-400 h-full" style={{ width: `${td.conclusion_pct}%` }} />
          )}
        </div>
      )}
      {td && (
        <div className="flex justify-between text-[8px] text-foreground-muted mt-0.5">
          <span>도입 {td.intro_pct}%</span>
          <span>본문 {td.body_pct}%</span>
          <span>마무리 {td.conclusion_pct}%</span>
        </div>
      )}

      {structure.tip && (
        <p className="mt-2 text-[10px] text-foreground-secondary">
          {structure.tip}
        </p>
      )}
    </div>
  );
}

// ── 발음 이해도 (V2 라벨 변환) ──

function PronunciationSection({ assessment }: { assessment: PronunciationAssessment }) {
  const accuracy = assessment.accuracy_score ?? 0;
  const pronLabel = getPronunciationLabel(accuracy);

  return (
    <div>
      <p className="text-xs font-medium text-foreground-muted mb-2 flex items-center gap-1">
        <Mic2 size={12} className="text-primary-400" />
        발음 이해도
      </p>
      <div className="flex items-center gap-3">
        <span className={`text-lg font-bold ${pronLabel.color}`}>
          {pronLabel.label}
        </span>
        <div className="flex gap-3 text-[10px] text-foreground-muted">
          <span>정확도 {accuracy.toFixed(0)}</span>
          <span>운율 {(assessment.prosody_score ?? 0).toFixed(0)}</span>
          <span>유창성 {(assessment.fluency_score ?? 0).toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}

// ── 심층 분석 V2 (Layer 5) ──

function DeepAnalysisV2({ analysis }: { analysis: CoachingFeedback["deep_analysis"] }) {
  return (
    <div className="rounded-lg bg-surface-secondary/30 p-3 space-y-3 mb-2">
      {/* 강점 */}
      {analysis.strengths && analysis.strengths.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-green-600 mb-1">강점</p>
          <ul className="space-y-0.5">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="text-[10px] text-foreground-secondary">• {s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 약점 + L1 원인 */}
      {analysis.weaknesses && analysis.weaknesses.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-red-500 mb-1">약점</p>
          <div className="space-y-1.5">
            {analysis.weaknesses.map((w, i) => (
              <div key={i} className="text-[10px]">
                <p className="text-foreground-secondary">• {w.point}</p>
                {w.l1_cause && (
                  <p className="ml-3 text-foreground-muted italic">{w.l1_cause}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 목표 등급 갭 */}
      {analysis.target_gap && (
        <div>
          <p className="text-[10px] font-medium text-primary-500 mb-1">
            {analysis.target_gap.target} 도달을 위해
          </p>
          <p className="text-[10px] text-foreground-secondary">{analysis.target_gap.key_gap}</p>
          {analysis.target_gap.example_at_target && (
            <div className="mt-1 rounded bg-primary-50/30 p-2">
              <p className="text-[9px] text-primary-500 mb-0.5">목표 수준 예시</p>
              <p className="text-[10px] text-foreground leading-relaxed italic">
                {analysis.target_gap.example_at_target}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 연습 제안 */}
      {analysis.practice_suggestion && (
        <div className="rounded bg-surface p-2">
          <p className="text-[10px] font-medium text-foreground mb-0.5">
            {analysis.practice_suggestion.focus}
          </p>
          <p className="text-[10px] text-foreground-secondary">
            {analysis.practice_suggestion.method}
          </p>
        </div>
      )}
    </div>
  );
}

// ── 트랜스크립트 (접힌 섹션) ──

function TranscriptSection({ transcript, evaluation }: { transcript: string; evaluation: MockTestEvaluation }) {
  return (
    <div className="mb-2">
      <p className="whitespace-pre-wrap rounded-lg bg-surface p-3 text-[11px] leading-relaxed text-foreground">
        {transcript}
      </p>
      <div className="mt-1 flex gap-3 text-[10px] text-foreground-muted">
        {evaluation.wpm != null && <span>WPM: {evaluation.wpm}</span>}
        {evaluation.audio_duration != null && (
          <span>{evaluation.audio_duration.toFixed(0)}초</span>
        )}
        {evaluation.filler_count != null && evaluation.filler_count > 0 && (
          <span>필러: {evaluation.filler_count}개</span>
        )}
      </div>
    </div>
  );
}

// ── 체크박스 섹션 (접힌 섹션) ──

function CheckboxSection({
  checkboxes,
  passCount,
  failCount,
}: {
  checkboxes: Record<string, CheckboxResult>;
  passCount: number | null;
  failCount: number | null;
}) {
  const entries = Object.entries(checkboxes);
  const passed = entries.filter(([, v]) => v.pass);
  const failed = entries.filter(([, v]) => !v.pass);

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 mb-2 text-[10px]">
        <span className="flex items-center gap-0.5 text-green-600">
          <CheckCircle2 size={10} /> {passCount ?? passed.length}
        </span>
        <span className="flex items-center gap-0.5 text-red-500">
          <XCircle size={10} /> {failCount ?? failed.length}
        </span>
      </div>
      {failed.length > 0 && (
        <div className="space-y-1">
          {failed.map(([id, cb]) => (
            <div key={id} className="flex items-start gap-2 rounded bg-red-50/50 px-2 py-1">
              <XCircle size={10} className="mt-0.5 shrink-0 text-red-400" />
              <div className="min-w-0">
                <span className="text-[9px] font-mono text-red-500">{id}</span>
                {cb.evidence && (
                  <p className="text-[9px] text-foreground-secondary">{cb.evidence}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {passed.length > 0 && (
        <details className="mt-1">
          <summary className="cursor-pointer text-[9px] text-green-600 hover:underline">
            통과 {passed.length}개
          </summary>
          <div className="mt-1 space-y-0.5">
            {passed.map(([id]) => (
              <div key={id} className="flex items-center gap-1 px-2 py-0.5 text-[9px] text-green-600">
                <CheckCircle2 size={8} /> {id}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
