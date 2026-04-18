'use client'

import { useEffect, useState } from 'react'

export interface RevealBreakdownItem {
  label: string
  score: number
  maxScore: number
}

export interface RevealEntry {
  rank: number
  title: string
  score: number
  comment: string
  photoUrl?: string
  photoLabel?: string
  accent?: string
  breakdown?: RevealBreakdownItem[]
}

interface RankingRevealProps {
  title: string
  subtitle: string
  introMessage: string
  entries: RevealEntry[]
  summaryComment?: string | null
  onPhotoClick?: (index: number) => void
}

const RANK_ACCENTS: Record<number, string> = {
  1: 'from-amber-400 via-yellow-300 to-orange-400',
  2: 'from-slate-300 via-slate-200 to-zinc-300',
  3: 'from-orange-300 via-amber-200 to-orange-400',
}

export default function RankingReveal({
  title,
  subtitle,
  introMessage,
  entries,
  summaryComment,
  onPhotoClick,
}: RankingRevealProps) {
  const [started, setStarted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAll, setShowAll] = useState(false)

  const revealOrder = [...entries].sort((a, b) => b.rank - a.rank)
  const champion = entries.find((entry) => entry.rank === 1)
  const currentEntry = revealOrder[currentIndex]
  const isLast = currentIndex >= revealOrder.length - 1

  // 엔트리가 로드되면 이미지 프리로딩
  useEffect(() => {
    entries.forEach((entry) => {
      if (entry.photoUrl) {
        const img = new Image()
        img.src = entry.photoUrl
      }
    })
  }, [entries])

  const handleStart = () => {
    setStarted(true)
    setCurrentIndex(0)
    setShowAll(false)
  }

  const handleNext = () => {
    if (isLast) {
      setShowAll(true)
    } else {
      setCurrentIndex((i) => Math.min(i + 1, revealOrder.length - 1))
    }
  }

  const handlePrev = () => {
    setShowAll(false)
    setCurrentIndex((i) => Math.max(i - 1, 0))
  }

  const handleShowAll = () => {
    setShowAll(true)
  }

  const handleReset = () => {
    setStarted(false)
    setCurrentIndex(0)
    setShowAll(false)
  }

  // 시작 전 화면
  if (!started) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <section className="relative overflow-hidden rounded-[28px] border border-white/60 bg-white/80 p-8 sm:p-12 shadow-[0_30px_80px_rgba(147,51,234,0.18)] backdrop-blur-xl max-w-4xl w-full">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(244,114,182,0.22),_transparent_35%),radial-gradient(circle_at_left,_rgba(59,130,246,0.18),_transparent_32%)]" />
          <div className="relative text-center">
            <p className="mb-3 inline-flex items-center rounded-full bg-purple-100/80 px-4 py-1 text-xs font-semibold text-purple-700">
              GWP PHOTO CONTEST LIVE REVEAL
            </p>
            <h2 className="text-3xl font-black tracking-tight text-gray-900 sm:text-5xl">{title}</h2>
            <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-gray-600 sm:text-base">{subtitle}</p>
            <p className="mx-auto mt-4 max-w-2xl rounded-2xl bg-gray-950 px-5 py-4 text-sm font-semibold leading-6 text-white shadow-lg sm:text-base">
              {introMessage}
            </p>
            <div className="mt-3 text-sm text-gray-400">
              총 {revealOrder.length}개 파트
            </div>
            <button
              onClick={handleStart}
              className="mt-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-10 py-4 text-base font-bold text-white shadow-xl transition-transform hover:-translate-y-1 hover:shadow-2xl"
            >
              발표 시작
            </button>
          </div>
        </section>
      </div>
    )
  }

  // 전체 결과 보기
  if (showAll) {
    return (
      <div className="space-y-6 sm:space-y-8">
        {/* 컨트롤 바 */}
        <div className="sticky top-0 z-30 flex items-center justify-center gap-3 rounded-2xl bg-white/90 px-4 py-3 shadow-lg backdrop-blur-xl border border-white/60">
          <span className="text-sm font-bold text-purple-600">전체 결과</span>
          <button
            onClick={() => { setShowAll(false); setCurrentIndex(revealOrder.length - 1); }}
            className="rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50"
          >
            ← 1위로 돌아가기
          </button>
          <button
            onClick={handleReset}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            처음부터 다시
          </button>
        </div>

        {/* 챔피언 */}
        {champion && (
          <section className="overflow-hidden rounded-[32px] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-6 shadow-[0_30px_80px_rgba(251,191,36,0.18)] sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-500">Grand Champion</p>
                <h3 className="mt-3 text-3xl font-black text-gray-900 sm:text-5xl">{champion.title}</h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">{champion.comment}</p>
              </div>
              <div className="rounded-[28px] bg-white px-8 py-6 text-center shadow-lg">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">Final Score</p>
                <p className="mt-2 text-5xl font-black text-amber-500 sm:text-6xl">{champion.score}</p>
              </div>
            </div>
          </section>
        )}

        {/* 전체 순위 리스트 */}
        <section className="grid gap-4 sm:gap-5">
          {[...entries].sort((a, b) => a.rank - b.rank).map((entry) => {
            const accent = entry.accent || RANK_ACCENTS[entry.rank] || 'from-slate-500 to-slate-600'
            return (
              <article
                key={`${entry.rank}-${entry.title}`}
                className="overflow-hidden rounded-[28px] border border-white/60 bg-white/80 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl"
              >
                <div className={`bg-gradient-to-r ${accent} px-5 py-3 text-white sm:px-6`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-lg font-black">
                        {entry.rank}
                      </div>
                      <h3 className="text-base font-black sm:text-lg">{entry.title}</h3>
                    </div>
                    <p className="text-2xl font-black sm:text-3xl">{entry.score}</p>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-600">{entry.comment}</p>
                </div>
              </article>
            )
          })}
        </section>

        {/* AI 총평 */}
        {summaryComment && (
          <section className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-lg backdrop-blur-xl sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-400">AI 총평</p>
            <p className="mt-3 text-sm leading-7 text-gray-700 sm:text-base">{summaryComment}</p>
          </section>
        )}
      </div>
    )
  }

  // 한 파트씩 보여주기 (메인 뷰)
  const accent = currentEntry.accent || RANK_ACCENTS[currentEntry.rank] || 'from-slate-500 to-slate-600'

  return (
    <div className="space-y-4">
      {/* 현재 순위 카드 (풀 사이즈) */}
      <article className="overflow-hidden rounded-[28px] border border-white/60 bg-white/80 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl animate-[fadeIn_0.5s_ease-out]">
        {/* 순위 헤더 */}
        <div className={`bg-gradient-to-r ${accent} px-6 py-5 text-white sm:px-8`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl font-black sm:h-20 sm:w-20 sm:text-4xl">
                {currentEntry.rank}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/80">
                  {currentEntry.rank === 1 ? 'CHAMPION' : `RANK ${currentEntry.rank}`}
                </p>
                <h3 className="text-2xl font-black sm:text-3xl">{currentEntry.title}</h3>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/80">Total Score</p>
              <p className="text-4xl font-black sm:text-5xl">{currentEntry.score}</p>
            </div>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="grid gap-6 p-6 sm:grid-cols-[550px_minmax(0,1fr)] sm:items-center sm:gap-8 sm:p-8">
          <div>
            {currentEntry.photoUrl ? (
              <button
                type="button"
                onClick={() => {
                  const clickedIndex = entries.findIndex((item) => item.rank === currentEntry.rank)
                  if (clickedIndex >= 0) onPhotoClick?.(clickedIndex)
                }}
                className="overflow-hidden rounded-[24px] border border-white/50 bg-gray-100 shadow-sm transition-transform hover:scale-[1.01] w-full"
              >
                <img
                  src={currentEntry.photoUrl}
                  alt={currentEntry.photoLabel || currentEntry.title}
                  className="aspect-[4/3] w-full object-cover"
                />
              </button>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-[24px] border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
                대표 사진 없음
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* MC 코멘트 */}
            <div className="rounded-2xl bg-gray-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">MC COMMENT</p>
              <p className="mt-3 text-sm leading-7 text-gray-700 sm:text-base">{currentEntry.comment}</p>
            </div>

            {/* Breakdown */}
            {currentEntry.breakdown && currentEntry.breakdown.length > 0 && (
              <div className="rounded-3xl border border-white/70 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-400">Breakdown</p>
                <div className="mt-4 space-y-3">
                  {currentEntry.breakdown.map((item) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">{item.label}</span>
                        <span className="font-semibold text-gray-500">
                          {item.score} / {item.maxScore}
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-700"
                          style={{ width: `${Math.min(100, (item.score / item.maxScore) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </article>

      {/* 하단 컨트롤 바 */}
      <div className="sticky bottom-4 z-30 flex items-center justify-between rounded-2xl bg-white/90 px-4 py-3 shadow-lg backdrop-blur-xl border border-white/60">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400">
            {currentIndex + 1} / {revealOrder.length}
          </span>
          <span className="text-sm font-bold text-purple-600">
            {currentEntry.rank}위 공개 중
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            className="rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← 이전
          </button>
          <button
            onClick={handleNext}
            className="rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-2 text-xs font-semibold text-white shadow-md hover:-translate-y-0.5 transition-transform"
          >
            {isLast ? '전체 보기' : '다음 →'}
          </button>
          <button
            onClick={handleShowAll}
            className="rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50"
          >
            전체
          </button>
          <button
            onClick={handleReset}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50"
          >
            처음부터
          </button>
        </div>
      </div>
    </div>
  )
}
