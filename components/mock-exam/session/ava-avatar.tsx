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
    <div className={`relative h-full w-full ${className}`}>
      <Image
        src="/images/ava-avatar-new.png"
        alt="AVA 시험관"
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 40vw"
        priority
      />

      {/* 상태 뱃지 — 이미지 위 하단 오버레이 */}
      {isSpeaking && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 shadow-lg backdrop-blur-sm">
          <Volume2 size={14} className="animate-pulse text-primary-500" />
          <span className="text-xs font-medium text-foreground-secondary">
            말하는 중...
          </span>
        </div>
      )}

      {isListening && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-green-50/90 px-3 py-1.5 shadow-lg backdrop-blur-sm">
          <Mic size={14} className="animate-pulse text-green-600" />
          <span className="text-xs font-medium text-green-700">
            듣는 중...
          </span>
        </div>
      )}

      {onInteract && (
        <button
          onClick={onInteract}
          className="absolute inset-0 z-20 bg-transparent"
          aria-label="AVA와 상호작용"
        />
      )}
    </div>
  );
}
