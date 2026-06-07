"use server";

import { getScriptStats } from "./scripts";
import { getHistory, getActiveSession } from "./mock-exam";

export interface DashboardLearning {
  totalScripts: number;
  confirmedScripts: number;
  totalShadowings: number;
  mockExamCount: number;
  latestMockLevel: string | null;
  activeMock: { current_question: number } | null;
}

// 대시보드 학습 현황 — 기존 액션을 병렬로 묶어 1회 조회 (신규 집계 없음)
export async function getDashboardLearningStats(): Promise<DashboardLearning> {
  const [statsR, historyR, activeR] = await Promise.all([
    getScriptStats().catch(() => ({ data: undefined } as { data?: { totalScripts: number; confirmedScripts: number; totalShadowings: number } })),
    getHistory().catch(() => ({ data: undefined })),
    getActiveSession().catch(() => ({ data: undefined })),
  ]);

  const stats = statsR.data;
  const history = historyR.data ?? [];
  const completed = history.filter((h) => h.status === "completed");
  const latest = completed.find((h) => h.final_level);

  return {
    totalScripts: stats?.totalScripts ?? 0,
    confirmedScripts: stats?.confirmedScripts ?? 0,
    totalShadowings: stats?.totalShadowings ?? 0,
    mockExamCount: completed.length,
    latestMockLevel: latest?.final_level ?? null,
    activeMock: activeR.data ? { current_question: activeR.data.current_question } : null,
  };
}
