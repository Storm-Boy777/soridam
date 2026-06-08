"use client";

import { Headphones } from "lucide-react";
import type { ListenTrack } from "@/lib/actions/scripts";
import { QUESTION_TYPE_LABELS } from "@/lib/types/reviews";

// ─────────────────────────────────────────────────────────────
// 생성형 그라디언트 커버 — 실제 앨범 이미지가 없으므로 질문 유형에서
// 결정론적으로 색을 도출한다. (음악 앱이 아트가 없을 때 쓰는 방식)
//
// ⚠️ Tailwind v4 purge 회피: 그라디언트 클래스를 문자열 조합으로 만들면
//    빌드 시 제거된다. 반드시 "완성된 클래스 문자열"을 상수로 둔다(safelist).
//    히어로 커버 · 미니 커버 · 카드 헤일로가 모두 이 한 맵을 공유한다.
//
// 대비 규칙: 밝은 from색(amber/rose/pink/orange)이라도 to-는 항상 primary-600/700로
//    수렴 → 흰 글리프가 어떤 유형에서도 읽힌다. + black/8 오버레이 + text-shadow 보강.
// ─────────────────────────────────────────────────────────────
export const LISTEN_TYPE_GRADIENT: Record<string, string> = {
  description:    "bg-gradient-to-br from-blue-400 via-primary-400 to-indigo-600",
  routine:        "bg-gradient-to-br from-emerald-400 via-teal-500 to-primary-600",
  comparison:     "bg-gradient-to-br from-violet-400 via-purple-500 to-primary-700",
  past_childhood: "bg-gradient-to-br from-rose-400 via-accent-500 to-primary-600",
  past_recent:    "bg-gradient-to-br from-orange-400 via-accent-500 to-primary-600",
  past_special:   "bg-gradient-to-br from-amber-400 via-accent-500 to-primary-600",
  rp_11:          "bg-gradient-to-br from-teal-400 via-cyan-500 to-primary-700",
  rp_12:          "bg-gradient-to-br from-indigo-400 via-primary-500 to-primary-700",
  adv_14:         "bg-gradient-to-br from-red-400 via-accent-600 to-primary-700",
  adv_15:         "bg-gradient-to-br from-pink-400 via-fuchsia-500 to-primary-700",
};

const FALLBACK_GRADIENT = "bg-gradient-to-br from-primary-300 via-primary-400 to-primary-600";

export function gradientFor(type: string | null | undefined): string {
  return (type && LISTEN_TYPE_GRADIENT[type]) || FALLBACK_GRADIENT;
}

// 곡별 변주 — 같은 유형이라도 주제가 다르면 글로우 위치가 달라 커버가 구별된다.
// 같은 곡은 항상 같은 커버(결정론적). topic이 null이어도 questionId/scriptId로 폴백 → NaN 없음.
const GLOW = [
  "bg-[radial-gradient(120%_80%_at_25%_20%,rgba(255,255,255,0.22),transparent_60%)]",
  "bg-[radial-gradient(120%_80%_at_75%_22%,rgba(255,255,255,0.20),transparent_60%)]",
  "bg-[radial-gradient(130%_90%_at_50%_12%,rgba(255,255,255,0.18),transparent_62%)]",
];

function hashSeed(t: ListenTrack | null): number {
  const s = t?.topic || t?.questionId || t?.scriptId || "x";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (s.charCodeAt(i) + ((h << 5) - h)) | 0;
  return Math.abs(h);
}

function initialOf(track: ListenTrack | null): string {
  const fromTopic = track?.topic?.trim()?.[0];
  if (fromTopic) return fromTopic;
  const label = track?.questionType ? QUESTION_TYPE_LABELS[track.questionType] : null;
  if (label) return label[0];
  return "♪";
}

// 재생 중 표시 — 이퀄라이저 바 (transform: scaleY 기반 → 레이아웃 비용 0)
// keyframes는 globals.css의 @keyframes eq-bar. motion-reduce면 정지 막대.
export function EqBars({ size = "lg" }: { size?: "lg" | "sm" }) {
  const cfg =
    size === "lg"
      ? { wrap: "h-4 gap-0.5", bar: "w-1", h: 6, n: 4 }
      : { wrap: "h-3 gap-px", bar: "w-0.5", h: 5, n: 3 };
  return (
    <span className={`flex items-end ${cfg.wrap}`} aria-hidden>
      {Array.from({ length: cfg.n }).map((_, i) => (
        <span
          key={i}
          className={`${cfg.bar} origin-bottom rounded-full bg-white motion-safe:[animation:eq-bar_0.9s_ease-in-out_infinite]`}
          style={{ animationDelay: `${i * 0.12}s`, height: cfg.h }}
        />
      ))}
    </span>
  );
}

const HERO_BOX =
  "aspect-square w-[clamp(160px,48vw,232px)] sm:w-[232px] lg:w-full lg:max-w-[300px]";

export function TrackArtwork({
  track,
  isPlaying,
  inGap = false,
  gapLeft = 0,
  size = "hero",
}: {
  track: ListenTrack | null;
  isPlaying: boolean;
  inGap?: boolean;
  gapLeft?: number;
  size?: "hero" | "mini";
}) {
  // ── 빈 상태(선택된 곡 없음) ──
  if (!track) {
    if (size === "mini") {
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-gradient-to-br from-surface-secondary to-border">
          <Headphones size={15} className="text-foreground-muted" />
        </div>
      );
    }
    return (
      <div
        className={`relative mx-auto flex items-center justify-center overflow-hidden rounded-[var(--radius-2xl)] bg-gradient-to-br from-surface-secondary to-border shadow-[var(--shadow-card-hover)] ${HERO_BOX}`}
      >
        <Headphones size={52} className="text-foreground-muted" />
      </div>
    );
  }

  const grad = gradientFor(track.questionType);
  const initial = initialOf(track);

  // ── 미니 커버(재생목록 행) ── 번호/EQ는 호출부에서 오버레이로 얹는다.
  if (size === "mini") {
    return (
      <div className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-[10px] ${grad}`}>
        <div className="absolute inset-0 bg-black/10" />
      </div>
    );
  }

  // ── 히어로 커버 ──
  const glow = GLOW[hashSeed(track) % GLOW.length];

  return (
    <div
      data-playing={isPlaying}
      className={`group relative mx-auto overflow-hidden rounded-[var(--radius-2xl)] shadow-[var(--shadow-card-hover)] transition-shadow duration-300 data-[playing=true]:shadow-[var(--shadow-primary)] ${HERO_BOX}`}
    >
      {/* 그라디언트 면 — 재생 시 호흡(scale). 컨테이너 고정이라 레이아웃 변화 0 */}
      <div
        className={`absolute inset-0 ${grad} scale-[0.94] transition-transform duration-500 ease-out group-data-[playing=true]:scale-100 motion-reduce:scale-100 motion-reduce:transition-none`}
      />
      {/* 곡별 글로우 */}
      <div className={`pointer-events-none absolute inset-0 ${glow}`} />
      {/* 가독성 오버레이 */}
      <div className="pointer-events-none absolute inset-0 bg-black/[0.08]" />
      {/* 중앙 이니셜 */}
      <div className="absolute inset-0 flex items-center justify-center text-6xl font-bold text-white/75 [text-shadow:0_2px_12px_rgba(0,0,0,0.28)] sm:text-7xl">
        {initial}
      </div>
      {/* 재생 중 EQ (우하단, absolute → 레이아웃 영향 없음) */}
      {isPlaying && !inGap && (
        <div className="absolute bottom-3 right-3">
          <EqBars size="lg" />
        </div>
      )}
      {/* 생각 간격 오버레이 */}
      {inGap && (
        <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/40 text-3xl font-bold tabular-nums text-white">
          <span>🤔</span>
          <span>{gapLeft}</span>
        </div>
      )}
    </div>
  );
}
