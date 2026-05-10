// 오픽 스터디 모듈 타입 정의
// 설계서: docs/설계/오픽스터디.md

import type { OpicLevel } from './mock-exam';

// ============================================================
// ENUM 리터럴 타입
// ============================================================

// 스터디 그룹 상태
export const STUDY_GROUP_STATUSES = ['active', 'closed'] as const;
export type StudyGroupStatus = (typeof STUDY_GROUP_STATUSES)[number];

// 세션 단계 (Realtime 동기화 핵심)
export const SESSION_STEPS = [
  'mode_select',
  'category_select',
  'topic_select',
  'combo_select',
  'guide',
  'recording',
  'feedback_share',
  'discussion',
  'completed',
] as const;
export type SessionStep = (typeof SESSION_STEPS)[number];

// 세션 상태
export const STUDY_SESSION_STATUSES = ['active', 'completed', 'abandoned'] as const;
export type StudySessionStatus = (typeof STUDY_SESSION_STATUSES)[number];

// 학습 카테고리 (combo_type과 정렬)
export const STUDY_CATEGORIES = ['general', 'roleplay', 'advance'] as const;
export type StudyCategory = (typeof STUDY_CATEGORIES)[number];

// ============================================================
// DB 테이블 인터페이스
// ============================================================

// 1. study_groups
// 그룹 자체는 등급 보유 X — 각 멤버는 자기 profiles.target_grade로 학습.
export interface StudyGroup {
  id: string;
  name: string;
  start_date: string;                      // 'YYYY-MM-DD'
  end_date: string;                        // 'YYYY-MM-DD'
  status: StudyGroupStatus;
  description: string | null;
  schedule: GroupSchedule | null;          // 그룹별 운영 일정 (매주 N요일 HH:MM~HH:MM)
  created_by: string;                      // user_id
  created_at: string;
  updated_at: string;
}

// 모임 방식
export type MeetingMode = "online" | "offline";

// 그룹 일정 — study_groups.schedule (jsonb)
export interface GroupSchedule {
  /** 0=일, 1=월, …, 6=토 */
  days: number[];
  /** "HH:MM" KST */
  start_time: string;
  /** "HH:MM" KST */
  end_time: string;
  /** "YYYY-MM-DD" — 이 날짜 이전엔 "첫 스터디 전" 상태 */
  first_session_date: string;
  /** 그룹 기본 모임 방식 */
  default_mode: MeetingMode;
  /** 요일별 모드 override — key는 dayOfWeek 문자열 ("0"~"6"). 없으면 default_mode */
  day_modes?: Record<string, MeetingMode>;
}

// 2. study_group_members
export interface StudyGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  display_name: string | null;
  joined_at: string;
}

// 3. opic_study_sessions (룸)
export interface OpicStudySession {
  id: string;
  group_id: string;

  // 모드
  online_mode: boolean;

  // 진행 단계
  step: SessionStep;

  // 학습 콘텐츠 선택 상태
  selected_category: StudyCategory | null;
  selected_topic: string | null;
  selected_combo_sig: string | null;
  selected_question_ids: string[];

  // 진행 상태
  current_question_idx: number;
  current_speaker_user_id: string | null;

  // AI 가이드 (v2 — 한글 전용, 등급 비특정)
  ai_guide_intro: string | null;           // 한 줄 인사 (예: "오늘은 음악 콤보로 함께 연습해볼게요")
  ai_guide_approaches: ApproachItem[] | null; // 질문별 한글 가이드 (콤보 질문 수만큼)
  ai_guide_generated_at: string | null;

  // 메타
  status: StudySessionStatus;
  started_at: string;
  ended_at: string | null;
  created_by: string;
  updated_at: string;
}

// 4. opic_study_answers
export interface OpicStudyAnswer {
  id: string;
  session_id: string;
  user_id: string;
  question_id: string;
  question_idx: number;

  // 음성 + STT
  audio_url: string | null;
  transcript: string | null;

  // 발음 평가 (Azure) — 내부 GPT 입력 전용, UI 노출 X
  pronunciation_score: PronunciationScore | null;

  // AI F/B (일타강사 코칭)
  feedback_result: FeedbackResult | null;
  feedback_generated_at: string | null;

  created_at: string;
}

// ============================================================
// AI F/B 결과 JSON 구조
// ============================================================

// 발음 평가 (Azure 원본 — 내부 사용 전용)
export interface PronunciationScore {
  accuracy: number;                        // 0~100
  fluency: number;
  prosody: number;
  completeness: number;
  pron_score: number;                      // 종합

  words?: Array<{
    word: string;
    accuracy: number;
    error_type?: 'mispronunciation' | 'omission' | 'insertion';
  }>;
}

// AI 코칭 결과 — 그룹 토론 자료 형식
//
// 핵심 설계: 멤버들이 답변을 한 번 듣고 피드백 주기 어려우니, AI가 transcript
// 기반으로 토론 거리를 미리 분석. 개인 코칭이 아닌 모두가 함께 보는 분석 자료.
//
// 구조:
//   - summary       : 한 줄 요약 (빠른 파악)
//   - flow          : 답변 흐름 (도입/본론/결론 구조)
//   - good_expressions  : 인상 깊은 표현 (배울 점)
//   - refine_expressions: 함께 다듬어볼 표현 (문법/어휘 + 제안)
//   - pronunciation_patterns: 발음 큰 패턴 (옵션 — 자주 하는 오류)
//   - discussion_hooks  : 함께 생각해볼 포인트 (콘텐츠 토론 hooks)
//   - next_speaker_tip  : 다음 발화자 take-away (가져갈 것 + 보강할 것)
export interface FeedbackResult {
  summary: string;
  flow: {
    intro: string | null;
    body: string | null;
    conclusion: string | null;
  };
  good_expressions: Array<{
    quote: string;        // 원문 인용
    note: string;         // 왜 좋은지
  }>;
  refine_expressions: Array<{
    quote: string;        // 원문 인용
    issue: string;        // 관찰 (시제/한국식/문법 등)
    suggestion: string;   // 자연스러운 표현 제안
  }>;
  pronunciation_patterns?: string[];
  discussion_hooks: string[];
  next_speaker_tip: {
    take: string;         // 가져갈 좋은 점
    enhance: string;      // 본인 답변에 보강할 것
  };

  // 메타
  target_grade: string;
  generated_at: string;
}

// AI 가이드 — 질문별 풀 한글 가이드 (둘러보기 + Step5 공유)
//
// v2 → v3: 단순 approach 텍스트만 → 풀 가이드 (흐름 + 포인트 + 권장 길이)
//   - approach: 본문 (한 단락)
//   - answer_flow: 단계별 흐름 (array)
//   - key_points: 놓치면 안 되는 포인트 (array)
//   - recommended_word_min/max: 권장 길이
//
// 토픽 맥락 입혀 콤보별로 1회만 생성 + 영구 캐시 (combo_guide_cache).
export interface ApproachItem {
  question_index: number;                  // 1, 2, 3 (콤보 질문 수만큼, 1-based)
  type_label: string;                      // 한글 유형 라벨 ('묘사', '비교', '특별 경험' 등)
  approach: string;                        // 본문 — "이 질문은 ~ 유형이에요. ..." (1 단락)
  answer_flow: string[];                   // 흐름 (3~5개)
  key_points: string[];                    // 놓치면 안 되는 포인트 (2~4개)
  recommended_word_min: number;            // 권장 최소 단어
  recommended_word_max: number;            // 권장 최대 단어
}

// ============================================================
// 기출 둘러보기 (Exam Library) — 승인된 기출 시험을 페이지로 둘러보기
// ============================================================

export interface ExamLibraryQuestion {
  question_number: number;             // 1~14 (자기소개 1, 일반 콤보 2~10, 롤플레이 11~13, 어드밴스 12-14)
  question_id: string | null;          // null이면 custom 질문 (drilldown 불가)
  question_english: string;            // 영어 원문 (custom_question_text 또는 questions.question_english)
  question_korean: string | null;
  question_short: string | null;
  question_type_eng: string | null;    // 'description' / 'routine' / ...
  audio_url: string | null;            // 음성 재생용
}

export interface ExamLibraryCombo {
  combo_type: string;                  // 'self_intro' / 'general 1' / 'roleplay' / 'advance' 등 (DB 원본)
  category: 'self_intro' | 'general' | 'roleplay' | 'advance';
  category_label: string;              // '자기소개' / '일반콤보 1' / '롤플레이' / '어드밴스'
  topic: string;                       // 토픽명 (자기소개는 빈 문자열 가능)
  sig: string | null;                  // 콤보 시그니처 (자기소개는 null — 콤보 둘러보기 X)
  questions: ExamLibraryQuestion[];
}

export interface ExamLibraryItem {
  submission_id: number;
  exam_date: string;                   // 응시일자
  achieved_level: string | null;       // 응시자가 받은 등급
  is_my_submission: boolean;           // 본인 후기 여부 (👤 표시용)
  user_display_name: string | null;    // 응시자 표시명 (익명/표시명)
  combos: ExamLibraryCombo[];          // 자기소개 + 일반3 + 롤플레이 + 어드밴스
}

export interface ExamLibraryPage {
  exam: ExamLibraryItem | null;
  page: number;                        // 1-based
  total: number;                       // 승인된 기출 전체 개수
}

// 콤보 단위 가이드 캐시 (combo_guide_cache 테이블)
export interface ComboGuideCache {
  sig: string;                             // 콤보 시그니처 (PK)
  topic: string;
  category: string;
  intro_text: string;                      // AI 코치 한 줄 인사
  approaches: ApproachItem[];              // 풀 가이드 array
  generated_at: string;
  prompt_version: number;
}

// AI 가이드 결과 (Step 5) — 등급 비특정 공통, 한글 전용
export interface GuideResult {
  intro_text: string;                      // AI 코치 한 줄 인사 (40~60자)
  approaches: ApproachItem[];              // 질문별 가이드 (콤보 질문 수에 정확히 맞춤)
}

// 질문 유형별 가이드 마스터 (question_type_guides 테이블)
export interface QuestionTypeGuide {
  type_id: string;                         // 'description', 'routine', 'comparison' 등
  type_label_kor: string;                  // 정식 한글 라벨
  type_short_kor: string;                  // 카드 헤더용 짧은 라벨
  essence_kor: string;                     // 본질 1-2문장
  answer_flow: string[];                   // 단계별 답변 흐름
  key_points: string[];                    // 핵심 포인트
  recommended_word_min: number;
  recommended_word_max: number;
  prompt_reference: string;                // AI 프롬프트 주입용 종합 가이드
  is_active: boolean;
  display_order: number;
}

// ============================================================
// AI 호출 입력 타입
// ============================================================

// 가이드 생성 EF 입력 (`opic-study-guide`)
// EF는 session_id로부터 모든 정보를 직접 조회하므로 페이로드는 단순.
export interface GuideInput {
  session_id: string;
  triggered_by: string;                    // user_id (사용량 로깅용)
}

// F/B 생성 EF 입력 (`opic-study-feedback`)
// EF는 session_id + question_idx로부터 가이드(approaches)를 직접 조회.
export interface FeedbackInput {
  session_id: string;
  user_id: string;
  question_id: string;
  question_idx: number;
  audio_url: string;
}

// EF 호출 페이로드 (SA → EF)
export interface SubmitFeedbackPayload {
  session_id: string;
  user_id: string;
  question_idx: number;
  question_id: string;
  audio_url: string;
}

// ============================================================
// 비즈니스/조합 타입 (UI/SA 응답)
// ============================================================

// 진입 페이지: 그룹 + 통계
export interface StudyGroupWithStats extends StudyGroup {
  member_count: number;
  active_session_count: number;
  completed_session_count: number;
}

// 멤버 + 프로필 정보
export interface GroupMemberWithProfile extends StudyGroupMember {
  email: string | null;
  user_display_name: string | null;        // profiles.display_name
}

// 진입 페이지 — 활성 세션 (있을 때만)
export interface ActiveSessionLite {
  id: string;
  step: SessionStep;
  current_speaker_user_id: string | null;
  current_speaker_name: string | null;
  selected_topic: string | null;
  selected_category: StudyCategory | null;
  started_at: string;
}

// 세션 이력 카드 (그룹 상세 + 세션 이력 페이지)
export interface SessionHistoryItem {
  id: string;
  selected_category: StudyCategory | null;
  selected_topic: string | null;
  selected_combo_sig: string | null;
  selected_question_ids?: string[];
  ended_at: string | null;
  started_at: string;
  status: StudySessionStatus;
  /** 그룹 전체 멤버 수 */
  member_count: number;
  /** 실제 음성 답변 수(audio_url 있음) */
  total_answers: number;
  /** 패스 수(audio_url null) */
  total_skips: number;
  /** 선택된 콤보 문항 수 */
  total_questions: number;
  /** 답변 또는 패스 기록이 있는 실제 참여 멤버 수 */
  participant_count: number;
  /** 세션 참여 멤버별 첫 번째 강점/개선 한 줄 (피드백 있을 때만) */
  member_highlights?: Array<{
    user_id: string;
    name: string;
    initial: string;
    color: "a" | "b" | "c" | "d";
    strength: string | null;
    improvement: string | null;
  }>;
}

export interface SessionHistoryDetail {
  id: string;
  group_id: string;
  group_name: string;
  selected_category: StudyCategory | null;
  selected_topic: string | null;
  started_at: string;
  ended_at: string | null;
  status: StudySessionStatus;
  online_mode: boolean;
  stats: {
    group_member_count: number;
    participant_count: number;
    total_questions: number;
    answer_count: number;
    skip_count: number;
    coach_note_count: number;
  };
  questions: Array<{
    number: number;
    question_id: string | null;
    label: string;
    question_english: string | null;
    question_type_kor: string | null;
    answer_count: number;
    skip_count: number;
    coach_note_count: number;
    status: "completed" | "skipped" | "mixed" | "waiting";
  }>;
  members: Array<{
    user_id: string;
    name: string;
    initial: string;
    color: "a" | "b" | "c" | "d";
    answered_count: number;
    skipped_count: number;
    coach_note_count: number;
  }>;
}

export interface MyStudySummary {
  stats: {
    participated_sessions: number;
    answer_count: number;
    skip_count: number;
    coach_note_count: number;
    last_date_label: string;
    active_session_id: string | null;
  };
  topic_stats: Array<{
    topic: string;
    session_count: number;
    answer_count: number;
    skip_count: number;
    last_date_label: string;
  }>;
  recent_sessions: Array<{
    id: string;
    date_label: string;
    topic: string;
    category: StudyCategory | null;
    total_questions: number;
    answer_count: number;
    skip_count: number;
    coach_note_count: number;
  }>;
  coach_notes: {
    strengths: string[];
    improvements: string[];
    next_focus: string | null;
    recent: Array<{
      session_id: string;
      date_label: string;
      topic: string;
      summary: string;
      take: string | null;
      enhance: string | null;
    }>;
  };
}

// Step 2: 카테고리별 통계
export interface CategoryStat {
  category: StudyCategory;
  topic_count: number;
  combo_count: number;
}

// Step 3: 토픽 + 학습 이력
export interface TopicForStudy {
  topic: string;
  category: StudyCategory;
  combo_count: number;                     // 고유 콤보 종류 수 (화면 표시용 — "콤보 X개")
  submission_count: number;                // 실제 출제 횟수 (submission_combos row 수) — 정렬 주 지표
  studied_count: number;                   // 그룹에서 이 토픽 학습한 세션 수
  type_diversity?: number;                 // (선택) 질문 타입 다양도
}

// 콤보 리스트 응답 — 헤더 메타 + 카드 array
export interface CombosForStudyResponse {
  combos: ComboForStudy[];
  topic_category_count: number;            // 헤더 분자: 이 토픽·카테고리에서 출제된 시험 수 (= total_in_category)
  total_submissions: number;                // 헤더 분모: 전체 승인 시험 수
}

// Step 4: 콤보 + 빈도 + 학습 이력
export interface ComboForStudy {
  // 콤보 식별
  sig: string;                             // 정렬된 시그니처 (그루핑용)
  representative_qids: string[];           // 출제 순서 보존 (대표)

  // 빈도 — 카드 단위 점유율 (카테고리 분모) + 헤더 메타 (전체 시험 수)
  frequency: number;                       // 이 콤보가 출제된 시험 수 (카테고리 한정)
  total_in_category?: number;              // 카드 분모: 같은 토픽·카테고리 시험 수
  total_submissions?: number;              // 헤더 분모: 전체 승인 시험 수
  appearance_pct: number;                  // 카드 점유율 (frequency / total_in_category)

  // 콤보 안 질문들
  questions: Array<{
    id: string;
    question_type: string;                 // 'description' | 'comparison' | ...
    question_english: string;              // 영어 원문 (메인 표시)
    question_korean: string | null;        // 한글 풀번역 (긴 텍스트)
    question_short: string | null;         // 한글 짧은 요약 (보조 표시)
    question_type_kor: string | null;      // 한글 유형 라벨 (DB SSOT — '묘사', '비교', '경험_최근' 등)
    audio_url: string | null;              // 영어 음성 URL (둘러보기 음성 듣기용)
    appearance_pct: number;                // 토픽 내 이 질문 등장률 %
    studied_by_user: boolean;              // 사용자가 이미 답변한 적 있는 질문
  }>;

  // 학습 이력
  studied_in_group: boolean;               // 그룹에서 이 콤보 학습한 적 있음

  // 시험 메타 (예시 출제 정보)
  examples?: Array<{
    submission_id: number;
    exam_date: string;
    achieved_level: OpicLevel | null;
  }>;
}

// 결과 비교 (Step 6-6, Step 7) — 멤버별 답변 + F/B 모음
export interface MemberAnswerSummary {
  user_id: string;
  display_name: string;
  question_idx: number;
  question_id: string;
  transcript: string | null;
  feedback_result: FeedbackResult | null;
  has_pronunciation: boolean;              // 발음 데이터 있는지 (UI에는 점수 안 보여줌)
}

// ============================================================
// 관리자 페이지 타입
// ============================================================

// 그룹 상세 응답 (관리자)
export interface AdminGroupDetail {
  group: StudyGroup;
  members: GroupMemberWithProfile[];
  sessions: SessionHistoryItem[];
  stats: AdminGroupStats;
}

// 그룹 통계 (관리자 대시보드)
export interface AdminGroupStats {
  member_count: number;
  active_session_count: number;
  completed_session_count: number;
  total_answers: number;
  ai_cost_usd_cents: number;               // api_usage_logs 집계
}

// 신규 그룹 생성 입력 (그룹 등급 X — 멤버 개인의 target_grade 사용)
export interface CreateStudyGroupInput {
  name: string;
  start_date: string;
  end_date: string;
  description?: string;
  schedule: GroupSchedule;
  member_user_ids: string[];
}

// 회원 풀 검색 결과
export interface ProfileLite {
  user_id: string;
  email: string;
  display_name: string | null;
}

// ============================================================
// 유틸 타입
// ============================================================

export type ActionResult<T = null> = {
  data?: T;
  error?: string;
};

// 동시성 처리 결과 (first-write-wins)
export type ConcurrencyResult = {
  success: boolean;
  reason?: 'already_taken' | 'wrong_step' | 'not_authorized';
};
