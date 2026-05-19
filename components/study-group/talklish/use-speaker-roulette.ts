"use client";

/**
 * Talklish 공용 발화자 룰렛 훅
 *
 * 한 라운드 = 출석 멤버 전원이 한 번씩 뽑힐 때까지 중복 X.
 * 모두 뽑히면 자동 reset → 새 라운드 시작.
 *
 * - members: 전체 패널 멤버
 * - presentMembers: 출석 중인 멤버만 (룰렛 풀)
 * - activeSpeaker: members 배열에서의 인덱스
 *
 * 월·수·금 stage가 공유 — 동작 일관성 보장.
 */

import { useCallback, useMemo, useState } from "react";
import type { PanelMember } from "@/lib/types/study-group";

interface Options {
  members: PanelMember[];
  presentMembers: PanelMember[];
  /** spin 애니메이션 지속 시간 (ms) */
  spinDelayMs?: number;
}

interface RoundProgress {
  picked: number;
  total: number;
  /** 모두 한 번씩 뽑힌 상태 — 다음 spin은 새 라운드 시작 */
  isComplete: boolean;
}

export function useSpeakerRoulette({
  members,
  presentMembers,
  spinDelayMs = 1100,
}: Options) {
  const [activeSpeaker, setActiveSpeaker] = useState(0);
  const [hasSpun, setHasSpun] = useState(false); // 한 번이라도 뽑혔는지 (초기엔 false → speaker undefined)
  const [spinning, setSpinning] = useState(false);
  const [pickedThisRound, setPickedThisRound] = useState<Set<string>>(new Set());

  const spin = useCallback(() => {
    if (spinning || presentMembers.length === 0) return;
    setSpinning(true);
    setTimeout(() => {
      // 현재 라운드 미뽑힘 출석자 풀
      let pool = presentMembers.filter((m) => !pickedThisRound.has(m.id));
      let nextRound = pickedThisRound;
      // 풀이 비면 라운드 자동 reset → 출석자 전체 풀
      if (pool.length === 0) {
        pool = presentMembers;
        nextRound = new Set();
      }
      const picked = pool[Math.floor(Math.random() * pool.length)];
      const idx = members.findIndex((m) => m.id === picked.id);
      setActiveSpeaker(idx >= 0 ? idx : 0);
      const updated = new Set(nextRound);
      updated.add(picked.id);
      setPickedThisRound(updated);
      setHasSpun(true);
      setSpinning(false);
    }, spinDelayMs);
  }, [spinning, presentMembers, members, pickedThisRound, spinDelayMs]);

  const roundProgress: RoundProgress = useMemo(() => {
    const picked = presentMembers.filter((m) => pickedThisRound.has(m.id)).length;
    const total = presentMembers.length;
    return {
      picked,
      total,
      isComplete: total > 0 && picked === total,
    };
  }, [presentMembers, pickedThisRound]);

  /** 진행자가 수동으로 라운드 리셋 — hasSpun도 함께 초기화 */
  const resetRound = useCallback(() => {
    setPickedThisRound(new Set());
    setHasSpun(false);
  }, []);

  /** 현재 발화자 — 한 번도 안 뽑혔으면 undefined */
  const speaker = hasSpun ? members[activeSpeaker] : undefined;

  return {
    activeSpeaker,
    setActiveSpeaker,
    hasSpun,
    speaker,
    spinning,
    spin,
    roundProgress,
    resetRound,
  };
}
