"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle2 } from "lucide-react";
import { DeviceTest } from "../start/device-test";
import { MockExamSession } from "./mock-exam-session";
import { getSession } from "@/lib/actions/mock-exam";
import { MOCK_EXAM_MODE_LABELS, type MockExamMode } from "@/lib/types/mock-exam";

type Phase = "loading" | "restoring" | "device-test" | "session" | "error";

interface MockExamSessionWrapperProps {
  sessionId: string;
}

export function MockExamSessionWrapper({
  sessionId,
}: MockExamSessionWrapperProps) {
  const [phase, setPhase] = useState<Phase>("loading");

  // 세션 데이터 조회
  const {
    data: sessionResult,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["mock-session", sessionId],
    queryFn: () => getSession({ session_id: sessionId }),
    staleTime: 10 * 1000, // 10초
  });

  // 로딩 완료 후 phase 결정
  useEffect(() => {
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
      // 세션이 이미 완료 상태면 바로 세션 화면 (평가 대기로 전환됨)
      if (session.status === "completed") {
        setPhase("session");
      }
      // 세션이 활성 상태이고 문항이 1 이상 진행되었으면 복원 후 세션 화면 (UX 6-2)
      else if (session.current_question > 1) {
        setPhase("restoring");
        // 복원 표시 후 1.5초 대기 → 세션 진입
        setTimeout(() => setPhase("session"), 1500);
      } else {
        // 아직 시작 전이면 디바이스 테스트
        setPhase("device-test");
      }
    }
  }, [isLoading, queryError, sessionResult]);

  const handleDeviceTestComplete = useCallback(() => {
    setPhase("session");
  }, []);

  const handleDeviceTestBack = useCallback(() => {
    window.location.href = "/mock-exam";
  }, []);

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
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-foreground-secondary">
            {sessionResult?.error || "세션을 불러올 수 없습니다"}
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

  // 디바이스 테스트
  if (phase === "device-test") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <DeviceTest
          onComplete={handleDeviceTestComplete}
          onBack={handleDeviceTestBack}
        />
      </div>
    );
  }

  // 세션 진행
  if (phase === "session" && sessionResult?.data) {
    return (
      <MockExamSession
        sessionId={sessionId}
        initialData={sessionResult.data}
      />
    );
  }

  return null;
}
