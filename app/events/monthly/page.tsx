'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function MonthlyHubPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-16 sm:w-20 h-16 sm:h-20 bg-sky-200/40 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-32 right-10 sm:right-20 w-24 sm:w-32 h-24 sm:h-32 bg-blue-200/30 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-1/4 w-20 sm:w-24 h-20 sm:h-24 bg-indigo-200/40 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10 sm:py-16">
        {/* 뒤로가기 */}
        <Link href="/events" className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-sky-800/70 hover:text-sky-800 mb-4 sm:mb-6 transition-colors">
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          이벤트 홈
        </Link>

        {/* 헤더 */}
        <div className="text-center mb-8 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-white/60 backdrop-blur-sm rounded-full px-3.5 sm:px-5 py-1.5 sm:py-2 mb-4 sm:mb-6">
            <span className="text-lg sm:text-2xl">📅</span>
            <span className="text-sm sm:text-base font-black text-sky-700">MONTHLY</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-sky-600 via-blue-500 to-indigo-500 bg-clip-text text-transparent mb-2.5 sm:mb-4">
            월례회
          </h1>
          <p className="text-sm sm:text-lg text-gray-600 max-w-xl mx-auto">
            매월 정기 회의와 그룹 공유 세션
          </p>
        </div>

        {/* 준비 중 카드 */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/70 backdrop-blur-lg border border-white/40 rounded-2xl sm:rounded-3xl p-8 sm:p-12 shadow-lg text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-sky-400 to-blue-600 rounded-2xl flex items-center justify-center mb-5 sm:mb-6 mx-auto">
              <span className="text-3xl sm:text-4xl">🛠️</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3">
              준비 중입니다
            </h2>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-5 sm:mb-6">
              월례회 전용 기능을 준비하고 있습니다.
              <br />
              곧 다양한 세션 컨텐츠로 찾아뵙겠습니다.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-6 sm:mb-8">
              <span className="px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-medium">세션 기록</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">발표 자료</span>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">참여 이력</span>
            </div>
            <Link href="/events" className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all">
              이벤트 홈으로
            </Link>
          </div>
        </div>

        {/* 푸터 */}
        <div className="text-center mt-10 sm:mt-16 text-xs sm:text-sm text-gray-400">
          함께 만드는 즐거운 공정기술그룹 🌸
        </div>
      </div>
    </div>
  )
}
