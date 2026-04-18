"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";
import { useEventDrawStore } from "@/lib/stores/eventDrawStore";
import type { TabType } from "@/lib/stores/eventDrawStore";
import { fetchMembers, fetchEvents } from "@/lib/api/event-draw";
import SetupTab from "@/components/event-draw/SetupTab";
import LiveTab from "@/components/event-draw/LiveTab";
import HistoryTab from "@/components/event-draw/HistoryTab";
import PresentationMode from "@/components/event-draw/PresentationMode";

const NAV_ITEMS: { key: TabType; label: string; icon: string }[] = [
  { key: "live", label: "추첨", icon: "🎰" },
  { key: "history", label: "히스토리", icon: "📋" },
  { key: "setup", label: "설정", icon: "⚙️" },
];

export default function EventDrawClient() {
  const activeTab = useEventDrawStore((s) => s.activeTab);
  const setActiveTab = useEventDrawStore((s) => s.setActiveTab);
  const setMembers = useEventDrawStore((s) => s.setMembers);
  const setEvents = useEventDrawStore((s) => s.setEvents);
  const isPresentationMode = useEventDrawStore((s) => s.isPresentationMode);
  const liveConfig = useEventDrawStore((s) => s.liveConfig);

  const loadData = useCallback(async () => {
    try {
      const [membersData, eventsData] = await Promise.all([fetchMembers(), fetchEvents()]);
      setMembers(membersData || []);
      setEvents(eventsData || []);
    } catch (err) {
      console.error("데이터 로딩 실패:", err);
    }
  }, [setMembers, setEvents]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // members 탭이 선택된 상태에서 이동한 경우 setup으로 리다이렉트
  useEffect(() => {
    if (activeTab === "members") {
      setActiveTab("setup");
    }
  }, [activeTab, setActiveTab]);

  if (isPresentationMode) {
    return <PresentationMode />;
  }

  const validTab = activeTab === "members" ? "setup" : activeTab;
  const hasLiveReady = liveConfig !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
      {/* 상단 글래스모피즘 헤더 */}
      <header className="sticky top-0 z-40 border-b border-white/50 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/events" className="text-gray-400 transition-colors hover:text-gray-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-500">Event Draw</p>
              <h1 className="text-lg font-black text-gray-900 sm:text-2xl">공정기술그룹 추첨 이벤트</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  validTab === item.key
                    ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {item.icon} {item.label}
                {item.key === "live" && hasLiveReady && validTab !== "live" && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
                )}
              </button>
            ))}
            <button
              onClick={loadData}
              className="rounded-full border border-white/70 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-blue-50"
            >
              새로고침
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        {validTab === "setup" && <SetupTab onRefresh={loadData} />}
        {validTab === "live" && <LiveTab onRefresh={loadData} />}
        {validTab === "history" && <HistoryTab onRefresh={loadData} />}
      </main>
    </div>
  );
}
