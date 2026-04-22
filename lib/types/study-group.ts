/* ── 스터디 모임 타입 정의 ── */

// 팟캐스트 에피소드
export interface KeyExpression {
  english: string;
  korean: string;
  example: string;
}

export interface PodcastEpisode {
  id: string;
  title: string;
  source: string;           // "BBC 6 Minute English", "All Ears English" 등
  url: string;               // 외부 링크
  duration: string;          // "6 min", "15 min"
  difficulty: "beginner" | "intermediate" | "advanced";
  topic: string;             // OPIc 연관 주제
  description: string;
  keyExpressions: KeyExpression[];
  discussionQuestions: string[];
  warmupQuestion: string;    // Phase 1 아이스브레이커
  comprehensionQuestions: string[]; // Phase 4 이해도 체크
}

// 5-Phase 팟캐스트 스터디 진행 단계
export interface StudyFlowStep {
  phase: number;
  name: string;
  nameEn: string;
  duration: string;         // "5 min", "10 min"
  durationSeconds: number;
  description: string;
}

// 프리토킹 주제
export type FreeTalkCategory = "daily" | "opinions" | "hypothetical" | "culture" | "current";

export interface FreeTalkTopic {
  english: string;
  korean: string;
  followUp: string;         // 후속 질문
  category: FreeTalkCategory;
}

// 게임 타입
export type GameType = "taboo" | "would-you-rather" | "debate" | "two-truths" | "story-chain";

export interface TabooCard {
  target: string;            // 설명할 단어
  forbidden: string[];       // 금지 단어 5개
}

export interface WouldYouRatherCard {
  optionA: string;
  optionB: string;
}

export interface DebateTopic {
  topic: string;
  context: string;           // 배경 설명
  proPoints: string[];       // 찬성 포인트
  conPoints: string[];       // 반대 포인트
}

export interface StoryStarter {
  opening: string;           // 시작 문장
  genre: string;             // 장르 힌트
}

export interface GameInfo {
  type: GameType;
  name: string;
  nameKo: string;
  icon: string;              // Lucide 아이콘 이름
  description: string;
  rules: string[];
  timerSeconds: number;
}

/* ── DB Row 타입 ── */

export interface PodcastRow {
  id: string;
  title: string;
  source: string;
  url: string;
  duration: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  topic: string;
  description: string;
  warmup_question: string;
  key_expressions: KeyExpression[];
  comprehension_questions: string[];
  discussion_questions: string[];
  sort_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FreetalkRow {
  id: string;
  english: string;
  korean: string;
  follow_up: string;
  category: FreeTalkCategory;
  sort_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type GameCardGameType = "taboo" | "would-you-rather" | "debate" | "story-chain";

export interface GameCardRow {
  id: string;
  game_type: GameCardGameType;
  data: TabooCard | WouldYouRatherCard | DebateTopic | StoryStarter;
  sort_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
