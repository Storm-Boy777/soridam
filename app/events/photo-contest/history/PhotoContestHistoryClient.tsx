'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePhotoContestStore } from '@/lib/stores/photoContestStore'
import {
  deleteSession,
  getOverallRevealUrl,
  listSessions,
  type PhotoContestSession,
} from '@/lib/api/photo-contest'

function formatSessionStatus(status: PhotoContestSession['status']) {
  switch (status) {
    case 'collecting': return '촬영/업로드 진행 중'
    case 'theme_evaluating': return '테마 AI 심사 진행 중'
    case 'theme_completed': return '테마 심사 완료'
    case 'overall_completed': return '종합 발표 준비 완료'
    case 'uploading': return '이전 업로드 세션'
    case 'evaluating': return '이전 심사 세션'
    case 'completed': return '이전 완료 세션'
    default: return status
  }
}

function formatTime(dateText: string) {
  return new Date(dateText).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function PhotoContestHistoryClient() {
  const { isAuthenticated, authenticate } = usePhotoContestStore()
  const [mounted, setMounted] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [sessions, setSessions] = useState<PhotoContestSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const settingsMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const sessionList = await listSessions()
      setSessions(sessionList)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '히스토리를 불러오지 못했습니다')
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

  const handleDeleteSession = async (sessionId: string, title: string) => {
    if (!window.confirm(`"${title}" 세션을 삭제하시겠습니까?\n관련 사진, 심사 결과가 모두 삭제됩니다.`)) return
    setIsWorking(true)
    setError(null)
    try {
      await deleteSession(sessionId)
      await loadData()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '세션 삭제에 실패했습니다')
    } finally {
      setIsWorking(false)
    }
  }

  if (!mounted) return null

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-lg border border-white/40 rounded-3xl p-8 shadow-xl max-w-sm w-full text-center">
          <div className="text-5xl mb-4">📋</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">히스토리</h1>
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
            <Link href="/events/photo-contest/overall" className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50">
              🏆 종합평가
            </Link>
            <Link href="/events/photo-contest/gallery" className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50">
              🖼️ 갤러리
            </Link>
            <div className="relative" ref={settingsMenuRef}>
              <button onClick={() => setShowSettingsMenu(!showSettingsMenu)} className="rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-md">
                ⚙️ 설정 ▾
              </button>
              {showSettingsMenu && (
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-xl z-50">
                  <Link href="/events/photo-contest/manage" className="block px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50" onClick={() => setShowSettingsMenu(false)}>📷 사진 관리</Link>
                  <span className="block px-4 py-2.5 text-sm font-semibold text-purple-600 bg-purple-50">📋 히스토리</span>
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

        {isLoading ? (
          <div className="rounded-[28px] border border-white/60 bg-white/80 p-8 text-center text-sm text-gray-500 shadow-lg">히스토리를 불러오는 중입니다...</div>
        ) : (
          <section className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-500">Session History</p>
                <h3 className="mt-2 text-2xl font-black text-gray-900">사진 콘테스트 이력</h3>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {sessions.length === 0 ? (
                <div className="rounded-3xl bg-gray-50 px-5 py-8 text-center text-sm text-gray-500">아직 기록된 사진 콘테스트가 없습니다.</div>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className="flex flex-col gap-3 rounded-[28px] border border-white/70 bg-gray-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{session.title}</p>
                      <p className="mt-1 text-sm text-gray-500">{formatSessionStatus(session.status)}</p>
                      <p className="mt-1 text-xs text-gray-400">{formatTime(session.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {session.status === 'overall_completed' && (
                        <Link href={getOverallRevealUrl(session.id)} className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100">
                          종합 발표
                        </Link>
                      )}
                      <button onClick={() => handleDeleteSession(session.id, session.title)} disabled={isWorking} className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50">
                        삭제
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
