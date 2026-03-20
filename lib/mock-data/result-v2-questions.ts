/**
 * v2 문항별 평가 — 실제 세션 mt_8099015f 기반
 * GPT-4.1로 IH 목표 등급 기준 재평가 결과
 */

import evalResult from "../../scripts/eval-v2-result.json";
import type { FulfillmentStatus } from "./result-v2";

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
  weak_points: string[];
  recommended_drills: string[];
  audio_url: string;
  transcript: string;
  speech_meta: {
    duration_sec: number;
    wpm: number;
    word_count: number;
    accuracy_score: number | null;
    fluency_score: number | null;
    prosody_score: number | null;
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
