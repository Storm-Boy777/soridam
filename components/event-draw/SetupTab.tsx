"use client";

import { useState, useMemo } from "react";
import { useEventDrawStore, ANIMATIONS } from "@/lib/stores/eventDrawStore";
import type { EventRound } from "@/lib/stores/eventDrawStore";
import { createEvent } from "@/lib/api/event-draw";
import { showErrorToast, showWarningToast } from "@/lib/utils/toast";

interface SetupTabProps {
  onRefresh: () => Promise<void>;
}

export default function SetupTab({ onRefresh }: SetupTabProps) {
  const members = useEventDrawStore((s) => s.members);
  const setActiveTab = useEventDrawStore((s) => s.setActiveTab);
  const setLiveConfig = useEventDrawStore((s) => s.setLiveConfig);

  const [eventTitle, setEventTitle] = useState("");
  const [rounds, setRounds] = useState<EventRound[]>([
    { label: "라운드 1", prize: "", count: 1, mode: "single", animation: "slot", pool: "attended" },
  ]);
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingRound, setEditingRound] = useState<number | null>(0);

  const activeMembers = useMemo(() => members.filter((m) => m.is_active), [members]);
  const totalCount = activeMembers.length;
  const attendedCount = useMemo(() => activeMembers.filter((m) => m.is_attended).length, [activeMembers]);
  const partsList = useMemo(() => {
    const parts = new Set<string>();
    activeMembers.forEach((m) => { if (m.department && m.department !== "공정기술그룹") parts.add(m.department); });
    return Array.from(parts).sort();
  }, [activeMembers]);

  const addRound = () => {
    const newIdx = rounds.length;
    setRounds((prev) => [...prev, { label: `라운드 ${prev.length + 1}`, prize: "", count: 1, mode: "single", animation: "slot", pool: "attended" }]);
    setEditingRound(newIdx);
  };

  const removeRound = (idx: number) => {
    if (rounds.length <= 1) return;
    setRounds((prev) => prev.filter((_, i) => i !== idx));
    if (editingRound === idx) setEditingRound(null);
  };

  const updateRound = (idx: number, field: keyof EventRound, value: string | number | string[]) => {
    setRounds((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const updated = { ...r, [field]: value };
        if (field === "mode" && value === "batch" && updated.animation === "vs-battle") {
          updated.animation = "list-shuffle";
        }
        const animConfig = ANIMATIONS.find((a) => a.key === updated.animation);
        if (updated.mode === "batch") {
          if (field === "count" && animConfig) {
            updated.count = Math.min(Number(value) || 1, animConfig.maxCount);
          }
          if (animConfig && updated.count > animConfig.maxCount) {
            const available = ANIMATIONS.find((a) => a.multi && updated.count <= a.maxCount);
            if (available) updated.animation = available.key;
          }
        }
        return updated;
      })
    );
  };

  const handleStartDraw = async () => {
    if (!eventTitle.trim()) { showWarningToast("이벤트 제목을 입력하세요"); return; }
    if (totalCount < 2) { showWarningToast("참석 관리에서 멤버를 2명 이상 등록하세요"); return; }

    setLoading(true);
    try {
      const event = await createEvent({
        title: eventTitle,
        rounds: rounds.map((r) => ({ label: r.label, prize: r.prize, count: r.count, mode: r.mode, animation: r.animation, pool: r.pool })),
        allow_duplicate: allowDuplicate,
      });
      setLiveConfig({
        eventTitle,
        rounds,
        allowDuplicate,
        eventId: event.id,
      });
      setActiveTab("live");
      await onRefresh();
    } catch (err) {
      showErrorToast("이벤트 생성 실패: " + (err as Error).message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* 참가 현황 요약 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-emerald-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🙋</span>
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-600 mb-0.5">당일 참석자</div>
            <div className="text-2xl font-black text-slate-800">{attendedCount}<span className="text-sm font-bold text-slate-400 ml-1">명</span></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-blue-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">👥</span>
          </div>
          <div>
            <div className="text-xs font-bold text-blue-600 mb-0.5">전체 그룹원</div>
            <div className="text-2xl font-black text-slate-800">{totalCount}<span className="text-sm font-bold text-slate-400 ml-1">명</span></div>
          </div>
        </div>
      </div>

      {/* 이벤트 설정 */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
        <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center text-[10px]">📝</span>
          이벤트 설정
        </h3>
        <div className="flex gap-4 items-start">
          <div className="flex-1">
            <input
              type="text"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="예: 3월 워크샵 추첨"
              className="w-full h-11 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 text-sm font-bold placeholder-slate-300 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <label className="flex items-center gap-2 text-slate-500 text-xs font-medium cursor-pointer select-none h-11 px-3 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors flex-shrink-0">
            <input type="checkbox" checked={allowDuplicate} onChange={(e) => setAllowDuplicate(e.target.checked)} className="w-4 h-4 rounded accent-blue-500" />
            중복 당첨 허용
          </label>
        </div>
      </div>

      {/* 라운드 구성 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-violet-500 text-white flex items-center justify-center text-[10px]">🎯</span>
            라운드 구성
            <span className="text-xs font-bold text-slate-400 ml-1">{rounds.length}개</span>
          </h3>
          <button onClick={addRound} className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors">
            + 라운드 추가
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {rounds.map((round, idx) => {
            const isEditing = editingRound === idx;
            const animInfo = ANIMATIONS.find((a) => a.key === round.animation);

            return (
              <div
                key={idx}
                className={`relative bg-white rounded-2xl border-2 overflow-hidden transition-all ${
                  isEditing
                    ? "border-blue-400 shadow-lg shadow-blue-500/10 ring-2 ring-blue-100"
                    : "border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md cursor-pointer"
                }`}
                onClick={() => !isEditing && setEditingRound(idx)}
              >
                {/* 카드 헤더 */}
                <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-xs">라운드 {idx + 1}</span>
                  </div>
                  {rounds.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeRound(idx); }}
                      className="text-white/40 hover:text-white/80 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* 카드 바디 */}
                <div className="p-3">
                  {isEditing ? (
                    // 편집 모드
                    <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        value={round.prize}
                        onChange={(e) => updateRound(idx, "prize", e.target.value)}
                        placeholder="경품명"
                        className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-bold focus:outline-none focus:border-blue-400"
                      />
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-400 mb-1 block">인원</label>
                          <input
                            type="number" min={1}
                            max={round.mode === "batch" ? (animInfo?.maxCount ?? 20) : undefined}
                            value={round.count}
                            onChange={(e) => updateRound(idx, "count", parseInt(e.target.value) || 1)}
                            className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-bold text-center focus:outline-none focus:border-blue-400"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-400 mb-1 block">모드</label>
                          <select
                            value={round.mode}
                            onChange={(e) => updateRound(idx, "mode", e.target.value)}
                            className="w-full h-8 px-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-[10px] font-bold focus:outline-none focus:border-blue-400"
                          >
                            <option value="single">1명씩</option>
                            <option value="batch">한번에</option>
                          </select>
                        </div>
                      </div>
                      {/* 추첨 대상 */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 mb-1 block">추첨 대상</label>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => updateRound(idx, "pool", "attended")}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                              round.pool === "attended"
                                ? "bg-emerald-500 text-white shadow-sm"
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            }`}
                          >
                            🙋 참석자
                          </button>
                          <button
                            onClick={() => updateRound(idx, "pool", "all")}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                              round.pool === "all"
                                ? "bg-blue-500 text-white shadow-sm"
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            }`}
                          >
                            👥 전체
                          </button>
                          <button
                            onClick={() => updateRound(idx, "pool", "parts")}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                              round.pool === "parts"
                                ? "bg-purple-500 text-white shadow-sm"
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            }`}
                          >
                            🏢 파트
                          </button>
                        </div>
                        {round.pool === "parts" && (
                          <div className="grid grid-cols-4 gap-1 mt-1.5">
                            {partsList.map((part) => {
                              const isSelected = round.selectedParts?.includes(part);
                              return (
                                <button
                                  key={part}
                                  onClick={() => {
                                    const current = round.selectedParts || [];
                                    const updated = isSelected
                                      ? current.filter((p) => p !== part)
                                      : [...current, part];
                                    updateRound(idx, "selectedParts", updated);
                                  }}
                                  className={`py-1 rounded-lg text-[9px] font-bold transition-all text-center truncate ${
                                    isSelected
                                      ? "bg-purple-500 text-white"
                                      : "bg-slate-50 border border-slate-200 text-slate-400 hover:border-purple-300"
                                  }`}
                                >
                                  {part}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      {/* 연출 선택 */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 mb-1 block">연출</label>
                        <div className="grid grid-cols-4 gap-1">
                          {ANIMATIONS.map((anim) => {
                            const isAvailable = round.mode === "batch"
                              ? anim.multi && round.count <= anim.maxCount
                              : true;
                            const isSelected = round.animation === anim.key;
                            return (
                              <button
                                key={anim.key}
                                onClick={() => isAvailable && updateRound(idx, "animation", anim.key)}
                                className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-all ${
                                  isSelected
                                    ? "bg-blue-100 border border-blue-400"
                                    : isAvailable
                                      ? "bg-slate-50 border border-slate-200 hover:border-blue-200"
                                      : "bg-slate-100 border border-slate-100 opacity-30 cursor-not-allowed"
                                }`}
                              >
                                <span className={`text-base leading-none ${!isAvailable ? "grayscale" : ""}`}>{anim.icon}</span>
                                <span className={`text-[8px] font-bold ${isSelected ? "text-blue-600" : "text-slate-400"}`}>{anim.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingRound(null)}
                        className="w-full py-2 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        완료
                      </button>
                    </div>
                  ) : (
                    // 뷰 모드
                    <div className="text-center space-y-2">
                      <div className="text-lg font-black text-slate-800">{round.prize || "경품 미입력"}</div>
                      <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
                        <span>{round.count}명</span>
                        <span>·</span>
                        <span>{animInfo?.icon} {animInfo?.label}</span>
                      </div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        round.pool === "attended"
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-blue-100 text-blue-600"
                      }`}>
                        {round.pool === "attended" ? "🙋 참석자" : "👥 전체"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 추첨 시작 버튼 */}
      <button
        onClick={handleStartDraw}
        disabled={loading || !eventTitle.trim() || totalCount < 2}
        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-200 disabled:to-slate-300 disabled:cursor-not-allowed text-white font-black text-lg rounded-2xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:shadow-none disabled:text-slate-400"
      >
        {loading ? "생성 중..." : "추첨 준비 완료 → 추첨 화면으로"}
      </button>
    </div>
  );
}
