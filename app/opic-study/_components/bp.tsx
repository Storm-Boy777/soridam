/**
 * BP (Best Practice) 디자인 시스템 컴포넌트
 *
 * 출처: docs/디자인/opic/project/hifi.css + hf-*.jsx
 * 디렉션: Notion 골격 + Things 3 디테일 + 따뜻한 크림/테라코타
 *
 * 모든 컴포넌트는 .bp-scope 안에서 동작 (CSS 격리).
 */

"use client";

import type { ReactNode, MouseEventHandler, ButtonHTMLAttributes } from "react";
import { useEffect, useRef } from "react";

// ============================================================
// Phone Shell (모바일 프레임 360x760)
// ============================================================

interface HfPhoneProps {
  children: ReactNode;
  className?: string;
  /** 실제 라우트에서 풀스크린으로 보일 때 (디자인 시안 모드 X) */
  liveMode?: boolean;
}

export function HfPhone({ children, className = "", liveMode = false }: HfPhoneProps) {
  if (liveMode) {
    return (
      <div
        className={`bp-scope ${className}`}
        style={{
          width: "100%",
          maxWidth: 480,
          minHeight: "100dvh",
          height: "100dvh",
          margin: "0 auto",
          background: "var(--bp-bg)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`bp-scope ${className}`}
      style={{
        width: 360,
        height: 760,
        background: "var(--bp-bg)",
        borderRadius: 36,
        border: "1px solid var(--bp-line-strong)",
        boxShadow: "var(--bp-shadow-lg)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}

// ============================================================
// PC Shell
// ============================================================

interface HfPcProps {
  children: ReactNode;
  className?: string;
}

export function HfPc({ children, className = "" }: HfPcProps) {
  return (
    <div
      className={`bp-scope ${className}`}
      style={{
        width: "100%",
        height: "100%",
        background: "var(--bp-bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
}

// ============================================================
// 모바일 상태 바 (9:41 시계)
// ============================================================

export function HfStatusBar() {
  return (
    <div
      style={{
        height: 44,
        flex: "0 0 44px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        fontSize: 14,
        fontWeight: 600,
        color: "var(--bp-ink)",
      }}
    >
      <span className="t-num">9:41</span>
      <div style={{ display: "flex", gap: 4 }}>
        <i style={{ width: 4, height: 4, background: "var(--bp-ink)", borderRadius: "50%", display: "inline-block" }} />
        <i style={{ width: 4, height: 4, background: "var(--bp-ink)", borderRadius: "50%", display: "inline-block" }} />
        <i style={{ width: 4, height: 4, background: "var(--bp-ink)", borderRadius: "50%", display: "inline-block" }} />
      </div>
      <span className="t-num">100%</span>
    </div>
  );
}

// ============================================================
// 헤더 (← 타이틀 + 서브 + 우측)
// ============================================================

interface HfHeaderProps {
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode | null;
  onBack?: MouseEventHandler<HTMLButtonElement>;
}

export function HfHeader({ title, sub, right, onBack }: HfHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 20px",
        borderBottom: "1px solid var(--bp-line)",
        background: "var(--bp-bg)",
        flex: "0 0 auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {onBack !== undefined && (
          <button
            onClick={onBack}
            style={{
              fontSize: 18,
              color: "var(--bp-ink-2)",
              cursor: "pointer",
              background: "transparent",
              border: "none",
              padding: 0,
            }}
            aria-label="뒤로"
          >
            ←
          </button>
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span className="t-h3">{title}</span>
          {sub && <span className="t-micro ink-3">{sub}</span>}
        </div>
      </div>
      {right === undefined ? <span className="bp-pill live">실시간</span> : right}
    </div>
  );
}

// ============================================================
// PC 헤더 (breadcrumb + 우측)
// ============================================================

interface HfPcHeaderProps {
  crumbs: string[];
  current: string;
  right?: ReactNode;
  onBack?: MouseEventHandler<HTMLButtonElement>;
}

export function HfPcHeader({ crumbs, current, right, onBack }: HfPcHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 20px",
        borderBottom: "1px solid var(--bp-line)",
        background: "var(--bp-bg)",
        flex: "0 0 auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              fontSize: 16,
              color: "var(--bp-ink-2)",
              cursor: "pointer",
              background: "transparent",
              border: "none",
              padding: 0,
            }}
            aria-label="뒤로"
          >
            ←
          </button>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "var(--bp-ink-3)",
          }}
        >
          {crumbs.map((c, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>{c}</span>
              <span>›</span>
            </span>
          ))}
          <span style={{ color: "var(--bp-ink)", fontWeight: 600 }}>{current}</span>
        </div>
      </div>
      {right}
    </div>
  );
}

// ============================================================
// Step 진행 바 (1/7)
// ============================================================

interface HfStepBarProps {
  now: number;
  total?: number;
  className?: string;
}

export function HfStepBar({ now, total = 7, className = "" }: HfStepBarProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "16px 20px 0",
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: i + 1 === now ? "0 0 24px" : 1,
            height: 4,
            borderRadius: 2,
            background:
              i + 1 < now
                ? "var(--bp-ink-2)"
                : i + 1 === now
                ? "var(--bp-tc)"
                : "var(--bp-line-strong)",
          }}
        />
      ))}
      <span className="t-micro ink-3 t-num" style={{ marginLeft: 6 }}>
        {now} / {total}
      </span>
    </div>
  );
}

// ============================================================
// Body (스크롤 가능 영역)
// ============================================================

interface HfBodyProps {
  children: ReactNode;
  padding?: string;
  className?: string;
}

export function HfBody({ children, padding = "20px", className = "" }: HfBodyProps) {
  return (
    <div
      className={className}
      style={{
        flex: 1,
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
        padding,
      }}
    >
      {children}
    </div>
  );
}

// ============================================================
// Footer (sticky CTA)
// ============================================================

interface HfFooterProps {
  children: ReactNode;
}

export function HfFooter({ children }: HfFooterProps) {
  return (
    <div
      style={{
        padding: "16px 20px 24px",
        background: "var(--bp-bg)",
        borderTop: "1px solid var(--bp-line)",
        flex: "0 0 auto",
      }}
    >
      {children}
    </div>
  );
}

// ============================================================
// 버튼
// ============================================================

type BtnVariant = "primary" | "secondary" | "ghost" | "tc";
type BtnSize = "default" | "lg" | "sm";

interface HfButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size"> {
  variant?: BtnVariant;
  size?: BtnSize;
  full?: boolean;
}

export function HfButton({
  variant = "primary",
  size = "default",
  full = false,
  className = "",
  children,
  ...rest
}: HfButtonProps) {
  const sizeCls = size === "lg" ? "lg" : size === "sm" ? "sm" : "";
  return (
    <button
      className={`bp-btn ${variant} ${sizeCls} ${full ? "full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// ============================================================
// 카드
// ============================================================

type CardVariant = "default" | "lift" | "flat";

interface HfCardProps {
  children: ReactNode;
  variant?: CardVariant;
  padding?: number | string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

export function HfCard({
  children,
  variant = "default",
  padding,
  className = "",
  style,
  onClick,
}: HfCardProps) {
  const variantCls = variant === "lift" ? "lift" : variant === "flat" ? "flat" : "";
  return (
    <div
      className={`bp-card ${variantCls} ${className}`}
      style={{ padding, ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ============================================================
// 멤버 dot
// ============================================================

type MbColor = "a" | "b" | "c" | "d";

interface MbDotProps {
  color: MbColor;
  initial: string;
  live?: boolean;
  size?: number;
  fontSize?: number;
  style?: React.CSSProperties;
}

export function MbDot({
  color,
  initial,
  live = false,
  size,
  fontSize,
  style,
}: MbDotProps) {
  return (
    <span
      className={`bp-mb-dot ${color} ${live ? "live" : ""}`}
      style={{
        ...(size ? { width: size, height: size } : {}),
        ...(fontSize ? { fontSize } : {}),
        ...style,
      }}
    >
      {initial}
    </span>
  );
}

// 멤버 dots 스택
interface MbStackProps {
  members: Array<{ color: MbColor; initial: string; live?: boolean }>;
}

export function MbStack({ members }: MbStackProps) {
  return (
    <div className="bp-mb-stack">
      {members.map((m, i) => (
        <MbDot key={i} color={m.color} initial={m.initial} live={m.live} />
      ))}
    </div>
  );
}

// ============================================================
// 코치 아바타 (◐ 추상 심볼)
// ============================================================

interface CoachAvatarProps {
  size?: "sm" | "default" | "lg" | "xl";
  className?: string;
}

export function CoachAvatar({ size = "default", className = "" }: CoachAvatarProps) {
  const sizeCls = size === "default" ? "" : size;
  return <div className={`bp-coach-avatar ${sizeCls} ${className}`}>◐</div>;
}

// ============================================================
// 코칭 블록 (잘한 점 / 다듬을 부분 / 팁)
// ============================================================

type CoachTone = "good" | "polish" | "tip";

interface CoachBlockProps {
  tone: CoachTone;
  label?: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const TONE_LABEL: Record<CoachTone, string> = {
  good: "잘한 점",
  polish: "다듬을 부분",
  tip: "팁",
};

export function CoachBlock({
  tone,
  label,
  children,
  className = "",
  style,
}: CoachBlockProps) {
  return (
    <div className={`bp-coach-block ${tone} ${className}`} style={style}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Tag tone={tone}>{label ?? TONE_LABEL[tone]}</Tag>
      </div>
      <div className="t-sm" style={{ margin: 0, color: "var(--bp-ink)", lineHeight: 1.55 }}>
        {children}
      </div>
    </div>
  );
}

// ============================================================
// 태그 (작은 라벨)
// ============================================================

type TagTone = "good" | "polish" | "tip" | "neutral";

interface TagProps {
  tone: TagTone;
  children: ReactNode;
  style?: React.CSSProperties;
}

export function Tag({ tone, children, style }: TagProps) {
  return (
    <span className={`bp-tag ${tone}`} style={style}>
      {children}
    </span>
  );
}

// ============================================================
// Pill (라벨)
// ============================================================

type PillTone = "default" | "tc" | "live";

interface PillProps {
  tone?: PillTone;
  children?: ReactNode;
  style?: React.CSSProperties;
}

export function Pill({ tone = "default", children, style }: PillProps) {
  const cls = tone === "default" ? "" : tone;
  return (
    <span className={`bp-pill ${cls}`} style={style}>
      {children}
    </span>
  );
}

// ============================================================
// 하이라이트 (인라인)
// ============================================================

interface HlProps {
  tone?: "default" | "good" | "polish";
  children: ReactNode;
}

export function Hl({ tone = "default", children }: HlProps) {
  const cls = tone === "default" ? "" : tone;
  return <span className={`bp-hl ${cls}`}>{children}</span>;
}

// ============================================================
// 인사이트 (그라데이션 박스)
// ============================================================

interface InsightProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Insight({ children, className = "", style }: InsightProps) {
  return (
    <div className={`bp-insight ${className}`} style={style}>
      {children}
    </div>
  );
}

// ============================================================
// Quote (인용 박스)
// ============================================================

interface QuoteProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Quote({ children, className = "", style }: QuoteProps) {
  return (
    <div className={`bp-quote ${className}`} style={style}>
      {children}
    </div>
  );
}

// ============================================================
// 섹션 헤더
// ============================================================

interface SectionHProps {
  children: ReactNode;
  style?: React.CSSProperties;
}

export function SectionH({ children, style }: SectionHProps) {
  return (
    <div className="bp-section-h" style={{ marginBottom: 10, display: "block", ...style }}>
      {children}
    </div>
  );
}

// ============================================================
// Wave (오디오 시각화)
// ============================================================

interface HfWaveProps {
  bars?: number;
  height?: number;
  gap?: number;
  /** color: 'tc' | 'ink' (기본 ink) */
  color?: "tc" | "ink";
  /** 사인파 amplitude */
  amplitude?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function HfWave({
  bars = 32,
  height = 24,
  gap = 2,
  color = "ink",
  amplitude,
  className = "",
  style,
}: HfWaveProps) {
  const amp = amplitude ?? height - 6;
  const bg = color === "tc" ? "var(--bp-tc)" : "var(--bp-ink-3)";
  const widthPx = color === "tc" ? 3 : 2;
  return (
    <div className={`bp-wave ${className}`} style={{ height, gap, ...style }}>
      {Array.from({ length: bars }).map((_, i) => (
        <i
          key={i}
          style={{
            height: 4 + Math.abs(Math.sin(i * 0.5)) * amp,
            background: bg,
            width: widthPx,
          }}
        />
      ))}
    </div>
  );
}

// ============================================================
// Mode Card (선택 가능한 카드)
// ============================================================

interface ModeCardProps {
  selected: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: ReactNode;
  desc: ReactNode;
  pills?: ReactNode;
  rightTag?: ReactNode;
}

export function ModeCard({
  selected,
  onClick,
  icon,
  title,
  desc,
  pills,
  rightTag,
}: ModeCardProps) {
  return (
    <div
      className={`bp-mode-card ${selected ? "selected" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="check">✓</div>
      <div style={{ display: "flex", gap: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: selected ? "var(--bp-tc)" : "var(--bp-surface-2)",
            color: selected ? "white" : "var(--bp-ink-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
            transition: "all 0.15s",
          }}
        >
          {icon}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="t-h2">{title}</span>
            {rightTag}
          </div>
          <span className="t-sm ink-3">{desc}</span>
          {pills && (
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>{pills}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Tabs
// ============================================================

interface HfTabsProps {
  items: Array<{ key: string; label: string }>;
  active: string;
  onChange: (key: string) => void;
}

export function HfTabs({ items, active, onChange }: HfTabsProps) {
  return (
    <div className="bp-tabs">
      {items.map((it) => (
        <button
          key={it.key}
          className={`bp-tab ${it.key === active ? "active" : ""}`}
          onClick={() => onChange(it.key)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// PcStepShell — Setup Step / Loop Step 공용 PC 셸
// (Claude Design 시안 기반 — breadcrumb 헤더 + 풀폭 step bar)
//
// - 헤더: ← + 브레드크럼(crumb) + right (실시간 + 멤버 dots 등)
// - 옵션 step bar (헤더 직후, 풀폭)
// - 본문은 children — 사용자가 .bp-pc-content 컨테이너 직접 사용
// - 액션은 본문 내부 .bp-pc-actions로 inline 배치 (sticky footer X)
//
// Setup Steps 1~5, Loop Steps 6-1~6-6, Step 7에서 모두 사용.
// ============================================================

interface PcStepShellProps {
  onBack?: MouseEventHandler<HTMLButtonElement>;
  /** breadcrumb 경로. 마지막 항목이 현재 위치 (.now). */
  crumb: ReactNode[];
  /** 우측 영역 — null로 숨김, undefined면 "실시간" pill 기본 표시 */
  right?: ReactNode | null;
  stepNow?: number;
  stepTotal?: number;
  children: ReactNode;
}

export function PcStepShell({
  onBack,
  crumb,
  right,
  stepNow,
  stepTotal = 7,
  children,
}: PcStepShellProps) {
  return (
    <div className="bp-scope bp-pc-shell">
      {/* Breadcrumb 헤더 */}
      <div className="bp-pc-headbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                fontSize: 18,
                color: "var(--bp-ink-2)",
                cursor: "pointer",
                background: "transparent",
                border: "none",
                padding: 0,
                lineHeight: 1,
              }}
              aria-label="뒤로"
            >
              ←
            </button>
          )}
          <div className="bp-pc-crumbs">
            {crumb.map((c, i) => (
              <span
                key={i}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                {i > 0 && <span className="bp-pc-crumb-sep">›</span>}
                <span className={i === crumb.length - 1 ? "now" : ""}>{c}</span>
              </span>
            ))}
          </div>
        </div>
        {right === null
          ? null
          : right === undefined
            ? <span className="bp-pill live">실시간</span>
            : right}
      </div>

      {/* Step bar (옵션) — 풀폭 */}
      {typeof stepNow === "number" && (
        <PcStepBar now={stepNow} total={stepTotal} />
      )}

      {children}
    </div>
  );
}

// ============================================================
// PcStepBar — 풀폭 스텝 바 (Claude Design 시안)
// ============================================================
interface PcStepBarProps {
  now: number;
  total?: number;
}

export function PcStepBar({ now, total = 7 }: PcStepBarProps) {
  return (
    <div className="bp-pc-stepbar">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="bp-pc-stepbar-cell"
          style={{
            flex: i + 1 === now ? "0 0 32px" : 1,
            background:
              i + 1 < now
                ? "var(--bp-ink-2)"
                : i + 1 === now
                  ? "var(--bp-tc)"
                  : "var(--bp-line-strong)",
          }}
        />
      ))}
      <span
        className="t-micro ink-3 t-num"
        style={{ marginLeft: 8 }}
      >
        Step {now} / {total}
      </span>
    </div>
  );
}

// ============================================================
// BpConfirmDialog — BP 디자인 시스템 기반 확인 다이얼로그
//
// 용도: 세션 종료, 모드 전환, 답변 패스 등 사용자 확인 필요 액션.
// 기존 native confirm() 대체. .bp-scope 스타일 적용.
// ============================================================
type BpDialogVariant = "danger" | "warning" | "neutral";

interface BpConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger: 테라코타 (세션 종료 등) | warning: 옐로우 (모드 전환 등) | neutral: 잉크 */
  variant?: BpDialogVariant;
  /** 좌상단 작은 이모지/아이콘 (선택) */
  icon?: string;
  isLoading?: boolean;
}

export function BpConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  variant = "danger",
  icon,
  isLoading = false,
}: BpConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isLoading, onCancel]);

  if (!open) return null;

  const variantBg =
    variant === "danger"
      ? "var(--bp-tc)"
      : variant === "warning"
        ? "var(--bp-tip)"
        : "var(--bp-ink)";

  const variantTint =
    variant === "danger"
      ? "var(--bp-tc-tint)"
      : variant === "warning"
        ? "var(--bp-tip-tint)"
        : "var(--bp-surface-2)";

  const variantInk =
    variant === "danger"
      ? "var(--bp-tc)"
      : variant === "warning"
        ? "var(--bp-tip)"
        : "var(--bp-ink)";

  return (
    <div
      className="bp-scope"
      onClick={isLoading ? undefined : onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(31, 27, 22, 0.45)",
        backdropFilter: "blur(2px)",
        animation: "bp-fade-in 0.15s ease-out",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 380,
          background: "var(--bp-surface)",
          borderRadius: "var(--bp-radius-lg)",
          padding: 24,
          boxShadow: "var(--bp-shadow-lg)",
          animation: "bp-fade-in 0.2s ease-out",
        }}
      >
        {/* 아이콘 */}
        {icon && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: variantTint,
                color: variantInk,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}
            >
              {icon}
            </div>
          </div>
        )}

        {/* 텍스트 */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            className="t-h2"
            style={{ marginBottom: description ? 8 : 0, fontWeight: 700 }}
          >
            {title}
          </div>
          {description && (
            <p
              className="t-sm"
              style={{
                margin: 0,
                color: "var(--bp-ink-2)",
                lineHeight: 1.55,
              }}
            >
              {description}
            </p>
          )}
        </div>

        {/* 버튼 */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="bp-btn secondary"
            style={{ flex: 1 }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={isLoading}
            className="bp-btn"
            style={{
              flex: 1,
              background: variantBg,
              color: "white",
            }}
          >
            {isLoading ? "처리 중…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
