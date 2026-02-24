"use client";

import { useState, useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  CalendarDays,
  BookOpen,
  MessageCircle,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import { step1Schema, type Step1Input } from "@/lib/validations/reviews";
import { createDraft, getDraft, updateDraft } from "@/lib/actions/reviews";
import type { ExamDifficulty } from "@/lib/types/reviews";
import {
  PRE_EXAM_LEVELS,
  PRE_EXAM_LEVEL_LABELS,
  ACHIEVED_LEVELS,
  ACHIEVED_LEVEL_LABELS,
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
  ACTUAL_DURATIONS,
  ACTUAL_DURATION_LABELS,
  SURVEY_CATEGORIES,
  RECOMMENDED_SURVEY,
  type StudyMethod,
} from "@/lib/types/reviews";

interface WizardStep1Props {
  onComplete: (submissionId: number) => void;
  submissionId?: number | null;
}

// 재조정 옵션 계산 — 시작 난이도 기준 ±1 범위의 실제 난이도 표시
function getAdjustmentOptions(start: number) {
  const options: { value: number; label: string }[] = [];
  if (start < 6) options.push({ value: start + 1, label: `난이도 ${start + 1}` });
  options.push({ value: start, label: `난이도 ${start}` });
  if (start > 1) options.push({ value: start - 1, label: `난이도 ${start - 1}` });
  return options;
}

export function WizardStep1({ onComplete, submissionId }: WizardStep1Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diffStart, setDiffStart] = useState<number | null>(null);
  const [diffAdj, setDiffAdj] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<Step1Input>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      exam_date: "",
      exam_difficulty: undefined,
      pre_exam_level: undefined,
      achieved_level: undefined,
      exam_purpose: undefined,
      study_methods: [],
      prep_duration: undefined,
      attempt_count: undefined,
      perceived_difficulty: undefined,
      actual_duration: undefined,
      used_recommended_survey: undefined as unknown as boolean,
      survey_occupation: null,
      survey_student: null,
      survey_course: null,
      survey_housing: null,
      survey_leisure: [],
      survey_hobbies: [],
      survey_sports: [],
      survey_travel: [],
    },
  });

  // 기존 draft 로드 (뒤로가기 시 데이터 복원)
  const { data: draftData, isLoading: loadingDraft } = useQuery({
    queryKey: ["draft", submissionId],
    queryFn: async () => {
      if (!submissionId) return null;
      const result = await getDraft(submissionId);
      return result.data || null;
    },
    enabled: !!submissionId,
    staleTime: Infinity,
  });

  // draft 데이터 로드 시 폼 채우기
  useEffect(() => {
    if (!draftData) return;

    // Self-Assessment 파싱 ("6-5" → diffStart=6, diffAdj=5)
    if (draftData.exam_difficulty) {
      const parts = draftData.exam_difficulty.split("-");
      setDiffStart(Number(parts[0]));
      setDiffAdj(Number(parts[1]));
    }

    reset({
      exam_date: draftData.exam_date || "",
      exam_difficulty: draftData.exam_difficulty as ExamDifficulty,
      pre_exam_level: draftData.pre_exam_level as Step1Input["pre_exam_level"],
      achieved_level: (draftData.achieved_level || "unknown") as Step1Input["achieved_level"],
      exam_purpose: draftData.exam_purpose as Step1Input["exam_purpose"],
      study_methods: (draftData.study_methods || []) as Step1Input["study_methods"],
      prep_duration: draftData.prep_duration as Step1Input["prep_duration"],
      attempt_count: draftData.attempt_count as Step1Input["attempt_count"],
      perceived_difficulty: draftData.perceived_difficulty as Step1Input["perceived_difficulty"],
      actual_duration: draftData.actual_duration as Step1Input["actual_duration"],
      used_recommended_survey: draftData.used_recommended_survey,
      survey_occupation: draftData.survey_occupation || null,
      survey_student: draftData.survey_student || null,
      survey_course: draftData.survey_course || null,
      survey_housing: draftData.survey_housing || null,
      survey_leisure: draftData.survey_leisure ? draftData.survey_leisure.split(",") : [],
      survey_hobbies: draftData.survey_hobbies ? draftData.survey_hobbies.split(",") : [],
      survey_sports: draftData.survey_sports ? draftData.survey_sports.split(",") : [],
      survey_travel: draftData.survey_travel ? draftData.survey_travel.split(",") : [],
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftData]);

  // 서베이 관련 watch
  const usedRecommended = useWatch({ control, name: "used_recommended_survey" });
  const surveyLeisure = useWatch({ control, name: "survey_leisure" }) || [];
  const surveyHobbies = useWatch({ control, name: "survey_hobbies" }) || [];
  const surveySports = useWatch({ control, name: "survey_sports" }) || [];
  const surveyTravel = useWatch({ control, name: "survey_travel" }) || [];

  const checkboxCount =
    surveyLeisure.length + surveyHobbies.length + surveySports.length + surveyTravel.length;

  const onSubmit = async (data: Step1Input) => {
    setSubmitting(true);
    setError(null);

    // 기존 draft가 있으면 UPDATE, 없으면 새로 CREATE
    const result = submissionId
      ? await updateDraft(submissionId, data)
      : await createDraft(data);

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.data) {
      onComplete(result.data.id);
    }
  };

  // 체크박스 토글 헬퍼
  const toggleCheckbox = (
    fieldName: "survey_leisure" | "survey_hobbies" | "survey_sports" | "survey_travel",
    value: string,
    currentValues: string[]
  ) => {
    const next = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    setValue(fieldName, next, { shouldValidate: false });
  };

  // draft 로딩 중
  if (submissionId && loadingDraft) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-primary-500" />
      </div>
    );
  }

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

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {/* 시험 날짜 */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground">
              시험 날짜 <span className="text-accent-500">*</span>
            </label>
            <input
              type="date"
              {...register("exam_date")}
              className="h-11 w-full rounded-xl border border-border bg-surface-secondary/40 px-3.5 text-sm text-foreground transition-colors focus:border-primary-400 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
            {errors.exam_date && (
              <p className="mt-1 text-xs text-accent-500">
                {errors.exam_date.message}
              </p>
            )}
          </div>

          {/* 응시 난이도 — 시작 + 재조정 2단계 */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground">
              Self-Assessment <span className="text-accent-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                className="h-11 flex-1 appearance-none rounded-xl border border-border bg-surface-secondary/40 px-3.5 text-sm text-foreground transition-colors focus:border-primary-400 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-100"
                value={diffStart ?? ''}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDiffStart(val);
                  setDiffAdj(null);
                  // 재조정 초기화 시 폼 값도 클리어
                  setValue("exam_difficulty", "" as unknown as ExamDifficulty);
                }}
              >
                <option value="" disabled>시작</option>
                {[6, 5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>난이도 {n}</option>
                ))}
              </select>
              <select
                className="h-11 flex-1 appearance-none rounded-xl border border-border bg-surface-secondary/40 px-3.5 text-sm text-foreground transition-colors focus:border-primary-400 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:opacity-40"
                value={diffAdj ?? ''}
                disabled={diffStart === null}
                onChange={(e) => {
                  const adj = Number(e.target.value);
                  setDiffAdj(adj);
                  if (diffStart !== null) {
                    const result = `${diffStart}-${adj}` as ExamDifficulty;
                    setValue("exam_difficulty", result, { shouldValidate: true });
                  }
                }}
              >
                <option value="" disabled>재조정</option>
                {diffStart !== null && getAdjustmentOptions(diffStart).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {errors.exam_difficulty && (
              <p className="mt-1 text-xs text-accent-500">
                {errors.exam_difficulty.message}
              </p>
            )}
          </div>

          {/* 응시 전 등급 */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground">
              시험 전 보유 등급 <span className="text-accent-500">*</span>
            </label>
            <select
              {...register("pre_exam_level")}
              className="h-11 w-full appearance-none rounded-xl border border-border bg-surface-secondary/40 px-3.5 text-sm text-foreground transition-colors focus:border-primary-400 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-100"
              defaultValue=""
            >
              <option value="" disabled>선택해주세요</option>
              {PRE_EXAM_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {PRE_EXAM_LEVEL_LABELS[level]}
                </option>
              ))}
            </select>
            {errors.pre_exam_level && (
              <p className="mt-1 text-xs text-accent-500">
                {errors.pre_exam_level.message}
              </p>
            )}
          </div>

          {/* 취득 등급 */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground">
              취득 등급 <span className="text-accent-500">*</span>
            </label>
            <select
              {...register("achieved_level")}
              className="h-11 w-full appearance-none rounded-xl border border-border bg-surface-secondary/40 px-3.5 text-sm text-foreground transition-colors focus:border-primary-400 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-100"
              defaultValue=""
            >
              <option value="" disabled>선택해주세요</option>
              <option value="unknown">아직 모름 (발표 전)</option>
              {ACHIEVED_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {ACHIEVED_LEVEL_LABELS[level]}
                </option>
              ))}
            </select>
            {errors.achieved_level && (
              <p className="mt-1 text-xs text-accent-500">
                {errors.achieved_level.message}
              </p>
            )}
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

        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {/* 시험 목적 — 라디오 */}
          <Controller
            name="exam_purpose"
            control={control}
            render={({ field }) => (
              <div>
                <p className="mb-2 text-[13px] font-semibold text-foreground">
                  시험 목적 <span className="text-accent-500">*</span>
                </p>
                <div className="space-y-1">
                  {EXAM_PURPOSES.map((purpose) => (
                    <label
                      key={purpose}
                      onClick={() => field.onChange(purpose)}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-secondary/50"
                    >
                      <span
                        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          field.value === purpose
                            ? "border-primary-500"
                            : "border-foreground-muted/50"
                        }`}
                      >
                        {field.value === purpose && (
                          <span className="h-2.5 w-2.5 rounded-full bg-primary-500" />
                        )}
                      </span>
                      <span className="text-sm text-foreground">
                        {EXAM_PURPOSE_LABELS[purpose]}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.exam_purpose && (
                  <p className="mt-1 text-xs text-accent-500">
                    {errors.exam_purpose.message}
                  </p>
                )}
              </div>
            )}
          />

          {/* 공부 방법 — 체크박스 (복수선택) */}
          <Controller
            name="study_methods"
            control={control}
            render={({ field }) => (
              <div>
                <p className="mb-2 text-[13px] font-semibold text-foreground">
                  공부 방법 <span className="text-accent-500">*</span>
                  <span className="ml-1.5 text-[11px] font-normal text-foreground-muted">
                    (복수선택 가능)
                  </span>
                </p>
                <div className="space-y-1">
                  {STUDY_METHODS.map((method) => {
                    const checked = field.value?.includes(method);
                    return (
                      <label
                        key={method}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-secondary/50"
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                            checked
                              ? "border-primary-500 bg-primary-500"
                              : "border-foreground-muted/50 bg-surface"
                          }`}
                        >
                          {checked && (
                            <svg
                              viewBox="0 0 12 12"
                              className="h-3 w-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path d="M2 6l3 3 5-5" />
                            </svg>
                          )}
                        </span>
                        <span className="text-sm text-foreground">
                          {STUDY_METHOD_LABELS[method]}
                        </span>
                        <input
                          type="checkbox"
                          className="sr-only"
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
                      </label>
                    );
                  })}
                </div>
                {errors.study_methods && (
                  <p className="mt-1 text-xs text-accent-500">
                    {errors.study_methods.message}
                  </p>
                )}
              </div>
            )}
          />

          {/* 준비 기간 — 라디오 */}
          <Controller
            name="prep_duration"
            control={control}
            render={({ field }) => (
              <div>
                <p className="mb-2 text-[13px] font-semibold text-foreground">
                  준비 기간 <span className="text-accent-500">*</span>
                </p>
                <div className="space-y-1">
                  {PREP_DURATIONS.map((dur) => (
                    <label
                      key={dur}
                      onClick={() => field.onChange(dur)}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-secondary/50"
                    >
                      <span
                        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          field.value === dur
                            ? "border-primary-500"
                            : "border-foreground-muted/50"
                        }`}
                      >
                        {field.value === dur && (
                          <span className="h-2.5 w-2.5 rounded-full bg-primary-500" />
                        )}
                      </span>
                      <span className="text-sm text-foreground">
                        {PREP_DURATION_LABELS[dur]}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.prep_duration && (
                  <p className="mt-1 text-xs text-accent-500">
                    {errors.prep_duration.message}
                  </p>
                )}
              </div>
            )}
          />

          {/* 응시 횟수 — 라디오 */}
          <Controller
            name="attempt_count"
            control={control}
            render={({ field }) => (
              <div>
                <p className="mb-2 text-[13px] font-semibold text-foreground">
                  응시 횟수 <span className="text-accent-500">*</span>
                </p>
                <div className="space-y-1">
                  {ATTEMPT_COUNTS.map((count) => (
                    <label
                      key={count}
                      onClick={() => field.onChange(count)}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-secondary/50"
                    >
                      <span
                        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          field.value === count
                            ? "border-primary-500"
                            : "border-foreground-muted/50"
                        }`}
                      >
                        {field.value === count && (
                          <span className="h-2.5 w-2.5 rounded-full bg-primary-500" />
                        )}
                      </span>
                      <span className="text-sm text-foreground">
                        {ATTEMPT_COUNT_LABELS[count]}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.attempt_count && (
                  <p className="mt-1 text-xs text-accent-500">
                    {errors.attempt_count.message}
                  </p>
                )}
              </div>
            )}
          />
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

      {/* ── 섹션 4: 서베이 정보 ── */}
      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50">
            <ClipboardList size={18} className="text-primary-500" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              OPIc 서베이 선택 확인
            </h4>
            <p className="text-xs text-foreground-muted">
              시험 응시 시 선택한 배경설문(서베이)을 알려주세요
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-5">
          {/* 추천 서베이 안내 카드 — 2컬럼 */}
          <div className="rounded-xl border border-primary-200 bg-primary-50/60 p-4">
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-primary-600" />
              <p className="text-sm font-semibold text-primary-800">
                오픽톡닥 추천 서베이
              </p>
            </div>
            <p className="mt-1.5 text-xs text-primary-600">
              오픽톡닥의 모든 서비스는 이 서베이를 기반으로 설계되어 있어, 최소 노력으로 최대 성과를 낼 수 있습니다
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {/* 좌측: 기본 정보 (라디오 4개) */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-700/70">
                  기본 정보
                </p>
                {[
                  { label: '직업', value: RECOMMENDED_SURVEY.survey_occupation },
                  { label: '학생', value: RECOMMENDED_SURVEY.survey_student },
                  { label: '수강', value: RECOMMENDED_SURVEY.survey_course },
                  { label: '거주', value: RECOMMENDED_SURVEY.survey_housing },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-white/60 px-3 py-2">
                    <p className="text-[11px] font-medium text-foreground-muted">{item.label}</p>
                    <p className="text-[13px] text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
              {/* 우측: 배경설문 (체크박스 4카테고리) */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-700/70">
                  배경설문
                </p>
                {[
                  { label: '여가 활동', items: RECOMMENDED_SURVEY.survey_leisure },
                  { label: '취미/관심사', items: RECOMMENDED_SURVEY.survey_hobbies },
                  { label: '운동', items: RECOMMENDED_SURVEY.survey_sports },
                  { label: '휴가/출장', items: RECOMMENDED_SURVEY.survey_travel },
                ].map((cat) => (
                  <div key={cat.label} className="rounded-lg bg-white/60 px-3 py-2">
                    <p className="text-[11px] font-medium text-foreground-muted">{cat.label}</p>
                    <p className="text-[13px] text-foreground">{cat.items.join(', ')}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 추천 서베이 사용 여부 */}
          <div>
            <p className="mb-2.5 text-[13px] font-medium text-foreground">
              오픽톡닥 추천 서베이를 사용했나요? <span className="text-accent-500">*</span>
            </p>
            {errors.used_recommended_survey?.message && (
              <p className="mb-2 text-xs text-accent-500">
                {errors.used_recommended_survey.message}
              </p>
            )}
            <Controller
              name="used_recommended_survey"
              control={control}
              render={({ field }) => (
                <div className="flex gap-3">
                  {[
                    { value: true, label: "네, 추천 서베이 사용" },
                    { value: false, label: "아니요, 다른 서베이 선택" },
                  ].map((opt) => {
                    const selected = field.value === opt.value;
                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={`flex-1 rounded-xl border py-3 text-sm font-medium transition-all ${
                          selected
                            ? "border-primary-300 bg-primary-50 text-primary-700"
                            : "border-border bg-surface text-foreground-secondary hover:border-border-hover hover:bg-surface-secondary/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </div>

          {/* 커스텀 서베이 폼 */}
          {usedRecommended === false && (
            <div className="space-y-6">
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
                <p className="text-sm text-amber-700">
                  실제 시험에서 선택한 서베이 항목을 그대로 선택해주세요.
                </p>
              </div>

              {/* 라디오 필드 4개 */}
              <div className="space-y-5">
                {SURVEY_CATEGORIES.filter((c) => c.type === "radio").map(
                  (category) => (
                    <Controller
                      key={category.name}
                      name={category.name as keyof Step1Input}
                      control={control}
                      render={({ field }) => (
                        <div>
                          <p className="mb-2 text-[13px] font-semibold text-foreground">
                            {category.title} <span className="text-accent-500">*</span>
                          </p>
                          <div className="space-y-1.5">
                            {category.options.map((opt) => (
                              <label
                                key={opt}
                                onClick={() => field.onChange(opt)}
                                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-secondary/50"
                              >
                                <span
                                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                    field.value === opt
                                      ? "border-primary-500"
                                      : "border-foreground-muted/50"
                                  }`}
                                >
                                  {field.value === opt && (
                                    <span className="h-2.5 w-2.5 rounded-full bg-primary-500" />
                                  )}
                                </span>
                                <span className="text-sm text-foreground">{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    />
                  )
                )}
              </div>

              {/* 배경설문 헤더 */}
              <div className="border-t border-border pt-5">
                <div className="rounded-lg bg-surface-secondary/60 px-4 py-3">
                  <p className="text-[13px] font-semibold text-foreground">
                    배경설문 (Background Survey)
                    <span className="ml-1 text-accent-500">*</span>
                  </p>
                  <p className="mt-0.5 text-xs text-foreground-secondary">
                    최소 선택 개수 12개 중 다음 항목들을 선택합니다.
                  </p>
                </div>
              </div>

              {/* 체크박스 필드 4개 */}
              {SURVEY_CATEGORIES.filter((c) => c.type === "checkbox").map(
                (category) => {
                  const fieldName = category.name as
                    | "survey_leisure"
                    | "survey_hobbies"
                    | "survey_sports"
                    | "survey_travel";
                  const currentValues =
                    fieldName === "survey_leisure"
                      ? surveyLeisure
                      : fieldName === "survey_hobbies"
                        ? surveyHobbies
                        : fieldName === "survey_sports"
                          ? surveySports
                          : surveyTravel;

                  // 카테고리별 최소 선택 안내
                  const minNote =
                    fieldName === "survey_leisure"
                      ? "두 개 이상 선택"
                      : "한 개 이상 선택";

                  return (
                    <div key={category.name}>
                      <div className="mb-2 flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-foreground">
                          {category.title}
                        </p>
                        <span className="text-[11px] text-foreground-muted">
                          ({minNote})
                        </span>
                        {currentValues.length > 0 && (
                          <span className="ml-auto text-xs font-medium text-primary-600">
                            {currentValues.length}개 선택
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4">
                        {category.options.map((opt) => {
                          const checked = currentValues.includes(opt);
                          return (
                            <label
                              key={opt}
                              className="flex cursor-pointer items-center gap-2.5 border-b border-border/50 py-2 transition-colors hover:bg-surface-secondary/30"
                            >
                              <span
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                  checked
                                    ? "border-primary-500 bg-primary-500"
                                    : "border-foreground-muted/50 bg-surface"
                                }`}
                              >
                                {checked && (
                                  <svg
                                    viewBox="0 0 12 12"
                                    className="h-3 w-3 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path d="M2 6l3 3 5-5" />
                                  </svg>
                                )}
                              </span>
                              <span className="text-[13px] text-foreground">
                                {opt}
                              </span>
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={checked}
                                onChange={() =>
                                  toggleCheckbox(fieldName, opt, currentValues)
                                }
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
              )}

              {/* 실시간 카운터 */}
              <div
                className={`sticky bottom-4 z-10 flex items-center justify-between rounded-xl border px-4 py-3 shadow-sm ${
                  checkboxCount >= 12
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-primary-200 bg-primary-50 text-primary-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  {checkboxCount >= 12 ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <ClipboardList size={16} />
                  )}
                  <span className="text-sm font-medium">
                    배경설문 {checkboxCount}개 / 최소 12개
                  </span>
                </div>
                <div className="h-2 w-24 overflow-hidden rounded-full bg-white/60">
                  <div
                    className={`h-full rounded-full transition-all ${
                      checkboxCount >= 12 ? "bg-green-500" : "bg-primary-500"
                    }`}
                    style={{
                      width: `${Math.min((checkboxCount / 12) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 에러 */}
      {error && (
        <div className="rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-600">
          {error}
        </div>
      )}
      {errors.root?.message && (
        <div className="rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-600">
          {errors.root.message}
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
