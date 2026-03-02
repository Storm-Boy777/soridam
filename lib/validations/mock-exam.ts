import { z } from "zod";
import { MOCK_EXAM_MODES } from "@/lib/types/mock-exam";

// ── 기출 풀 조회 (getExamPool) ──
// 파라미터 없음 (서버에서 user_id + 사용 이력으로 필터링)

// ── 세션 생성 (createSession) ──

export const createSessionSchema = z.object({
  submission_id: z.number().int().positive("유효한 기출 ID가 필요합니다"),
  mode: z.enum(MOCK_EXAM_MODES, { message: "모드를 선택해주세요" }),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

// ── 답변 제출 (submitAnswer) ──
// Client → Storage 직통 업로드 후, audioUrl + 메타데이터만 SA로 전달

export const submitAnswerSchema = z.object({
  session_id: z.string().min(1, "세션 ID가 필요합니다"),
  question_number: z.number().int().min(1).max(15, "문항 번호는 1~15입니다"),
  question_id: z.string().nullable(), // Q1은 null
  audio_url: z.string().url("유효한 오디오 URL이 필요합니다"),
  audio_duration: z.number().min(0, "녹음 시간이 필요합니다"),
});

export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;

// ── 문항 건너뛰기 (skipQuestion) ──

export const skipQuestionSchema = z.object({
  session_id: z.string().min(1, "세션 ID가 필요합니다"),
  question_number: z.number().int().min(2).max(15, "문항 번호는 2~15입니다"),
  question_id: z.string().nullable(),
});

export type SkipQuestionInput = z.infer<typeof skipQuestionSchema>;

// ── 세션 조회 (getSession) ──

export const getSessionSchema = z.object({
  session_id: z.string().min(1, "세션 ID가 필요합니다"),
});

export type GetSessionInput = z.infer<typeof getSessionSchema>;

// ── 세션 만료 처리 (expireSession) ──

export const expireSessionSchema = z.object({
  session_id: z.string().min(1, "세션 ID가 필요합니다"),
});

export type ExpireSessionInput = z.infer<typeof expireSessionSchema>;

// ── 세션 완료 처리 (completeSession — 실전 모드 중간 종료 또는 Q15 완료) ──

export const completeSessionSchema = z.object({
  session_id: z.string().min(1, "세션 ID가 필요합니다"),
});

export type CompleteSessionInput = z.infer<typeof completeSessionSchema>;

// ── 이력 조회 (getHistory) ──
// 파라미터 없음 (서버에서 user_id로 필터링)
