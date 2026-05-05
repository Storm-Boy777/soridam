import type { ReactNode } from "react";

/**
 * 오픽 스터디 — Immersive 레이아웃 (App Shell 패턴)
 *
 * 사용자 결정: 오픽 스터디는 다음 단계 진행을 무조건 수동으로 해야 하니
 * 헤더/푸터 항상 보이고 본문만 자체 스크롤 (Slack/Notion/Linear 등 앱 컨텍스트 패턴).
 *
 * - bg-background (크림 톤)
 * - body 스크롤 차단 (모바일/PC 모두) → 콘텐츠가 길면 본문 영역만 자체 스크롤
 * - h-dvh (모바일/PC 모두 풀 화면)
 *
 * 내부 BP 디자인 시스템(.bp-scope)은 컴포넌트 레벨에서 격리 유지.
 * 헤더는 페이지에서 <ImmersiveHeader> 사용 (sticky top).
 * 푸터(액션)는 .bp-pc-actions sticky bottom (콘텐츠 영역 안에서 sticky).
 */
export default function OpicStudyImmersiveLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {/* body 스크롤 차단 (모바일/PC 모두) — App Shell 풀 화면 */}
      <style>{`html,body{overflow:hidden;height:100dvh}`}</style>
      <div className="flex h-dvh flex-col overflow-hidden bg-background">
        {children}
      </div>
    </>
  );
}
