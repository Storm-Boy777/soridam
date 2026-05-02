/**
 * 디자인 시안용 Mock 데이터
 *
 * 실제 통합 시 Server Action 결과로 교체:
 * - getSessionDetail() → SessionData
 * - getSessionAnswers() → 멤버별 답변 + feedback_result
 */

export type AnswerTone = "good" | "polish" | "normal";

export interface AnswerSegment {
  text: string;
  tone: AnswerTone;
}

export interface AnswerData {
  questionLabel: string;
  question: string;
  duration: string;
  segments: AnswerSegment[];
}

export interface MemberAnswer {
  key: "a" | "b" | "c" | "d";
  name: string;
  initial: string;
  answer: string;
  duration?: string;
  bp: { tag: string; note: string };
  polish: string;
}

// Step 6-4 mock
export const MOCK_COACH_TRANSCRIPT: AnswerData = {
  questionLabel: "Q1 · 묘사 (Description)",
  question:
    "I would like you to talk about the music you like to listen to. What kind of music do you enjoy? Who are some of your favorite musicians or composers?",
  duration: "0:48",
  segments: [
    { text: "I'm really into hip-hop these days. ", tone: "good" },
    { text: "I usually listen on my way to work, ", tone: "good" },
    { text: "and I ", tone: "normal" },
    { text: "go to concerts ", tone: "polish" },
    { text: "almost every month. ", tone: "normal" },
    { text: "My favorite artist is Kendrick Lamar — his lyrics ", tone: "normal" },
    { text: "are really meaningful", tone: "good" },
    { text: " to me.", tone: "normal" },
  ],
};

export const MOCK_COACHING = {
  intro:
    '도입이 자연스러웠어요. "I\'m really into..." 같은 표현이 시작을 부드럽게 만들어줬어요. 한 가지만 같이 다듬어볼까요?',
  good: '도입부 connector가 자연스러워요. "I\'m really into..." 구문은 묘사 답변에서 가장 좋아하는 시작 방식 중 하나예요.',
  polish:
    '"go to concerts" 부분에서 한 번 멈추셨어요. 다음번엔 "I love going to concerts"처럼 동사 형태를 살짝 바꿔보면 더 자연스러워요.',
  tip: 'AL 등급에서는 구체적인 예시 한 가지를 더 넣으면 좋아요. 예: "Kendrick Lamar의 \'HUMBLE.\'을 자주 들어요" 같은 디테일이요.',
};

// Step 6-6 mock
export const MOCK_MEMBERS_66: MemberAnswer[] = [
  {
    key: "a",
    name: "Alice",
    initial: "A",
    answer:
      "I'm really into hip-hop these days. I usually listen on my way to work — Kendrick Lamar's lyrics are really meaningful to me.",
    duration: "0:48",
    bp: { tag: "도입 connector", note: "into 구문이 자연스러워요" },
    polish: "시제 연결",
  },
  {
    key: "b",
    name: "Bob",
    initial: "B",
    answer:
      "Well, I love jazz. My favorite is Miles Davis, and I often go to live shows in small clubs around the city.",
    duration: "0:42",
    bp: { tag: "구체적 디테일", note: '"small clubs around the city"' },
    polish: "도입부 길이",
  },
  {
    key: "c",
    name: "Carol",
    initial: "C",
    answer:
      "I mostly listen to K-pop. I would say BTS and IU are the artists I follow the most. Their songs help me relax.",
    duration: "0:51",
    bp: { tag: "I would say…", note: "AL 등급 hedge 표현" },
    polish: "문장 다양성",
  },
  {
    key: "d",
    name: "Dan",
    initial: "D",
    answer:
      "Honestly, I enjoy all kinds of music — but lately I've been hooked on indie rock. Tame Impala is on repeat.",
    duration: "0:46",
    bp: { tag: "리듬감", note: '"on repeat" 같은 구어체' },
    polish: "시작 어휘",
  },
];

export const MOCK_INSIGHT_TEXT =
  "네 명 모두 \"into / hooked on\" 같은 몰입 표현으로 시작했어요. 묘사 콤보의 좋은 도입 패턴이에요.";

export const MOCK_INSIGHT_TEXT_PC =
  "네 명 모두 \"into / hooked on / love\" 같은 몰입 표현으로 자연스럽게 시작했어요. 묘사 콤보의 좋은 도입 패턴이에요.";

// ============================================================
// Setup (Step 1~5) mock
// ============================================================

export const MOCK_GROUP = {
  name: "5월 오픽 AL 스터디",
  level: "AL",
  memberCount: 4,
};

export const MOCK_MEMBERS_BASE = [
  { key: "a" as const, name: "Alice", initial: "A", isMe: true },
  { key: "b" as const, name: "Bob", initial: "B", isMe: false },
  { key: "c" as const, name: "Carol", initial: "C", isMe: false },
  { key: "d" as const, name: "Dan", initial: "D", isMe: false },
];

export interface CategoryItem {
  key: "general" | "rp" | "adv";
  name: string;
  desc: string;
  tag: string | null;
  icon: string;
}

export const MOCK_CATEGORIES: CategoryItem[] = [
  { key: "general", name: "일반 주제", desc: "음악·여행·영화 등 일상 카테고리", tag: "추천", icon: "🌿" },
  { key: "rp", name: "롤플레이", desc: "주어진 상황에서 역할극 답변", tag: null, icon: "🎭" },
  { key: "adv", name: "어드밴스", desc: "복합 질문 · IH~AL 도전", tag: "AL 도전", icon: "🎯" },
];

export interface TopicItem {
  key: string;
  name: string;
  meta: string;
  recent: boolean;
}

export const MOCK_TOPICS: TopicItem[] = [
  { key: "music", name: "음악", meta: "출제율 ↑↑↑", recent: false },
  { key: "travel", name: "여행", meta: "출제율 ↑↑↑", recent: true },
  { key: "movie", name: "영화", meta: "출제율 ↑↑", recent: false },
  { key: "sports", name: "스포츠", meta: "출제율 ↑↑", recent: false },
  { key: "cook", name: "요리", meta: "출제율 ↑", recent: false },
  { key: "park", name: "공원", meta: "출제율 ↑", recent: false },
];

export interface ComboItem {
  key: string;
  tag: string;
  questions: string[];
  learned: boolean;
  /** 실제 데이터: 콤보 시그니처 (정렬된 question_id|로 join) */
  sig?: string;
  /** 실제 데이터: 출제 순서 그대로의 question_id 배열 */
  qids?: string[];
  /** 실제 데이터: 출제 횟수 */
  frequency?: number;
  /** 실제 데이터: 토픽 내 출제 비율 (%) */
  appearancePct?: number;
  /** 실제 데이터: 질문별 메타 (등장률 + 사용자 학습 여부) */
  questionMeta?: Array<{
    appearancePct: number;
    studiedByUser: boolean;
  }>;
}

export const MOCK_COMBOS: ComboItem[] = [
  {
    key: "combo1",
    tag: "가장 자주 출제",
    questions: ["좋아하는 음악 묘사", "음악 듣는 습관", "기억에 남는 공연 경험"],
    learned: false,
  },
  {
    key: "combo2",
    tag: "두 번째로 자주",
    questions: ["좋아하는 가수 소개", "가수의 매력", "콘서트 경험"],
    learned: true,
  },
  {
    key: "combo3",
    tag: "도전형",
    questions: ["음악 취향 변화", "음악과 감정", "미래 음악 트렌드"],
    learned: false,
  },
];

export interface GuidePoint {
  tag: string;
  text: string;
}

export const MOCK_GUIDE_INTRO = {
  comboTitle: "음악 · AL",
  appearancePct: 53,
  description:
    "이 콤보는 일반 주제 자리에서 **53% 확률**로 등장하는 정형화된 패턴이에요.",
};

export const MOCK_GUIDE_POINTS: GuidePoint[] = [
  { tag: "도입", text: "몰입 표현 (into / hooked on)으로 자연스럽게 시작하기" },
  { tag: "구조", text: "습관 → 구체적 예시 → 감정 한 줄로 마무리" },
  { tag: "디테일", text: "아티스트 이름 · 곡명 · 장소 같은 디테일 한 가지 이상" },
];

// ============================================================
// Loop (Step 6-1~6-3) mock
// ============================================================

export const MOCK_QUESTION_Q1 = {
  num: 1,
  total: 3,
  type: "묘사",
  english: "What kind of music do you enjoy? Who are some of your favorite musicians?",
  englishLong:
    "What kind of music do you enjoy? Who are some of your favorite musicians or composers?",
};

export const MOCK_NOTE_DEFAULT = `• "I'm really into ~" 도입 좋음
• Kendrick Lamar 디테일 깔끔`;

export interface ProcessStep {
  label: string;
  state: "done" | "doing" | "wait";
}

export const MOCK_PROCESS_STEPS: ProcessStep[] = [
  { label: "답변 듣기", state: "done" },
  { label: "표현 분석", state: "doing" },
  { label: "코치 노트 정리", state: "wait" },
];

// ============================================================
// Entry (Home/Lobby/MyPage) mock
// ============================================================

export const MOCK_HOME_USER = {
  name: "Alice",
  initial: "A",
  todayLabel: "5월 2일 금요일",
  nextSessionTime: "오늘 저녁 8시",
};

export const MOCK_HOME_GROUPS = [
  { name: "5월 오픽 AL 스터디", meta: "주 3회 · 4명", live: true },
  { name: "4월 오픽 IH 스터디", meta: "종료 · 12회 학습", live: false },
];

export const MOCK_LOBBY_MEMBERS = [
  { key: "a" as const, name: "Alice", state: "me" as const },
  { key: "b" as const, name: "Bob", state: "in" as const },
  { key: "c" as const, name: "Carol", state: "wait" as const },
  { key: "d" as const, name: "Dan", state: "wait" as const },
];

export interface BpQuote {
  from: string;
  text: string;
  tag: string;
}

export const MOCK_MY_BPS: BpQuote[] = [
  { from: "Bob", text: "small clubs around the city", tag: "구체적 디테일" },
  { from: "Carol", text: "I would say…", tag: "AL hedge" },
  { from: "Dan", text: "on repeat", tag: "구어체 리듬" },
];

export const MOCK_MY_HISTORY = [
  { name: "음악 · AL", date: "5/2", done: true },
  { name: "여행 · AL", date: "4/30", done: true },
  { name: "영화 · AL", date: "4/28", done: true },
];

// ============================================================
// Step 7 (종료) mock
// ============================================================

export const MOCK_STEP7 = {
  title: "오늘도 한 걸음",
  subtitle: "4명이 함께 음악 콤보 3문항을 끝냈어요",
  bestExpression: "I'm really into hip-hop these days",
  bestFrom: "Alice의 도입 표현",
  coachNote: {
    keyword: "몰입 표현",
    detailKeyword: "구체적 디테일",
  },
  memberNotes: [
    { key: "a" as const, name: "Alice", note: "도입 connector" },
    { key: "b" as const, name: "Bob", note: "구체적 디테일" },
    { key: "c" as const, name: "Carol", note: "hedge 표현" },
    { key: "d" as const, name: "Dan", note: "구어체 리듬" },
  ],
  nextRecommend: { name: "여행 (Travel) · AL", meta: "출제율 ↑" },
};

// ============================================================
// Edge case mock
// ============================================================

export const MOCK_MIC_STEPS = [
  "설정 앱 열기",
  "오픽 스터디 → 마이크",
  '"허용"으로 변경',
];

export const MOCK_RECONNECT_MEMBERS = [
  { key: "a" as const, name: "Alice", state: "in" as const },
  { key: "b" as const, name: "Bob", state: "in" as const },
  { key: "c" as const, name: "Carol", state: "out" as const },
  { key: "d" as const, name: "Dan", state: "in" as const },
];
