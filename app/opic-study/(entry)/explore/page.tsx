/**
 * 오픽 스터디 — 콤보 둘러보기 (Explore)
 *
 * 세션 룸 진입 없이 카테고리 → 토픽 → 콤보를 탐색하고,
 * 각 콤보의 질문/한 줄 요약/유형별 가이드를 학습할 수 있는 페이지.
 *
 * 사용 데이터 자산:
 *   - questions (471개 SSOT)
 *   - submission_combos (출제 빈도)
 *   - question_type_guides (10 row 한글 유형 가이드 — 056 마이그레이션)
 *
 * URL 쿼리스트링:
 *   /opic-study/explore                              → 카테고리 선택
 *   /opic-study/explore?cat=general                  → 토픽 그리드
 *   /opic-study/explore?cat=general&topic=음악        → 콤보 리스트
 *   /opic-study/explore?cat=general&topic=음악&combo=… → 콤보 상세 풀뷰
 */

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import {
  getMyActiveGroups,
  getMyClosedGroups,
  getCategoryStats,
  getQuestionTypeGuides,
} from "@/lib/actions/opic-study";
import { OpicStudyExploreClient } from "../../_pages/OpicStudyExploreClient";
import type { StudyCategory } from "@/lib/types/opic-study";

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    cat?: string;
    topic?: string;
    combo?: string;
  }>;
}

export default async function OpicStudyExplorePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await getUser();
  if (!user) redirect("/login?next=/opic-study/explore");

  // 그룹 컨텍스트 결정 (활성 → 종료 → 없음)
  const [activeRes, closedRes, statsRes, guidesRes] = await Promise.all([
    getMyActiveGroups(),
    getMyClosedGroups(),
    getCategoryStats(),
    getQuestionTypeGuides(),
  ]);

  const primaryGroup = activeRes.data?.[0] ?? closedRes.data?.[0];

  // 멤버 그룹 X → 홈으로 (오픽 스터디는 멤버 전용)
  if (!primaryGroup) {
    redirect("/opic-study?reason=not-member");
  }

  // 카테고리 검증 (URL 직조작 방어)
  const validCats: StudyCategory[] = ["general", "roleplay", "advance"];
  const initialCategory = validCats.includes(params.cat as StudyCategory)
    ? (params.cat as StudyCategory)
    : undefined;

  // 탭 / 페이지 검증
  const initialTab: "combos" | "exams" =
    params.tab === "exams" ? "exams" : "combos";
  const parsedPage = params.page ? parseInt(params.page, 10) : 1;
  const initialExamPage =
    Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  return (
    <OpicStudyExploreClient
      groupId={primaryGroup.id}
      groupName={primaryGroup.name}
      categoryStats={statsRes.data ?? []}
      typeGuides={guidesRes.data ?? []}
      initialCategory={initialCategory}
      initialTopic={params.topic ?? undefined}
      initialComboSig={params.combo ?? undefined}
      initialTab={initialTab}
      initialExamPage={initialExamPage}
    />
  );
}
