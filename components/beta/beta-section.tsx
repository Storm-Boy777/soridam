"use client";

// 대시보드 베타 배너 — 상태에 따라 3가지 뷰 표시

import { useState } from "react";
import { Sparkles, Clock, CheckCircle2, XCircle } from "lucide-react";
import { BetaApplyModal } from "./beta-apply-modal";

interface BetaSectionProps {
  currentPlan: string;
  betaStatus: string | null; // null | 'pending' | 'approved' | 'rejected'
  betaRejectedReason?: string | null;
  remaining: number;
  planExpiresAt?: string | null;
}

export function BetaSection({
  currentPlan,
  betaStatus,
  remaining,
  betaRejectedReason,
  planExpiresAt,
}: BetaSectionProps) {
  const [showModal, setShowModal] = useState(false);
  const [localStatus, setLocalStatus] = useState(betaStatus);

  // 베타 사용 중 — 감사 배너
  if (currentPlan === "beta") {
    return (
      <div className="rounded-[var(--radius-xl)] border border-primary-200 bg-gradient-to-r from-primary-50 to-secondary-50 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary-500" />
          <span className="rounded-full bg-primary-500 px-2.5 py-0.5 text-xs font-bold text-white">
            BETA
          </span>
          <span className="text-sm font-semibold text-foreground">오픈 베타 이용 중</span>
        </div>
        <p className="mt-2 text-sm text-foreground-secondary">
          {planExpiresAt
            ? `만료: ${new Date(planExpiresAt).toLocaleDateString("ko-KR")}까지`
            : "4월 30일까지"} 이용 가능합니다.
          피드백은 카카오 오픈채팅으로 보내주세요!
        </p>
      </div>
    );
  }

  // 유료 플랜 사용 중 — 표시 안 함
  if (currentPlan !== "free") return null;

  // 신청 완료 (대기 중)
  if (localStatus === "pending") {
    return (
      <div className="rounded-[var(--radius-xl)] border border-secondary-200 bg-secondary-50/50 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-secondary-600" />
          <span className="text-sm font-semibold text-foreground">베타 신청 완료 — 승인 대기 중</span>
        </div>
        <p className="mt-2 text-sm text-foreground-secondary">
          관리자가 카카오 오픈채팅에서 닉네임 확인 후 승인합니다. 잠시만 기다려주세요!
        </p>
      </div>
    );
  }

  // 거절됨
  if (localStatus === "rejected") {
    return (
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface-secondary p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <XCircle size={18} className="text-foreground-muted" />
          <span className="text-sm font-semibold text-foreground">베타 신청이 거절되었습니다</span>
        </div>
        {betaRejectedReason && (
          <p className="mt-2 text-sm text-foreground-secondary">사유: {betaRejectedReason}</p>
        )}
      </div>
    );
  }

  // 마감
  if (remaining <= 0) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface-secondary p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} className="text-foreground-muted" />
          <span className="text-sm font-semibold text-foreground">오픈 베타가 마감되었습니다</span>
        </div>
        <p className="mt-2 text-sm text-foreground-secondary">
          100명 정원이 모두 찼습니다. 정식 출시를 기대해주세요!
        </p>
      </div>
    );
  }

  // 미신청 — 신청 CTA
  return (
    <>
      <div className="rounded-[var(--radius-xl)] border border-primary-200 bg-gradient-to-r from-primary-50 to-secondary-50 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-primary-500" />
              <span className="text-sm font-bold text-foreground">오픈 베타 참여하기</span>
              <span className="rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {remaining}자리 남음
              </span>
            </div>
            <p className="mt-1 text-sm text-foreground-secondary">
              4월 한 달간 모의고사 3회 + 스크립트 15회를 무료로 이용하세요!
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="shrink-0 rounded-[var(--radius-md)] bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600"
          >
            베타 신청
          </button>
        </div>
      </div>

      {showModal && (
        <BetaApplyModal
          remaining={remaining}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            setLocalStatus("pending");
          }}
        />
      )}
    </>
  );
}
