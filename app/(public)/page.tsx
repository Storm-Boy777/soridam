import type { Metadata } from "next";
import HeroSection from "@/components/landing/hero-section";
import PainSection from "@/components/landing/pain-section";
import ContrastSection from "@/components/landing/contrast-section";
import PipelineSection from "@/components/landing/pipeline-section";
import SurveySection from "@/components/landing/survey-section";
import DeepDiveSection from "@/components/landing/deep-dive-section";
import PricingSection from "@/components/landing/pricing-section";
import FaqSection from "@/components/landing/faq-section";
import FinalCtaSection from "@/components/landing/final-cta-section";

export const metadata: Metadata = {
  title: "하루오픽 | 나의 하루로 준비하는 OPIc",
  description:
    "471개 기출 빈도 분석 → 내 경험 기반 맞춤 스크립트 → 원어민 음성 쉐도잉 → 실전 모의고사 → 약점 튜터링. 외우지 않아도 말할 수 있는 OPIc, 하루오픽.",
};

export default function HomePage() {
  return (
    <>
      {/* 1막: 공감과 불안 */}
      <HeroSection />
      <PainSection />
      <ContrastSection />

      {/* 2막: 해결과 확신 */}
      <PipelineSection />
      <SurveySection />
      <DeepDiveSection />

      {/* 3막: 행동 유도 */}
      <PricingSection />
      <FaqSection />
      <FinalCtaSection />
    </>
  );
}
