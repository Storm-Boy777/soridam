'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePhotoContestStore } from '@/lib/stores/photoContestStore'
import {
  evaluateOverall,
  getActiveSession,
  getOverallRevealUrl,
  getSessionSummary,
  PHOTO_CONTEST_THEMES,
  type PhotoContestSessionSummary,
} from '@/lib/api/photo-contest'

const THEME_COLORS: Record<string, { themeColor: string; softColor: string }> = {
  bamboo: { themeColor: '#059669', softColor: 'rgba(5, 150, 105, 0.12)' },
  jump: { themeColor: '#2563eb', softColor: 'rgba(37, 99, 235, 0.12)' },
  angel: { themeColor: '#ec4899', softColor: 'rgba(236, 72, 153, 0.12)' },
  star: { themeColor: '#d97706', softColor: 'rgba(217, 119, 6, 0.12)' },
  smart_city: { themeColor: '#334155', softColor: 'rgba(51, 65, 85, 0.12)' },
}

export default function PhotoContestOverallClient() {
  const { isAuthenticated, authenticate } = usePhotoContestStore()
  const [mounted, setMounted] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [activeSummary, setActiveSummary] = useState<PhotoContestSessionSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isWorking, setIsWorking] = useState(false)
  const [workingLabel, setWorkingLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const settingsMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const activeSession = await getActiveSession()
      if (activeSession) {
        const summary = await getSessionSummary(activeSession.id)
        setActiveSummary(summary)
      } else {
        setActiveSummary(null)
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAuth = () => {
    if (authenticate(password)) { setPasswordError(false); return }
    setPasswordError(true)
  }

  const handleEvaluateOverall = async () => {
    if (!activeSummary) return
    setIsWorking(true)
    setWorkingLabel('종합 평가와 최종 코멘트를 생성하는 중...')
    setError(null)
    try {
      await evaluateOverall(activeSummary.session.id)
      await loadData()
    } catch (evaluateError) {
      setError(evaluateError instanceof Error ? evaluateError.message : '종합 평가에 실패했습니다')
    } finally {
      setIsWorking(false)
      setWorkingLabel('')
    }
  }

  if (!mounted) return null

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-xl max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">종합 평가</h1>
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
          <button onClick={handleAuth} className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all">
            입장하기
          </button>
        </div>
      </div>
    )
  }

  const allThemesComplete = !!activeSummary && activeSummary.completedThemes.length === PHOTO_CONTEST_THEMES.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100">
      <header className="sticky top-0 z-40 border-b border-white/50 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/events" className="text-gray-400 transition-colors hover:text-gray-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-purple-500">Live Console</p>
              <h1 className="text-lg font-black text-gray-900 sm:text-2xl">공정기술그룹 GWP 사진 콘테스트</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/events/photo-contest" className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50">
              📸 테마평가
            </Link>
            <span className="rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-md">
              🏆 종합평가
            </span>
            <Link href="/events/photo-contest/gallery" className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50">
              🖼️ 갤러리
            </Link>
            <div className="relative" ref={settingsMenuRef}>
              <button onClick={() => setShowSettingsMenu(!showSettingsMenu)} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50">
                ⚙️ 설정 ▾
              </button>
              {showSettingsMenu && (
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-xl z-50">
                  <Link href="/events/photo-contest/manage" className="block px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50" onClick={() => setShowSettingsMenu(false)}>📷 사진 관리</Link>
                  <Link href="/events/photo-contest/history" className="block px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50" onClick={() => setShowSettingsMenu(false)}>📋 히스토리</Link>
                  <Link href="/events/photo-contest/print" className="block px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50" onClick={() => setShowSettingsMenu(false)}>🖨️ 프린트 안내물</Link>
                </div>
              )}
            </div>
            <button onClick={loadData} className="rounded-full border border-white/70 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-purple-50">
              새로고침
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {isWorking && <div className="mb-5 rounded-2xl border border-purple-200 bg-white/80 px-4 py-3 text-sm font-medium text-purple-700 shadow-sm">{workingLabel}</div>}

        {isLoading ? (
          <div className="rounded-[28px] border border-white/60 bg-white/80 p-8 text-center text-sm text-gray-500 shadow-lg">데이터를 불러오는 중입니다...</div>
        ) : !activeSummary ? (
          <div className="rounded-[32px] border border-dashed border-purple-200 bg-white/70 p-10 text-center shadow-sm">
            <h3 className="text-2xl font-black text-gray-900">진행 중인 사진 콘테스트가 없습니다</h3>
            <p className="mt-3 text-sm text-gray-600">테마평가 탭에서 먼저 사진 콘테스트를 시작하세요.</p>
          </div>
        ) : !allThemesComplete ? (
          <div className="space-y-6">
            <div className="rounded-[32px] border border-amber-200 bg-amber-50/80 p-8 text-center shadow-sm">
              <div className="text-5xl mb-4">⏳</div>
              <h3 className="text-2xl font-black text-gray-900">테마 심사가 아직 완료되지 않았습니다</h3>
              <p className="mt-3 text-sm text-gray-600">
                {activeSummary.completedThemes.length} / {PHOTO_CONTEST_THEMES.length} 테마 완료 — 모든 테마 심사가 끝나면 종합 평가를 시작할 수 있습니다.
              </p>
              <div className="mt-4 mx-auto max-w-md h-3 overflow-hidden rounded-full bg-amber-100">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${(activeSummary.completedThemes.length / PHOTO_CONTEST_THEMES.length) * 100}%` }} />
              </div>
            </div>

            <div className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-sm sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-500">테마별 심사 현황</p>
              <div className="mt-4 space-y-2">
                {PHOTO_CONTEST_THEMES.map((theme) => {
                  const isCompleted = activeSummary.completedThemes.includes(theme.code)
                  const checkColors = THEME_COLORS[theme.code] || THEME_COLORS.bamboo
                  return (
                    <div key={theme.code} className="flex items-center justify-between rounded-2xl border px-4 py-3 transition-colors" style={{ borderColor: isCompleted ? checkColors.themeColor : '#f3f4f6', backgroundColor: isCompleted ? checkColors.softColor : '#f9fafb' }}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{theme.emoji}</span>
                        <span className="text-sm font-bold" style={{ color: isCompleted ? checkColors.themeColor : '#374151' }}>{theme.shortTitle}</span>
                      </div>
                      <span className="rounded-full px-3 py-1 text-xs font-bold" style={isCompleted ? { backgroundColor: checkColors.themeColor, color: '#ffffff' } : { backgroundColor: '#e5e7eb', color: '#9ca3af' }}>
                        {isCompleted ? '✓ 완료' : '대기'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-lg">🏆</div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-500">Final Stage</p>
                  <h3 className="text-2xl font-black text-gray-900 sm:text-3xl">최종 챔피언 발표</h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">
                5개 테마 심사가 모두 끝났습니다. 종합 점수를 계산하고, 최종 순위를 공개하세요.
              </p>
              <div className="mt-5 flex-1 overflow-hidden rounded-[20px] bg-gray-950 px-5 py-5 text-white">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40">Presentation Cue</p>
                <p className="mt-3 text-lg font-bold leading-8 sm:text-xl">&ldquo;오늘의 GWP 대망의 1위 파트를 확인해 보겠습니다.&rdquo;</p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button onClick={handleEvaluateOverall} disabled={isWorking} className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">
                  🏆 종합 평가 시작
                </button>
                {activeSummary.overallReady ? (
                  <Link href={getOverallRevealUrl(activeSummary.session.id)} className="rounded-full border border-amber-200 bg-amber-50 px-6 py-3 text-center text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100">
                    최종 발표 보기
                  </Link>
                ) : (
                  <div className="rounded-full border border-gray-200 bg-gray-50 px-6 py-3 text-center text-sm font-semibold text-gray-400">발표 준비 전</div>
                )}
              </div>
            </div>

            <div className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-sm sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-500">테마별 심사 현황</p>
              <p className="mt-1 text-sm text-gray-500">{activeSummary.completedThemes.length} / {PHOTO_CONTEST_THEMES.length} 테마 완료</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all" style={{ width: '100%' }} />
              </div>
              <div className="mt-4 space-y-2">
                {PHOTO_CONTEST_THEMES.map((theme) => {
                  const checkColors = THEME_COLORS[theme.code] || THEME_COLORS.bamboo
                  return (
                    <div key={theme.code} className="flex items-center justify-between rounded-2xl border px-4 py-3" style={{ borderColor: checkColors.themeColor, backgroundColor: checkColors.softColor }}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{theme.emoji}</span>
                        <span className="text-sm font-bold" style={{ color: checkColors.themeColor }}>{theme.shortTitle}</span>
                      </div>
                      <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: checkColors.themeColor, color: '#ffffff' }}>✓ 완료</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
