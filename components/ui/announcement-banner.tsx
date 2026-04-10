"use client";

import { useState, useEffect } from "react";
import { X, Megaphone, AlertTriangle, PartyPopper, Sparkles } from "lucide-react";
import type { ActiveAnnouncement } from "@/lib/actions/announcements";

const TYPE_CONFIG = {
  notice: {
    icon: Megaphone,
    bg: "bg-blue-50",
    border: "border-blue-100",
    text: "text-blue-800",
    badge: "bg-blue-100 text-blue-700",
    iconColor: "text-blue-400",
    label: "공지",
  },
  maintenance: {
    icon: AlertTriangle,
    bg: "bg-red-50",
    border: "border-red-100",
    text: "text-red-800",
    badge: "bg-red-100 text-red-700",
    iconColor: "text-red-400",
    label: "점검",
  },
  event: {
    icon: PartyPopper,
    bg: "bg-primary-50",
    border: "border-primary-100",
    text: "text-primary-700",
    badge: "bg-primary-100 text-primary-700",
    iconColor: "text-primary-400",
    label: "이벤트",
  },
  update: {
    icon: Sparkles,
    bg: "bg-amber-50",
    border: "border-amber-100",
    text: "text-amber-800",
    badge: "bg-amber-100 text-amber-700",
    iconColor: "text-amber-400",
    label: "업데이트",
  },
} as const;

const STORAGE_KEY = "soridam_dismissed_announcements";

export function AnnouncementBanner({
  announcements,
}: {
  announcements: ActiveAnnouncement[];
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      setDismissed(Array.isArray(stored) ? stored : []);
    } catch {
      setDismissed([]);
    }
    setMounted(true);
  }, []);

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 저장 실패 시 무시
    }
  };

  // 마운트 전이나 모두 닫힌 경우 렌더링 안 함
  if (!mounted) return null;
  const visible = announcements.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="border-b border-border">
      {visible.map((a, i) => {
        const config =
          TYPE_CONFIG[a.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.notice;
        const Icon = config.icon;

        return (
          <div
            key={a.id}
            className={`${config.bg} ${i > 0 ? `border-t ${config.border}` : ""}`}
          >
            <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-2.5 sm:px-6">
              <Icon
                size={14}
                className={`mt-0.5 shrink-0 ${config.iconColor}`}
              />
              <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${config.badge}`}
                >
                  {config.label}
                </span>
                <span className={`text-xs font-semibold ${config.text}`}>
                  {a.title}
                </span>
                {a.content && (
                  <span className={`text-xs ${config.text} opacity-70`}>
                    {a.content}
                  </span>
                )}
              </div>
              <button
                onClick={() => dismiss(a.id)}
                aria-label="공지 닫기"
                className={`ml-1 shrink-0 rounded p-0.5 transition-opacity ${config.text} opacity-40 hover:opacity-80`}
              >
                <X size={13} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
