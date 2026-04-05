"use client";

import { Check, X, ArrowRight } from "lucide-react";
import ScrollReveal from "@/components/motion/ScrollReveal";
import Link from "next/link";

const SURVEY_ITEMS = [
  { cat: "직업", choice: "일 경험 없음", strategy: "차단", color: "text-red-500", reason: "직장 콤보가 시험에 안 나옴" },
  { cat: "학생 여부", choice: "아니오", strategy: "차단", color: "text-red-500", reason: "학교/수업 콤보가 시험에 안 나옴" },
  { cat: "수강", choice: "5년 이상", strategy: "차단", color: "text-red-500", reason: "수강 관련 꼬리 질문 안 나옴" },
  { cat: "거주지", choice: "홀로 거주", strategy: "축소", color: "text-amber-600", reason: "가족 묘사 문제 제거" },
  { cat: "여가 활동", choice: "영화, 쇼핑, TV, 공연, 콘서트", strategy: "핵심", color: "text-primary-600", reason: "핵심 학습 주제" },
  { cat: "취미/관심사", choice: "음악 감상 (단독)", strategy: "핵심", color: "text-primary-600", reason: "하나만 고르면 100% 출제" },
  { cat: "운동", choice: "조깅, 걷기, 운동안함", strategy: "필러", color: "text-foreground-muted", reason: "선택해도 출제 0건" },
  { cat: "휴가/여행", choice: "집휴가, 국내여행, 해외여행", strategy: "핵심", color: "text-primary-600", reason: "핵심 학습 주제" },
];

export default function SurveySection() {
  return (
    <section className="bg-background py-20 sm:py-[100px]">
      <div className="mx-auto max-w-[1080px] px-6">
        <div className="flex flex-col gap-10 md:gap-12">
          {/* 상단: 텍스트 */}
          <div className="text-center">
            <ScrollReveal preset="fade-up" duration={0.5}>
              <div className="flex items-center justify-center gap-3">
                <span className="text-[0.8rem] font-bold tracking-wider text-primary-500/50">
                  가장 중요한 첫 단계
                </span>
                <span className="rounded-md bg-primary-500/10 px-2 py-0.5 text-[0.7rem] font-bold text-primary-500">
                  서베이 고정
                </span>
              </div>
              <h2 className="mt-4 whitespace-pre-line text-[1.3rem] font-extrabold leading-[1.35] tracking-tight text-foreground sm:text-[1.8rem]">
서베이 선택이 곧 전략입니다
              </h2>
              <p className="mt-4 text-[1.05rem] font-bold text-foreground sm:text-[1.15rem]">
                최소의 노력으로 최대의 효과를 내는 <span className="text-primary-500">서베이 전략</span>
              </p>
              <p className="mt-2 text-[0.85rem] text-foreground-secondary">
                소리담은 이 서베이를 기반으로 운영됩니다.
              </p>

              {/* 전략 요약 */}
              <div className="mx-auto mt-6 flex w-fit flex-col items-start space-y-3">
                {[
                  { label: "차단", desc: "직장·학교·수강 콤보를 원천 제거", color: "bg-red-500" },
                  { label: "축소", desc: "불필요한 출제 범위를 줄여 학습 부담 감소", color: "bg-amber-500" },
                  { label: "핵심", desc: "빈출 주제만 골라 학습 범위 압축", color: "bg-primary-500" },
                  { label: "필러", desc: "항목 수만 채우고 출제되지 않는 안전 선택", color: "bg-foreground-muted" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className={`${item.color} shrink-0 rounded-md px-2 py-0.5 text-[0.65rem] font-bold text-white`}>
                      {item.label}
                    </span>
                    <span className="text-[0.85rem] text-foreground-secondary">{item.desc}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Link
                href="/strategy"
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 py-3 text-[0.85rem] font-semibold text-white transition-colors hover:bg-primary-600 sm:inline-flex sm:w-auto"
              >
                전략 가이드 자세히 보기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </ScrollReveal>
          </div>

          {/* 하단: 서베이 카드 */}
          <div className="md:mx-auto md:w-full md:max-w-[600px]">
            <ScrollReveal preset="fade-up" duration={0.5} delay={0.15}>
              <div className="rounded-2xl border-2 border-border bg-surface-secondary p-3.5 shadow-lg sm:p-7">
                <div className="flex items-center justify-between">
                  <p className="text-[0.85rem] font-semibold text-foreground">
                    서베이 전략 가이드
                  </p>
                  <span className="rounded-full bg-foreground px-2.5 py-0.5 text-[0.65rem] font-bold text-white">
                    난이도 5-5
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {SURVEY_ITEMS.map((item) => (
                    <div
                      key={item.cat}
                      className="flex items-center gap-2 rounded-xl bg-surface px-2.5 py-2 sm:gap-3 sm:px-3.5 sm:py-2.5"
                    >
                      {item.strategy === "차단" ? (
                        <X className="h-3.5 w-3.5 shrink-0 text-red-500" />
                      ) : item.strategy === "축소" ? (
                        <X className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                      ) : item.strategy === "필러" ? (
                        <div className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-foreground-muted" />
                      ) : (
                        <Check className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[0.75rem] font-bold text-foreground">{item.cat}</span>
                          <span className={`text-[0.65rem] font-semibold ${item.color}`}>
                            {item.strategy}
                          </span>
                        </div>
                        <p className="text-[0.7rem] text-foreground-secondary">{item.choice}</p>
                      </div>

                      <span className="hidden shrink-0 text-[0.65rem] text-foreground-muted sm:inline">{item.reason}</span>
                    </div>
                  ))}
                </div>

                {/* 하단 요약 */}
                <div className="mt-4 rounded-xl bg-foreground px-3 py-2.5 sm:px-4 sm:py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.8rem] font-medium text-white/70">학습 주제</span>
                    <span className="text-[1.1rem] font-bold text-primary-400">10개로 압축</span>
                  </div>
                  <p className="mt-1 text-[0.65rem] text-white/40 sm:text-[0.7rem]">
                    서베이 고정 → 출제 범위 고정 → 60% 이상 커버
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
