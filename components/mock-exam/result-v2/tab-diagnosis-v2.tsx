"use client";

import {
  CHECKBOX_LABELS_KO,
  MOCK_DIAGNOSIS_DATA,
  PERFORMANCE_LABELS_KO,
  type DiagnosticFunction,
  type DiagnosticSection,
  type PerformanceLevel,
} from "@/lib/mock-data/result-v2";

// ── 세부진단표 탭 (v2) — 공식 DIAGNOSTIC FORM 한글화 ──

export function TabDiagnosisV2() {
  const { sections, checkboxResults } = MOCK_DIAGNOSIS_DATA;

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-8 md:px-8 md:py-12">
      <div className="space-y-6">
        {sections.map((section) => (
          <DiagnosticSectionCard
            key={section.section}
            section={section}
            checkboxResults={checkboxResults}
          />
        ))}
      </div>
    </div>
  );
}

// ── 섹션 카드 (INT / ADV / AL) ──
function DiagnosticSectionCard({
  section,
  checkboxResults,
}: {
  section: DiagnosticSection;
  checkboxResults: Record<string, boolean>;
}) {
  return (
    <div className="border border-[#d0d7e2] bg-white shadow-[0_12px_36px_rgba(20,28,38,0.06)]">
      {/* 섹션 헤더 */}
      <div className="border-b border-[#d0d7e2] px-6 py-4 md:px-8">
        <h2 className="text-[15px] font-extrabold tracking-[0.01em] text-[#161b23]">
          <span className="mr-1.5 text-[#2449d8]">•</span>
          {section.title}
        </h2>
        <p className="mt-0.5 text-[12px] text-[#8a93a1]">{section.subtitle}</p>
      </div>

      {/* 테이블 헤더 */}
      <div className="hidden border-b border-[#d0d7e2] bg-[#f7f9fc] md:grid md:grid-cols-[200px_120px_1fr]">
        <div className="px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#5f6976]">
          {section.section === "AL" ? "Advanced Low 기준" : `${section.section} Functions`}
        </div>
        <div className="px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#5f6976]">
          Performance
        </div>
        <div className="px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#5f6976]">
          세부 항목
        </div>
      </div>

      {/* 기능별 행 */}
      {section.functions.map((fn, idx) => (
        <DiagnosticFunctionRow
          key={fn.id}
          fn={fn}
          checkboxResults={checkboxResults}
          isLast={idx === section.functions.length - 1}
        />
      ))}
    </div>
  );
}

// ── 기능 행 (1행 = 기능명 + 판정 + 체크박스들) ──
function DiagnosticFunctionRow({
  fn,
  checkboxResults,
  isLast,
}: {
  fn: DiagnosticFunction;
  checkboxResults: Record<string, boolean>;
  isLast: boolean;
}) {
  const passCount = fn.checkboxIds.filter((id) => checkboxResults[id]).length;
  const totalCount = fn.checkboxIds.length;

  return (
    <div className={`${!isLast ? "border-b border-[#d0d7e2]" : ""}`}>
      {/* PC: 3컬럼 그리드 */}
      <div className="hidden md:grid md:grid-cols-[200px_120px_1fr]">
        {/* 기능명 */}
        <div className="border-r border-[#e8edf3] bg-[#f7f9fc] px-4 py-4">
          <div className="text-[13px] font-bold leading-[1.5] text-[#2f3644]">
            {fn.title_ko}
          </div>
          <div className="mt-1 text-[11px] leading-[1.4] text-[#8a93a1]">
            {fn.title_en}
          </div>
        </div>
        {/* 판정 */}
        <div className="flex items-center border-r border-[#e8edf3] px-4 py-4">
          <PerformanceBadge level={fn.performance} />
        </div>
        {/* 체크박스 */}
        <div className="px-4 py-4">
          <div className="mb-1.5 text-[11px] font-bold text-[#8a93a1]">
            {passCount}/{totalCount} 충족
          </div>
          <CheckboxGrid ids={fn.checkboxIds} results={checkboxResults} />
        </div>
      </div>

      {/* 모바일: 세로 스택 */}
      <div className="md:hidden">
        <div className="flex items-center justify-between gap-3 bg-[#f7f9fc] px-4 py-3">
          <div>
            <div className="text-[13px] font-bold text-[#2f3644]">{fn.title_ko}</div>
            <div className="mt-0.5 text-[10px] text-[#8a93a1]">{fn.title_en}</div>
          </div>
          <PerformanceBadge level={fn.performance} />
        </div>
        <div className="px-4 py-3">
          <div className="mb-1.5 text-[11px] font-bold text-[#8a93a1]">
            {passCount}/{totalCount} 충족
          </div>
          <CheckboxGrid ids={fn.checkboxIds} results={checkboxResults} />
        </div>
      </div>
    </div>
  );
}

// ── Performance 판정 뱃지 ──
function PerformanceBadge({ level }: { level: PerformanceLevel }) {
  const label = PERFORMANCE_LABELS_KO[level];

  const colorMap: Record<PerformanceLevel, string> = {
    meets_fully: "bg-[#e8f5e9] text-[#2e7d32]",
    meets_minimally: "bg-[#e3f2fd] text-[#1565c0]",
    developing: "bg-[#fff3e0] text-[#e65100]",
    emerging: "bg-[#fce4ec] text-[#c62828]",
    random: "bg-[#f3e5f5] text-[#6a1b9a]",
  };

  return (
    <span className={`inline-block whitespace-nowrap rounded px-2 py-1 text-[11px] font-bold ${colorMap[level]}`}>
      {label}
    </span>
  );
}

// ── 체크박스 그리드 ──
function CheckboxGrid({
  ids,
  results,
}: {
  ids: string[];
  results: Record<string, boolean>;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 md:grid-cols-2 lg:grid-cols-3">
      {ids.map((id) => {
        const pass = results[id] ?? false;
        const labelInfo = CHECKBOX_LABELS_KO[id];
        const label = labelInfo?.label ?? id;

        return (
          <div key={id} className="flex items-start gap-2">
            {/* 체크박스 아이콘 */}
            <div
              className={`mt-[3px] flex h-[14px] w-[14px] flex-shrink-0 items-center justify-center border ${
                pass
                  ? "border-[#2449d8] bg-[#e8edff]"
                  : "border-[#b7c1cf] bg-white"
              }`}
            >
              {pass && (
                <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                  <path
                    d="M1 3L3 5L7 1"
                    stroke="#2449d8"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            {/* 라벨 */}
            <span className={`text-[12px] leading-[1.5] ${pass ? "text-[#2f3644]" : "text-[#8a93a1]"}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
