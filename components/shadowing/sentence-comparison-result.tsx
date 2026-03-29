"use client";

import { RotateCcw, ChevronRight, Lightbulb } from "lucide-react";
import { PitchComparisonChart } from "./pitch-comparison-chart";
import { AudioPlaybackRow } from "./audio-playback-row";
import type { PronunciationScore } from "@/lib/audio/pronunciation-scorer";
import type { PitchFrame } from "@/lib/audio/pitch-extractor";

interface SentenceComparisonResultProps {
  sentenceIndex: number;
  totalSentences: number;
  score: PronunciationScore;
  nativePitch: PitchFrame[];
  userPitch: PitchFrame[];
  recordingBlob: Blob | null;
  nativeAudioUrl: string | null;
  sentenceStart?: number;
  sentenceEnd?: number;
  onRetry: () => void;
  onNext: () => void;
}

// 점수 → 색상 매핑
function scoreGradient(score: number): string {
  if (score >= 80) return "from-green-500 to-emerald-400";
  if (score >= 60) return "from-amber-500 to-yellow-400";
  return "from-red-500 to-orange-400";
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-green-50 border-green-200 text-green-700";
  if (score >= 60) return "bg-amber-50 border-amber-200 text-amber-700";
  return "bg-red-50 border-red-200 text-red-700";
}

function scoreLabel(score: number): string {
  if (score >= 90) return "완벽해요!";
  if (score >= 80) return "훌륭해요";
  if (score >= 70) return "잘했어요";
  if (score >= 60) return "괜찮아요";
  if (score >= 40) return "연습 필요";
  return "다시 도전";
}

// 원형 점수 게이지 SVG
function ScoreGauge({ score, size = 80 }: { score: number; size?: number }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(1, score / 100)));

  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* 배경 트랙 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-surface-secondary"
        />
        {/* 점수 호 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      {/* 중앙 점수 */}
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold tabular-nums text-foreground">{score}</span>
      </div>
    </div>
  );
}

// 영역별 미니 점수 카드
function ScoreCard({ label, score, icon }: { label: string; score: number; icon: string }) {
  const color = score >= 80 ? "text-green-600" : score >= 60 ? "text-amber-600" : "text-red-500";
  const barColor = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-amber-500" : "bg-red-400";

  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl bg-surface-secondary/50 px-3 py-3">
      <span className="text-sm">{icon}</span>
      <span className={`text-[17px] font-bold tabular-nums ${color}`}>{score}</span>
      <div className="h-1 w-full overflow-hidden rounded-full bg-border/50">
        <div className={`h-1 rounded-full ${barColor} transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] font-medium text-foreground-muted">{label}</span>
    </div>
  );
}

export function SentenceComparisonResult({
  sentenceIndex,
  totalSentences,
  score,
  nativePitch,
  userPitch,
  recordingBlob,
  nativeAudioUrl,
  sentenceStart,
  sentenceEnd,
  onRetry,
  onNext,
}: SentenceComparisonResultProps) {
  const isLastSentence = sentenceIndex >= totalSentences - 1;

  return (
    <div className="space-y-4">
      {/* 종합 점수 헤더 */}
      <div className="flex items-center gap-4">
        <ScoreGauge score={score.overallScore} />
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${scoreBg(score.overallScore)}`}>
              {scoreLabel(score.overallScore)}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-foreground-muted">
            문장 {sentenceIndex + 1}/{totalSentences}
          </p>
        </div>
      </div>

      {/* 영역별 점수 — 4열 그리드 (MFCC 발음 유사도 포함) */}
      <div className="grid grid-cols-4 gap-1.5">
        <ScoreCard label="발음" score={score.pronunciationScore} icon="🗣" />
        <ScoreCard label="억양" score={score.pitchScore} icon="🎵" />
        <ScoreCard label="타이밍" score={score.timingScore} icon="⏱" />
        <ScoreCard label="강세" score={score.energyScore} icon="💪" />
      </div>

      {/* 피치 비교 차트 */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface p-3">
        <p className="mb-1 text-[10px] font-medium text-foreground-muted">억양 비교</p>
        <PitchComparisonChart nativePitch={nativePitch} userPitch={userPitch} />
      </div>

      {/* 음성 재생 비교 */}
      {(nativeAudioUrl || recordingBlob) && (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-3 py-1.5">
            <span className="text-[10px] font-semibold text-foreground-muted">음성 비교</span>
          </div>
          <div className="space-y-1 px-3 py-2.5">
            {nativeAudioUrl && (
              <AudioPlaybackRow
                label="원어민"
                audioUrl={nativeAudioUrl}
                startTime={sentenceStart}
                endTime={sentenceEnd}
                color="primary"
              />
            )}
            {recordingBlob && (
              <AudioPlaybackRow
                label="내 발음"
                blob={recordingBlob}
                color="blue"
              />
            )}
          </div>
        </div>
      )}

      {/* 피드백 */}
      {score.feedback && (
        <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 ${
          score.overallScore >= 80
            ? "bg-green-50/60 border border-green-200/60"
            : score.overallScore >= 60
              ? "bg-amber-50/60 border border-amber-200/60"
              : "bg-red-50/40 border border-red-200/60"
        }`}>
          <Lightbulb size={14} className={`mt-0.5 shrink-0 ${
            score.overallScore >= 80 ? "text-green-500" : score.overallScore >= 60 ? "text-amber-500" : "text-red-400"
          }`} />
          <p className="text-xs leading-relaxed text-foreground-secondary">{score.feedback}</p>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onRetry}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground-secondary transition-all hover:bg-surface-secondary active:scale-[0.98]"
        >
          <RotateCcw size={14} />
          다시 시도
        </button>
        <button
          onClick={onNext}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98] ${scoreGradient(score.overallScore)}`}
        >
          {isLastSentence ? "완료" : "다음 문장"}
          {!isLastSentence && <ChevronRight size={14} />}
        </button>
      </div>
    </div>
  );
}
