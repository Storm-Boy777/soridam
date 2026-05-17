/* eslint-disable @next/next/no-img-element */
'use client'

/* ──────────────────────────────────────────────────────────
 * GWP 라이브 응원 전시 화면 (일회용 — 2026 GWP 행사 / 5·21)
 * Together Challenge 응원 데이터를 시네마틱 슬라이드쇼로 송출.
 * 행사 종료 후 app/events/gwp/live 폴더째 삭제하면 흔적 0.
 * ────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from 'react'

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
  const [phase, setPhase] = useState<'loading' | 'error' | 'playing'>('loading')
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
        setPhase('playing')
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
  return <Slideshow cheers={cheers} />
}

function LoadingScreen({ loaded, total }: { loaded: number; total: number }) {
  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0
  return (
    <main className="flex h-dvh w-screen flex-col items-center justify-center bg-[#0c0c12] text-white">
      <div className="mb-6 text-5xl">🌸</div>
      <p className="text-lg font-medium tracking-wide text-white/80 sm:text-2xl">
        응원을 불러오는 중이에요
      </p>
      <p className="mt-2 text-sm text-white/40">
        {total > 0 ? `사진 ${loaded} / ${total}` : '잠시만요…'}
      </p>
      <div className="mt-6 h-1 w-64 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-white/70 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </main>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <main className="flex h-dvh w-screen flex-col items-center justify-center gap-5 bg-[#0c0c12] px-8 text-center text-white">
      <div className="text-4xl">😢</div>
      <p className="text-lg text-white/80 sm:text-xl">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-full bg-white/15 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/25"
      >
        다시 시도
      </button>
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
    <main className="relative h-dvh w-screen overflow-hidden bg-black">
      {layers.map((layer, i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{
            opacity: i === front ? 1 : 0,
            transition: `opacity ${FADE_MS}ms ease-in-out`,
          }}
        >
          <Slide key={layer.key} cheer={layer.cheer} />
        </div>
      ))}

      {paused && (
        <div className="absolute right-6 top-6 rounded-full bg-black/55 px-3 py-1 text-xs tracking-wide text-white/70">
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

function Slide({ cheer }: { cheer: Cheer }) {
  return cheer.image_url ? <PhotoSlide cheer={cheer} /> : <TextSlide cheer={cheer} />
}

function messageSizeClass(len: number, big = false): string {
  if (big) {
    if (len <= 40) return 'text-3xl sm:text-5xl'
    if (len <= 90) return 'text-2xl sm:text-4xl'
    return 'text-xl sm:text-3xl'
  }
  if (len <= 40) return 'text-2xl sm:text-4xl'
  if (len <= 90) return 'text-xl sm:text-3xl'
  return 'text-lg sm:text-2xl'
}

function PhotoSlide({ cheer }: { cheer: Cheer }) {
  const url = cheer.image_url as string
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* 흐림 배경 — 세로 사진도 화면이 비지 않게 채움 */}
      <img
        src={url}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-3xl"
      />
      {/* 원본 사진 + Ken Burns */}
      <div className="absolute inset-0 flex items-center justify-center p-[3vh]">
        <img
          src={url}
          alt={`${cheer.author_name}님의 응원 사진`}
          className="gwp-kb max-h-[84vh] max-w-[90vw] object-contain shadow-2xl"
        />
      </div>
      {/* 하단 그라데이션 + 글 */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-[6vw] pb-[5vh] pt-[16vh]">
        <div className="mx-auto max-w-4xl text-center">
          <p
            className={`gwp-rise whitespace-pre-line font-serif leading-relaxed text-white drop-shadow ${messageSizeClass(
              cheer.message.length,
            )}`}
          >
            {cheer.message}
          </p>
          <AuthorLine cheer={cheer} />
        </div>
      </div>
    </div>
  )
}

function TextSlide({ cheer }: { cheer: Cheer }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#1a1530] via-[#0e0c1a] to-[#241a12]">
      <div className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-6 h-80 w-80 rounded-full bg-rose-500/10 blur-3xl" />
      <div className="relative mx-auto max-w-4xl px-[8vw] text-center">
        <div className="gwp-rise mb-4 font-serif text-7xl leading-none text-white/15">“</div>
        <p
          className={`gwp-rise whitespace-pre-line font-serif leading-relaxed text-white/95 ${messageSizeClass(
            cheer.message.length,
            true,
          )}`}
        >
          {cheer.message}
        </p>
        <AuthorLine cheer={cheer} />
      </div>
    </div>
  )
}

function AuthorLine({ cheer }: { cheer: Cheer }) {
  const hasReactions = cheer.like_count > 0 || cheer.comment_count > 0
  return (
    <>
      <div className="gwp-rise mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm sm:text-base">
        <span className="font-semibold text-white">{cheer.author_name}</span>
        {cheer.author_part && (
          <>
            <span className="text-white/30">·</span>
            <span className="text-white/60">{cheer.author_part}</span>
          </>
        )}
        <span className="text-white/30">·</span>
        <span className="text-white/50">{formatCheerDate(cheer.created_at)}</span>
      </div>
      {hasReactions && (
        <div className="gwp-rise mt-2.5 flex items-center justify-center gap-4 text-sm text-white/55">
          {cheer.like_count > 0 && <span>❤️ {cheer.like_count}</span>}
          {cheer.comment_count > 0 && <span>💬 {cheer.comment_count}</span>}
        </div>
      )}
    </>
  )
}
