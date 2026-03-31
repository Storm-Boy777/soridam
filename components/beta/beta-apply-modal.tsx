"use client";

// 오픈 베타 신청 모달

import { useState } from "react";
import { X, MessageCircle, ExternalLink } from "lucide-react";
import { applyBeta } from "@/lib/actions/beta";

const KAKAO_OPEN_CHAT = "https://open.kakao.com/o/gF6E3oli";

interface BetaApplyModalProps {
  remaining: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function BetaApplyModal({ remaining, onClose, onSuccess }: BetaApplyModalProps) {
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError("카카오톡 닉네임을 입력해주세요");
      return;
    }
    setLoading(true);
    setError("");

    const result = await applyBeta(nickname);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">오픈 베타 신청</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-secondary">
            <X size={20} className="text-foreground-muted" />
          </button>
        </div>

        {/* 혜택 안내 */}
        <div className="mt-4 rounded-[var(--radius-lg)] border border-primary-200 bg-primary-50/50 p-4">
          <p className="text-sm font-semibold text-primary-700">베타 혜택 (4월 한정)</p>
          <ul className="mt-2 space-y-1 text-sm text-foreground-secondary">
            <li>- 실전 모의고사 <strong className="text-foreground">3회</strong></li>
            <li>- 스크립트 생성 <strong className="text-foreground">15회</strong></li>
            <li>- 만료: 2026년 4월 30일</li>
          </ul>
          <p className="mt-2 text-xs text-primary-500">
            남은 자리: <strong>{remaining}명</strong> / 100명
          </p>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* 카카오 닉네임 */}
          <div>
            <label className="block text-sm font-medium text-foreground">
              카카오톡 닉네임 <span className="text-accent-500">*</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="카카오톡에서 사용 중인 닉네임"
              maxLength={50}
              className="mt-1 w-full rounded-[var(--radius-md)] border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* 오픈채팅 안내 */}
          <div className="rounded-[var(--radius-lg)] border border-border bg-surface-secondary p-3">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-[#FEE500]" />
              <span className="text-sm font-medium text-foreground">카카오 오픈채팅 입장</span>
            </div>
            <p className="mt-1 text-xs text-foreground-secondary">
              아래 링크로 오픈채팅에 입장 후, 위에 입력한 닉네임과 동일하게 설정해주세요.
            </p>
            <a
              href={KAKAO_OPEN_CHAT}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600"
            >
              오픈채팅 입장하기
              <ExternalLink size={14} />
            </a>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <p className="text-sm text-accent-500">{error}</p>
          )}

          {/* 버튼 */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[var(--radius-md)] border border-border px-4 py-2.5 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !nickname.trim()}
              className="flex-1 rounded-[var(--radius-md)] bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "신청 중..." : "베타 신청하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
