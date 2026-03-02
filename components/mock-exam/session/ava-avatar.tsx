"use client";

import Image from "next/image";
import { Mic, Volume2 } from "lucide-react";

interface AvaAvatarProps {
  isSpeaking?: boolean;
  isListening?: boolean;
  onInteract?: () => void;
  className?: string;
}

export function AvaAvatar({
  isSpeaking = false,
  isListening = false,
  onInteract,
  className = "",
}: AvaAvatarProps) {
  return (
    <div className={`relative pb-10 transition-all duration-300 ${className}`}>
      <div className="relative mx-auto h-48 w-48 md:h-64 md:w-64">
        {/* 배경 글로우 */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-300/20 to-secondary-300/20 blur-xl" />

        {/* 이미지 컨테이너 */}
        <div className="relative h-full w-full overflow-hidden rounded-3xl shadow-2xl">
          <Image
            src="/images/ava-avatar.PNG"
            alt="AVA - AI 시험관"
            width={256}
            height={256}
            className="h-full w-full object-cover"
            priority
            unoptimized
          />
        </div>

        {/* 상태 뱃지: 이미지 아래 */}
        {isSpeaking && (
          <div className="absolute -bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-surface px-3 py-1 shadow-lg">
            <Volume2 size={14} className="animate-pulse text-primary-500" />
            <span className="text-xs font-medium text-foreground-secondary">
              말하는 중...
            </span>
          </div>
        )}

        {isListening && (
          <div className="absolute -bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 shadow-lg">
            <Mic size={14} className="animate-pulse text-green-600" />
            <span className="text-xs font-medium text-green-700">
              듣는 중...
            </span>
          </div>
        )}
      </div>

      {onInteract && (
        <button
          onClick={onInteract}
          className="absolute inset-0 bg-transparent"
          aria-label="AVA와 상호작용"
        />
      )}
    </div>
  );
}
