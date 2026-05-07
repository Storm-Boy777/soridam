/**
 * 오픽 스터디 — 학습 기록 상세
 *
 * 완료된 세션을 라이브 룸이 아닌 읽기 전용 기록으로 보여준다.
 */

import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getSessionHistoryDetail } from "@/lib/actions/opic-study";
import { MemberHistoryDetail } from "../../../_components/MemberHistoryDetail";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function OpicStudyHistoryDetailPage({ params }: PageProps) {
  const { sessionId } = await params;
  const user = await getUser();
  if (!user) redirect(`/login?next=/opic-study/history/${sessionId}`);

  const res = await getSessionHistoryDetail(sessionId);
  if (res.error || !res.data) notFound();

  return <MemberHistoryDetail detail={res.data} />;
}
