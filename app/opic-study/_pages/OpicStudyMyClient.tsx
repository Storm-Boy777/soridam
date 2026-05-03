"use client";

/**
 * 오픽 스터디 마이페이지 — 클라이언트 wrapper
 */

import { MemberMy } from "../_components/MemberMy";

interface Props {
  userName: string;
  userInitial: string;
  groupLabel: string;
  historyItems: Array<{ name: string; date: string; done: boolean }>;
}

export function OpicStudyMyClient(props: Props) {
  return <MemberMy {...props} />;
}
