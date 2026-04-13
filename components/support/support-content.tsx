"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, MessageSquare, Lock } from "lucide-react";
import { NoticesTab } from "./notices/notices-tab";
import { FeedbackTab } from "./feedback/feedback-tab";
import { InquiryTab } from "./inquiry/inquiry-tab";
import type { ActiveAnnouncement } from "@/lib/actions/support";
import type { SupportPost } from "@/lib/types/support";

/* -- 탭 정의 -- */

const tabs = [
  { id: "notices", label: "공지사항", icon: Bell, desc: "소리담의 새로운 소식" },
  { id: "feedback", label: "게시판", icon: MessageSquare, desc: "함께 나누는 이야기" },
  { id: "inquiry", label: "1:1 문의", icon: Lock, desc: "개발자와의 비밀 대화" },
] as const;

type TabId = (typeof tabs)[number]["id"];

/* -- Props -- */

interface SupportContentProps {
  initialAnnouncements: ActiveAnnouncement[];
  initialFeedback: { posts: SupportPost[]; total: number };
  initialInquiries: SupportPost[];
  isLoggedIn: boolean;
  userId: string | null;
}

/* -- 메인 컴포넌트 -- */

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
    tabParam && tabs.some((t) => t.id === tabParam) ? tabParam : "feedback";
  const [activeTab, setActiveTabState] = useState<TabId>(initialTab);

  const setActiveTab = useCallback((id: TabId) => {
    setActiveTabState(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url.toString());
  }, []);

  return (
    <div>
      {/* 탭 네비게이션 — 하단 인디케이터 (다른 페이지와 통일) */}
      <div className="mb-4 flex border-b border-border sm:mb-6 max-sm:[&>button]:flex-1">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-medium transition-colors sm:gap-2 sm:px-6 sm:text-sm ${
                active
                  ? "text-foreground"
                  : "text-foreground-muted hover:text-foreground-secondary"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-foreground" />
              )}
            </button>
          );
        })}
      </div>

      {/* 탭 콘텐츠 — Framer Motion 부드러운 전환 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
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
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
