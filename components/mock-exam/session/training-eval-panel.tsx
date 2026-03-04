"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Mic2,
  AlertTriangle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
  BarChart3,
  Volume2,
  Pause,
} from "lucide-react";
import { getEvaluation } from "@/lib/actions/mock-exam";
import type {
  MockTestEvaluation,
  CheckboxResult,
  CorrectionItem,
  DeepAnalysis,
  PronunciationAssessment,
} from "@/lib/types/mock-exam";

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

// ── Props ──

interface TrainingEvalPanelProps {
  sessionId: string;
  questionNumber: number;
  questionInfo: {
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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden px-3 py-2 sm:px-6 sm:py-4 animate-fadeIn">
      {/* 헤더 */}
      <div className="mb-3 flex items-center gap-3 md:mb-4">
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
      <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-surface p-4 md:p-6">
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
        ) : (
          <div className="space-y-4 md:space-y-6">
            {/* 통과율 요약 바 */}
            {data.pass_rate != null && (
              <PassRateBar
                passRate={data.pass_rate}
                passCount={data.pass_count}
                failCount={data.fail_count}
                checkboxType={data.checkbox_type}
              />
            )}

            {/* 나의 답변 */}
            {data.transcript && (
              <TranscriptSection
                transcript={data.transcript}
                audioUrl={data.audio_url}
                wpm={data.wpm}
                audioDuration={data.audio_duration}
                fillerCount={data.filler_count}
                longPauseCount={data.long_pause_count}
              />
            )}

            {/* 발음 점수 */}
            {data.pronunciation_assessment && (
              <PronunciationSection
                assessment={data.pronunciation_assessment}
              />
            )}

            {/* 체크박스 상세 */}
            {data.checkboxes && (
              <CheckboxSection
                checkboxes={data.checkboxes}
                passCount={data.pass_count}
                failCount={data.fail_count}
              />
            )}

            {/* 교정 사항 */}
            {data.corrections && data.corrections.length > 0 && (
              <CorrectionsSection corrections={data.corrections} />
            )}

            {/* 심층 분석 */}
            {data.deep_analysis && (
              <DeepAnalysisSection analysis={data.deep_analysis} />
            )}
          </div>
        )}
      </div>

      {/* 하단 돌아가기 버튼 */}
      <div className="mt-3 md:mt-4">
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

// ── 통과율 바 ──

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
  const color =
    passRate >= 0.7
      ? "bg-green-500"
      : passRate >= 0.4
        ? "bg-yellow-500"
        : "bg-red-500";
  const textColor =
    passRate >= 0.7
      ? "text-green-600"
      : passRate >= 0.4
        ? "text-yellow-600"
        : "text-red-500";

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

// ── 답변 트랜스크립트 ──

function TranscriptSection({
  transcript,
  audioUrl,
  wpm,
  audioDuration,
  fillerCount,
  longPauseCount,
}: {
  transcript: string;
  audioUrl: string | null;
  wpm: number | null;
  audioDuration: number | null;
  fillerCount: number | null;
  longPauseCount: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // 오디오 재생/정지 토글
  const togglePlay = useCallback(() => {
    if (!audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.addEventListener("ended", () => {
        setIsPlaying(false);
        setProgress(0);
      });
      audioRef.current.addEventListener("timeupdate", () => {
        const audio = audioRef.current;
        if (audio && audio.duration > 0) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      });
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [audioUrl, isPlaying]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between md:mb-2">
        <p className="text-xs font-medium text-foreground-muted md:text-sm">
          나의 답변
        </p>
        {audioUrl && (
          <button
            onClick={togglePlay}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-colors md:text-xs ${
              isPlaying
                ? "bg-primary-100 text-primary-700"
                : "bg-surface-secondary text-foreground-secondary hover:bg-border"
            }`}
          >
            {isPlaying ? (
              <Pause size={12} className="shrink-0" />
            ) : (
              <Volume2 size={12} className="shrink-0" />
            )}
            {isPlaying ? "일시정지" : "내 답변 듣기"}
          </button>
        )}
      </div>
      {/* 오디오 프로그레스 바 */}
      {audioUrl && isPlaying && (
        <div className="mb-2 h-1 overflow-hidden rounded-full bg-surface-secondary">
          <div
            className="h-full rounded-full bg-primary-500 transition-[width] duration-300 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      <p className="whitespace-pre-wrap rounded-lg bg-white p-3 text-sm leading-relaxed text-foreground border border-border md:p-4 md:text-base md:leading-7">
        {transcript}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-foreground-muted md:mt-2 md:text-xs">
        {wpm != null && wpm > 0 && <span>WPM: {wpm.toFixed(0)}</span>}
        {audioDuration != null && audioDuration > 0 && (
          <span>{audioDuration.toFixed(0)}초</span>
        )}
        {fillerCount != null && fillerCount > 0 && (
          <span>필러: {fillerCount}개</span>
        )}
        {longPauseCount != null && longPauseCount > 0 && (
          <span>긴 침묵: {longPauseCount}</span>
        )}
      </div>
    </div>
  );
}

// ── 발음 점수 ──

function PronunciationSection({
  assessment,
}: {
  assessment: PronunciationAssessment;
}) {
  const scores = [
    { label: "정확도", value: assessment.accuracy_score },
    { label: "유창성", value: assessment.fluency_score },
    { label: "운율", value: assessment.prosody_score },
  ];

  const mispronounced = assessment.words?.filter(
    (w) => w.errorType !== "None"
  );

  return (
    <div>
      <p className="mb-2 flex items-center gap-1 text-xs font-medium text-foreground-muted md:text-sm">
        <Mic2 size={12} className="text-primary-400" />
        발음 평가
      </p>
      <div className="flex gap-2 md:gap-3">
        {scores.map((s) => {
          const v = s.value ?? 0;
          const color =
            v >= 70
              ? "text-green-600"
              : v >= 40
                ? "text-yellow-600"
                : "text-red-500";
          const bgColor =
            v >= 70
              ? "bg-green-50"
              : v >= 40
                ? "bg-yellow-50"
                : "bg-red-50";
          return (
            <div
              key={s.label}
              className={`flex-1 rounded-lg ${bgColor} px-3 py-2 text-center md:rounded-xl md:px-4 md:py-3`}
            >
              <p className="text-[10px] text-foreground-muted md:text-xs">{s.label}</p>
              <p className={`text-lg font-bold md:text-xl ${color}`}>
                {v > 0 ? v.toFixed(0) : "-"}
              </p>
            </div>
          );
        })}
      </div>
      {mispronounced && mispronounced.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 text-[10px] text-foreground-muted">
            오발음 단어 ({mispronounced.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {mispronounced.slice(0, 8).map((w, i) => (
              <span
                key={i}
                className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-500"
              >
                {w.word}{" "}
                <span className="text-red-400">({w.accuracyScore})</span>
              </span>
            ))}
            {mispronounced.length > 8 && (
              <span className="text-[10px] text-foreground-muted">
                +{mispronounced.length - 8}개
              </span>
            )}
          </div>
        </div>
      )}
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
    <div>
      <p className="mb-2 text-xs font-medium text-foreground-muted md:text-sm">
        체크박스 상세
      </p>

      {/* 실패 항목 */}
      {failed.length > 0 && (
        <div className="space-y-1 md:space-y-2">
          {failed.map(([id, cb]) => (
            <div
              key={id}
              className="flex items-start gap-2 rounded-lg bg-red-50/50 px-2.5 py-2 md:px-3 md:py-2.5"
            >
              <XCircle
                size={12}
                className="mt-0.5 shrink-0 text-red-400"
              />
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-medium text-red-500 md:text-xs">
                  {id}
                </span>
                {cb.evidence && (
                  <p className="text-[10px] leading-relaxed text-foreground-secondary md:text-xs md:leading-5">
                    {cb.evidence}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 통과 항목 */}
      {passed.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[10px] text-green-600 hover:underline">
            통과 항목 {passed.length}개 보기
          </summary>
          <div className="mt-1 space-y-1">
            {passed.map(([id]) => (
              <div
                key={id}
                className="flex items-center gap-2 rounded-lg bg-green-50/50 px-2.5 py-1.5"
              >
                <CheckCircle2
                  size={10}
                  className="shrink-0 text-green-400"
                />
                <span className="text-[10px] font-mono text-green-600">
                  {id}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ── 교정 사항 ──

function CorrectionsSection({
  corrections,
}: {
  corrections: CorrectionItem[];
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1 text-xs font-medium text-foreground-muted">
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

// ── 심층 분석 ──

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
        <div className="mt-2 space-y-2.5">
          {sections.map((s, i) => (
            <div key={i}>
              <p className="text-[10px] font-medium text-primary-500">
                {s.label}
              </p>
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
