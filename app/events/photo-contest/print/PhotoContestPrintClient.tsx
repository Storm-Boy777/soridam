'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePhotoContestStore } from '@/lib/stores/photoContestStore'
import {
  GWP_PRINT_COMMON_RULES,
  GWP_PRINT_EVENT_TITLE,
  GWP_PRINT_STEPS,
  GWP_PRINT_THEMES,
} from '@/lib/photo-contest/gwpPrintContent'

const DEFAULT_PRINT_ORIGIN = 'https://soridamhub.com'

function normalizeOrigin(value: string) {
  return value.trim().replace(/\/+$/, '')
}

function buildQrUrl(targetUrl: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(targetUrl)}`
}

export default function PhotoContestPrintClient() {
  const { isAuthenticated, authenticate, logout } = usePhotoContestStore()
  const [mounted, setMounted] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [originInput, setOriginInput] = useState(DEFAULT_PRINT_ORIGIN)
  const [fullView, setFullView] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const normalizedOrigin = normalizeOrigin(originInput) || DEFAULT_PRINT_ORIGIN

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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 p-4">
        <div className="w-full max-w-sm rounded-3xl border border-white/40 bg-white/80 p-8 text-center shadow-xl backdrop-blur-lg">
          <div className="mb-4 text-5xl">🖨️</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-800">GWP 프린트 안내물</h1>
          <p className="mb-6 text-sm text-gray-500">프린트 전용 페이지에 입장하려면 비밀번호가 필요합니다.</p>
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setPasswordError(false)
            }}
            onKeyDown={(event) => event.key === 'Enter' && handleAuth()}
            placeholder="비밀번호"
            className={`mb-4 w-full rounded-xl border-2 px-4 py-3 text-center text-lg tracking-widest outline-none transition-colors ${
              passwordError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white focus:border-purple-400'
            }`}
            autoFocus
          />
          {passwordError && <p className="mb-4 text-sm text-red-500">비밀번호가 올바르지 않습니다.</p>}
          <button
            onClick={handleAuth}
            className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-3 font-semibold text-white transition-all hover:from-purple-600 hover:to-pink-600"
          >
            입장하기
          </button>
        </div>
      </div>
    )
  }

  if (fullView) {
    const normalizedOriginFull = normalizeOrigin(originInput) || DEFAULT_PRINT_ORIGIN
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#e5e7eb' }}>
        <div className="fixed top-4 right-4 z-50">
          <button
            type="button"
            onClick={() => setFullView(false)}
            className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-80"
          >
            돌아가기
          </button>
        </div>
        <div className="flex flex-col items-center gap-8 py-8" style={{ backgroundColor: '#e5e7eb' }}>
          {GWP_PRINT_THEMES.map((theme, index) => {
            const uploadUrl = `${normalizedOriginFull}/events/photo-contest/upload/${theme.code}`
            return (
              <section
                key={theme.code}
                className="bg-white shadow-[0_2px_20px_rgba(0,0,0,0.15)]"
                style={{ width: '210mm', height: '297mm', overflow: 'hidden' }}
              >
                <div
                  className="flex flex-col px-[9mm] pb-[5mm] pt-[7mm]"
                  style={{ minHeight: '281mm' }}
                >
                  <section
                    className="rounded-[16px] px-5 py-7 text-white"
                    style={{ backgroundImage: theme.accent, boxShadow: `0 10px 24px ${theme.softColor}` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-[90px] w-[90px] shrink-0 items-center justify-center rounded-[14px] bg-white/15 text-[68px] leading-none">{theme.emoji}</div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[12px] font-semibold text-white/70">{GWP_PRINT_EVENT_TITLE} 사진 콘테스트</span>
                        <h2 className="mt-1 text-[26px] font-black leading-[1.2]">{theme.title}</h2>
                        <p className="mt-0.5 text-[13px] leading-[1.45] text-white/90">{theme.mission}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-center justify-center rounded-[14px] bg-white/15 px-6 py-3">
                        <p className="text-[13px] font-bold uppercase tracking-[0.25em] text-white/60">Theme</p>
                        <p className="text-[54px] font-black leading-none">{String(index + 1).padStart(2, '0')}</p>
                      </div>
                    </div>
                  </section>

                  <section className="mt-2.5">
                    <div className="rounded-[14px] border p-3" style={{ borderColor: theme.softColor, background: `linear-gradient(180deg, ${theme.softColor} 0%, rgba(255,255,255,0.92) 100%)` }}>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-[10px] bg-white/85 px-3 py-2">
                          <p className="text-[11px] font-black uppercase tracking-[0.15em]" style={{ color: theme.themeColor }}>촬영 장소</p>
                          <p className="mt-0.5 text-[13px] font-bold text-slate-900">{theme.location}</p>
                        </div>
                        <div className="rounded-[10px] bg-white/85 px-3 py-2">
                          <p className="text-[11px] font-black uppercase tracking-[0.15em]" style={{ color: theme.themeColor }}>제출 방식</p>
                          <p className="mt-0.5 text-[13px] font-bold text-slate-900">QR → 사진 1장 업로드</p>
                        </div>
                        <div className="rounded-[10px] bg-white/85 px-3 py-2">
                          <p className="text-[11px] font-black uppercase tracking-[0.15em]" style={{ color: theme.themeColor }}>심사 방식</p>
                          <p className="mt-0.5 text-[13px] font-bold text-slate-900">테마별 1~8위 → 종합</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="mt-2.5 grid grid-cols-2 items-stretch gap-2.5">
                    <div className="rounded-[14px] border border-slate-200 bg-white p-3">
                      <h3 className="text-[15px] font-black text-slate-900">공통 제출 룰</h3>
                      <div className="mt-2 grid gap-1">
                        {GWP_PRINT_COMMON_RULES.map((rule) => (
                          <div key={`fv-${theme.code}-${rule.title}`} className="grid grid-cols-[3px_minmax(0,1fr)] overflow-hidden rounded-[8px] bg-slate-50">
                            <div className="rounded-l-[8px]" style={{ backgroundColor: theme.themeColor }} />
                            <div className="px-2.5 py-[5px]">
                              <p className="text-[13px] font-black" style={{ color: theme.themeColor }}>{rule.title}</p>
                              <p className="text-[12px] leading-[1.4] text-slate-500">{rule.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <hr className="mt-2.5 border-t border-dashed border-slate-200" />
                      <h3 className="mt-2.5 text-[15px] font-black text-slate-900">촬영 체크포인트</h3>
                      <div className="mt-2 grid gap-1">
                        {theme.photoTips.map((tip) => (
                          <div key={`fv-${theme.code}-${tip.title}`} className="grid grid-cols-[3px_minmax(0,1fr)] overflow-hidden rounded-[8px] bg-slate-50">
                            <div className="rounded-l-[8px]" style={{ backgroundColor: theme.themeColor }} />
                            <div className="px-2.5 py-[5px]">
                              <p className="text-[13px] font-black" style={{ color: theme.themeColor }}>{tip.title}</p>
                              <p className="text-[12px] leading-[1.4] text-slate-500">{tip.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col rounded-[14px] border border-slate-200 bg-white p-3">
                      <div className="flex items-stretch gap-3 rounded-[10px] py-2.5 pl-3.5 pr-2.5 text-white" style={{ backgroundImage: theme.accent }}>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col items-stretch gap-1">
                            <div className="flex items-center gap-2 rounded-[8px] bg-white/15 px-2.5 py-1.5">
                              <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-white/25 text-[10px] font-black">1</span>
                              <p className="whitespace-nowrap text-[12px] font-bold leading-[1.35]">사진 촬영 후 QR 스캔</p>
                            </div>
                            <p className="text-center text-[11px] leading-none text-white/50">↓</p>
                            <div className="flex items-center gap-2 rounded-[8px] bg-white/15 px-2.5 py-1.5">
                              <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-white/25 text-[10px] font-black">2</span>
                              <p className="whitespace-nowrap text-[12px] font-bold leading-[1.35]">최종 사진 저장</p>
                            </div>
                            <p className="text-center text-[11px] leading-none text-white/50">↓</p>
                            <div className="flex items-center gap-2 rounded-[8px] bg-white/15 px-2.5 py-1.5">
                              <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-white/25 text-[10px] font-black">3</span>
                              <p className="whitespace-nowrap text-[12px] font-bold leading-[1.35]">저장 완료 메시지 확인!</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-center">
                          <img src={buildQrUrl(uploadUrl)} alt={`${theme.shortTitle} QR`} className="h-[130px] w-[130px] rounded-lg bg-white p-1" />
                          <p className="mt-0.5 text-[10px] font-bold text-white/60">QR 스캔</p>
                        </div>
                      </div>
                      <hr className="mt-2.5 border-t border-dashed border-slate-200" />
                      <div className="mt-2.5 flex items-center justify-between">
                        <h3 className="text-[15px] font-black text-slate-900">현장 진행 순서</h3>
                        <span className="rounded-full px-2 py-0.5 text-[10.5px] font-black" style={{ backgroundColor: theme.softColor, color: theme.themeColor }}>SCAN TO SAVE</span>
                      </div>
                      <div className="mt-2 flex flex-1 flex-col justify-evenly gap-1">
                        {GWP_PRINT_STEPS.map((step, stepIndex) => (
                          <div key={`fv-${theme.code}-step-${stepIndex}`} className="flex items-center gap-2.5 rounded-[8px] bg-slate-50 px-3 py-[6px]">
                            <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full text-[12px] font-black text-white" style={{ backgroundColor: theme.themeColor }}>{stepIndex + 1}</span>
                            <p className="text-[13px] leading-[1.4] text-slate-700">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="mt-2.5 flex-1 rounded-[14px] border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-[15px] font-black text-slate-900">{theme.shortTitle} 평가 기준</h3>
                        <p className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: theme.themeColor }}>AI 심사</p>
                      </div>
                      <span className="rounded-full px-2.5 py-0.5 text-[10.5px] font-black" style={{ backgroundColor: theme.softColor, color: theme.themeColor }}>총점 100점</span>
                    </div>
                    <div className="mt-2 grid gap-2">
                      {theme.criteria.map((criterion) => (
                        <div key={`fv-${theme.code}-${criterion.label}`} className="grid grid-cols-[120px_44px_minmax(0,1fr)] items-center gap-3 rounded-[10px] border px-3.5 py-[7px]" style={{ borderColor: theme.softColor, backgroundColor: theme.softColor }}>
                          <p className="text-[13px] font-black text-slate-900">{criterion.label}</p>
                          <span className="rounded-full bg-white px-2 py-0.5 text-center text-[12px] font-black" style={{ color: theme.themeColor }}>{criterion.score}점</span>
                          <p className="text-[12px] leading-[1.4] text-slate-600">{criterion.description}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <footer className="mt-2 flex items-center justify-between border-t border-dashed border-slate-200 pt-2 text-[11px] text-slate-400">
                    <p><b className="font-bold text-slate-600">행사명</b> {GWP_PRINT_EVENT_TITLE}</p>
                    <p><b className="font-bold text-slate-600">테마별 심사</b> 1위 ~ 8위</p>
                    <p><b className="font-bold text-slate-600">최종 결과</b> 5개 테마 총점 종합 순위</p>
                  </footer>
                </div>
              </section>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 8mm;
        }

        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          body {
            background: #ffffff !important;
          }

          .photo-print-controls {
            display: none !important;
          }

          .photo-print-shell {
            padding: 0 !important;
            background: #ffffff !important;
          }

          .photo-print-pages {
            padding: 0 !important;
          }

          .photo-print-sheet {
            width: auto !important;
            min-height: auto !important;
            margin: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            break-after: page;
            page-break-after: always;
          }

          .photo-print-sheet:last-child {
            break-after: auto;
            page-break-after: auto;
          }

          .photo-print-sheet-inner {
            min-height: auto !important;
          }
        }
      `}</style>

      <div
        className="photo-print-shell min-h-screen"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(99, 102, 241, 0.16), transparent 28%), radial-gradient(circle at top right, rgba(236, 72, 153, 0.14), transparent 26%), linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
        }}
      >
        <header className="photo-print-controls sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <Link href="/events/photo-contest" className="text-gray-400 transition-colors hover:text-gray-700">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-500">Print Studio</p>
                <h1 className="text-lg font-black text-gray-900 sm:text-2xl">GWP 테마별 QR 프린트 안내물</h1>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                QR 기본 주소
                <input
                  type="text"
                  value={originInput}
                  onChange={(event) => setOriginInput(event.target.value)}
                  className="min-w-[320px] rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium tracking-normal text-gray-700 outline-none transition-colors focus:border-purple-300"
                />
              </label>
              <button
                type="button"
                onClick={() => setOriginInput(DEFAULT_PRINT_ORIGIN)}
                className="rounded-full border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                기본 주소
              </button>
              <button
                type="button"
                onClick={() => setFullView(true)}
                className="rounded-full border border-purple-300 bg-purple-50 px-5 py-3 text-sm font-semibold text-purple-700 transition-colors hover:bg-purple-100"
              >
                전체 보기
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5"
              >
                A4 인쇄
              </button>
              <a
                href="/events/photo-contest"
                className="rounded-full border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                나가기
              </a>
            </div>
          </div>
          <p className="px-4 pb-4 text-center text-xs text-gray-500">
            인쇄 전 브라우저에서 배경 그래픽 사용을 켜면 화면과 가장 비슷하게 출력됩니다.
          </p>
        </header>

        <main className="photo-print-pages py-6">
          {GWP_PRINT_THEMES.map((theme, index) => {
            const uploadUrl = `${normalizedOrigin}/events/photo-contest/upload/${theme.code}`

            return (
              <section
                key={theme.code}
                className="photo-print-sheet mx-auto mb-4 overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_26px_70px_rgba(15,23,42,0.14)]"
                style={{ width: '210mm', minHeight: '281mm' }}
              >
                <div
                  className="photo-print-sheet-inner flex flex-col px-[9mm] pb-[5mm] pt-[7mm]"
                  style={{ minHeight: '281mm' }}
                >
                  {/* 헤더 배너 */}
                  <section
                    className="rounded-[16px] px-5 py-7 text-white"
                    style={{
                      backgroundImage: theme.accent,
                      boxShadow: `0 10px 24px ${theme.softColor}`,
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-[90px] w-[90px] shrink-0 items-center justify-center rounded-[14px] bg-white/15 text-[68px] leading-none">
                        {theme.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[12px] font-semibold text-white/70">{GWP_PRINT_EVENT_TITLE} 사진 콘테스트</span>
                        <h2 className="mt-1 text-[26px] font-black leading-[1.2]">{theme.title}</h2>
                        <p className="mt-0.5 text-[13px] leading-[1.45] text-white/90">{theme.mission}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-center justify-center rounded-[14px] bg-white/15 px-6 py-3">
                        <p className="text-[13px] font-bold uppercase tracking-[0.25em] text-white/60">Theme</p>
                        <p className="text-[54px] font-black leading-none">{String(index + 1).padStart(2, '0')}</p>
                      </div>
                    </div>
                  </section>

                  {/* 정보 카드 */}
                  <section className="mt-2.5">
                    <div
                      className="rounded-[14px] border p-3"
                      style={{
                        borderColor: theme.softColor,
                        background: `linear-gradient(180deg, ${theme.softColor} 0%, rgba(255,255,255,0.92) 100%)`,
                      }}
                    >
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-[10px] bg-white/85 px-3 py-2">
                          <p className="text-[11px] font-black uppercase tracking-[0.15em]" style={{ color: theme.themeColor }}>촬영 장소</p>
                          <p className="mt-0.5 text-[13px] font-bold text-slate-900">{theme.location}</p>
                        </div>
                        <div className="rounded-[10px] bg-white/85 px-3 py-2">
                          <p className="text-[11px] font-black uppercase tracking-[0.15em]" style={{ color: theme.themeColor }}>제출 방식</p>
                          <p className="mt-0.5 text-[13px] font-bold text-slate-900">QR → 사진 1장 업로드</p>
                        </div>
                        <div className="rounded-[10px] bg-white/85 px-3 py-2">
                          <p className="text-[11px] font-black uppercase tracking-[0.15em]" style={{ color: theme.themeColor }}>심사 방식</p>
                          <p className="mt-0.5 text-[13px] font-bold text-slate-900">테마별 1~8위 → 종합</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* 공통룰+체크포인트 | QR+안내멘트+진행순서 */}
                  <section className="mt-2.5 grid grid-cols-2 items-stretch gap-2.5">
                    <div className="rounded-[14px] border border-slate-200 bg-white p-3">
                      <h3 className="text-[15px] font-black text-slate-900">공통 제출 룰</h3>
                      <div className="mt-2 grid gap-1">
                        {GWP_PRINT_COMMON_RULES.map((rule) => (
                          <div
                            key={`${theme.code}-${rule.title}`}
                            className="grid grid-cols-[3px_minmax(0,1fr)] overflow-hidden rounded-[8px] bg-slate-50"
                          >
                            <div className="rounded-l-[8px]" style={{ backgroundColor: theme.themeColor }} />
                            <div className="px-2.5 py-[5px]">
                              <p className="text-[13px] font-black" style={{ color: theme.themeColor }}>{rule.title}</p>
                              <p className="text-[12px] leading-[1.4] text-slate-500">{rule.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <hr className="mt-2.5 border-t border-dashed border-slate-200" />
                      <h3 className="mt-2.5 text-[15px] font-black text-slate-900">촬영 체크포인트</h3>
                      <div className="mt-2 grid gap-1">
                        {theme.photoTips.map((tip) => (
                          <div
                            key={`${theme.code}-${tip.title}`}
                            className="grid grid-cols-[3px_minmax(0,1fr)] overflow-hidden rounded-[8px] bg-slate-50"
                          >
                            <div className="rounded-l-[8px]" style={{ backgroundColor: theme.themeColor }} />
                            <div className="px-2.5 py-[5px]">
                              <p className="text-[13px] font-black" style={{ color: theme.themeColor }}>{tip.title}</p>
                              <p className="text-[12px] leading-[1.4] text-slate-500">{tip.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col rounded-[14px] border border-slate-200 bg-white p-3">
                      <div
                        className="flex items-stretch gap-3 rounded-[10px] py-2.5 pl-3.5 pr-2.5 text-white"
                        style={{ backgroundImage: theme.accent }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col items-stretch gap-1">
                            <div className="flex items-center gap-2 rounded-[8px] bg-white/15 px-2.5 py-1.5">
                              <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-white/25 text-[10px] font-black">1</span>
                              <p className="whitespace-nowrap text-[12px] font-bold leading-[1.35]">사진 촬영 후 QR 스캔</p>
                            </div>
                            <p className="text-center text-[11px] leading-none text-white/50">↓</p>
                            <div className="flex items-center gap-2 rounded-[8px] bg-white/15 px-2.5 py-1.5">
                              <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-white/25 text-[10px] font-black">2</span>
                              <p className="whitespace-nowrap text-[12px] font-bold leading-[1.35]">최종 사진 저장</p>
                            </div>
                            <p className="text-center text-[11px] leading-none text-white/50">↓</p>
                            <div className="flex items-center gap-2 rounded-[8px] bg-white/15 px-2.5 py-1.5">
                              <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-white/25 text-[10px] font-black">3</span>
                              <p className="whitespace-nowrap text-[12px] font-bold leading-[1.35]">저장 완료 메시지 확인!</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-center">
                          <img
                            src={buildQrUrl(uploadUrl)}
                            alt={`${theme.shortTitle} 업로드 QR 코드`}
                            className="h-[130px] w-[130px] rounded-lg bg-white p-1"
                          />
                          <p className="mt-0.5 text-[10px] font-bold text-white/60">QR 스캔</p>
                        </div>
                      </div>

                      <hr className="mt-2.5 border-t border-dashed border-slate-200" />
                      <div className="mt-2.5 flex items-center justify-between">
                        <h3 className="text-[15px] font-black text-slate-900">현장 진행 순서</h3>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10.5px] font-black"
                          style={{ backgroundColor: theme.softColor, color: theme.themeColor }}
                        >
                          SCAN TO SAVE
                        </span>
                      </div>
                      <div className="mt-2 flex flex-1 flex-col justify-evenly gap-1">
                        {GWP_PRINT_STEPS.map((step, stepIndex) => (
                          <div key={`${theme.code}-step-${stepIndex}`} className="flex items-center gap-2.5 rounded-[8px] bg-slate-50 px-3 py-[6px]">
                            <span
                              className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full text-[12px] font-black text-white"
                              style={{ backgroundColor: theme.themeColor }}
                            >
                              {stepIndex + 1}
                            </span>
                            <p className="text-[13px] leading-[1.4] text-slate-700">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  {/* AI 심사 기준 */}
                  <section className="mt-2.5 flex-1 rounded-[14px] border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-[15px] font-black text-slate-900">{theme.shortTitle} 평가 기준</h3>
                        <p className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: theme.themeColor }}>AI 심사</p>
                      </div>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10.5px] font-black"
                        style={{ backgroundColor: theme.softColor, color: theme.themeColor }}
                      >
                        총점 100점
                      </span>
                    </div>

                    <div className="mt-2 grid gap-2">
                      {theme.criteria.map((criterion) => (
                        <div
                          key={`${theme.code}-${criterion.label}`}
                          className="grid grid-cols-[120px_44px_minmax(0,1fr)] items-center gap-3 rounded-[10px] border px-3.5 py-[7px]"
                          style={{ borderColor: theme.softColor, backgroundColor: theme.softColor }}
                        >
                          <p className="text-[13px] font-black text-slate-900">{criterion.label}</p>
                          <span
                            className="rounded-full bg-white px-2 py-0.5 text-center text-[12px] font-black"
                            style={{ color: theme.themeColor }}
                          >
                            {criterion.score}점
                          </span>
                          <p className="text-[12px] leading-[1.4] text-slate-600">{criterion.description}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Footer */}
                  <footer className="mt-2 flex items-center justify-between border-t border-dashed border-slate-200 pt-2 text-[11px] text-slate-400">
                    <p><b className="font-bold text-slate-600">행사명</b> {GWP_PRINT_EVENT_TITLE}</p>
                    <p><b className="font-bold text-slate-600">테마별 심사</b> 1위 ~ 8위</p>
                    <p><b className="font-bold text-slate-600">최종 결과</b> 5개 테마 총점 종합 순위</p>
                  </footer>
                </div>
              </section>
            )
          })}
        </main>
      </div>
    </>
  )
}
