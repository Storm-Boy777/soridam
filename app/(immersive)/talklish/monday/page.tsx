// Talklish · 월요일 — Podcast Stage 라우트
// layout.tsx에서 폰트 + 권한 게이트가 일원화되어 있다.
// DayShell이 day prop에 따라 PodcastStage를 직접 렌더 (함수 children 직렬화 금지 해소).

import { DayShell } from "@/components/study-group/talklish/day-shell";

export const metadata = {
  title: "Talklish · 월요일 (Podcast) | 소리담",
};

export default function MondayPage() {
  return <DayShell day="mon" />;
}
