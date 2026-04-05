"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function StrategyHookSection() {
  return (
    <section className="mb-0">
      <h2 className="mb-8 text-center text-2xl font-bold text-white sm:mb-10 sm:text-3xl">
        우리가 오픽의 늪에 빠지는 진짜 이유
      </h2>
      <div className="grid gap-4 sm:gap-8 md:grid-cols-3">
        <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-5 text-center backdrop-blur-sm sm:rounded-3xl sm:p-8">
          <div className="mb-4 text-4xl sm:mb-6 sm:text-5xl">🦜</div>
          <h3 className="mb-2 text-lg font-bold tracking-tight text-white sm:mb-3 sm:text-xl">
            스크립트 암기
          </h3>
          <p className="text-[0.8rem] leading-relaxed text-gray-400 sm:text-sm">
            암기 자체가 나쁜 건 아닙니다. 하지만 통으로 외우면 한 문장이
            막히는 순간 전부 무너집니다.
          </p>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-5 text-center backdrop-blur-sm sm:rounded-3xl sm:p-8">
          <div className="mb-4 text-4xl sm:mb-6 sm:text-5xl">🔄</div>
          <h3 className="mb-2 text-lg font-bold tracking-tight text-white sm:mb-3 sm:text-xl">
            반복되는 재시험의 굴레
          </h3>
          <p className="text-[0.8rem] leading-relaxed text-gray-400 sm:text-sm">
            내 답변의 약점이 무엇인지 데이터로 확인하지 않고, 운에 맡기는
            시험만 반복합니다.
          </p>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-5 text-center backdrop-blur-sm sm:rounded-3xl sm:p-8">
          <div className="mb-4 text-4xl sm:mb-6 sm:text-5xl">🧐</div>
          <h3 className="mb-2 text-lg font-bold tracking-tight text-white sm:mb-3 sm:text-xl">
            정보 홍수 속의 혼란
          </h3>
          <p className="text-[0.8rem] leading-relaxed text-gray-400 sm:text-sm">
            내 상황에 맞지 않는 파편화된 정보들에 휘둘리며 진짜 필요한 훈련을
            놓칩니다.
          </p>
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-lg font-bold text-white">
          시험을 알면,{" "}
          <span className="text-primary-400">답이 보입니다.</span>
        </p>
        <Link
          href="/strategy"
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-7 py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(58,91,199,0.4)] transition-all hover:-translate-y-0.5 hover:bg-primary-400"
        >
          OPIc 전략 가이드 보기 <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
