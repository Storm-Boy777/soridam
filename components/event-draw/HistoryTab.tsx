"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useEventDrawStore, ANIMATIONS } from "@/lib/stores/eventDrawStore";
import type { EventData, EventResult } from "@/lib/stores/eventDrawStore";
import { fetchResults, fetchAllResults, deleteEvent } from "@/lib/api/event-draw";
import { showErrorToast, showWarningToast } from "@/lib/utils/toast";

interface HistoryTabProps {
  onRefresh: () => Promise<void>;
}

export default function HistoryTab({ onRefresh }: HistoryTabProps) {
  const events = useEventDrawStore((s) => s.events);
  const members = useEventDrawStore((s) => s.members);
  const liveConfig = useEventDrawStore((s) => s.liveConfig);
  const setLiveConfig = useEventDrawStore((s) => s.setLiveConfig);
  const setActiveTab = useEventDrawStore((s) => s.setActiveTab);
  const setLiveSession = useEventDrawStore((s) => s.setLiveSession);
  const clearLiveSession = useEventDrawStore((s) => s.clearLiveSession);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [results, setResults] = useState<EventResult[]>([]);
  const [allResults, setAllResults] = useState<EventResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const loadAllResults = useCallback(async () => {
    try { const data = await fetchAllResults(); setAllResults(data || []); } catch (err) { console.error("결과 로딩 실패:", err); }
  }, []);

  useEffect(() => { loadAllResults(); }, [loadAllResults]);

  const handleSelectEvent = async (eventId: string) => {
    setSelectedEventId(eventId);
    setLoading(true);
    try { const data = await fetchResults(eventId); setResults(data || []); } catch (err) { console.error("결과 로딩 실패:", err); }
    setLoading(false);
  };

  const handleDeleteEvent = async (eventId: string) => {
    setDeleting(true);
    try {
      await deleteEvent(eventId);
      if (selectedEventId === eventId) { setSelectedEventId(null); setResults([]); }
      if (liveConfig?.eventId === eventId) { setLiveConfig(null); clearLiveSession(); }
      await onRefresh();
      await loadAllResults();
    } catch (err) { showErrorToast("삭제 실패: " + (err as Error).message); }
    setDeleting(false);
    setDeleteConfirmId(null);
  };

  const currentLiveEventId = liveConfig?.eventId;

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const deletableIds = events.filter((e) => e.id !== currentLiveEventId).map((e) => e.id);

  const toggleAll = () => {
    if (checkedIds.size >= deletableIds.length) setCheckedIds(new Set());
    else setCheckedIds(new Set(deletableIds));
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      for (const id of checkedIds) await deleteEvent(id);
      if (selectedEventId && checkedIds.has(selectedEventId)) { setSelectedEventId(null); setResults([]); }
      setCheckedIds(new Set());
      setBulkDeleteConfirm(false);
      await onRefresh();
      await loadAllResults();
    } catch (err) { showErrorToast("삭제 실패: " + (err as Error).message); }
    setDeleting(false);
  };

  const handleResumeEvent = (event: EventData) => {
    setLiveConfig({ eventTitle: event.title, rounds: event.rounds, allowDuplicate: event.allow_duplicate, eventId: event.id });
    const eventResults = allResults.filter((r) => r.event_id === event.id);
    const roundResultsMap: Record<number, { names: string[]; prize: string }> = {};
    const resumeExcludeIds: string[] = [];
    eventResults.forEach((r) => {
      if (!roundResultsMap[r.round_index]) roundResultsMap[r.round_index] = { names: [], prize: r.prize_name || "" };
      roundResultsMap[r.round_index].names.push(r.member_name);
      const member = members.find((m) => m.name === r.member_name);
      if (member && !event.allow_duplicate) resumeExcludeIds.push(member.id);
    });
    setLiveSession({ roundResults: roundResultsMap, excludeIds: resumeExcludeIds, quickResults: [] });
    setActiveTab("live");
  };

  const handleExportResults = (event: EventData) => {
    const eventResults = allResults.filter((r) => r.event_id === event.id);
    if (eventResults.length === 0) { showWarningToast("결과가 없습니다"); return; }
    const header = "라운드,당첨자,경품,추첨일시\n";
    const rows = eventResults.map((r) => [r.round_index + 1, r.member_name, r.prize_name || "", new Date(r.drawn_at).toLocaleString("ko-KR")].join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${event.title}_결과_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const groupedResults = useMemo(() => results.reduce<Record<number, EventResult[]>>((acc, r) => {
    if (!acc[r.round_index]) acc[r.round_index] = [];
    acc[r.round_index].push(r);
    return acc;
  }, {}), [results]);

  const sortedEvents = [...events].sort((a, b) => {
    const statusOrder = { in_progress: 0, draft: 1, completed: 2 };
    const orderA = statusOrder[a.status] ?? 1;
    const orderB = statusOrder[b.status] ?? 1;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const getDept = (name: string) => {
    const m = members.find((m) => m.name === name);
    return m?.department || "";
  };

  const getStatusStyle = (event: EventData) => {
    const isCurrentLive = event.id === currentLiveEventId;
    if (isCurrentLive) return { bg: "bg-amber-100", text: "text-amber-700", label: "현재 진행중", dot: "bg-amber-500" };
    if (event.status === "completed") return { bg: "bg-emerald-100", text: "text-emerald-700", label: "완료", dot: "bg-emerald-500" };
    if (event.status === "in_progress") return { bg: "bg-yellow-100", text: "text-yellow-700", label: "진행중", dot: "bg-yellow-500" };
    return { bg: "bg-slate-100", text: "text-slate-500", label: "대기", dot: "bg-slate-400" };
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
            <span className="text-4xl">📋</span>
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">아직 이벤트가 없습니다</h2>
          <p className="text-sm text-slate-400 font-medium mb-6">설정 탭에서 첫 이벤트를 만들어보세요</p>
          <button
            onClick={() => setActiveTab("setup")}
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25"
          >
            이벤트 만들기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* 이벤트 목록 */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-blue-500 text-white flex items-center justify-center text-[10px]">📋</span>
                이벤트 기록 <span className="text-xs font-bold text-slate-400">{events.length}</span>
              </h3>
              <div className="flex items-center gap-2">
                {checkedIds.size > 0 && (
                  <button
                    onClick={() => setBulkDeleteConfirm(true)}
                    className="px-2.5 py-1 text-[10px] font-bold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    {checkedIds.size}개 삭제
                  </button>
                )}
                <button
                  onClick={toggleAll}
                  className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  {checkedIds.size >= deletableIds.length ? "해제" : "전체선택"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {sortedEvents.map((event) => {
                const eventResultCount = allResults.filter((r) => r.event_id === event.id).length;
                const isCurrentLive = event.id === currentLiveEventId;
                const isInProgress = event.status === "in_progress" || event.status === "draft";
                const isSelected = selectedEventId === event.id;
                const isChecked = checkedIds.has(event.id);
                const statusStyle = getStatusStyle(event);

                return (
                  <div
                    key={event.id}
                    className={`relative rounded-xl border-2 overflow-hidden transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 border-blue-400 shadow-lg shadow-blue-500/10"
                        : isCurrentLive
                          ? "bg-amber-50/50 border-amber-200 shadow-sm"
                          : "bg-white border-slate-200 hover:border-blue-200 hover:shadow-md"
                    }`}
                    onClick={() => handleSelectEvent(event.id)}
                  >
                    <div className="p-3.5">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {/* 체크박스 */}
                          {!isCurrentLive && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleCheck(event.id); }}
                              className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                                isChecked ? "bg-red-500 border-red-500" : "border-slate-300 hover:border-red-300"
                              }`}
                            >
                              {isChecked && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          )}
                          <h4 className={`text-sm font-extrabold truncate ${isSelected ? "text-blue-700" : "text-slate-800"}`}>
                            {event.title}
                          </h4>
                        </div>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${statusStyle.bg} ${statusStyle.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} ${isCurrentLive ? "animate-pulse" : ""}`} />
                          {statusStyle.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                        <span>{new Date(event.created_at).toLocaleDateString("ko-KR")}</span>
                        <div className="flex items-center gap-2">
                          {event.rounds && <span>{event.rounds.length}라운드</span>}
                          {eventResultCount > 0 && <span className="font-bold text-blue-500">당첨 {eventResultCount}명</span>}
                        </div>
                      </div>
                    </div>

                    {/* 호버 시 액션 */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100">
                      {isInProgress && !isCurrentLive && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleResumeEvent(event); }}
                          className="p-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors shadow-sm"
                          title="이어서 진행"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 이벤트 상세 */}
          <div className="lg:col-span-2">
            {!selectedEventId ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                  <span className="text-3xl">👈</span>
                </div>
                <p className="font-bold text-slate-400 text-sm">이벤트를 선택하면 결과를 확인할 수 있습니다</p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
                <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : (() => {
              const selectedEvent = events.find((e) => e.id === selectedEventId);
              const isCurrentLive = selectedEventId === currentLiveEventId;
              const isInProgress = selectedEvent?.status === "in_progress" || selectedEvent?.status === "draft";

              return (
                <div className="space-y-4">
                  {/* 이벤트 헤더 */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div>
                        <h3 className="text-lg font-black text-slate-800 mb-1">{selectedEvent?.title}</h3>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const style = selectedEvent ? getStatusStyle(selectedEvent) : { bg: "", text: "", label: "", dot: "" };
                            return (
                              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${style.bg} ${style.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                {style.label}
                              </span>
                            );
                          })()}
                          {selectedEvent && (
                            <span className="text-xs text-slate-400">{selectedEvent.rounds.length}라운드 · {new Date(selectedEvent.created_at).toLocaleDateString("ko-KR")}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {isInProgress && !isCurrentLive && selectedEvent && (
                          <button onClick={() => handleResumeEvent(selectedEvent)}
                            className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20">
                            이어서 진행
                          </button>
                        )}
                        {isCurrentLive && (
                          <button onClick={() => setActiveTab("live")}
                            className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl transition-all shadow-lg shadow-amber-500/20">
                            추첨 화면으로
                          </button>
                        )}
                        {results.length > 0 && (
                          <button onClick={() => { if (selectedEvent) handleExportResults(selectedEvent); }}
                            className="px-4 py-2 text-xs font-bold bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
                            CSV 다운로드
                          </button>
                        )}
                        {!isCurrentLive && (
                          <button onClick={() => setDeleteConfirmId(selectedEventId)}
                            className="px-4 py-2 text-xs font-bold bg-white border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition-all">
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 라운드 셋업 현황 (진행중/대기 상태) */}
                  {isInProgress && selectedEvent && selectedEvent.rounds.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-3 flex items-center justify-between">
                        <span className="text-white font-bold text-sm">라운드 셋업 현황</span>
                        <span className="text-white/50 text-xs font-bold">{selectedEvent.rounds.length}라운드</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {selectedEvent.rounds.map((round, idx) => {
                          const animInfo = ANIMATIONS.find((a) => a.key === round.animation);
                          const isDone = !!groupedResults[idx];
                          return (
                            <div key={idx} className={`px-5 py-3 flex items-center justify-between ${isDone ? "bg-emerald-50/50" : ""}`}>
                              <div className="flex items-center gap-3">
                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white ${isDone ? "bg-emerald-500" : "bg-slate-400"}`}>
                                  {isDone ? "✓" : idx + 1}
                                </span>
                                <div>
                                  <span className="text-sm font-bold text-slate-800">{round.prize || "경품 미입력"}</span>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium mt-0.5">
                                    <span>{round.count}명</span>
                                    <span>·</span>
                                    <span>{animInfo?.icon} {animInfo?.label}</span>
                                    <span>·</span>
                                    <span>{round.mode === "single" ? "1명씩" : "한번에"}</span>
                                    <span>·</span>
                                    <span>{round.pool === "attended" ? "🙋참석자" : round.pool === "parts" ? "🏢파트" : "👥전체"}</span>
                                  </div>
                                </div>
                              </div>
                              {isDone && (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">완료</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 결과 */}
                  {results.length === 0 && !isInProgress ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                      <span className="text-3xl mb-3">🎯</span>
                      <p className="font-bold text-slate-400 text-sm">아직 추첨 결과가 없습니다</p>
                    </div>
                  ) : results.length === 0 ? null : (
                    <div className="space-y-3">
                      {Object.entries(groupedResults)
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .map(([roundIdx, roundResults]) => (
                          <div key={roundIdx} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div>
                                  <span className="text-white font-bold text-sm">라운드 {Number(roundIdx) + 1}</span>
                                  {roundResults[0].prize_name && (
                                    <span className="text-white/60 text-xs font-medium ml-2">{roundResults[0].prize_name}</span>
                                  )}
                                </div>
                              </div>
                              <span className="text-white/50 text-xs font-bold">{roundResults.length}명 당첨</span>
                            </div>
                            <div className={`p-4 grid gap-2 ${roundResults.length === 1 ? "grid-cols-1 max-w-xs" : roundResults.length <= 4 ? "grid-cols-2" : "grid-cols-3"}`}>
                              {roundResults.map((r) => (
                                <div key={r.id} className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
                                  <span className="text-lg flex-shrink-0">🏆</span>
                                  <div className="min-w-0">
                                    <span className="text-sm font-bold text-slate-800 block truncate">{r.member_name}</span>
                                    {getDept(r.member_name) && <span className="text-[11px] text-slate-400 font-medium block truncate">{getDept(r.member_name)}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-5">
              <h3 className="text-white font-black text-lg">이벤트 삭제</h3>
              <p className="text-white/70 text-sm font-medium mt-1">{events.find((e) => e.id === deleteConfirmId)?.title}</p>
            </div>
            <div className="p-6">
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-5">
                <p className="text-sm text-red-600 font-bold">이 이벤트와 모든 추첨 결과가 영구 삭제됩니다.</p>
                <p className="text-xs text-red-500 mt-1">이 작업은 되돌릴 수 없습니다.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">취소</button>
                <button onClick={() => handleDeleteEvent(deleteConfirmId)} disabled={deleting}
                  className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/25 disabled:opacity-50">
                  {deleting ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 삭제 확인 모달 */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setBulkDeleteConfirm(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-5">
              <h3 className="text-white font-black text-lg">일괄 삭제</h3>
              <p className="text-white/70 text-sm font-medium mt-1">{checkedIds.size}개 이벤트를 삭제합니다</p>
            </div>
            <div className="p-6">
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-5">
                <p className="text-sm text-red-600 font-bold">선택한 이벤트와 모든 추첨 결과가 영구 삭제됩니다.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setBulkDeleteConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">취소</button>
                <button onClick={handleBulkDelete} disabled={deleting}
                  className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/25 disabled:opacity-50">
                  {deleting ? "삭제 중..." : `${checkedIds.size}개 삭제`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
