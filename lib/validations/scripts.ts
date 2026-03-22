import { z } from "zod";
import {
  SCRIPT_SOURCES,
  TARGET_LEVELS,
  TTS_VOICES,
} from "@/lib/types/scripts";

// ── 스크립트 생성 입력 ──

export const generateScriptSchema = z.object({
  question_id: z.string().min(1, "질문을 선택해주세요"),
  topic: z.string().min(1, "주제를 선택해주세요"),
  category: z.string().min(1, "카테고리가 필요합니다"),
  question_english: z.string().min(1, "영어 질문이 필요합니다"),
  question_korean: z.string().min(1, "한국어 질문이 필요합니다"),
  question_type: z.string().min(1, "답변 유형이 필요합니다"),
  target_grade: z.enum(TARGET_LEVELS, { message: "목표 등급을 선택해주세요" }),
  user_story: z
    .string()
    .max(2000, "스토리는 2000자 이내로 입력해주세요")
    .optional()
    .or(z.literal("")),
});

export type GenerateScriptInput = z.infer<typeof generateScriptSchema>;

// ── 스크립트 교정 입력 ──

export const correctScriptSchema = z.object({
  question_id: z.string().min(1, "질문을 선택해주세요"),
  topic: z.string().min(1, "주제를 선택해주세요"),
  category: z.string().min(1, "카테고리가 필요합니다"),
  question_english: z.string().min(1, "영어 질문이 필요합니다"),
  question_korean: z.string().min(1, "한국어 질문이 필요합니다"),
  question_type: z.string().min(1, "답변 유형이 필요합니다"),
  target_grade: z.enum(TARGET_LEVELS, { message: "목표 등급을 선택해주세요" }),
  user_original_answer: z
    .string()
    .min(10, "영어 답변을 10자 이상 입력해주세요")
    .max(5000, "답변은 5000자 이내로 입력해주세요"),
});

export type CorrectScriptInput = z.infer<typeof correctScriptSchema>;

// ── 스크립트 수정 요청 ──

export const refineScriptSchema = z.object({
  script_id: z.string().uuid("유효한 스크립트 ID가 필요합니다"),
  user_prompt: z
    .string()
    .max(500, "수정 요청은 500자 이내로 입력해주세요")
    .optional()
    .or(z.literal("")),
});

export type RefineScriptInput = z.infer<typeof refineScriptSchema>;

// ── 스크립트 확정 ──

export const confirmScriptSchema = z.object({
  script_id: z.string().uuid("유효한 스크립트 ID가 필요합니다"),
});

export type ConfirmScriptInput = z.infer<typeof confirmScriptSchema>;

// ── 패키지 생성 요청 ──

export const createPackageSchema = z.object({
  script_id: z.string().uuid("유효한 스크립트 ID가 필요합니다"),
  tts_voice: z.enum(TTS_VOICES).optional().default('Zephyr'),
});

export type CreatePackageInput = z.infer<typeof createPackageSchema>;

// ── 쉐도잉 세션 시작 ──

export const startShadowingSchema = z.object({
  package_id: z.string().uuid("유효한 패키지 ID가 필요합니다"),
  script_id: z.string().uuid("유효한 스크립트 ID가 필요합니다"),
});

export type StartShadowingInput = z.infer<typeof startShadowingSchema>;

// ── 쉐도잉 평가 요청 (Step 5: 실전 말하기) ──

export const submitShadowingSchema = z.object({
  session_id: z.string().uuid("유효한 세션 ID가 필요합니다"),
  audio_file_path: z.string().min(1, "녹음 파일 경로가 필요합니다"),
  audio_duration: z.number().min(1, "녹음 시간이 필요합니다"),
});

export type SubmitShadowingInput = z.infer<typeof submitShadowingSchema>;
