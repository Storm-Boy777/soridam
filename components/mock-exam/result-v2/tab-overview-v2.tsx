"use client";

import { GRADE_DEFINITIONS, MOCK_OVERVIEW_DATA } from "@/lib/mock-data/result-v2";

// ── 종합 진단 탭 (v2) — 공식 진단서 톤 ──

export function TabOverviewV2() {
  const { session, overall_comments, performance_summary } = MOCK_OVERVIEW_DATA;
  const gradeDef = GRADE_DEFINITIONS[session.grade];

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-8 md:px-8 md:py-12">

      {/* ── 진단서 프레임 ── */}
      <div className="border border-[#d0d7e2] bg-white shadow-[0_12px_36px_rgba(20,28,38,0.06)]">

        {/* ── 상단: 등급 표시 ── */}
        <div className="border-b border-[#d0d7e2] px-6 py-8 md:px-10 md:py-10">
          <div className="text-center">
            <div className="mb-1 text-[10px] font-extrabold tracking-[0.14em] uppercase text-[#5f6976]">
              OPIc 모의고사 결과
            </div>
            <div className="font-serif text-[72px] font-black leading-[0.9] tracking-[-0.06em] text-[#161b23] md:text-[92px]">
              {session.grade}
            </div>
            <p className="mt-3 text-[15px] leading-[1.7] text-[#5f6976]">
              본 응시자는 <strong className="text-[#161b23]">{gradeDef.full_name}</strong> 등급으로 판정되었습니다.
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-[#8a93a1]">
              <span>{session.mode === "test" ? "실전 모드" : "훈련 모드"}</span>
              <span>·</span>
              <span>{formatDate(session.date)}</span>
            </div>
          </div>
        </div>

        {/* ── 등급 의미 (고정 텍스트) ── */}
        <div className="border-b border-[#d0d7e2] px-6 py-6 md:px-10">
          <SectionTitle>{gradeDef.full_name} 등급이란?</SectionTitle>
          <p className="text-[14px] leading-[1.8] text-[#2f3644]">
            {gradeDef.short_description}
          </p>
        </div>

        {/* ── 종합 소견 (개인화, GPT 생성) ── */}
        <div className="border-b border-[#d0d7e2] px-6 py-6 md:px-10">
          <SectionTitle>종합 소견</SectionTitle>
          <p className="text-[14px] leading-[1.9] text-[#2f3644]" style={{ textAlign: "justify" }}>
            {overall_comments}
          </p>
        </div>

        {/* ── 수행 요약 (개인화, GPT 생성) ── */}
        <div className="border-b border-[#d0d7e2] px-6 py-6 md:px-10">
          <SectionTitle>{gradeDef.full_name} 수행 요약</SectionTitle>
          <ul className="list-disc space-y-2.5 pl-5 marker:text-[#161b23]">
            {performance_summary.map((item, i) => (
              <li key={i} className="text-[14px] leading-[1.75] text-[#2f3644]">
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* ── 등급별 기능 설명 (고정 텍스트, FACT 테이블) ── */}
        <div className="px-6 py-6 md:px-10">
          <SectionTitle>{gradeDef.full_name} 기능 설명</SectionTitle>
          <table className="w-full border-collapse border border-[#d8e0ea]">
            <tbody>
              <FunctionRow
                label="과제 수행"
                sublabel="Functions"
                value={gradeDef.speakers_table.communication_tasks}
              />
              <FunctionRow
                label="맥락 · 내용"
                sublabel="Context"
                value={gradeDef.speakers_table.contexts_content}
              />
              <FunctionRow
                label="담화 유형"
                sublabel="Text Type"
                value={gradeDef.speakers_table.discourse_type}
              />
              <FunctionRow
                label="정확성"
                sublabel="Accuracy"
                value={gradeDef.speakers_table.accuracy}
                isLast
              />
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

// ── 섹션 타이틀 (• 볼드 스타일) ──
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[15px] font-extrabold tracking-[0.01em] text-[#161b23]">
      <span className="mr-1.5 text-[#2449d8]">•</span>
      {children}
    </h2>
  );
}

// ── 기능 설명 테이블 행 ──
function FunctionRow({ label, sublabel, value, isLast = false }: {
  label: string;
  sublabel: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <tr className={!isLast ? "border-b border-[#d8e0ea]" : ""}>
      <td className="w-[80px] whitespace-nowrap bg-[#f7f9fc] px-3 py-3 align-middle md:w-[80px] md:px-4">
        <div className="text-[13px] font-bold text-[#5f6976]">{label}</div>
        <div className="mt-0.5 text-[10px] font-medium text-[#8a93a1]">{sublabel}</div>
      </td>
      <td className="px-3 py-3 align-middle text-[13px] leading-[1.65] text-[#161b23] md:px-4">
        {value}
      </td>
    </tr>
  );
}

// ── 날짜 포맷 ──
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}
