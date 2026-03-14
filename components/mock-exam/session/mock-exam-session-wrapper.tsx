"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle2 } from "lucide-react";
import { SurveyIntro } from "../start/survey-intro";
import { DeviceTest } from "../start/device-test";
import { MockExamSession } from "./mock-exam-session";
import { getSession } from "@/lib/actions/mock-exam";
import { MOCK_EXAM_MODE_LABELS, type MockExamMode } from "@/lib/types/mock-exam";
import { TrialBanner } from "@/components/trial/trial-banner";
import { TRIAL_INITIAL_DATA } from "@/components/trial/trial-data/mock-exam-trial-data";

type Phase = "loading" | "restoring" | "survey" | "device-test" | "session" | "error";

interface MockExamSessionWrapperProps {
  sessionId: string;
  isTrialMode?: boolean;
}

export function MockExamSessionWrapper({
  sessionId,
  isTrialMode = false,
}: MockExamSessionWrapperProps) {
  const router = useRouter();
  // 체험판이면 서베이부터 시작 (설계 문서: 서베이 → 디바이스 테스트 → 세션)
  const [phase, setPhase] = useState<Phase>(isTrialMode ? "survey" : "loading");

  // 세션 데이터 조회 (체험판이면 비활성화)
  const {
    data: sessionResult,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["mock-session", sessionId],
    queryFn: () => getSession({ session_id: sessionId }),
    staleTime: 10 * 1000, // 10초
    refetchOnWindowFocus: phase !== "session",
    refetchOnReconnect: phase !== "session",
    enabled: !isTrialMode,
  });

  // 로딩 완료 후 phase 결정 (실전 모드에서만)
  useEffect(() => {
    if (isTrialMode) return;

    if (isLoading) {
      setPhase("loading");
      return;
    }

    if (queryError || sessionResult?.error) {
      setPhase("error");
      return;
    }

    if (sessionResult?.data) {
      const session = sessionResult.data.session;
      const answers = sessionResult.data.answers;
      const setupDone =
        typeof window !== "undefined" &&
        localStorage.getItem(`mock-setup-done-${sessionId}`);

      // 만료/포기된 세션이면 에러 표시
      if (session.status === "expired") {
        setPhase("error");
      }
      // 세션이 이미 완료 상태면 바로 세션 화면 (평가 대기로 전환됨)
      else if (session.status === "completed") {
        setPhase("session");
      }
      // 세션이 활성 상태이고 문항이 2 이상 진행되었으면 복원 후 세션 화면
      else if (session.current_question > 1) {
        setPhase("restoring");
        setTimeout(() => setPhase("session"), 1500);
      }
      // Q1이지만 답변이 이미 있으면 (Q1 제출 후 새로고침) 복원
      else if (answers.length > 0) {
        setPhase("restoring");
        setTimeout(() => setPhase("session"), 1500);
      }
      // 서베이+환경점검 완료 플래그가 있으면 바로 세션 진입
      else if (setupDone) {
        setPhase("session");
      }
      // 최초 진입이면 서베이부터 시작
      else {
        setPhase("survey");
      }
    }
  }, [isLoading, queryError, sessionResult, sessionId, isTrialMode]);

  // 서베이 완료 → 디바이스 테스트
  const handleSurveyComplete = useCallback(() => {
    setPhase("device-test");
  }, []);

  // 디바이스 테스트 완료 → 세션 시작 + setup 완료 플래그 저장
  const handleDeviceTestComplete = useCallback(() => {
    if (typeof window !== "undefined" && !isTrialMode) {
      localStorage.setItem(`mock-setup-done-${sessionId}`, "true");
    }
    setPhase("session");
  }, [sessionId, isTrialMode]);

  // 디바이스 테스트 뒤로가기 → 서베이로 복귀 (체험판이면 모의고사 페이지로)
  const handleDeviceTestBack = useCallback(() => {
    if (isTrialMode) {
      router.push("/mock-exam");
    } else {
      setPhase("survey");
    }
  }, [isTrialMode, router]);

  // 로딩
  if (phase === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-primary-500" />
          <p className="text-sm text-foreground-secondary">
            세션을 불러오는 중...
          </p>
        </div>
      </div>
    );
  }

  // 에러
  if (phase === "error") {
    const isExpired = sessionResult?.data?.session?.status === "expired";
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-foreground-secondary">
            {isExpired
              ? "이 세션은 만료되었거나 포기된 세션입니다."
              : sessionResult?.error || "세션을 불러올 수 없습니다"}
          </p>
          <a
            href="/mock-exam"
            className="mt-2 inline-block text-sm text-primary-500 hover:underline"
          >
            모의고사 페이지로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  // 세션 복원 중 (UX 6-2)
  if (phase === "restoring" && sessionResult?.data) {
    const session = sessionResult.data.session;
    const answeredCount = sessionResult.data.answers.length;

    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={28} className="animate-spin text-primary-500" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              이전 세션을 복원하고 있습니다...
            </p>
            <div className="mt-3 space-y-1.5 text-xs text-foreground-secondary">
              <p className="flex items-center justify-center gap-1.5">
                <CheckCircle2 size={12} className="text-green-500" />
                세션 정보 불러오기
              </p>
              <p className="flex items-center justify-center gap-1.5">
                <CheckCircle2 size={12} className="text-green-500" />
                Q1~Q{session.current_question - 1} 답변 확인 ({answeredCount}/15 완료)
              </p>
            </div>
            <p className="mt-3 text-sm text-primary-500">
              {MOCK_EXAM_MODE_LABELS[session.mode as MockExamMode]} · Q{session.current_question}부터 이어서 진행합니다
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 서베이 (체험판에서는 스킵)
  if (phase === "survey") {
    return (
      <div className="h-0 flex-grow overflow-y-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
        <SurveyIntro onComplete={handleSurveyComplete} />
      </div>
    );
  }

  // 디바이스 테스트
  if (phase === "device-test") {
    return (
      <div className="flex h-0 flex-grow flex-col overflow-hidden">
        {isTrialMode && (
          <div className="border-b border-border px-4 py-2 sm:px-6">
            <TrialBanner />
          </div>
        )}
        <div className="h-0 flex-grow overflow-y-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
          <DeviceTest
            onComplete={handleDeviceTestComplete}
            onBack={handleDeviceTestBack}
          />
        </div>
      </div>
    );
  }

  // 세션 진행
  if (phase === "session") {
    let initialData = isTrialMode ? TRIAL_INITIAL_DATA : sessionResult?.data;
    if (!initialData) return null;

    // 체험판: started_at을 현재 시간으로 세팅 (실전 모드 40분 카운트다운 정상 작동)
    if (isTrialMode) {
      const now = new Date().toISOString();
      initialData = {
        ...initialData,
        session: {
          ...initialData.session,
          started_at: now,
          expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        },
      };
    }

    return (
      <MockExamSession
        sessionId={sessionId}
        initialData={initialData}
        isTrialMode={isTrialMode}
      />
    );
  }

  return null;
}
