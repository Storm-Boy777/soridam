// 스크립트 + 쉐도잉 모듈 타입 정의

// ── ENUM 리터럴 타입 ──

// 스크립트 소스 (생성/교정)
export const SCRIPT_SOURCES = ['generate', 'correct'] as const;
export type ScriptSource = (typeof SCRIPT_SOURCES)[number];

// 스크립트 상태
export const SCRIPT_STATUSES = ['draft', 'confirmed'] as const;
export type ScriptStatus = (typeof SCRIPT_STATUSES)[number];

// 목표 등급 (스크립트 생성용)
export const TARGET_LEVELS = ['IL', 'IM1', 'IM2', 'IM3', 'IH', 'AL'] as const;
export type TargetLevel = (typeof TARGET_LEVELS)[number];

// 패키지 상태
export const PACKAGE_STATUSES = ['processing', 'completed', 'partial', 'failed'] as const;
export type PackageStatus = (typeof PACKAGE_STATUSES)[number];

// TTS 음성 (Gemini TTS prebuilt voices)
export const TTS_VOICES = ['Zephyr', 'Aoede'] as const;
export type TtsVoice = (typeof TTS_VOICES)[number];

// 쉐도잉 세션 상태
export const SESSION_STATUSES = ['active', 'completed'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

// 쉐도잉 4단계 훈련 스텝
export const SHADOWING_STEPS = ['listen', 'shadow', 'recite', 'speak'] as const;
export type ShadowingStep = (typeof SHADOWING_STEPS)[number];

// ── 한글 레이블 매핑 ──

export const SCRIPT_SOURCE_LABELS: Record<ScriptSource, string> = {
  generate: '스크립트 생성',
  correct: '답변 교정',
};

export const SCRIPT_STATUS_LABELS: Record<ScriptStatus, string> = {
  draft: '초안',
  confirmed: '확정',
};

export const TARGET_LEVEL_LABELS: Record<TargetLevel, string> = {
  IL: 'IL · Intermediate Low',
  IM1: 'IM1 · Intermediate Mid 1',
  IM2: 'IM2 · Intermediate Mid 2',
  IM3: 'IM3 · Intermediate Mid 3',
  IH: 'IH · Intermediate High',
  AL: 'AL · Advanced Low',
};

export const TARGET_LEVEL_SHORT_LABELS: Record<TargetLevel, string> = {
  IL: 'IL',
  IM1: 'IM1',
  IM2: 'IM2',
  IM3: 'IM3',
  IH: 'IH',
  AL: 'AL',
};

export const PACKAGE_STATUS_LABELS: Record<PackageStatus, string> = {
  processing: '생성 중',
  completed: '완료',
  partial: '일부 완료',
  failed: '실패',
};

export const TTS_VOICE_LABELS: Record<TtsVoice, string> = {
  Zephyr: 'Zephyr (중성)',
  Aoede: 'Aoede (여성)',
};

export const SHADOWING_STEP_LABELS: Record<ShadowingStep, string> = {
  listen: '듣기',
  shadow: '따라 읽기',
  recite: '혼자 말하기',
  speak: '실전 말하기',
};

export const SHADOWING_STEP_DESCRIPTIONS: Record<ShadowingStep, string> = {
  listen: '원어민 음성을 듣고 전체 흐름을 파악합니다',
  shadow: '음성을 듣고 따라 읽으며 텍스트 힌트를 조절합니다',
  recite: '음성 없이 혼자 말해봅니다',
  speak: '텍스트와 음성 없이 스스로 말합니다 (AI 평가)',
};

// ── 4계층 JSON 구조 (paragraphs > slots > sentences) ──

// 만능 패턴 메타데이터 (핵심 정리 탭용)
export interface ReusablePattern {
  template: string;        // "What I love most about ___ is that ___."
  description_ko: string;  // "___에서 가장 좋은 점은 ___라는 거예요"
  example: string;         // 다른 주제 활용 예시
}

// 문장
export interface ScriptSentence {
  index: number;        // 전체 스크립트 기준 연속 번호
  english: string;
  korean: string;
}

// 슬롯
export interface ScriptSlot {
  slot_index: number;
  slot_function: string;  // "대상 소개", "배경/맥락" 등
  text: string;           // 영어 전문
  translation_ko: string; // 한국어 전문
  sentences: ScriptSentence[];
  keywords: string[];
}

// 문단 (서론/본론/결론)
export interface ScriptParagraph {
  type: 'introduction' | 'body' | 'conclusion';
  label: string;          // "서론", "본론", "결론"
  slots: ScriptSlot[];
}

// GPT 응답 전체 구조 (Pass 1 생성 + Pass 2 리스트 병합)
export interface ScriptOutput {
  paragraphs: ScriptParagraph[];
  full_text: {
    english: string;
    korean: string;
  };
  word_count: number;
  // Pass 2 학습 분석 리스트
  key_expressions: string[];             // 핵심 표현 (2-5 word chunks)
  reusable_patterns: ReusablePattern[];  // 만능 패턴 (문장 틀 + 한국어 설명 + 예시)
  connectors: string[];                  // 연결어 ("Speaking of which, " 등)
  fillers: string[];                     // 필러 ("Well, " 등)
}

// 타임스탬프 데이터 (패키지)
export interface TimestampItem {
  index: number;
  english: string;
  korean: string;
  start: number;    // 초
  end: number;      // 초
  duration: number;  // 초
}

// ── DB 매핑 타입 ──

export interface Script {
  id: string;
  user_id: string;
  question_id: string;
  source: ScriptSource;
  title: string | null;
  english_text: string;
  korean_translation: string | null;
  paragraphs: ScriptOutput | null;
  total_slots: number | null;
  category: string | null;
  topic: string | null;
  question_korean: string | null;
  question_english: string | null;
  user_story: string | null;
  user_original_answer: string | null;
  target_level: TargetLevel | null;
  question_type: string | null;
  ai_model: string | null;
  word_count: number | null;
  generation_time: number | null;
  key_expressions: string[];
  highlighted_script: string | null;
  status: ScriptStatus;
  refine_count: number;
  created_at: string;
  updated_at: string;
}

export interface ScriptPackage {
  id: string;
  user_id: string;
  script_id: string;
  status: PackageStatus;
  progress: number;
  wav_file_path: string | null;
  json_file_path: string | null;
  timestamp_data: TimestampItem[] | null;
  wav_file_size: number | null;
  tts_voice: TtsVoice;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ShadowingSession {
  id: string;
  user_id: string;
  package_id: string;
  script_id: string;
  question_text: string | null;
  question_korean: string | null;
  topic: string | null;
  status: SessionStatus;
  audio_duration: number | null;
  started_at: string;
  completed_at: string | null;
}

export interface ShadowingEvaluation {
  id: string;
  session_id: string;
  user_id: string;
  transcript: string;
  word_count: number | null;
  pronunciation: number | null;
  fluency: number | null;
  grammar: number | null;
  vocabulary: number | null;
  content_score: number | null;
  overall_score: number | null;
  estimated_level: TargetLevel | null;
  script_utilization: number | null;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  script_analysis: {
    key_sentences_used: string[];
    key_vocabulary_used: string[];
    missing_elements: string[];
  } | null;
  created_at: string;
}

// script_specs (읽기 전용)
export interface ScriptSpec {
  id: number;
  guide_id: string;
  question_type: string;
  target_level: TargetLevel;
  total_slots: number;
  level_constraints: string;
  slot_structure: string;
  example_output: { examples_markdown: string };
  eval_criteria: string;
}

// ai_prompt_templates (읽기 전용)
export interface AiPromptTemplate {
  id: number;
  template_id: string;
  prompt_name: string | null;
  system_prompt: string;
  user_template: string | null;
  model: string;
  temperature: number;
  max_tokens: number;
  response_format: string;
  is_active: boolean;
}

// ── 스크립트 생성 입력 ──

export interface GenerateScriptInput {
  question_id: string;
  topic: string;
  category: string;
  question_english: string;
  question_korean: string;
  question_type: string;
  target_level: TargetLevel;
  user_story?: string;  // 한국어 스토리 (선택)
}

export interface CorrectScriptInput {
  question_id: string;
  topic: string;
  category: string;
  question_english: string;
  question_korean: string;
  question_type: string;
  target_level: TargetLevel;
  user_original_answer: string;  // 학습자 영어 답변 (필수)
}

export interface RefineScriptInput {
  script_id: string;
  user_prompt?: string;  // 수정 요청 (선택)
}

// ── 응답 타입 ──

// 스크립트 목록 아이템 (내 스크립트 탭)
export interface ScriptListItem {
  id: string;
  question_id: string;
  source: ScriptSource;
  title: string | null;
  english_text: string;
  topic: string | null;
  category: string | null;
  question_korean: string | null;
  question_english: string | null;
  question_short: string | null;
  target_level: TargetLevel | null;
  question_type: string | null;
  word_count: number | null;
  status: ScriptStatus;
  refine_count: number;
  created_at: string;
  updated_at: string;
  // 패키지 정보 (JOIN)
  package?: {
    id: string;
    status: PackageStatus;
    progress: number;
  } | null;
}

// 스크립트 상세 (스크립트 뷰어)
export interface ScriptDetail extends Script {
  package: ScriptPackage | null;
  question_detail?: {
    id: string;
    question_english: string;
    question_korean: string;
    topic: string;
    category: string;
    question_type_eng: string;
  };
}

// 쉐도잉 이력 아이템
export interface ShadowingHistoryItem {
  id: string;
  script_id: string;
  topic: string | null;
  question_korean: string | null;
  status: SessionStatus;
  audio_duration: number | null;
  started_at: string;
  completed_at: string | null;
  evaluation?: {
    overall_score: number | null;
    estimated_level: string | null;
    pronunciation: number | null;
    fluency: number | null;
  } | null;
}

// ── 크레딧 관련 ──

export interface CreditCheckResult {
  hasCredit: boolean;
  planCredits: number;
  permanentCredits: number;
  totalCredits: number;
}

// ── opic_tips 학습 콘텐츠 ──

export type OpicTipCategory = 'opening' | 'filler' | 'pattern' | 'emotion' | 'tip';

export interface OpicTip {
  id: number;
  category: OpicTipCategory;
  title: string;
  expression: string;
  description: string | null;
}

export const OPIC_TIP_CATEGORY_LABELS: Record<OpicTipCategory, string> = {
  opening: '만능 도입',
  filler: '필러 표현',
  pattern: '유형별 패턴',
  emotion: '감정 표현',
  tip: '등급 팁',
};

export const OPIC_TIP_CATEGORY_EMOJIS: Record<OpicTipCategory, string> = {
  opening: '💬',
  filler: '🔄',
  pattern: '📝',
  emotion: '❤️',
  tip: '💡',
};

// ── 스크립트 탭 타입 ──

export const SCRIPT_TABS = ['create', 'my-scripts', 'shadowing'] as const;
export type ScriptTab = (typeof SCRIPT_TABS)[number];

export const SCRIPT_TAB_LABELS: Record<ScriptTab, string> = {
  create: '스크립트 생성',
  'my-scripts': '내 스크립트',
  shadowing: '쉐도잉 훈련',
};
