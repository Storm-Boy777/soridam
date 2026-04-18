'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PhotoLightbox from '@/components/photo-contest/PhotoLightbox'
import RankingReveal, { type RevealEntry } from '@/components/photo-contest/RankingReveal'
import { usePhotoContestStore } from '@/lib/stores/photoContestStore'
import {
  getOverallResults,
  getSessionById,
  getThemeResults,
  getThemeRevealUrl,
  listAllThemeSubmissions,
  listThemeSubmissions,
  PHOTO_CONTEST_THEME_MAP,
  PHOTO_CONTEST_THEMES,
  type PhotoContestOverallResult,
  type PhotoContestSession,
  type PhotoContestThemeResult,
  type PhotoContestThemeSubmission,
  type ThemeCode,
} from '@/lib/api/photo-contest'

interface PhotoContestRevealClientProps {
  sessionId: string
}

export default function PhotoContestRevealClient({ sessionId }: PhotoContestRevealClientProps) {
  const searchParams = useSearchParams()
  const view = searchParams.get('view') === 'theme' ? 'theme' : 'overall'
  const themeCode = searchParams.get('theme')
  const validThemeCode = themeCode && themeCode in PHOTO_CONTEST_THEME_MAP ? (themeCode as ThemeCode) : null
  const { isAuthenticated, authenticate, logout } = usePhotoContestStore()
  const [mounted, setMounted] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [session, setSession] = useState<PhotoContestSession | null>(null)
  const [themeResults, setThemeResults] = useState<PhotoContestThemeResult[]>([])
  const [overallResults, setOverallResults] = useState<PhotoContestOverallResult[]>([])
  const [submissions, setSubmissions] = useState<PhotoContestThemeSubmission[]>([])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadReveal = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const sessionData = await getSessionById(sessionId)
      if (!sessionData) {
        throw new Error('세션을 찾을 수 없습니다')
      }

      setSession(sessionData)

      if (view === 'theme' && validThemeCode) {
        const [results, themeSubmissions] = await Promise.all([
          getThemeResults(sessionId, validThemeCode),
          listThemeSubmissions(sessionId, validThemeCode),
        ])
        setThemeResults(results)
        setOverallResults([])
        setSubmissions(themeSubmissions)
      } else {
        const [results, allSubmissions] = await Promise.all([
          getOverallResults(sessionId),
          listAllThemeSubmissions(sessionId),
        ])
        setOverallResults(results)
        setThemeResults([])
        setSubmissions(allSubmissions)
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '발표 데이터를 불러오지 못했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, validThemeCode, view])

  useEffect(() => {
    if (!isAuthenticated) return
    loadReveal()
  }, [isAuthenticated, loadReveal])

  const handleAuth = () => {
    if (authenticate(password)) {
      setPasswordError(false)
      return
    }
    setPasswordError(true)
  }

  if (!mounted) return null

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-xl max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">발표 화면</h1>
          <p className="text-gray-500 mb-6 text-sm">스마트홀 발표 모드에 입장하려면 비밀번호가 필요합니다</p>
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setPasswordError(false)
            }}
            onKeyDown={(event) => event.key === 'Enter' && handleAuth()}
            placeholder="비밀번호"
            className={`w-full px-4 py-3 rounded-xl border-2 text-center text-lg tracking-widest mb-4 outline-none transition-colors ${
              passwordError ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-purple-400 bg-white'
            }`}
            autoFocus
          />
          {passwordError && <p className="text-red-500 text-sm mb-4">비밀번호가 올바르지 않습니다</p>}
          <button
            onClick={handleAuth}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            입장하기
          </button>
        </div>
      </div>
    )
  }

  const revealEntries: RevealEntry[] =
    view === 'theme' && validThemeCode
      ? themeResults.map((result) => {
          const theme = PHOTO_CONTEST_THEME_MAP[validThemeCode]
          const submission = submissions.find((item) => item.part_number === result.part_number)

          return {
            rank: result.theme_rank,
            title: result.part_name,
            score: result.theme_score_total,
            comment: result.theme_comment,
            photoUrl: submission?.photo_url,
            photoLabel: `${result.part_name} - ${theme.title}`,
            breakdown: theme.criteria.map((criterion) => ({
              label: criterion.label,
              score: result.theme_scores?.[criterion.key] || 0,
              maxScore: criterion.maxScore,
            })),
          }
        })
      : overallResults.map((result) => {
          const submission = submissions.find(
            (item) =>
              item.part_number === result.part_number &&
              item.theme_code === result.representative_theme_code
          )

          return {
            rank: result.overall_rank,
            title: result.part_name,
            score: result.overall_total_score,
            comment: result.overall_comment,
            photoUrl: submission?.photo_url,
            photoLabel: `${result.part_name} 대표 이미지`,
            breakdown: result.theme_breakdown.map((item) => ({
              label: PHOTO_CONTEST_THEME_MAP[item.theme_code]?.shortTitle || item.theme_code,
              score: item.score,
              maxScore: 100,
            })),
          }
        })

  const lightboxPhotos = revealEntries
    .filter((entry) => entry.photoUrl)
    .map((entry) => ({
      url: entry.photoUrl!,
      label: `${entry.rank}위 - ${entry.title} (${entry.score}점)`,
    }))

  const handlePhotoClick = (index: number) => {
    const clickedEntry = revealEntries[index]
    if (!clickedEntry?.photoUrl) return

    const photoIndex = revealEntries
      .filter((entry) => entry.photoUrl)
      .findIndex((entry) => entry.rank === clickedEntry.rank)

    if (photoIndex >= 0) {
      setLightboxIndex(photoIndex)
    }
  }

  const title =
    view === 'theme' && validThemeCode
      ? `${PHOTO_CONTEST_THEME_MAP[validThemeCode].title} 결과 발표`
      : '공정기술그룹 GWP 종합 결과 발표'

  const subtitle =
    view === 'theme' && validThemeCode
      ? `${PHOTO_CONTEST_THEME_MAP[validThemeCode].shortTitle} 미션에서 8개 파트가 어떤 순위로 평가되었는지 공개합니다.`
      : '5개 테마를 모두 합산한 최종 챔피언 발표입니다. 8위부터 순차 공개하며 현장의 긴장감을 끌어올립니다.'

  const introMessage =
    view === 'theme' && validThemeCode
      ? `${PHOTO_CONTEST_THEME_MAP[validThemeCode].shortTitle} 미션 결과를 지금부터 8위부터 공개하겠습니다.`
      : '오늘의 GWP 대망의 1위 파트를 확인해 보겠습니다.'

  const summaryComment =
    view === 'theme' && validThemeCode
      ? session?.theme_overall_comments?.[validThemeCode] || null
      : session?.overall_summary_comment || null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/events/photo-contest" className="text-white/50 transition-colors hover:text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-300">Smart Hall Mode</p>
              <h1 className="text-lg font-black text-white sm:text-2xl">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 테마 발표 시 이전/다음 테마 네비게이션 */}
            {view === 'theme' && validThemeCode && (() => {
              const themeCodes = PHOTO_CONTEST_THEMES.map(t => t.code)
              const currentIdx = themeCodes.indexOf(validThemeCode)
              const prevTheme = currentIdx > 0 ? themeCodes[currentIdx - 1] : null
              const nextTheme = currentIdx < themeCodes.length - 1 ? themeCodes[currentIdx + 1] : null
              return (
                <>
                  {prevTheme ? (
                    <a href={getThemeRevealUrl(sessionId, prevTheme)} className="rounded-full border border-purple-400/30 bg-purple-500/20 px-4 py-2 text-sm font-semibold text-purple-200 transition-colors hover:bg-purple-500/30">
                      ← {PHOTO_CONTEST_THEME_MAP[prevTheme].shortTitle}
                    </a>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/30 cursor-not-allowed">
                      ← 이전
                    </span>
                  )}
                  {nextTheme ? (
                    <a href={getThemeRevealUrl(sessionId, nextTheme)} className="rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5">
                      {PHOTO_CONTEST_THEME_MAP[nextTheme].shortTitle} →
                    </a>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/30 cursor-not-allowed">
                      다음 →
                    </span>
                  )}
                </>
              )
            })()}
            <a
              href="/events/photo-contest"
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/15"
            >
              나가기
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
            발표 데이터를 불러오는 중입니다...
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-amber-400/30 bg-amber-400/10 p-8 text-center text-sm leading-7 text-amber-50">
            현재 발표 데이터를 바로 불러올 수 없습니다.
            <br />
            DB 스키마와 결과 데이터 준비 상태를 확인한 뒤 다시 시도해주세요.
          </div>
        ) : revealEntries.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
            아직 발표할 결과가 없습니다.
          </div>
        ) : (
          <RankingReveal
            title={title}
            subtitle={subtitle}
            introMessage={introMessage}
            entries={revealEntries}
            summaryComment={summaryComment}
            onPhotoClick={handlePhotoClick}
          />
        )}
      </main>

      {lightboxIndex !== null && lightboxPhotos.length > 0 && (
        <PhotoLightbox
          photos={lightboxPhotos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  )
}
