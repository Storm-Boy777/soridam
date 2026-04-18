'use client'

import Link from 'next/link'
import JSZip from 'jszip'
import { useCallback, useEffect, useState } from 'react'
import {
  deleteThemeSubmission,
  getActiveSession,
  listAllThemeSubmissions,
  PHOTO_CONTEST_THEMES,
  type PhotoContestSession,
  type PhotoContestThemeSubmission,
  type ThemeCode,
} from '@/lib/api/photo-contest'

const THEME_COLORS: Record<string, { accent: string; themeColor: string; softColor: string }> = {
  bamboo: { accent: 'linear-gradient(135deg, #065f46, #10b981, #34d399)', themeColor: '#059669', softColor: 'rgba(5,150,105,0.12)' },
  jump: { accent: 'linear-gradient(135deg, #1d4ed8, #2563eb, #38bdf8)', themeColor: '#2563eb', softColor: 'rgba(37,99,235,0.12)' },
  angel: { accent: 'linear-gradient(135deg, #be185d, #ec4899, #f9a8d4)', themeColor: '#ec4899', softColor: 'rgba(236,72,153,0.12)' },
  star: { accent: 'linear-gradient(135deg, #7c2d12, #f59e0b, #fde68a)', themeColor: '#d97706', softColor: 'rgba(217,119,6,0.12)' },
  smart_city: { accent: 'linear-gradient(135deg, #0f172a, #334155, #64748b)', themeColor: '#334155', softColor: 'rgba(51,65,85,0.12)' },
}

const MANAGE_PASSWORD = '7890'

export default function PhotoContestManageClient() {
  const [mounted, setMounted] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)

  const [session, setSession] = useState<PhotoContestSession | null>(null)
  const [submissions, setSubmissions] = useState<PhotoContestThemeSubmission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filterTheme, setFilterTheme] = useState<ThemeCode | 'all'>('all')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const activeSession = await getActiveSession()
      setSession(activeSession)
      if (activeSession) {
        const data = await listAllThemeSubmissions(activeSession.id)
        setSubmissions(data)
      } else {
        setSubmissions([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    loadData()
  }, [isAuthenticated, loadData])

  const handleAuth = () => {
    if (password === MANAGE_PASSWORD) {
      setIsAuthenticated(true)
      setPasswordError(false)
      return
    }
    setPasswordError(true)
  }

  const logout = () => {
    setIsAuthenticated(false)
    setPassword('')
  }

  const handleDelete = async (submission: PhotoContestThemeSubmission) => {
    const theme = PHOTO_CONTEST_THEMES.find((t) => t.code === submission.theme_code)
    if (!window.confirm(`${theme?.shortTitle} - ${submission.part_name} 사진을 삭제하시겠습니까?`)) return

    setDeletingId(submission.id)
    try {
      await deleteThemeSubmission(submission.id, submission.storage_path)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownloadAll = async () => {
    if (submissions.length === 0 || isDownloading) return
    setIsDownloading(true)
    setDownloadProgress('ZIP 파일 생성 준비 중...')
    try {
      const zip = new JSZip()
      const targetList = filterTheme === 'all' ? submissions : submissions.filter((s) => s.theme_code === filterTheme)

      for (let i = 0; i < targetList.length; i++) {
        const s = targetList[i]
        const theme = PHOTO_CONTEST_THEMES.find((t) => t.code === s.theme_code)
        setDownloadProgress(`다운로드 중... ${i + 1}/${targetList.length}`)
        try {
          const res = await fetch(s.photo_url)
          const blob = await res.blob()
          const ext = s.photo_url.split('.').pop()?.split('?')[0] || 'jpg'
          const fileName = `${theme?.shortTitle || s.theme_code}_파트${s.part_number}_${s.part_name}.${ext}`
          const folderName = theme?.shortTitle || s.theme_code
          zip.file(`${folderName}/${fileName}`, blob)
        } catch {
          console.error(`사진 다운로드 실패: ${s.part_name}`)
        }
      }

      setDownloadProgress('ZIP 파일 압축 중...')
      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `GWP_사진콘테스트_${filterTheme === 'all' ? '전체' : PHOTO_CONTEST_THEMES.find((t) => t.code === filterTheme)?.shortTitle}_${targetList.length}장.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('다운로드에 실패했습니다: ' + (err instanceof Error ? err.message : ''))
    } finally {
      setIsDownloading(false)
      setDownloadProgress('')
    }
  }

  if (!mounted) return null

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 p-4">
        <div className="w-full max-w-sm rounded-3xl border border-white/40 bg-white/80 p-8 text-center shadow-xl backdrop-blur-lg">
          <div className="mb-4 text-5xl">⚙️</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-800">사진 관리</h1>
          <p className="mb-6 text-sm text-gray-500">비밀번호를 입력해 주세요</p>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setPasswordError(false) }}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
            placeholder="비밀번호"
            className={`mb-4 w-full rounded-xl border-2 px-4 py-3 text-center text-lg tracking-widest outline-none transition-colors ${
              passwordError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white focus:border-purple-400'
            }`}
            autoFocus
          />
          {passwordError && <p className="mb-4 text-sm text-red-500">비밀번호가 올바르지 않습니다</p>}
          <button onClick={handleAuth} className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-3 font-semibold text-white transition-all hover:from-purple-600 hover:to-pink-600">
            입장하기
          </button>
        </div>
      </div>
    )
  }

  const filtered = filterTheme === 'all' ? submissions : submissions.filter((s) => s.theme_code === filterTheme)
  const groupedByTheme = PHOTO_CONTEST_THEMES.map((theme) => ({
    theme,
    items: filtered.filter((s) => s.theme_code === theme.code),
    colors: THEME_COLORS[theme.code],
  })).filter((g) => filterTheme === 'all' || g.theme.code === filterTheme)

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
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-500">Photo Manager</p>
              <h1 className="text-lg font-black text-gray-900 sm:text-2xl">사진 관리</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {submissions.length > 0 && (
              <button
                onClick={handleDownloadAll}
                disabled={isDownloading}
                className="rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading ? downloadProgress : `📥 전체 다운로드 (${filterTheme === 'all' ? submissions.length : submissions.filter((s) => s.theme_code === filterTheme).length}장)`}
              </button>
            )}
            <button onClick={loadData} className="rounded-full border border-white/70 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-purple-50">
              새로고침
            </button>
            <a href="/events/photo-contest" className="rounded-full border border-white/70 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
              나가기
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {isLoading ? (
          <div className="rounded-[28px] border border-white/60 bg-white/80 p-8 text-center text-sm text-gray-500 shadow-lg">
            사진을 불러오는 중...
          </div>
        ) : !session ? (
          <div className="rounded-[28px] border border-dashed border-purple-200 bg-white/70 p-10 text-center shadow-sm">
            <h3 className="text-2xl font-black text-gray-900">진행 중인 사진 콘테스트가 없습니다</h3>
          </div>
        ) : (
          <>
            {/* 통계 + 필터 */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-700">전체 {submissions.length}장</span>
                {PHOTO_CONTEST_THEMES.map((theme) => {
                  const count = submissions.filter((s) => s.theme_code === theme.code).length
                  return (
                    <span key={theme.code} className="text-xs text-gray-500">
                      {theme.emoji} {count}
                    </span>
                  )
                })}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setFilterTheme('all')}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                    filterTheme === 'all' ? 'bg-purple-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  전체
                </button>
                {PHOTO_CONTEST_THEMES.map((theme) => {
                  const colors = THEME_COLORS[theme.code]
                  const isActive = filterTheme === theme.code
                  return (
                    <button
                      key={theme.code}
                      onClick={() => setFilterTheme(theme.code)}
                      className="rounded-full px-3 py-1.5 text-xs font-bold transition-colors"
                      style={isActive
                        ? { backgroundColor: colors.themeColor, color: '#fff' }
                        : { backgroundColor: '#fff', color: colors.themeColor }
                      }
                    >
                      {theme.emoji} {theme.shortTitle}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 테마별 사진 그리드 */}
            <div className="space-y-6">
              {groupedByTheme.map(({ theme, items, colors }) => (
                <section key={theme.code} className="overflow-hidden rounded-[28px] border border-white/60 bg-white/85 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                  <div className="px-5 py-3 text-white" style={{ backgroundImage: colors.accent }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{theme.emoji}</span>
                        <h3 className="text-base font-black">{theme.shortTitle}</h3>
                      </div>
                      <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold">{items.length} / 8</span>
                    </div>
                  </div>

                  {items.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-gray-400">아직 업로드된 사진이 없습니다</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-8">
                      {items.map((submission) => (
                        <div key={submission.id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <button
                            type="button"
                            onClick={() => setPreviewUrl(submission.photo_url)}
                            className="block w-full"
                          >
                            <img
                              src={submission.photo_url}
                              alt={`${theme.shortTitle} - ${submission.part_name}`}
                              className="aspect-[3/4] w-full object-cover transition-transform group-hover:scale-105"
                            />
                          </button>
                          <div className="p-2">
                            <p className="text-[11px] font-bold text-gray-800 truncate">{submission.part_name}</p>
                            <p className="text-[9px] text-gray-400">파트 {submission.part_number}</p>
                          </div>
                          <button
                            onClick={() => handleDelete(submission)}
                            disabled={deletingId === submission.id}
                            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100 disabled:opacity-50"
                            title="삭제"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </>
        )}
      </main>

      {/* 사진 미리보기 모달 */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewUrl(null)}
        >
          <img
            src={previewUrl}
            alt="미리보기"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
