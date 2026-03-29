"use client";

import Image from "next/image";
import ScrollReveal from "@/components/motion/ScrollReveal";

/* ── 기능 미리보기 카드 데이터 ── */

const FEATURE_CARDS = [
  // 시험후기
  { num: "01", title: "빈도 분석", desc: "출제 빈도를 데이터로 분석", src: "/screenshots/review-frequency.jpg" },
  { num: "02", title: "후기 제출", desc: "콤보별 주제와 질문 선택", src: "/screenshots/review-submit.jpg" },
  // 스크립트
  { num: "03", title: "스크립트 생성", desc: "내 경험으로 맞춤 스크립트", src: "/screenshots/script-create.png" },
  // 쉐도잉
  { num: "04", title: "쉐도잉 훈련", desc: "문장별 하이라이트로 따라읽기", src: "/screenshots/shadowing-follow.png" },
  // 모의고사
  { num: "05", title: "실전 모의고사", desc: "15문항 실전 시뮬레이션", src: "/screenshots/mock-exam-session.png" },
  { num: "06", title: "종합 진단", desc: "예상 등급과 상세 소견", src: "/screenshots/mock-exam-result.png" },
  { num: "07", title: "세부 진단", desc: "항목별 충족 여부 진단표", src: "/screenshots/mock-exam-detail.png" },
  { num: "08", title: "문항별 평가", desc: "문항별 충족/미충족 분석", src: "/screenshots/mock-exam-questions.png" },
  { num: "09", title: "성장 리포트", desc: "등급 변화와 성장 추이", src: "/screenshots/mock-exam-growth.png" },
  // 튜터링
  { num: "10", title: "튜터링 진단", desc: "약점 진단과 맞춤 처방", src: "/screenshots/tutoring-diagnosis.png" },
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
      <div className="relative mt-3 h-[480px] overflow-hidden rounded-xl border-2 border-white/10 shadow-lg sm:h-[582px]">
        <Image
          src={card.src}
          alt={card.title}
          fill
          sizes="340px"
          className="object-cover object-left-top"
          quality={75}
        />
      </div>
    </div>
  );
}

/* ── 메인 섹션: Marquee ── */

export default function DeepDiveSection() {
  return (
    <section id="dive-features" className="bg-[#FAF6F1] py-20 sm:py-[100px]">
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
        <div className="md:[mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
          <div className="flex w-max animate-[marquee_40s_linear_infinite] hover:[animation-play-state:paused]">
            {/* 2세트: 각 세트는 카드 2회 반복(6장)으로 화면보다 넓게 */}
            {[0, 1].map((stripIdx) => (
              <div key={stripIdx} className="flex shrink-0 gap-4 pr-4 sm:gap-6 sm:pr-6">
                {FEATURE_CARDS.map((card, i) => (
                  <FeatureCard key={`${stripIdx}-${card.num}`} card={card} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
