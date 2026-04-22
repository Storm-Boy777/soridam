'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function GwpHubPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-16 sm:w-20 h-16 sm:h-20 bg-amber-200/40 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-32 right-10 sm:right-20 w-24 sm:w-32 h-24 sm:h-32 bg-orange-200/30 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-1/4 w-20 sm:w-24 h-20 sm:h-24 bg-rose-200/40 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 sm:py-16">
        {/* 뒤로가기 */}
        <Link href="/events" className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-amber-800/70 hover:text-amber-800 mb-4 sm:mb-6 transition-colors">
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          이벤트 홈
        </Link>

        {/* 헤더 */}
        <div className="text-center mb-8 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-white/60 backdrop-blur-sm rounded-full px-3.5 sm:px-5 py-1.5 sm:py-2 mb-4 sm:mb-6">
            <span className="text-lg sm:text-2xl">🌸</span>
            <span className="text-sm sm:text-base font-black text-amber-700">GWP</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-amber-600 via-orange-500 to-rose-500 bg-clip-text text-transparent mb-2.5 sm:mb-4">
            Great Work Place
          </h1>
          <p className="text-sm sm:text-lg text-gray-600 max-w-xl mx-auto">
            공정기술그룹 GWP 대형 이벤트
          </p>
        </div>

        {/* 이벤트 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto">
          {/* 사진 콘테스트 카드 */}
          <Link href="/events/photo-contest" className="group">
            <div className="bg-white/70 backdrop-blur-lg border border-white/40 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:bg-white/85 h-full flex flex-col">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 mx-auto group-hover:scale-110 transition-transform">
                <span className="text-2xl sm:text-3xl">📸</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3 text-center">GWP 사진 콘테스트</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed text-center sm:min-h-[3.25rem]">
                QR로 현장 업로드하고
                <br />AI 심사와 순위를 실시간 발표합니다.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-6 mt-auto">
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] sm:text-xs font-medium">5개 테마</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-orange-100 text-orange-700 rounded-full text-[10px] sm:text-xs font-medium">QR 업로드</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-rose-100 text-rose-700 rounded-full text-[10px] sm:text-xs font-medium">MC형 발표</span>
              </div>
              <div className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-center text-sm sm:text-base font-bold text-white shadow-md transition-all group-hover:shadow-lg group-hover:-translate-y-0.5">
                시작하기
              </div>
            </div>
          </Link>

          {/* Coming Soon 카드 (비활성) */}
          <div className="relative group cursor-not-allowed">
            <div className="bg-white/40 backdrop-blur-lg border border-white/30 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-md h-full flex flex-col opacity-70">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-gray-300 to-gray-400 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 mx-auto">
                <span className="text-2xl sm:text-3xl">✨</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-600 mb-2 sm:mb-3 text-center">새로운 이벤트</h2>
              <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6 leading-relaxed text-center sm:min-h-[3.25rem]">
                다음 GWP 이벤트가
                <br />추가될 예정입니다
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-6 mt-auto">
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-gray-200 text-gray-600 rounded-full text-[10px] sm:text-xs font-medium">Coming Soon</span>
              </div>
              <div className="w-full rounded-xl bg-gray-300 py-3 text-center text-sm sm:text-base font-bold text-gray-500">
                준비 중
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="text-center mt-10 sm:mt-16 text-xs sm:text-sm text-gray-400">
          함께 만드는 즐거운 GWP 🌸
        </div>
      </div>
    </div>
  )
}
