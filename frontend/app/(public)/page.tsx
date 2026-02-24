"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Plus, Check } from "lucide-react";
import ScrollReveal from "@/components/motion/ScrollReveal";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

/* ── 컬러 팔레트 (웜 톤) ──
   accent:  #D4835E (테라코타 코랄)
   dark:    #3A2E25 (웜 브라운)
   text:    #4A3F36 (본문)
   sub:     #8B7E72 (보조)
   muted:   #B5A99D (뮤트)
   cream:   #FAF6F1 (배경)
   warm-bg: #F3ECE4 (섹션 배경)
   border:  #EAE0D5
   card:    #FFFCF8
*/

/* ── 데이터 ── */

const services = [
  {
    num: "01",
    title: "조명을 켜는 데이터",
    badge: "시험후기",
    desc: "어떤 질문이 나올지 몰라 남의 대본을 뒤적이지 마세요. 오픽톡닥의 데이터가 내일 시험에 나올 진짜 질문들만 선별해, 당신이 서야 할 무대에 정확히 조명을 비춰줍니다.",
    featured: false,
  },
  {
    num: "02",
    title: "나의 일상이 스크립트로",
    badge: "스크립트",
    desc: '"퇴근 후 마시는 맥주 한 캔" 같은 당신의 평범한 일상을 가져오세요. AI가 그 진심 어린 경험을 가장 자연스럽고 돋보이는 영어 대사로 다듬어 드립니다.',
    featured: true,
  },
  {
    num: "03",
    title: "주인공의 완벽한 리허설",
    badge: "모의고사",
    desc: "내 진짜 이야기이기에 입에 맴돌지 않고 가슴에서 나옵니다. 내 삶이 담긴 대본으로 실전과 똑같은 무대에서 리허설하며, 긴장감을 완벽한 자신감으로 바꿉니다.",
    featured: true,
  },
  {
    num: "04",
    title: "디테일을 살리는 튜터링",
    badge: "튜터링",
    desc: "모의고사 결과에서 약점을 진단하고, 미세한 빈틈을 잡아줍니다. 당신의 진심이 채점관에게 더 깊이 닿도록 돕는 섬세한 디렉팅입니다.",
    featured: false,
  },
  {
    num: "05",
    title: "큐 사인, 그리고 나다운 40분",
    badge: null,
    desc: "이제 시험장에 남의 이야기를 멈추고, 그냥 당신의 진짜 모습을 보여주세요. 가장 나다울 때, 당신의 점수는 가장 빛납니다.",
    featured: false,
  },
];

const illustrations = [
  { src: "/images/hero-beer.jpeg", caption: "퇴근 후 맥주 한 캔" },
  { src: "/images/hero-coffee.jpeg", caption: "주말 아침 커피" },
  { src: "/images/hero-sofa.jpeg", caption: "소파 위 넷플릭스" },
  { src: "/images/hero-game.jpeg", caption: "친구랑 게임" },
  { src: "/images/hero-chat.jpeg", caption: "친구와 수다" },
];

const faqs = [
  {
    q: "오픽톡닥은 어떤 서비스인가요?",
    a: "AI 기반 OPIc 영어 말하기 학습 플랫폼입니다. 수험생 후기 데이터로 출제 범위를 좁혀주고, 당신의 진짜 일상을 자연스러운 영어 스크립트로 만들어 드립니다. 모의고사, 튜터링, 쉐도잉까지 한곳에서 준비할 수 있습니다.",
  },
  {
    q: "평범한 일상으로 스크립트가 되나요?",
    a: "네, 그게 핵심입니다. OPIc은 화려한 경험이 아니라 '자연스러운 나의 이야기'를 평가합니다. 퇴근 후 맥주 한 캔, 주말 넷플릭스 같은 소소한 일상이 가장 좋은 재료예요.",
  },
  {
    q: "무료 체험은 어떻게 이용하나요?",
    a: "회원가입만 하면 무료 플랜이 자동 적용됩니다. 샘플 모의고사 1회, AI 튜터링 무료, 쉐도잉 훈련 무제한으로 핵심 기능을 바로 경험할 수 있습니다.",
  },
  {
    q: "언제든지 해지할 수 있나요?",
    a: "네, 유료 플랜은 언제든지 해지할 수 있으며 다음 결제일부터 적용됩니다. 결제일로부터 7일 이내에는 전액 환불도 가능합니다.",
  },
];

/* ── 카운트업 컴포넌트 ── */
function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 1500;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ── 라벨 필 컴포넌트 ── */
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D4835E]/[0.1] px-3 py-1 text-[0.7rem] font-bold tracking-wide text-[#D4835E] sm:px-[18px] sm:py-2 sm:text-[0.85rem]">
      {children}
    </span>
  );
}

/* ── 페이지 ── */
export default function HomePage() {
  return (
    <>
      {/* ━━━ 1. Hero — 따뜻한 크림, 편안한 일상 ━━━ */}
      <section className="relative overflow-hidden bg-[#FAF6F1] px-5 pb-20 pt-24 sm:pb-28 sm:pt-32">
        {/* 배경 — 따뜻한 조명 글로우 */}
        <div className="pointer-events-none absolute left-1/2 top-[-100px] h-[600px] w-[600px] -translate-x-1/2 bg-[radial-gradient(circle,rgba(212,131,94,0.08)_0%,transparent_70%)]" />

        <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
          <motion.span
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE0D5] bg-white/60 px-3 py-1 text-[0.7rem] font-bold tracking-wide text-[#8B7E72] sm:px-[18px] sm:py-2 sm:text-[0.85rem]"
          >
            평범한 하루, 완벽한 대본.
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
            className="mt-8 text-[26px] font-extrabold leading-[1.3] tracking-[-0.04em] text-[#3A2E25] sm:text-[2.8rem] md:text-[3.4rem]"
          >
            화려한 필터는 끄세요.
            <br />
            <span className="text-[#D4835E]">
              당신이 평범하게 보내는 일상들이
            </span>
            <br />
            가장 완벽한 대본입니다.
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
            className="mt-8 w-[310px] rounded-2xl border border-[#EAE0D5] bg-white/50 px-6 py-7 backdrop-blur-sm sm:w-[530px] sm:px-10 sm:py-9"
          >
            <div className="text-[0.8rem] leading-[1.9] text-[#8B7E72] sm:text-[1.05rem]">
              <p>
                퇴근길에 듣는 플레이리스트,
                <br className="hidden sm:block" />{" "}
                주말마다 찾는 단골 카페의 아메리카노,
                <br className="hidden sm:block" />{" "}
                친구와 나누는 쓸데없이 긴 수다.
                <br className="hidden sm:block" />{" "}
                그 익숙한 일상이 OPIc에서 가장 빛나는 대본입니다.
              </p>
            </div>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: "easeOut" }}
            className="mt-6 text-[1.05rem] font-bold leading-[1.8] text-[#3A2E25] sm:text-[1.15rem]"
          >
            당신의 이야기를 시작하세요.
            <br className="hidden sm:block" />{" "}
            내 삶의 대본에서는,
            <br className="sm:hidden" />{" "}
            이미 내가 주인공이니까요.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
          >
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-[#D4835E] px-8 py-[15px] text-[15px] font-bold text-white shadow-[0_4px_20px_rgba(212,131,94,0.25)] transition-all hover:-translate-y-px hover:bg-[#C07350]"
            >
              무료로 시작하기 <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-full border border-[#EAE0D5] bg-white px-8 py-[15px] text-[15px] font-bold text-[#4A3F36] transition-colors hover:bg-[#F3ECE4]"
            >
              요금제 보기
            </Link>
          </motion.div>
        </div>

        {/* 일상 일러스트 갤러리 — Staggered Slide-in */}
        <div className="relative mx-auto mt-16 max-w-[1100px] sm:mt-20">
          <ScrollReveal preset="fade-up" duration={0.5}>
            <p className="mb-6 text-center text-[0.85rem] text-[#B5A99D]">
              이 모든 순간이, 당신만의 대본입니다
            </p>
          </ScrollReveal>
          <div className="flex gap-3 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4 md:grid md:grid-cols-5 md:overflow-visible md:px-6">
            {illustrations.map((ill, i) => (
              <ScrollReveal
                key={ill.caption}
                preset="fade-left"
                delay={i * 0.12}
                duration={0.6}
                className="w-[36vw] flex-shrink-0 sm:w-[28vw] md:w-auto"
              >
                <div className="overflow-hidden rounded-2xl">
                  <Image
                    src={ill.src}
                    alt={ill.caption}
                    width={900}
                    height={1200}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
                <p className="mt-2.5 text-center text-[0.8rem] font-medium text-[#8B7E72]">
                  {ill.caption}
                </p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ 2. Stats (전략 넛지) — 2단 레이아웃 ━━━ */}
      <section className="bg-white py-20 sm:py-[120px]">
        <div className="mx-auto grid max-w-[1080px] grid-cols-1 items-center gap-12 px-6 md:grid-cols-2 md:gap-20">
          {/* 왼쪽: 질문 카드 */}
          <div>
            <ScrollReveal preset="fade-up">
              <Pill>전략 점검</Pill>
              <h2 className="mt-5 text-[1.8rem] font-extrabold leading-[1.3] tracking-[-0.03em] text-[#3A2E25] sm:text-[2.4rem]">
                OPIc, 정말 알고
                <br />
                준비하고 계세요?
              </h2>
            </ScrollReveal>
            <div className="mt-8 space-y-2.5">
              {[
                { quote: "\u201c서베이가 중요하다더라\u201d", nudge: "얼마나?" },
                { quote: "\u201c5-5가 좋다더라\u201d", nudge: "왜?" },
                { quote: "\u201c스크립트 외우면 안 된대\u201d", nudge: "대안이 뭔데?" },
              ].map((item, i) => (
                <ScrollReveal key={item.quote} preset="fade-left" delay={i * 0.1} duration={0.5}>
                  <div className="grid grid-cols-[13fr_auto_7fr] items-center rounded-[14px] bg-[#FAF6F1] px-3 py-5 text-[0.95rem] text-[#8B7E72] transition-colors hover:bg-[#F3ECE4] sm:px-4 sm:text-[1rem]">
                    <span className="text-left">{item.quote}</span>
                    <span className="px-3 font-bold text-[#3A2E25]">→</span>
                    <strong className="text-right font-bold text-[#3A2E25]">{item.nudge}</strong>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>

          {/* 오른쪽: 68% — 카운트업 */}
          <ScrollReveal preset="fade-up" delay={0.2}>
            <div className="text-center">
              <p className="text-[1.05rem] text-[#8B7E72]">대충 아는 사람의</p>
              <p className="font-serif text-[4rem] font-bold leading-none tracking-[-0.05em] text-[#D4835E] sm:text-[7rem] md:text-[9rem]">
                <CountUp target={68} suffix="%" />
              </p>
              <p className="mt-2 text-[1.05rem] text-[#8B7E72]">
                가 IM2 이하입니다
              </p>
              <Link
                href="/strategy"
                className="mt-7 inline-flex items-center gap-1.5 rounded-full bg-[#3A2E25] px-8 py-3.5 text-[15px] font-bold text-white transition-all hover:-translate-y-px hover:bg-[#4A3F36]"
              >
                정확히 알아보기 <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* 브릿지 카피 */}
      <ScrollReveal preset="fade-in" duration={0.8}>
        <div className="bg-white px-6 pb-10 text-center text-[1rem] text-[#8B7E72] sm:text-[1.05rem]">
          그래서 오픽톡닥은{" "}
          <strong className="text-[#3A2E25]">정확한 데이터</strong>와{" "}
          <strong className="text-[#3A2E25]">당신만의 이야기</strong>로
          준비합니다.
        </div>
      </ScrollReveal>

      {/* ━━━ 3. Journey (서비스) — 핵심 02/03 강조 ━━━ */}
      <section id="features" className="rounded-t-[32px] bg-[#F3ECE4] py-20 sm:rounded-t-[48px] sm:py-[120px]">
        <div className="mx-auto max-w-[1080px] px-6">
          <ScrollReveal preset="fade-up" className="mb-14 text-center sm:mb-16">
            <Pill>당신의 무대를 돕는 방법</Pill>
            <h2 className="mt-4 text-[1.8rem] font-extrabold tracking-[-0.03em] text-[#3A2E25] [word-break:keep-all] sm:text-[2.4rem]">
              오픽톡닥이 당신의{" "}
              <br className="sm:hidden" />
              무대를 준비합니다
            </h2>
          </ScrollReveal>

          <div className="mx-auto flex max-w-[800px] flex-col gap-3.5">
            {services.map((s, i) => (
              <ScrollReveal
                key={s.num}
                preset="fade-up"
                delay={i * 0.08}
                duration={0.5}
              >
                <div
                  className={`flex flex-col gap-3 rounded-[20px] p-7 transition-all sm:flex-row sm:gap-8 sm:p-10 ${
                    s.featured
                      ? "bg-[#3A2E25] text-white shadow-[0_20px_48px_rgba(58,46,37,0.12)]"
                      : "border border-transparent bg-white hover:-translate-y-[3px] hover:border-[#EAE0D5] hover:shadow-[0_16px_40px_rgba(58,46,37,0.06)]"
                  }`}
                >
                  <span
                    className={`font-serif text-[2rem] font-bold leading-[0.85] sm:text-[3rem] ${
                      s.featured
                        ? "text-[rgba(212,131,94,0.35)]"
                        : "text-[rgba(212,131,94,0.15)]"
                    }`}
                  >
                    {s.num}
                  </span>
                  <div className="flex-1">
                    <h3 className="flex items-center justify-between gap-2 text-[1.15rem] font-bold [word-break:keep-all] sm:justify-start sm:text-[1.25rem]">
                      {s.title}
                      {s.badge && (
                        <span
                          className={`shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-[0.7rem] font-bold ${
                            s.featured
                              ? "bg-[#D4835E] text-white"
                              : "bg-[#F3ECE4] text-[#8B7E72]"
                          }`}
                        >
                          {s.badge}
                        </span>
                      )}
                    </h3>
                    <p
                      className={`mt-2 text-[0.95rem] leading-[1.75] sm:text-[1rem] ${
                        s.featured ? "text-white/60" : "text-[#8B7E72]"
                      }`}
                    >
                      {s.desc}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ 4. Pricing — 요금제 3단 ━━━ */}
      <section className="bg-[#FAF6F1] py-20 sm:py-[120px]">
        <div className="mx-auto max-w-[1080px] px-6">
          <ScrollReveal preset="fade-up" className="mb-14 text-center">
            <Pill>요금제</Pill>
            <h2 className="mt-4 text-[1.8rem] font-extrabold tracking-[-0.03em] text-[#3A2E25] [word-break:keep-all] sm:text-[2.4rem]">
              나에게 맞는 플랜을 선택하세요
            </h2>
            <p className="mt-3 text-[1rem] text-[#8B7E72]">
              무료 플랜으로 바로 시작하세요.
            </p>
          </ScrollReveal>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {/* 체험 */}
            <ScrollReveal preset="fade-up" delay={0}>
              <div className="flex h-full flex-col rounded-[20px] border border-[#EAE0D5] bg-white p-8">
                <span className="text-[15px] font-semibold text-[#8B7E72]">
                  체험
                </span>
                <div className="mt-2 flex items-baseline">
                  <span className="font-serif text-[2.5rem] font-bold text-[#3A2E25]">
                    ₩0
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#B5A99D]">
                  OPIc이 어떤 시험인지 경험해 보세요
                </p>
                <div className="my-6 h-px bg-[#EAE0D5]" />
                <ul className="flex-1 space-y-3">
                  {[
                    "샘플 모의고사 1회 (고정문제)",
                    "AI 진단 · 튜터링 무료",
                    "체화 · 쉐도잉 훈련 무제한",
                  ].map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2.5 text-sm text-[#4A3F36]"
                    >
                      <Check className="h-4 w-4 shrink-0 text-[#D4835E]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="mt-8 flex h-12 items-center justify-center rounded-full bg-[#3A2E25] text-[15px] font-bold text-white transition-colors hover:bg-[#4A3F36]"
                >
                  무료로 시작하기
                </Link>
              </div>
            </ScrollReveal>

            {/* 베이직 (인기) */}
            <ScrollReveal preset="fade-up" delay={0.1}>
              <div className="relative flex h-full flex-col rounded-[20px] bg-[#3A2E25] p-8 text-white shadow-[0_16px_48px_-8px_rgba(58,46,37,0.2)]">
                <span className="mb-3 inline-flex w-fit rounded-full bg-[#D4835E] px-3 py-1 text-xs font-bold text-white">
                  인기
                </span>
                <span className="text-[15px] font-semibold text-[#B5A99D]">
                  베이직
                </span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-serif text-[2.5rem] font-bold">
                    ₩19,900
                  </span>
                  <span className="text-sm text-[#8B7E72]">/ 3회권</span>
                </div>
                <p className="mt-1 text-sm text-[#8B7E72]">
                  본격적인 실전 감각을 키우세요
                </p>
                <span className="mt-2 inline-flex w-fit rounded-full bg-[#4A3F36] px-2.5 py-0.5 text-xs font-medium text-[#B5A99D]">
                  1개월 이용
                </span>
                <div className="my-6 h-px bg-[#4A3F36]" />
                <ul className="flex-1 space-y-3">
                  {[
                    "실전 모의고사 3회",
                    "스크립트 패키지 생성 30회",
                    "AI 진단 · 튜터링 무료",
                    "체화 · 쉐도잉 훈련 무제한",
                    "성적 진단 리포트",
                  ].map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2.5 text-sm text-[#D4CEC7]"
                    >
                      <Check className="h-4 w-4 shrink-0 text-[#D4835E]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/store"
                  className="mt-8 flex h-12 items-center justify-center rounded-full bg-[#D4835E] text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(212,131,94,0.3)] transition-colors hover:bg-[#C07350]"
                >
                  구매하기
                </Link>
              </div>
            </ScrollReveal>

            {/* 프리미엄 */}
            <ScrollReveal preset="fade-up" delay={0.2}>
              <div className="flex h-full flex-col rounded-[20px] border border-[#EAE0D5] bg-white p-8">
                <span className="text-[15px] font-semibold text-[#8B7E72]">
                  프리미엄
                </span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-serif text-[2.5rem] font-bold text-[#3A2E25]">
                    ₩49,900
                  </span>
                  <span className="text-sm text-[#B5A99D]">/ 10회권</span>
                </div>
                <p className="mt-1 text-sm text-[#B5A99D]">
                  목표 등급 달성을 위한 완벽 준비
                </p>
                <span className="mt-2 inline-flex w-fit rounded-full bg-[#F3ECE4] px-2.5 py-0.5 text-xs font-medium text-[#8B7E72]">
                  2개월 이용
                </span>
                <div className="my-6 h-px bg-[#EAE0D5]" />
                <ul className="flex-1 space-y-3">
                  {[
                    "실전 모의고사 10회",
                    "스크립트 패키지 생성 100회",
                    "AI 진단 · 튜터링 무료",
                    "체화 · 쉐도잉 훈련 무제한",
                    "성장 데이터 리포트",
                  ].map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2.5 text-sm text-[#4A3F36]"
                    >
                      <Check className="h-4 w-4 shrink-0 text-[#D4835E]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/store"
                  className="mt-8 flex h-12 items-center justify-center rounded-full border border-[#EAE0D5] text-[15px] font-bold text-[#3A2E25] transition-colors hover:bg-[#F3ECE4]"
                >
                  구매하기
                </Link>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal preset="fade-in" delay={0.3}>
            <div className="mt-10 text-center">
              <Link
                href="/pricing"
                className="text-sm font-medium text-[#D4835E] hover:underline"
              >
                전체 기능 비교 보기 &rarr;
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ━━━ 5. FAQ ━━━ */}
      <section className="bg-[#F3ECE4] py-20 sm:py-[100px]">
        <div className="mx-auto max-w-[680px] px-6">
          <ScrollReveal preset="fade-up" className="mb-12 text-center">
            <Pill>자주 묻는 질문</Pill>
            <h2 className="mt-4 text-[1.6rem] font-extrabold tracking-[-0.02em] text-[#3A2E25] sm:text-[2rem]">
              궁금한 점이 있으신가요?
            </h2>
          </ScrollReveal>

          <div>
            {faqs.map((faq, i) => (
              <ScrollReveal key={faq.q} preset="fade-up" delay={i * 0.06} duration={0.4}>
                <details className="group border-b border-[#EAE0D5]">
                  <summary className="flex cursor-pointer items-center justify-between py-[22px] text-[1rem] font-semibold text-[#3A2E25] sm:text-[1.05rem] [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <Plus className="h-5 w-5 flex-shrink-0 text-[#B5A99D] transition-transform group-open:rotate-45" />
                  </summary>
                  <div className="pb-[22px] text-[0.95rem] leading-[1.7] text-[#8B7E72]">
                    {faq.a}
                  </div>
                </details>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ 6. Final CTA — 웜 크림 그라디언트 ━━━ */}
      <section className="cta-gradient relative overflow-hidden py-24 text-center sm:py-[120px]">
        <div className="pointer-events-none absolute right-[-100px] top-[-100px] h-[400px] w-[400px] bg-[radial-gradient(circle,rgba(212,131,94,0.08)_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl px-6">
          <ScrollReveal preset="fade-up">
            <h2 className="text-[1.8rem] font-extrabold leading-[1.35] tracking-[-0.03em] text-[#3A2E25] sm:text-[2.8rem]">
              당신의 이야기가,
              <br />
              가장 완벽한 대본입니다.
            </h2>
          </ScrollReveal>
          <ScrollReveal preset="fade-up" delay={0.15}>
            <p className="mt-4 text-[1rem] leading-[1.7] text-[#8B7E72] sm:text-[1.1rem]">
              남의 삶을 흉내내지 마세요.
              <br />내 삶의 무대에서, 가장 나답게 말하세요.
            </p>
          </ScrollReveal>
          <ScrollReveal preset="scale-up" delay={0.3}>
            <Link
              href="/signup"
              className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#D4835E] px-11 py-[18px] text-[1.1rem] font-extrabold text-white shadow-[0_4px_20px_rgba(212,131,94,0.3)] transition-all hover:-translate-y-0.5 hover:bg-[#C07350]"
            >
              무료로 시작하기 <ArrowRight className="h-5 w-5" />
            </Link>
          </ScrollReveal>
          <ScrollReveal preset="fade-in" delay={0.4}>
            <p className="mt-[18px] text-[0.85rem] text-[#B5A99D]">
              지금 바로, 부담 없이 시작하세요
            </p>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
