"use client";

/**
 * 오픽 스터디 마이페이지 — 클라이언트 wrapper
 */

import { MemberMy } from "../_components/MemberMy";
import type { MyStudySummary, StudyGroupStatus } from "@/lib/types/opic-study";

interface Props {
  userName: string;
  userInitial: string;
  targetGrade: string;
  group: {
    id: string;
    name: string;
    status: StudyGroupStatus;
    startDate: string;
    endDate: string;
  } | null;
  summary: MyStudySummary;
}

export function OpicStudyMyClient(props: Props) {
  return <MemberMy {...props} />;
}
