"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CalendarDays, BookOpen, MessageCircle } from "lucide-react";
import { step1Schema, type Step1Input } from "@/lib/validations/reviews";
import { createDraft } from "@/lib/actions/reviews";
import {
  PRE_EXAM_LEVELS,
  PRE_EXAM_LEVEL_LABELS,
  ACHIEVED_LEVEL_OPTIONS,
  ACHIEVED_LEVEL_OPTION_LABELS,
  EXAM_PURPOSES,
  EXAM_PURPOSE_LABELS,
  STUDY_METHODS,
  STUDY_METHOD_LABELS,
  PREP_DURATIONS,
  PREP_DURATION_LABELS,
  ATTEMPT_COUNTS,
  ATTEMPT_COUNT_LABELS,
  PERCEIVED_DIFFICULTIES,
  PERCEIVED_DIFFICULTY_LABELS,
  TIME_SUFFICIENCIES,
  TIME_SUFFICIENCY_LABELS,
  ACTUAL_DURATIONS,
  ACTUAL_DURATION_LABELS,
  type StudyMethod,
} from "@/lib/types/reviews";

interface WizardStep1Props {
  onComplete: (submissionId: number) => void;
}

export function WizardStep1({ onComplete }: WizardStep1Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Step1Input>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      exam_date: "",
      pre_exam_level: undefined,
      achieved_level: undefined,
      exam_purpose: undefined,
      study_methods: [],
      prep_duration: undefined,
      attempt_count: undefined,
      perceived_difficulty: undefined,
      time_sufficiency: undefined,
      actual_duration: undefined,
    },
  });

  const onSubmit = async (data: Step1Input) => {
    setSubmitting(true);
    setError(null);

    const result = await createDraft(data);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.data) {
      onComplete(result.data.id);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* ── 섹션 1: 시험 기본 정보 ── */}
      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50">
            <CalendarDays size={18} className="text-primary-500" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              시험 기본 정보
            </h4>
            <p className="text-xs text-foreground-muted">
              응시한 시험의 날짜와 등급을 입력해 주세요
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-5">
          {/* 시험 날짜 */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground">
              시험 날짜 <span className="text-accent-500">*</span>
            </label>
            <input
              type="date"
              {...register("exam_date")}
              className="h-11 w-full rounded-xl border border-border bg-surface-secondary/40 px-3.5 text-sm text-foreground transition-colors focus:border-primary-400 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-100 sm:w-56"
            />
            {errors.exam_date && (
              <p className="mt-1 text-xs text-accent-500">
                {errors.exam_date.message}
              </p>
            )}
          </div>

          {/* 등급 2열 */}
          <div className="grid gap-5 sm:grid-cols-2">
            {/* 응시 전 등급 */}
            <PillField
              label="응시 전 등급"
              required
              note="시험 응시 당시 보유 등급"
              error={errors.pre_exam_level?.message}
            >
              {PRE_EXAM_LEVELS.map((level) => (
                <PillRadio
                  key={level}
                  name="pre_exam_level"
                  value={level}
                  label={PRE_EXAM_LEVEL_LABELS[level]}
                  register={register}
                />
              ))}
            </PillField>

            {/* 취득 등급 */}
            <PillField
              label="취득 등급"
              required
              note="성적 미발표 시 '아직 모름' 선택"
              error={errors.achieved_level?.message}
            >
              {ACHIEVED_LEVEL_OPTIONS.map((level) => (
                <PillRadio
                  key={level}
                  name="achieved_level"
                  value={level}
                  label={ACHIEVED_LEVEL_OPTION_LABELS[level]}
                  register={register}
                />
              ))}
            </PillField>
          </div>
        </div>
      </section>

      {/* ── 섹션 2: 시험 배경 ── */}
      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary-50">
            <BookOpen size={18} className="text-secondary-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              시험 배경
            </h4>
            <p className="text-xs text-foreground-muted">
              어떻게 준비하셨는지 알려주세요
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {/* 시험 목적 */}
          <PillField
            label="시험 목적"
            required
            error={errors.exam_purpose?.message}
          >
            {EXAM_PURPOSES.map((purpose) => (
              <PillRadio
                key={purpose}
                name="exam_purpose"
                value={purpose}
                label={EXAM_PURPOSE_LABELS[purpose]}
                register={register}
              />
            ))}
          </PillField>

          {/* 공부 방법 (복수선택) */}
          <PillField
            label="공부 방법"
            required
            note="복수선택 가능"
            error={errors.study_methods?.message}
          >
            <Controller
              name="study_methods"
              control={control}
              render={({ field }) => (
                <>
                  {STUDY_METHODS.map((method) => {
                    const checked = field.value?.includes(method);
                    return (
                      <label key={method} className="cursor-pointer">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={checked}
                          onChange={() => {
                            const next = checked
                              ? field.value.filter(
                                  (v: StudyMethod) => v !== method
                                )
                              : [...(field.value || []), method];
                            field.onChange(next);
                          }}
                        />
                        <span className="inline-flex h-8 items-center rounded-full border border-border bg-surface px-3 text-xs font-medium text-foreground-secondary transition-all hover:border-border-hover hover:bg-surface-hover peer-checked:border-primary-400 peer-checked:bg-primary-50 peer-checked:text-primary-700">
                          {STUDY_METHOD_LABELS[method]}
                        </span>
                      </label>
                    );
                  })}
                </>
              )}
            />
          </PillField>

          {/* 준비 기간 */}
          <PillField
            label="준비 기간"
            required
            error={errors.prep_duration?.message}
          >
            {PREP_DURATIONS.map((dur) => (
              <PillRadio
                key={dur}
                name="prep_duration"
                value={dur}
                label={PREP_DURATION_LABELS[dur]}
                register={register}
              />
            ))}
          </PillField>

          {/* 응시 횟수 */}
          <PillField
            label="응시 횟수"
            required
            error={errors.attempt_count?.message}
          >
            {ATTEMPT_COUNTS.map((count) => (
              <PillRadio
                key={count}
                name="attempt_count"
                value={count}
                label={ATTEMPT_COUNT_LABELS[count]}
                register={register}
              />
            ))}
          </PillField>
        </div>
      </section>

      {/* ── 섹션 3: 체감 후기 ── */}
      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-50">
            <MessageCircle size={18} className="text-accent-500" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              체감 후기
            </h4>
            <p className="text-xs text-foreground-muted">
              시험장에서 느낀 점을 선택해 주세요
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {/* 체감 난이도 */}
          <PillField
            label="체감 난이도"
            required
            error={errors.perceived_difficulty?.message}
          >
            {PERCEIVED_DIFFICULTIES.map((diff) => (
              <PillRadio
                key={diff}
                name="perceived_difficulty"
                value={diff}
                label={PERCEIVED_DIFFICULTY_LABELS[diff]}
                register={register}
              />
            ))}
          </PillField>

          {/* 시간 여유 */}
          <PillField
            label="시간 여유"
            required
            error={errors.time_sufficiency?.message}
          >
            {TIME_SUFFICIENCIES.map((ts) => (
              <PillRadio
                key={ts}
                name="time_sufficiency"
                value={ts}
                label={TIME_SUFFICIENCY_LABELS[ts]}
                register={register}
              />
            ))}
          </PillField>

          {/* 실제 소요 시간 */}
          <PillField
            label="실제 소요 시간"
            required
            error={errors.actual_duration?.message}
          >
            {ACTUAL_DURATIONS.map((dur) => (
              <PillRadio
                key={dur}
                name="actual_duration"
                value={dur}
                label={ACTUAL_DURATION_LABELS[dur]}
                register={register}
              />
            ))}
          </PillField>
        </div>
      </section>

      {/* 에러 */}
      {error && (
        <div className="rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-600">
          {error}
        </div>
      )}

      {/* 제출 버튼 */}
      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 py-3.5 text-[15px] font-semibold text-white shadow-[var(--shadow-primary)] transition-all hover:bg-primary-600 active:scale-[0.98] disabled:opacity-50"
      >
        {submitting && <Loader2 size={18} className="animate-spin" />}
        다음 단계로
      </button>
    </form>
  );
}

/* ── 내부 컴포넌트 ── */

/** Pill 선택 필드 래퍼 */
function PillField({
  label,
  required,
  note,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  note?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[13px] font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-accent-500">*</span>}
        {note && (
          <span className="ml-1.5 text-[11px] font-normal text-foreground-muted">
            ({note})
          </span>
        )}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
      {error && <p className="mt-1.5 text-xs text-accent-500">{error}</p>}
    </fieldset>
  );
}

/** 단일 선택 Pill (라디오) */
function PillRadio({
  name,
  value,
  label,
  register,
}: {
  name: string;
  value: string;
  label: string;
  register: ReturnType<typeof useForm<Step1Input>>["register"];
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="radio"
        value={value}
        {...register(name as keyof Step1Input)}
        className="peer sr-only"
      />
      <span className="inline-flex h-8 items-center rounded-full border border-border bg-surface px-3 text-xs font-medium text-foreground-secondary transition-all hover:border-border-hover hover:bg-surface-hover peer-checked:border-primary-400 peer-checked:bg-primary-50 peer-checked:text-primary-700">
        {label}
      </span>
    </label>
  );
}
