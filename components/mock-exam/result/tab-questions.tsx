"use client";

import { FileText } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
  FULFILLMENT_LABELS_KO,
  type FulfillmentStatus,
} from "@/lib/mock-data/mock-exam-result";
import {
  type QuestionEvalV2Real,
  type WeakPointV2,
} from "@/lib/mock-data/mock-exam-result-questions";

// 질문 유형 한글 매핑
const QUESTION_TYPE_KO: Record<string, string> = {
  description: "묘사",
  routine: "루틴",
  comparison: "비교·변화",
  past_childhood: "경험 (어린 시절)",
  past_special: "경험 (특별한)",
  past_recent: "경험 (최근)",
  rp_11: "롤플레이 (질문하기)",
  rp_12: "롤플레이 (대안 제시)",
  adv_14: "비교·변화 (어드밴스)",
  adv_15: "사회적 이슈 (어드밴스)",
};

// ── 문항별 평가 탭 데이터 인터페이스 ──

export interface QuestionsData {
  target_grade: string;
  session_grade: string;
  evaluations: QuestionEvalV2Real[];
}

interface TabQuestionsProps {
  /** 실데이터. 없으면 목 데이터 사용 */
  data?: QuestionsData | null;
}

// ── 문항별 평가 탭 (v2) — 실제 데이터 기반 ──

export function TabQuestions({ data }: TabQuestionsProps = {}) {
  if (!data) {
    return (
      <div className="mx-auto max-w-5xl px-3 py-16 sm:py-24">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50"><FileText className="h-7 w-7 text-primary-500" /></div>
          <p className="text-[15px] font-medium text-foreground">문항별 평가를 준비하고 있습니다</p>
          <p className="text-[13px] text-foreground-secondary">평가가 완료되면 각 문항의 소견과 개선 방향이 이 탭에 표시됩니다.</p>
        </div>
      </div>
    );
  }
  const { target_grade, session_grade, evaluations } = data;

  // 충족 현황 집계
  const counts = evaluations.reduce(
    (acc, e) => {
      acc[e.fulfillment] = (acc[e.fulfillment] || 0) + 1;
      return acc;
    },
    {} as Record<FulfillmentStatus, number>,
  );

  return (
    <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
      {/* 요약 바 */}
      <SummaryBar
        counts={counts}
        targetGrade={target_grade}
        sessionGrade={session_grade}
      />

      {/* 문항 카드 목록 */}
      <div className="mt-6 space-y-3">
        {evaluations.map((evalData) => (
          <QuestionCard key={evalData.question_number} data={evalData} />
        ))}
      </div>
    </div>
  );
}

// ── 요약 바 ──
function SummaryBar({
  counts,
  targetGrade,
  sessionGrade,
}: {
  counts: Record<string, number>;
  targetGrade: string;
  sessionGrade: string;
}) {
  const items: { key: FulfillmentStatus; color: string }[] = [
    { key: "fulfilled", color: "bg-[#e8f5e9] text-[#2e7d32]" },
    { key: "partial", color: "bg-[#fff3e0] text-[#e65100]" },
    { key: "unfulfilled", color: "bg-[#fce4ec] text-[#c62828]" },
    { key: "skipped", color: "bg-[#f5f5f5] text-[#9e9e9e]" },
  ];

  return (
    <div className="border border-[#d0d7e2] bg-white p-5 shadow-[0_12px_36px_rgba(20,28,38,0.06)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold text-[#2f3644]">
            목표 등급
          </span>
          <span className="rounded bg-[#2449d8] px-2 py-0.5 text-[13px] font-extrabold text-white">
            {targetGrade}
          </span>
          <span className="text-[12px] text-[#8a93a1]">기준 평가</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#8a93a1]">현재</span>
          <span className="rounded bg-[#f0f2f5] px-1.5 py-0.5 text-[11px] font-bold text-[#5f6976]">
            {sessionGrade}
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        {items.map(({ key, color }) => {
          const count = counts[key] || 0;
          if (count === 0) return null;
          return (
            <div
              key={key}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 ${color}`}
            >
              <span className="text-[14px] font-extrabold">{count}</span>
              <span className="text-[12px] font-bold">
                {FULFILLMENT_LABELS_KO[key]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 문항 카드 (아코디언) ──
function QuestionCard({ data }: { data: QuestionEvalV2Real }) {
  const [open, setOpen] = useState(false);
  const isSkipped = data.fulfillment === "skipped";

  return (
    <div className="border border-[#d0d7e2] bg-white shadow-[0_4px_12px_rgba(20,28,38,0.04)]">
      {/* 닫힌 상태 헤더 */}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-[#f7f9fc]"
      >
        {/* 문항 번호 */}
        <span className="mt-0.5 flex h-[24px] w-[24px] flex-shrink-0 items-center justify-center rounded-full bg-[#f0f2f5] text-[11px] font-bold text-[#5f6976]">
          {data.question_number}
        </span>

        {/* 제목 + 한줄 소견 */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-bold leading-[1.4] text-[#2f3644]">
              {data.question_title}
            </span>
            <TypeBadge type={data.question_type} />
            {data.topic && (
              <span className="text-[10px] text-[#8a93a1]">{data.topic}</span>
            )}
          </div>
          {!isSkipped && data.observation && (
            <p className="mt-1 line-clamp-1 text-[12px] leading-[1.5] text-[#8a93a1]">
              {data.observation.split(".")[0]}.
            </p>
          )}
        </div>

        {/* 충족 판정 + 화살표 */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <FulfillmentBadge status={data.fulfillment} />
          <svg
            className={`h-4 w-4 text-[#b7c1cf] transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* 펼친 상태 */}
      {open && (
        <div className="border-t border-[#e8edf3]">
          {isSkipped ? (
            <SkippedContent data={data} />
          ) : (
            <EvalContent data={data} />
          )}
        </div>
      )}
    </div>
  );
}

// ── 음성 재생 컴포넌트 ──
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
    <div className="flex items-center gap-3 rounded-lg bg-[#f0f2f5] px-4 py-3">
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* 재생/일시정지 버튼 */}
      <button
        onClick={togglePlay}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#2449d8] text-white transition-colors hover:bg-[#1a37a8]"
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

      {/* 프로그레스 바 */}
      <div className="flex flex-1 items-center gap-2">
        <span className="text-[10px] font-medium tabular-nums text-[#5f6976]">
          {formatTime(currentTime)}
        </span>
        <div
          className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-[#d0d7e2]"
          onClick={seek}
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-[#2449d8] transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-[#2449d8] bg-white shadow-sm transition-[left] duration-100"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>
        <span className="text-[10px] font-medium tabular-nums text-[#8a93a1]">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}

// ── 정상 응답 콘텐츠 (4파트) ──
function EvalContent({ data }: { data: QuestionEvalV2Real }) {
  const passCount = data.task_checklist.filter((t) => t.pass).length;
  const totalCount = data.task_checklist.length;

  return (
    <div className="divide-y divide-[#e8edf3]">
      {/* Part A: 판정 */}
      <div className="px-5 py-4">
        <SectionTitle label="판정" sub="과제 수행" />
        <div className="mt-2.5 rounded bg-[#f7f9fc] px-4 py-3">
          <div className="mb-2 text-[11px] font-bold text-[#8a93a1]">
            {data.target_grade} 기준 · {passCount}/{totalCount} 충족
          </div>
          <div className="space-y-1.5">
            {data.task_checklist.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span
                  className={`mt-[2px] text-[13px] ${item.pass ? "text-[#2e7d32]" : "text-[#c62828]"}`}
                >
                  {item.pass ? "✓" : "✗"}
                </span>
                <div className="flex-1">
                  <span
                    className={`text-[13px] leading-[1.5] ${item.pass ? "text-[#2f3644]" : "text-[#8a93a1]"}`}
                  >
                    {item.item}
                  </span>
                  {item.evidence && (
                    <p className="mt-0.5 text-[11px] leading-[1.5] text-[#a0a8b4] italic">
                      {item.evidence}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Part B: 소견 */}
      <div className="px-5 py-4">
        <SectionTitle label="소견" sub="평가 관찰" />
        <p className="mt-2 text-[13px] leading-[1.8] text-[#3a4553]">
          {data.observation}
        </p>
      </div>

      {/* Part C: 개선 방향 + 약점 코드 */}
      {(data.directions.length > 0 || data.weak_points.length > 0) && (
        <div className="px-5 py-4">
          {data.directions.length > 0 && (
            <>
              <SectionTitle label="방향" sub="개선 방향" />
              <ul className="mt-2 space-y-2">
                {data.directions.map((dir, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-[5px] h-[5px] w-[5px] flex-shrink-0 rounded-full bg-[#2449d8]" />
                    <span className="text-[13px] leading-[1.8] text-[#3a4553]">
                      {dir}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* 약점 코드 태그 */}
          {data.weak_points.length > 0 && (
            <div className={data.directions.length > 0 ? "mt-4" : ""}>
              <SectionTitle label="약점" sub="병목 분석" />
              <div className="mt-2.5 space-y-2">
                {data.weak_points.map((wp, idx) => (
                  <WeakPointTag key={idx} wp={wp} />
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Part D: 내 답변 (음성 재생 + 트랜스크립트) — 항상 펼침 */}
      {(data.transcript || data.audio_url) && (
        <div className="px-5 py-4">
          <p className="text-[12px] font-bold text-[#5f6976]">내 답변</p>
          <div className="mt-3 space-y-3">
            {/* 음성 재생 */}
            {data.audio_url && (
              <AudioPlayer url={data.audio_url} />
            )}

            {/* 트랜스크립트 */}
            {data.transcript && (
              <div className="rounded bg-[#f7f9fc] px-4 py-3">
                <p className="text-[13px] italic leading-[1.8] text-[#5f6976]">
                  &ldquo;{data.transcript}&rdquo;
                </p>
              </div>
            )}

            {/* 음성 메타 */}
            <div className="flex flex-wrap gap-4 text-[11px] text-[#8a93a1]">
              <span>
                발화{" "}
                {Math.floor(data.speech_meta.duration_sec / 60)}분{" "}
                {data.speech_meta.duration_sec % 60}초
              </span>
              <span>단어 {data.speech_meta.word_count}개</span>
              <span>속도 {data.speech_meta.wpm} WPM</span>
              {data.speech_meta.accuracy_score && (
                <span>발음 {data.speech_meta.accuracy_score}점</span>
              )}
              {data.speech_meta.fluency_score && (
                <span>유창성 {data.speech_meta.fluency_score}점</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 무응답 콘텐츠 ──
function SkippedContent({ data }: { data: QuestionEvalV2Real }) {
  const typeLabel = QUESTION_TYPE_KO[data.question_type] || data.question_type;

  return (
    <div className="px-5 py-5">
      <div className="rounded bg-[#f5f5f5] px-4 py-4 text-center">
        <p className="text-[13px] text-[#9e9e9e]">
          응답이 감지되지 않았습니다.
        </p>
        <p className="mt-2 text-[12px] leading-[1.6] text-[#8a93a1]">
          이 유형({typeLabel})의 문항은 {data.target_grade} 등급 취득을 위해
          반드시 수행해야 하는 과제입니다.
          <br />
          불완전하더라도 시도하는 것이 평가에 유리합니다.
        </p>
      </div>
    </div>
  );
}

// ── 유형 뱃지 ──
function TypeBadge({ type }: { type: string }) {
  const label = QUESTION_TYPE_KO[type] || type;
  return (
    <span className="rounded bg-[#f0f2f5] px-2 py-0.5 text-[10px] font-bold text-[#5f6976]">
      {label}
    </span>
  );
}

// ── 충족 판정 뱃지 ──
function FulfillmentBadge({ status }: { status: FulfillmentStatus }) {
  const label = FULFILLMENT_LABELS_KO[status];
  const colorMap: Record<FulfillmentStatus, { bg: string; text: string; icon: string }> = {
    fulfilled: { bg: "bg-[#e8f5e9]", text: "text-[#2e7d32]", icon: "✓" },
    partial: { bg: "bg-[#fff3e0]", text: "text-[#e65100]", icon: "△" },
    unfulfilled: { bg: "bg-[#fce4ec]", text: "text-[#c62828]", icon: "✗" },
    skipped: { bg: "bg-[#f5f5f5]", text: "text-[#9e9e9e]", icon: "—" },
  };
  const c = colorMap[status];

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-1 text-[11px] font-bold ${c.bg} ${c.text}`}
    >
      <span>{c.icon}</span>
      <span>{label}</span>
    </span>
  );
}

// ── 약점 코드 태그 (v2) ──
// 카테고리별 색상: S(구조)=보라, A(정확성)=파랑, C(내용)=초록, T(과제)=남색, D(전달)=갈색
const WP_CATEGORY: Record<string, { label: string; bg: string; text: string }> = {
  S: { label: "구조", bg: "bg-[#f3e8ff]", text: "text-[#7c3aed]" },
  A: { label: "정확성", bg: "bg-[#dbeafe]", text: "text-[#2563eb]" },
  C: { label: "내용", bg: "bg-[#dcfce7]", text: "text-[#16a34a]" },
  T: { label: "과제", bg: "bg-[#e0e7ff]", text: "text-[#4338ca]" },
  D: { label: "전달", bg: "bg-[#fef3c7]", text: "text-[#b45309]" },
};

const SEVERITY_STYLE: Record<string, { dot: string; label: string }> = {
  severe: { dot: "bg-[#dc2626]", label: "심각" },
  moderate: { dot: "bg-[#ea580c]", label: "보통" },
  mild: { dot: "bg-[#9ca3af]", label: "경미" },
};

function WeakPointTag({ wp }: { wp: WeakPointV2 }) {
  // WP_S03 → "S"
  const categoryKey = wp.code.split("_")[1]?.[0] || "S";
  const cat = WP_CATEGORY[categoryKey] || WP_CATEGORY.S;
  const sev = SEVERITY_STYLE[wp.severity] || SEVERITY_STYLE.mild;

  return (
    <div className="rounded-lg border border-[#e8edf3] bg-[#fafbfd] px-3.5 py-2.5">
      {/* 상단: 코드 뱃지 + 카테고리 + 심각도 */}
      <div className="flex items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${cat.bg} ${cat.text}`}
        >
          {wp.code}
        </span>
        <span className="text-[10px] font-medium text-[#8a93a1]">
          {cat.label}
        </span>
        <span className="flex items-center gap-1">
          <span className={`inline-block h-[6px] w-[6px] rounded-full ${sev.dot}`} />
          <span className="text-[10px] text-[#8a93a1]">{sev.label}</span>
        </span>
      </div>

      {/* 원인 */}
      <p className="mt-1.5 text-[12px] leading-[1.6] text-[#3a4553]">
        {wp.reason}
      </p>

      {/* 근거 (트랜스크립트 발췌) */}
      {wp.evidence && (
        <p className="mt-1 text-[11px] leading-[1.5] text-[#a0a8b4] italic">
          &ldquo;{wp.evidence}&rdquo;
        </p>
      )}
    </div>
  );
}

// ── 섹션 제목 ──
function SectionTitle({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded bg-[#2449d8] px-1.5 py-0.5 text-[10px] font-extrabold text-white">
        {label}
      </span>
      <span className="text-[12px] font-bold text-[#5f6976]">{sub}</span>
    </div>
  );
}
