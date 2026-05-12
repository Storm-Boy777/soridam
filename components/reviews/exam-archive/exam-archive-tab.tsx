"use client";

// 기출 보관함 탭 — /reviews 새 탭 (접근 제어 + 기출 풀뷰 + 콤보 상세)
//
// 권한 흐름:
//   1. hasExamArchiveAccess가 false면 안내 화면 ("관리자에게 문의")
//   2. true면 ExamLibraryView 또는 ComboDetail 분기

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MailQuestion } from "lucide-react";
import { getQuestionTypeGuides } from "@/lib/actions/opic-study";
import type { QuestionTypeGuide, StudyCategory } from "@/lib/types/opic-study";
import { ExamLibraryView } from "./exam-library-view";
import { ComboDetail } from "./combo-detail";

interface Props {
  hasAccess: boolean;
}

type ViewState =
  | { kind: "list"; page: number }
  | { kind: "detail"; sig: string; category?: StudyCategory; topic?: string; backPage: number };

export function ExamArchiveTab({ hasAccess }: Props) {
  const [view, setView] = useState<ViewState>({ kind: "list", page: 1 });

  // 유형 가이드 마스터 (10 row) — 캐시 영구
  const { data: typeGuides = [] } = useQuery({
    queryKey: ["opic-question-type-guides"],
    queryFn: async () => {
      const res = await getQuestionTypeGuides();
      if (res.error) throw new Error(res.error);
      return res.data ?? [];
    },
    staleTime: Infinity,
    enabled: hasAccess,
  });

  const typeGuideMap = useMemo(
    () => new Map<string, QuestionTypeGuide>(typeGuides.map((g) => [g.type_id, g])),
    [typeGuides]
  );

  const handleChangePage = useCallback((p: number) => {
    setView({ kind: "list", page: p });
  }, []);

  const handleJumpToComboGuide = useCallback(
    (cat: StudyCategory, topic: string, sig: string) => {
      setView((prev) => ({
        kind: "detail",
        sig,
        category: cat,
        topic,
        backPage: prev.kind === "list" ? prev.page : 1,
      }));
    },
    []
  );

  const handleBack = useCallback(() => {
    setView((prev) =>
      prev.kind === "detail" ? { kind: "list", page: prev.backPage } : prev
    );
  }, []);

  if (!hasAccess) {
    return <AccessGate />;
  }

  if (view.kind === "detail") {
    return (
      <ComboDetail
        sig={view.sig}
        category={view.category}
        topic={view.topic}
        onBack={handleBack}
      />
    );
  }

  return (
    <ExamLibraryView
      page={view.page}
      typeGuideMap={typeGuideMap}
      onChangePage={handleChangePage}
      onJumpToComboGuide={handleJumpToComboGuide}
    />
  );
}

function AccessGate() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-border bg-surface px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
        <MailQuestion size={22} strokeWidth={1.8} />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-foreground">
          이용 권한이 없는 페이지예요
        </h3>
        <p className="text-sm leading-relaxed text-foreground-secondary">
          기출 보관함 탭은 별도의 접근 권한이 필요해요.
          <br className="hidden sm:inline" />
          이용을 원하시면 관리자에게 문의해 주세요.
        </p>
      </div>
      <a
        href="/support?tab=inquiry"
        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-sm font-bold text-white hover:bg-primary-600"
      >
        관리자에게 문의하기
      </a>
    </div>
  );
}
