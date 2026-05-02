"use client";

/**
 * 오픽 스터디 홈 — 클라이언트 컴포넌트
 *
 * 서버 컴포넌트(page.tsx)에서 매핑한 데이터로 Home 디자인 컴포넌트 렌더.
 * - 활성 세션 있음: 합류 버튼 (lobby 또는 session 직접 진입)
 * - 활성 그룹 있지만 세션 없음: 새 세션 시작
 * - 활성 그룹 0개: 비멤버 안내 화면
 */

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Home } from "../_screens/EntryScreens";
import { createSession, getActiveSession } from "@/lib/actions/opic-study";

interface Props {
  user: {
    name: string;
    initial: string;
    todayLabel: string;
    nextSessionTime: string;
  };
  groups: Array<{
    id: string;
    name: string;
    meta: string;
    live: boolean;
  }>;
  hasGroups: boolean;
  hasActiveGroup: boolean;
  activeGroupId?: string;
  hasActiveSession: boolean;
  nextSessionMemberCount?: number;
  nextSessionMembers?: Array<{ key: "a" | "b" | "c" | "d"; initial: string }>;
}

export function OpicStudyHomeClient({
  user,
  groups,
  hasGroups,
  hasActiveGroup,
  activeGroupId,
  hasActiveSession,
  nextSessionMemberCount,
  nextSessionMembers,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // 비멤버 안내 (그룹 0개)
  if (!hasGroups) {
    return (
      <div
        className="bp-scope"
        style={{
          minHeight: "100dvh",
          width: "100%",
          maxWidth: 480,
          margin: "0 auto",
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          background: "var(--bp-bg)",
          color: "var(--bp-ink)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="bp-section-h">오픽 스터디</span>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.025em",
            }}
          >
            아직 등록된 그룹이 없어요
          </h1>
          <p
            className="t-sm ink-3"
            style={{ margin: 0, lineHeight: 1.6 }}
          >
            오픽 스터디는 관리자가 등록한 멤버만 참여할 수 있어요.
            다음 달 모집에 관심이 있으시면 운영자에게 문의해주세요.
          </p>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: "var(--bp-radius)",
            background: "var(--bp-surface)",
            boxShadow: "var(--bp-shadow-sm)",
          }}
        >
          <span className="bp-section-h" style={{ display: "block", marginBottom: 8 }}>
            스터디 운영 안내
          </span>
          <ul
            className="t-sm"
            style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: "var(--bp-ink-2)" }}
          >
            <li>한 달 단위 등급별 운영 (예: 5월 AL 스터디)</li>
            <li>실제 OPIc 기출 콤보 학습</li>
            <li>AI 스터디 코치가 멤버별 답변에 코칭</li>
            <li>완전 무료</li>
          </ul>
        </div>

        <div style={{ marginTop: "auto" }}>
          <a
            href="mailto:soridamhub@gmail.com?subject=오픽 스터디 참여 문의"
            className="bp-btn primary lg full"
            style={{ textDecoration: "none" }}
          >
            운영자에게 문의하기
          </a>
        </div>
      </div>
    );
  }

  // 입장 버튼
  // - 활성 세션 있음: 그 세션의 lobby로 이동
  // - 활성 세션 없음: 새 세션 생성 후 lobby로 이동
  const handleEnter = () => {
    if (!activeGroupId) return;

    startTransition(async () => {
      // 1. 활성 세션 먼저 확인
      const activeRes = await getActiveSession(activeGroupId);
      if (activeRes.data) {
        router.push(`/opic-study/lobby/${activeRes.data.id}`);
        return;
      }

      // 2. 없으면 새 세션 생성
      const createRes = await createSession(activeGroupId);
      if (createRes.error) {
        toast.error(createRes.error);
        return;
      }
      if (createRes.data?.session_id) {
        router.push(`/opic-study/lobby/${createRes.data.session_id}`);
      }
    });
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex" }}>
      <Home
        user={user}
        groups={groups}
        liveMode={true}
        showNextSession={hasActiveGroup}
        enterDisabled={!hasActiveGroup || pending}
        onEnter={handleEnter}
        onNewGroup={() => router.push("/opic-study/my")}
        nextSessionMemberCount={nextSessionMemberCount}
        nextSessionMembers={nextSessionMembers}
      />
    </div>
  );
  void hasActiveSession; // TODO: 추후 분기에 사용
}
