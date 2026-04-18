'use client'

import { useEffect, useCallback } from 'react'

interface PhotoLightboxProps {
  photos: { url: string; label: string }[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

export default function PhotoLightbox({ photos, currentIndex, onClose, onNavigate }: PhotoLightboxProps) {
  const current = photos[currentIndex]

  const handlePrev = useCallback(() => {
    onNavigate(currentIndex > 0 ? currentIndex - 1 : photos.length - 1)
  }, [currentIndex, photos.length, onNavigate])

  const handleNext = useCallback(() => {
    onNavigate(currentIndex < photos.length - 1 ? currentIndex + 1 : 0)
  }, [currentIndex, photos.length, onNavigate])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, handlePrev, handleNext])

  if (!current) return null

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-10"
      >
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* 사진 카운터 */}
      <div className="absolute top-4 left-4 text-white/60 text-sm z-10">
        {currentIndex + 1} / {photos.length}
      </div>

      {/* 이전 버튼 */}
      {photos.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); handlePrev() }}
          className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors z-10 p-2"
        >
          <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* 사진 */}
      <div
        className="w-full h-full flex flex-col items-center justify-center px-12 sm:px-20 py-14"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={current.url}
          alt={current.label}
          className="max-w-full max-h-[calc(100vh-120px)] object-contain"
        />
        <div className="mt-3 text-white text-center">
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{current.label}</p>
        </div>
      </div>

      {/* 다음 버튼 */}
      {photos.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); handleNext() }}
          className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors z-10 p-2"
        >
          <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}
