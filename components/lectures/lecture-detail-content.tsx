"use client";

// 강의 상세 페이지
// 영상(HLS.js) + 사이드 재생목록 + 자료/요약 탭

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Users,
  PlayCircle,
  FileText,
  Download,
  Sparkles,
  FileQuestion,
  Loader2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase";
import { getLectureDetail } from "@/lib/actions/lectures";
import {
  LEVEL_ORDER,
  type LectureDetailData,
  type LectureMaterial,
} from "@/lib/types/lectures";

// HLS.js 무거우니 dynamic import
const VideoPlayer = dynamic(
  () => import("./video-player").then((m) => m.VideoPlayer),
  {
    loading: () => (
      <div className="flex aspect-video w-full items-center justify-center rounded-[var(--radius-xl)] bg-black text-sm text-white/60">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        비디오 플레이어 로딩 중…
      </div>
    ),
    ssr: false,
  }
);

const supabase = createClient();

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
}

function getFileTypeDisplay(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": "PDF",
    "application/msword": "Word",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "Word",
    "application/x-hwp": "HWP",
    "text/plain": "TXT",
    "application/zip": "ZIP",
  };
  return map[mimeType] || "File";
}

export function LectureDetailContent({
  initialData,
}: {
  initialData: LectureDetailData;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"summary" | "materials">("summary");

  const { data } = useQuery({
    queryKey: ["lecture-detail", initialData.lecture.id],
    queryFn: () => getLectureDetail(initialData.lecture.id),
    initialData,
    staleTime: 5 * 60 * 1000,
  });

  const detail: LectureDetailData = data ?? initialData;
  const { lecture, materials, allLectures } = detail;

  // level별 그룹화 + 현재 강의 인덱스
  const groupedLectures = useMemo(() => {
    return allLectures.reduce(
      (acc, l) => {
        const lvl = l.level || "기타";
        if (!acc[lvl]) acc[lvl] = [];
        acc[lvl].push(l);
        return acc;
      },
      {} as Record<string, typeof allLectures>
    );
  }, [allLectures]);

  const currentIndex = allLectures.findIndex((l) => l.id === lecture.id);
  const nextLecture =
    currentIndex >= 0 && currentIndex < allLectures.length - 1
      ? allLectures[currentIndex + 1]
      : null;

  // ── 자료 다운로드 ──
  const handleDownload = async (material: LectureMaterial) => {
    const t = toast.loading("다운로드 중…");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("로그인이 필요합니다", { id: t });
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/lecture-materials-download`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ materialId: material.id }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || "다운로드 실패", { id: t });
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = material.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("다운로드 완료", { id: t });
    } catch {
      toast.error("다운로드 중 오류가 발생했습니다", { id: t });
    }
  };

  return (
    <div className="relative h-0 flex-grow md:h-auto md:flex-grow-0">
      <div className="absolute inset-0 overflow-y-auto bg-background md:relative md:inset-auto md:overflow-visible">
        {/* 자체 헤더 */}
        <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border bg-background/95 px-3 backdrop-blur md:h-14 md:px-6">
          <Link
            href="/lectures"
            className="flex items-center gap-1 rounded-md p-1 text-foreground-secondary transition-colors hover:bg-surface-secondary hover:text-foreground"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">목록</span>
          </Link>
          <div className="min-w-0 flex-1 truncate text-sm font-medium text-foreground md:text-base">
            {lecture.title}
          </div>
        </header>

        {/* 비디오 + 사이드 재생목록 */}
        <div className="bg-foreground">
          <div className="mx-auto max-w-screen-2xl px-2 py-2 md:px-4 md:py-4">
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 lg:gap-4">
              {/* 비디오 (PC: 9칸) */}
              <div className="lg:col-span-9">
                <VideoPlayer
                  lectureId={lecture.id}
                  lectureTitle={lecture.title}
                />
              </div>

              {/* 사이드 재생목록 (PC: 3칸) */}
              <aside className="lg:col-span-3">
                <div className="flex flex-col overflow-hidden rounded-[var(--radius-xl)] bg-foreground-secondary/5 lg:max-h-[calc(56.25vw*0.75)]">
                  <div className="shrink-0 border-b border-white/10 p-2 md:p-3">
                    <h3 className="text-xs font-semibold leading-tight text-white md:text-sm">
                      재생 목록
                    </h3>
                    <p className="mt-0.5 text-[10px] leading-tight text-white/50 md:text-xs">
                      {allLectures.length}개 강의
                    </p>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {(() => {
                      let globalIndex = 0;
                      return LEVEL_ORDER.map((levelName) => {
                        const items = groupedLectures[levelName];
                        if (!items || items.length === 0) return null;

                        return (
                          <div key={levelName}>
                            <div className="sticky top-0 z-10 bg-foreground/90 px-2 py-1 backdrop-blur md:px-3">
                              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-primary-400 md:text-xs">
                                {levelName}
                              </h4>
                            </div>
                            {items.map((it) => {
                              const idx = ++globalIndex;
                              const isCurrent = it.id === lecture.id;
                              return (
                                <button
                                  key={it.id}
                                  onClick={() => router.push(`/lectures/${it.id}`)}
                                  className={`flex min-h-[44px] w-full items-center gap-1.5 px-1.5 py-1.5 text-left transition-colors hover:bg-white/5 md:min-h-[48px] md:gap-2 md:px-2 md:py-2 ${
                                    isCurrent
                                      ? "border-l-2 border-primary-500 bg-white/5"
                                      : ""
                                  }`}
                                >
                                  <div className="flex w-4 shrink-0 items-center justify-center md:w-6">
                                    {isCurrent ? (
                                      <PlayCircle
                                        size={14}
                                        className="fill-current text-primary-400 md:h-5 md:w-5"
                                      />
                                    ) : (
                                      <span className="text-[9px] text-white/40 md:text-xs">
                                        {String(idx).padStart(2, "0")}
                                      </span>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4
                                      className={`truncate text-[11px] leading-tight md:text-sm ${
                                        isCurrent
                                          ? "font-medium text-white"
                                          : "text-white/80"
                                      }`}
                                    >
                                      {it.title}
                                    </h4>
                                    <p className="mt-0.5 text-[9px] leading-tight text-white/40 md:text-xs">
                                      {formatDuration(it.duration)}
                                      {it.is_completed && " · 완료"}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        );
                      }).filter(Boolean);
                    })()}
                  </div>

                  {nextLecture && (
                    <div className="shrink-0 border-t border-white/10 p-1.5 md:p-2">
                      <button
                        onClick={() =>
                          router.push(`/lectures/${nextLecture.id}`)
                        }
                        className="flex min-h-[40px] w-full items-center justify-center gap-1 rounded-lg bg-primary-500 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-primary-600 md:text-sm"
                      >
                        <span>다음 강의</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </div>

        {/* 강의 정보 + 자료/요약 탭 */}
        <div className="mx-auto max-w-screen-2xl space-y-4 px-3 py-4 md:px-6 md:py-8">
          {/* 강의 메타 카드 */}
          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface p-4 md:p-6">
            {lecture.level && (
              <div className="mb-2 inline-block rounded-lg bg-primary-50 px-2 py-0.5 md:mb-3 md:px-3 md:py-1">
                <span className="text-[11px] font-semibold leading-tight text-primary-600 md:text-sm">
                  {lecture.level}
                </span>
              </div>
            )}

            <h1 className="mb-2 break-words text-base font-bold leading-tight text-foreground md:mb-4 md:text-2xl">
              {lecture.title}
            </h1>

            {lecture.description && (
              <p className="mb-3 break-words text-xs leading-relaxed text-foreground-secondary md:mb-6 md:text-base">
                {lecture.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 md:gap-4">
              <div className="rounded-lg bg-surface-secondary p-2 md:p-3">
                <div className="mb-0.5 flex items-center gap-1 text-primary-600 md:mb-1 md:gap-2">
                  <Clock size={14} />
                  <span className="text-[10px] leading-tight md:text-xs">
                    총 시간
                  </span>
                </div>
                <p className="text-xs font-semibold leading-tight text-foreground md:text-base">
                  {formatDuration(lecture.duration)}
                </p>
              </div>
              <div className="rounded-lg bg-surface-secondary p-2 md:p-3">
                <div className="mb-0.5 flex items-center gap-1 text-primary-600 md:mb-1 md:gap-2">
                  <Users size={14} />
                  <span className="text-[10px] leading-tight md:text-xs">
                    강사
                  </span>
                </div>
                <p className="text-xs font-semibold leading-tight text-foreground md:text-base">
                  {lecture.instructor_name || "—"}
                </p>
              </div>
            </div>
          </div>

          {/* 자료 / 요약 탭 */}
          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface p-4 md:p-6">
            <div className="mb-4 flex items-end gap-2 border-b border-border">
              <button
                onClick={() => setActiveTab("summary")}
                className={`px-3 py-2 text-xs font-medium transition-colors md:px-4 md:text-sm ${
                  activeTab === "summary"
                    ? "-mb-px border-b-2 border-primary-500 text-primary-600"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                <Sparkles size={14} className="mr-1 inline" />
                강의요약
              </button>
              <button
                onClick={() => setActiveTab("materials")}
                className={`px-3 py-2 text-xs font-medium transition-colors md:px-4 md:text-sm ${
                  activeTab === "materials"
                    ? "-mb-px border-b-2 border-primary-500 text-primary-600"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                <FileText size={14} className="mr-1 inline" />
                자료
              </button>

              {activeTab === "summary" && lecture.summary_markdown && (
                <button
                  onClick={() => window.print()}
                  className="ml-auto mb-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary print:hidden"
                >
                  프린트
                </button>
              )}
            </div>

            {activeTab === "summary" && (
              <div className="prose prose-sm max-w-none md:prose-base">
                {lecture.summary_markdown ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ ...p }) => (
                        <h1
                          className="mb-3 mt-0 text-base font-bold leading-tight text-foreground md:mb-6 md:text-2xl"
                          {...p}
                        />
                      ),
                      h2: ({ ...p }) => (
                        <h2
                          className="mb-2 mt-5 text-sm font-bold leading-tight text-primary-600 md:mb-4 md:mt-10 md:text-xl"
                          {...p}
                        />
                      ),
                      h3: ({ ...p }) => (
                        <h3
                          className="mb-1.5 mt-4 text-sm font-semibold leading-tight text-foreground md:mb-3 md:mt-8 md:text-lg"
                          {...p}
                        />
                      ),
                      h4: ({ ...p }) => (
                        <h4
                          className="mb-1.5 mt-3 text-xs font-semibold leading-tight text-foreground-secondary md:mb-3 md:mt-6 md:text-base"
                          {...p}
                        />
                      ),
                      p: ({ ...p }) => (
                        <p
                          className="my-2 text-xs leading-relaxed text-foreground md:my-4 md:text-base"
                          {...p}
                        />
                      ),
                      ul: ({ ...p }) => (
                        <ul
                          className="my-2 ml-3 space-y-1 text-xs text-foreground md:my-4 md:ml-6 md:space-y-2 md:text-base"
                          {...p}
                        />
                      ),
                      ol: ({ ...p }) => (
                        <ol
                          className="my-2 ml-4 list-decimal list-outside space-y-1 text-xs text-foreground md:my-4 md:ml-6 md:space-y-2 md:text-base"
                          {...p}
                        />
                      ),
                      li: ({ ...p }) => (
                        <li
                          className="leading-relaxed text-foreground"
                          {...p}
                        />
                      ),
                      blockquote: ({ ...p }) => (
                        <blockquote
                          className="my-2 border-l-2 border-primary-500 pl-2 text-xs italic leading-relaxed text-foreground-secondary md:my-5 md:border-l-4 md:pl-5 md:text-base"
                          {...p}
                        />
                      ),
                      code: (props) => {
                        const { inline, className, ...rest } =
                          props as { inline?: boolean; className?: string } & React.HTMLAttributes<HTMLElement>;
                        return inline ? (
                          <code
                            className={`inline rounded bg-surface-secondary px-1 py-0 align-middle text-[10px] text-primary-700 md:px-2 md:py-0.5 md:text-base ${className || ""}`}
                            {...rest}
                          />
                        ) : (
                          <code
                            className={`block overflow-x-auto rounded border border-border bg-surface-secondary p-2 leading-relaxed text-foreground-secondary md:p-4 ${className || ""}`}
                            {...rest}
                          />
                        );
                      },
                      table: ({ ...p }) => (
                        <div className="my-2 overflow-x-auto md:my-5">
                          <table
                            className="min-w-full border border-border text-[10px] md:text-base"
                            {...p}
                          />
                        </div>
                      ),
                      thead: ({ ...p }) => (
                        <thead className="bg-surface-secondary" {...p} />
                      ),
                      th: ({ ...p }) => (
                        <th
                          className="border border-border px-2 py-1.5 text-left text-[10px] font-semibold text-primary-700 md:px-4 md:py-3 md:text-base"
                          {...p}
                        />
                      ),
                      td: ({ ...p }) => (
                        <td
                          className="border border-border px-2 py-1.5 text-[10px] text-foreground md:px-4 md:py-3 md:text-base"
                          {...p}
                        />
                      ),
                      a: ({ ...p }) => (
                        <a
                          className="text-primary-600 underline hover:text-primary-700"
                          {...p}
                        />
                      ),
                      strong: ({ ...p }) => (
                        <strong className="font-bold text-foreground" {...p} />
                      ),
                    }}
                  >
                    {lecture.summary_markdown}
                  </ReactMarkdown>
                ) : (
                  <div className="py-8 text-center md:py-12">
                    <FileQuestion
                      size={40}
                      className="mx-auto mb-3 text-foreground-muted md:mb-4"
                    />
                    <p className="text-sm text-foreground-secondary md:text-base">
                      아직 강의 요약이 준비되지 않았습니다
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "materials" && (
              <div>
                <div className="space-y-2 md:space-y-3">
                  {materials.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-xs text-foreground-muted md:text-sm">
                        등록된 자료가 없습니다
                      </p>
                    </div>
                  ) : (
                    materials.map((m) => {
                      const sizeMB = (m.file_size / (1024 * 1024)).toFixed(2);
                      const typeDisplay = getFileTypeDisplay(m.file_type);
                      return (
                        <div
                          key={m.id}
                          className="rounded-lg border border-border bg-surface-secondary/40 p-2.5 transition-colors hover:border-primary-500/50 md:p-4"
                        >
                          <div className="flex items-start gap-2 md:gap-3">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-50 md:h-10 md:w-10">
                              <FileText size={14} className="text-primary-600 md:h-5 md:w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="mb-0.5 truncate text-[11px] font-medium text-foreground md:text-sm">
                                {m.file_name}
                              </h3>
                              {m.description && (
                                <p className="mb-0.5 text-[9px] text-foreground-secondary md:text-xs">
                                  {m.description}
                                </p>
                              )}
                              <p className="mb-1.5 text-[9px] text-foreground-muted md:text-xs">
                                {typeDisplay} · {sizeMB}MB
                                {m.download_count > 0 &&
                                  ` · 다운로드 ${m.download_count}회`}
                              </p>
                              <button
                                onClick={() => handleDownload(m)}
                                className="flex items-center gap-1 text-[10px] font-medium text-primary-600 hover:text-primary-700 md:text-sm"
                              >
                                <Download size={12} />
                                다운로드
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {materials.length > 1 && (
                  <button
                    onClick={() => {
                      materials.forEach((m, idx) =>
                        setTimeout(() => handleDownload(m), idx * 500)
                      );
                      toast.success("모든 자료 다운로드를 시작합니다");
                    }}
                    className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-primary-500 py-2.5 text-[11px] font-medium text-white transition-colors hover:bg-primary-600 md:mt-6 md:py-3 md:text-base"
                  >
                    <Download size={14} />
                    모든 자료 다운로드 ({materials.length}개)
                  </button>
                )}

                <p className="mt-2 text-center text-[9px] text-foreground-muted md:mt-4 md:text-xs">
                  * 수업 자료는 개인 학습 용도로만 사용해주세요
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
