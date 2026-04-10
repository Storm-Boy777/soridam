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
      {/* 탭 네비게이션 — 모바일 터치 최적화 (최소 44px 터치 영역) */}
      <div className="mb-6 flex gap-1.5 overflow-x-auto pb-1 sm:mb-8 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-[13px] font-medium transition-all sm:text-sm ${
                active
                  ? "bg-slate-800 text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
              }`}
            >
              <Icon size={15} className={active ? "text-white/80" : ""} />
              {tab.label}
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
