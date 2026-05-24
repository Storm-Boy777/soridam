/* ── 스터디 모임 타입 정의 ── */

// 팟캐스트 에피소드
// 확장 어휘 (audio review식 — 유의어·반의어·관련어)
export interface RelatedVocab {
  word: string;
  meaning_ko: string;
  relation: string;                         // "유의어" | "반의어" | "관련어"
}

export interface KeyExpression {
  expression: string;                       // 표현 (콜로케이션·구동사·관용구)
  type?: "word" | "phrase" | "pattern";     // 단어 / 구동사·관용구 / 회화 기능 패턴
  pronunciation: string;                    // 발음기호 (IPA, 예: /kəmˈplit/)
  part_of_speech: string;                   // 품사 (예: phrasal verb, idiom, noun)
  meaning_ko: string;                       // 한국어 뜻 + 뉘앙스
  meaning_en: string;                       // 영영 정의
  examples: { en: string; ko: string }[];   // 예문 2~3개 + 번역
  similar_expressions: string[];            // 유사 표현
  related_vocab?: RelatedVocab[];           // 확장 어휘 (유의어·반의어·관련어)
  speaking_prompt: string;                  // "이 표현으로 말해보기" 프롬프트
  level: "core" | "stretch";                // core=필수 / stretch=도전
}

// 대화 1차 구간 — 영상에서 대화 부분만 재생 (초 단위)
export interface DialogueSegment {
  start_sec: number;
  end_sec: number;
}

// 대화 1차 자막 라인 (구버전 가라오케 — Supadata 자막 기반)
export interface DialogueLine {
  start_ms: number;
  end_ms: number;
  text: string;
}

// Whisper 화자별 세그먼트 (추출 오디오 가라오케 재생용)
export interface DialogueTimestamp {
  speaker: string;
  text: string;
  translation: string;   // 한국어 번역
  start: number;         // 초
  end: number;
}

// 2인 무대 역할극 가이드
export interface RoleplayRole {
  name: string;
  description: string;
  objectives: string[];
  suggested_phrases: string[];
}
export interface RoleplayData {
  scenario: string;
  scenario_ko: string;
  role_a: RoleplayRole;
  role_b: RoleplayRole;
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
  listening_mission: string;                // 1차 청취 focus 미션
  dialogue_segment: DialogueSegment | null; // 대화 1차 구간
  dialogue_lines: DialogueLine[];           // 구버전 자막 라인 (Supadata)
  dialogue_title: string | null;            // 대화 상황 영문 제목
  dialogue_script: string | null;           // 화자 구분 대화 스크립트
  dialogue_timestamps: DialogueTimestamp[]; // Whisper 화자별 세그먼트 (가라오케)
  roleplay: RoleplayData | null;            // 2인 무대 역할극
  key_expressions: KeyExpression[];
  comprehension_questions: string[];
  discussion_questions: string[];
  todays_picks: string[];                   // 오늘의 표현 후보 3개
  audio_url: string | null;                 // 추출한 대화 구간 오디오 (091, 가라오케 재생 소스)
  sort_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** 월요일 자료 준비용 유튜버 채널 바로가기 (096) */
export interface YoutubeChannelRow {
  id: string;
  name: string;
  channel_url: string;
  sort_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
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

/* ── 패널 멤버 (Talklish 화면 표시용 6명) ── */
export interface PanelMember {
  id: string;
  user_id: string | null;  // profiles.id (NULL이면 레거시/게스트)
  name: string;            // 별명 또는 display_name 복사본
  emoji: string;           // 예: "🦊"
  color: string;           // HEX (예: "#C9522D")
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** 관리자 UI 조회용 — profile 정보 합본 */
export interface PanelMemberWithProfile extends PanelMember {
  email: string | null;
  display_name: string | null;
}

export interface PanelUserSearchResult {
  user_id: string;
  email: string;
  display_name: string | null;
  is_already_member: boolean;
}
