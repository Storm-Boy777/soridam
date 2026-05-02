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
export interface StudyGroup {
  id: string;
  name: string;
  target_level: string;                    // OpicLevel 가능 (자유 입력 허용)
  start_date: string;                      // 'YYYY-MM-DD'
  end_date: string;                        // 'YYYY-MM-DD'
  status: StudyGroupStatus;
  description: string | null;
  created_by: string;                      // user_id
  created_at: string;
  updated_at: string;
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

  // AI 가이드
  ai_guide_text: string | null;
  ai_guide_key_points: string[] | null;    // 정확히 3개 (가이드 생성 시)
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

// AI 코칭 결과 (UI에 노출되는 자연어 멘트)
export interface FeedbackResult {
  // 메인 코칭 멘트 (1~2문단, 일타강사 톤)
  feedback_text: string;

  // 강점 (1~3개)
  strengths: string[];

  // 다듬을 부분 (1~2개)
  improvements: string[];

  // 다음 답변 팁 (1~2개)
  tips: string[];

  // 메타
  target_level: string;
  generated_at: string;
}

// AI 가이드 결과 (Step 5)
export interface GuideResult {
  guide_text: string;                      // 메인 멘트 (3~4문단)
  key_points: string[];                    // 정확히 3개
}

// ============================================================
// AI 호출 입력 타입
// ============================================================

// 가이드 생성 EF 입력 (`tutor-guide` 또는 `opic-study-guide`)
export interface GuideInput {
  group_target_level: string;
  category: StudyCategory;
  topic: string;
  combo: {
    questions: Array<{
      id: string;
      question_type: string;
      question_english: string;
    }>;
    appearance_count: number;              // 출제 횟수
    appearance_pct: number;                // 토픽 내 비율
    question_appearance: Record<string, number>; // 질문ID별 등장률 %
  };
}

// F/B 생성 EF 입력 (`opic-study-feedback`)
export interface FeedbackInput {
  // 세션 컨텍스트
  group_target_level: string;
  category: StudyCategory;
  topic: string;
  ai_guide_key_points: string[];           // 가이드 일관성

  // 질문 컨텍스트
  question: {
    id: string;
    question_type: string;
    question_english: string;
  };
  question_idx: number;

  // 답변 데이터
  answerer_name: string;
  transcript: string;
  pronunciation: PronunciationScore;
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
  ended_at: string | null;
  started_at: string;
  status: StudySessionStatus;
  member_count: number;
  total_answers: number;
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
  combo_count: number;                     // 토픽 내 콤보 수 (출제된 시험후기 기준)
  studied_count: number;                   // 그룹에서 이 토픽 학습한 세션 수
  type_diversity?: number;                 // (선택) 질문 타입 다양도
}

// Step 4: 콤보 + 빈도 + 학습 이력
export interface ComboForStudy {
  // 콤보 식별
  sig: string;                             // 정렬된 시그니처 (그루핑용)
  representative_qids: string[];           // 출제 순서 보존 (대표)

  // 빈도
  frequency: number;                       // 이 콤보 출제 횟수
  appearance_pct: number;                  // 토픽 내 비율 (frequency / total)

  // 콤보 안 질문들
  questions: Array<{
    id: string;
    question_type: string;                 // 'description' | 'comparison' | ...
    question_english: string;
    question_korean: string | null;
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

// 신규 그룹 생성 입력
export interface CreateStudyGroupInput {
  name: string;
  target_level: string;
  start_date: string;
  end_date: string;
  description?: string;
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
