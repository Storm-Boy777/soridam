"use client";

/**
 * 오픽 스터디 학습 기록 — 클라이언트 wrapper
 */

import { MemberHistory } from "../_components/MemberHistory";

interface SessionDisplay {
  id: string;
  dateLabel: string;
  topic: string;
  category: string | null;
  totalAnswers: number;
  totalSkips: number;
  totalQuestions: number;
  participantCount: number;
  memberCount: number;
  status: string;
  memberHighlights?: Array<{
    user_id: string;
    name: string;
    initial: string;
    color: "a" | "b" | "c" | "d";
    strength: string | null;
    improvement: string | null;
  }>;
  endedAtIso?: string;
  startedAtIso?: string;
}

interface Props {
  groups: Array<{ id: string; name: string }>;
  sessions: SessionDisplay[];
  selectedGroupId: string;
}

export function OpicStudyHistoryClient(props: Props) {
  return <MemberHistory {...props} />;
}
