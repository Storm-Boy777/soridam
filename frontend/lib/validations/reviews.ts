import { z } from "zod";
import {
  PRE_EXAM_LEVELS,
  ACHIEVED_LEVEL_OPTIONS,
  EXAM_PURPOSES,
  STUDY_METHODS,
  PREP_DURATIONS,
  ATTEMPT_COUNTS,
  PERCEIVED_DIFFICULTIES,
  TIME_SUFFICIENCIES,
  ACTUAL_DURATIONS,
  COMBO_TYPES,
} from "@/lib/types/reviews";

// ── Step 1: 시험 기본 정보 + 설문 ──

export const step1Schema = z.object({
  exam_date: z.string().min(1, "시험 날짜를 선택해주세요"),
  pre_exam_level: z.enum(PRE_EXAM_LEVELS, { message: "응시 전 등급을 선택해주세요" }),
  achieved_level: z.enum(ACHIEVED_LEVEL_OPTIONS, { message: "취득 등급을 선택해주세요" }),
  exam_purpose: z.enum(EXAM_PURPOSES, { message: "시험 목적을 선택해주세요" }),
  study_methods: z
    .array(z.enum(STUDY_METHODS))
    .min(1, "공부 방법을 1개 이상 선택해주세요"),
  prep_duration: z.enum(PREP_DURATIONS, { message: "준비 기간을 선택해주세요" }),
  attempt_count: z.enum(ATTEMPT_COUNTS, { message: "응시 횟수를 선택해주세요" }),
  perceived_difficulty: z.enum(PERCEIVED_DIFFICULTIES, { message: "체감 난이도를 선택해주세요" }),
  time_sufficiency: z.enum(TIME_SUFFICIENCIES, { message: "시간 여유를 선택해주세요" }),
  actual_duration: z.enum(ACTUAL_DURATIONS, { message: "소요 시간을 선택해주세요" }),
});

export type Step1Input = z.infer<typeof step1Schema>;

// ── Step 2: 질문 아이템 ──

export const questionItemSchema = z.object({
  question_number: z.number().min(2).max(15),
  combo_type: z.enum(COMBO_TYPES),
  topic: z.string().min(1, "주제를 선택해주세요"),
  master_question_id: z.string().nullable(),
  custom_question_text: z.string().nullable(),
  is_not_remembered: z.boolean(),
});

export const step2Schema = z.object({
  submission_id: z.number(),
  questions: z
    .array(questionItemSchema)
    .length(14, "14개 질문을 모두 입력해주세요"),
});

export type Step2Input = z.infer<typeof step2Schema>;

// ── Step 3: 자유 후기 ──

export const step3Schema = z.object({
  submission_id: z.number(),
  one_line_review: z
    .string()
    .min(1, "한줄 후기를 입력해주세요")
    .max(100, "한줄 후기는 100자 이내로 입력해주세요"),
  tips: z
    .string()
    .max(300, "팁/조언은 300자 이내로 입력해주세요")
    .optional()
    .or(z.literal("")),
});

export type Step3Input = z.infer<typeof step3Schema>;
