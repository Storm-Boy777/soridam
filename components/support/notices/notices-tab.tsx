"use client";

import { Megaphone, AlertTriangle, PartyPopper, Sparkles } from "lucide-react";
import type { ActiveAnnouncement } from "@/lib/actions/support";

const TYPE_CONFIG: Record<
  string,
  { icon: typeof Megaphone; bg: string; border: string; iconColor: string }
> = {
  notice: {
    icon: Megaphone,
    bg: "bg-blue-50",
    border: "border-blue-200",
    iconColor: "text-blue-500",
  },
  maintenance: {
    icon: AlertTriangle,
    bg: "bg-red-50",
    border: "border-red-200",
    iconColor: "text-red-500",
  },
  event: {
    icon: PartyPopper,
    bg: "bg-primary-50",
    border: "border-primary-200",
    iconColor: "text-primary-500",
  },
  update: {
    icon: Sparkles,
    bg: "bg-amber-50",
    border: "border-amber-200",
    iconColor: "text-amber-500",
  },
};

const TYPE_LABELS: Record<string, string> = {
  notice: "공지",
  maintenance: "점검",
  event: "이벤트",
  update: "업데이트",
};

interface NoticesTabProps {
  initialAnnouncements: ActiveAnnouncement[];
}

export function NoticesTab({ initialAnnouncements }: NoticesTabProps) {
  if (initialAnnouncements.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-col items-center py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
            <Megaphone size={24} className="text-foreground-muted" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground-secondary">
            현재 공지사항이 없습니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {initialAnnouncements.map((a) => {
        const config = TYPE_CONFIG[a.type] || TYPE_CONFIG.notice;
        const Icon = config.icon;
        return (
          <div
            key={a.id}
            className={`rounded-xl border ${config.border} ${config.bg} p-4 sm:p-5`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                <Icon size={18} className={config.iconColor} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${config.iconColor} ${config.bg}`}
                  >
                    {TYPE_LABELS[a.type] || a.type}
                  </span>
                  <span className="text-xs text-foreground-muted">
                    {new Date(a.created_at).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <h3 className="mt-1.5 text-sm font-semibold text-foreground sm:text-base">
                  {a.title}
                </h3>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-foreground-secondary sm:text-sm">
                  {a.content}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
