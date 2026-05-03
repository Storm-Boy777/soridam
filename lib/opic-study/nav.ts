/**
 * 오픽 스터디 — 네비게이션 헬퍼
 *
 * Step 컴포넌트들의 뒤로가기 공용 함수. useRouter hook을 함수마다
 * 호출하지 않기 위해 client-side window.location 사용.
 *
 * 단점: SPA 전환이 아니라 풀 리로드. 인터랙션 빈도 낮은 뒤로가기엔 충분.
 */

"use client";

export function goHome() {
  if (typeof window !== "undefined") {
    window.location.href = "/opic-study";
  }
}
