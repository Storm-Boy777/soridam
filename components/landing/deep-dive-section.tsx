"use client";

import ScrollReveal from "@/components/motion/ScrollReveal";

/* ── 기능 미리보기 카드 데이터 ── */

const FEATURE_CARDS = [
  { num: "01", title: "빈도 분석", desc: "카테고리별 출제 빈도를\n데이터로 분석합니다", src: "/screenshots/review-frequency.jpg" },
  { num: "02", title: "후기 제출", desc: "시험 후기를 제출하면\n스크립트 크레딧을 지급합니다", src: "/screenshots/review-submit.jpg" },
  { num: "03", title: "시험 후기", desc: "다른 수험생의 시험 후기와\n실전 팁을 확인합니다", src: "/screenshots/review-list.jpg" },
];

/* ── 카드 컴포넌트 ── */

function FeatureCard({ card }: { card: typeof FEATURE_CARDS[number] }) {
  return (
    <div className="w-[280px] shrink-0 rounded-2xl bg-[#3A2E25] p-4 sm:w-[340px] sm:p-5">
      <span className="block text-center font-serif text-[2rem] font-bold leading-none text-[#D4835E]/30 sm:text-[2.5rem]">
        {card.num}
      </span>
      <h4 className="mt-1 text-center text-[0.95rem] font-bold text-white sm:text-[1.05rem]">
        {card.title}
      </h4>
      <p className="mt-1 whitespace-pre-line text-center text-[0.7rem] leading-relaxed text-white/50 sm:text-[0.75rem]">
        {card.desc}
      </p>
      <div className="mt-3 overflow-hidden rounded-xl border-2 border-white/10 shadow-lg">
        <img src={card.src} alt={card.title} className="w-full" loading="lazy" />
      </div>
    </div>
  );
}

/* ── 메인 섹션: Marquee ── */

export default function DeepDiveSection() {
  return (
    <section className="bg-[#FAF6F1] py-20 sm:py-[100px]">
      <div className="mx-auto max-w-[1080px] px-6">
        <ScrollReveal preset="fade-up" duration={0.5}>
          <p className="text-center font-serif text-[0.8rem] font-bold tracking-wider text-[#D4835E]/50">
            FEATURES
          </p>
          <h2 className="mt-3 text-center text-[1.5rem] font-extrabold leading-[1.35] tracking-[-0.03em] text-[#3A2E25] [word-break:keep-all] sm:text-[1.8rem]">
            핵심 기능 미리보기
          </h2>
          <p className="mt-2 text-center text-[0.9rem] text-[#8B7E72]">
            실제 서비스 화면을 확인하세요
          </p>
        </ScrollReveal>
      </div>

      {/* Marquee — 전체 너비 */}
      <div className="mt-10 overflow-hidden">
        <div className="[mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
          <div className="flex w-max animate-[marquee_20s_linear_infinite] hover:[animation-play-state:paused]">
            {/* 2세트: 각 세트는 카드 2회 반복(6장)으로 화면보다 넓게 */}
            {[0, 1].map((stripIdx) => (
              <div key={stripIdx} className="flex shrink-0 gap-4 pr-4 sm:gap-6 sm:pr-6">
                {[...FEATURE_CARDS, ...FEATURE_CARDS].map((card, i) => (
                  <FeatureCard key={`${stripIdx}-${i}`} card={card} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
