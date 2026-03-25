"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { startFocusDrill, getDrillData, createMiniRetest, getRetestData } from "@/lib/actions/tutoring";
import { DrillPlayer } from "./drill-player";
import { DrillComplete } from "./drill-complete";
import { MiniRetest } from "../retest/mini-retest";
import type { TutoringDrill, TutoringAttempt, TutoringRetest } from "@/lib/types/tutoring";

interface DrillSessionWrapperProps {
  focusId: string;
  targetLevel?: string;
}

type SessionPhase = "loading" | "generating" | "drilling" | "drill_complete" | "retest_transition" | "retesting" | "error";

export function DrillSessionWrapper({ focusId, targetLevel = "IM3" }: DrillSessionWrapperProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("loading");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [retestData, setRetestData] = useState<TutoringRetest | null>(null);

  // 드릴 데이터 로드
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tutoring-drills", focusId],
    queryFn: async () => {
      const res = await getDrillData(focusId);
      return res.data;
    },
    staleTime: 5 * 1000,
  });

  const drills = data?.drills ?? [];
  const attempts = data?.attempts ?? [];

  // 드릴이 없으면 생성
  useEffect(() => {
    if (!isLoading && drills.length === 0 && sessionPhase === "loading") {
      generateDrills();
    } else if (!isLoading && drills.length > 0 && sessionPhase === "loading") {
      // 모든 드릴 pass 체크
      const allPassed = drills.every((d) => d.status === "passed");
      setSessionPhase(allPassed ? "drill_complete" : "drilling");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, drills.length]);

  const generateDrills = async () => {
    setSessionPhase("generating");
    setGenerateError(null);
    try {
      const result = await startFocusDrill(focusId);
      if (result.error) {
        setGenerateError(result.error);
        setSessionPhase("error");
      } else {
        await refetch();
        setSessionPhase("drilling");
      }
    } catch {
      setGenerateError("드릴 생성에 실패했습니다.");
      setSessionPhase("error");
    }
  };

  // Q 자동 전환 (pass 시 refetch → 다음 active drill 표시)
  const handleDrillPassed = useCallback(async () => {
    await refetch();
    // refetch 후 drilling 상태 유지 (새 active drill이 표시됨)
  }, [refetch]);

  // 전체 드릴 완료 → retest 전환 화면
  const handleAllDrillsComplete = useCallback(async () => {
    await refetch();
    setSessionPhase("drill_complete");
  }, [refetch]);

  // Retest 시작
  const handleStartRetest = useCallback(async () => {
    setSessionPhase("retest_transition");
    try {
      const result = await createMiniRetest(focusId);
      if (result.error) {
        alert(result.error);
        setSessionPhase("drill_complete");
        return;
      }

      // retest 데이터 로드
      const retestResult = await getRetestData(result.data!.retest_id);
      if (retestResult.data?.retest) {
        setRetestData(retestResult.data.retest);
        setSessionPhase("retesting");
      } else {
        setSessionPhase("drill_complete");
      }
    } catch {
      setSessionPhase("drill_complete");
    }
  }, [focusId]);

  // 현재 활성 드릴
  const activeDrill = drills.find((d) => d.status === "active");

  // ── 로딩 / 생성 중 ──
  if (sessionPhase === "loading" || sessionPhase === "generating" || isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
        <p className="text-sm text-foreground-secondary">
          {sessionPhase === "generating" ? "AI가 맞춤 드릴을 만들고 있어요..." : "로딩 중..."}
        </p>
        {sessionPhase === "generating" && (
          <p className="text-xs text-foreground-muted">약 10~15초 소요됩니다</p>
        )}
      </div>
    );
  }

  // ── 에러 ──
  if (sessionPhase === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
        <p className="text-sm text-red-600">{generateError}</p>
        <button
          onClick={generateDrills}
          className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // ── Retest 전환 ──
  if (sessionPhase === "retest_transition") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        <p className="text-sm text-foreground-secondary">재평가를 준비하고 있어요...</p>
      </div>
    );
  }

  // ── Retest 진행 ──
  if (sessionPhase === "retesting" && retestData) {
    return <MiniRetest retest={retestData} focusId={focusId} />;
  }

  // ── 드릴 전체 완료 → Retest 전환 화면 ──
  if (sessionPhase === "drill_complete") {
    return (
      <DrillComplete
        focusId={focusId}
        drills={drills}
        attempts={attempts}
        onStartRetest={handleStartRetest}
      />
    );
  }

  // ── 드릴 진행 ──
  if (sessionPhase === "drilling" && activeDrill) {
    const drillAttempts = attempts.filter((a) => a.drill_id === activeDrill.id);
    return (
      <DrillPlayer
        drill={activeDrill}
        drillIndex={activeDrill.question_number}
        totalDrills={drills.length}
        attempts={drillAttempts}
        targetLevel={targetLevel}
        onAttemptComplete={() => refetch()}
        onDrillPassed={handleDrillPassed}
        onAllDrillsComplete={handleAllDrillsComplete}
      />
    );
  }

  // 예외
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm text-foreground-secondary">드릴을 준비할 수 없습니다.</p>
    </div>
  );
}
