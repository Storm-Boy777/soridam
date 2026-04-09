"use client";

import {
  ClipboardList,
  BarChart3,
  PenLine,
  Headphones,
  ClipboardCheck,
  Target,
  ArrowRight,
} from "lucide-react";
import ScrollReveal from "@/components/motion/ScrollReveal";

const steps = [
  { num: "01", label: "고정 서베이", icon: ClipboardList, desc: "출제 범위를 고정한다", href: "/strategy" },
  { num: "02", label: "빈도분석", icon: BarChart3, desc: "어떤 질문이 자주 나올까?", href: "/reviews" },
  { num: "03", label: "스크립트", icon: PenLine, desc: "내 경험이 답변이 된다", href: "/scripts" },
  { num: "04", label: "쉐도잉", icon: Headphones, desc: "원어민 발음으로 체화", href: "/scripts" },
  { num: "05", label: "모의고사", icon: ClipboardCheck, desc: "실전과 동일한 평가", href: "/mock-exam" },
  { num: "06", label: "튜터링", icon: Target, desc: "약점만 집중 훈련", href: "/tutoring" },
];

export default function PipelineSection() {
  return (
    <section id="pipeline" className="relative overflow-hidden bg-[#1A1A2E] py-20 sm:py-[120px]">
      {/* 배경 글로우 */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle,rgba(58,91,199,0.06)_0%,transparent_70%)]" />

      <div className="relative mx-auto max-w-[1080px] px-6">
        <ScrollReveal preset="fade-up" className="text-center">
          <span className="inline-block rounded-full bg-white/[0.08] px-4 py-1.5 text-xs font-bold tracking-widest text-primary-400">
            학습 파이프라인
          </span>
          <h2 className="mt-5 text-[1.8rem] font-extrabold leading-[1.3] tracking-tight text-white sm:text-[2.4rem]">
            데이터에서 시작해,
            <br />
            체화로 끝나는 훈련
          </h2>
          <p className="mt-4 text-[0.95rem] leading-relaxed text-white/50 sm:text-[1.05rem]">
            각 단계별 빈 곳 없는 완결된 학습 사이클.
          </p>
        </ScrollReveal>

        {/* 파이프라인 — 데스크톱: 수평 / 모바일: 수직 */}
        <div className="mx-auto mt-14 sm:mt-16">
          {/* 수평 (MD+) */}
          <div className="hidden items-start justify-between md:flex">
            {steps.map((step, i) => (
              <div key={step.num} className="flex items-start">
                <ScrollReveal preset="scale-up" delay={i * 0.1} duration={0.5}>
                  <a
                    href={step.href}
                    className="group flex w-[130px] flex-col items-center gap-3 text-center"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.08] ring-1 ring-white/[0.08] transition-all group-hover:bg-primary-500/20 group-hover:ring-primary-500/30">
                      <step.icon className="h-6 w-6 text-primary-400" />
                    </div>
                    <div>
                      <span className="text-[0.7rem] font-bold text-primary-400/60">
                        {step.num}
                      </span>
                      <p className="mt-0.5 text-[0.85rem] font-bold text-white">
                        {step.label}
                      </p>
                      <p className="mt-1 text-[0.75rem] leading-snug text-white/40">
                        {step.desc}
                      </p>
                    </div>
                  </a>
                </ScrollReveal>
                {i < steps.length - 1 && (
                  <div className="mt-7 flex items-center px-1">
                    <svg width="28" height="10" viewBox="0 0 28 10" fill="none" className="text-white/25 sm:w-[36px]">
                      <line x1="0" y1="5" x2="22" y2="5" stroke="currentColor" strokeWidth="1" />
                      <path d="M20 1 L27 5 L20 9" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 수직 (모바일) */}
          <div className="flex flex-col gap-1 md:hidden">
            {steps.map((step, i) => (
              <div key={step.num}>
                <ScrollReveal preset="fade-left" delay={i * 0.08} duration={0.4}>
                  <a
                    href={step.href}
                    className="flex items-center gap-4 rounded-2xl px-4 py-3 transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.08]">
                      <step.icon className="h-5 w-5 text-primary-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[0.7rem] font-bold text-primary-400/60">
                          {step.num}
                        </span>
                        <span className="text-[0.9rem] font-bold text-white">
                          {step.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[0.8rem] text-white/40">
                        {step.desc}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-white/20" />
                  </a>
                </ScrollReveal>
                {i < steps.length - 1 && (
                  <div className="ml-10 h-4 w-px bg-white/10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
