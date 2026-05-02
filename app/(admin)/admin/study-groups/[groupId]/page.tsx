/**
 * 관리자 — 오픽 스터디 그룹 상세
 *
 * - 그룹 메타 + 통계
 * - 멤버 관리 (추가/제거)
 * - 세션 이력
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudyGroupDetail } from "@/lib/actions/admin/study-groups";
import { ArrowLeft } from "lucide-react";
import { GroupDetailClient } from "./_client";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function AdminStudyGroupDetailPage({ params }: PageProps) {
  const { groupId } = await params;

  const result = await getStudyGroupDetail(groupId);
  if (result.error || !result.data) notFound();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Link
        href="/admin/study-groups"
        className="mb-4 inline-flex items-center gap-1 text-sm text-foreground-secondary hover:text-foreground"
      >
        <ArrowLeft size={14} /> 그룹 목록
      </Link>

      <GroupDetailClient detail={result.data} />
    </div>
  );
}
