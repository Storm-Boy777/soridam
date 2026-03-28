/* ── 랜딩 페이지 정적 데이터 ── */

/* Pain Point 카드 */
export const painCards = [
  { quote: "\u201c서베이가 중요하다더라\u201d", nudge: "얼마나?" },
  { quote: "\u201c5-5가 좋다더라\u201d", nudge: "왜?" },
  { quote: "\u201c스크립트 외우면 안 된대\u201d", nudge: "대안이 뭔데?" },
];

/* Before/After 대비 */
export const contrastItems = [
  { before: "서베이 대충 선택", after: "서베이 고정으로 출제 범위 한정" },
  { before: "모든 주제 무작정 준비", after: "기출 데이터로 범위 압축" },
  { before: "남의 모범답안 암기", after: "내 경험 기반 맞춤 스크립트" },
  { before: "감으로 연습, 점수만 확인", after: "유형별 정밀 분석 + 약점 자동 처방" },
  { before: "\"다음엔 되겠지\" 희망", after: "성장 리포트로 객관적 추적" },
];

/* 파이프라인 6단계 */
export const pipelineSteps = [
  {
    id: "survey",
    num: "01",
    label: "서베이 고정",
    icon: "ClipboardList" as const,
    desc: "출제 범위를 고정한다",
  },
  {
    id: "frequency",
    num: "02",
    label: "빈도분석",
    icon: "BarChart3" as const,
    desc: "어떤 질문이 자주 나올까?",
  },
  {
    id: "script",
    num: "03",
    label: "스크립트",
    icon: "PenLine" as const,
    desc: "내 경험이 답변이 된다",
  },
  {
    id: "shadowing",
    num: "04",
    label: "쉐도잉",
    icon: "Headphones" as const,
    desc: "원어민 발음으로 체화",
  },
  {
    id: "mockexam",
    num: "05",
    label: "모의고사",
    icon: "ClipboardCheck" as const,
    desc: "실전과 동일한 평가",
  },
  {
    id: "tutoring",
    num: "06",
    label: "튜터링",
    icon: "Target" as const,
    desc: "약점만 집중 훈련",
  },
];

/* Deep Dive 섹션 데이터 */
export const deepDives = [
  {
    id: "survey",
    step: "STEP 01",
    badge: "서베이 고정",
    heading: "서베이를 고정하면\n출제 범위가 고정됩니다",
    points: [
      "OPIc은 서베이 선택에 따라 출제 문제가 결정됩니다",
      "하루오픽이 권장하는 12개 항목 + 난이도 5-5로 고정",
      "공부한 문제만 시험에 나오는 구조를 만듭니다",
    ],
    surveyItems: {
      basic: ["직업: 일 경험 없음", "학생: 아니오", "수강: 5년 이상", "거주: 홀로 거주"],
      background: ["영화", "쇼핑", "TV", "공연", "콘서트", "음악 감상", "조깅", "걷기", "집에서 휴가", "국내 여행", "해외 여행"],
      difficulty: "5-5",
    },
    bg: "white" as const,
  },
  {
    id: "frequency",
    step: "STEP 02",
    badge: "시험후기",
    heading: "여러분의 시험 후기가\n모두의 출제 분석이 됩니다",
    points: [
      "실제 응시자 후기 기반 출제 빈도 분석",
      "주제별 → 질문별 드릴다운으로 범위 압축",
      "무작위 준비 대신, 데이터로 전략 수립",
    ],
    bg: "cream" as const,
  },
  {
    id: "script",
    step: "STEP 03",
    badge: "스크립트",
    heading: "내 경험 하나로\n7가지 학습자료가 만들어집니다",
    points: [
      "스크립트 본문 + 뼈대구조 + 핵심문장",
      "만능패턴 + 핵심표현 + 연결어 하이라이팅",
      "내 경험이니까 외우지 않아도 입에서 나옵니다",
    ],
    example: {
      input: "주말에 한강에서 치맥하는 거 좋아해요",
      outputs: [
        "맞춤 스크립트",
        "뼈대구조",
        "핵심문장",
        "만능패턴",
        "핵심표현",
        "연결어",
        "원어민 음성",
      ],
    },
    bg: "white" as const,
    featured: true,
  },
  {
    id: "shadowing",
    step: "STEP 04",
    badge: "쉐도잉",
    heading: "내 스크립트를 듣고, 따라하고\n내 것으로 체화합니다",
    points: [
      "내 스크립트를 원어민 음성 패키지로 자동 변환",
      "문장별 하이라이트 + 속도 조절로 따라읽기",
      "답변 구조를 보며 기억해서 말하기 연습",
    ],
    steps4: ["전체 듣기", "따라 읽기", "구조로 말하기", "실전 테스트"],
    bg: "warm" as const,
  },
  {
    id: "mockexam",
    step: "STEP 05",
    badge: "모의고사",
    heading: "예상 등급만 알려주는 게 아닙니다\n왜 이 등급인지, 다음에 무엇을 할지 알려줍니다",
    points: [
      "실제 OPIc과 동일한 15문항 실전 시뮬레이션",
      "10가지 질문유형별 맞춤 평가 기준 적용",
      "2회차부터 성장 리포트로 객관적 변화 추적",
    ],
    stats: [
      { value: 74, suffix: "개", label: "평가 항목" },
      { value: 10, suffix: "가지", label: "질문 유형" },
      { value: 4, suffix: "영역", label: "FACT 분석" },
    ],
    bg: "white" as const,
  },
  {
    id: "tutoring",
    step: "STEP 06",
    badge: "튜터링",
    heading: "약점을 아는 것과\n고치는 것은 다릅니다",
    points: [
      "모의고사 결과에서 약점 자동 감지",
      "5가지 훈련 프로토콜로 반복 수행",
      "3단계 난이도 자동 적응 — 내 레벨에 맞게",
    ],
    flow: ["모의고사 결과", "약점 자동 감지", "맞춤 드릴 생성"],
    bg: "cream" as const,
  },
];

/* Social Proof 통계 */
export const proofStats = [
  { value: 471, suffix: "개", label: "기출 질문 DB", desc: "실제 응시 데이터 기반" },
  { value: 74, suffix: "항목", label: "AI 평가 체계", desc: "유형별 맞춤 분석" },
  { value: 7, suffix: "가지", label: "1회 생성 콘텐츠", desc: "스크립트+음성+훈련" },
];

/* 요금제 */
export const plans = [
  {
    name: "체험",
    target: "OPIc이 처음이신 분",
    desc: "OPIc이 어떤 시험인지 경험해 보세요",
    period: "무제한 이용",
    price: "0",
    priceUnit: "",
    highlight: false,
    features: [
      { title: "기출 빈도 분석", details: ["어드밴스 카테고리만 제공"], enabled: true },
      { title: "내 경험 기반 맞춤 스크립트", details: ["체험판 + 후기 제출 시 크레딧 지급"], enabled: true },
      { title: "내 스크립트로 원어민 발음 체화", details: ["체험판 + 쉐도잉 훈련 무제한"], enabled: true },
      { title: "기출 기반 실전 모의고사", details: ["모의고사 체험판"], enabled: true },
      { title: "문항별 개별 평가 + 종합 리포트", details: [], enabled: false },
      { title: "약점 자동 처방 튜터링", details: [], enabled: false },
    ],
    cta: "무료로 시작하기",
    ctaLink: "/signup",
    ctaStyle: "dark" as const,
  },
  {
    name: "실전",
    target: "본격 실전 준비가 필요한 분",
    desc: "본격적인 실전 감각을 키우세요",
    period: "1개월 이용",
    price: "₩19,900",
    priceUnit: "/ 3회권",
    highlight: false,
    features: [
      { title: "기출 빈도 분석", details: ["전체 카테고리 제공"], enabled: true },
      { title: "내 경험 기반 맞춤 스크립트", details: ["스크립트 패키지 생성 15회", "1회 생성 = 7가지 학습콘텐츠"], enabled: true },
      { title: "내 스크립트로 원어민 발음 체화", details: ["내 스크립트가 원어민 음성으로 변환", "듣기 → 따라읽기 → 혼자말하기 → 실전 녹음", "무제한 반복 훈련"], enabled: true },
      { title: "기출 기반 실전 모의고사", details: ["모의고사 3회", "기출 질문에서 실전과 동일하게 출제"], enabled: true },
      { title: "문항별 개별 평가 + 종합 리포트", details: ["10가지 유형별 맞춤 체크리스트", "과제충족 진단 + 최우선 처방 + 교정문", "영역별 실력 분석 + 성장 리포트"], enabled: true },
      { title: "약점 자동 처방 튜터링", details: [], enabled: false },
    ],
    cta: "구매하기",
    ctaLink: "/store",
    ctaStyle: "outline" as const,
  },
  {
    name: "올인원",
    target: "확실한 등급 달성을 원하는 분",
    desc: "빈도 분석부터 약점 튜터링까지, 한 번에",
    period: "2개월 이용",
    price: "₩49,900",
    priceUnit: "/ 10회권",
    highlight: true,
    features: [
      { title: "기출 빈도 분석", details: ["전체 카테고리 제공"], enabled: true },
      { title: "내 경험 기반 맞춤 스크립트", details: ["스크립트 패키지 생성 50회", "1회 생성 = 7가지 학습콘텐츠", "핵심표현 · 만능패턴 · 연결어 하이라이팅"], enabled: true },
      { title: "내 스크립트로 원어민 발음 체화", details: ["내 스크립트가 원어민 음성으로 변환", "듣기 → 따라읽기 → 혼자말하기 → 실전 녹음", "발음 평가 + 무제한 반복 훈련"], enabled: true },
      { title: "기출 기반 실전 모의고사", details: ["모의고사 10회", "기출 질문에서 실전과 동일하게 출제"], enabled: true },
      { title: "문항별 개별 평가 + 종합 리포트", details: ["10가지 유형별 맞춤 체크리스트", "과제충족 진단 + 최우선 처방 + 교정문", "영역별 실력 분석 + 성장 리포트"], enabled: true },
      { title: "약점 자동 처방 튜터링", details: ["튜터링 3회 포함", "모의고사 결과 기반 처방", "5가지 프로토콜 반복 훈련"], enabled: true },
    ],
    cta: "구매하기",
    ctaLink: "/store",
    ctaStyle: "primary" as const,
  },
];

/* FAQ */
export const faqs = [
  {
    q: "하루오픽은 어떤 서비스인가요?",
    a: "하루오픽은 당신의 일상과 경험을 기반으로 OPIc을 준비하는 말하기 학습 플랫폼입니다. 수험생 후기 데이터로 출제 범위를 좁혀주고, 당신의 진짜 일상을 자연스러운 영어 스크립트로 만들어 드립니다. 모의고사, 튜터링, 쉐도잉까지 한곳에서 준비할 수 있습니다.",
  },
  {
    q: "다른 OPIc 서비스와 뭐가 다른가요?",
    a: "대부분의 서비스는 모범답안을 제공하고 외우게 합니다. 하루오픽은 당신의 실제 경험을 바탕으로 스크립트를 만들기 때문에, 시험장에서 자연스럽게 말할 수 있습니다. 기출 빈도 분석, 실전 모의고사, 약점 튜터링까지 한곳에서 체계적으로 준비할 수 있는 점도 차이입니다.",
  },
  {
    q: "무료 체험은 어떻게 이용하나요?",
    a: "회원가입만 하면 별도 결제 없이 무료 플랜이 자동 적용됩니다. 실전 모의고사 1회, 기출 빈도 분석, 체화·쉐도잉 훈련 무제한으로 핵심 기능을 바로 경험할 수 있습니다.",
  },
  {
    q: "언제든지 해지할 수 있나요?",
    a: "네, 유료 플랜은 언제든지 해지할 수 있으며 다음 결제일부터 적용됩니다. 결제일로부터 7일 이내에는 전액 환불도 가능하며, 남은 크레딧은 만료일까지 사용할 수 있습니다.",
  },
  {
    q: "OPIc 시험을 처음 보는데, 어떤 등급부터 도전하면 좋을까요?",
    a: "처음이라면 난이도 5-5로 IM2~IM3를 목표로 시작하는 것을 추천합니다. 하루오픽의 무료 모의고사로 현재 실력을 먼저 확인해 보세요. 결과 리포트에서 목표 등급까지의 학습 방향을 안내해 드립니다.",
  },
  {
    q: "모의고사는 실제 시험과 얼마나 비슷한가요?",
    a: "실제 OPIc과 동일하게 15문항, 자기소개 → 일반 → 롤플레이 → 어드밴스 순서로 진행됩니다. 녹음 기반 답변, 문항별 시간 제한까지 실전과 같은 환경에서 연습할 수 있습니다.",
  },
  {
    q: "학습 데이터는 안전하게 보관되나요?",
    a: "네, 모든 데이터는 암호화되어 안전하게 보관됩니다. 녹음 파일과 스크립트는 본인만 열람할 수 있으며, 계정 삭제 시 모든 데이터가 완전히 삭제됩니다.",
  },
];
