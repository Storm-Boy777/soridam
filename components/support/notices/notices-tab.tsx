"use client";

import { Bell, AlertTriangle, PartyPopper, Sparkles } from "lucide-react";
import type { ActiveAnnouncement } from "@/lib/actions/support";

const TYPE_CONFIG: Record<
  string,
  { icon: typeof Bell; bg: string; border: string; iconColor: string }
> = {
  notice: {
    icon: Bell,
    bg: "bg-blue-50/60",
    border: "border-blue-100",
    iconColor: "text-blue-500",
  },
  maintenance: {
    icon: AlertTriangle,
    bg: "bg-rose-50/60",
    border: "border-rose-100",
    iconColor: "text-rose-500",
  },
  event: {
    icon: PartyPopper,
    bg: "bg-primary-50/60",
    border: "border-primary-100",
    iconColor: "text-primary-500",
  },
  update: {
    icon: Sparkles,
    bg: "bg-amber-50/60",
    border: "border-amber-100",
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
      <div className="py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <Bell size={24} className="text-slate-300" />
        </div>
        <p className="mt-4 text-[15px] font-medium text-slate-500">
          새로운 소식이 없습니다
        </p>
        <p className="mt-1 text-[13px] text-slate-400">
          소리담의 소식이 생기면 이곳에서 알려드릴게요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {initialAnnouncements.map((a) => {
        const config = TYPE_CONFIG[a.type] || TYPE_CONFIG.notice;
        const Icon = config.icon;
        return (
          <article
            key={a.id}
            className={`rounded-2xl border ${config.border} ${config.bg} p-5 sm:p-6 transition-colors hover:shadow-sm`}
          >
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 shrink-0">
                <Icon size={18} className={config.iconColor} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.iconColor} ${config.bg}`}
                  >
                    {TYPE_LABELS[a.type] || a.type}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(a.created_at).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <h3 className="mt-2 text-[15px] font-semibold leading-snug text-slate-800 sm:text-base">
                  {a.title}
                </h3>
                <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600 sm:text-sm">
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
