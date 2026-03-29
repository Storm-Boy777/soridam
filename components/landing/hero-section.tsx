"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ClipboardList,
  BarChart3,
  PenLine,
  Headphones,
  ClipboardCheck,
  Target,
  ChevronDown,
} from "lucide-react";

const steps = [
  { icon: ClipboardList, label: "서베이 고정" },
  { icon: BarChart3, label: "빈도분석" },
  { icon: PenLine, label: "스크립트" },
  { icon: Headphones, label: "쉐도잉" },
  { icon: ClipboardCheck, label: "모의고사" },
  { icon: Target, label: "튜터링" },
];

const illustrations = [
  { src: "/images/hero-beer.webp", caption: "퇴근 후 맥주 한 캔" },
  { src: "/images/hero-game.webp", caption: "친구랑 게임" },
  { src: "/images/hero-sofa.webp", caption: "소파 위 넷플릭스" },
  { src: "/images/hero-coffee.webp", caption: "주말 아침 커피" },
  { src: "/images/hero-chat.webp", caption: "친구와 수다" },
];

export default function HeroSection() {
  return (
    <section className="relative flex flex-col items-center overflow-hidden bg-[#FAF6F1] px-5 pt-7 pb-8 sm:pt-10 sm:pb-16 md:pt-16 md:pb-24">
      {/* 배경 글로우 */}
      <div className="pointer-events-none absolute left-1/2 top-[-100px] h-[600px] w-[600px] -translate-x-1/2 bg-[radial-gradient(circle,rgba(212,131,94,0.08)_0%,transparent_70%)]" />

      {/* ── 상단 고정: 뱃지 + 헤드카피 ── */}
      <div className="relative mx-auto flex shrink-0 max-w-4xl flex-col items-center text-center">
        <motion.span
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#D4835E]/[0.1] px-3 py-1 text-[0.7rem] font-bold tracking-wide text-[#D4835E] sm:px-[18px] sm:py-2 sm:text-[clamp(0.75rem,0.9vw,0.85rem)]"
        >
          나의 이야기로 준비하는 OPIc
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
          className="mt-3 sm:mt-4 md:mt-5 text-[30px] font-extrabold leading-[1.3] tracking-[-0.04em] text-[#3A2E25] sm:text-[clamp(1.75rem,2.8vw,2.8rem)]"
        >
          <span className="text-[#D4835E]">당신의 평범한 하루가</span>
          <br />
          가장 완벽한 스토리입니다
        </motion.h1>
      </div>

      {/* ── 중앙 가변: 포토카드 갤러리 ── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
        className="relative mx-auto mt-4 sm:mt-5 md:mt-7 flex w-full max-w-[1100px] shrink-0 flex-col justify-center"
      >
        <motion.div
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08 } },
          }}
          initial="hidden"
          animate="visible"
          className="flex gap-3 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4 md:grid md:grid-cols-5 md:overflow-visible md:px-6"
        >
          {illustrations.map((ill) => (
            <motion.div
              key={ill.caption}
              variants={{
                hidden: { opacity: 0, y: 24, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1 },
              }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="w-[30vw] flex-shrink-0 sm:w-[30vw] md:flex md:w-auto md:flex-shrink md:flex-col"
            >
              <div className="overflow-hidden rounded-2xl md:min-h-0 md:flex-1 md:rounded-[clamp(12px,1vw,16px)]">
                <Image
                  src={ill.src}
                  alt={ill.caption}
                  width={600}
                  height={800}
                  sizes="(max-width: 768px) 28vw, (max-width: 1024px) 28vw, 200px"
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
              <p className="mt-1 sm:mt-1.5 shrink-0 text-center text-[0.8rem] font-medium text-[#8B7E72] sm:text-[clamp(0.7rem,0.85vw,0.85rem)]">
                {ill.caption}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── 중간: 문구 + 파이프라인 (이미지와 CTA 사이 가운데) ── */}
      <div className="relative mx-auto flex flex-col items-center text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
          className="mt-14 sm:mt-14 md:mt-20 text-[0.85rem] font-medium text-[#8B7E72] sm:text-[clamp(0.85rem,1vw,1rem)]"
        >
          하루오픽이 여러분과 함께 합니다.
          <br />
          <span className="font-semibold text-[#3A2E25]">
            당신의 경험을 최고의 전략으로 바꿔 드릴게요.
          </span>
        </motion.p>

        {/* 5단계 파이프라인 미니맵 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
          className="mt-3 sm:mt-4 flex items-center justify-center gap-1 sm:gap-2"
        >
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-1 sm:gap-2">
              <div className="flex flex-col items-center gap-1 sm:gap-1.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3A2E25]/[0.06] sm:h-10 sm:w-10 sm:rounded-xl">
                  <step.icon className="h-3.5 w-3.5 text-[#8B7E72] sm:h-4.5 sm:w-4.5" />
                </div>
                <span className="whitespace-nowrap text-[0.6rem] font-medium text-[#8B7E72] sm:text-[0.7rem]">
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <span className="mb-4 text-[0.6rem] text-[#D4C4B0] sm:mb-5 sm:text-[0.7rem]">→</span>
              )}
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── 하단 고정: CTA 버튼 ── */}
      <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65, ease: "easeOut" }}
          className="mt-14 sm:mt-14 md:mt-20 flex flex-row-reverse items-center justify-center gap-3"
        >
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#D4835E] px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_20px_rgba(212,131,94,0.25)] transition-all hover:-translate-y-px hover:bg-[#C07350] sm:gap-2 sm:px-7 sm:py-3 sm:text-[15px]"
          >
            시작하기 <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#pipeline"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE0D5] px-4 py-2.5 text-[13px] font-semibold text-[#8B7E72] transition-all hover:border-[#D4C4B0] hover:text-[#3A2E25] sm:px-6 sm:py-3 sm:text-[15px]"
          >
            학습 과정 보기
          </a>
        </motion.div>
      </div>
    </section>
  );
}
