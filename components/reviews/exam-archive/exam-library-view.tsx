"use client";

// 기출 보관함 — 기출 1건 풀뷰 (자기소개 + 4콤보) + 페이지네이션

import { useQuery } from "@tanstack/react-query";
import { Award, Loader2 } from "lucide-react";
import { getApprovedExamPool } from "@/lib/actions/opic-study";
import type { QuestionTypeGuide, StudyCategory } from "@/lib/types/opic-study";
import { ExamComboBlock } from "./exam-combo-block";
import { ExamPagination } from "./exam-pagination";

interface Props {
  page: number;
  typeGuideMap: Map<string, QuestionTypeGuide>;
  onChangePage: (page: number) => void;
  onJumpToComboGuide: (cat: StudyCategory, topic: string, sig: string) => void;
}

export function ExamLibraryView({
  page,
  typeGuideMap,
  onChangePage,
  onJumpToComboGuide,
}: Props) {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["exam-archive", page],
    queryFn: async () => {
      const res = await getApprovedExamPool({ page });
      if (res.error) throw new Error(res.error);
      return res.data ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-foreground-secondary">
        <Loader2 size={16} className="animate-spin" />
        기출을 불러오는 중...
      </div>
    );
  }

  if (!data || !data.exam) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface px-6 py-16 text-center text-sm text-foreground-secondary">
        {data?.total === 0
          ? "아직 등록된 승인 기출이 없어요"
          : "이 페이지에 해당하는 기출이 없어요"}
      </div>
    );
  }

  const { exam, total } = data;

  return (
    <div className="flex flex-col gap-3.5">
      {/* 기출 메타 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-secondary sm:text-sm">
          {exam.achieved_level && (
            <span className="inline-flex items-center gap-1">
              <Award size={13} className="text-foreground-muted" />
              <span className="font-bold text-primary-600">{exam.achieved_level}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold tabular-nums text-foreground-muted">
          <span>
            <span className="text-foreground-secondary">{page}</span>
            <span className="mx-0.5">/</span>
            <span>{total} 기출</span>
          </span>
          {isFetching && <span className="text-foreground-muted">· 불러오는 중...</span>}
        </div>
      </div>

      {/* 콤보 블록들 */}
      {exam.combos.map((combo) => (
        <ExamComboBlock
          key={combo.combo_type}
          combo={combo}
          typeGuideMap={typeGuideMap}
          onJumpToComboGuide={onJumpToComboGuide}
        />
      ))}

      {/* 페이지네이션 */}
      <ExamPagination
        currentPage={page}
        totalPages={total}
        onChangePage={onChangePage}
      />
    </div>
  );
}
