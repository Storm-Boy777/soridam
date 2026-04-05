"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function FinalCtaSection() {
  return (
    <section className="text-center">
      <p className="text-lg font-bold text-white/70 sm:text-2xl">
        나의 목소리에 나의 이야기를 담아
      </p>
      <h2 className="mt-3 text-2xl font-extrabold text-white sm:text-4xl">
        말하다, <span className="text-primary-500">나답게.</span>
      </h2>
      <Link
        href="/signup"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary-500 px-8 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_20px_rgba(58,91,199,0.25)] transition-all hover:-translate-y-0.5 hover:bg-primary-600 sm:mt-8 sm:px-10 sm:py-4 sm:text-[16px]"
      >
        지금 시작하기 <ArrowRight className="h-5 w-5" />
      </Link>
    </section>
  );
}
