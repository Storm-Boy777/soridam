"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useEventDrawStore, ANIMATIONS } from "@/lib/stores/eventDrawStore";
import type { AnimationType, DrawPoolType } from "@/lib/stores/eventDrawStore";
import { executeDraw, updateEvent } from "@/lib/api/event-draw";
import { showErrorToast, showWarningToast } from "@/lib/utils/toast";
import SlotMachine from "./animations/SlotMachine";
import CardFlip from "./animations/CardFlip";
import VsBattle from "./animations/VsBattle";
import ListShuffle from "./animations/ListShuffle";

const ANIMATION_MAP: Record<AnimationType, React.ComponentType<{ winners: string[]; participants: string[]; onComplete: () => void }>> = {
  slot: SlotMachine, roulette: SlotMachine, "card-flip": CardFlip,
  "vs-battle": VsBattle, "list-shuffle": ListShuffle,
};

type RoundStatus = "waiting" | "done";

interface LiveTabProps {
  onRefresh: () => Promise<void>;
}

export default function LiveTab({ onRefresh }: LiveTabProps) {
  const members = useEventDrawStore((s) => s.members);
  const liveConfig = useEventDrawStore((s) => s.liveConfig);
  const setLiveConfig = useEventDrawStore((s) => s.setLiveConfig);
  const liveSession = useEventDrawStore((s) => s.liveSession);
  const setLiveSession = useEventDrawStore((s) => s.setLiveSession);
  const clearLiveSession = useEventDrawStore((s) => s.clearLiveSession);
  const setActiveTab = useEventDrawStore((s) => s.setActiveTab);

  // 전체화면 상태
  const [fullscreenRound, setFullscreenRound] = useState<number | null>(null);
  const [animatingWinners, setAnimatingWinners] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // 즉석 추첨 모달
  const [quickDraw, setQuickDraw] = useState(false);
  const [quickPrize, setQuickPrize] = useState("");
  const [quickCount, setQuickCount] = useState(1);
  const [quickAnimation, setQuickAnimation] = useState<AnimationType>("slot");
  const [quickPool, setQuickPool] = useState<DrawPoolType>("all");
  const [quickMode, setQuickMode] = useState<"single" | "batch">("single");
  const [quickSelectedParts, setQuickSelectedParts] = useState<string[]>([]);
  const [quickAllowDuplicate, setQuickAllowDuplicate] = useState(false);

  // 이벤트 종료 모달
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [ending, setEnding] = useState(false);

  const roundResults = liveSession.roundResults;
  const excludeIds = liveSession.excludeIds;
  const quickResults = liveSession.quickResults || [];

  const activeMembers = useMemo(() => members.filter((m) => m.is_active), [members]);
  const participantNames = useMemo(() => activeMembers.map((m) => m.name), [activeMembers]);
  const partsList = useMemo(() => {
    const parts = new Set<string>();
    activeMembers.forEach((m) => { if (m.department && m.department !== "공정기술그룹") parts.add(m.department); });
    return Array.from(parts).sort();
  }, [activeMembers]);

  const getDept = useCallback((name: string) => {
    const m = members.find((m) => m.name === name);
    return m?.department || "";
  }, [members]);

  const rounds = liveConfig?.rounds || [];
  const eventId = liveConfig?.eventId || null;

  // 라운드 카드 클릭 → 전체화면 대기 모드 진입
  const handleRoundClick = useCallback((roundIdx: number) => {
    setFullscreenRound(roundIdx);
    setShowResult(false);
    setIsAnimating(false);
    setAnimatingWinners([]);
    setIsReady(true);
    window.history.pushState({ fullscreen: true }, '');
  }, []);

  // 추첨 시작 버튼 → 실제 API 호출 + 애니메이션
  const handleStartDraw = useCallback(async () => {
    if (fullscreenRound === null || fullscreenRound < 0 || !eventId) return;
    const round = rounds[fullscreenRound];
    setIsReady(false);
    setIsAnimating(true);

    try {
      // 라운드별 풀에 따라 참가자 필터링
      const poolIds = round.pool === "attended"
        ? members.filter((m) => m.is_active && m.is_attended).map((m) => m.id)
        : round.pool === "parts" && round.selectedParts?.length
          ? members.filter((m) => m.is_active && m.department && round.selectedParts!.includes(m.department)).map((m) => m.id)
          : members.filter((m) => m.is_active).map((m) => m.id);

      if (poolIds.length < round.count) {
        showWarningToast(`추첨 대상(${poolIds.length}명)이 추첨 인원(${round.count}명)보다 적습니다.`);
        setFullscreenRound(null);
        setIsAnimating(false);
        setIsReady(false);
        return;
      }

      const result = await executeDraw({
        event_id: eventId,
        round_index: fullscreenRound,
        round_label: round.label,
        prize_name: round.prize,
        count: round.count,
        participant_ids: poolIds,
        exclude_ids: liveConfig?.allowDuplicate ? [] : excludeIds,
      });
      const winnerNames = result.winners.map((w: { member_name: string }) => w.member_name);
      setAnimatingWinners(winnerNames);
    } catch (err) {
      showErrorToast("추첨 실패: " + (err as Error).message);
      setFullscreenRound(null);
      setIsAnimating(false);
      setIsReady(false);
    }
  }, [fullscreenRound, eventId, rounds, excludeIds, liveConfig?.allowDuplicate, members]);

  // 애니메이션 완료
  const handleAnimationDone = useCallback(() => {
    setIsAnimating(false);
    setShowResult(true);

    if (fullscreenRound !== null && fullscreenRound >= 0) {
      const round = rounds[fullscreenRound];
      const newRoundResults = {
        ...roundResults,
        [fullscreenRound]: { names: animatingWinners, prize: round.prize },
      };
      let newExcludeIds = excludeIds;
      if (!liveConfig?.allowDuplicate) {
        const winnerMemberIds = members
          .filter((m) => animatingWinners.includes(m.name))
          .map((m) => m.id);
        newExcludeIds = [...excludeIds, ...winnerMemberIds];
      }
      setLiveSession({ roundResults: newRoundResults, excludeIds: newExcludeIds, quickResults });
    }
  }, [fullscreenRound, rounds, animatingWinners, members, liveConfig?.allowDuplicate, roundResults, excludeIds, setLiveSession]);

  // 즉석 추첨 - 전체화면 대기 모드 진입
  const handleQuickReady = () => {
    if (!quickPrize.trim() || activeMembers.length < 2) return;
    setFullscreenRound(-1);
    setShowResult(false);
    setIsAnimating(false);
    setAnimatingWinners([]);
    setIsReady(true);
    setQuickDraw(false);
    window.history.pushState({ fullscreen: true }, '');
  };

  // 즉석 추첨 시작 (현재 이벤트 세션에 추가)
  const handleQuickStart = async () => {
    setIsReady(false);
    setIsAnimating(true);
    try {
      // 현재 진행중인 이벤트에 즉석추첨 결과 저장
      const targetEventId = eventId;
      if (!targetEventId) {
        showWarningToast("진행중인 이벤트가 없습니다");
        setFullscreenRound(null);
        setIsAnimating(false);
        return;
      }
      const quickRoundIndex = rounds.length + quickResults.length; // 기존 라운드 뒤에 이어서
      const result = await executeDraw({
        event_id: targetEventId,
        round_index: quickRoundIndex,
        round_label: `즉석: ${quickPrize}`,
        prize_name: quickPrize,
        count: quickCount,
        participant_ids: quickPool === "attended"
          ? members.filter((m) => m.is_active && m.is_attended).map((m) => m.id)
          : quickPool === "parts" && quickSelectedParts.length
            ? members.filter((m) => m.is_active && m.department && quickSelectedParts.includes(m.department)).map((m) => m.id)
            : activeMembers.map((m) => m.id),
        exclude_ids: quickAllowDuplicate ? [] : (liveConfig?.allowDuplicate ? [] : excludeIds),
      });
      const winnerNames = result.winners.map((w: { member_name: string }) => w.member_name);
      setAnimatingWinners(winnerNames);
    } catch (err) {
      showErrorToast("즉석추첨 실패: " + (err as Error).message);
      setFullscreenRound(null);
      setIsAnimating(false);
    }
  };

  const handleQuickAnimationDone = useCallback(() => {
    setIsAnimating(false);
    setShowResult(true);
    // 즉석 추첨 결과를 세션에 저장 + excludeIds 업데이트
    let newExcludeIds = excludeIds;
    if (!liveConfig?.allowDuplicate) {
      const winnerMemberIds = members
        .filter((m) => animatingWinners.includes(m.name))
        .map((m) => m.id);
      newExcludeIds = [...excludeIds, ...winnerMemberIds];
    }
    setLiveSession({
      roundResults: liveSession.roundResults,
      excludeIds: newExcludeIds,
      quickResults: [...quickResults, { prize: quickPrize, names: animatingWinners }],
    });
    onRefresh();
  }, [onRefresh, liveSession, quickResults, quickPrize, animatingWinners, setLiveSession, excludeIds, liveConfig?.allowDuplicate, members]);

  // 메인으로 돌아가기
  const handleBackToMain = useCallback(() => {
    setFullscreenRound(null);
    setShowResult(false);
    setIsAnimating(false);
    setIsReady(false);
    setAnimatingWinners([]);
    onRefresh();
  }, [onRefresh]);

  // 브라우저 뒤로가기 시 전체화면만 닫기
  useEffect(() => {
    const handlePopState = () => {
      if (fullscreenRound !== null) {
        handleBackToMain();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [fullscreenRound, handleBackToMain]);

  // 이벤트 종료
  const handleEndEvent = async () => {
    setEnding(true);
    try {
      if (eventId) await updateEvent(eventId, { status: "completed" });
      setLiveConfig(null);
      clearLiveSession();
      setShowEndConfirm(false);
      await onRefresh();
      setActiveTab("history");
    } catch (err) {
      showErrorToast("이벤트 종료 실패: " + (err as Error).message);
    }
    setEnding(false);
  };

  const currentAnimRound = fullscreenRound !== null && fullscreenRound >= 0 ? rounds[fullscreenRound] : null;
  const quickAnimRound = fullscreenRound === -1;
  const AnimationComponent = useMemo(() => currentAnimRound
    ? ANIMATION_MAP[currentAnimRound.animation]
    : quickAnimRound
      ? ANIMATION_MAP[quickAnimation]
      : null, [currentAnimRound, quickAnimRound, quickAnimation]);

  // ===== 전체화면 추첨 모드 =====
  if (fullscreenRound !== null) {
    const roundLabel = currentAnimRound?.label || "즉석추첨";
    const roundPrize = currentAnimRound?.prize || quickPrize;
    const roundCount = currentAnimRound?.count || quickCount;

    // 당첨자 수에 따른 그리드 열 수 결정
    const winnerCount = animatingWinners.length;
    const gridCols =
      winnerCount <= 1 ? "grid-cols-1 max-w-sm mx-auto"
        : winnerCount <= 2 ? "grid-cols-2 max-w-2xl mx-auto"
          : winnerCount <= 4 ? "grid-cols-2"
            : winnerCount <= 6 ? "grid-cols-2 lg:grid-cols-3"
              : winnerCount <= 9 ? "grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"
              : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 30%, #0f172a 100%)"
      }}>
        {/* 상단 라운드 정보 */}
        <div className="text-center pt-6 pb-4 flex-shrink-0">
          <div className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full text-white text-sm font-extrabold shadow-lg shadow-blue-500/30">
            {quickAnimRound ? "⚡ 즉석추첨" : `라운드 ${fullscreenRound + 1} / ${rounds.length}`}
          </div>
          {isReady && !isAnimating && !showResult ? (
            <>
              <h2 className="text-3xl lg:text-5xl font-black text-white mt-3">이번 경품은?</h2>
            </>
          ) : (
            <>
              <h2 className="text-3xl lg:text-5xl font-black text-white mt-3">
                {roundPrize || roundLabel}
              </h2>
              <p className="text-white/50 font-bold mt-1 text-lg">{roundCount}명</p>
            </>
          )}
        </div>

        {/* 메인 스테이지 - 화면 최대 활용 */}
        <div className="flex-1 flex items-center justify-center px-4 lg:px-8 pb-4 relative overflow-auto">
          {showResult ? (
            // ===== 결과 화면 - 화면 70% 채우기 =====
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center" style={{ maxWidth: "90vw" }}>
              <h3 className="text-3xl lg:text-5xl font-black text-white mb-4 lg:mb-6 flex items-center gap-3 absolute top-[12vh] left-1/2 -translate-x-1/2">
                <span className="animate-bounce">🎉</span> 축하합니다! <span className="animate-bounce">🎉</span>
              </h3>
              {winnerCount === 1 ? (
                // 1명 - 크게 가운데
                <div className="flex flex-col items-center justify-center py-4 lg:py-8">
                  <span className="text-6xl lg:text-8xl mb-3">🏆</span>
                  <div className="text-4xl lg:text-6xl xl:text-7xl font-black text-white">{animatingWinners[0]}</div>
                  {getDept(animatingWinners[0]) && (
                    <div className="text-xl lg:text-2xl text-white/50 font-medium mt-2">{getDept(animatingWinners[0])}</div>
                  )}
                </div>
              ) : (
                // 2명 이상 - 동일 스타일 그리드
                <div className={`grid ${gridCols} gap-3 lg:gap-4 w-full`} style={{ maxWidth: "85vw" }}>
                  {animatingWinners.map((name, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center justify-center py-4 lg:py-6"
                    >
                      <span className="text-3xl lg:text-4xl mb-1">🏆</span>
                      <div className="text-xl lg:text-2xl xl:text-3xl font-black text-white">{name}</div>
                      {getDept(name) && (
                        <div className="text-sm lg:text-base text-white/50 font-medium mt-0.5">{getDept(name)}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={handleBackToMain}
                className="absolute bottom-[8vh] left-1/2 -translate-x-1/2 px-10 py-3 lg:py-4 bg-white/10 hover:bg-white/20 border-2 border-white/20 text-white font-bold text-base lg:text-lg rounded-2xl transition-all backdrop-blur-sm"
              >
                메인으로 돌아가기
              </button>
            </div>
          ) : isAnimating && animatingWinners.length > 0 && AnimationComponent ? (
            // ===== 애니메이션 - 크게 =====
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              <AnimationComponent
                winners={animatingWinners}
                participants={participantNames}
                onComplete={quickAnimRound ? handleQuickAnimationDone : handleAnimationDone}
              />
            </div>
          ) : isReady ? (
            // ===== 대기 화면 =====
            <div className="text-center relative z-10">
              <div className="text-8xl lg:text-[10rem] mb-4 opacity-80 animate-bounce">
                ❓
              </div>
              <p className="text-white/40 font-bold text-xl mb-8">경품을 공개하려면 추첨을 시작하세요!</p>
              <button
                onClick={quickAnimRound ? handleQuickStart : handleStartDraw}
                className="group relative px-20 py-8 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black text-3xl lg:text-4xl rounded-3xl transition-all shadow-2xl shadow-blue-500/40 hover:shadow-blue-500/60 hover:-translate-y-1 active:translate-y-0"
              >
                <span className="relative z-10">추첨 시작</span>
                <div className="absolute inset-0 rounded-3xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <div className="mt-8">
                <button
                  onClick={handleBackToMain}
                  className="px-6 py-2 text-white/30 hover:text-white/60 font-medium text-sm transition-colors"
                >
                  ← 메인으로 돌아가기
                </button>
              </div>
            </div>
          ) : (
            // ===== 로딩 =====
            <div className="text-center relative z-10">
              <div className="w-20 h-20 border-4 border-white/20 border-t-white/80 rounded-full animate-spin mx-auto" />
              <p className="text-white/40 mt-4 font-bold text-lg">추첨 준비 중...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== 설정 없을 때 안내 =====
  if (!liveConfig) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
        <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center mb-5">
          <span className="text-4xl">⚙️</span>
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2">설정을 먼저 완료하세요</h2>
        <p className="text-slate-400 font-medium text-sm mb-6">이벤트와 라운드를 설정한 후 추첨을 시작할 수 있습니다</p>
        <button
          onClick={() => setActiveTab("setup")}
          className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg shadow-blue-500/25"
        >
          설정하러 가기
        </button>
      </div>
    );
  }

  // ===== 메인 발표 화면 =====
  const allDone = rounds.length > 0 && rounds.every((_, i) => roundResults[i]);
  const doneCount = Object.keys(roundResults).length;
  const progressPercent = rounds.length > 0 ? Math.round((doneCount / rounds.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* 이벤트 헤더 카드 */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 rounded-2xl p-5 lg:p-6 relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-blue-500/20 rounded-full text-blue-300 text-[10px] font-bold">LIVE</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h2 className="text-xl lg:text-2xl font-black text-white mb-1">{liveConfig.eventTitle}</h2>
            {quickResults.length > 0 && (
              <div className="flex items-center gap-3 text-white/50 text-xs font-medium">
                <span className="text-amber-400">즉석 {quickResults.length}회</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowEndConfirm(true)}
            className="flex-shrink-0 px-4 py-2 bg-white/10 hover:bg-red-500/80 border border-white/20 hover:border-red-400 text-white/70 hover:text-white font-bold text-xs rounded-xl transition-all"
          >
            이벤트 종료
          </button>
        </div>

        {/* 프로그레스바 */}
        {rounds.length > 0 && (
          <div className="relative z-10 mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-white/40 text-[10px] font-bold">진행률</span>
              <span className="text-white/60 text-[10px] font-bold">{doneCount}/{rounds.length} 완료</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  allDone
                    ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                    : "bg-gradient-to-r from-blue-400 to-indigo-500"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 라운드 카드 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {rounds.map((round, idx) => {
          const result = roundResults[idx];
          const status: RoundStatus = result ? "done" : "waiting";
          const animInfo = ANIMATIONS.find((a) => a.key === round.animation);

          return (
            <div
              key={idx}
              className={`relative bg-white rounded-2xl border-2 overflow-hidden transition-all ${
                status === "done"
                  ? "border-emerald-300 shadow-md shadow-emerald-500/10"
                  : "border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1 cursor-pointer"
              }`}
              onClick={() => status === "waiting" ? handleRoundClick(idx) : undefined}
            >
              {/* 카드 헤더 */}
              <div className={`px-4 py-2.5 flex items-center justify-between ${
                status === "done"
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                  : "bg-gradient-to-r from-slate-700 to-slate-800"
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-xs">라운드 {idx + 1}</span>
                </div>
                {status === "done" && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              <div className="p-4 text-center">
                {status === "done" ? (
                  <div className="text-lg font-black text-slate-800 mb-1">{round.prize || "-"}</div>
                ) : (
                  <div className="text-2xl mb-1">🎁</div>
                )}
                {status === "done" && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium mb-2">
                    <span>{round.count}명</span>
                    <span>·</span>
                    <span>{animInfo?.icon} {animInfo?.label}</span>
                  </div>
                )}
                <div className="mb-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    round.pool === "attended"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-blue-100 text-blue-600"
                  }`}>
                    {round.pool === "attended" ? "🙋 참석자" : "👥 전체"}
                  </span>
                </div>

                {status === "done" ? (
                  <div className={`grid ${result.names.length === 1 ? "grid-cols-1" : "grid-cols-2"} gap-1.5`}>
                    {result.names.map((name, i) => (
                      <div key={i} className="flex flex-col items-center py-2 px-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                        <span className="text-sm mb-0.5">🏆</span>
                        <span className="text-xs font-bold text-emerald-700 text-center">{name}</span>
                        {getDept(name) && <span className="text-[10px] text-emerald-500 font-medium">{getDept(name)}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => handleRoundClick(idx)}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-500/20"
                  >
                    추첨하기
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* 즉석 추첨 결과 카드 */}
        {quickResults.map((qr, idx) => (
          <div
            key={`quick-${idx}`}
            className="relative bg-white rounded-2xl border-2 border-amber-300 shadow-md shadow-amber-500/10 overflow-hidden"
          >
            <div className="px-4 py-2.5 flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-500">
              <div className="flex items-center gap-2">
                <span className="text-white text-xs">⚡</span>
                <span className="text-white font-bold text-xs">즉석추첨</span>
              </div>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="p-4 text-center">
              <div className="text-lg font-black text-slate-800 mb-1">{qr.prize}</div>
              <div className="text-xs text-slate-400 font-medium mb-3">{qr.names.length}명</div>
              <div className={`grid ${qr.names.length === 1 ? "grid-cols-1" : qr.names.length <= 4 ? "grid-cols-2" : "grid-cols-3"} gap-1.5`}>
                {qr.names.map((name, i) => (
                  <div key={i} className="flex flex-col items-center py-2 px-1.5 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="text-sm mb-0.5">🏆</span>
                    <span className="text-xs font-bold text-amber-700 text-center">{name}</span>
                    {getDept(name) && <span className="text-[10px] text-amber-500 font-medium">{getDept(name)}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* 즉석 추첨 버튼 카드 */}
        <button
          onClick={() => setQuickDraw(true)}
          className="bg-white rounded-2xl border-2 border-dashed border-amber-300 hover:border-amber-400 hover:bg-amber-50/50 transition-all flex flex-col items-center justify-center py-8 gap-2 group"
        >
          <div className="w-12 h-12 rounded-full bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center transition-colors">
            <span className="text-2xl">⚡</span>
          </div>
          <span className="text-sm font-bold text-amber-500 group-hover:text-amber-600 transition-colors">즉석 추첨</span>
        </button>
      </div>

      {/* 하단 액션 */}
      {allDone && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setShowEndConfirm(true)}
            className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black rounded-2xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/25"
          >
            모든 라운드 완료! 이벤트 종료하기
          </button>
        </div>
      )}

      {/* 즉석 추첨 모달 */}
      {quickDraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
              <h3 className="text-white font-black text-lg flex items-center gap-2">
                <span>⚡</span> 즉석 추첨
              </h3>
              <p className="text-white/70 text-sm font-medium">빠르게 추첨을 진행합니다</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">상품명</label>
                <input
                  value={quickPrize}
                  onChange={(e) => setQuickPrize(e.target.value)}
                  placeholder="예: 커피 쿠폰"
                  className="w-full h-11 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 text-sm font-bold focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">추첨 인원</label>
                  <input
                    type="number"
                    min={1}
                    value={quickCount}
                    onChange={(e) => {
                      const newCount = parseInt(e.target.value) || 1;
                      setQuickCount(newCount);
                      // batch 모드일 때만 maxCount 체크하여 자동 전환
                      if (quickMode === "batch") {
                        const currentAnim = ANIMATIONS.find((a) => a.key === quickAnimation);
                        if (currentAnim && newCount > 1 && (!currentAnim.multi || newCount > currentAnim.maxCount)) {
                          const available = ANIMATIONS.find((a) => a.multi && newCount <= a.maxCount);
                          if (available) setQuickAnimation(available.key);
                        }
                      }
                    }}
                    className="w-full h-11 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 text-sm font-bold focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">모드</label>
                  <select
                    value={quickMode}
                    onChange={(e) => setQuickMode(e.target.value as "single" | "batch")}
                    className="w-full h-11 px-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 text-sm font-bold focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  >
                    <option value="single">1명씩</option>
                    <option value="batch">한번에</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">추첨 대상</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setQuickPool("attended")}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      quickPool === "attended"
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-slate-50 border-2 border-slate-200 text-slate-400 hover:border-emerald-200"
                    }`}
                  >
                    🙋 당일 참석자
                  </button>
                  <button
                    onClick={() => setQuickPool("all")}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      quickPool === "all"
                        ? "bg-blue-500 text-white shadow-sm"
                        : "bg-slate-50 border-2 border-slate-200 text-slate-400 hover:border-blue-200"
                    }`}
                  >
                    👥 전체 그룹원
                  </button>
                  <button
                    onClick={() => setQuickPool("parts")}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      quickPool === "parts"
                        ? "bg-purple-500 text-white shadow-sm"
                        : "bg-slate-50 border-2 border-slate-200 text-slate-400 hover:border-purple-200"
                    }`}
                  >
                    🏢 파트
                  </button>
                </div>
                {quickPool === "parts" && (
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {partsList.map((part) => {
                      const isSelected = quickSelectedParts.includes(part);
                      return (
                        <button
                          key={part}
                          onClick={() => {
                            setQuickSelectedParts((prev) =>
                              isSelected ? prev.filter((p) => p !== part) : [...prev, part]
                            );
                          }}
                          className={`py-2 rounded-lg text-[10px] font-bold transition-all text-center truncate ${
                            isSelected
                              ? "bg-purple-500 text-white shadow-sm"
                              : "bg-slate-50 border border-slate-200 text-slate-500 hover:border-purple-300 hover:bg-purple-50"
                          }`}
                        >
                          {part}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 text-slate-600 text-xs font-bold cursor-pointer select-none px-1">
                <input
                  type="checkbox"
                  checked={quickAllowDuplicate}
                  onChange={(e) => setQuickAllowDuplicate(e.target.checked)}
                  className="w-4 h-4 rounded accent-orange-500"
                />
                이전 당첨자도 추첨 대상에 포함 (중복 당첨 허용)
              </label>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">연출</label>
                <div className="grid grid-cols-4 gap-2">
                  {ANIMATIONS.map((anim) => {
                    // single 모드면 모든 애니메이션 가능, batch 모드면 maxCount 체크
                    const isAvailable = quickCount <= 1
                      ? true
                      : quickMode === "single"
                        ? true
                        : anim.multi && quickCount <= anim.maxCount;
                    return (
                      <button
                        key={anim.key}
                        onClick={() => isAvailable && setQuickAnimation(anim.key)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                          quickAnimation === anim.key
                            ? "bg-orange-100 border-2 border-orange-400 shadow-sm"
                            : isAvailable
                              ? "bg-slate-50 border-2 border-slate-200 hover:border-orange-200 cursor-pointer"
                              : "bg-slate-100 border-2 border-slate-100 opacity-40 cursor-not-allowed"
                        }`}
                      >
                        <span className={`text-xl ${!isAvailable ? "grayscale" : ""}`}>{anim.icon}</span>
                        <span className={`text-[10px] font-bold ${quickAnimation === anim.key ? "text-orange-600" : isAvailable ? "text-slate-400" : "text-slate-300"}`}>{anim.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button
                onClick={() => setQuickDraw(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleQuickReady}
                disabled={!quickPrize.trim()}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-slate-200 disabled:to-slate-300 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/25 disabled:shadow-none"
              >
                ⚡ 바로 추첨!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이벤트 종료 확인 모달 */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowEndConfirm(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-5">
              <h3 className="text-white font-black text-lg">이벤트를 종료하시겠습니까?</h3>
              <p className="text-white/70 text-sm font-medium mt-1">종료하면 더 이상 추첨을 진행할 수 없습니다</p>
            </div>
            <div className="p-6">
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-5">
                <div className="text-sm font-bold text-red-700 mb-2">주의사항</div>
                <ul className="text-xs text-red-600 space-y-1">
                  <li>· 이벤트 상태가 "완료"로 변경됩니다</li>
                  <li>· 미완료 라운드는 더 이상 추첨할 수 없습니다</li>
                  <li>· 완료된 추첨 결과는 히스토리에서 확인 가능합니다</li>
                  {rounds.length > 0 && Object.keys(roundResults).length < rounds.length && (
                    <li className="font-bold">· 아직 {rounds.length - Object.keys(roundResults).length}개 라운드가 미완료입니다!</li>
                  )}
                </ul>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  계속 진행
                </button>
                <button
                  onClick={handleEndEvent}
                  disabled={ending}
                  className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/25 disabled:opacity-50"
                >
                  {ending ? "종료 중..." : "이벤트 종료"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
