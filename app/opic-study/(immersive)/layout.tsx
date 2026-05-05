import type { ReactNode } from "react";

/**
 * 오픽 스터디 — Immersive 레이아웃
 *
 * 모의고사/스크립트의 (immersive) layout과 동일 구조 적용:
 * - bg-background (크림 톤)
 * - 모바일 body 스크롤 차단 (자체 스크롤 컨테이너 사용)
 * - h-dvh (모바일) / min-h-screen (PC)
 *
 * 내부 BP 디자인 시스템(.bp-scope)은 컴포넌트 레벨에서 격리 유지.
 * 헤더는 페이지에서 <ImmersiveHeader> 사용 (모듈 단위 표준).
 */
export default function OpicStudyImmersiveLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {/* 모바일: body 스크롤 차단 — 몰입형 레이아웃은 자체 스크롤 컨테이너 사용 */}
      <style>{`@media(max-width:767px){html,body{overflow:hidden;height:100dvh}}`}</style>
      <div className="flex h-dvh flex-col overflow-hidden bg-background md:h-auto md:min-h-screen md:overflow-visible">
        {children}
      </div>
    </>
  );
}
