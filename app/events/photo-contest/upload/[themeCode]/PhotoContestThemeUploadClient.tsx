'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { usePhotoContestStore } from '@/lib/stores/photoContestStore'
import {
  getActiveSession,
  listThemeSubmissions,
  PHOTO_CONTEST_PARTS,
  PHOTO_CONTEST_THEME_MAP,
  submitThemePhoto,
  type PhotoContestSession,
  type PhotoContestThemeSubmission,
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

interface PhotoContestThemeUploadClientProps {
  themeCode: ThemeCode
}

export default function PhotoContestThemeUploadClient({ themeCode }: PhotoContestThemeUploadClientProps) {
  const { isAuthenticated, authenticate, logout } = usePhotoContestStore()
  const [mounted, setMounted] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [session, setSession] = useState<PhotoContestSession | null>(null)
  const [submissions, setSubmissions] = useState<PhotoContestThemeSubmission[]>([])
  const [selectedPart, setSelectedPart] = useState<number | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const theme = PHOTO_CONTEST_THEME_MAP[themeCode]
  const colors = THEME_COLORS[themeCode] || THEME_COLORS.bamboo

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadPage = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const activeSession = await getActiveSession()
      setSession(activeSession)

      if (activeSession) {
        const nextSubmissions = await listThemeSubmissions(activeSession.id, themeCode)
        setSubmissions(nextSubmissions)
      } else {
        setSubmissions([])
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '업로드 페이지를 불러오지 못했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [themeCode])

  useEffect(() => {
    if (!isAuthenticated) return
    loadPage()
  }, [isAuthenticated, loadPage])

  const handleAuth = () => {
    if (authenticate(password)) {
      setPasswordError(false)
      return
    }
    setPasswordError(true)
  }

  const currentSubmission = submissions.find((submission) => submission.part_number === selectedPart) || null
  // 전체 평가(overall_completed/completed) 전이면 업로드 가능, 해당 테마가 이미 평가된 경우만 차단
  const isOverallDone = session?.status === 'overall_completed' || session?.status === 'completed'
  const isThemeEvaluated = session?.theme_overall_comments?.[themeCode] != null
  const isUploadAvailable = session != null && !isOverallDone && !isThemeEvaluated

  const handleFileChange = (nextFile: File | null) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    if (nextFile) {
      setFile(nextFile)
      setPreviewUrl(URL.createObjectURL(nextFile))
    } else {
      setFile(null)
      setPreviewUrl(null)
    }
  }

  const handleSave = async () => {
    if (!session || !selectedPart || !file) {
      setError('파트와 사진을 모두 선택해 주세요')
      return
    }

    const selectedPartMeta = PHOTO_CONTEST_PARTS.find((part) => part.partNumber === selectedPart)
    if (!selectedPartMeta) {
      setError('유효한 파트를 선택해 주세요')
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)
    try {
      await submitThemePhoto({
        session_id: session.id,
        theme_code: themeCode,
        part_number: selectedPartMeta.partNumber,
        part_name: selectedPartMeta.partName,
        file,
      })
      handleFileChange(null)
      setSuccessMessage(`${selectedPartMeta.partName} 사진이 저장되었습니다`)
      await loadPage()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '사진 저장에 실패했습니다')
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  if (!mounted) return null

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${colors.softColor} 0%, #f8fafc 50%, ${colors.softColor} 100%)` }}>
        <div className="w-full max-w-sm rounded-3xl border border-white/40 bg-white/80 p-8 text-center shadow-xl backdrop-blur-lg">
          <div className="text-5xl mb-4">{theme.emoji}</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{theme.title}</h1>
          <p className="text-gray-500 mb-6 text-sm">현장 업로드를 위해 비밀번호를 한 번 입력해 주세요</p>
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
              passwordError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
            }`}
            style={!passwordError ? { borderColor: colors.softColor } : undefined}
            autoFocus
          />
          {passwordError && <p className="text-red-500 text-sm mb-4">비밀번호가 올바르지 않습니다</p>}
          <button
            onClick={handleAuth}
            className="w-full py-3 text-white rounded-xl font-semibold transition-all hover:opacity-90"
            style={{ backgroundImage: colors.accent }}
          >
            입장하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${colors.softColor} 0%, #f8fafc 50%, ${colors.softColor} 100%)` }}>
      <header className="border-b border-white/50 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/events/photo-contest" className="text-gray-400 transition-colors hover:text-gray-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{theme.emoji}</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: colors.themeColor }}>Theme Upload</p>
                <h1 className="text-lg font-black text-gray-900 sm:text-2xl">{theme.title}</h1>
              </div>
            </div>
          </div>
          <a
            href="/events"
            className="rounded-full border border-white/70 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            나가기
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: colors.softColor, backgroundColor: colors.softColor, color: colors.themeColor }}>
            {successMessage}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-[28px] border border-white/60 bg-white/80 p-8 text-center text-sm text-gray-500 shadow-lg">
            업로드 상태를 불러오는 중입니다...
          </div>
        ) : (
          <div className="space-y-6">
            {/* 미션 브리핑 */}
            <section className="overflow-hidden rounded-[32px] border border-white/60 bg-white/80 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <div className="px-6 py-5 text-white sm:px-8" style={{ backgroundImage: colors.accent }}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Mission Brief</p>
                    <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                      {theme.emoji} {theme.shortTitle}
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85 sm:text-base">{theme.mission}</p>
                  </div>
                  <div className="shrink-0 rounded-[20px] bg-white/15 px-5 py-4 text-sm backdrop-blur-sm">
                    <p className="font-semibold text-white/80">업로드 현황</p>
                    <p className="mt-1 text-2xl font-black">{submissions.length} / 8</p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                      <div
                        className="h-full rounded-full bg-white transition-all"
                        style={{ width: `${(submissions.length / 8) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {!session ? (
              <section className="rounded-[32px] border border-dashed bg-white/70 p-10 text-center shadow-sm" style={{ borderColor: colors.themeColor }}>
                <h3 className="text-2xl font-black text-gray-900">아직 시작된 사진 콘테스트가 없습니다</h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-gray-600">
                  운영자가 메인 대시보드에서 신규 사진 콘테스트를 시작하면 이 테마 QR 페이지에서 업로드할 수 있습니다.
                </p>
              </section>
            ) : !isUploadAvailable ? (
              <section className="rounded-[32px] border border-dashed border-amber-200 bg-amber-50/70 p-10 text-center shadow-sm">
                <h3 className="text-2xl font-black text-gray-900">촬영 업로드가 마감되었습니다</h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-gray-600">
                  지금은 AI 심사 또는 발표 단계입니다. 추가 업로드가 필요하면 운영자에게 문의해 주세요.
                </p>
              </section>
            ) : (
              <>
                {/* 파트 선택 */}
                <section className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: colors.themeColor }}>Step 1</p>
                  <h3 className="mt-2 text-2xl font-black text-gray-900">파트를 선택해 주세요</h3>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {PHOTO_CONTEST_PARTS.map((part) => {
                      const submitted = submissions.some((submission) => submission.part_number === part.partNumber)
                      const isSelected = selectedPart === part.partNumber
                      return (
                        <button
                          key={part.partNumber}
                          type="button"
                          onClick={() => setSelectedPart(part.partNumber)}
                          className="rounded-[24px] border px-4 py-4 text-left transition-all"
                          style={{
                            borderColor: isSelected ? colors.themeColor : '#f3f4f6',
                            backgroundColor: isSelected ? colors.softColor : '#f9fafb',
                            boxShadow: isSelected ? `0 4px 16px ${colors.softColor}` : 'none',
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span
                              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black text-white"
                              style={{ backgroundImage: colors.accent }}
                            >
                              {part.partNumber}
                            </span>
                            <span
                              className="rounded-full px-3 py-1 text-xs font-bold"
                              style={submitted
                                ? { backgroundColor: colors.themeColor, color: '#ffffff' }
                                : { backgroundColor: '#e5e7eb', color: '#9ca3af' }
                              }
                            >
                              {submitted ? '제출 완료' : '대기'}
                            </span>
                          </div>
                          <p className="mt-3 text-sm font-semibold text-gray-800">{part.partName}</p>
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* 사진 업로드 + 심사 포인트 */}
                <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                  <div className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: colors.themeColor }}>Step 2</p>
                    <h3 className="mt-2 text-2xl font-black text-gray-900">사진 업로드</h3>
                    <p className="mt-3 text-sm leading-7 text-gray-600">
                      파트를 선택한 뒤 최종 사진 1장을 업로드해 주세요. 같은 파트로 다시 저장하면 최신 사진으로 교체됩니다.
                    </p>

                    <label
                      className="mt-6 flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed px-6 text-center transition-colors"
                      style={{ borderColor: colors.themeColor, backgroundColor: colors.softColor }}
                    >
                      {previewUrl || currentSubmission?.photo_url ? (
                        <img
                          src={previewUrl || currentSubmission?.photo_url}
                          alt="업로드 미리보기"
                          className="aspect-[4/3] w-full rounded-[24px] object-cover"
                        />
                      ) : (
                        <>
                          <span className="text-5xl">{theme.emoji}</span>
                          <p className="mt-4 text-lg font-bold text-gray-800">클릭해서 사진 선택</p>
                          <p className="mt-2 text-sm text-gray-500">JPG, PNG, WebP 파일 업로드 가능</p>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic"
                        className="hidden"
                        onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
                      />
                    </label>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <button
                        onClick={handleSave}
                        disabled={!selectedPart || !file || isSaving}
                        className="rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ backgroundImage: colors.accent }}
                      >
                        {isSaving ? '저장 중...' : '사진 저장'}
                      </button>
                      <button
                        onClick={() => handleFileChange(null)}
                        className="rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                      >
                        새 파일 선택
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* 심사 포인트 */}
                    <section className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: colors.themeColor }}>Step 3</p>
                      <h3 className="mt-2 text-2xl font-black text-gray-900">심사 포인트</h3>
                      <div className="mt-5 space-y-2">
                        {theme.criteria.map((criterion) => (
                          <div
                            key={criterion.key}
                            className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3"
                            style={{ borderColor: colors.softColor, backgroundColor: colors.softColor }}
                          >
                            <span className="text-sm font-bold" style={{ color: colors.themeColor }}>{criterion.label}</span>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black" style={{ color: colors.themeColor }}>{criterion.maxScore}점</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* 현재 선택 파트 */}
                    <section className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: colors.themeColor }}>Current</p>
                      <h3 className="mt-2 text-2xl font-black text-gray-900">현재 선택 파트</h3>
                      <p className="mt-4 text-sm leading-7 text-gray-600">
                        {selectedPart
                          ? PHOTO_CONTEST_PARTS.find((part) => part.partNumber === selectedPart)?.partName
                          : '아직 파트를 선택하지 않았습니다.'}
                      </p>
                      {currentSubmission && (
                        <p className="mt-3 text-sm font-semibold" style={{ color: colors.themeColor }}>
                          이미 제출된 사진이 있습니다. 새로 저장하면 교체됩니다.
                        </p>
                      )}
                    </section>
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
