"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import ScrollReveal from "@/components/motion/ScrollReveal";
import Pill from "./pill";
import { plans } from "./landing-data";

export default function PricingSection() {
  return (
    <section className="bg-white py-20 sm:py-[120px]">
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
          {plans.map((plan, planIdx) => (
            <ScrollReveal
              key={plan.name}
              preset="fade-up"
              delay={planIdx * 0.1}
            >
              <div
                className={`relative flex h-full flex-col rounded-[20px] p-8 ${
                  plan.highlight
                    ? "bg-[#3A2E25] text-white shadow-[0_16px_48px_-8px_rgba(58,46,37,0.2)]"
                    : "border border-[#EAE0D5] bg-white"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#D4835E] px-3 py-1 text-xs font-bold text-white">
                    인기
                  </span>
                )}
                <div className="flex flex-col items-center text-center">
                  <span
                    className={`text-[15px] font-semibold ${
                      plan.highlight ? "text-[#B5A99D]" : "text-[#8B7E72]"
                    }`}
                  >
                    {plan.name}
                  </span>
                  <p
                    className={`mt-1 text-sm ${
                      plan.highlight ? "text-[#8B7E72]" : "text-[#B5A99D]"
                    }`}
                  >
                    {plan.desc}
                  </p>
                  <span
                    className={`mt-2 inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      plan.highlight
                        ? "bg-[#4A3F36] text-[#B5A99D]"
                        : "bg-[#F3ECE4] text-[#8B7E72]"
                    }`}
                  >
                    {plan.period}
                  </span>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span
                      className={`font-serif text-[2.5rem] font-bold ${
                        plan.highlight ? "text-white" : "text-[#3A2E25]"
                      }`}
                    >
                      {plan.price}
                    </span>
                    {plan.priceUnit && (
                      <span
                        className={`text-sm ${
                          plan.highlight ? "text-[#8B7E72]" : "text-[#B5A99D]"
                        }`}
                      >
                        {plan.priceUnit}
                      </span>
                    )}
                  </div>
                  {/* 타겟 문구 */}
                  <p
                    className={`mt-2 text-[0.8rem] font-medium ${
                      plan.highlight ? "text-[#D4835E]" : "text-[#D4835E]"
                    }`}
                  >
                    {plan.target}
                  </p>
                </div>
                <div
                  className={`my-6 h-px ${
                    plan.highlight ? "bg-[#4A3F36]" : "bg-[#EAE0D5]"
                  }`}
                />
                <div className="flex-1 space-y-4 pl-2 sm:pl-4">
                  {plan.features.map((group) => {
                    const disabled = !group.enabled;
                    return (
                      <div
                        key={group.title}
                        className={disabled ? "opacity-35" : ""}
                      >
                        <div className="flex items-start gap-2">
                          <Check
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              disabled ? "text-[#B5A99D]" : "text-[#D4835E]"
                            }`}
                          />
                          <span
                            className={`text-sm font-semibold ${
                              disabled
                                ? "text-[#B5A99D] line-through"
                                : plan.highlight
                                  ? "text-white"
                                  : "text-[#3A2E25]"
                            }`}
                          >
                            {group.title}
                          </span>
                        </div>
                        {group.details.length > 0 && (
                          <div className="ml-6 mt-0.5 space-y-0.5">
                            {group.details.map((d, i) => (
                              <p
                                key={d}
                                className={
                                  disabled
                                    ? "text-xs text-[#B5A99D]"
                                    : i === 0
                                      ? "text-xs font-medium text-[#D4835E]"
                                      : "text-xs text-[#8B7E72]"
                                }
                              >
                                {d}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <Link
                  href={plan.ctaLink}
                  className={`mt-8 flex h-12 items-center justify-center rounded-full text-[15px] font-bold transition-colors ${
                    plan.ctaStyle === "primary"
                      ? "bg-[#D4835E] text-white shadow-[0_4px_16px_rgba(212,131,94,0.3)] hover:bg-[#C07350]"
                      : plan.ctaStyle === "dark"
                        ? "bg-[#3A2E25] text-white hover:bg-[#4A3F36]"
                        : "border border-[#EAE0D5] text-[#3A2E25] hover:bg-[#F3ECE4]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </ScrollReveal>
          ))}
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
  );
}
