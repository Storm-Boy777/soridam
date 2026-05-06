"use client";

/**
 * QuestionAudioRow — 한 질문 한 줄 (Q번호 + 유형 + 한국어 + 영어 + 음성 버튼)
 *
 * 재사용처:
 *   - 기출 둘러보기 (콤보 블록 안 질문 행)
 *   - 콤보 둘러보기 상세 (질문 카드 안)
 *
 * 음성 재생: questions.audio_url + useQuestionPlayer 훅 (모의고사 자산 재사용)
 */

import { Play, Pause } from "lucide-react";
import { useQuestionPlayer } from "@/lib/hooks/use-question-player";

interface Props {
  questionNumber: number;
  typeLabel?: string | null;     // '묘사' / '비교' 등 (없으면 표시 X)
  korean: string | null;         // 한 줄 요약 또는 풀 번역
  english: string;               // 영어 원문
  audioUrl: string | null;       // 음성 URL (없으면 박스 클릭 X)
  onClickGuide?: () => void;     // 콤보 가이드 보기 (옵션)
}

export function QuestionAudioRow({
  questionNumber,
  typeLabel,
  korean,
  english,
  audioUrl,
  onClickGuide,
}: Props) {
  const { isPlaying, play, reset, playbackProgress } = useQuestionPlayer();

  const handleAudioToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioUrl) return;
    if (isPlaying) reset();
    else play(audioUrl);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "12px 0",
      }}
    >
      {/* 헤더 — Q번호 + 유형 + 한국어 요약 + 가이드 버튼 */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 32,
            height: 22,
            padding: "0 8px",
            borderRadius: 6,
            background: "var(--bp-surface-2)",
            color: "var(--bp-ink-2)",
            fontWeight: 800,
            fontSize: 12,
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
          }}
        >
          Q{questionNumber}
        </span>
        {typeLabel && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 8px",
              borderRadius: 999,
              background: "var(--bp-tc-tint)",
              color: "var(--bp-tc)",
              fontWeight: 700,
              fontSize: 11,
            }}
          >
            {typeLabel}
          </span>
        )}
        {korean && (
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 13,
              color: "var(--bp-ink)",
              fontWeight: 600,
              lineHeight: 1.5,
            }}
          >
            {korean}
          </span>
        )}
        {onClickGuide && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClickGuide();
            }}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--bp-tc)",
              background: "transparent",
              border: "1px solid var(--bp-tc)",
              borderRadius: 999,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            가이드 →
          </button>
        )}
      </div>

      {/* 영어 원문 + 음성 통합 박스 (옵션 A — 우상단 ▶ 버튼) */}
      <div
        role={audioUrl ? "button" : undefined}
        tabIndex={audioUrl ? 0 : undefined}
        onClick={audioUrl ? handleAudioToggle : undefined}
        onKeyDown={
          audioUrl
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleAudioToggle(e as unknown as React.MouseEvent);
                }
              }
            : undefined
        }
        aria-label={audioUrl ? (isPlaying ? "재생 일시정지" : "영어로 듣기") : undefined}
        style={{
          position: "relative",
          padding: audioUrl ? "12px 46px 14px 14px" : "10px 12px",
          background: isPlaying
            ? "var(--bp-tc-tint)"
            : "var(--bp-surface-2)",
          borderRadius: 10,
          fontSize: 13,
          lineHeight: 1.55,
          color: "var(--bp-ink)",
          fontStyle: "italic",
          cursor: audioUrl ? "pointer" : "default",
          transition: "background 0.18s",
          overflow: "hidden",
        }}
      >
        “{english}”

        {/* 우상단 동그란 재생 버튼 */}
        {audioUrl && (
          <button
            type="button"
            onClick={handleAudioToggle}
            aria-label={isPlaying ? "일시정지" : "영어로 듣기"}
            title={isPlaying ? "일시정지" : "영어로 듣기"}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: isPlaying ? "var(--bp-tc)" : "var(--bp-surface)",
              border: "1px solid var(--bp-tc)",
              color: isPlaying ? "var(--bp-surface)" : "var(--bp-tc)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
              flexShrink: 0,
              boxShadow: isPlaying
                ? "0 0 0 4px rgba(201, 100, 66, 0.15)"
                : "none",
            }}
          >
            {isPlaying ? (
              <Pause size={12} strokeWidth={2.2} fill="currentColor" />
            ) : (
              <Play size={12} strokeWidth={2.2} fill="currentColor" />
            )}
          </button>
        )}

        {/* 재생 중 진행 바 (박스 하단) */}
        {audioUrl && isPlaying && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              background: "var(--bp-line)",
            }}
            aria-hidden="true"
          >
            <div
              style={{
                width: `${playbackProgress}%`,
                height: "100%",
                background: "var(--bp-tc)",
                transition: "width 0.1s linear",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
