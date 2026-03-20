/**
 * v2 모의고사 결과 목(mock) 데이터
 * UI 먼저 구현용 — 나중에 실제 GPT 출력 + DB 조회로 교체
 */

// ── 등급별 고정 텍스트 (ACTFL 공식 기준) ──

export const GRADE_DEFINITIONS: Record<string, {
  full_name: string;
  short_description: string;
  speakers_table: {
    communication_tasks: string;
    contexts_content: string;
    discourse_type: string;
    accuracy: string;
  };
}> = {
  NL: {
    full_name: "Novice Low",
    short_description: "기본 단어와 암기한 표현을 사용하여 의사소통할 수 있습니다. 익숙한 단서가 주어지면 인사, 자기소개, 사물 이름 말하기 등이 가능합니다.",
    speakers_table: {
      communication_tasks: "암기한 단어와 표현으로 최소한의 의사소통이 가능합니다.",
      contexts_content: "가장 기본적인 일상 상황에서 제한적으로 의사소통합니다.",
      discourse_type: "개별 단어와 암기한 구문을 생산합니다.",
      accuracy: "언어 학습자에 익숙한 청자도 이해하기 어려울 수 있습니다.",
    },
  },
  NM: {
    full_name: "Novice Mid",
    short_description: "기본적인 사회적 의사소통을 개별 단어, 암기한 구문, 짧은 문장으로 수행합니다. 직접적인 질문에 응답할 수 있으며, 의사소통을 유지하기 위해 상대방의 말을 재활용하기도 합니다.",
    speakers_table: {
      communication_tasks: "암기한 단어와 구문으로 기본적인 의사소통이 가능합니다.",
      contexts_content: "기본적인 자기소개 관련 상황에서 의사소통합니다.",
      discourse_type: "개별 단어, 암기한 구문, 짧은 문장을 생산합니다.",
      accuracy: "다른 언어의 영향이 뚜렷하게 나타날 수 있습니다.",
    },
  },
  NH: {
    full_name: "Novice High",
    short_description: "단순한 사회적 상황에서 다수의 의사소통 과제를 성공적으로 수행합니다. 주로 현재 시제의 짧은 문장으로 기본적인 개인 정보, 사물, 활동에 대해 말할 수 있습니다.",
    speakers_table: {
      communication_tasks: "기본적인 생존 상황에서의 의사소통 과제를 다수 수행합니다.",
      contexts_content: "기본적인 개인 정보, 사물, 활동, 선호에 대해 의사소통합니다.",
      discourse_type: "주로 짧은 문장, 때때로 불완전한 문장을 생산합니다.",
      accuracy: "반복이나 바꿔 말하기로 의사소통 오류를 수정할 수 있습니다.",
    },
  },
  IL: {
    full_name: "Intermediate Low",
    short_description: "제한된 수의 의사소통 과제를 언어를 창조적으로 사용하여 수행합니다. 기본적인 개인 정보에 대해 말할 수 있으나, 주로 반응적이며 직접 질문에 답하는 데 어려움이 있을 수 있습니다.",
    speakers_table: {
      communication_tasks: "제한된 범위의 단순한 의사소통 과제를 수행합니다.",
      contexts_content: "자기, 가족, 일상 활동, 즉각적 필요에 관한 예측 가능한 주제에 제한됩니다.",
      discourse_type: "짧은 문장을 생산하며, 주저함과 자기 교정이 빈번합니다.",
      accuracy: "다른 언어의 영향이 강하지만 대체로 이해될 수 있습니다.",
    },
  },
  IM1: {
    full_name: "Intermediate Mid 1",
    short_description: "직접적인 사회적·거래적 상황에서 다양한 의사소통 과제를 성공적으로 수행합니다. 개인 정보, 일상 활동, 관심사에 대해 효과적으로 대화할 수 있습니다. 문장 연결로 말하며, 때때로 주저하거나 자기 교정을 합니다.",
    speakers_table: {
      communication_tasks: "자기, 타인, 일상생활에 대해 의사소통합니다. 일상적 상황에서 짧은 사회적 상호작용을 처리합니다.",
      contexts_content: "자기, 가족, 가정, 일상 활동, 관심사, 개인적 선호와 관련된 예측 가능한 교환에 제한됩니다.",
      discourse_type: "주로 문장과 문장 연결로 응답합니다. 발화에 주저함, 재구성, 자기 교정이 포함될 수 있습니다.",
      accuracy: "어휘 제한, 문법 오류, 발음 문제에도 불구하고 대체로 이해됩니다.",
    },
  },
  IM2: {
    full_name: "Intermediate Mid 2",
    short_description: "직접적인 사회적·거래적 상황에서 다양한 의사소통 과제를 성공적으로 수행합니다. 개인 정보, 일상 활동, 관심사에 대해 효과적으로 대화할 수 있습니다. 문장 연결로 말하며, 때때로 주저하거나 자기 교정을 합니다.",
    speakers_table: {
      communication_tasks: "자기, 타인, 일상생활에 대해 의사소통합니다. 일상적 상황에서 짧은 사회적 상호작용을 처리합니다.",
      contexts_content: "자기, 가족, 가정, 일상 활동, 관심사, 개인적 선호와 관련된 예측 가능한 교환에 제한됩니다.",
      discourse_type: "주로 문장과 문장 연결로 응답합니다. 발화에 주저함, 재구성, 자기 교정이 포함될 수 있습니다.",
      accuracy: "어휘 제한, 문법 오류, 발음 문제에도 불구하고 대체로 이해됩니다.",
    },
  },
  IM3: {
    full_name: "Intermediate Mid 3",
    short_description: "직접적인 사회적·거래적 상황에서 다양한 의사소통 과제를 성공적으로 수행합니다. Intermediate 과제에 대해 많은 양과 질로 응답하며, 연결 문장을 생산합니다. 발화에 가끔 주저함이나 자기 교정이 있을 수 있습니다.",
    speakers_table: {
      communication_tasks: "자기, 타인, 일상생활에 대해 의사소통합니다. 일상적 상황에서 짧은 사회적 상호작용을 처리합니다.",
      contexts_content: "자기, 가족, 가정, 일상 활동, 관심사, 개인적 선호와 관련된 예측 가능한 교환에서 의사소통합니다.",
      discourse_type: "Intermediate 과제에 대해 많은 양을 말합니다. 주로 문장 연결로 응답하며, 발화에 가끔 주저함이나 자기 교정이 있습니다.",
      accuracy: "익숙한 주제에서 문장으로 의사소통할 때 가장 정확합니다. 어휘 제한, 문법 오류, 발음 문제에도 불구하고 이해됩니다.",
    },
  },
  IH: {
    full_name: "Intermediate High",
    short_description: "일상적인 과제와 사회적 상황에서 편안하고 자신 있게 대화합니다. Advanced 수준의 과제를 상당 부분 수행할 수 있으나, 모든 과제를 항상 유지하지는 못합니다. 주요 시제로 단락 수준의 연결 발화가 가능하지만, 일관되지 않을 수 있습니다.",
    speakers_table: {
      communication_tasks: "Intermediate 수준 과제를 편안하게 수행합니다. Advanced 수준의 과제(주요 시제로 서술·묘사, 단락 수준 발화)를 상당 부분 처리하나, 하나 이상의 언어적 약점이 나타납니다.",
      contexts_content: "직장, 학교, 여가, 특정 관심사와 관련된 기본적 정보 교환이 필요한 사회적 상황에서 의사소통합니다.",
      discourse_type: "문장 연결과 연결 문장으로 말합니다. 때때로 짧은 단락 수준의 발화를 생산할 수 있습니다.",
      accuracy: "비원어민에 익숙하지 않은 원어민도 대체로 이해하나, 의사소통 간극이 발생할 수 있고 다른 언어의 간섭이 관찰됩니다.",
    },
  },
  AL: {
    full_name: "Advanced Low",
    short_description: "다양한 의사소통 과제를 수행할 수 있습니다. 대부분의 비격식적·일부 격식적 대화에 참여하며, 주요 시제로 서술·묘사가 가능합니다. 문장을 단락 수준으로 연결하고, 예상치 못한 상황의 핵심적 언어적 도전을 적절히 처리합니다.",
    speakers_table: {
      communication_tasks: "주요 시제로 서술과 묘사를 편안하게 수행합니다. 예상치 못한 상황에 효과적으로 대처합니다.",
      contexts_content: "개인적·일반적 관심사, 지역사회·국가·국제 이슈, 업무 관련 주제에 대해 의사소통합니다.",
      discourse_type: "조직적이고 응집력 있는 완전한 구두 단락을 생산합니다.",
      accuracy: "비원어민에 익숙하지 않은 청자도 어려움 없이 이해합니다.",
    },
  },
};

// ── 체크박스 한글 라벨 매핑 (공식 DIAGNOSTIC FORM 기반) ──

export const CHECKBOX_LABELS_KO: Record<string, {
  label: string;
  subgroup?: string;
}> = {
  // INT-1: 언어 생성 (3개)
  "INT-1-1": { label: "개인 정보 전달 어휘력" },
  "INT-1-2": { label: "질문 이해 듣기 능력" },
  "INT-1-3": { label: "문장 수준 발화 생성" },
  // INT-2: 문장 발화 (3개)
  "INT-2-1": { label: "단어와 암기 구문" },
  "INT-2-2": { label: "일부 문장 생성" },
  "INT-2-3": { label: "대부분 문장으로 발화" },
  // INT-3: 질문 구성 (2개)
  "INT-3-1": { label: "질문을 정확하게 구성" },
  "INT-3-2": { label: "거래 완료에 충분한 질문과 응답" },
  // INT-4: 이해 가능성 (12개)
  "INT-4-F1": { label: "발화 속도", subgroup: "유창성" },
  "INT-4-F2": { label: "유창성 (멈춤)", subgroup: "유창성" },
  "INT-4-F3": { label: "미완성 발화", subgroup: "유창성" },
  "INT-4-F4": { label: "잘못된 시작", subgroup: "유창성" },
  "INT-4-F5": { label: "반복", subgroup: "유창성" },
  "INT-4-P1": { label: "조음 명확성", subgroup: "발음" },
  "INT-4-P2": { label: "음높이", subgroup: "발음" },
  "INT-4-P3": { label: "강세", subgroup: "발음" },
  "INT-4-P4": { label: "억양", subgroup: "발음" },
  "INT-4-G1": { label: "기초 문장 문법", subgroup: "문법" },
  "INT-4-G2": { label: "완전한 문장 구성", subgroup: "문법" },
  "INT-4-S1": { label: "문장 어순", subgroup: "통사" },
  // ADV-1: 시제 활용 (11개)
  "ADV-1-D1": { label: "현재 시제 묘사", subgroup: "묘사" },
  "ADV-1-D2": { label: "과거 시제 묘사", subgroup: "묘사" },
  "ADV-1-D3": { label: "미래 시제 묘사", subgroup: "묘사" },
  "ADV-1-N1": { label: "현재 시제 서술", subgroup: "서술" },
  "ADV-1-N2": { label: "과거 시제 서술", subgroup: "서술" },
  "ADV-1-N3": { label: "미래 시제 서술", subgroup: "서술" },
  "ADV-1-PR1": { label: "논리적 순서", subgroup: "서술 문제" },
  "ADV-1-PR2": { label: "동사 형태", subgroup: "서술 문제" },
  "ADV-1-PR3": { label: "인칭 표지", subgroup: "서술 문제" },
  "ADV-1-L1": { label: "명확성", subgroup: "묘사 부족" },
  "ADV-1-L2": { label: "세부 사항", subgroup: "묘사 부족" },
  // ADV-2: 문단 구성 (11개)
  "ADV-2-SP1": { label: "단어와 구문", subgroup: "발화 수준" },
  "ADV-2-SP2": { label: "문장", subgroup: "발화 수준" },
  "ADV-2-SP3": { label: "문장 나열", subgroup: "발화 수준" },
  "ADV-2-SP4": { label: "연결된 문장", subgroup: "발화 수준" },
  "ADV-2-SP5": { label: "뼈대 수준 문단", subgroup: "발화 수준" },
  "ADV-2-WO1": { label: "구문 어순", subgroup: "어순 문제" },
  "ADV-2-WO2": { label: "문장 어순", subgroup: "어순 문제" },
  "ADV-2-WO3": { label: "문단 어순", subgroup: "어순 문제" },
  "ADV-2-CD1": { label: "연결어 사용", subgroup: "연결어" },
  "ADV-2-CD2": { label: "연결어 정확성", subgroup: "연결어" },
  "ADV-2-CD3": { label: "연결어 다양성", subgroup: "연결어" },
  // ADV-3: 주제 다양성 (3개)
  "ADV-3-V1": { label: "어휘 폭" },
  "ADV-3-V2": { label: "타 언어 단어 사용" },
  "ADV-3-V3": { label: "거짓 동족어 사용" },
  // ADV-4: 돌발 대처 (4개)
  "ADV-4-CR1": { label: "힘들지만 상황 해결 성공" },
  "ADV-4-CR2": { label: "시도하나 성공적 해결 불가" },
  "ADV-4-CR3": { label: "상황 대처 언어 능력 없음" },
  "ADV-4-CD1": { label: "의사소통 전략 활용" },
  // ADV-5: 이해 용이성 (13개)
  "ADV-5-F1": { label: "발화 속도", subgroup: "유창성" },
  "ADV-5-F2": { label: "유창성 (끊김)", subgroup: "유창성" },
  "ADV-5-F3": { label: "연결성", subgroup: "유창성" },
  "ADV-5-G1": { label: "형태론 (단어 형성)", subgroup: "문법" },
  "ADV-5-G2": { label: "통사론 (문장 구조)", subgroup: "문법" },
  "ADV-5-G3": { label: "격 (명사 변화)", subgroup: "문법" },
  "ADV-5-G4": { label: "전치사", subgroup: "문법" },
  "ADV-5-G5": { label: "일치 (주어-동사)", subgroup: "문법" },
  "ADV-5-PC1": { label: "약점 보완 전략", subgroup: "화용" },
  "ADV-5-P1": { label: "조음 명확성", subgroup: "발음" },
  "ADV-5-P2": { label: "음높이", subgroup: "발음" },
  "ADV-5-P3": { label: "강세", subgroup: "발음" },
  "ADV-5-P4": { label: "억양", subgroup: "발음" },
  // AL-14: 비교·변화 (6개) — IH/AL 전용
  "AL-14-PS": { label: "문단 구조 (도입-본론-결론)" },
  "AL-14-LS": { label: "논리적 순서 (과거→현재→결론)" },
  "AL-14-CS": { label: "비교·대조 표현 사용" },
  "AL-14-CD": { label: "연결어 다양성 (3종 이상)" },
  "AL-14-VB": { label: "고급 어휘 사용" },
  "AL-14-GA": { label: "복문 문법 정확성" },
  // AL-15: 사회적 이슈 (6개) — IH/AL 전용
  "AL-15-AS": { label: "논증 구조 (배경→관점→근거→결론)" },
  "AL-15-MA": { label: "다관점 분석 (2개 이상 관점)" },
  "AL-15-SI": { label: "사회적·제도적 차원 논의" },
  "AL-15-CD": { label: "연결어 다양성 (3종 이상)" },
  "AL-15-VB": { label: "이슈 토론 적합 고급 어휘" },
  "AL-15-GA": { label: "종속절 포함 복문 정확성" },
};

// ── 진단표 기능(Function) 정의 ──

export type PerformanceLevel =
  | "meets_fully"     // 완전 충족
  | "meets_minimally" // 최소 충족
  | "developing"      // 발전 중
  | "emerging"        // 출현 수준
  | "random";         // 간헐적 수행

export const PERFORMANCE_LABELS_KO: Record<PerformanceLevel, string> = {
  meets_fully: "완전 충족",
  meets_minimally: "최소 충족",
  developing: "발전 중",
  emerging: "출현 수준",
  random: "간헐적 수행",
};

export interface DiagnosticFunction {
  id: string;
  title_ko: string;
  title_en: string;
  performance: PerformanceLevel;
  checkboxIds: string[];
}

export interface DiagnosticSection {
  section: "INT" | "ADV" | "AL";
  title: string;
  subtitle: string;
  functions: DiagnosticFunction[];
}

// ── IM3 기준 세부진단표 목 데이터 ──

export const MOCK_DIAGNOSIS_DATA: {
  sections: DiagnosticSection[];
  checkboxResults: Record<string, boolean>;
} = {
  sections: [
    {
      section: "INT",
      title: "Intermediate 진단표",
      subtitle: "Intermediate 수준의 기준 충족 여부",
      functions: [
        {
          id: "INT-1",
          title_ko: "언어 생성",
          title_en: "Can create with the language to provide personal information",
          performance: "meets_fully",
          checkboxIds: ["INT-1-1", "INT-1-2", "INT-1-3"],
        },
        {
          id: "INT-2",
          title_ko: "문장 발화",
          title_en: "Can speak in sentences on familiar topics and routines",
          performance: "meets_fully",
          checkboxIds: ["INT-2-1", "INT-2-2", "INT-2-3"],
        },
        {
          id: "INT-3",
          title_ko: "질문 구성",
          title_en: "Can handle a simple transaction by asking and answering questions",
          performance: "meets_fully",
          checkboxIds: ["INT-3-1", "INT-3-2"],
        },
        {
          id: "INT-4",
          title_ko: "이해 가능성",
          title_en: "Is generally understood by those accustomed to language learners",
          performance: "meets_fully",
          checkboxIds: [
            "INT-4-F1", "INT-4-F2", "INT-4-F3", "INT-4-F4", "INT-4-F5",
            "INT-4-P1", "INT-4-P2", "INT-4-P3", "INT-4-P4",
            "INT-4-G1", "INT-4-G2", "INT-4-S1",
          ],
        },
      ],
    },
    {
      section: "ADV",
      title: "Advanced 진단표",
      subtitle: "Advanced 수준의 기준 충족 여부",
      functions: [
        {
          id: "ADV-1",
          title_ko: "시제 활용",
          title_en: "Can narrate and describe in all time frames",
          performance: "emerging",
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
          performance: "emerging",
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
          performance: "random",
          checkboxIds: ["ADV-3-V1", "ADV-3-V2", "ADV-3-V3"],
        },
        {
          id: "ADV-4",
          title_ko: "돌발 대처",
          title_en: "Can deal effectively with an unanticipated complication",
          performance: "emerging",
          checkboxIds: ["ADV-4-CR1", "ADV-4-CR2", "ADV-4-CR3", "ADV-4-CD1"],
        },
        {
          id: "ADV-5",
          title_ko: "이해 용이성",
          title_en: "Can be readily understood by speakers not accustomed to non-native speakers",
          performance: "emerging",
          checkboxIds: [
            "ADV-5-F1", "ADV-5-F2", "ADV-5-F3",
            "ADV-5-G1", "ADV-5-G2", "ADV-5-G3", "ADV-5-G4", "ADV-5-G5",
            "ADV-5-PC1",
            "ADV-5-P1", "ADV-5-P2", "ADV-5-P3", "ADV-5-P4",
          ],
        },
      ],
    },
    {
      section: "AL",
      title: "Advanced Low 진단표",
      subtitle: "IH/AL 등급 판정을 위한 추가 기준",
      functions: [
        {
          id: "AL-14",
          title_ko: "비교·변화",
          title_en: "Can compare, contrast, and describe changes over time",
          performance: "emerging",
          checkboxIds: [
            "AL-14-PS", "AL-14-LS", "AL-14-CS",
            "AL-14-CD", "AL-14-VB", "AL-14-GA",
          ],
        },
        {
          id: "AL-15",
          title_ko: "사회적 이슈",
          title_en: "Can discuss social issues with supporting arguments",
          performance: "random",
          checkboxIds: [
            "AL-15-AS", "AL-15-MA", "AL-15-SI",
            "AL-15-CD", "AL-15-VB", "AL-15-GA",
          ],
        },
      ],
    },
  ],
  // IM3 응시자 체크박스 결과 (pass=true → ✅, pass=false → ☐)
  checkboxResults: {
    // INT-1: 전부 통과 (IM3이면 당연)
    "INT-1-1": true, "INT-1-2": true, "INT-1-3": true,
    // INT-2: 전부 통과
    "INT-2-1": true, "INT-2-2": true, "INT-2-3": true,
    // INT-3: 전부 통과
    "INT-3-1": true, "INT-3-2": true,
    // INT-4: 대부분 통과, 일부 미흡
    "INT-4-F1": true, "INT-4-F2": true, "INT-4-F3": true,
    "INT-4-F4": true, "INT-4-F5": true,
    "INT-4-P1": true, "INT-4-P2": true, "INT-4-P3": true, "INT-4-P4": true,
    "INT-4-G1": true, "INT-4-G2": true, "INT-4-S1": true,
    // ADV-1: 현재·과거 가능, 미래 약함, 서술 문제 일부
    "ADV-1-D1": true, "ADV-1-D2": true, "ADV-1-D3": false,
    "ADV-1-N1": true, "ADV-1-N2": true, "ADV-1-N3": false,
    "ADV-1-PR1": true, "ADV-1-PR2": false, "ADV-1-PR3": true,
    "ADV-1-L1": false, "ADV-1-L2": false,
    // ADV-2: 문장 나열까지 가능, 단락은 불안정
    "ADV-2-SP1": true, "ADV-2-SP2": true, "ADV-2-SP3": true,
    "ADV-2-SP4": true, "ADV-2-SP5": false,
    "ADV-2-WO1": true, "ADV-2-WO2": true, "ADV-2-WO3": false,
    "ADV-2-CD1": true, "ADV-2-CD2": false, "ADV-2-CD3": false,
    // ADV-3: 어휘 부족
    "ADV-3-V1": false, "ADV-3-V2": true, "ADV-3-V3": true,
    // ADV-4: 시도하지만 완결은 안 됨
    "ADV-4-CR1": false, "ADV-4-CR2": true, "ADV-4-CR3": true,
    "ADV-4-CD1": false,
    // ADV-5: 유창성 일부 문제, 문법 일부 문제
    "ADV-5-F1": true, "ADV-5-F2": false, "ADV-5-F3": false,
    "ADV-5-G1": true, "ADV-5-G2": true, "ADV-5-G3": true,
    "ADV-5-G4": true, "ADV-5-G5": false,
    "ADV-5-PC1": false,
    "ADV-5-P1": true, "ADV-5-P2": true, "ADV-5-P3": false, "ADV-5-P4": true,
    // AL-14: 비교·변화 — IM3이면 대부분 미충족
    "AL-14-PS": false, "AL-14-LS": true, "AL-14-CS": false,
    "AL-14-CD": false, "AL-14-VB": false, "AL-14-GA": false,
    // AL-15: 사회적 이슈 — IM3이면 거의 미충족
    "AL-15-AS": false, "AL-15-MA": false, "AL-15-SI": false,
    "AL-15-CD": false, "AL-15-VB": false, "AL-15-GA": false,
  },
};

// ── 문항별 평가 타입 & 목 데이터 ──

export type FulfillmentStatus = "fulfilled" | "partial" | "unfulfilled" | "skipped";

export const FULFILLMENT_LABELS_KO: Record<FulfillmentStatus, string> = {
  fulfilled: "충족",
  partial: "부분 충족",
  unfulfilled: "미충족",
  skipped: "무응답",
};

// 질문 유형 한글 매핑
export const QUESTION_TYPE_KO: Record<string, string> = {
  description: "묘사",
  routine: "루틴",
  comparison: "비교·변화",
  past_childhood: "경험 (어린 시절)",
  past_special: "경험 (특별한)",
  past_recent: "경험 (최근)",
  rp_11: "롤플레이 (질문하기)",
  rp_12: "롤플레이 (대안 제시)",
  asking_questions: "질문하기",
  social_issue: "사회적 이슈",
};

export interface QuestionEvalV2 {
  question_number: number;
  question_title: string;
  question_type: string;
  target_grade: string;
  fulfillment: FulfillmentStatus;
  task_checklist: Array<{ item: string; pass: boolean }>;
  observation: string;
  directions: string[];
  weak_points: string[];
  recommended_drills: string[];
  speech_meta: {
    duration_sec: number;
    wpm: number;
    pronunciation_score: number;
  };
  transcript: string;
}

export const MOCK_QUESTIONS_DATA: {
  target_grade: string;
  evaluations: QuestionEvalV2[];
} = {
  target_grade: "IH",
  evaluations: [
    {
      question_number: 2,
      question_title: "자주 가는 공원이나 해변 묘사",
      question_type: "description",
      target_grade: "IH",
      fulfillment: "fulfilled",
      task_checklist: [
        { item: "구체적 장소 언급", pass: true },
        { item: "시각적·공간적 세부 묘사", pass: true },
        { item: "개인적 감상 포함", pass: true },
        { item: "문장 연결로 발화 유지", pass: true },
      ],
      observation: "응시자는 자주 방문하는 공원을 구체적으로 묘사하였다. 공원의 위치, 주요 시설, 분위기를 시각적 세부 사항과 함께 전달하였으며, 개인적 감상을 자연스럽게 덧붙였다. 현재 시제를 안정적으로 유지하였고, 문장 간 연결이 원활하였다. IH 수준에서 기대되는 묘사 과제를 전반적으로 충족하였다.",
      directions: [
        "묘사의 깊이를 더하기 위해, 감각적 표현(소리, 냄새, 촉감)을 추가하면 단락의 풍성도가 향상될 것이다.",
      ],
      weak_points: [],
      recommended_drills: [],
      speech_meta: { duration_sec: 95, wpm: 112, pronunciation_score: 84 },
      transcript: "Well, I usually go to the Han River Park near my house. It's a really big park with a long walking trail along the river. There are many trees and benches where I can sit and relax. I really like going there in the evening because the sunset is beautiful. Sometimes I bring my dog and we walk together. It's my favorite place to unwind after a long day at work.",
    },
    {
      question_number: 3,
      question_title: "공원이나 해변에서 주로 하는 활동",
      question_type: "routine",
      target_grade: "IH",
      fulfillment: "fulfilled",
      task_checklist: [
        { item: "일상적 활동 나열", pass: true },
        { item: "빈도/시간 표현 사용", pass: true },
        { item: "활동의 이유/감상 포함", pass: true },
        { item: "현재 시제 일관 유지", pass: true },
      ],
      observation: "응시자는 공원에서의 일상적 활동을 구체적으로 나열하며, 빈도 표현(usually, sometimes, every weekend)을 적절히 활용하였다. 각 활동에 대한 이유와 감상을 덧붙여 발화의 깊이를 확보하였다. 현재 시제가 일관되게 유지되었으며, IH 수준의 루틴 과제를 안정적으로 수행하였다.",
      directions: [
        "활동 간 전환 시 연결어(Also, In addition, After that)를 더 다양하게 사용하면 담화의 응집력이 향상될 것이다.",
      ],
      weak_points: [],
      recommended_drills: [],
      speech_meta: { duration_sec: 88, wpm: 105, pronunciation_score: 82 },
      transcript: "When I go to the park, I usually take a walk along the trail. Sometimes I jog for about 30 minutes. Every weekend, I like to sit on the bench and read a book. I also enjoy watching people and their dogs playing around. After walking, I usually grab a coffee from a nearby cafe. It's my routine to go there at least twice a week.",
    },
    {
      question_number: 4,
      question_title: "기억에 남는 공원/해변 경험",
      question_type: "past_special",
      target_grade: "IH",
      fulfillment: "partial",
      task_checklist: [
        { item: "과거 시제 일관 사용", pass: false },
        { item: "사건의 시간 순서 전개", pass: false },
        { item: "구체적 세부 사항 포함", pass: true },
        { item: "감상/교훈으로 마무리", pass: false },
        { item: "단락 수준 담화 유지", pass: true },
      ],
      observation: "응시자는 공원에서의 특별한 경험을 서술하려는 시도를 보였다. 구체적인 장소와 활동을 언급하였으나, 사건의 전개가 시간 순서를 따르지 않아 청자가 흐름을 파악하기 어려웠다. 발화 중반에 현재 시제로 전환되어 시제 통제의 불안정성이 관찰되었다. 경험의 마무리에 감상이나 교훈이 부재하여 서술이 미완결 상태로 끝났다. Intermediate 수준의 문장 생성은 안정적이었으나, IH 수준에서 기대되는 시간 순서에 따른 서술과 단락 완결성에는 도달하지 못하였다.",
      directions: [
        "과거 경험 서술 시 '처음에 → 그 다음 → 마지막에' 구조로 시간 순서를 명확히 전개할 필요가 있다.",
        "경험 서술의 마무리에 감상이나 교훈을 덧붙여 단락을 완결하는 연습이 필요하다.",
      ],
      weak_points: ["시제 통제 불안정", "서술 구조 미완결"],
      recommended_drills: ["tense_control", "narrative_structure"],
      speech_meta: { duration_sec: 72, wpm: 95, pronunciation_score: 79 },
      transcript: "Last year I go to the beach with my friends. We arrived there around 10 in the morning. The weather is really nice and sunny. We played volleyball on the sand and then we swim in the ocean. It was so fun. I remember the water was very cold but we didn't care. We eat some food at a restaurant near the beach.",
    },
    {
      question_number: 5,
      question_title: "좋아하는 음악 장르와 이유",
      question_type: "description",
      target_grade: "IH",
      fulfillment: "fulfilled",
      task_checklist: [
        { item: "선호 장르 명확히 언급", pass: true },
        { item: "선호 이유 구체적 설명", pass: true },
        { item: "예시나 경험 포함", pass: true },
        { item: "문장 연결로 발화 유지", pass: true },
      ],
      observation: "응시자는 선호하는 음악 장르를 명확히 밝히고, 그 이유를 구체적인 경험과 함께 설명하였다. 특정 아티스트와 곡을 언급하며 발화에 깊이를 더하였다. 현재 시제를 일관되게 유지하였으며, 문장 간 연결이 자연스러웠다. IH 수준의 묘사 과제를 충분히 충족하였다.",
      directions: [
        "음악이 자신에게 미치는 영향이나 생활 속 역할까지 확장하면 Advanced 수준의 담화에 근접할 수 있다.",
      ],
      weak_points: [],
      recommended_drills: [],
      speech_meta: { duration_sec: 82, wpm: 108, pronunciation_score: 85 },
      transcript: "I really love listening to K-pop. My favorite group is BTS because their music is very energetic and the lyrics are meaningful. I usually listen to their songs when I exercise or commute to work. I also went to their concert last year and it was an amazing experience. I think music is a great way to relieve stress.",
    },
    {
      question_number: 6,
      question_title: "음악 듣는 습관과 방식",
      question_type: "routine",
      target_grade: "IH",
      fulfillment: "fulfilled",
      task_checklist: [
        { item: "일상적 습관 나열", pass: true },
        { item: "빈도/시간/장소 표현", pass: true },
        { item: "도구/방법 구체적 언급", pass: true },
        { item: "현재 시제 일관 유지", pass: true },
      ],
      observation: "응시자는 음악 청취 습관을 체계적으로 설명하였다. 듣는 시간대, 장소, 사용 기기를 구체적으로 언급하였고, 빈도 표현을 적절히 활용하였다. 발화 전반에 걸쳐 현재 시제가 안정적으로 유지되었다.",
      directions: [
        "습관의 변화(예전과 지금)를 대비하면 시제 전환 연습과 담화 확장을 동시에 훈련할 수 있다.",
      ],
      weak_points: [],
      recommended_drills: [],
      speech_meta: { duration_sec: 78, wpm: 102, pronunciation_score: 83 },
      transcript: "I listen to music every day. In the morning, I use my wireless earbuds and listen to upbeat songs while commuting. At work, I sometimes play soft background music. In the evening, I use my speaker at home and listen to relaxing music before going to bed. I mainly use Spotify to discover new songs.",
    },
    {
      question_number: 7,
      question_title: "기억에 남는 음악 관련 경험",
      question_type: "past_recent",
      target_grade: "IH",
      fulfillment: "partial",
      task_checklist: [
        { item: "과거 시제 일관 사용", pass: true },
        { item: "사건의 시간 순서 전개", pass: true },
        { item: "감정/반응 구체적 표현", pass: false },
        { item: "감상/교훈으로 마무리", pass: false },
        { item: "단락 수준 담화 유지", pass: false },
      ],
      observation: "응시자는 최근 콘서트 경험을 과거 시제로 서술하였으며, 시간 순서를 따른 전개는 적절하였다. 그러나 경험에 대한 감정적 반응이 'It was fun' 수준에 그쳐 깊이가 부족하였다. 서술이 사건 나열에 머물러 단락 수준의 담화 구성에 도달하지 못하였다. IH 수준에서는 경험에 대한 개인적 해석과 구체적 감정 표현이 기대된다.",
      directions: [
        "경험 서술 시 단순 사건 나열을 넘어, 그때의 감정과 그 경험이 자신에게 어떤 의미였는지를 구체적으로 표현할 필요가 있다.",
        "서술의 끝에 '그래서 나에게 ~한 경험이었다'와 같은 마무리를 추가하여 단락을 완결할 필요가 있다.",
      ],
      weak_points: ["감정 표현 깊이 부족", "단락 완결성 부재"],
      recommended_drills: ["emotional_expression", "paragraph_closure"],
      speech_meta: { duration_sec: 65, wpm: 91, pronunciation_score: 80 },
      transcript: "Last month I went to a concert with my friends. We arrived early and waited in line for about an hour. The concert started at 7 PM. The singer performed many popular songs. The sound was very loud. We danced and sang along. After the concert we went to eat dinner. It was fun.",
    },
    {
      question_number: 8,
      question_title: "사는 곳의 이웃과 환경 묘사",
      question_type: "description",
      target_grade: "IH",
      fulfillment: "fulfilled",
      task_checklist: [
        { item: "거주지 환경 구체적 묘사", pass: true },
        { item: "이웃/커뮤니티 언급", pass: true },
        { item: "개인적 감상 포함", pass: true },
        { item: "문장 연결로 발화 유지", pass: true },
      ],
      observation: "응시자는 거주지 환경과 이웃을 구체적으로 묘사하였다. 아파트 단지의 특징, 주변 편의시설, 이웃과의 관계를 체계적으로 설명하였으며, 개인적 만족감을 자연스럽게 표현하였다. IH 수준의 묘사 과제를 안정적으로 충족하였다.",
      directions: [
        "이전 거주지와의 비교를 추가하면 비교·대조 능력을 보여줄 수 있어 Advanced 수준 접근에 유리하다.",
      ],
      weak_points: [],
      recommended_drills: [],
      speech_meta: { duration_sec: 90, wpm: 110, pronunciation_score: 86 },
      transcript: "I live in a large apartment complex in Gangnam. My neighborhood is very convenient because there are many stores, restaurants, and a subway station nearby. My neighbors are mostly families with children. They are very friendly and we sometimes greet each other in the elevator. I really enjoy living here because it's safe and quiet at night.",
    },
    {
      question_number: 9,
      question_title: "이웃과의 일상적 교류",
      question_type: "routine",
      target_grade: "IH",
      fulfillment: "fulfilled",
      task_checklist: [
        { item: "이웃과의 교류 활동 나열", pass: true },
        { item: "빈도 표현 사용", pass: true },
        { item: "구체적 에피소드 포함", pass: true },
        { item: "현재 시제 일관 유지", pass: true },
      ],
      observation: "응시자는 이웃과의 교류를 빈도 표현과 함께 구체적으로 설명하였다. 일상적 인사, 공동 시설 사용, 소소한 대화 등 다양한 활동을 언급하였으며, 구체적 에피소드를 포함하여 발화에 생동감을 더하였다.",
      directions: [
        "교류 방식의 변화(이전 vs 현재)를 언급하면 시제 전환과 비교 능력을 동시에 보여줄 수 있다.",
      ],
      weak_points: [],
      recommended_drills: [],
      speech_meta: { duration_sec: 85, wpm: 107, pronunciation_score: 81 },
      transcript: "I interact with my neighbors quite often. Every morning, I say hello to the security guard and some neighbors in the lobby. Sometimes my next-door neighbor and I share food. Last week she gave me some homemade kimchi. We also have a community chat group where we share information about the building. I think it's nice to have good relationships with neighbors.",
    },
    {
      question_number: 10,
      question_title: "거주지 변화 비교 (과거와 현재)",
      question_type: "comparison",
      target_grade: "IH",
      fulfillment: "unfulfilled",
      task_checklist: [
        { item: "과거 거주지 묘사", pass: true },
        { item: "현재 거주지 묘사", pass: true },
        { item: "명시적 비교·대조 표현", pass: false },
        { item: "비교 관점 2개 이상", pass: false },
        { item: "단락 수준 담화 유지", pass: false },
      ],
      observation: "응시자는 과거 거주지와 현재 거주지를 각각 묘사하였으나, 두 거주지 간의 명시적 비교·대조가 이루어지지 않았다. 'But' 이외의 비교 표현(on the other hand, compared to, while)이 관찰되지 않았으며, 비교 관점이 '크기'에만 한정되어 다각적 비교에 도달하지 못하였다. 발화가 개별 묘사의 나열에 머물러 단락 수준의 통합된 담화 구성이 이루어지지 않았다. IH 수준에서 핵심적으로 기대되는 비교·대조 능력의 부족이 명확히 관찰되었다.",
      directions: [
        "비교 문항에서는 'compared to', 'on the other hand', 'while' 등의 비교 표현을 활용하여 두 대상을 명시적으로 대비할 필요가 있다.",
        "크기, 편의성, 분위기 등 2~3가지 관점에서 비교를 전개하여 담화의 폭을 넓힐 필요가 있다.",
      ],
      weak_points: ["비교·대조 표현 미사용", "비교 관점 단일", "단락 구조 부재"],
      recommended_drills: ["comparison_structure", "connector_diversity", "paragraph_organization"],
      speech_meta: { duration_sec: 58, wpm: 88, pronunciation_score: 77 },
      transcript: "Before I lived in a small town. It was very quiet and peaceful. Now I live in Seoul. Seoul is very big and busy. There are many things to do in Seoul. But my hometown was more relaxing. I think both places have good things.",
    },
    {
      question_number: 11,
      question_title: "좋아하는 영화/TV 프로그램 묘사",
      question_type: "description",
      target_grade: "IH",
      fulfillment: "fulfilled",
      task_checklist: [
        { item: "선호 대상 명확히 언급", pass: true },
        { item: "선호 이유 구체적 설명", pass: true },
        { item: "내용/특징 설명", pass: true },
        { item: "문장 연결로 발화 유지", pass: true },
      ],
      observation: "응시자는 좋아하는 TV 프로그램을 명확히 밝히고, 장르 특성과 선호 이유를 구체적으로 설명하였다. 출연자와 주요 내용을 언급하며 발화에 구체성을 더하였다. IH 수준의 묘사 과제를 안정적으로 충족하였다.",
      directions: [
        "프로그램이 자신의 생활이나 가치관에 미치는 영향까지 확장하면 담화의 깊이가 향상될 것이다.",
      ],
      weak_points: [],
      recommended_drills: [],
      speech_meta: { duration_sec: 80, wpm: 106, pronunciation_score: 83 },
      transcript: "My favorite TV show is a Korean drama called Crash Landing on You. It's a romantic comedy about a South Korean woman who accidentally lands in North Korea. I love it because the story is very unique and the actors are amazing. The show also shows interesting cultural differences between the two Koreas. I've watched it three times already.",
    },
    {
      question_number: 12,
      question_title: "정보 요청 롤플레이 (영화관 문의)",
      question_type: "rp_11",
      target_grade: "IH",
      fulfillment: "fulfilled",
      task_checklist: [
        { item: "적절한 인사/도입", pass: true },
        { item: "질문 3개 이상 구성", pass: true },
        { item: "질문 정확한 문법", pass: true },
        { item: "자연스러운 마무리", pass: true },
      ],
      observation: "응시자는 영화관에 전화하여 정보를 요청하는 롤플레이를 자연스럽게 수행하였다. 적절한 인사로 시작하여, 상영 시간, 가격, 좌석 예약에 관한 질문을 정확한 문법으로 구성하였다. 마무리 인사도 적절하였으며, IH 수준의 롤플레이 과제를 충분히 충족하였다.",
      directions: [
        "질문의 다양성을 높여 할인, 주차, 특별 이벤트 등 부가 정보까지 문의하면 Advanced 수준의 사회적 거래 능력을 보여줄 수 있다.",
      ],
      weak_points: [],
      recommended_drills: [],
      speech_meta: { duration_sec: 70, wpm: 100, pronunciation_score: 82 },
      transcript: "Hello, I'm calling to ask about your movie schedule. Could you tell me what movies are showing this weekend? Also, how much are the tickets for an adult? I'd like to know if I can reserve seats in advance. Do you accept credit cards? Thank you very much for the information.",
    },
    {
      question_number: 13,
      question_title: "예상치 못한 상황 롤플레이 (영화관 문제)",
      question_type: "rp_12",
      target_grade: "IH",
      fulfillment: "partial",
      task_checklist: [
        { item: "상황 인식 표현", pass: true },
        { item: "문제 해결 시도", pass: true },
        { item: "대안 2개 이상 제시", pass: false },
        { item: "적절한 협상/설득", pass: false },
      ],
      observation: "응시자는 영화 상영 중 문제가 발생한 상황을 인식하고, 해결을 시도하였다. 문제를 설명하고 환불을 요청하는 수준까지는 수행하였으나, 다른 상영 시간으로의 변경, 다른 영화 선택 등 대안적 해결책을 제시하지 못하였다. 상대방을 설득하거나 협상하는 표현도 관찰되지 않았다. IH 수준에서는 돌발 상황에서 복수의 대안을 제시하고 협상하는 능력이 기대된다.",
      directions: [
        "돌발 상황에서 'Would it be possible to...', 'How about...' 등을 활용하여 2~3개 대안을 제시하는 연습이 필요하다.",
        "상대방의 반응에 따라 유연하게 대응하는 협상 표현을 익힐 필요가 있다.",
      ],
      weak_points: ["대안 제시 부족", "협상 표현 미사용"],
      recommended_drills: ["complication_handling", "negotiation_expressions"],
      speech_meta: { duration_sec: 55, wpm: 85, pronunciation_score: 78 },
      transcript: "Excuse me, I have a problem. The sound in the theater is not working properly. I can't hear the movie clearly. Can I get a refund for my ticket? I paid 15,000 won. This is really disappointing because I was looking forward to this movie.",
    },
    {
      question_number: 14,
      question_title: "최근 본 영화/프로그램 경험",
      question_type: "past_recent",
      target_grade: "IH",
      fulfillment: "partial",
      task_checklist: [
        { item: "과거 시제 일관 사용", pass: true },
        { item: "사건의 시간 순서 전개", pass: true },
        { item: "감정/반응 구체적 표현", pass: true },
        { item: "감상/교훈으로 마무리", pass: false },
        { item: "단락 수준 담화 유지", pass: false },
      ],
      observation: "응시자는 최근 본 영화에 대해 과거 시제를 일관되게 사용하며 서술하였다. 영화의 내용과 자신의 감정 반응을 구체적으로 표현하였으나, 서술이 줄거리 요약에 치우쳐 개인적 해석이나 교훈으로 마무리되지 못하였다. 문장 나열 수준에 머물러 IH 수준에서 기대되는 단락 구성에는 미흡하였다.",
      directions: [
        "경험 서술의 마무리에 '이 영화를 통해 ~를 느꼈다' 식의 개인적 해석을 추가하여 단락을 완결할 필요가 있다.",
      ],
      weak_points: ["단락 완결성 부재"],
      recommended_drills: ["paragraph_closure"],
      speech_meta: { duration_sec: 75, wpm: 98, pronunciation_score: 81 },
      transcript: "Last weekend I watched a movie called Parasite. It was a Korean film directed by Bong Joon-ho. The movie was about two families from different social classes. I was really surprised by the plot twists. The acting was incredible, especially by Song Kang-ho. I felt very tense during the second half of the movie. I watched it with my girlfriend and she also loved it.",
    },
    {
      question_number: 15,
      question_title: "기술 변화가 생활에 미친 영향",
      question_type: "comparison",
      target_grade: "IH",
      fulfillment: "skipped",
      task_checklist: [
        { item: "과거 상황 묘사", pass: false },
        { item: "현재 상황 묘사", pass: false },
        { item: "명시적 비교·대조 표현", pass: false },
        { item: "비교 관점 2개 이상", pass: false },
        { item: "단락 수준 담화 유지", pass: false },
      ],
      observation: "",
      directions: [],
      weak_points: ["무응답"],
      recommended_drills: ["comparison_structure"],
      speech_meta: { duration_sec: 8, wpm: 0, pronunciation_score: 0 },
      transcript: "",
    },
  ],
};

// ── 성장 리포트 목 데이터 (v2 관찰 톤) ──

// ── 문항 유형별 변화 상태 ──
export type TypeChangeStatus = "reached" | "improved" | "maintained" | "declined" | "not_attempted";

export interface GradeHistoryItem {
  session_count: number;
  grade: string;
  date: string;
}

export interface GrowthReportV2 {
  /** 이전 세션 정보 */
  previous_session: {
    session_id: string;
    grade: string;
    date: string;
    session_count: number; // N회차
  };
  /** 현재 세션 정보 */
  current_session: {
    session_id: string;
    grade: string;
    date: string;
    session_count: number;
  };
  target_grade: string;

  /** 등급 추이 (전체 이력) */
  grade_history: GradeHistoryItem[];

  /** 섹션 1: 등급 변화 */
  grade_change: {
    previous: string;
    current: string;
    diff: number; // 양수=상승, 0=유지, 음수=하락
  };

  /** 섹션 2: 좋아진 점 (관찰 톤) */
  improvements: string[];

  /** 섹션 3: 아직 부족한 점 (관찰 톤) */
  weaknesses: string[];

  /** 섹션 4: 문항 유형별 변화 (목표 등급 기준) */
  type_comparison: Array<{
    type: string;
    type_label: string;
    status: TypeChangeStatus;
    /** 목표 등급 기준 도달 (e.g. 3/5) */
    criteria_met: number;
    criteria_total: number;
    /** 이전 → 현재 변화 관찰 */
    change_observation: string;
    /** 남은 과제 (status가 reached면 도달 메시지) */
    remaining: string;
  }>;

  /** 섹션 5: 집중 훈련 포인트 */
  focus_point: {
    area_label: string;
    observation: string;
  };
}

export const MOCK_GROWTH_DATA: GrowthReportV2 = {
  previous_session: {
    session_id: "mt_prev_mock",
    grade: "IM2",
    date: "2026-02-25",
    session_count: 1,
  },
  current_session: {
    session_id: "mt_8099015f",
    grade: "IM3",
    date: "2026-03-10",
    session_count: 2,
  },
  target_grade: "IH",

  // 등급 추이 (다회차 이력)
  grade_history: [
    { session_count: 1, grade: "IM1", date: "2026-01-15" },
    { session_count: 2, grade: "IM2", date: "2026-02-05" },
    { session_count: 3, grade: "IM2", date: "2026-02-25" },
    { session_count: 4, grade: "IM3", date: "2026-03-10" },
  ],

  // 섹션 1: 등급 변화
  grade_change: { previous: "IM2", current: "IM3", diff: 1 },

  // 섹션 2: 좋아진 점
  improvements: [
    "묘사 질문에서 핵심 특징을 2개 이상 제시하기 시작하였다.",
    "루틴 유형에서 빈도 표현과 순서 연결이 안정화되었다.",
    "롤플레이(질문하기)에서 WH-질문의 다양성이 증가하였다.",
    "익숙한 주제에서의 발화량이 전반적으로 늘었다.",
  ],

  // 섹션 3: 아직 부족한 점
  weaknesses: [
    "과거 경험 서술 시 시제 혼용이 여전히 관찰되었다.",
    "연결어가 'and', 'but', 'so'에 한정되어 다양성이 부족하였다.",
    "비교·변화 유형에서 과제 수행이 이루어지지 않았다.",
    "문단 수준의 담화 구성으로의 발전은 아직 관찰되지 않았다.",
  ],

  // 섹션 4: 문항 유형별 변화 (목표 등급 IH 기준)
  // 순서: 묘사 → 루틴 → 비교 → 경험·처음 → 경험·최근 → 경험·특별 → 질문하기 → 대안제시 → 비교·변화 → 사회이슈
  // type_label은 QUESTION_TYPE_LABELS (lib/types/reviews.ts) 기준 통일
  type_comparison: [
    {
      type: "description",
      type_label: "묘사",
      status: "improved",
      criteria_met: 3,
      criteria_total: 5,
      change_observation: "핵심 특징 1개 나열 → 2개 이상 + 개인화 표현 추가",
      remaining: "감각 묘사, 비유 표현이 아직 관찰되지 않았다.",
    },
    {
      type: "routine",
      type_label: "루틴",
      status: "reached",
      criteria_met: 5,
      criteria_total: 5,
      change_observation: "빈도 표현 부재 → 안정적 활용 + 순서 연결 완성",
      remaining: "이 유형은 목표 등급 수준에 도달한 것으로 관찰되었다.",
    },
    {
      type: "comparison",
      type_label: "비교",
      status: "not_attempted",
      criteria_met: 0,
      criteria_total: 5,
      change_observation: "이전/현재 모두 과제 수행이 이루어지지 않았다.",
      remaining: "시간축 비교 + 원인/결과 연결 훈련이 필요하다.",
    },
    {
      type: "past_childhood",
      type_label: "경험·처음",
      status: "improved",
      criteria_met: 2,
      criteria_total: 5,
      change_observation: "과거 시제 일부 사용 시작 → 현재와의 대비 시도",
      remaining: "과거 시제 일관성과 세부 묘사가 부족하였다.",
    },
    {
      type: "past_recent",
      type_label: "경험·최근",
      status: "maintained",
      criteria_met: 2,
      criteria_total: 5,
      change_observation: "이전과 유사한 수준의 수행이 관찰되었다.",
      remaining: "시제 전환과 세부 묘사의 확장이 필요하다.",
    },
    {
      type: "past_special",
      type_label: "경험·특별",
      status: "improved",
      criteria_met: 2,
      criteria_total: 5,
      change_observation: "단순 나열 → 시간순 배열 시도 + 감정 표현 추가",
      remaining: "시제 통제와 원인·결과 연결이 불안정하였다.",
    },
    {
      type: "rp_11",
      type_label: "질문하기",
      status: "reached",
      criteria_met: 4,
      criteria_total: 4,
      change_observation: "단일 질문 반복 → WH-질문 3종 이상 + 정보 요청 구분",
      remaining: "이 유형은 목표 등급 수준에 도달한 것으로 관찰되었다.",
    },
    {
      type: "rp_12",
      type_label: "대안제시",
      status: "not_attempted",
      criteria_met: 0,
      criteria_total: 4,
      change_observation: "이전/현재 모두 대안 제시가 이루어지지 않았다.",
      remaining: "문제 상황 인식 + 대안 제시 구조 훈련이 필요하다.",
    },
    {
      type: "adv_14",
      type_label: "비교·변화",
      status: "not_attempted",
      criteria_met: 0,
      criteria_total: 5,
      change_observation: "이전/현재 모두 어드밴스 수준의 비교가 이루어지지 않았다.",
      remaining: "다각적 비교와 추상적 사고 전개가 필요하다.",
    },
    {
      type: "adv_15",
      type_label: "사회이슈",
      status: "not_attempted",
      criteria_met: 0,
      criteria_total: 5,
      change_observation: "이전/현재 모두 사회적 이슈 논의가 이루어지지 않았다.",
      remaining: "찬반 구조와 근거 제시 훈련이 필요하다.",
    },
  ],

  // 섹션 5: 집중 훈련 포인트
  focus_point: {
    area_label: "담화 구조",
    observation: "문장 나열에서 문단 구성으로의 전환이 IH 도달의 핵심 과제로 확인되었다. 연결어의 다양화, 시간순·인과 관계의 논리적 연결, 단락 완결 능력이 현재 가장 시급한 훈련 영역으로 관찰되었다.",
  },
};

// ── IM3 기준 목 데이터 (종합소견 탭) ──

export const MOCK_OVERVIEW_DATA = {
  // 세션 기본 정보
  session: {
    session_id: "mt_8099015f",
    grade: "IM3" as const,
    mode: "test" as const, // 실전
    date: "2026-03-10",
    total_questions: 15,
  },

  // 종합 소견 (GPT 생성 — 개인화)
  overall_comments: "본 응시자는 Intermediate Mid 등급의 핵심 기준을 전반적으로 충족하였으며, Intermediate 수준의 과제에서 양과 질 모두 우수한 수행을 보였습니다. 익숙한 주제에서는 연결 문장을 사용하여 충분한 양의 정보를 전달하였고, 자기소개, 일상 루틴, 관심사에 관한 질문에 안정적으로 응답하였습니다. 롤플레이 과제에서도 필요한 질문과 정보를 제시하며 성공적으로 처리하였습니다. 그러나 Advanced 수준의 과제에서는 수행이 무너졌습니다. 과거 경험을 서술하거나 비교·대조를 시도할 때 단락 수준의 발화를 유지하지 못했고, 시제 통제와 세부 묘사에서 제한이 관찰되었습니다. 특히 거주지 변화에 대한 비교 문항에서 발화의 폭이 좁아지고 구조적 통제가 약해졌습니다. Intermediate 과제에서의 일관된 상위 수행을 근거로 sub-score 3이 부여되었습니다.",

  // 수행 요약 (GPT 생성 — 개인화, 등급 기준 관찰)
  performance_summary: [
    "Intermediate 수준의 일상 과제와 사회적 상황에서 안정적이고 자신 있는 수행을 보였습니다.",
    "연결 문장을 일관되게 생산하였으며, 롤플레이에서 필요한 질문과 정보를 적절히 제시하였습니다.",
    "과거·현재 시제를 활용한 서술이 가능했으나, 비교·대조 및 사회적 확장에서는 발화가 짧아지고 단락 수준의 통제가 유지되지 않았습니다.",
    "Advanced 기능을 시도하는 문항에서 아이디어는 분명했으나, 확장성과 담화 구조의 정밀도는 부분적이었습니다.",
  ],
};
