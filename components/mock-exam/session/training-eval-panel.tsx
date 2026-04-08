"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, BarChart3, Loader2 } from "lucide-react";
import { getEvaluation } from "@/lib/actions/mock-exam";

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

// 약점 카테고리 색상
const WP_CATEGORY: Record<string, { label: string; bg: string; text: string }> = {
  S: { label: "구조", bg: "bg-purple-50", text: "text-purple-600" },
  A: { label: "정확성", bg: "bg-blue-50", text: "text-blue-600" },
  C: { label: "내용", bg: "bg-green-50", text: "text-green-600" },
  T: { label: "과제", bg: "bg-indigo-50", text: "text-indigo-600" },
  D: { label: "전달", bg: "bg-amber-50", text: "text-amber-600" },
};

const SEVERITY_STYLE: Record<string, { dot: string; label: string }> = {
  severe: { dot: "bg-red-500", label: "심각" },
  moderate: { dot: "bg-orange-500", label: "보통" },
  mild: { dot: "bg-gray-400", label: "경미" },
};

// ── 타입 ──

interface TaskCheckItem {
  item: string;
  pass: boolean;
  evidence?: string;
}

interface WeakPoint {
  code: string;
  severity: string;
  reason: string;
  evidence?: string;
}

interface SpeechMeta {
  duration_sec: number;
  word_count: number;
  wpm: number;
  accuracy_score: number | null;
  fluency_score: number | null;
  pause_count_3s_plus: number;
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

// ── 메인 컴포넌트 ──

export function TrainingEvalPanel({
  sessionId,
  questionNumber,
  questionInfo,
  onClose,
}: TrainingEvalPanelProps) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

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

  const observation = data?.observation as string | null;
  const directions = (data?.directions || []) as string[];
  const fulfillment = data?.fulfillment as string | null;
  const taskChecklist = (data?.task_checklist || []) as TaskCheckItem[];
  const weakPoints = (data?.weak_points || []) as WeakPoint[];
  const targetGrade = data?.target_grade as string | null;
  const transcript = data?.transcript as string | null;
  const audioUrl = data?.audio_url as string | null;
  const speechMeta = data?.speech_meta as SpeechMeta | null;

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
      <div className="relative h-0 flex-grow">
        <div className="absolute inset-0 overflow-y-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
          <div className="rounded-xl border border-border bg-surface">
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
            ) : data.skipped_by_preprocess ? (
              <SkippedContent questionType={questionInfo?.question_type_eng} targetGrade={targetGrade} />
            ) : observation ? (
              <EvalContent
                fulfillment={fulfillment}
                taskChecklist={taskChecklist}
                targetGrade={targetGrade}
                observation={observation}
                directions={directions}
                weakPoints={weakPoints}
                audioUrl={audioUrl}
                transcript={transcript}
                speechMeta={speechMeta}
              />
            ) : (
              <p className="py-12 text-center text-sm text-foreground-muted">
                평가 데이터가 아직 생성되지 않았습니다.
              </p>
            )}
          </div>
        </div>
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

// ── 4파트 평가 콘텐츠 ──

function EvalContent({
  fulfillment,
  taskChecklist,
  targetGrade,
  observation,
  directions,
  weakPoints,
  audioUrl,
  transcript,
  speechMeta,
}: {
  fulfillment: string | null;
  taskChecklist: TaskCheckItem[];
  targetGrade: string | null;
  observation: string;
  directions: string[];
  weakPoints: WeakPoint[];
  audioUrl: string | null;
  transcript: string | null;
  speechMeta: SpeechMeta | null;
}) {
  const passCount = taskChecklist.filter((t) => t.pass).length;
  const totalCount = taskChecklist.length;

  return (
    <div className="divide-y divide-border">
      {/* Part A: 판정 — 과제 수행 체크리스트 */}
      <div className="px-4 py-4 md:px-6">
        <SectionTitle label="판정" sub="과제 수행" />
        <div className="mt-2 flex items-center gap-2">
          <FulfillmentBadge status={fulfillment} />
        </div>
        {taskChecklist.length > 0 && (
          <div className="mt-3 rounded-lg bg-surface-secondary px-4 py-3">
            <div className="mb-2 text-[11px] font-bold text-foreground-muted">
              {targetGrade} 기준 · {passCount}/{totalCount} 충족
            </div>
            <div className="space-y-1.5">
              {taskChecklist.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span
                    className={`mt-[2px] text-[13px] ${item.pass ? "text-green-600" : "text-red-500"}`}
                  >
                    {item.pass ? "✓" : "✗"}
                  </span>
                  <div className="flex-1">
                    <span
                      className={`text-xs leading-relaxed md:text-[13px] ${item.pass ? "text-foreground" : "text-foreground-muted"}`}
                    >
                      {item.item}
                    </span>
                    {item.evidence && (
                      <p className="mt-0.5 text-[11px] leading-relaxed text-foreground-muted italic">
                        {item.evidence}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Part B: 소견 — 평가 관찰 */}
      <div className="px-4 py-4 md:px-6">
        <SectionTitle label="소견" sub="평가 관찰" />
        <p className="mt-2 text-xs leading-relaxed text-foreground md:text-[13px] md:leading-7">
          {observation}
        </p>
      </div>

      {/* Part C: 방향 + 약점 */}
      {(directions.length > 0 || weakPoints.length > 0) && (
        <div className="px-4 py-4 md:px-6">
          {directions.length > 0 && (
            <>
              <SectionTitle label="방향" sub="개선 방향" />
              <ul className="mt-2 space-y-2">
                {directions.map((dir, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-[5px] h-[5px] w-[5px] shrink-0 rounded-full bg-primary-500" />
                    <span className="text-xs leading-relaxed text-foreground md:text-[13px] md:leading-7">
                      {dir}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {weakPoints.length > 0 && (
            <div className={directions.length > 0 ? "mt-4" : ""}>
              <SectionTitle label="약점" sub="병목 분석" />
              <div className="mt-2.5 space-y-2">
                {weakPoints.map((wp, idx) => (
                  <WeakPointTag key={idx} wp={wp} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Part D: 내 답변 — 음성 재생 + 트랜스크립트 + 메타 */}
      {(transcript || audioUrl) && (
        <div className="px-4 py-4 md:px-6">
          <p className="text-xs font-bold text-foreground-secondary md:text-[12px]">내 답변</p>
          <div className="mt-3 space-y-3">
            {audioUrl && <AudioPlayer url={audioUrl} />}

            {transcript && (
              <div className="rounded-lg bg-surface-secondary px-4 py-3">
                <p className="text-xs italic leading-relaxed text-foreground-secondary md:text-[13px] md:leading-7">
                  &ldquo;{transcript}&rdquo;
                </p>
              </div>
            )}

            {speechMeta && (
              <div className="flex flex-wrap gap-4 text-[11px] text-foreground-muted">
                <span>
                  발화 {Math.floor(speechMeta.duration_sec / 60)}분{" "}
                  {speechMeta.duration_sec % 60}초
                </span>
                <span>단어 {speechMeta.word_count}개</span>
                <span>속도 {speechMeta.wpm} WPM</span>
                {speechMeta.accuracy_score != null && (
                  <span>발음 {speechMeta.accuracy_score}점</span>
                )}
                {speechMeta.fluency_score != null && (
                  <span>유창성 {speechMeta.fluency_score}점</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 무응답 콘텐츠 ──

function SkippedContent({
  questionType,
  targetGrade,
}: {
  questionType?: string;
  targetGrade: string | null;
}) {
  const typeLabel = QT_KO[questionType || ""] || questionType || "";

  return (
    <div className="px-5 py-5">
      <div className="rounded-lg bg-surface-secondary px-4 py-4 text-center">
        <p className="text-[13px] text-foreground-muted">
          응답이 감지되지 않았습니다.
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-foreground-secondary">
          이 유형({typeLabel})의 문항은 {targetGrade || ""} 등급 취득을 위해
          반드시 수행해야 하는 과제입니다.
          <br />
          불완전하더라도 시도하는 것이 평가에 유리합니다.
        </p>
      </div>
    </div>
  );
}

// ── 섹션 제목 ──

function SectionTitle({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded bg-primary-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
        {label}
      </span>
      <span className="text-[12px] font-bold text-foreground-secondary">{sub}</span>
    </div>
  );
}

// ── 충족 판정 뱃지 ──

function FulfillmentBadge({ status }: { status: string | null }) {
  const config: Record<string, { label: string; color: string; icon: string }> = {
    fulfilled: { label: "충족", color: "text-green-600 bg-green-50", icon: "✓" },
    partial: { label: "부분 충족", color: "text-yellow-600 bg-yellow-50", icon: "△" },
    unfulfilled: { label: "미충족", color: "text-red-500 bg-red-50", icon: "✗" },
    skipped: { label: "스킵", color: "text-gray-500 bg-gray-50", icon: "—" },
  };
  const s = config[status || ""] || config.unfulfilled;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${s.color}`}>
      <span>{s.icon}</span>
      <span>{s.label}</span>
    </span>
  );
}

// ── 약점 코드 태그 ──

function WeakPointTag({ wp }: { wp: WeakPoint }) {
  const categoryKey = wp.code.split("_")[1]?.[0] || "S";
  const cat = WP_CATEGORY[categoryKey] || WP_CATEGORY.S;
  const sev = SEVERITY_STYLE[wp.severity] || SEVERITY_STYLE.mild;

  return (
    <div className="rounded-lg border border-border bg-surface px-3.5 py-2.5">
      <div className="flex items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${cat.bg} ${cat.text}`}>
          {wp.code}
        </span>
        <span className="text-[10px] font-medium text-foreground-muted">{cat.label}</span>
        <span className="flex items-center gap-1">
          <span className={`inline-block h-[6px] w-[6px] rounded-full ${sev.dot}`} />
          <span className="text-[10px] text-foreground-muted">{sev.label}</span>
        </span>
      </div>
      <p className="mt-1.5 text-[12px] leading-relaxed text-foreground">{wp.reason}</p>
      {wp.evidence && (
        <p className="mt-1 text-[11px] leading-relaxed text-foreground-muted italic">
          &ldquo;{wp.evidence}&rdquo;
        </p>
      )}
    </div>
  );
}

// ── 음성 재생 ──

function AudioPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface-secondary px-4 py-3">
      <audio ref={audioRef} src={url} preload="metadata" />

      <button
        onClick={togglePlay}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white transition-colors hover:bg-primary-700"
      >
        {playing ? (
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="ml-0.5 h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="flex flex-1 items-center gap-2">
        <span className="text-[10px] font-medium tabular-nums text-foreground-secondary">
          {formatTime(currentTime)}
        </span>
        <div
          className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-border"
          onClick={seek}
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-primary-500 transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-primary-500 bg-white shadow-sm transition-[left] duration-100"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>
        <span className="text-[10px] font-medium tabular-nums text-foreground-muted">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
