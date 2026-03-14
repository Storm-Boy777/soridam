"use client";

import { FlaskConical } from "lucide-react";

// 체험판 상단 배너 — 체험판 모드일 때만 표시
export function TrialBanner() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-secondary-200 bg-secondary-50/50 px-4 py-2.5">
      <FlaskConical size={16} className="shrink-0 text-secondary-600" />
      <p className="text-sm font-medium text-foreground-secondary">
        <span className="font-semibold text-secondary-600">체험판</span>
        {" "}— 샘플 데이터로 체험 중입니다
      </p>
    </div>
  );
}
