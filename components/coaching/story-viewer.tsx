"use client";

// 만능 스토리 — 1편 뷰어 (AL 레이어 포함)
//   🍔 AL 골격(햄버거) + ⚔️ AL 무기 + 🎲 즉흥 슬롯 + 📝 기본 뼈대(IH) + 🛡️ 앵커 + ✅ 매핑.
//   화해안 시각화: 골격/무기 = 🔒외워, [슬롯] = 🎲즉흥 (색 구분).

import { useEffect, useRef } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Languages,
  Layers,
  Lightbulb,
  Lock,
  Repeat2,
  Shield,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Swords,
} from "lucide-react";
import type { UniversalStory } from "@/lib/types/universal-story";

interface Props {
  s: UniversalStory;
  index: number;
  total: number;
  prevTitle: string | null;
  nextTitle: string | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  isDone: boolean;
  onToggleDone: () => void;
  showKo: boolean;
  onToggleKo: () => void;
}

// kind별 안내
const KIND_NOTE: Record<UniversalStory["kind"], { label: string; cls: string }> = {
  story: { label: "통째로 외워 그대로 쓰는 만능 스토리", cls: "bg-green-50 text-green-700 border-green-200" },
  template: { label: "골격 1개 + 토픽별 어휘카드가 필요해요", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  frame: { label: "골격만 빌리고 내용은 토픽별로 따로", cls: "bg-red-50 text-red-700 border-red-200" },
  engine: { label: "강사 대표 만능 — 어떤 주제든 이 골격에 꽂는 재사용 엔진", cls: "bg-primary-50 text-primary-700 border-primary-200" },
};

const WEAPON_CLS: Record<string, string> = {
  tense: "bg-accent-500/10 text-accent-500",
  grammar: "bg-primary-50 text-primary-700",
  vocab: "bg-green-50 text-green-700",
  connector: "bg-amber-50 text-amber-700",
  discourse: "bg-surface-secondary text-foreground",
};

// [슬롯]을 🎲(즉흥), 나머지는 그대로(외워) 렌더
function SlotText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("[") && part.endsWith("]") ? (
          <span
            key={i}
            className="mx-0.5 rounded bg-amber-100 px-1 text-[0.95em] font-semibold text-amber-700"
          >
            🎲 {part.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function StoryViewer({
  s,
  index,
  total,
  prevTitle,
  nextTitle,
  onClose,
  onPrev,
  onNext,
  isDone,
  onToggleDone,
  showKo,
  onToggleKo,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    rootRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, []);

  const kindNote = KIND_NOTE[s.kind];

  return (
    <div ref={rootRef} className="space-y-4">
      {/* 상단 바 */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary"
        >
          <ArrowLeft className="h-4 w-4" /> 목록
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleDone}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              isDone ? "bg-green-100 text-green-700" : "bg-surface-secondary text-foreground-muted hover:text-foreground-secondary"
            }`}
          >
            <Check className="h-3.5 w-3.5" /> {isDone ? "외움" : "외움 표시"}
          </button>
          {nextTitle && (
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-100"
            >
              다음 <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 타이틀 카드 */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary-500 px-1.5 text-xs font-bold text-white">
            {s.badge}
          </span>
          <span className="rounded-full bg-surface-secondary px-2.5 py-0.5 text-[11px] font-medium text-foreground-secondary">
            {s.mode}
          </span>
          {s.leverage && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-500/10 px-2.5 py-0.5 text-[11px] font-bold text-accent-500">
              <Sparkles className="h-3 w-3" /> {s.leverage}
            </span>
          )}
        </div>
        <h3 className="mt-2 text-lg font-bold text-foreground">{s.title}</h3>
        <p className="mt-0.5 text-sm leading-relaxed text-foreground-secondary">{s.hook}</p>

        <div className={`mt-3 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${kindNote.cls}`}>
          <Lightbulb className="h-3.5 w-3.5" /> {kindNote.label}
        </div>

        <div className="mt-4 rounded-xl bg-surface-secondary/60 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground-secondary">
            <Repeat2 className="h-3.5 w-3.5" /> 이 스토리 하나로 답할 수 있는 질문
          </p>
          <ul className="mt-1.5 space-y-1">
            {s.covers.map((c) => (
              <li key={c} className="text-xs leading-relaxed text-foreground-secondary">· {c}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 🍔 AL 골격 (햄버거) */}
      {s.alSkeleton && (
        <div className="rounded-2xl border border-primary-200 bg-primary-50/30 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <Layers className="h-4 w-4 text-primary-600" /> AL 골격 (햄버거)
            </p>
            <span className="inline-flex items-center gap-2 text-[11px] font-medium">
              <span className="inline-flex items-center gap-1 text-foreground-secondary"><Lock className="h-3 w-3" /> 외워</span>
              <span className="inline-flex items-center gap-1 text-amber-700">🎲 슬롯은 즉흥</span>
            </span>
          </div>

          <div className="mt-3 space-y-2.5 text-[15px] leading-relaxed text-foreground">
            {/* 위 빵 — 토픽 */}
            <p>
              <span className="mr-1.5 rounded bg-primary-100 px-1.5 py-0.5 text-[11px] font-bold text-primary-700">Topic ①</span>
              <SlotText text={s.alSkeleton.topic1} />
            </p>
            {s.alSkeleton.topic2 && (
              <p>
                <span className="mr-1.5 rounded bg-primary-100 px-1.5 py-0.5 text-[11px] font-bold text-primary-700">Topic ②</span>
                <SlotText text={s.alSkeleton.topic2} />
              </p>
            )}
            {/* 패티 — 서포팅 */}
            <div className="space-y-2 rounded-xl bg-surface/70 p-3">
              {s.alSkeleton.supporting.map((sup, i) => (
                <p key={i} className="flex gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-[11px] font-bold text-foreground-muted">
                    {i + 1}
                  </span>
                  <span><SlotText text={sup} /></span>
                </p>
              ))}
            </div>
            {/* 아래 빵 — 결론 + 종료 */}
            <p>
              <span className="mr-1.5 rounded bg-primary-100 px-1.5 py-0.5 text-[11px] font-bold text-primary-700">결론</span>
              <SlotText text={s.alSkeleton.conclusion} />
            </p>
            <p className="text-foreground-secondary">
              <span className="mr-1.5 rounded bg-surface-secondary px-1.5 py-0.5 text-[11px] font-bold text-foreground-muted">종료</span>
              {s.alSkeleton.ending}
            </p>
          </div>
        </div>
      )}

      {/* ⚔️ AL 무기 */}
      {s.alWeapons && s.alWeapons.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Swords className="h-4 w-4 text-accent-500" /> 박을 AL 무기 <span className="text-[11px] font-normal text-foreground-muted">(이 정형구를 외워 박아요 🔒)</span>
          </p>
          <div className="mt-3 space-y-2">
            {s.alWeapons.map((w, i) => (
              <div key={i} className="flex flex-col gap-1 rounded-xl bg-surface-secondary/40 p-2.5 sm:flex-row sm:items-center sm:gap-2.5">
                <span className={`inline-flex w-fit shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${WEAPON_CLS[w.type] ?? "bg-surface-secondary text-foreground-secondary"}`}>
                  {w.label}
                </span>
                <span className="text-sm text-foreground">{w.chunk}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🎲 즉흥 슬롯 */}
      {s.slots && s.slots.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 sm:p-5">
          <p className="flex items-center gap-1.5 text-sm font-bold text-amber-800">
            <Shuffle className="h-4 w-4" /> 즉흥 슬롯 <span className="text-[11px] font-normal text-amber-700">(외우지 말고 그날그날 갈아끼워요 🎲)</span>
          </p>
          <div className="mt-3 space-y-2">
            {s.slots.map((slot) => (
              <div key={slot.key} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{slot.key}</span>
                <span className="text-xs text-foreground-secondary">{slot.examples.join(" · ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 📝 기본 뼈대 (IH · 쉬운 버전) — engine 카드는 비어있어 숨김 */}
      {s.beats.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-foreground">📝 기본 뼈대 <span className="text-[11px] font-normal text-foreground-muted">(IH · 쉬운 버전)</span></p>
            <button
              type="button"
              onClick={onToggleKo}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                showKo ? "border-primary-300 bg-primary-50 text-primary-700" : "border-border bg-surface text-foreground-muted hover:text-foreground-secondary"
              }`}
            >
              <Languages className="h-3.5 w-3.5" /> 한글 {showKo ? "ON" : "OFF"}
            </button>
          </div>
          {s.beats.map((b) => (
            <div key={b.n} className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-xs font-bold text-foreground-muted">
                  {b.n}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] leading-relaxed text-foreground sm:text-base">{b.en}</p>
                  {showKo && <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{b.ko}</p>}
                  {(b.slot || b.tenseLock) && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {b.tenseLock && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-accent-500/10 px-2 py-0.5 text-[11px] font-semibold text-accent-500">
                          ⏱ 시제 락인 · {b.tenseLock}
                        </span>
                      )}
                      {b.slot && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                          ↔ 슬롯 · {b.slot}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🛡️ 꼬리질문 방어 앵커 */}
      {s.anchors && s.anchors.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Shield className="h-4 w-4 text-primary-500" /> 꼬리질문 방어 앵커
          </p>
          <p className="mt-0.5 text-xs text-foreground-muted">&quot;tell me everything&quot; 추궁에 대비해 같이 외울 디테일이에요.</p>
          <div className="mt-3 space-y-2">
            {s.anchors.map((a) => (
              <div key={a.label} className="rounded-xl bg-surface-secondary/60 p-3">
                <p className="text-[11px] font-semibold text-primary-700">{a.label}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-foreground">{a.en}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ✅ 갖다 붙이는 법 */}
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <ShieldCheck className="h-4 w-4 text-green-600" /> 이 질문엔 이렇게 갖다 붙여요
        </p>
        <div className="mt-3 space-y-2">
          {s.mappings.map((m, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface-secondary/40 p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-md bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700">{m.topic}</span>
                <span className="text-[11px] text-foreground-muted">{m.question}</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground">{m.intro}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 🟢 안전 / 🔴 주의 */}
      {(s.whitelist?.length || s.avoid) && (
        <div className="space-y-2">
          {s.whitelist && s.whitelist.length > 0 && (
            <div className="rounded-xl border border-green-200 bg-green-50/60 p-3">
              <p className="text-xs font-semibold text-green-700">🟢 안전하게 끼울 수 있는 토픽</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {s.whitelist.map((t) => (
                  <span key={t} className="rounded-md bg-surface px-2 py-0.5 text-[11px] font-medium text-green-700">{t}</span>
                ))}
              </div>
            </div>
          )}
          {s.avoid && (
            <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50/60 p-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
              <p className="text-xs leading-relaxed text-red-700"><span className="font-semibold">주의 · </span>{s.avoid}</p>
            </div>
          )}
        </div>
      )}

      {/* 💡 팁 */}
      {s.tips && s.tips.length > 0 && (
        <div className="rounded-2xl bg-primary-50/50 p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-700">
            <Lightbulb className="h-3.5 w-3.5" /> 코칭 팁
          </p>
          <ul className="mt-1.5 space-y-1">
            {s.tips.map((t, i) => (
              <li key={i} className="text-xs leading-relaxed text-foreground-secondary">· {t}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 하단 네비 */}
      <div className="space-y-2 pt-2">
        <p className="text-center text-xs text-foreground-muted">{index + 1} / {total}</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPrev}
            disabled={!prevTitle}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> 이전
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!nextTitle}
            className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:text-foreground-muted"
          >
            <span className="truncate">{nextTitle ? `다음 · ${nextTitle}` : "마지막 스토리예요"}</span>
            {nextTitle && <ChevronRight className="h-4 w-4 shrink-0" />}
          </button>
        </div>
      </div>
    </div>
  );
}
