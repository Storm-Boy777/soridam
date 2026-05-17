/* eslint-disable @next/next/no-img-element */
'use client'

/* ──────────────────────────────────────────────────────────
 * GWP 라이브 응원 전시 화면 (일회용 — 2026 GWP 행사 / 5·21)
 * Together Challenge 응원 데이터를 가로형 카드 + 하단 오버레이 글씨로 송출.
 * 행사 종료 후 app/events/gwp/live 폴더째 삭제하면 흔적 0.
 *
 * 화면 구조:
 *   - 카드 프레임(가로 4:3, 88vh)이 화면 정중앙에 한 번만 마운트.
 *   - 카드 내부에 [사진 슬롯 / 하단 글씨 오버레이] 두 슬롯이
 *     각각 absolute로 cross-fade → 프레임은 흔들리지 않음.
 *   - 사진은 contain — 잘리지 않음. 빈 공간은 사진 자체 흐림 배경.
 *   - 글씨(이름·파트·날짜·메시지·좋아요·댓글)는 모두 하단에 겹쳐.
 * ────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

// Together Challenge Supabase — anon(publishable) 키는 공개용이라 클라이언트 노출 무방
const TC_ENDPOINT = 'https://lxhtprptopwrvhugvmgp.supabase.co'
const TC_ANON_KEY = 'sb_publishable_Jh4BwY19IXJcCE-4o4K4tA_nhLVFWVX'
const FEED_PATH =
  '/rest/v1/v_feed_cheers?select=author_name,author_part,message,image_url,like_count,comment_count,created_at'

const SLIDE_MS = 7000
const FADE_MS = 1100
const PRELOAD_TIMEOUT_MS = 20000
// 127장을 한꺼번에 받으면 대역폭이 쪼개져 큰 사진(5~8MB)이 타임아웃에 걸린다 → 동시 수 제한
const PRELOAD_CONCURRENCY = 6

// BGM — 115MB라 git 대신 Supabase Storage(gwp-assets 버킷)에서 스트리밍
const BGM_URL =
  'https://fkkdbnebsaecjpqhhdvl.supabase.co/storage/v1/object/public/gwp-assets/bgm.mp3'
// 홀수여야 좌우 대칭(중앙 1개 + 좌/우 각각 동일 개수)
const BGM_BAR_COUNT = 11

type Cheer = {
  author_name: string
  author_part: string | null
  message: string
  image_url: string | null
  like_count: number
  comment_count: number
  created_at: string
}

function shuffle(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }
    const img = new window.Image()
    img.onload = finish
    img.onerror = finish
    img.src = url
    window.setTimeout(finish, PRELOAD_TIMEOUT_MS)
  })
}

// UTC 저장값을 한국 시간 기준 날짜로 (자정 근처 글이 하루 밀리지 않도록)
function formatCheerDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
  })
}

export default function GwpLivePage() {
  const [phase, setPhase] = useState<'loading' | 'error' | 'ready' | 'playing'>('loading')
  const [cheers, setCheers] = useState<Cheer[]>([])
  const [loaded, setLoaded] = useState(0)
  const [total, setTotal] = useState(0)
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const res = await fetch(TC_ENDPOINT + FEED_PATH, {
          headers: { apikey: TC_ANON_KEY, Authorization: `Bearer ${TC_ANON_KEY}` },
        })
        if (!res.ok) throw new Error(`응원 데이터를 불러오지 못했어요 (HTTP ${res.status})`)

        const data = (await res.json()) as Cheer[]
        if (cancelled) return
        if (!Array.isArray(data) || data.length === 0)
          throw new Error('표시할 응원이 없어요')

        // 사진을 모두 미리 받아둔다 → 슬라이드 전환 시 로딩 끊김 없음 + 행사 중 오프라인 재생
        const imageUrls = data
          .map((c) => c.image_url)
          .filter((u): u is string => !!u)
        setTotal(imageUrls.length)

        // 동시 PRELOAD_CONCURRENCY개씩만 받는 워커 풀 — 큰 사진도 안정적으로 완료
        let done = 0
        let cursor = 0
        async function worker() {
          while (!cancelled && cursor < imageUrls.length) {
            const url = imageUrls[cursor]
            cursor += 1
            await preloadImage(url)
            done += 1
            if (!cancelled) setLoaded(done)
          }
        }
        await Promise.all(
          Array.from({ length: Math.min(PRELOAD_CONCURRENCY, imageUrls.length) }, worker),
        )
        if (cancelled) return

        setCheers(data)
        // 로딩 끝나면 '시작 버튼' 화면으로 — 사용자 클릭 후에 슬라이드+BGM 동시 시작
        // (브라우저 autoplay 정책 우회 + 행사 시작 타이밍 운영자 통제)
        setPhase('ready')
      } catch (e) {
        if (cancelled) return
        setErrMsg(e instanceof Error ? e.message : '알 수 없는 오류가 났어요')
        setPhase('error')
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  if (phase === 'loading') return <LoadingScreen loaded={loaded} total={total} />
  if (phase === 'error') return <ErrorScreen message={errMsg} />
  if (phase === 'ready') return <ReadyScreen onStart={() => setPhase('playing')} />
  return <Slideshow cheers={cheers} />
}

function LoadingScreen({ loaded, total }: { loaded: number; total: number }) {
  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0
  return (
    <main className="relative flex h-dvh w-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#100a20] via-[#0a0712] to-[#1c0e1c] text-white">
      {/* 컬러 블롭 — 다크 배경에 부드러운 깊이 부여 */}
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-rose-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-[28rem] w-[28rem] rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/[0.06] blur-3xl" />

      {/* 행사 타이틀 */}
      <div className="relative mb-12 text-center">
        <div className="mb-2 text-[0.7rem] font-medium tracking-[0.4em] text-white/40 sm:text-xs">
          2026 GWP
        </div>
        <h1 className="font-serif text-3xl text-white/90 sm:text-4xl 2xl:text-5xl">
          Together Challenge
        </h1>
        <p className="mt-2 text-sm text-white/50 sm:text-base">응원의 순간들</p>
      </div>

      {/* 펄스 도트 */}
      <div className="relative mb-6 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="l-dot h-2 w-2 rounded-full bg-white/70"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>

      <p className="relative text-base font-medium text-white/80 sm:text-lg">
        응원을 불러오는 중이에요
      </p>
      <p className="relative mt-1.5 font-mono text-xs text-white/40 sm:text-sm">
        {total > 0 ? `사진 ${loaded} / ${total}` : '잠시만요…'}
      </p>

      {/* 컬러 진행 바 */}
      <div className="relative mt-8 h-1 w-80 max-w-[60vw] overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-rose-300 via-amber-200 to-rose-300 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <style jsx>{`
        @keyframes lpulse {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .l-dot {
          animation: lpulse 1.4s ease-in-out infinite both;
        }
      `}</style>
    </main>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <main className="flex h-dvh w-screen flex-col items-center justify-center gap-5 bg-[#0c0c12] px-8 text-center text-white">
      <div className="text-4xl">😢</div>
      <p className="text-lg text-white/80 sm:text-xl">{message}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-full bg-white/15 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/25"
      >
        다시 시도
      </button>
    </main>
  )
}

/* ──────────────────────────────────────────────────────────
 * 시작 버튼 화면 — 로딩 완료 후 운영자가 행사 시작 타이밍에 클릭.
 * 클릭이 사용자 인터랙션이라 그 직후 마운트되는 BgmPlayer가 정상 자동재생됨.
 * ────────────────────────────────────────────────────────── */
function ReadyScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="relative flex h-dvh w-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#100a20] via-[#0a0712] to-[#1c0e1c] text-white">
      {/* 컬러 블롭 */}
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-rose-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-[28rem] w-[28rem] rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/[0.06] blur-3xl" />

      {/* 행사 타이틀 */}
      <div className="relative mb-14 text-center">
        <div className="mb-3 text-xs font-medium tracking-[0.4em] text-white/45 sm:text-sm">
          2026 GWP
        </div>
        <h1 className="font-serif text-4xl text-white sm:text-5xl 2xl:text-6xl">
          Together Challenge
        </h1>
        <p className="mt-3 text-base text-white/55 sm:text-lg 2xl:text-xl">응원의 순간들</p>
      </div>

      {/* 큰 시작 버튼 */}
      <button
        type="button"
        onClick={onStart}
        className="relative flex items-center gap-3 rounded-full bg-gradient-to-br from-rose-400 to-amber-400 px-9 py-4 text-base font-semibold text-white shadow-[0_20px_50px_-10px_rgba(244,114,182,0.5)] transition-transform duration-200 hover:scale-[1.03] active:scale-95 sm:gap-4 sm:px-12 sm:py-5 sm:text-lg 2xl:px-14 2xl:py-6 2xl:text-xl"
      >
        <svg
          className="h-5 w-5 sm:h-6 sm:w-6 2xl:h-7 2xl:w-7"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M8 5v14l11-7z" />
        </svg>
        이야기 시작
      </button>

      <p className="relative mt-6 text-xs text-white/40 sm:text-sm 2xl:text-base">
        버튼을 누르면 슬라이드와 음악이 함께 시작돼요
      </p>
    </main>
  )
}

function Slideshow({ cheers }: { cheers: Cheer[] }) {
  const orderRef = useRef<number[]>(shuffle(cheers.length))
  const cursorRef = useRef(0)
  const frontRef = useRef(0)
  const keyRef = useRef(1)

  const firstCheer = cheers[orderRef.current[0]]
  const [layers, setLayers] = useState<{ cheer: Cheer; key: number }[]>([
    { cheer: firstCheer, key: 0 },
    { cheer: firstCheer, key: -1 },
  ])
  const [front, setFront] = useState(0)
  const [paused, setPaused] = useState(false)

  // 다음 응원을 뒤쪽(안 보이는) 레이어에 깔고 두 레이어를 교차 페이드
  const advance = useCallback(() => {
    let next = cursorRef.current + 1
    if (next >= orderRef.current.length) {
      orderRef.current = shuffle(cheers.length) // 한 바퀴 끝나면 다시 셔플
      next = 0
    }
    cursorRef.current = next

    const nextCheer = cheers[orderRef.current[next]]
    const back = frontRef.current === 0 ? 1 : 0
    setLayers((prev) => {
      const copy = [...prev]
      copy[back] = { cheer: nextCheer, key: keyRef.current++ }
      return copy
    })
    frontRef.current = back
    setFront(back)
  }, [cheers])

  // 자동 재생 (일시정지 중엔 멈춤)
  useEffect(() => {
    if (paused) return
    const timer = window.setInterval(advance, SLIDE_MS)
    return () => window.clearInterval(timer)
  }, [paused, advance])

  // 운영자용 단축키: Space = 일시정지/재개, → = 다음 (화면엔 표시 안 함)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === 'Space') {
        e.preventDefault()
        setPaused((p) => !p)
      } else if (e.code === 'ArrowRight') {
        advance()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance])

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-[#0c0c12]">
      {/* 화면 흐림 배경 — 카드 뒤로 사진 색감이 번짐 (두 layer cross-fade) */}
      {layers.map((layer, i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{
            opacity: i === front ? 1 : 0,
            transition: `opacity ${FADE_MS}ms ease-in-out`,
          }}
        >
          {layer.cheer.image_url ? (
            <img
              src={layer.cheer.image_url}
              alt=""
              aria-hidden
              className="h-full w-full scale-110 object-cover opacity-45 blur-3xl"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#1c1632] via-[#0d0a1a] to-[#241a14]" />
          )}
        </div>
      ))}
      <div className="absolute inset-0 bg-black/40" />

      {/* 카드 프레임 — 한 번만 마운트, 가로 4:3, 위치/크기 고정 */}
      <div className="absolute inset-0 z-10 flex items-center justify-center p-[3vh]">
        <article className="gwp-rise relative aspect-[4/3] h-[88vh] max-w-[94vw] overflow-hidden rounded-2xl bg-black shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
          {/* 사진/배경 슬롯 — cross-fade */}
          {layers.map((layer, i) => (
            <FadeLayer key={`bg-${i}`} visible={i === front}>
              <SnsCenterSlot key={layer.key} cheer={layer.cheer} />
            </FadeLayer>
          ))}

          {/* 하단 글씨 오버레이 — cross-fade (사진과 동기화) */}
          {layers.map((layer, i) => (
            <FadeLayer key={`fg-${i}`} visible={i === front}>
              <SnsBottomOverlay key={layer.key} cheer={layer.cheer} />
            </FadeLayer>
          ))}

          {/* BGM 플레이어 — 카드 우측 상단에 부착 */}
          <BgmPlayer />
        </article>
      </div>

      {paused && (
        <div className="absolute left-6 top-6 z-30 rounded-full bg-black/55 px-3 py-1 text-xs tracking-wide text-white/70">
          일시정지
        </div>
      )}

      <style jsx global>{`
        @keyframes gwpKenburns {
          from {
            transform: scale(1.04) translate(0, 0);
          }
          to {
            transform: scale(1.16) translate(-1.5%, -1.2%);
          }
        }
        @keyframes gwpRise {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .gwp-kb {
          animation: gwpKenburns ${(SLIDE_MS + FADE_MS) / 1000}s ease-out both;
        }
        .gwp-rise {
          animation: gwpRise 1.5s ease-out both;
        }
      `}</style>
    </main>
  )
}

/* ──────────────────────────────────────────────────────────
 * 카드 안 cross-fade layer
 * ────────────────────────────────────────────────────────── */
function FadeLayer({ visible, children }: { visible: boolean; children: ReactNode }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease-in-out`,
      }}
    >
      {children}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────
 * 카드 사진/배경 슬롯 — 사진(있을 때) / 큰 메시지(없을 때)
 *   사진은 contain — 잘리지 않음. 빈 공간은 같은 사진 흐림 배경.
 * ────────────────────────────────────────────────────────── */
function SnsCenterSlot({ cheer }: { cheer: Cheer }) {
  if (cheer.image_url) {
    return (
      <>
        {/* 카드 안 흐림 배경 — 세로/가로 비율 어떤 사진도 빈 공간 채움 */}
        <img
          src={cheer.image_url}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-55 blur-2xl"
        />
        {/* 사진 본체 — contain (자르지 않음) + Ken Burns */}
        <img
          src={cheer.image_url}
          alt={`${cheer.author_name}님의 응원 사진`}
          className="gwp-kb absolute inset-0 h-full w-full object-contain"
        />
      </>
    )
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#1c1632] via-[#0d0a1a] to-[#241a14] px-[6vh] pb-[28vh] pt-[6vh]">
      <div className="pointer-events-none absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-amber-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-rose-500/15 blur-3xl" />
      <p
        className={`relative whitespace-pre-line text-center font-serif font-medium leading-relaxed text-white ${messageBodyClass(
          cheer.message.length,
        )}`}
      >
        {cheer.message}
      </p>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────
 * 하단 글씨 오버레이 — 이름·파트·날짜 + 메시지 + 좋아요·댓글
 *   사진 위 검정 그라데이션 → 흰 글씨 + drop-shadow로 가독성 확보.
 *   사진 없는 응원의 경우 메시지는 위 영역에 큼 → 캡션 생략.
 * ────────────────────────────────────────────────────────── */
function SnsBottomOverlay({ cheer }: { cheer: Cheer }) {
  const hasReactions = cheer.like_count > 0 || cheer.comment_count > 0
  const isPhoto = !!cheer.image_url
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 via-30% to-transparent px-[4vh] pb-[3.5vh] pt-[13vh]">
      <div className="mx-auto max-w-5xl">
        {/* ── 헤더 한 줄: 이름 · 파트 · 날짜 ── */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          <span className="text-lg font-semibold tracking-tight sm:text-xl 2xl:text-3xl">
            {cheer.author_name}
          </span>
          {cheer.author_part && (
            <>
              <span className="text-white/55">·</span>
              <span className="text-base font-medium text-white/90 sm:text-lg 2xl:text-2xl">
                {cheer.author_part}
              </span>
            </>
          )}
          <span className="text-white/55">·</span>
          <span className="text-base font-medium text-white/75 sm:text-lg 2xl:text-2xl">
            {formatCheerDate(cheer.created_at)}
          </span>
        </div>

        {/* ── 메시지 (사진 있는 응원만 — 사진 없으면 위 영역에 큼) ── */}
        {isPhoto && (
          <p
            className={`mt-3 whitespace-pre-line font-medium leading-relaxed text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] sm:mt-3.5 ${messageCaptionClass(
              cheer.message.length,
            )}`}
          >
            {cheer.message}
          </p>
        )}

        {/* ── 좋아요 · 댓글 ── */}
        {hasReactions && (
          <div className="mt-4 flex items-center gap-5 text-base text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] sm:mt-5 sm:gap-6 sm:text-lg 2xl:gap-8 2xl:text-xl">
            {cheer.like_count > 0 && (
              <span className="flex items-center gap-2">
                <svg
                  className="h-6 w-6 flex-shrink-0 fill-rose-400 sm:h-7 sm:w-7 2xl:h-8 2xl:w-8"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                <span className="font-mono font-semibold">{cheer.like_count}</span>
              </span>
            )}
            {cheer.comment_count > 0 && (
              <span className="flex items-center gap-2">
                <svg
                  className="h-6 w-6 flex-shrink-0 sm:h-7 sm:w-7 2xl:h-8 2xl:w-8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <span className="font-mono font-semibold">{cheer.comment_count}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// 캡션(사진 있는 응원의 메시지) — 행사장 빔 가독성 우선 (한 단계씩 ↑)
function messageCaptionClass(len: number): string {
  if (len <= 40) return 'text-xl sm:text-2xl 2xl:text-3xl'
  if (len <= 120) return 'text-lg sm:text-xl 2xl:text-2xl'
  return 'text-base sm:text-lg 2xl:text-xl'
}

// 큰 메시지(사진 없는 응원) — 카드 중앙에 큼지막하게
function messageBodyClass(len: number): string {
  if (len <= 40) return 'text-3xl sm:text-5xl 2xl:text-6xl'
  if (len <= 90) return 'text-2xl sm:text-4xl 2xl:text-5xl'
  return 'text-xl sm:text-3xl 2xl:text-4xl'
}

function BgmPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number>(0)
  const barsRef = useRef<(HTMLDivElement | null)[]>([])
  // 막대별 현재 높이(%) — peak hold + 감쇄(decay)에 필요
  const heightsRef = useRef<number[]>(Array(BGM_BAR_COUNT).fill(28))
  const [playing, setPlaying] = useState(false)

  // Web Audio 그래프 — 한 번만 구성 (createMediaElementSource는 엘리먼트당 1회만 허용)
  function ensureGraph() {
    if (ctxRef.current || !audioRef.current) return
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const source = ctx.createMediaElementSource(audioRef.current)
    const analyser = ctx.createAnalyser()
    // 해상도 ↑ — 로그 매핑에 유리
    analyser.fftSize = 256
    // smoothing 살짝 — 너무 칼같으면 시각적으로 거칠다
    analyser.smoothingTimeConstant = 0.55
    source.connect(analyser)
    analyser.connect(ctx.destination)
    ctxRef.current = ctx
    analyserRef.current = analyser
  }

  function play() {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = 0.55
    ensureGraph()
    void ctxRef.current?.resume()
    audio.play().catch(() => {})
  }

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) play()
    else audio.pause()
  }

  // 마운트 시 자동재생 시도 (브라우저 정책상 대개 차단됨)
  useEffect(() => {
    play()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동재생이 막혔으면 첫 사용자 입력(클릭·키)에 재생 시작
  useEffect(() => {
    if (playing) return
    const onInteract = () => play()
    window.addEventListener('pointerdown', onInteract)
    window.addEventListener('keydown', onInteract)
    return () => {
      window.removeEventListener('pointerdown', onInteract)
      window.removeEventListener('keydown', onInteract)
    }
  }, [playing])

  // 오디오 재생/정지 상태를 UI에 반영
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [])

  // 실시간 비주얼라이저 — 로그 주파수 매핑 + 좌우 대칭(중앙=베이스) + peak hold/decay
  useEffect(() => {
    if (!playing) {
      heightsRef.current = Array(BGM_BAR_COUNT).fill(28)
      barsRef.current.forEach((bar) => {
        if (bar) bar.style.height = '28%'
      })
      return
    }
    const analyser = analyserRef.current
    if (!analyser) return
    const data = new Uint8Array(analyser.frequencyBinCount) // fftSize 256 → 128 bins

    const half = Math.floor(BGM_BAR_COUNT / 2) // 11이면 5
    // 의미 있는 빈 범위(0~128 중 노이즈 빼고 1~80 정도가 좋다)
    const binLo = 1
    const binHi = 80
    const logLo = Math.log(binLo)
    const logHi = Math.log(binHi)

    function tick() {
      const an = analyserRef.current
      if (!an) return
      an.getByteFrequencyData(data)

      // i = 0(중앙) ~ half(양 끝)
      // 중앙은 베이스(낮은 빈), 양 끝은 트레블(높은 빈) → 로그 스케일로 매핑
      for (let i = 0; i <= half; i++) {
        const ratio = i / half // 0(중앙) ~ 1(끝)
        const logBin = logLo + (logHi - logLo) * ratio
        const bin = Math.min(Math.round(Math.exp(logBin)), data.length - 1)
        // 베이스가 너무 압도하지 않게 살짝 부스트 곡선(중앙쪽일수록 살짝 감소)
        const boost = 1 - ratio * 0.15
        const v = (data[bin] || 0) * boost
        const target = 28 + (v / 255) * 72

        const leftIdx = half - i
        const rightIdx = half + i

        // Peak hold + decay — 빠르게 솟구치고 천천히 떨어진다
        const prevL = heightsRef.current[leftIdx]
        const nextL = target > prevL ? target : prevL * 0.86 + 28 * 0.14
        heightsRef.current[leftIdx] = nextL
        const barL = barsRef.current[leftIdx]
        if (barL) barL.style.height = `${nextL}%`

        if (leftIdx !== rightIdx) {
          const prevR = heightsRef.current[rightIdx]
          // 우측은 좌측과 미세하게 다른 빈을 골라서 완전 거울 대칭을 피한다(생동감)
          const binR = Math.min(bin + 1, data.length - 1)
          const vR = (data[binR] || 0) * boost
          const targetR = 28 + (vR / 255) * 72
          const nextR = targetR > prevR ? targetR : prevR * 0.86 + 28 * 0.14
          heightsRef.current[rightIdx] = nextR
          const barR = barsRef.current[rightIdx]
          if (barR) barR.style.height = `${nextR}%`
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing])

  return (
    <div className="absolute right-5 top-5 z-30 flex items-center gap-2.5 rounded-full border border-white/10 bg-black/40 py-1.5 pl-1.5 pr-4 shadow-xl shadow-black/30 backdrop-blur-xl">
      <audio ref={audioRef} src={BGM_URL} loop crossOrigin="anonymous" preload="auto" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? '음악 일시정지' : '음악 재생'}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow-sm transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        {playing ? (
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1.5" />
            <rect x="14" y="5" width="4" height="14" rx="1.5" />
          </svg>
        ) : (
          <svg className="h-3 w-3 translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="flex h-5 items-end gap-[2px]">
        {Array.from({ length: BGM_BAR_COUNT }).map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              barsRef.current[i] = el
            }}
            className="w-[2px] rounded-full bg-gradient-to-t from-amber-300 to-rose-400"
            style={{ height: '28%', transition: 'height 90ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}
          />
        ))}
      </div>
    </div>
  )
}
