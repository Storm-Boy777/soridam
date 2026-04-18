'use client'
// gallery v2
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePhotoContestStore } from '@/lib/stores/photoContestStore'
import {
  getActiveSession,
  listAllThemeSubmissions,
  PHOTO_CONTEST_THEME_MAP,
  type PhotoContestThemeSubmission,
} from '@/lib/api/photo-contest'

const THEME_COLORS: Record<string, { accent: string; themeColor: string }> = {
  bamboo: { accent: 'linear-gradient(135deg, #065f46, #10b981)', themeColor: '#059669' },
  jump: { accent: 'linear-gradient(135deg, #1d4ed8, #38bdf8)', themeColor: '#2563eb' },
  angel: { accent: 'linear-gradient(135deg, #be185d, #f9a8d4)', themeColor: '#ec4899' },
  star: { accent: 'linear-gradient(135deg, #7c2d12, #fde68a)', themeColor: '#d97706' },
  smart_city: { accent: 'linear-gradient(135deg, #0f172a, #64748b)', themeColor: '#334155' },
}

const AUTO_SPEEDS = [
  { label: '3초', ms: 3000 },
  { label: '5초', ms: 5000 },
  { label: '8초', ms: 8000 },
  { label: '10초', ms: 10000 },
]

const TRANSITION = 'animate-[fadeIn_0.8s_ease-out]'

export default function PhotoContestGalleryClient() {
  const { isAuthenticated, authenticate } = usePhotoContestStore()
  const [mounted, setMounted] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)

  const [photos, setPhotos] = useState<PhotoContestThemeSubmission[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isAuto, setIsAuto] = useState(false)
  const [autoSpeed, setAutoSpeed] = useState(5000)
  const [showControls, setShowControls] = useState(true)
  const [transitionKey, setTransitionKey] = useState(0)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadPhotos = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const session = await getActiveSession()
      if (!session) {
        setError('진행 중인 사진 콘테스트가 없습니다')
        setPhotos([])
        return
      }
      const submissions = await listAllThemeSubmissions(session.id)
      if (submissions.length === 0) {
        setError('아직 업로드된 사진이 없습니다')
      }
      setPhotos(submissions)
      setCurrentIndex(0)
      // 모든 사진 사전 로딩
      submissions.forEach((s: { photo_url: string }) => {
        const img = new Image()
        img.src = s.photo_url
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '사진을 불러오지 못했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    loadPhotos()
  }, [isAuthenticated, loadPhotos])

  // 자동 슬라이드
  useEffect(() => {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current)
    if (isAuto && photos.length > 1) {
      autoTimerRef.current = setInterval(() => {
        setTransitionKey((k) => k + 1)
        setCurrentIndex((prev) => {
          let next = Math.floor(Math.random() * photos.length)
          while (next === prev && photos.length > 1) {
            next = Math.floor(Math.random() * photos.length)
          }
          return next
        })
      }, autoSpeed)
    }
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current)
    }
  }, [isAuto, autoSpeed, photos.length])

  // 자동 모드에서 마우스 움직이면 컨트롤 표시, 3초 후 숨김
  const handleMouseMove = useCallback(() => {
    setShowControls(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    if (isAuto) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 3000)
    }
  }, [isAuto])

  // 키보드 조작
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        setTransitionKey((k) => k + 1)
        setCurrentIndex((prev) => (prev + 1) % photos.length)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setTransitionKey((k) => k + 1)
        setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)
      } else if (e.key === 'Escape') {
        window.history.back()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [photos.length])

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
      <div className="flex min-h-screen items-center justify-center bg-black p-4">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-lg">
          <div className="mb-4 text-5xl">🖼️</div>
          <h1 className="mb-2 text-2xl font-bold text-white">사진 갤러리</h1>
          <p className="mb-6 text-sm text-white/50">비밀번호를 입력해 주세요</p>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setPasswordError(false) }}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
            placeholder="비밀번호"
            className={`mb-4 w-full rounded-xl border-2 bg-white/5 px-4 py-3 text-center text-lg tracking-widest text-white outline-none transition-colors ${
              passwordError ? 'border-red-500' : 'border-white/20 focus:border-white/40'
            }`}
            autoFocus
          />
          {passwordError && <p className="mb-4 text-sm text-red-400">비밀번호가 올바르지 않습니다</p>}
          <button onClick={handleAuth} className="w-full rounded-xl bg-white py-3 font-semibold text-black transition-opacity hover:opacity-90">
            입장하기
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-lg text-white/50">사진을 불러오는 중...</p>
      </div>
    )
  }

  if (error || photos.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black">
        <p className="text-lg text-white/50">{error || '사진이 없습니다'}</p>
        <button onClick={() => window.history.back()} className="rounded-full border border-white/20 px-6 py-2 text-sm font-semibold text-white/70 hover:bg-white/5">
          돌아가기
        </button>
      </div>
    )
  }

  const current = photos[currentIndex]
  const theme = PHOTO_CONTEST_THEME_MAP[current.theme_code]
  const colors = THEME_COLORS[current.theme_code] || THEME_COLORS.bamboo

  return (
    <div
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-black"
      onMouseMove={handleMouseMove}
      onClick={handleMouseMove}
    >
      {/* 배경 블러 이미지 */}
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center blur-3xl brightness-[0.15]"
        style={{ backgroundImage: `url(${current.photo_url})` }}
      />

      {/* 메인 사진 */}
      <img
        key={transitionKey}
        src={current.photo_url}
        alt={`${theme?.shortTitle} - ${current.part_name}`}
        className={`relative z-10 max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl ${TRANSITION}`}
      />

      {/* 사진 정보 오버레이 (하단) */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent px-8 pb-6 pt-20">
          <div className="mx-auto flex max-w-5xl items-end justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold text-white"
                  style={{ backgroundImage: colors.accent }}
                >
                  {theme?.emoji} {theme?.shortTitle}
                </span>
                <span className="text-sm font-semibold text-white/60">{current.part_name}</span>
              </div>
              <p className="mt-2 text-xs text-white/40">
                {currentIndex + 1} / {photos.length}
              </p>
            </div>

            {/* 컨트롤 */}
            <div className="flex items-center gap-3">
              {/* 자동/수동 토글 */}
              <button
                onClick={() => {
                  setIsAuto(!isAuto)
                  if (!isAuto) {
                    setShowControls(true)
                    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
                    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000)
                  } else {
                    setShowControls(true)
                    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
                  }
                }}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                  isAuto
                    ? 'bg-white text-black'
                    : 'border border-white/20 bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {isAuto ? '⏸ 자동 정지' : '▶ 자동 재생'}
              </button>

              {/* 속도 선택 (자동 모드일 때만) */}
              {isAuto && (
                <div className="flex gap-1">
                  {AUTO_SPEEDS.map((speed) => (
                    <button
                      key={speed.ms}
                      onClick={() => setAutoSpeed(speed.ms)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                        autoSpeed === speed.ms
                          ? 'bg-white/20 text-white'
                          : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      {speed.label}
                    </button>
                  ))}
                </div>
              )}

              {/* 돌아가기 */}
              <button
                onClick={() => window.location.href = '/events/photo-contest'}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20"
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 좌우 네비게이션 (수동 모드) */}
      {!isAuto && showControls && (
        <>
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)}
            className="absolute left-4 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % photos.length)}
            className="absolute right-4 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* 진행 바 삭제 */}

      <style jsx>{`
        @keyframes galleryProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  )
}
