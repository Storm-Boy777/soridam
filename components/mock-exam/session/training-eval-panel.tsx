"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Mic2,
  Loader2,
  BarChart3,
  Lightbulb,
  ArrowRight,
  Target,
  BookOpen,
  Pause,
  Play,
} from "lucide-react";
import { getEvaluation } from "@/lib/actions/mock-exam";
import type {
  MockTestEvaluation,
  CoachingFeedback,
  KeyCorrection,
  SkillScore,
  CheckboxResult,
  PronunciationAssessment,
} from "@/lib/types/mock-exam";
import { getPronunciationLabel } from "@/lib/types/mock-exam";

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

// ── Props ──

interface TrainingEvalPanelProps {
  sessionId: string;
  questionNumber: number;
  questionInfo: {
    question_english: string;
    question_korean: string;
    question_type_eng: string;
    topic: string;
    category: string;
  } | null;
  onClose: () => void;
}

// ── 메인 컴포넌트 (인라인 뷰 — 세션 콘텐츠 영역을 대체) ──

export function TrainingEvalPanel({
  sessionId,
  questionNumber,
  questionInfo,
  onClose,
}: TrainingEvalPanelProps) {
  const [data, setData] = useState<MockTestEvaluation | null>(null);
  const [loading, setLoading] = useState(true);

  // questionNumber 변경 시 데이터 로드
  useEffect(() => {
    setLoading(true);
    setData(null);
    getEvaluation({
      session_id: sessionId,
      question_number: questionNumber,
    }).then((res) => {
      setData(res.data || null);
      setLoading(false);
    });
  }, [sessionId, questionNumber]);

  const coaching = data?.coaching_feedback as CoachingFeedback | null;

  return (
    <div className="mx-auto flex h-0 w-full max-w-5xl flex-grow flex-col overflow-hidden px-3 py-2 sm:px-6 sm:py-4 animate-fadeIn">
      {/* 헤더 */}
      <div className="shrink-0 mb-3 flex items-center gap-3 md:mb-4">
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-secondary md:h-9 md:w-9"
        >
          <ArrowLeft size={18} className="text-foreground-secondary" />
        </button>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 md:h-9 md:w-9">
            <BarChart3 size={14} className="text-emerald-600 md:h-[18px] md:w-[18px]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground md:text-base">
              Q{questionNumber} 개별 평가
            </h3>
            {questionInfo && (
              <p className="text-[10px] text-foreground-muted md:text-xs">
                {QT_KO[questionInfo.question_type_eng] || questionInfo.question_type_eng}
                {questionInfo.topic && ` · ${questionInfo.topic}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 콘텐츠 — 스크롤 영역 */}
      <div className="h-0 flex-grow overflow-y-auto rounded-xl border border-border bg-surface p-4 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden md:p-6">
        {loading ? (
          <div className="flex flex-col items-center py-12">
            <Loader2 size={24} className="animate-spin text-primary-500" />
            <p className="mt-2 text-sm text-foreground-secondary">
              평가 결과를 불러오는 중...
            </p>
          </div>
        ) : !data ? (
          <p className="py-12 text-center text-sm text-foreground-muted">
            평가 데이터가 없습니다.
          </p>
        ) : data.skipped ? (
          <p className="py-12 text-center text-sm text-foreground-muted">
            이 문항은 건너뛰었습니다.
          </p>
        ) : coaching ? (
          // V2 코칭 피드백
          <V2CoachingView
            evaluation={data}
            coaching={coaching}
            questionInfo={questionInfo}
          />
        ) : (
          // 폴백: coaching_feedback 없는 경우 기본 정보
          <V1FallbackView evaluation={data} questionInfo={questionInfo} />
        )}
      </div>

      {/* 하단 돌아가기 버튼 */}
      <div className="shrink-0 mt-3 md:mt-4">
        <button
          onClick={onClose}
          className="w-full rounded-xl bg-surface-secondary py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:bg-border md:py-3"
        >
          시험으로 돌아가기
        </button>
      </div>
    </div>
  );
}

// ── V2 코칭 뷰 (5-Layer) ──

function V2CoachingView({
  evaluation,
  coaching,
  questionInfo,
}: {
  evaluation: MockTestEvaluation;
  coaching: CoachingFeedback;
  questionInfo: TrainingEvalPanelProps["questionInfo"];
}) {
  return (
    <div className="space-y-4 md:space-y-5">
      {/* 질문 원문 */}
      {questionInfo && (
        <div>
          <p className="text-[10px] font-medium text-foreground-muted mb-1 md:text-xs">Question</p>
          <p className="text-sm leading-relaxed text-foreground md:text-base">
            {questionInfo.question_english}
          </p>
          <p className="mt-0.5 text-xs text-foreground-secondary md:text-sm">
            {questionInfo.question_korean}
          </p>
        </div>
      )}

      {/* 나의 답변 + 오디오 */}
      {evaluation.transcript && (
        <TranscriptWithAudio evaluation={evaluation} />
      )}

      {/* 구분선 */}
      <div className="border-t border-border" />

      {/* Layer 1: AI 코치 한줄 인사이트 */}
      <div className="flex items-start gap-2 rounded-lg bg-primary-50/50 p-3 md:p-4">
        <Lightbulb size={16} className="mt-0.5 shrink-0 text-primary-500" />
        <p className="text-sm leading-relaxed text-foreground md:text-base">
          {coaching.one_line_insight}
        </p>
      </div>

      {/* Layer 2: 핵심 교정 */}
      {coaching.key_corrections && coaching.key_corrections.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground-muted mb-2 md:text-sm">
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
        <div>
          <p className="text-xs font-medium text-foreground-muted mb-2 md:text-sm">
            이렇게 말하면 더 좋아요
          </p>
          <AnswerImprovementSection improvement={coaching.answer_improvement} />
        </div>
      )}

      {/* Layer 4: 영역별 분석 + 구조 + 발음 */}
      <div className="space-y-3">
        {coaching.skill_summary && (
          <div>
            <p className="text-xs font-medium text-foreground-muted mb-2 flex items-center gap-1 md:text-sm">
              <BarChart3 size={12} className="text-primary-400" />
              영역별 분석
            </p>
            <SkillSummaryGrid skills={coaching.skill_summary} />
          </div>
        )}

        {coaching.structure_evaluation && (
          <div>
            <p className="text-xs font-medium text-foreground-muted mb-2 md:text-sm">답변 구조</p>
            <StructureSection structure={coaching.structure_evaluation} />
          </div>
        )}

        {evaluation.pronunciation_assessment && (
          <PronunciationSectionV2 assessment={evaluation.pronunciation_assessment} />
        )}
      </div>

      {/* Layer 5: 심층 분석 */}
      {coaching.deep_analysis && (
        <div>
          <p className="text-xs font-medium text-foreground-muted mb-2 flex items-center gap-1 md:text-sm">
            <BookOpen size={12} className="text-primary-400" />
            심층 분석
          </p>
          <DeepAnalysisV2 analysis={coaching.deep_analysis} />
        </div>
      )}

      {/* 체크박스 상세 */}
      {evaluation.checkboxes && (
        <div>
          <p className="text-xs font-medium text-foreground-muted mb-2 md:text-sm">
            체크박스 상세 ({evaluation.pass_count}/{(evaluation.pass_count || 0) + (evaluation.fail_count || 0)})
          </p>
          <CheckboxSection
            checkboxes={evaluation.checkboxes}
            passCount={evaluation.pass_count}
            failCount={evaluation.fail_count}
          />
        </div>
      )}
    </div>
  );
}

// ── V1 폴백 뷰 (coaching_feedback 없는 경우) ──

function V1FallbackView({ evaluation, questionInfo }: { evaluation: MockTestEvaluation; questionInfo: TrainingEvalPanelProps["questionInfo"] }) {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* 질문 원문 */}
      {questionInfo && (
        <div>
          <p className="text-[10px] font-medium text-foreground-muted mb-1 md:text-xs">Question</p>
          <p className="text-sm leading-relaxed text-foreground md:text-base">
            {questionInfo.question_english}
          </p>
          <p className="mt-0.5 text-xs text-foreground-secondary md:text-sm">
            {questionInfo.question_korean}
          </p>
        </div>
      )}
      {evaluation.pass_rate != null && (
        <PassRateBar
          passRate={evaluation.pass_rate}
          passCount={evaluation.pass_count}
          failCount={evaluation.fail_count}
          checkboxType={evaluation.checkbox_type}
        />
      )}
      {evaluation.transcript && (
        <TranscriptWithAudio evaluation={evaluation} />
      )}
      {evaluation.pronunciation_assessment && (
        <PronunciationSectionV1 assessment={evaluation.pronunciation_assessment} />
      )}
      {evaluation.checkboxes && (
        <CheckboxSection
          checkboxes={evaluation.checkboxes}
          passCount={evaluation.pass_count}
          failCount={evaluation.fail_count}
        />
      )}
    </div>
  );
}

// ── 교정 카드 (Layer 2) ──

function CorrectionCard({ correction, index }: { correction: KeyCorrection; index: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3 md:p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-600">
          {index}
        </span>
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${getImpactColor(correction.impact)}`}>
          {correction.impact === "high" ? "영향 큼" : correction.impact === "medium" ? "보통" : "낮음"}
        </span>
      </div>
      <div className="space-y-1 text-xs md:text-sm">
        <p className="text-red-500 line-through">{correction.original}</p>
        <p className="text-green-700 flex items-center gap-1">
          <ArrowRight size={11} className="shrink-0" />
          {correction.corrected}
        </p>
        {correction.better && (
          <p className="text-primary-600 flex items-center gap-1">
            <Target size={11} className="shrink-0" />
            {correction.better}
          </p>
        )}
      </div>
      {correction.why && (
        <p className="mt-2 text-[11px] text-foreground-secondary leading-relaxed md:text-xs">
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
      {improvement.student_summary && (
        <p className="text-xs text-foreground-muted italic md:text-sm">
          {improvement.student_summary}
        </p>
      )}

      <div className="rounded-lg bg-green-50/50 p-3">
        <p className="text-[10px] font-medium text-green-700 mb-1 md:text-xs">교정 답변 — 문법만 수정</p>
        <p className="text-xs leading-relaxed text-foreground md:text-sm md:leading-6">
          {improvement.corrected_version}
        </p>
      </div>

      <div className="rounded-lg bg-primary-50/50 p-3">
        <p className="text-[10px] font-medium text-primary-600 mb-1 md:text-xs">더 나은 답변 — 목표 등급 수준</p>
        <p className="text-xs leading-relaxed text-foreground md:text-sm md:leading-6">
          {improvement.better_version}
        </p>
      </div>

      {improvement.what_changed && improvement.what_changed.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-foreground-muted mb-1 md:text-xs">개선 포인트</p>
          <ul className="space-y-0.5">
            {improvement.what_changed.map((point, i) => (
              <li key={i} className="text-[11px] text-foreground-secondary flex items-start gap-1 md:text-xs">
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
          className={`rounded-lg p-2 text-center md:p-2.5 ${getSkillColor(skill.score)}`}
        >
          <p className="text-[9px] font-medium opacity-80 md:text-[10px]">
            {skillLabels[key] || key}
          </p>
          <p className="text-base font-bold md:text-lg">{skill.score}</p>
          <p className="text-[8px] opacity-70 md:text-[9px]">{skill.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── 구조 평가 (Layer 4) ──

function StructureSection({ structure }: { structure: CoachingFeedback["structure_evaluation"] }) {
  const td = structure.time_distribution;

  return (
    <div className="rounded-lg bg-surface-secondary/50 p-3 md:p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium md:text-xs ${
          structure.structure_score >= 4 ? "bg-green-50 text-green-600" :
          structure.structure_score >= 3 ? "bg-yellow-50 text-yellow-600" :
          "bg-red-50 text-red-500"
        }`}>
          {structure.structure_score}/5 {structure.structure_label}
        </span>
        <div className="flex gap-1 text-[9px] md:text-[10px]">
          {structure.has_intro && <span className="rounded bg-green-50 px-1 text-green-600">도입</span>}
          {structure.has_body && <span className="rounded bg-green-50 px-1 text-green-600">본문</span>}
          {structure.has_conclusion && <span className="rounded bg-green-50 px-1 text-green-600">마무리</span>}
          {!structure.has_intro && <span className="rounded bg-red-50 px-1 text-red-400">도입 없음</span>}
          {!structure.has_conclusion && <span className="rounded bg-red-50 px-1 text-red-400">마무리 없음</span>}
        </div>
      </div>

      {td && (
        <div className="h-2.5 rounded-full overflow-hidden flex bg-surface-secondary md:h-3">
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
        <div className="flex justify-between text-[9px] text-foreground-muted mt-0.5 md:text-[10px]">
          <span>도입 {td.intro_pct}%</span>
          <span>본문 {td.body_pct}%</span>
          <span>마무리 {td.conclusion_pct}%</span>
        </div>
      )}

      {structure.tip && (
        <p className="mt-2 text-[11px] text-foreground-secondary leading-relaxed md:text-xs">
          {structure.tip}
        </p>
      )}
    </div>
  );
}

// ── 발음 이해도 V2 (라벨 변환) ──

function PronunciationSectionV2({ assessment }: { assessment: PronunciationAssessment }) {
  const accuracy = assessment.accuracy_score ?? 0;
  const pronLabel = getPronunciationLabel(accuracy);

  return (
    <div>
      <p className="text-xs font-medium text-foreground-muted mb-2 flex items-center gap-1 md:text-sm">
        <Mic2 size={12} className="text-primary-400" />
        발음 이해도
      </p>
      <div className="flex items-center gap-3">
        <span className={`text-lg font-bold md:text-xl ${pronLabel.color}`}>
          {pronLabel.label}
        </span>
        <div className="flex gap-3 text-[10px] text-foreground-muted md:text-xs">
          <span>정확도 {accuracy.toFixed(0)}</span>
          <span>운율 {(assessment.prosody_score ?? 0).toFixed(0)}</span>
          <span>유창성 {(assessment.fluency_score ?? 0).toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}

// ── 발음 V1 폴백 (숫자 표시) ──

function PronunciationSectionV1({ assessment }: { assessment: PronunciationAssessment }) {
  const scores = [
    { label: "정확도", value: assessment.accuracy_score },
    { label: "유창성", value: assessment.fluency_score },
    { label: "운율", value: assessment.prosody_score },
  ];

  return (
    <div>
      <p className="mb-2 flex items-center gap-1 text-xs font-medium text-foreground-muted md:text-sm">
        <Mic2 size={12} className="text-primary-400" />
        발음 평가
      </p>
      <div className="flex gap-2 md:gap-3">
        {scores.map((s) => {
          const v = s.value ?? 0;
          const color = v >= 70 ? "text-green-600" : v >= 40 ? "text-yellow-600" : "text-red-500";
          const bgColor = v >= 70 ? "bg-green-50" : v >= 40 ? "bg-yellow-50" : "bg-red-50";
          return (
            <div key={s.label} className={`flex-1 rounded-lg ${bgColor} px-3 py-2 text-center md:rounded-xl md:px-4 md:py-3`}>
              <p className="text-[10px] text-foreground-muted md:text-sm">{s.label}</p>
              <p className={`text-lg font-bold md:text-2xl ${color}`}>{v > 0 ? v.toFixed(0) : "-"}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 심층 분석 V2 (Layer 5) ──

function DeepAnalysisV2({ analysis }: { analysis: CoachingFeedback["deep_analysis"] }) {
  return (
    <div className="rounded-lg bg-surface-secondary/30 p-3 space-y-3 mb-2 md:p-4">
      {analysis.strengths && analysis.strengths.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-green-600 mb-1 md:text-xs">강점</p>
          <ul className="space-y-0.5">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="text-[11px] text-foreground-secondary md:text-xs">• {s}</li>
            ))}
          </ul>
        </div>
      )}

      {analysis.weaknesses && analysis.weaknesses.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-red-500 mb-1 md:text-xs">약점</p>
          <div className="space-y-1.5">
            {analysis.weaknesses.map((w, i) => (
              <div key={i} className="text-[11px] md:text-xs">
                <p className="text-foreground-secondary">• {w.point}</p>
                {w.l1_cause && (
                  <p className="ml-3 text-foreground-muted italic">{w.l1_cause}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.target_gap && (
        <div>
          <p className="text-[11px] font-medium text-primary-500 mb-1 md:text-xs">
            {analysis.target_gap.target} 도달을 위해
          </p>
          <p className="text-[11px] text-foreground-secondary md:text-xs">{analysis.target_gap.key_gap}</p>
          {analysis.target_gap.example_at_target && (
            <div className="mt-1 rounded bg-primary-50/30 p-2">
              <p className="text-[9px] text-primary-500 mb-0.5 md:text-[10px]">목표 수준 예시</p>
              <p className="text-[11px] text-foreground leading-relaxed italic md:text-xs">
                {analysis.target_gap.example_at_target}
              </p>
            </div>
          )}
        </div>
      )}

      {analysis.practice_suggestion && (
        <div className="rounded bg-surface p-2 md:p-3">
          <p className="text-[11px] font-medium text-foreground mb-0.5 md:text-xs">
            {analysis.practice_suggestion.focus}
          </p>
          <p className="text-[11px] text-foreground-secondary md:text-xs">
            {analysis.practice_suggestion.method}
          </p>
        </div>
      )}
    </div>
  );
}

// ── 답변 원문 + 오디오 플레이어 ──

function TranscriptWithAudio({ evaluation }: { evaluation: MockTestEvaluation }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const ensureAudio = useCallback(() => {
    if (audioRef.current || !evaluation.audio_url) return audioRef.current;
    const audio = new Audio(evaluation.audio_url);
    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
    audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });
    audioRef.current = audio;
    return audio;
  }, [evaluation.audio_url]);

  const togglePlay = useCallback(() => {
    const audio = ensureAudio();
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }, [ensureAudio, isPlaying]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = ensureAudio();
    if (!audio || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * (audio.duration || 0);
    setCurrentTime(audio.currentTime);
  }, [ensureAudio]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mb-2">
      {/* 오디오 플레이어 */}
      {evaluation.audio_url && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-surface-secondary/50 px-3 py-2 md:gap-3 md:px-4 md:py-2.5">
          <button
            onClick={togglePlay}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white transition-colors hover:bg-primary-600 active:scale-95 md:h-9 md:w-9"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div
              ref={progressBarRef}
              onClick={handleSeek}
              className="group relative h-1.5 cursor-pointer rounded-full bg-border md:h-2"
            >
              <div
                className="h-full rounded-full bg-primary-500 transition-[width] duration-150 ease-linear"
                style={{ width: `${progress}%` }}
              />
              <div
                className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-primary-500 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 md:h-3.5 md:w-3.5"
                style={{ left: `calc(${progress}% - 6px)`, opacity: isPlaying || progress > 0 ? 1 : undefined }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-foreground-muted md:text-xs">
              <span>{formatTime(currentTime)}</span>
              <span>{duration > 0 ? formatTime(duration) : evaluation.audio_duration ? formatTime(evaluation.audio_duration) : "--:--"}</span>
            </div>
          </div>
        </div>
      )}

      {/* 트랜스크립트 */}
      <p className="whitespace-pre-wrap rounded-lg border border-border bg-white p-3 text-xs leading-relaxed text-foreground md:p-4 md:text-sm md:leading-7">
        {evaluation.transcript}
      </p>

      {/* 메타 정보 */}
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-foreground-muted md:mt-2 md:gap-x-4 md:text-xs">
        {evaluation.wpm != null && evaluation.wpm > 0 && <span>WPM: {evaluation.wpm.toFixed(0)}</span>}
        {evaluation.audio_duration != null && evaluation.audio_duration > 0 && (
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
  );
}

// ── 통과율 바 (V1 폴백용) ──

function PassRateBar({
  passRate,
  passCount,
  failCount,
  checkboxType,
}: {
  passRate: number;
  passCount: number | null;
  failCount: number | null;
  checkboxType: string | null;
}) {
  const pct = (passRate * 100).toFixed(0);
  const color = passRate >= 0.7 ? "bg-green-500" : passRate >= 0.4 ? "bg-yellow-500" : "bg-red-500";
  const textColor = passRate >= 0.7 ? "text-green-600" : passRate >= 0.4 ? "text-yellow-600" : "text-red-500";

  return (
    <div className="rounded-xl border border-border bg-surface-secondary/30 p-3 md:p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground-muted md:text-sm">
          체크박스 통과율 {checkboxType && `(${checkboxType})`}
        </span>
        <div className="flex items-center gap-2 text-[11px] md:text-xs">
          <span className="flex items-center gap-0.5 text-green-600">
            <CheckCircle2 size={11} /> {passCount ?? 0}
          </span>
          <span className="flex items-center gap-0.5 text-red-500">
            <XCircle size={11} /> {failCount ?? 0}
          </span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex-1">
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-secondary md:h-3">
            <div
              className={`h-full rounded-full ${color} transition-all duration-500`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <span className={`text-lg font-bold md:text-xl ${textColor}`}>{pct}%</span>
      </div>
    </div>
  );
}

// ── 체크박스 상세 ──

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
      <div className="flex items-center gap-2 mb-2 text-[10px] md:text-xs">
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
            <div key={id} className="flex items-start gap-2 rounded-lg bg-red-50/50 px-2.5 py-2 md:px-3 md:py-2.5">
              <XCircle size={12} className="mt-0.5 shrink-0 text-red-400" />
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-medium text-red-500 md:text-xs">{id}</span>
                {cb.evidence && (
                  <p className="text-[10px] leading-relaxed text-foreground-secondary md:text-xs">{cb.evidence}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {passed.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[10px] text-green-600 hover:underline md:text-xs">
            통과 항목 {passed.length}개 보기
          </summary>
          <div className="mt-1 space-y-1">
            {passed.map(([id]) => (
              <div key={id} className="flex items-center gap-2 rounded-lg bg-green-50/50 px-2.5 py-1.5">
                <CheckCircle2 size={10} className="shrink-0 text-green-400" />
                <span className="text-[10px] font-mono text-green-600 md:text-xs">{id}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
