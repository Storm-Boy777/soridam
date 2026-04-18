'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function EventsHubPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-16 sm:w-20 h-16 sm:h-20 bg-pink-200/40 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-32 right-10 sm:right-20 w-24 sm:w-32 h-24 sm:h-32 bg-purple-200/30 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-1/4 w-20 sm:w-24 h-20 sm:h-24 bg-blue-200/40 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 sm:py-16">
        {/* 헤더 */}
        <div className="text-center mb-8 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-white/60 backdrop-blur-sm rounded-full px-3.5 sm:px-5 py-1.5 sm:py-2 mb-4 sm:mb-6">
            <span className="text-lg sm:text-2xl">🌸</span>
            <span className="text-sm sm:text-base font-black text-purple-700">2026 GWP</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-transparent mb-2.5 sm:mb-4">
            공정기술그룹
          </h1>
          <p className="text-sm sm:text-lg text-gray-600 max-w-xl mx-auto">
            사진 심사, 추첨 이벤트로 즐거운 시간을 만들어보세요
          </p>
        </div>

        {/* 이벤트 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
          {/* 사진 심사 카드 */}
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

          {/* 추첨 이벤트 카드 */}
          <Link href="/events/event-draw" className="group">
            <div className="bg-white/70 backdrop-blur-lg border border-white/40 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:bg-white/85 h-full flex flex-col">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 mx-auto group-hover:scale-110 transition-transform">
                <span className="text-2xl sm:text-3xl">🎰</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3 text-center">추첨 이벤트</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed text-center sm:min-h-[3.25rem]">
                4가지 화려한 연출 효과로
                <br />공정한 추첨을 진행합니다.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-6 mt-auto">
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-violet-100 text-violet-700 rounded-full text-[10px] sm:text-xs font-medium">4가지 연출</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] sm:text-xs font-medium">라운드 추첨</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] sm:text-xs font-medium">결과 기록</span>
              </div>
              <div className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-3 text-center text-sm sm:text-base font-bold text-white shadow-md transition-all group-hover:shadow-lg group-hover:-translate-y-0.5">
                시작하기
              </div>
            </div>
          </Link>

          {/* 참석 관리 카드 */}
          <Link href="/events/attendance" className="group">
            <div className="bg-white/70 backdrop-blur-lg border border-white/40 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:bg-white/85 h-full flex flex-col">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 mx-auto group-hover:scale-110 transition-transform">
                <span className="text-2xl sm:text-3xl">📋</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3 text-center">참석 관리</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed text-center sm:min-h-[3.25rem]">
                QR 체크인으로 실시간 참석 현황
                <br />확인 및 멤버를 관리합니다.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-6 mt-auto">
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] sm:text-xs font-medium">QR 체크인</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-teal-100 text-teal-700 rounded-full text-[10px] sm:text-xs font-medium">실시간 현황</span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-cyan-100 text-cyan-700 rounded-full text-[10px] sm:text-xs font-medium">멤버 관리</span>
              </div>
              <div className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-center text-sm sm:text-base font-bold text-white shadow-md transition-all group-hover:shadow-lg group-hover:-translate-y-0.5">
                시작하기
              </div>
            </div>
          </Link>
        </div>

        {/* 푸터 */}
        <div className="text-center mt-10 sm:mt-16 text-xs sm:text-sm text-gray-400">
          함께 만드는 즐거운 GWP 🌸
        </div>
      </div>
    </div>
  )
}
