"use client";

/**
 * 발화 정량 분석 카드 — 답변별 객관 데이터
 *
 * - 시간 / 단어 / WPM / TTR / 필러 비율 / 평균 문장 길이
 * - 자주 쓴 단어 top 5
 * - Azure 발음 점수 (종합 + 4개 세부) + 약점 단어
 */

import { useMemo } from "react";
import { Sparkles, Mic2 } from "lucide-react";
import {
  analyzeSpeech,
  classifyFiller,
  classifyTtr,
  classifyWpm,
} from "@/lib/utils/speech-metrics";
import type { PronunciationScore } from "@/lib/types/opic-study";

interface Props {
  transcript: string | null;
  durationSec: number | null;
  pronunciation?: PronunciationScore | null;
}

export function SpeechMetrics({ transcript, durationSec, pronunciation }: Props) {
  const m = useMemo(
    () => analyzeSpeech(transcript, durationSec),
    [transcript, durationSec]
  );

  // 텍스트 없고 발음 점수도 없으면 안 그림
  if (!transcript && !pronunciation && !durationSec) return null;

  const wpmInfo = classifyWpm(m.wpm);
  const ttrInfo = classifyTtr(m.ttr);
  const fillerInfo = classifyFiller(m.filler_ratio);

  return (
    <div
      style={{
        padding: "8px 12px 10px",
        background: "var(--bp-surface)",
        borderBottom: "1px solid var(--bp-line)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <SectionLabel>
        <Sparkles size={11} color="var(--bp-tc)" strokeWidth={2.5} />
        발화 분석
      </SectionLabel>

      {/* 정량 6칸 그리드 (2x3 모바일, 3x2 PC) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 5,
        }}
      >
        <MetricCell label="시간" value={fmtDuration(m.duration_sec)} />
        <MetricCell label="단어" value={`${m.word_count}`} />
        <MetricCell
          label="속도 (WPM)"
          value={m.wpm !== null ? Math.round(m.wpm).toString() : "─"}
          badge={m.wpm !== null ? wpmInfo : null}
        />
        <MetricCell
          label="어휘 다양성"
          value={`${Math.round(m.ttr * 100)}%`}
          badge={m.word_count > 0 ? ttrInfo : null}
        />
        <MetricCell
          label="필러"
          value={`${m.filler_ratio.toFixed(1)}%`}
          sublabel={`${m.filler_count}회`}
          badge={m.word_count > 0 ? fillerInfo : null}
        />
        <MetricCell
          label="평균 문장"
          value={
            m.avg_sentence_length > 0
              ? `${m.avg_sentence_length.toFixed(1)}단어`
              : "─"
          }
          sublabel={`${m.sentence_count}문장`}
        />
      </div>

      {/* 자주 쓴 단어 top 5 */}
      {m.top_words.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: 0.5,
              color: "var(--bp-ink-3)",
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            자주 쓴 단어
          </span>
          {m.top_words.map((w) => (
            <span
              key={w.word}
              style={{
                padding: "1px 7px",
                borderRadius: 999,
                background: "var(--bp-surface-2)",
                border: "1px solid var(--bp-line)",
                fontSize: 10,
                color: "var(--bp-ink-2)",
                fontWeight: 600,
              }}
            >
              {w.word}{" "}
              <strong style={{ color: "var(--bp-tc)" }}>{w.count}</strong>
            </span>
          ))}
        </div>
      )}

      {/* Azure 발음 분석 */}
      {pronunciation && <PronunciationBlock score={pronunciation} />}
    </div>
  );
}

/* ─── 정량 셀 ─── */

function MetricCell({
  label,
  value,
  sublabel,
  badge,
}: {
  label: string;
  value: string;
  sublabel?: string;
  badge?: { label: string; color: string } | null;
}) {
  return (
    <div
      style={{
        padding: "5px 8px",
        background: "var(--bp-surface-2)",
        borderRadius: 6,
        border: "1px solid var(--bp-line)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 4,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 0.3,
            color: "var(--bp-ink-3)",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
        {badge && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: badge.color,
              flexShrink: 0,
            }}
          >
            {badge.label}
          </span>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 4,
          marginTop: 1,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 850,
            color: "var(--bp-ink)",
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </span>
        {sublabel && (
          <span
            style={{
              fontSize: 9,
              color: "var(--bp-ink-3)",
              fontWeight: 600,
            }}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Azure 발음 블록 ─── */

function PronunciationBlock({ score }: { score: PronunciationScore }) {
  const dims = [
    { label: "정확도", value: score.accuracy },
    { label: "유창성", value: score.fluency },
    { label: "억양", value: score.prosody },
    { label: "완결성", value: score.completeness },
  ];

  // 약점 단어 (error_type 있는 것)
  const weakWords = score.words
    .filter((w) => w.error_type)
    .slice(0, 8)
    .map((w) => ({
      word: w.word,
      acc: Math.round(w.accuracy),
      error: w.error_type ?? "",
    }));

  const overall = Math.round(score.pron_score);

  return (
    <div
      style={{
        padding: "8px 10px",
        background: "var(--bp-surface-2)",
        borderRadius: 6,
        border: "1px solid var(--bp-line)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <SectionLabel>
          <Mic2 size={11} color="var(--bp-tc)" strokeWidth={2.5} />
          발음 분석
        </SectionLabel>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 3,
            color: scoreColor(overall),
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 850, fontVariantNumeric: "tabular-nums" }}>
            {overall}
          </span>
          <span style={{ fontSize: 9, color: "var(--bp-ink-3)" }}>/ 100</span>
        </div>
      </div>

      {/* 종합 진행 바 */}
      <div
        style={{
          height: 4,
          borderRadius: 999,
          background: "var(--bp-line)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${overall}%`,
            height: "100%",
            background: scoreColor(overall),
            transition: "width 0.3s",
          }}
        />
      </div>

      {/* 4개 세부 차원 — 2열 그리드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          columnGap: 10,
          rowGap: 4,
        }}
      >
        {dims.map((d) => (
          <div key={d.label}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                marginBottom: 2,
              }}
            >
              <span style={{ color: "var(--bp-ink-2)", fontWeight: 600 }}>{d.label}</span>
              <span
                style={{
                  color: scoreColor(d.value),
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {Math.round(d.value)}
              </span>
            </div>
            <div
              style={{
                height: 3,
                borderRadius: 999,
                background: "var(--bp-line)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.max(0, Math.min(100, d.value))}%`,
                  height: "100%",
                  background: scoreColor(d.value),
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 약점 단어 */}
      {weakWords.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              color: "var(--bp-ink-3)",
              letterSpacing: 0.4,
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            약점 {weakWords.length}
          </span>
          {weakWords.map((w, i) => (
            <span
              key={`${w.word}-${i}`}
              title={`${w.error} · 정확도 ${w.acc}/100`}
              style={{
                padding: "1px 7px",
                borderRadius: 999,
                background: "rgba(220, 38, 38, 0.08)",
                border: "1px solid rgba(220, 38, 38, 0.2)",
                fontSize: 10,
                color: "rgb(185, 28, 28)",
                fontWeight: 700,
              }}
            >
              {w.word}{" "}
              <span style={{ opacity: 0.7, fontWeight: 600 }}>{w.acc}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── 헬퍼 ─── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.4,
        color: "var(--bp-ink-2)",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      {children}
    </p>
  );
}

function fmtDuration(sec: number | null): string {
  if (sec === null || !isFinite(sec)) return "─";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function scoreColor(value: number): string {
  if (value >= 80) return "#4a8e60";
  if (value >= 60) return "var(--bp-tc)";
  if (value >= 40) return "#b58634";
  return "rgb(185, 28, 28)";
}
