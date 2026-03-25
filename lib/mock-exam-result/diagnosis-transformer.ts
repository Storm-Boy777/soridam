/**
 * 체크박스 데이터 → 세부진단표 변환
 *
 * `mock_test_reports`의 aggregated_checkboxes를 읽어서
 * UI가 소비하는 DiagnosticData 형태로 변환
 */

import type {
  DiagnosticSection,
  DiagnosticFunction,
  PerformanceLevel,
} from "@/lib/mock-data/mock-exam-result";

// ── v1 체크박스 결과 타입 (DB에서 읽어오는 형태) ──

interface CheckboxResultV1 {
  pass: boolean;
  evidence?: string;
}

type AggregatedCheckboxes = Record<string, CheckboxResultV1>;

// ── 변환 입력/출력 ──

export interface DiagnosisTransformInput {
  /** v1 mock_test_reports.aggregated_int_checkboxes */
  aggregated_int: AggregatedCheckboxes | null;
  /** v1 mock_test_reports.aggregated_adv_checkboxes */
  aggregated_adv: AggregatedCheckboxes | null;
  /** v1 mock_test_reports.aggregated_al_checkboxes */
  aggregated_al: AggregatedCheckboxes | null;
  /** 최종 등급 (AL 섹션 표시 여부 결정) */
  final_level: string;
}

export interface DiagnosisTransformOutput {
  sections: DiagnosticSection[];
  checkboxResults: Record<string, boolean>;
}

// ── 고정 구조: 진단표 섹션 정의 ──

const INT_FUNCTIONS: Omit<DiagnosticFunction, "performance">[] = [
  {
    id: "INT-1",
    title_ko: "언어 생성",
    title_en: "Can create with the language to provide personal information",
    checkboxIds: ["INT-1-1", "INT-1-2", "INT-1-3"],
  },
  {
    id: "INT-2",
    title_ko: "문장 발화",
    title_en: "Can speak in sentences on familiar topics and routines",
    checkboxIds: ["INT-2-1", "INT-2-2", "INT-2-3"],
  },
  {
    id: "INT-3",
    title_ko: "질문 구성",
    title_en: "Can handle a simple transaction by asking and answering questions",
    checkboxIds: ["INT-3-1", "INT-3-2"],
  },
  {
    id: "INT-4",
    title_ko: "이해 가능성",
    title_en: "Is generally understood by those accustomed to language learners",
    checkboxIds: [
      "INT-4-F1", "INT-4-F2", "INT-4-F3", "INT-4-F4", "INT-4-F5",
      "INT-4-P1", "INT-4-P2", "INT-4-P3", "INT-4-P4",
      "INT-4-G1", "INT-4-G2", "INT-4-S1",
    ],
  },
];

const ADV_FUNCTIONS: Omit<DiagnosticFunction, "performance">[] = [
  {
    id: "ADV-1",
    title_ko: "시제 활용",
    title_en: "Can narrate and describe in all time frames",
    checkboxIds: [
      "ADV-1-D1", "ADV-1-D2", "ADV-1-D3",
      "ADV-1-N1", "ADV-1-N2", "ADV-1-N3",
      "ADV-1-PR1", "ADV-1-PR2", "ADV-1-PR3",
      "ADV-1-L1", "ADV-1-L2",
    ],
  },
  {
    id: "ADV-2",
    title_ko: "문단 구성",
    title_en: "Can consistently produce connected discourse of paragraph length",
    checkboxIds: [
      "ADV-2-SP1", "ADV-2-SP2", "ADV-2-SP3", "ADV-2-SP4", "ADV-2-SP5",
      "ADV-2-WO1", "ADV-2-WO2", "ADV-2-WO3",
      "ADV-2-CD1", "ADV-2-CD2", "ADV-2-CD3",
    ],
  },
  {
    id: "ADV-3",
    title_ko: "주제 다양성",
    title_en: "Can speak about a variety of topics, including current events",
    checkboxIds: ["ADV-3-V1", "ADV-3-V2", "ADV-3-V3"],
  },
  {
    id: "ADV-4",
    title_ko: "돌발 대처",
    title_en: "Can deal effectively with an unanticipated complication",
    checkboxIds: ["ADV-4-CR1", "ADV-4-CR2", "ADV-4-CR3", "ADV-4-CD1"],
  },
  {
    id: "ADV-5",
    title_ko: "이해 용이성",
    title_en: "Can be readily understood by speakers not accustomed to non-native speakers",
    checkboxIds: [
      "ADV-5-F1", "ADV-5-F2", "ADV-5-F3",
      "ADV-5-G1", "ADV-5-G2", "ADV-5-G3", "ADV-5-G4", "ADV-5-G5",
      "ADV-5-PC1",
      "ADV-5-P1", "ADV-5-P2", "ADV-5-P3", "ADV-5-P4",
    ],
  },
];

const AL_FUNCTIONS: Omit<DiagnosticFunction, "performance">[] = [
  {
    id: "AL-14",
    title_ko: "비교·변화",
    title_en: "Can compare, contrast, and describe changes over time",
    checkboxIds: ["AL-14-PS", "AL-14-LS", "AL-14-CS", "AL-14-CD", "AL-14-VB", "AL-14-GA"],
  },
  {
    id: "AL-15",
    title_ko: "사회적 이슈",
    title_en: "Can discuss social issues with supporting arguments",
    checkboxIds: ["AL-15-AS", "AL-15-MA", "AL-15-SI", "AL-15-CD", "AL-15-VB", "AL-15-GA"],
  },
];

// ── Performance 판정 로직 ──

/**
 * 기능별 pass_rate → PerformanceLevel 변환
 *
 * | pass_rate | 판정 |
 * |-----------|------|
 * | 90%+      | meets_fully (완전 충족) |
 * | 70~89%    | meets_minimally (최소 충족) |
 * | 50~69%    | developing (발전 중) |
 * | 25~49%    | emerging (출현 수준) |
 * | 0~24%     | random (간헐적 수행) |
 */
function calcPerformance(passRate: number): PerformanceLevel {
  if (passRate >= 0.9) return "meets_fully";
  if (passRate >= 0.7) return "meets_minimally";
  if (passRate >= 0.5) return "developing";
  if (passRate >= 0.25) return "emerging";
  return "random";
}

// ── AL 표시 여부 결정 ──

const SHOW_AL_GRADES = new Set(["IH", "AL"]);

// ── 메인 변환 함수 ──

/**
 * v1 aggregated checkboxes → v2 DiagnosticData 변환
 */
export function transformDiagnosisData(
  input: DiagnosisTransformInput,
): DiagnosisTransformOutput {
  const allCheckboxes: AggregatedCheckboxes = {
    ...(input.aggregated_int || {}),
    ...(input.aggregated_adv || {}),
    ...(input.aggregated_al || {}),
  };

  // 1. checkboxResults: pass boolean만 추출
  const checkboxResults: Record<string, boolean> = {};
  for (const [id, result] of Object.entries(allCheckboxes)) {
    checkboxResults[id] = result.pass;
  }

  // 2. 각 function의 performance 계산
  function buildFunctions(
    defs: Omit<DiagnosticFunction, "performance">[],
  ): DiagnosticFunction[] {
    return defs.map((fn) => {
      const total = fn.checkboxIds.length;
      const passCount = fn.checkboxIds.filter(
        (id) => checkboxResults[id] === true,
      ).length;
      const passRate = total > 0 ? passCount / total : 0;

      return {
        ...fn,
        performance: calcPerformance(passRate),
      };
    });
  }

  // 3. sections 구성
  const sections: DiagnosticSection[] = [
    {
      section: "INT",
      title: "Intermediate 진단표",
      subtitle: "Intermediate 수준의 기준 충족 여부",
      functions: buildFunctions(INT_FUNCTIONS),
    },
    {
      section: "ADV",
      title: "Advanced 진단표",
      subtitle: "Advanced 수준의 기준 충족 여부",
      functions: buildFunctions(ADV_FUNCTIONS),
    },
  ];

  // AL 섹션: IH/AL 등급일 때만 표시
  if (SHOW_AL_GRADES.has(input.final_level.toUpperCase())) {
    sections.push({
      section: "AL",
      title: "Advanced Low 진단표",
      subtitle: "IH/AL 등급 판정을 위한 추가 기준",
      functions: buildFunctions(AL_FUNCTIONS),
    });
  }

  return { sections, checkboxResults };
}
