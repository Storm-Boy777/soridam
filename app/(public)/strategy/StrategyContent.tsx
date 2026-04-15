"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  X,
  BarChart3,
  FileText,
  ClipboardList,
  Headphones,
  ClipboardCheck,
  TrendingUp,
  Database,
  Target,
  Microscope,
  Trophy,
  RefreshCw,
  Stethoscope,
} from "lucide-react";
import ScrollReveal from "@/components/motion/ScrollReveal";
import { motion } from "framer-motion";

/* ── 데이터 ── */

const misconceptions = [
  {
    rough: '"서베이가 중요하다더라"',
    question: "그런데 얼마나?",
    precise: "서베이가 시험의 60%를 결정한다",
    proof: "실전 응시 데이터 기반 분석",
  },
  {
    rough: '"말할 수 있는 주제를 골라라"',
    question: "그런데 어떤 기준으로?",
    precise: "선택해도 안 나오는 항목이 있다",
    proof: "필러 전략: 항목 수만 채우고 출제 0건",
  },
  {
    rough: '"난이도는 5-5가 좋다더라"',
    question: "그런데 왜?",
    precise: "5-5면 상위등급 확률이 급상승",
    proof: "롤플레이 감소, 불리한 유형 회피",
  },
  {
    rough: '"스크립트 외우면 안 된다더라"',
    question: "그런데 대안이 뭔데?",
    precise: "내 경험으로 나만의 스크립트를 만든다",
    proof: "남의 스크립트 암기 → 최고 NM등급(ACTFL\u00a0공식)",
  },
];

const questionTypes: { num: string; combo: string; type: string; fixed: boolean }[] = [
  { num: "Q1", combo: "소개", type: "소개 (채점 안함)", fixed: true },
  { num: "Q2", combo: "일반 1", type: "묘사", fixed: true },
  { num: "Q3", combo: "일반 1", type: "루틴 · 묘사 · 비교 · 경험(어릴적/처음)", fixed: false },
  { num: "Q4", combo: "일반 1", type: "루틴 · 비교 · 경험(어릴적/처음 · 최근 · 특별한)", fixed: false },
  { num: "Q5", combo: "일반 2", type: "묘사", fixed: true },
  { num: "Q6", combo: "일반 2", type: "루틴 · 비교 · 경험(어릴적/처음)", fixed: false },
  { num: "Q7", combo: "일반 2", type: "경험(최근 · 특별한)", fixed: false },
  { num: "Q8", combo: "일반 3", type: "묘사", fixed: true },
  { num: "Q9", combo: "일반 3", type: "루틴 · 비교 · 경험(어릴적/처음)", fixed: false },
  { num: "Q10", combo: "일반 3", type: "경험(최근 · 특별한)", fixed: false },
  { num: "Q11", combo: "롤플레이", type: "질문하기", fixed: true },
  { num: "Q12", combo: "롤플레이", type: "대안제시", fixed: true },
  { num: "Q13", combo: "롤플레이", type: "경험(특별한)", fixed: true },
  { num: "Q14", combo: "어드밴스", type: "비교/변화", fixed: true },
  { num: "Q15", combo: "어드밴스", type: "사회적이슈", fixed: true },
];

const surveyCategories = [
  { cat: "1. 직업", choice: "일 경험 없음", strategy: "출제 차단", color: "text-[#E07A5F]", bg: "bg-[#E07A5F]/10", reason: "직장 콤보가 시험에 안 나옴" },
  { cat: "2. 학생 여부", choice: "아니오", strategy: "출제 차단", color: "text-[#E07A5F]", bg: "bg-[#E07A5F]/10", reason: "학교/수업 콤보가 시험에 안 나옴" },
  { cat: "3. 수강", choice: "5년 이상", strategy: "출제 차단", color: "text-[#E07A5F]", bg: "bg-[#E07A5F]/10", reason: "수강 관련 꼬리 질문이 안 나옴" },
  { cat: "4. 거주지", choice: "홀로 거주", strategy: "범위 축소", color: "text-amber-600", bg: "bg-amber-50", reason: "가족 묘사 문제 제거" },
  { cat: "5. 여가 활동", choice: "영화, 쇼핑, TV, 공연, 콘서트", strategy: "핵심 주제", color: "text-primary-600", bg: "bg-primary-50", reason: "항목 수 채우면서 출제 주제 통제" },
  { cat: "6. 취미/관심사", choice: "음악 감상 (단독)", strategy: "핵심 주제", color: "text-primary-600", bg: "bg-primary-50", reason: "하나만 고르면 100% 출제" },
  { cat: "7. 운동", choice: "조깅, 걷기, 운동안함", strategy: "무해 필러", color: "text-[#6B6B7B]", bg: "bg-[#F3F2EF]", reason: "선택해도 시험에 관련 문제 0건" },
  { cat: "8. 휴가/여행", choice: "집휴가, 국내여행, 해외여행", strategy: "핵심 주제", color: "text-primary-600", bg: "bg-primary-50", reason: "핵심 학습 주제" },
];

const topicFrequency = [
  { rank: 1, topic: "음악", count: "144건", tier: "핵심" },
  { rank: 2, topic: "집", count: "123건", tier: "핵심" },
  { rank: 3, topic: "해외여행", count: "45건", tier: "핵심" },
  { rank: 4, topic: "집에서 보내는 휴가", count: "45건", tier: "핵심" },
  { rank: 5, topic: "국내여행", count: "43건", tier: "핵심" },
  { rank: 6, topic: "영화", count: "29건", tier: "우선" },
  { rank: 7, topic: "쇼핑", count: "18건", tier: "우선" },
  { rank: 8, topic: "공연/콘서트", count: "17건", tier: "우선" },
  { rank: 9, topic: "TV", count: "4건", tier: "우선" },
];

const commonTopicFrequency = [
  { rank: 1, topic: "지형", count: "35건", cumRate: "9.8%", highlight: true },
  { rank: 2, topic: "재활용", count: "27건", cumRate: "17.4%", highlight: true },
  { rank: 3, topic: "모임", count: "22건", cumRate: "23.5%", highlight: true },
  { rank: 4, topic: "은행", count: "22건", cumRate: "29.7%", highlight: true },
  { rank: 5, topic: "전화기", count: "19건", cumRate: "35.0%", highlight: true },
  { rank: 6, topic: "산업", count: "19건", cumRate: "40.3%", highlight: true },
  { rank: 7, topic: "미용실", count: "19건", cumRate: "45.7%", highlight: true },
  { rank: 8, topic: "건강", count: "18건", cumRate: "50.7%", highlight: true },
  { rank: 9, topic: "날씨", count: "16건", cumRate: "55.2%", highlight: true },
  { rank: 10, topic: "호텔", count: "16건", cumRate: "59.7%", highlight: true },
];

const gradeStrategies = [
  { grade: "IL", pattern: "Simple Info", label: "단순 정보 전달", bg: "bg-stone-400", practice: "기본 문장 3~4개로 단순한 정보를 전달", example: "I live in Seoul. I like my city." },
  { grade: "IM1", pattern: "Description", label: "짧은 묘사", bg: "bg-amber-400", practice: "형용사와 간단한 이유를 붙여 4~5문장으로 묘사", example: "My room is small but cozy. I like it because it is quiet." },
  { grade: "IM2", pattern: "Routine", label: "일상 경험 설명", bg: "bg-amber-500", practice: "시간 순서(First → Then → Usually)로 루틴을 6~7문장 설명", example: "Every morning I wake up at 7. First I exercise, then I have breakfast." },
  { grade: "IM3", pattern: "Experience", label: "경험 확장 + 디테일", bg: "bg-primary-500", practice: "구체적 에피소드와 디테일을 추가하여 7~9문장으로 확장", example: "One time something interesting happened. I was at a café when..." },
  { grade: "IH", pattern: "Explain", label: "이유 + 스토리 전개", bg: "bg-[#1E3378]", practice: "이유를 설명하고, 경험을 사건→반응 구조로 전개, 변형 질문 대응", example: "I like hiking because it helps me relax. Last weekend..." },
  { grade: "AL", pattern: "Analyze", label: "분석 + 비교", bg: "bg-[#1A1A2E]", practice: "과거↔현재 비교, 변화의 원인 분석, 의견과 관점 제시", example: "In the past... But these days... I think this change happened because..." },
];

const flywheelScaleEffects = [
  { scale: "현재", precision: "3:2 비율 확인, 빈출 주제 파악", effect: "핵심 10개 주제 집중", current: true },
  { scale: "500건", precision: "주제별 빈도 순위 안정화", effect: "학습 우선순위 확정", current: false },
  { scale: "1,000건", precision: "난이도별·서베이별 교차 분석", effect: "서베이 조합별 맞춤 전략", current: false },
  { scale: "3,000건+", precision: "시기별·유형별 출제 패턴 분석", effect: "정밀한 출제 예측", current: false },
];

const modules = [
  { icon: BarChart3, name: "시험후기", desc: "시험 후기를 수집·분석하여 출제 빈도를 파악합니다.\n같은 서베이 기준의 데이터가 쌓일수록 전략이 정밀해집니다." },
  { icon: FileText, name: "스크립트", desc: "빈출 주제별로 내 경험이 담긴 스크립트를 생성하고, 쉐도잉으로 발음·억양까지 훈련합니다." },
  { icon: ClipboardList, name: "모의고사", desc: "실제 OPIc과 동일한 5콤보 15문제로 실전을 재현합니다. 답변을 분석하고 등급을 예측합니다." },
  { icon: Stethoscope, name: "튜터링", desc: "모의고사 결과를 기반으로 약점을 진단하고, 맞춤 처방과 레벨별 훈련을 제공합니다." },
];

/* ── 섹션 번호 컴포넌트 ── */
function SectionNum({ num, label }: { num: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1A1A2E] text-sm font-bold text-white">
        {num}
      </span>
      <span className="mt-2 text-xs font-semibold tracking-wider text-[#A0A0AF] uppercase">
        {label}
      </span>
    </div>
  );
}

/* ── 페이지 콘텐츠 ── */
export default function StrategyContent() {
  useEffect(() => {
    const cls = "strategy-no-scrollbar";
    document.documentElement.classList.add(cls);
    return () => document.documentElement.classList.remove(cls);
  }, []);

  return (
    <>
      {/* ━━━ Hero ━━━ */}
      <section className="hero-gradient">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28 sm:pb-20">
          <motion.span
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#3A5BC7]/[0.1] px-3 py-1 text-[0.7rem] font-bold tracking-wide text-[#3A5BC7] sm:px-[18px] sm:py-2 sm:text-[0.85rem]"
          >
            소리담 데이터 전략
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-8 font-serif text-[1.75rem] font-semibold italic leading-[1.2] tracking-tight text-[#1A1A2E] sm:text-5xl"
          >
            OPIc, 정말 알고 계신가요?
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-6 max-w-[520px] text-[17px] leading-[1.7] text-[#4A3F36] [word-break:keep-all]"
          >
            사람들이 OPIc을 어려워하는 근본 원인은 영어 실력이 아닙니다.
            <br />
            <strong>시험 구조 자체를 모르는 것</strong>입니다.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="mt-10 w-full max-w-[560px] rounded-2xl border border-[#1A1A2E]/10 bg-[#1A1A2E] px-6 py-7 text-center sm:px-8"
          >
            <p className="text-[15px] font-semibold leading-[1.8] text-white/90">
              소리담을 이용하지 않으셔도 됩니다.
            </p>
            <p className="mt-1 text-[15px] font-bold leading-[1.8] text-white">
              단, 이 글만큼은 끝까지 읽어 주세요.
            </p>
            <div className="mx-auto my-4 h-px w-12 bg-white/20" />
            <p className="text-sm leading-[1.8] text-white/60">
              대부분의 수험생은 OPIc을 &ldquo;대충&rdquo; 안 채로 시험장에 갑니다.
              <br className="hidden sm:block" />
              그리고 같은 등급을 받고, 같은 방식으로 다시 준비합니다.
            </p>
            <p className="mt-4 text-[15px] font-bold leading-[1.8] text-primary-300">
              이 정보를 아는 것 자체가 전략입니다.
            </p>
            <p className="mt-1 text-sm leading-[1.8] text-white/50">
              앞으로 오랫동안 함께할 OPIc을,
              <br className="hidden sm:block" />
              제대로 마주할 마지막 기회일 수 있습니다.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ━━━ Section 1: "대충 안다" vs "정확히 안다" ━━━ */}
      <section className="border-b border-[#E8E6E1] bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <ScrollReveal preset="fade-up">
            <SectionNum num="1" label="현실 직시" />
            <h2 className="mt-6 text-center font-serif text-[1.55rem] font-semibold italic leading-[1.3] tracking-tight text-[#1A1A2E] sm:text-[36px]">
              &ldquo;대충 안다&rdquo;는
              <br />
              &ldquo;정확히 모른다&rdquo;와 같습니다
            </h2>
            <p className="mx-auto mt-4 max-w-[560px] text-center text-base leading-relaxed text-[#6B6B7B]">
              유튜브, 블로그, 인강 덕분에 대부분의 응시자가 OPIc에 대해
              &ldquo;대충은&rdquo; 압니다. 하지만 대충 아는 것과 정확히 아는
              것의 차이는 결과를 바꿉니다.
            </p>
          </ScrollReveal>

          <div className="mt-12 space-y-4">
            {misconceptions.map((item, i) => (
              <ScrollReveal key={item.rough} preset="fade-up" delay={i * 0.08} duration={0.5}>
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#E8E6E1] bg-[#F3F2EF] p-5 sm:flex-row sm:gap-5">
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-[15px] font-semibold text-[#6B6B7B]">{item.rough}</p>
                    <p className="mt-0.5 text-sm text-[#A0A0AF]">{item.question}</p>
                  </div>
                  <span className="text-lg text-[#D0CEC8]">→</span>
                  <div className="flex-1 rounded-xl bg-primary-50 p-4 text-center sm:text-left">
                    <p className="text-[15px] font-bold text-primary-700">{item.precise}</p>
                    <p className="mt-0.5 text-sm text-primary-500 [word-break:keep-all]">{item.proof}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal preset="scale-up" delay={0.1}>
            <div className="mt-16 rounded-2xl bg-[#1A1A2E] p-6 text-center sm:p-10">
              <p className="text-sm font-medium text-[#A0A0AF]">실제 OPIc 등급 분포</p>
              <p className="mt-3 font-serif text-[36px] font-bold italic text-white sm:text-[48px] md:text-[56px]">68%</p>
              <p className="mt-1 text-base text-[#A0A0AF]">의 응시자가 IM2 이하에 머뭅니다</p>
              <p className="mt-4 text-sm leading-relaxed text-[#6B6B7B]">
                전체 응시자 중 IH 이상 달성률은 28%.<br />
                원인은 영어 실력이 아니라, 시험 전략의 부재입니다.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ━━━ Section 2: OPIc 구조 ━━━ */}
      <section className="border-b border-[#E8E6E1] bg-[#FAFAF7] py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <ScrollReveal preset="fade-up">
            <SectionNum num="2" label="시험 구조" />
            <h2 className="mt-6 text-center font-serif text-[1.55rem] font-semibold italic leading-[1.3] tracking-tight text-[#1A1A2E] sm:text-[36px]">
              OPIc은 내가 시험 범위를<br />직접 정하는 시험입니다
            </h2>
            <p className="mx-auto mt-4 max-w-[560px] text-center text-base leading-relaxed text-[#6B6B7B]">
              OPIc 문제를 결정하는 변수는 딱 두 가지.<br className="sm:hidden" /> 두 변수 모두 수험자 본인이 직접 선택합니다.
            </p>
          </ScrollReveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <ScrollReveal preset="fade-left" delay={0}>
              <div className="rounded-2xl border border-[#E8E6E1] bg-white p-8">
                <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] bg-primary-50 text-primary-500"><ClipboardCheck size={22} /></div>
                <h3 className="mt-4 text-lg font-bold text-[#1A1A2E]">변수 1: Background Survey</h3>
                <p className="mt-1 text-sm font-semibold text-primary-500">&ldquo;무엇이&rdquo; 나오는가 (출제 주제)</p>
                <p className="mt-3 text-sm leading-relaxed text-[#6B6B7B]">시험 전에 관심사/경험을 선택하는 메뉴판. 선택한 항목에서 3개 콤보가, 선택하지 않은 항목에서 2개 콤보가 출제됩니다.</p>
                <div className="mt-4 rounded-lg bg-primary-50 px-4 py-3">
                  <p className="text-center text-2xl font-black text-primary-600">시험의 60%</p>
                  <p className="mt-1 text-center text-xs text-primary-500">실전 응시 데이터 기반 분석</p>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal preset="fade-right" delay={0.1}>
              <div className="rounded-2xl border border-[#E8E6E1] bg-white p-8">
                <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] bg-amber-50 text-amber-600"><Target size={22} /></div>
                <h3 className="mt-4 text-lg font-bold text-[#1A1A2E]">변수 2: Self-Assessment</h3>
                <p className="mt-1 text-sm font-semibold text-amber-600">&ldquo;어떻게&rdquo; 나오는가 (문제 유형)</p>
                <p className="mt-3 text-sm leading-relaxed text-[#6B6B7B]">난이도를 선택하면 문제 유형이 결정됩니다. 5-5를 선택하면 롤플레이가 1회로 줄고 상위등급 확률이 급상승합니다.</p>
                <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3">
                  <p className="text-center text-2xl font-black text-amber-600">5-5 추천</p>
                  <p className="mt-1 text-center text-xs text-amber-500">롤플레이 1회, 상위등급 확률 증가</p>
                </div>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal preset="fade-up" delay={0.15}>
            <div className="mt-10 overflow-x-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden rounded-2xl border border-[#E8E6E1] bg-white">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#E8E6E1] bg-[#F3F2EF]">
                    <th className="px-3 py-3 text-left font-semibold text-[#1A1A2E] sm:px-6">시험</th>
                    <th className="px-3 py-3 text-center font-semibold text-[#1A1A2E] sm:px-6">출제 범위 예측</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E6E1]">
                  {["토익", "토플", "아이엘츠"].map((exam) => (
                    <tr key={exam}>
                      <td className="px-3 py-3 text-[#6B6B7B] sm:px-6">{exam}</td>
                      <td className="px-3 py-3 text-center sm:px-6">
                        <span className="inline-flex items-center gap-1 text-[#A0A0AF]"><X className="h-4 w-4" /> 예측 불가</span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-primary-50">
                    <td className="px-3 py-3 font-bold text-primary-700 sm:px-6">OPIc</td>
                    <td className="px-3 py-3 text-center sm:px-6">
                      <span className="inline-flex items-center gap-1 font-bold text-primary-600"><Check className="h-4 w-4" /> 60%를 내가 직접 결정</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ━━━ Section 3: 콤보 시스템 ━━━ */}
      <section className="border-b border-[#E8E6E1] bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <ScrollReveal preset="fade-up">
            <SectionNum num="3" label="콤보 시스템" />
            <h2 className="mt-6 text-center font-serif text-[1.55rem] font-semibold italic leading-[1.3] tracking-tight text-[#1A1A2E] sm:text-[36px]">
              15문제는 무작위가 아닙니다<br />5개 콤보로 구성됩니다
            </h2>
            <p className="mx-auto mt-4 max-w-[560px] text-center text-base leading-relaxed text-[#6B6B7B]">
              OPIc 기출문제를 분석한 결과, 모든 문제는 10가지 유형 중 하나이며, 한 콤보 안의 3문제는 같은 주제에서 연속으로 출제됩니다.
            </p>
          </ScrollReveal>

          <ScrollReveal preset="fade-up" delay={0.1}>
            <p className="mb-3 mt-12 text-center text-sm font-medium text-[#6B6B7B]">난이도 5-5 기준 · 15문제 구조</p>
            <div className="overflow-x-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden rounded-2xl border border-[#E8E6E1] bg-white">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#E8E6E1] bg-[#F3F2EF]">
                    <th className="whitespace-nowrap px-1.5 py-2 text-center font-semibold text-[#1A1A2E] sm:px-5 sm:py-3">콤보</th>
                    <th className="px-1 py-2 text-center font-semibold text-[#1A1A2E] sm:px-5 sm:py-3">문항</th>
                    <th className="px-1.5 py-2 text-left font-semibold text-[#1A1A2E] sm:px-5 sm:py-3">출제 유형</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E6E1]">
                  {questionTypes.map((qt, idx) => {
                    const isFirstInCombo = idx === 0 || questionTypes[idx - 1].combo !== qt.combo;
                    const span = isFirstInCombo ? questionTypes.filter(q => q.combo === qt.combo).length : 0;
                    const comboBadge = qt.combo.startsWith("일반") ? "bg-primary-50 text-primary-600" : qt.combo === "롤플레이" ? "bg-amber-50 text-amber-600" : qt.combo === "어드밴스" ? "bg-[#1A1A2E]/10 text-[#1A1A2E]" : "bg-[#F3F2EF] text-[#6B6B7B]";
                    const rowBg = qt.combo === "롤플레이" ? "bg-amber-50/50" : qt.combo === "어드밴스" ? "bg-[#1A1A2E]/5" : "";
                    return (
                      <tr key={qt.num} className={rowBg}>
                        {isFirstInCombo && (
                          <td rowSpan={span} className="border-r border-[#E8E6E1] px-1.5 py-2 text-center align-middle sm:px-5 sm:py-3">
                            <span className={`inline-flex whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold sm:px-2 sm:text-xs ${comboBadge}`}>{qt.combo}</span>
                          </td>
                        )}
                        <td className="whitespace-nowrap px-1 py-2 text-center font-mono text-[10px] font-bold text-[#6B6B7B] sm:px-5 sm:py-3 sm:text-xs">{qt.num}</td>
                        <td className="px-1.5 py-2 sm:px-5 sm:py-3">
                          {qt.fixed ? (
                            <span className="font-semibold text-[#1A1A2E]">{qt.type}</span>
                          ) : (
                            <span className="text-[#6B6B7B] italic">{qt.type}</span>
                          )}
                          {qt.fixed && qt.num !== "Q1" && (
                            <span className="ml-1 inline-flex rounded-full bg-emerald-50 px-1 py-0.5 text-[9px] font-medium text-emerald-600 sm:ml-1.5 sm:px-1.5 sm:text-[10px]">고정</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-center text-xs leading-relaxed text-[#6B6B7B]">선택형 3개 + 공통형 2개가 위 5개 콤보에 배분됩니다. 위치는 고정되지 않습니다.</p>
          </ScrollReveal>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { num: "3개", label: "선택형 콤보", desc: "내가 서베이에서 선택한 항목" },
              { num: "2개", label: "공통형 콤보", desc: "서베이 무관, 누구에게나 출제" },
              { num: "15문제", label: "총 문항 수", desc: "5콤보 × 3문항씩" },
            ].map((item, i) => (
              <ScrollReveal key={item.label} preset="fade-up" delay={i * 0.08}>
                <div className="rounded-xl border border-[#E8E6E1] bg-[#F3F2EF] p-5 text-center">
                  <p className="text-2xl font-black text-[#1A1A2E]">{item.num}</p>
                  <p className="mt-1 text-sm font-semibold text-[#6B6B7B]">{item.label}</p>
                  <p className="mt-0.5 text-xs text-[#A0A0AF]">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ Section 4: 서베이 전략 ━━━ */}
      <section className="border-b border-[#E8E6E1] bg-[#FAFAF7] py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <ScrollReveal preset="fade-up">
            <SectionNum num="4" label="서베이 전략" />
            <h2 className="mt-6 text-center font-serif text-[1.55rem] font-semibold italic leading-[1.3] tracking-tight text-[#1A1A2E] sm:text-[36px]">서베이를 어떻게 해야 하는가</h2>
            <div className="mx-auto mt-8 grid max-w-xl grid-cols-3 gap-2 sm:gap-3">
              {[
                { num: "1", label: "차단", desc: "불필요한 출제를 원천 차단" },
                { num: "2", label: "채우기", desc: "무해한 항목으로 빈칸 채우기" },
                { num: "3", label: "집중", desc: "핵심 주제에만 집중 학습" },
              ].map((item) => (
                <div key={item.num} className="rounded-xl border border-[#E8E6E1] bg-[#F3F2EF] p-4 text-center">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">{item.num}</span>
                  <p className="mt-2 text-sm font-bold text-[#1A1A2E]">{item.label}</p>
                  <p className="mt-1 text-xs text-[#6B6B7B]">{item.desc}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>

          <div className="mt-12 space-y-3">
            {surveyCategories.map((item, i) => (
              <ScrollReveal key={item.cat} preset="fade-left" delay={i * 0.06} duration={0.45}>
                <div className="flex flex-col gap-3 rounded-xl border border-[#E8E6E1] bg-white p-4 sm:flex-row sm:items-center sm:gap-4">
                  <div className="sm:min-w-[120px]"><p className="text-sm font-bold text-[#1A1A2E]">{item.cat}</p></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1A1A2E]">{item.choice}</p>
                    <p className="mt-0.5 text-xs text-[#A0A0AF]">{item.reason}</p>
                  </div>
                  <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${item.bg} ${item.color}`}>{item.strategy}</span>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal preset="fade-up" delay={0.1}>
            <div className="mt-10 flex flex-row items-center justify-center gap-1.5 sm:flex-row sm:gap-6">
              <div className="flex-1 rounded-xl bg-[#F3F2EF] px-2 py-2.5 text-center sm:w-auto sm:flex-none sm:px-6 sm:py-4">
                <p className="text-lg font-black text-[#6B6B7B] sm:text-2xl">16개</p>
                <p className="mt-0.5 whitespace-nowrap text-[10px] text-[#A0A0AF] sm:mt-1 sm:whitespace-normal sm:text-xs">선택한 항목</p>
              </div>
              <span className="shrink-0 text-base text-[#D0CEC8] sm:text-xl">→</span>
              <div className="flex-1 rounded-xl bg-[#F3F2EF] px-2 py-2.5 text-center sm:w-auto sm:flex-none sm:px-6 sm:py-4">
                <p className="text-lg font-black text-[#6B6B7B] sm:text-2xl">6개</p>
                <p className="mt-0.5 whitespace-nowrap text-[10px] text-[#A0A0AF] sm:mt-1 sm:whitespace-normal sm:text-xs">필러 (출제 0건)</p>
              </div>
              <span className="shrink-0 text-base text-[#D0CEC8] sm:text-xl">→</span>
              <div className="flex-1 rounded-xl bg-primary-50 px-2 py-2.5 text-center sm:w-auto sm:flex-none sm:px-6 sm:py-4">
                <p className="text-lg font-black text-primary-600 sm:text-2xl">10개</p>
                <p className="mt-0.5 whitespace-nowrap text-[10px] text-primary-500 sm:mt-1 sm:whitespace-normal sm:text-xs">실제 공부할 주제</p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ━━━ Section 5: 선택형 빈도 분석 ━━━ */}
      <section className="border-b border-[#E8E6E1] bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <ScrollReveal preset="fade-up">
            <SectionNum num="5" label="선택형 빈도" />
            <h2 className="mt-6 text-center font-serif text-[1.55rem] font-semibold italic leading-[1.3] tracking-tight text-[#1A1A2E] sm:text-[36px]">
              선택형 3콤보 = 60%는<br />이미 내 것
            </h2>
            <p className="mx-auto mt-4 max-w-[560px] text-center text-base leading-relaxed text-[#6B6B7B] [word-break:keep-all]">
              내가 선택한 주제이므로 <strong className="text-[#1A1A2E]">전부 학습</strong>합니다.
              <br />
              빈도 데이터가 학습 순서를 결정합니다.
              <br className="sm:hidden" />
              높은 주제부터 완성도를 높이세요.
            </p>
          </ScrollReveal>

          <ScrollReveal preset="fade-up" delay={0.1}>
            <div className="mt-12 overflow-x-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden rounded-2xl border border-[#E8E6E1] bg-white">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#E8E6E1] bg-[#F3F2EF]">
                    <th className="px-2 py-2.5 text-center font-semibold text-[#1A1A2E] sm:px-6 sm:py-3">순위</th>
                    <th className="px-2 py-2.5 text-left font-semibold text-[#1A1A2E] sm:px-6 sm:py-3">주제</th>
                    <th className="px-2 py-2.5 text-center font-semibold text-[#1A1A2E] sm:px-6 sm:py-3">빈도</th>
                    <th className="px-2 py-2.5 text-center font-semibold text-[#1A1A2E] sm:px-6 sm:py-3">분류</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E6E1]">
                  {topicFrequency.map((item) => (
                    <tr key={item.rank} className={item.tier === "핵심" ? "bg-primary-50/50" : ""}>
                      <td className="px-2 py-2.5 text-center font-bold text-[#A0A0AF] sm:px-6 sm:py-3">{item.rank}</td>
                      <td className="px-2 py-2.5 font-semibold text-[#1A1A2E] sm:px-6 sm:py-3">{item.topic}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-[#1A1A2E] sm:px-6 sm:py-3">{item.count}</td>
                      <td className="px-2 py-2.5 text-center sm:px-6 sm:py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.tier === "핵심" ? "bg-primary-50 text-primary-600" : "bg-amber-50 text-amber-600"}`}>{item.tier}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-[#E8E6E1] bg-[#F3F2EF] px-6 py-3 text-center text-xs text-[#A0A0AF]">230건+ 실전 시험 후기 기반 분석</div>
            </div>
          </ScrollReveal>

        </div>
      </section>

      {/* ━━━ Section 6: 공통형 빈도 분석 ━━━ */}
      <section className="border-b border-[#E8E6E1] bg-[#FAFAF7] py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <ScrollReveal preset="fade-up">
            <SectionNum num="6" label="공통형 빈도" />
            <h2 className="mt-6 text-center font-serif text-[1.55rem] font-semibold italic leading-[1.3] tracking-tight text-[#1A1A2E] sm:text-[36px]">
              공통형 2콤보<br />상위 10개로 24% 추가
            </h2>
            <p className="mx-auto mt-4 max-w-[560px] text-center text-base leading-relaxed text-[#6B6B7B]">
              공통형은 서베이로 범위를 줄일 수 없습니다.
              <br />
              <strong>빈도 분석만으로</strong> 우선순위를 정해야 합니다.
            </p>
          </ScrollReveal>

          <ScrollReveal preset="fade-up" delay={0.1}>
            <div className="mt-12 overflow-x-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden rounded-2xl border border-[#E8E6E1] bg-white">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#E8E6E1] bg-[#F3F2EF]">
                    <th className="px-2 py-2.5 text-center font-semibold text-[#1A1A2E] sm:px-6 sm:py-3">순위</th>
                    <th className="px-2 py-2.5 text-left font-semibold text-[#1A1A2E] sm:px-6 sm:py-3">주제</th>
                    <th className="px-2 py-2.5 text-center font-semibold text-[#1A1A2E] sm:px-6 sm:py-3">출현 건수</th>
                    <th className="px-2 py-2.5 text-center font-semibold text-[#1A1A2E] sm:px-6 sm:py-3">누적 커버리지</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E6E1]">
                  {commonTopicFrequency.map((item) => (
                    <tr key={item.rank} className={item.highlight ? "bg-primary-50/50" : ""}>
                      <td className="px-2 py-2.5 text-center font-bold text-[#A0A0AF] sm:px-6 sm:py-3">{item.rank}</td>
                      <td className="px-2 py-2.5 sm:px-6 sm:py-3">
                        <span className={`font-semibold ${item.highlight ? "text-[#1A1A2E]" : "text-[#6B6B7B]"}`}>{item.topic}</span>
                      </td>
                      <td className="px-2 py-2.5 text-center text-[#6B6B7B] sm:px-6 sm:py-3">{item.count}</td>
                      <td className="px-2 py-2.5 text-center font-bold sm:px-6 sm:py-3">
                        <span className={item.highlight ? "text-primary-600" : "text-[#A0A0AF]"}>{item.cumRate}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-[#E8E6E1] bg-[#F3F2EF] px-6 py-3 text-center text-xs text-[#A0A0AF]">230건+ 실전 시험 후기 기반 분석</div>
            </div>
          </ScrollReveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              { label: "상위 5개 주제만 학습하면", value: "35%", sub: "공통형의 1/3 이상을 커버" },
              { label: "상위 10개로 확장하면", value: "59.7%", sub: "10개 주제로 공통형의 60%를 커버" },
            ].map((item, i) => (
              <ScrollReveal key={item.label} preset="fade-up" delay={i * 0.1}>
                <div className="rounded-xl border border-[#E8E6E1] bg-white p-6 text-center">
                  <p className="text-sm font-medium text-[#A0A0AF]">{item.label}</p>
                  <p className={`mt-2 font-serif text-[32px] font-bold italic sm:text-[40px] ${i === 0 ? "text-primary-600" : "text-[#1A1A2E]"}`}>{item.value}</p>
                  <p className="mt-1 text-sm text-[#6B6B7B]">{item.sub}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal preset="fade-up" delay={0.15}>
            <div className="mt-10 rounded-2xl bg-[#1A1A2E] p-6 sm:p-8">
              <p className="text-center text-sm font-medium text-[#A0A0AF]">최종 시험 커버리지</p>
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-4 rounded-lg bg-primary-500/20 px-4 py-3">
                  <span className="min-w-[80px] text-sm font-bold text-primary-300">선택형 3콤보</span>
                  <div className="flex-1"><div className="h-3 rounded-full bg-[#4A3F36]"><div className="h-3 rounded-full bg-primary-400" style={{ width: "100%" }} /></div></div>
                  <span className="text-sm font-bold text-primary-300">60%</span>
                </div>
                <div className="flex items-center gap-4 rounded-lg bg-[#3A5BC7]/20 px-4 py-3">
                  <span className="min-w-[80px] text-sm font-bold text-[#D4B87A]">공통형 2콤보</span>
                  <div className="flex-1"><div className="h-3 rounded-full bg-[#4A3F36]"><div className="h-3 rounded-full bg-[#3A5BC7]" style={{ width: "60%" }} /></div></div>
                  <span className="text-sm font-bold text-[#D4B87A]">+24%</span>
                </div>
              </div>
              <div className="mt-6 flex flex-col items-center gap-2">
                <p className="font-serif text-[40px] font-bold italic text-white sm:text-[56px]">84%</p>
                <p className="text-center text-xs text-[#6B6B7B]">선택형 60% + 공통형 상위 10개 커버율 59.7% × 40% = 24% 추가</p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ━━━ Section 7: 5-5 전략 ━━━ */}
      <section className="border-b border-[#E8E6E1] bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <ScrollReveal preset="fade-up">
            <SectionNum num="7" label="5-5 전략" />
            <h2 className="mt-6 text-center font-serif text-[1.55rem] font-semibold italic leading-[1.3] tracking-tight text-[#1A1A2E] sm:text-[36px]">
              왜 난이도는 5-5인가
            </h2>
            <div className="mx-auto mt-6 max-w-[480px] space-y-2 text-center text-base leading-relaxed text-[#6B6B7B] [word-break:keep-all]">
              <p>3~4 단계는 롤플레이가 <strong className="text-[#E07A5F]">2회</strong> 출제되지만,<br />5-5를 선택하면 <strong className="text-primary-600">1회</strong>로 줄고 어드밴스는 건너뛰어도 IH까지 가능합니다.</p>
            </div>
            <p className="mx-auto mt-4 max-w-[560px] text-center text-sm font-semibold text-primary-600">
              소리담의 모든 기출문제와 빈도 분석은<br className="sm:hidden" /> 난이도 5-5 기준으로 수집·제공됩니다.
            </p>
          </ScrollReveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <ScrollReveal preset="fade-left">
              <div className="rounded-2xl border border-[#E8E6E1] bg-[#F3F2EF] p-6">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8E6E1] text-sm font-bold text-[#6B6B7B]">3-4</span>
                  <h3 className="font-bold text-[#6B6B7B]">난이도 3~4</h3>
                </div>
                <div className="mt-4 space-y-2 text-sm text-[#6B6B7B]">
                  <p>롤플레이(질문) <strong className="text-[#E07A5F]">2번</strong> 출제</p>
                  <p>한국 수험자의 약점 유형에 2회 노출</p>
                  <p>IM 문제: 묘사 + 질문</p>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal preset="fade-right" delay={0.1}>
              <div className="rounded-2xl border-2 border-primary-200 bg-primary-50/50 p-6">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white">5-5</span>
                  <h3 className="font-bold text-primary-700">난이도 5-5 추천</h3>
                </div>
                <div className="mt-4 space-y-2 text-sm text-primary-700">
                  <p>롤플레이(질문) <strong className="text-primary-600">1번만</strong> 출제</p>
                  <p>약점 유형 노출 최소화</p>
                  <p>AL 문제: 비교 + 사회이슈 (건너뛰어도 IH 가능)</p>
                </div>
              </div>
            </ScrollReveal>
          </div>

        </div>
      </section>

      {/* ━━━ Section 8: 등급별 전략 ━━━ */}
      <section className="border-b border-[#E8E6E1] bg-[#FAFAF7] py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <ScrollReveal preset="fade-up">
            <SectionNum num="8" label="등급별 전략" />
            <h2 className="mt-6 text-center font-serif text-[1.55rem] font-semibold italic leading-[1.3] tracking-tight text-[#1A1A2E] sm:text-[36px]">
              같은 질문, 다른 등급<br />차이는 &ldquo;말하기 행동&rdquo;에 있습니다
            </h2>
            <p className="mx-auto mt-4 max-w-[560px] text-center text-base leading-relaxed text-[#6B6B7B] [word-break:keep-all]">
              OPIc은 영어 실력이 아니라, 얼마나 복잡한 <strong className="text-[#1A1A2E]">말하기 행동</strong>을 수행할 수 있는지로 등급이 결정됩니다.
              목표 등급이 요구하는 답변 구조를 정확히 연습해야 합니다.
            </p>
          </ScrollReveal>

          {/* 6등급 progression */}
          <div className="mt-12 space-y-3">
            {gradeStrategies.map((gs, i) => (
              <ScrollReveal key={gs.grade} preset="fade-up" delay={i * 0.06}>
                <div className="flex items-start gap-3 rounded-2xl border border-[#E8E6E1] bg-white p-4 sm:items-center sm:gap-5 sm:p-5">
                  {/* 등급 배지 */}
                  <div className="flex flex-col items-center gap-1 sm:min-w-[72px]">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-xs font-black text-white ${gs.bg}`}>
                      {gs.grade}
                    </span>
                    <span className="text-[10px] font-medium text-[#A0A0AF]">{gs.pattern}</span>
                  </div>
                  {/* 내용 */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#1A1A2E]">{gs.label}</p>
                    <p className="mt-1 text-sm text-[#6B6B7B]">{gs.practice}</p>
                    <p className="mt-1.5 text-xs italic text-[#A0A0AF]">&ldquo;{gs.example}&rdquo;</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* 핵심 요약 */}
          <ScrollReveal preset="fade-up" delay={0.1}>
            <div className="mt-10 rounded-2xl bg-[#1A1A2E] p-6 sm:p-8">
              <p className="text-center text-base font-bold leading-relaxed text-white [word-break:keep-all]">
                등급이 올라갈수록<br className="sm:hidden" /> &ldquo;말하기 행동&rdquo;이 복잡해집니다
              </p>
              <div className="mx-auto mt-6 grid max-w-md gap-3 sm:grid-cols-3">
                {[
                  { label: "Intermediate", value: "Describe", sub: "묘사하고 나열한다" },
                  { label: "Int. High", value: "Explain", sub: "이유를 설명하고 전개한다" },
                  { label: "Advanced", value: "Analyze", sub: "비교하고 분석한다" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-white/10 px-4 py-3 text-center">
                    <p className="text-[10px] font-bold tracking-wider text-primary-400 uppercase">{item.label}</p>
                    <p className="mt-1 text-lg font-black text-white">{item.value}</p>
                    <p className="mt-1 text-xs text-[#A0A0AF]">{item.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ━━━ Section 9: 소리담이 하는 일 ━━━ */}
      <section className="border-b border-[#E8E6E1] bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <ScrollReveal preset="fade-up">
            <SectionNum num="9" label="소리담" />
            <h2 className="mt-6 text-center font-serif text-[1.55rem] font-semibold italic leading-[1.3] tracking-tight text-[#1A1A2E] sm:text-[36px]">
              소리담은<br />이렇게 도와드립니다
            </h2>
            <p className="mx-auto mt-4 max-w-[560px] text-center text-base leading-relaxed text-[#6B6B7B]">
              빈도 분석으로 전략을 세우고, 스크립트로 준비하고,<br />모의고사로 실전을 재현하고, 튜터링으로 약점을 보강합니다.
            </p>
          </ScrollReveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {modules.map((m, i) => (
              <ScrollReveal key={m.name} preset="fade-up" delay={i * 0.08}>
                <div className="rounded-2xl border border-[#E8E6E1] bg-[#F3F2EF] p-6 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] bg-primary-50 text-primary-500"><m.icon size={22} /></div>
                  <h3 className="mt-3 text-lg font-bold text-[#1A1A2E]">{m.name}</h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#6B6B7B]">{m.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal preset="fade-up" delay={0.2}>
            <div className="mt-10 flex items-center justify-center gap-1 text-[11px] sm:gap-3 sm:text-sm">
              {["빈도 분석", "→", "스크립트 생성", "→", "실전 모의고사", "→", "약점 튜터링"].map((item, i) =>
                item === "→" ? (
                  <span key={i} className="text-[#D0CEC8]">→</span>
                ) : (
                  <span key={i} className="whitespace-nowrap rounded-lg bg-primary-50 px-2.5 py-1.5 font-semibold text-primary-700 sm:px-4 sm:py-2">{item}</span>
                )
              )}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ━━━ Section 10: 데이터 플라이휠 ━━━ */}
      <section className="border-b border-[#E8E6E1] bg-[#FAFAF7] py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <ScrollReveal preset="fade-up">
            <SectionNum num="10" label="데이터 플라이휠" />
            <h2 className="mt-6 text-center font-serif text-[1.55rem] font-semibold italic leading-[1.3] tracking-tight text-[#1A1A2E] sm:text-[36px]">
              사용자가 쌓을수록<br />전략이 정밀해집니다
            </h2>
            <p className="mx-auto mt-4 max-w-[560px] text-center text-base leading-relaxed text-[#6B6B7B]">
              소리담의 전략은 데이터가 쌓일수록 강해지는 구조입니다.
              <br className="hidden sm:block" />{" "}
              같은 서베이로 모인 데이터는 분산 없이 한 곳에 축적됩니다.
            </p>
          </ScrollReveal>

          <ScrollReveal preset="fade-up" delay={0.1}>
            <div className="mt-12 rounded-2xl bg-[#1A1A2E] p-6 sm:p-8">
              <p className="text-center text-sm font-medium text-[#A0A0AF]">데이터 선순환 구조</p>
              <div className="mx-auto mt-6 w-fit space-y-0">
                {[
                  { step: "1", text: "추천 서베이로 시험 응시", Icon: ClipboardCheck },
                  { step: "2", text: "데이터랩에 시험 후기 제출", Icon: TrendingUp },
                  { step: "3", text: "같은 서베이 기준의 데이터 축적", Icon: Database },
                  { step: "4", text: "통계 분석 정밀도 향상", Icon: Target },
                  { step: "5", text: "학습 범위 더 정밀하게 축소", Icon: Microscope },
                  { step: "6", text: "더 효율적인 학습 → 더 좋은 성적", Icon: Trophy },
                  { step: "7", text: "더 많은 사용자 → 더 많은 데이터", Icon: RefreshCw },
                ].map((item, i) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="flex w-10 flex-shrink-0 flex-col items-center">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${i === 6 ? "bg-primary-500 text-white" : "bg-white/10 text-white/70"}`}>
                        <item.Icon size={18} />
                      </div>
                      {i < 6 && <div className="h-4 w-px bg-white/20" />}
                    </div>
                    <div className="flex h-10 items-center">
                      <p className={`text-sm ${i === 6 ? "font-bold text-primary-300" : "text-white/80"}`}>{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal preset="fade-up">
            <div className="mt-10 overflow-hidden rounded-2xl border border-[#E8E6E1]">
              <div className="grid sm:grid-cols-2">
                {/* 서베이가 다를 때 */}
                <div className="border-b border-[#E8E6E1] bg-[#F3F2EF] p-5 sm:border-b-0 sm:border-r">
                  <div className="flex items-center gap-2">
                    <X size={16} className="text-[#A0A0AF]" />
                    <p className="text-sm font-bold text-[#6B6B7B]">서베이가 다를 때</p>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {["수십 가지 조합으로 데이터 분산", "조합별 표본 5~10건씩 파편화", "통계 신뢰도 낮음", "분석 가치 제한적"].map((t) => (
                      <li key={t} className="flex items-start gap-2 text-sm text-[#A0A0AF]">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D0CEC8]" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* 서베이를 고정할 때 */}
                <div className="bg-white p-5">
                  <div className="flex items-center gap-2">
                    <Check size={16} className="text-primary-500" />
                    <p className="text-sm font-bold text-[#1A1A2E]">서베이를 고정할 때</p>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {["데이터가 한 곳에 집중", "전체가 같은 조합 → 대규모 표본", "통계 신뢰도 높음", "정밀한 예측 가능"].map((t) => (
                      <li key={t} className="flex items-start gap-2 text-sm text-[#1A1A2E]">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal preset="fade-up" delay={0.15}>
            <div className="mt-10 overflow-x-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden rounded-2xl border border-[#E8E6E1] bg-white">
              <div className="border-b border-[#E8E6E1] bg-[#F3F2EF] px-6 py-3">
                <p className="text-center text-sm font-semibold text-[#1A1A2E]">데이터 규모별 예상 효과</p>
              </div>
              <div className="divide-y divide-[#E8E6E1]">
                {flywheelScaleEffects.map((item) => (
                  <div key={item.scale} className={`flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:gap-6 ${item.current ? "bg-primary-50/50" : ""}`}>
                    <div className="flex items-center gap-2 sm:min-w-[100px]">
                      <span className={`text-lg font-black ${item.current ? "text-primary-600" : "text-[#1A1A2E]"}`}>{item.scale}</span>
                      {item.current && <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-600">현재</span>}
                    </div>
                    <div className="flex-1"><p className="text-sm text-[#6B6B7B]">{item.precision}</p></div>
                    <p className="text-sm font-semibold text-[#1A1A2E]">{item.effect}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ━━━ Final CTA ━━━ */}
      <section className="bg-[#12121F] py-16 sm:py-32">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <ScrollReveal preset="fade-up">
            <h2 className="font-serif text-3xl font-semibold italic tracking-tight text-white sm:text-[44px] sm:leading-[1.2]">
              &ldquo;막연함&rdquo;에서<br />&ldquo;선명함&rdquo;으로.
            </h2>
          </ScrollReveal>
          <ScrollReveal preset="fade-up" delay={0.1}>
            <p className="mt-5 text-[17px] leading-relaxed text-white/70">
              데이터 기반 전략으로, 시험의 84%를 대비한 상태로 응시하세요.
            </p>
          </ScrollReveal>
          <ScrollReveal preset="scale-up" delay={0.2}>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/signup" className="inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-primary-500 px-8 text-base font-semibold text-white shadow-[0_4px_16px_rgba(58,91,199,0.3)] transition-colors hover:bg-primary-600">
                무료로 시작하기 <ArrowRight className="h-[18px] w-[18px]" />
              </Link>
            </div>
          </ScrollReveal>
          <ScrollReveal preset="fade-in" delay={0.3}>
            <p className="mt-6 text-[13px] text-white/40">지금 바로, 부담 없이 시작하세요</p>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
