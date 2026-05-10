"use client";

// 강의 목록 — Level별 그룹화 + 진도 표시

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PlayCircle, Clock, BookOpen, CheckCircle2 } from "lucide-react";
import { getLectures } from "@/lib/actions/lectures";
import { LEVEL_ORDER, type LectureListItem } from "@/lib/types/lectures";

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
}

function formatDurationShort(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}분`;
}

export function LecturesContent({
  initialLectures,
}: {
  initialLectures: LectureListItem[];
}) {
  const { data: lectures = [] } = useQuery({
    queryKey: ["lectures"],
    queryFn: getLectures,
    initialData: initialLectures,
    staleTime: 5 * 60 * 1000,
  });

  // Level별 그룹화
  const groupedLectures = useMemo(() => {
    return lectures.reduce(
      (acc, l) => {
        const lvl = l.level || "기타";
        if (!acc[lvl]) acc[lvl] = [];
        acc[lvl].push(l);
        return acc;
      },
      {} as Record<string, LectureListItem[]>
    );
  }, [lectures]);

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          OPIc AL 강의
        </h1>
        <p className="mt-2 text-sm text-foreground-secondary md:text-base">
          AL 취득하는 그날까지
        </p>
      </div>

      {/* Level별 그룹 */}
      <div className="space-y-8">
        {LEVEL_ORDER.map((levelName) => {
          const levelLectures = groupedLectures[levelName];
          if (!levelLectures || levelLectures.length === 0) return null;

          // lecture_id 기반 정렬 (코드: IH_001, IH_002 …)
          const sorted = [...levelLectures].sort((a, b) => {
            const aMatch = a.lecture_id.match(/(\d+)/);
            const bMatch = b.lecture_id.match(/(\d+)/);
            const aNum = aMatch ? parseInt(aMatch[1], 10) : 0;
            const bNum = bMatch ? parseInt(bMatch[1], 10) : 0;
            return aNum - bNum;
          });

          return (
            <section key={levelName}>
              <div className="mb-3 border-b border-border pb-2">
                <h2 className="text-base font-semibold text-primary-600 md:text-xl">
                  {levelName}
                </h2>
                <p className="mt-0.5 text-xs text-foreground-muted">
                  {sorted.length}개의 강의
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 xl:grid-cols-4">
                {sorted.map((l) => (
                  <Link
                    key={l.id}
                    href={`/lectures/${l.id}`}
                    className="group overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface transition-all hover:border-primary-500/50 hover:shadow-md"
                  >
                    {/* 썸네일 */}
                    <div className="relative aspect-video overflow-hidden bg-surface-secondary">
                      {l.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={l.thumbnail_url}
                          alt={l.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
                          <PlayCircle
                            size={40}
                            className="text-primary-400"
                          />
                        </div>
                      )}

                      {/* 호버 재생 오버레이 */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <PlayCircle size={40} className="text-white" />
                      </div>

                      {/* 시간 */}
                      <div className="absolute bottom-1.5 right-1.5">
                        <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm md:text-xs">
                          {formatDurationShort(l.duration)}
                        </span>
                      </div>

                      {/* 완료 표시 */}
                      {l.is_completed && (
                        <div className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 md:h-6 md:w-6">
                          <CheckCircle2 className="h-3 w-3 text-white md:h-4 md:w-4" />
                        </div>
                      )}
                    </div>

                    {/* 본문 */}
                    <div className="p-2.5 md:p-3">
                      <h3 className="line-clamp-2 text-[11px] font-medium leading-tight text-foreground transition-colors group-hover:text-primary-600 md:text-sm">
                        {l.title}
                      </h3>

                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-foreground-muted md:text-xs">
                        <span className="truncate">{l.instructor_name}</span>
                        <div className="ml-1 flex shrink-0 items-center gap-0.5">
                          <Clock size={10} />
                          <span>{formatDuration(l.duration)}</span>
                        </div>
                      </div>

                      {/* 진도율 */}
                      {l.progress_percentage > 0 && (
                        <div className="mt-2">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary">
                            <div
                              className="h-full rounded-full bg-primary-500 transition-all"
                              style={{
                                width: `${Math.min(100, l.progress_percentage)}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* 빈 상태 */}
      {lectures.length === 0 && (
        <div className="py-16 text-center">
          <BookOpen
            size={48}
            className="mx-auto mb-4 text-foreground-muted"
          />
          <h3 className="text-lg font-medium text-foreground-secondary">
            등록된 강의가 없습니다
          </h3>
          <p className="mt-2 text-sm text-foreground-muted">
            곧 새로운 강의가 추가될 예정입니다
          </p>
        </div>
      )}
    </div>
  );
}
