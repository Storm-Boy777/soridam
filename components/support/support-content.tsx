"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Megaphone, MessageSquare, Lock } from "lucide-react";
import { NoticesTab } from "./notices/notices-tab";
import { FeedbackTab } from "./feedback/feedback-tab";
import { InquiryTab } from "./inquiry/inquiry-tab";
import type { ActiveAnnouncement } from "@/lib/actions/support";
import type { SupportPost } from "@/lib/types/support";

/* ── 탭 정의 ── */

const tabs = [
  { id: "notices", label: "공지사항", icon: Megaphone },
  { id: "feedback", label: "게시판", icon: MessageSquare },
  { id: "inquiry", label: "1:1 문의", icon: Lock },
] as const;

type TabId = (typeof tabs)[number]["id"];

/* ── Props ── */

interface SupportContentProps {
  initialAnnouncements: ActiveAnnouncement[];
  initialFeedback: { posts: SupportPost[]; total: number };
  initialInquiries: SupportPost[];
  isLoggedIn: boolean;
  userId: string | null;
}

/* ── 메인 컴포넌트 ── */

export function SupportContent({
  initialAnnouncements,
  initialFeedback,
  initialInquiries,
  isLoggedIn,
  userId,
}: SupportContentProps) {
  const searchParams = useSearchParams();

  // 탭 상태 (URL 동기화)
  const tabParam = searchParams.get("tab") as TabId | null;
  const initialTab: TabId =
    tabParam && tabs.some((t) => t.id === tabParam) ? tabParam : "notices";
  const [activeTab, setActiveTabState] = useState<TabId>(initialTab);

  const setActiveTab = useCallback((id: TabId) => {
    setActiveTabState(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url.toString());
  }, []);

  return (
    <div>
      {/* 탭 네비게이션 */}
      <div className="mb-4 flex gap-1 rounded-xl bg-surface-secondary p-1 sm:mb-6">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-medium transition-all sm:gap-2 sm:px-3 sm:text-sm ${
                active
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-foreground-secondary hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === "notices" && (
        <NoticesTab initialAnnouncements={initialAnnouncements} />
      )}
      {activeTab === "feedback" && (
        <FeedbackTab
          initialData={initialFeedback}
          isLoggedIn={isLoggedIn}
          userId={userId}
        />
      )}
      {activeTab === "inquiry" && (
        <InquiryTab
          initialInquiries={initialInquiries}
          isLoggedIn={isLoggedIn}
        />
      )}
    </div>
  );
}
