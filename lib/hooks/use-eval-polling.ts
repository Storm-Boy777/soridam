"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { EvalStatus, HolisticStatus } from "@/lib/types/mock-exam";

// ── 5초 폴링으로 eval_status 실시간 업데이트 (F-8) ──

interface EvalStatusMap {
  [questionNumber: number]: EvalStatus;
}

interface UseEvalPollingOptions {
  sessionId: string;
  enabled: boolean;          // 폴링 활성화 여부
  interval?: number;         // 폴링 간격 (ms, 기본 5000)
  maxBackoff?: number;       // 최대 백오프 간격 (ms, 기본 30000)
}

interface UseEvalPollingReturn {
  evalStatuses: EvalStatusMap;
  holisticStatus: HolisticStatus;
  completedCount: number;    // 평가 완료 문항 수
  totalCount: number;        // 전체 평가 대상 문항 수 (Q1 제외)
  isAllCompleted: boolean;   // 모든 개별 평가 완료 여부
  isReportReady: boolean;    // 종합 리포트 완료 여부
}

export function useEvalPolling(
  options: UseEvalPollingOptions
): UseEvalPollingReturn {
  const { sessionId, enabled, interval = 5000, maxBackoff = 30000 } = options;

  const [evalStatuses, setEvalStatuses] = useState<EvalStatusMap>({});
  const [holisticStatus, setHolisticStatus] = useState<HolisticStatus>("pending");
  const consecutiveErrorsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supabaseRef = useRef(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  // 폴링 실행
  const poll = useCallback(async () => {
    try {
      const supabase = supabaseRef.current;

      // 답변 eval_status + 세션 holistic_status 병렬 조회
      const [{ data: answers, error: ansErr }, { data: session, error: sessErr }] =
        await Promise.all([
          supabase
            .from("mock_test_answers")
            .select("question_number, eval_status")
            .eq("session_id", sessionId),
          supabase
            .from("mock_test_sessions")
            .select("holistic_status")
            .eq("session_id", sessionId)
            .single(),
        ]);

      if (ansErr || sessErr) {
        consecutiveErrorsRef.current += 1;
        return;
      }

      // 성공 시 에러 카운터 리셋
      consecutiveErrorsRef.current = 0;

      // eval_status 맵 업데이트
      if (answers) {
        const statusMap: EvalStatusMap = {};
        for (const a of answers) {
          statusMap[a.question_number] = a.eval_status as EvalStatus;
        }
        setEvalStatuses(statusMap);
      }

      // holistic_status 업데이트
      if (session) {
        setHolisticStatus(session.holistic_status as HolisticStatus);
      }
    } catch {
      consecutiveErrorsRef.current += 1;
    }
  }, [sessionId]);

  // 폴링 루프
  useEffect(() => {
    if (!enabled || !sessionId) return;

    const schedule = () => {
      // exponential backoff (에러 시)
      const errors = consecutiveErrorsRef.current;
      const backoff = errors > 0
        ? Math.min(interval * Math.pow(2, errors), maxBackoff)
        : interval;

      timerRef.current = setTimeout(async () => {
        await poll();
        schedule();
      }, backoff);
    };

    // 즉시 1회 실행 후 스케줄링
    poll().then(schedule);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, sessionId, interval, maxBackoff, poll]);

  // 통계 계산
  const statuses = Object.entries(evalStatuses);
  // Q1 제외 (question_number > 1)
  const evalTargets = statuses.filter(([qNum]) => Number(qNum) > 1);
  const completedCount = evalTargets.filter(
    ([, status]) => status === "completed"
  ).length;
  const skippedCount = evalTargets.filter(
    ([, status]) => status === "skipped"
  ).length;
  const totalCount = evalTargets.length;
  const isAllCompleted = totalCount > 0 && completedCount + skippedCount >= totalCount;
  const isReportReady = holisticStatus === "completed";

  return {
    evalStatuses,
    holisticStatus,
    completedCount,
    totalCount,
    isAllCompleted,
    isReportReady,
  };
}
