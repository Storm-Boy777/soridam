'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePhotoContestStore } from '@/lib/stores/photoContestStore'
import {
  createSession,
  evaluateTheme,
  getActiveSession,
  getSessionSummary,
  getThemeRevealUrl,
  getThemeUploadUrl,
  PHOTO_CONTEST_DEFAULT_TITLE,
  PHOTO_CONTEST_THEMES,
  type PhotoContestSessionSummary,
  type ThemeCode,
} from '@/lib/api/photo-contest'


const THEME_COLORS: Record<string, { accent: string; themeColor: string; softColor: string }> = {
  bamboo: {
    accent: 'linear-gradient(135deg, #065f46 0%, #10b981 55%, #34d399 100%)',
    themeColor: '#059669',
    softColor: 'rgba(5, 150, 105, 0.12)',
  },
  jump: {
    accent: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #38bdf8 100%)',
    themeColor: '#2563eb',
    softColor: 'rgba(37, 99, 235, 0.12)',
  },
  angel: {
    accent: 'linear-gradient(135deg, #be185d 0%, #ec4899 55%, #f9a8d4 100%)',
    themeColor: '#ec4899',
    softColor: 'rgba(236, 72, 153, 0.12)',
  },
  star: {
    accent: 'linear-gradient(135deg, #7c2d12 0%, #f59e0b 55%, #fde68a 100%)',
    themeColor: '#d97706',
    softColor: 'rgba(217, 119, 6, 0.12)',
  },
  smart_city: {
    accent: 'linear-gradient(135deg, #0f172a 0%, #334155 50%, #64748b 100%)',
    themeColor: '#334155',
    softColor: 'rgba(51, 65, 85, 0.12)',
  },
}

export default function PhotoContestClient() {
  const { isAuthenticated, authenticate, logout } = usePhotoContestStore()
  const [mounted, setMounted] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [activeSummary, setActiveSummary] = useState<PhotoContestSessionSummary | null>(null)
  const [origin, setOrigin] = useState('')
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const settingsMenuRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isWorking, setIsWorking] = useState(false)
  const [workingLabel, setWorkingLabel] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  const loadDashboard = useCallback(async () => {
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
      setError(loadError instanceof Error ? loadError.message : '대시보드를 불러오지 못했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    loadDashboard()
  }, [isAuthenticated, loadDashboard])

  const handleAuth = () => {
    if (authenticate(password)) {
      setPasswordError(false)
      return
    }
    setPasswordError(true)
  }

  const handleCreateSession = async () => {
    setIsWorking(true)
    setWorkingLabel('신규 사진 콘테스트를 생성하는 중...')
    setError(null)
    try {
      const session = await createSession(PHOTO_CONTEST_DEFAULT_TITLE)
      const summary = await getSessionSummary(session.id)
      setActiveSummary(summary)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : '신규 사진 콘테스트 생성에 실패했습니다')
    } finally {
      setIsWorking(false)
      setWorkingLabel('')
    }
  }

  const handleEvaluateTheme = async (themeCode: ThemeCode) => {
    if (!activeSummary) return
    setIsWorking(true)
    setWorkingLabel(`${PHOTO_CONTEST_THEMES.find((theme) => theme.code === themeCode)?.title || '테마'} AI 심사를 진행하는 중...`)
    setError(null)
    try {
      await evaluateTheme(activeSummary.session.id, themeCode)
      await loadDashboard()
    } catch (evaluateError) {
      setError(evaluateError instanceof Error ? evaluateError.message : '테마 심사에 실패했습니다')
    } finally {
      setIsWorking(false)
      setWorkingLabel('')
    }
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      setError('링크 복사에 실패했습니다')
    }
  }

  // 설정 메뉴 외부 클릭 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!mounted) return null

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-xl max-w-sm w-full text-center">
          <div className="text-5xl mb-4">📸</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">GWP 사진 콘테스트</h1>
          <p className="text-gray-500 mb-6 text-sm">운영 대시보드에 입장하려면 비밀번호가 필요합니다</p>
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

  const allThemesComplete =
    !!activeSummary && activeSummary.completedThemes.length === PHOTO_CONTEST_THEMES.length

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
            <span className="rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-md">
              📸 테마평가
            </span>
            {allThemesComplete ? (
              <Link
                href="/events/photo-contest/overall"
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                🏆 종합평가
              </Link>
            ) : (
              <span className="rounded-full border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-400 cursor-not-allowed">
                🏆 종합평가
              </span>
            )}
            <Link
              href="/events/photo-contest/gallery"
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              🖼️ 갤러리
            </Link>
            <div className="relative" ref={settingsMenuRef}>
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                ⚙️ 설정 ▾
              </button>
              {showSettingsMenu && (
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-xl z-50">
                  <Link href="/events/photo-contest/manage" className="block px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50" onClick={() => setShowSettingsMenu(false)}>
                    📷 사진 관리
                  </Link>
                  <Link href="/events/photo-contest/history" className="block px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50" onClick={() => setShowSettingsMenu(false)}>
                    📋 히스토리
                  </Link>
                  <Link href="/events/photo-contest/print" className="block px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50" onClick={() => setShowSettingsMenu(false)}>
                    🖨️ 프린트 안내물
                  </Link>
                </div>
              )}
            </div>
            <button
              onClick={loadDashboard}
              className="rounded-full border border-white/70 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-purple-50"
            >
              새로고침
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isWorking && (
          <div className="mb-5 rounded-2xl border border-purple-200 bg-white/80 px-4 py-3 text-sm font-medium text-purple-700 shadow-sm">
            {workingLabel}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-[28px] border border-white/60 bg-white/80 p-8 text-center text-sm text-gray-500 shadow-lg">
            사진 콘테스트 운영 현황을 불러오는 중입니다...
          </div>
        ) : (
          <div className="space-y-8">
            <section className="overflow-hidden rounded-[32px] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] text-purple-500">Contest Mission</p>
                  <h2 className="mt-3 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
                    5개 테마를 QR로 수집하고, AI로 실시간 발표까지
                  </h2>
                  <p className="mt-4 whitespace-nowrap text-sm leading-7 text-gray-600 sm:text-base">
                    각 장소에 배치된 QR로 참가 파트가 사진을 업로드하면, 운영 대시보드에서 테마별 진행률과 AI 심사 준비 상태를 한 번에 관리할 수 있습니다.
                  </p>
                </div>

                {(!activeSummary || activeSummary.session.status === 'overall_completed') ? (
                  <button
                    onClick={handleCreateSession}
                    disabled={isWorking}
                    className="rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    신규 사진 콘테스트 시작
                  </button>
                ) : null}
              </div>
            </section>

            {activeSummary ? (
              <>
                <section className="grid gap-4 lg:grid-cols-5">
                  {PHOTO_CONTEST_THEMES.map((theme) => {
                    const progress = activeSummary.progress[theme.code]
                    const isReady = progress === 8
                    const isCompleted = activeSummary.completedThemes.includes(theme.code)
                    const uploadUrl = origin ? `${origin}${getThemeUploadUrl(theme.code)}` : getThemeUploadUrl(theme.code)

                    const colors = THEME_COLORS[theme.code] || THEME_COLORS.bamboo

                    return (
                      <article
                        key={theme.code}
                        className="overflow-hidden rounded-[28px] border border-white/60 bg-white/85 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl"
                      >
                        <div className="border-b border-white/60 px-5 py-4 text-white" style={{ backgroundImage: colors.accent }}>
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Theme QR</p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-2xl">{theme.emoji}</span>
                            <h3 className="text-lg font-black leading-tight">{theme.shortTitle}</h3>
                          </div>
                        </div>
                        <div className="space-y-4 p-5">
                          <p className="text-sm leading-6 text-gray-600">{theme.mission}</p>

                          <div className="rounded-2xl border px-4 py-3" style={{ borderColor: colors.softColor, backgroundColor: colors.softColor }}>
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: colors.themeColor }}>업로드 현황</p>
                              <span
                                className="rounded-full px-3 py-1 text-xs font-bold text-white"
                                style={{ backgroundColor: isCompleted ? '#059669' : isReady ? '#d97706' : colors.themeColor }}
                              >
                                {isCompleted ? '심사 완료' : isReady ? '심사 준비' : '진행 중'}
                              </span>
                            </div>
                            <div className="mt-2 flex items-end gap-2">
                              <p className="text-2xl font-black" style={{ color: colors.themeColor }}>{progress}</p>
                              <p className="pb-0.5 text-sm font-semibold text-gray-400">/ 8 파트</p>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/60">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${(progress / 8) * 100}%`, backgroundColor: colors.themeColor }}
                              />
                            </div>
                          </div>

                          {/* 심사 완료 전까지 QR/링크 표시 */}
                          {!isCompleted && (
                            <>
                              <div className="overflow-hidden rounded-3xl border bg-white p-4 text-center" style={{ borderColor: colors.softColor }}>
                                <img
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(uploadUrl)}`}
                                  alt={`${theme.shortTitle} 업로드 QR`}
                                  className="mx-auto h-44 w-44 rounded-2xl border border-gray-100 bg-white p-2"
                                />
                              </div>
                              <div className="space-y-2">
                                <button
                                  onClick={() => handleCopy(uploadUrl)}
                                  className="w-full rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors"
                                  style={{ borderColor: colors.softColor, backgroundColor: colors.softColor, color: colors.themeColor }}
                                >
                                  업로드 링크 복사
                                </button>
                                <Link
                                  href={getThemeUploadUrl(theme.code)}
                                  className="block w-full rounded-full border border-gray-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                                >
                                  업로드 페이지 열기
                                </Link>
                              </div>
                            </>
                          )}

                          <div className="space-y-2">
                            <button
                              onClick={() => handleEvaluateTheme(theme.code)}
                              disabled={!isReady || isWorking}
                              className="w-full rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                              style={{ backgroundImage: colors.accent }}
                            >
                              {isCompleted ? '테마 재평가' : 'AI 심사 시작'}
                            </button>
                            {isCompleted && (
                              <Link
                                href={getThemeRevealUrl(activeSummary.session.id, theme.code)}
                                className="block w-full rounded-full border border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100"
                              >
                                테마 발표 보기
                              </Link>
                            )}
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </section>

                {/* 전체 평가 시작 버튼 (모든 테마 업로드 완료 시) */}
                {!allThemesComplete && Object.values(activeSummary.progress).every((p) => p === 8) && (
                  <section className="rounded-[32px] border border-purple-200 bg-purple-50/80 p-6 text-center shadow-sm">
                    <p className="text-lg font-bold text-purple-800">🚀 모든 테마 업로드가 완료되었습니다!</p>
                    <p className="mt-2 text-sm text-purple-600">전체 평가를 시작하면 대나무숲부터 순차적으로 AI 평가를 진행합니다.</p>
                    <Link
                      href="/events/photo-contest/evaluating"
                      className="mt-4 inline-block rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-8 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
                    >
                      🤖 전체 평가 시작
                    </Link>
                  </section>
                )}

                {/* 5개 테마 모두 평가 완료 시 종합평가 안내 */}
                {allThemesComplete && (
                  <section className="rounded-[32px] border border-amber-200 bg-amber-50/80 p-6 text-center shadow-sm">
                    <p className="text-lg font-bold text-amber-800">🏆 5개 테마 심사가 모두 완료되었습니다!</p>
                    <p className="mt-2 text-sm text-amber-600">상단 &ldquo;종합평가&rdquo; 버튼을 눌러 최종 챔피언을 발표하세요.</p>
                  </section>
                )}
              </>
            ) : (
              <section className="rounded-[32px] border border-dashed border-purple-200 bg-white/70 p-10 text-center shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-purple-500">No Active Session</p>
                <h3 className="mt-4 text-2xl font-black text-gray-900">진행 중인 사진 콘테스트가 없습니다</h3>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-gray-600">
                  현장 QR 업로드를 시작하려면 먼저 운영 대시보드에서 신규 사진 콘테스트를 생성하세요.
                </p>
              </section>
            )}

          </div>
        )}
      </main>
    </div>
  )
}
