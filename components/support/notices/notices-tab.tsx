"use client";

import { Bell, AlertTriangle, PartyPopper, Sparkles } from "lucide-react";
import type { ActiveAnnouncement } from "@/lib/actions/support";

const TYPE_CONFIG: Record<
  string,
  { icon: typeof Bell; bg: string; border: string; iconColor: string }
> = {
  notice: {
    icon: Bell,
    bg: "bg-surface",
    border: "border-border",
    iconColor: "text-foreground-muted",
  },
  maintenance: {
    icon: AlertTriangle,
    bg: "bg-surface",
    border: "border-border",
    iconColor: "text-rose-400",
  },
  event: {
    icon: PartyPopper,
    bg: "bg-surface",
    border: "border-border",
    iconColor: "text-primary-400",
  },
  update: {
    icon: Sparkles,
    bg: "bg-surface",
    border: "border-border",
    iconColor: "text-amber-400",
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
      <div className="py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
          <Bell size={24} className="text-foreground-muted" />
        </div>
        <p className="mt-3 text-sm font-medium text-foreground-secondary">
          새로운 소식이 없습니다
        </p>
        <p className="mt-1 text-xs text-foreground-muted">
          소리담의 소식이 생기면 이곳에서 알려드릴게요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {initialAnnouncements.map((a) => {
        const config = TYPE_CONFIG[a.type] || TYPE_CONFIG.notice;
        const Icon = config.icon;
        return (
          <article
            key={a.id}
            className={`rounded-xl border ${config.border} ${config.bg} p-4 sm:p-5 transition-colors`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                <Icon size={16} className={config.iconColor} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold sm:text-xs ${config.iconColor} bg-surface-secondary`}
                  >
                    {TYPE_LABELS[a.type] || a.type}
                  </span>
                  <span className="text-[11px] text-foreground-muted sm:text-xs">
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
          </article>
        );
      })}
    </div>
  );
}
