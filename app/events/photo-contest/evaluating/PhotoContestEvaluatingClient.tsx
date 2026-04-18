'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { usePhotoContestStore } from '@/lib/stores/photoContestStore'
import {
  evaluateTheme,
  getActiveSession,
  getSessionSummary,
  getThemeRevealUrl,
  PHOTO_CONTEST_THEMES,
  type PhotoContestSessionSummary,
  type ThemeCode,
} from '@/lib/api/photo-contest'

type ThemeStatus = 'pending' | 'evaluating' | 'completed' | 'error'

const THEME_COLORS: Record<string, string> = {
  bamboo: '#059669',
  jump: '#2563eb',
  angel: '#ec4899',
  star: '#d97706',
  smart_city: '#334155',
}

export default function PhotoContestEvaluatingClient() {
  const { isAuthenticated, authenticate } = usePhotoContestStore()
  const [mounted, setMounted] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [activeSummary, setActiveSummary] = useState<PhotoContestSessionSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [themeStatuses, setThemeStatuses] = useState<Record<ThemeCode, ThemeStatus>>({
    bamboo: 'pending',
    jump: 'pending',
    angel: 'pending',
    star: 'pending',
    smart_city: 'pending',
  })
  const [isRunning, setIsRunning] = useState(false)
  const [allDone, setAllDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const activeSession = await getActiveSession()
      if (activeSession) {
        const summary = await getSessionSummary(activeSession.id)
        setActiveSummary(summary)
        // 이미 평가된 테마는 completed로 표시
        const statuses: Record<string, ThemeStatus> = {}
        for (const theme of PHOTO_CONTEST_THEMES) {
          statuses[theme.code] = summary.completedThemes.includes(theme.code) ? 'completed' : 'pending'
        }
        setThemeStatuses(statuses as Record<ThemeCode, ThemeStatus>)
        // 모두 완료 확인
        if (summary.completedThemes.length === PHOTO_CONTEST_THEMES.length) {
          setAllDone(true)
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '데이터를 불러오지 못했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    loadData()
  }, [isAuthenticated, loadData])

  const handleAuth = () => {
    if (authenticate(password)) { setPasswordError(false); return }
    setPasswordError(true)
  }

  const runSequentialEvaluation = async () => {
    if (!activeSummary || isRunning) return
    setIsRunning(true)
    setError(null)

    const themesToEvaluate = PHOTO_CONTEST_THEMES.filter(
      (theme) => themeStatuses[theme.code] !== 'completed'
    )

    for (const theme of themesToEvaluate) {
      setThemeStatuses((prev) => ({ ...prev, [theme.code]: 'evaluating' }))

      try {
        await evaluateTheme(activeSummary.session.id, theme.code)
        setThemeStatuses((prev) => ({ ...prev, [theme.code]: 'completed' }))
      } catch {
        setThemeStatuses((prev) => ({ ...prev, [theme.code]: 'error' }))
        setError(`${theme.shortTitle} 평가 중 오류가 발생했습니다`)
        setIsRunning(false)
        return
      }

      // 다음 테마 전 3초 대기 (마지막 테마 제외)
      if (theme !== themesToEvaluate[themesToEvaluate.length - 1]) {
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }
    }

    setIsRunning(false)
    setAllDone(true)
  }

  if (!mounted) return null

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-xl max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🔄</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">전체 평가</h1>
          <p className="text-gray-500 mb-6 text-sm">비밀번호가 필요합니다</p>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setPasswordError(false) }}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
            placeholder="비밀번호"
            className={`w-full px-4 py-3 rounded-xl border-2 text-center text-lg tracking-widest mb-4 outline-none transition-colors ${passwordError ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-purple-400 bg-white'}`}
            autoFocus
          />
          {passwordError && <p className="text-red-500 text-sm mb-4">비밀번호가 올바르지 않습니다</p>}
          <button onClick={handleAuth} className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold">입장하기</button>
        </div>
      </div>
    )
  }

  const completedCount = Object.values(themeStatuses).filter((s) => s === 'completed').length
  const progressPercent = (completedCount / PHOTO_CONTEST_THEMES.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100">
      <header className="sticky top-0 z-40 border-b border-white/50 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/events/photo-contest" className="text-gray-400 transition-colors hover:text-gray-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-purple-500">AI Evaluation</p>
              <h1 className="text-lg font-black text-gray-900 sm:text-2xl">전체 테마 AI 평가</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {isLoading ? (
          <div className="rounded-[28px] border border-white/60 bg-white/80 p-8 text-center text-sm text-gray-500 shadow-lg">데이터를 불러오는 중...</div>
        ) : !activeSummary ? (
          <div className="rounded-[32px] border border-dashed border-purple-200 bg-white/70 p-10 text-center shadow-sm">
            <h3 className="text-2xl font-black text-gray-900">진행 중인 사진 콘테스트가 없습니다</h3>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 진행 상태 카드 */}
            <div className="rounded-[32px] border border-white/60 bg-white/85 p-8 shadow-lg backdrop-blur-xl text-center">
              {allDone ? (
                <>
                  <div className="text-6xl mb-4">🎉</div>
                  <h2 className="text-2xl font-black text-gray-900">모든 테마 평가가 완료되었습니다!</h2>
                  <p className="mt-2 text-sm text-gray-600">이제 테마별 발표를 시작할 수 있습니다.</p>
                </>
              ) : isRunning ? (
                <>
                  <div className="text-6xl mb-4 animate-spin">⚙️</div>
                  <h2 className="text-2xl font-black text-gray-900">AI 평가 진행 중...</h2>
                  <p className="mt-2 text-sm text-gray-600">각 테마를 순차적으로 평가하고 있습니다. 잠시만 기다려 주세요.</p>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">🤖</div>
                  <h2 className="text-2xl font-black text-gray-900">전체 테마 AI 평가</h2>
                  <p className="mt-2 text-sm text-gray-600">대나무숲부터 SMART CITY까지 순차적으로 AI 평가를 진행합니다.</p>
                </>
              )}

              {/* 프로그레스바 */}
              <div className="mt-6 mx-auto max-w-md">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-2">
                  <span>진행률</span>
                  <span>{completedCount} / {PHOTO_CONTEST_THEMES.length} 완료</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-700" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>

            {/* 테마별 상태 목록 */}
            <div className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-lg backdrop-blur-xl">
              <div className="space-y-3">
                {PHOTO_CONTEST_THEMES.map((theme) => {
                  const status = themeStatuses[theme.code]
                  const color = THEME_COLORS[theme.code]
                  return (
                    <div
                      key={theme.code}
                      className="flex items-center justify-between rounded-2xl border px-5 py-4 transition-all"
                      style={{
                        borderColor: status === 'completed' ? color : status === 'evaluating' ? '#a855f7' : '#f3f4f6',
                        backgroundColor: status === 'completed' ? `${color}12` : status === 'evaluating' ? 'rgba(168, 85, 247, 0.08)' : '#f9fafb',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{theme.emoji}</span>
                        <div>
                          <span className="text-sm font-bold" style={{ color: status === 'completed' ? color : status === 'evaluating' ? '#7c3aed' : '#374151' }}>
                            {theme.shortTitle}
                          </span>
                          <p className="text-xs text-gray-400">{theme.mission.slice(0, 30)}...</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {status === 'completed' && activeSummary && (
                          <Link
                            href={getThemeRevealUrl(activeSummary.session.id, theme.code)}
                            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors"
                          >
                            발표 보기
                          </Link>
                        )}
                        <span
                          className="rounded-full px-3 py-1.5 text-xs font-bold"
                          style={
                            status === 'completed' ? { backgroundColor: color, color: '#fff' }
                            : status === 'evaluating' ? { backgroundColor: '#7c3aed', color: '#fff' }
                            : status === 'error' ? { backgroundColor: '#ef4444', color: '#fff' }
                            : { backgroundColor: '#e5e7eb', color: '#9ca3af' }
                          }
                        >
                          {status === 'completed' ? '✓ 완료' : status === 'evaluating' ? '⏳ 평가 중...' : status === 'error' ? '✕ 오류' : '대기'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 하단 액션 버튼 */}
            <div className="text-center space-y-3">
              {allDone ? (
                <Link
                  href={activeSummary ? getThemeRevealUrl(activeSummary.session.id, 'bamboo') : '#'}
                  className="inline-block rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-8 py-4 text-base font-bold text-white shadow-xl transition-transform hover:-translate-y-0.5"
                >
                  🎋 대나무숲부터 발표 시작
                </Link>
              ) : !isRunning ? (
                <button
                  onClick={runSequentialEvaluation}
                  className="rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-8 py-4 text-base font-bold text-white shadow-xl transition-transform hover:-translate-y-0.5"
                >
                  🚀 전체 평가 시작
                </button>
              ) : null}
              <div>
                <Link href="/events/photo-contest" className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">
                  ← 테마평가 탭으로 돌아가기
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
