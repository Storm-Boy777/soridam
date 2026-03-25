/**
 * v2 문항별 평가 — 실제 세션 mt_8099015f 기반
 * GPT-4.1로 IH 목표 등급 기준 재평가 결과
 */

import evalResult from "./eval-result.json";
import type { FulfillmentStatus } from "./mock-exam-result";

// v2 weak_point 구조
export interface WeakPointV2 {
  code: string;          // "WP_S03" (36개 코드 사전의 코드)
  severity: "severe" | "moderate" | "mild";
  reason: string;
  evidence: string;
}

export interface QuestionEvalV2Real {
  question_number: number;
  question_title: string;
  question_type: string;
  target_grade: string;
  topic: string;
  category: string;
  fulfillment: FulfillmentStatus;
  task_checklist: Array<{ item: string; pass: boolean; evidence?: string }>;
  observation: string;
  directions: string[];
  weak_points: WeakPointV2[];  // v2: 구조화된 약점 코드
  // recommended_drills: v2에서 제거 — 드릴 매칭은 튜터링 v2 책임
  audio_url: string;
  transcript: string;
  speech_meta: {
    duration_sec: number;
    wpm: number;
    word_count: number;
    accuracy_score: number | null;
    fluency_score: number | null;
    prosody_score: number | null;
    pause_count_3s_plus: number;  // v2 추가: 3초 이상 침묵 횟수
  };
}

// JSON import를 타입 캐스팅
const data = evalResult as {
  session_id: string;
  session_grade: string;
  target_grade: string;
  evaluated_at: string;
  evaluations: QuestionEvalV2Real[];
};

export const REAL_QUESTIONS_DATA = {
  session_id: data.session_id,
  session_grade: data.session_grade,
  target_grade: data.target_grade,
  evaluated_at: data.evaluated_at,
  evaluations: data.evaluations,
};
