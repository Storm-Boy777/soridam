// 스크립트 + 쉐도잉 모듈 타입 정의

// ── ENUM 리터럴 타입 ──

// 스크립트 소스 (생성/교정/외부)
export const SCRIPT_SOURCES = ['generate', 'correct', 'external'] as const;
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

// TTS 음성 — 여성(Gemini Cloud TTS GA) / 남성(ElevenLabs 프리미엄)
// ※ 레거시 패키지엔 'Zephyr'(구 Gemini 남성)도 존재 — 표시/EF에서 하위호환 처리
export const TTS_VOICES = ['Aoede', 'eleven_male'] as const;
export type TtsVoice = (typeof TTS_VOICES)[number];

// 쉐도잉 세션 상태
export const SESSION_STATUSES = ['active', 'completed'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

// 쉐도잉 3단계 훈련 스텝 (실전 평가는 모의고사 모듈로 분리)
export const SHADOWING_STEPS = ['listen', 'shadow', 'recite'] as const;
export type ShadowingStep = (typeof SHADOWING_STEPS)[number];

// ── 한글 레이블 매핑 ──

export const SCRIPT_SOURCE_LABELS: Record<ScriptSource, string> = {
  generate: '스크립트 생성',
  correct: '답변 교정',
  external: '외부 스크립트',
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
  Aoede: '여성 (Aoede)',
  eleven_male: '남성 (Liam)',
};

// 음성 메타 — 제공자/등급/비용 안내 (UI 배지 + 비용 노출용)
export interface TtsVoiceMeta {
  gender: string;
  provider: 'gemini' | 'elevenlabs';
  tier: 'standard' | 'premium';
  costHint?: string;
}

export const TTS_VOICE_META: Record<TtsVoice, TtsVoiceMeta> = {
  Aoede: { gender: '여성', provider: 'gemini', tier: 'standard' },
  eleven_male: {
    gender: '남성',
    provider: 'elevenlabs',
    tier: 'premium',
    costHint: '프리미엄 음성 · 비용이 더 높아요',
  },
};

// 목표 프레이밍: '동작'이 아니라 '무엇을 얻는 단계인지' (귀 → 입 → 머리)
export const SHADOWING_STEP_LABELS: Record<ShadowingStep, string> = {
  listen: '감각 익히기',
  shadow: '따라 말하기',
  recite: '통째로 체화',
};

export const SHADOWING_STEP_SHORT_LABELS: Record<ShadowingStep, string> = {
  listen: '감각',
  shadow: '따라하기',
  recite: '체화',
};

// 각 설명은 '목표 + 직전 단계와의 연결'을 함께 담아 학습 경로로 인식되게 한다
export const SHADOWING_STEP_DESCRIPTIONS: Record<ShadowingStep, string> = {
  listen: '원어민이 내 답변을 어떻게 말하는지 귀로 익혀요 — 리듬·억양·끊어 읽기 감각을 잡는 단계',
  shadow: '들은 감각 그대로 따라 말하며 입에 붙여요 — 발음과 유창함이 몸에 배는 단계',
  recite: '이제 스크립트 없이 흐름만 떠올리며 통째로 말해봐요 — 시험장에서 바로 나오게 체화하는 단계',
};

// ── 4계층 JSON 구조 (paragraphs > slots > sentences) ──

// ── Pass 2 학습 분석 콘텐츠 타입 ──

// 만능 패턴 메타데이터 (재사용 슬롯)
export interface ReusablePattern {
  template: string;        // "What I love most about ___ is that ___."
  description_ko: string;  // "___에서 가장 좋은 점은 ___라는 거예요"
  examples?: string[];     // 서로 다른 주제 활용 예시 2~3개
  example?: string;        // (구버전 호환) 단일 활용 예시
}

// 30초 압축 버전 (실전 탈출/요약용)
export interface Compressed30s {
  english: string;
  korean: string;
}

// 뼈대 구조
export interface StructureSummaryItem {
  tag: string;          // "Opening", "Context", "Q1", "Closing" 등
  description: string;  // 한국어 설명
}

// 핵심 문장
export interface KeySentence {
  english: string;  // 원문 문장
  reason: string;   // 왜 중요한지 한국어 설명
}

// 핵심 표현 (보강)
export interface KeyExpression {
  en: string;   // 영어 표현
  ko: string;   // 한국어 뜻
  tip: string;  // 학습 팁 한 줄
}

// 담화 장치 (연결어+필러 통합)
export interface DiscourseMarker {
  en: string;       // "Well," / "However,"
  ko: string;       // "음," / "그런데,"
  function: string; // "hesitation" / "contrast" 등
  usage: string;    // 사용 타이밍 한 줄
}

// 유사 질문
export interface SimilarQuestion {
  question: string;     // 영어 질문
  reuse_hint: string;   // 한국어 재사용 힌트
}

// 교정 항목 (외부 스크립트 기본 교열 내역 — 오타·관사·문법 등 기계적 오류만)
export interface ScriptCorrection {
  original: string;   // 원문 (수정 전)
  corrected: string;  // 수정 후
  reason: string;     // 한국어 설명 (왜 고쳤는지)
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

// GPT 응답 전체 구조 (Pass 1 생성 + Pass 2 학습 분석 병합)
export interface ScriptOutput {
  paragraphs: ScriptParagraph[];
  full_text: {
    english: string;
    korean: string;
  };
  word_count: number;
  // Pass 2 학습 분석
  structure_summary?: StructureSummaryItem[];  // 답변 뼈대 (내용형 슬롯)
  key_expressions?: KeyExpression[];           // 꼭 가져갈 표현 (범용)
  discourse_markers?: DiscourseMarker[];       // 담화 장치 (연결어+필러 통합)
  reusable_patterns?: ReusablePattern[];       // 재사용 슬롯 (★ 주력)
  similar_questions?: SimilarQuestion[];        // 유사 질문 (확장 가능한 문제)
  expansion_ideas?: string[];                  // 확장 아이디어 (IM3+)
  compressed_30s?: Compressed30s;              // 30초 압축 버전
  corrections?: ScriptCorrection[];            // 기본 교열 내역 (외부 스크립트 전용)
  key_sentences?: KeySentence[];               // (구버전 호환) 핵심 문장 — 신규 생성 X
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
  target_grade: TargetLevel | null;
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
  transcript: string | null;
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
  // 실전 평가 (미니 모의고사) 확장 필드
  eval_status?: string;
  audio_url?: string | null;
  wpm?: number | null;
  filler_count?: number | null;
  pronunciation_assessment?: Record<string, unknown> | null;
  fulfillment?: string | null;
  task_checklist?: Array<{ item: string; pass: boolean; evidence: string }> | null;
  observation?: string | null;
  directions?: string[] | null;
  weak_points?: Array<{ code: string; severity: string; reason: string; evidence: string }> | null;
}

// script_specs (읽기 전용)
export interface ScriptSpec {
  id: number;
  guide_id: string;
  question_type: string;
  target_grade: TargetLevel;
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
  target_grade: TargetLevel;
  user_story?: string;  // 한국어 스토리 (선택)
}

export interface CorrectScriptInput {
  question_id: string;
  topic: string;
  category: string;
  question_english: string;
  question_korean: string;
  question_type: string;
  target_grade: TargetLevel;
  user_original_answer: string;  // 학습자 영어 답변 (필수)
}

export interface ExternalScriptInput {
  question_id: string;
  topic: string;
  category: string;
  question_english: string;
  question_korean: string;
  question_type: string;
  external_text: string;  // 사용자가 붙여넣은 완성된 영어 스크립트 (필수)
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
  target_grade: TargetLevel | null;
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
  question_text: string | null;   // 영어 질문 (세션 저장값)
  question_short: string | null;  // 짧은 한글 (questions join)
  question_type: string | null;   // 질문 유형 (scripts join)
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
  balanceCents: number;
  estimatedCostCents: number;
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
