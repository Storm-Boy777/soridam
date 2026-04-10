import type { Metadata } from "next";
import HeroSection from "@/components/landing/hero-section";
import StrategyHookSection from "@/components/landing/strategy-hook-section";
import AnalysisSection from "@/components/landing/analysis-section";
import PipelineSection from "@/components/landing/pipeline-section";
import SurveySection from "@/components/landing/survey-section";
import FeaturesSection from "@/components/landing/features-section";
import PhilosophySection from "@/components/landing/philosophy-section";
import FaqSection from "@/components/landing/faq-section";
import FinalCtaSection from "@/components/landing/final-cta-section";

export const metadata: Metadata = {
  title: { absolute: "소리담 | 말하다, 나답게." },
  description:
    "나의 목소리에 나의 이야기를 담다. AI 기반 OPIc 말하기 학습 플랫폼. 기출 분석, 맞춤 스크립트, 실전 모의고사, 약점 튜터링까지.",
};

export default function HomePage() {
  return (
    <>
      {/* ─── 1부: 문제 인식 (다크) ─── */}
      <div className="-mt-16 bg-[#12121F] pt-16 text-white">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-20">
          <HeroSection />
          <StrategyHookSection />
        </div>
      </div>

      {/* ─── 2부: 모의고사 평가 엔진 (밝음) ─── */}
      <AnalysisSection />

      {/* ─── 3부: 학습 파이프라인 (다크) ─── */}
      <PipelineSection />

      {/* ─── 3-2부: 서베이 전략 (밝음) ─── */}
      <SurveySection />

      {/* ─── 4부: 핵심 기능 미리보기 (밝음) ─── */}
      <FeaturesSection />

      {/* ─── 5부: 개발자 철학 (다크) ─── */}
      <div className="bg-[#1A1A2E] text-white">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-24">
          <PhilosophySection />
        </div>
      </div>

      {/* ─── 6부: FAQ (다크) ─── */}
      <div className="bg-[#1A1A2E] text-white">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-24">
          <FaqSection />
        </div>
      </div>

      {/* ─── 7부: CTA ─── */}
      <div className="bg-[#12121F] text-white">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 md:py-24">
          <FinalCtaSection />
        </div>
      </div>
    </>
  );
}
