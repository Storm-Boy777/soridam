"use client";

import { memo } from "react";
import { ArrowRight, Check } from "lucide-react";

interface SurveyIntroProps {
  onComplete: () => void;
}

export const SurveyIntro = memo(function SurveyIntro({
  onComplete,
}: SurveyIntroProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:py-12">
      {/* 타이틀 */}
      <div className="mb-6 border-b border-border pb-4 lg:mb-8 lg:pb-6">
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
          소리담 서베이 (Background Survey)
        </h1>
        <p className="mt-2 text-sm text-foreground-secondary lg:text-base">
          실제 OPIc 시험의 서베이 항목입니다.{" "}
          <span className="font-semibold text-primary-500">
            소리담 추천 항목을 동일하게 선택하세요!
          </span>
        </p>
      </div>

      <div className="space-y-4">
        {/* 기본 설문 + 배경 설문 — 2열 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 1. 기본 설문 */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 lg:h-10 lg:w-10">
                <span className="text-sm font-bold text-primary-500 lg:text-base">
                  1
                </span>
              </div>
              <h2 className="text-sm font-bold text-foreground lg:text-base">
                기본 설문
              </h2>
            </div>
            <div className="space-y-3">
              <SurveyQuestion
                label="직업 분야"
                options={[
                  "사업/회사 종사",
                  "재택근무/사업",
                  "교사/교육자",
                  "일 경험 없음",
                ]}
                selected="일 경험 없음"
              />
              <SurveyQuestion
                label="학생 여부"
                options={["예", "아니오"]}
                selected="아니오"
              />
              <SurveyQuestion
                label="수강 경력"
                options={[
                  "현재 수강 중",
                  "수강 후 5년 미만",
                  "수강 후 5년 이상",
                ]}
                selected="수강 후 5년 이상"
              />
              <SurveyQuestion
                label="거주 형태"
                options={[
                  "홀로 거주",
                  "친구/룸메이트",
                  "가족과 거주",
                  "기숙사",
                ]}
                selected="홀로 거주"
              />
            </div>
          </div>

          {/* 2. 배경 설문 */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 lg:h-10 lg:w-10">
                <span className="text-sm font-bold text-primary-500 lg:text-base">
                  2
                </span>
              </div>
              <h2 className="text-sm font-bold text-foreground lg:text-base">
                배경 설문
              </h2>
              <span className="ml-auto text-[11px] text-foreground-muted">
                12개 이상 선택
              </span>
            </div>
            <div className="space-y-3">
              <SurveyCategory
                label="여가 활동"
                options={[
                  "영화보기",
                  "쇼핑하기",
                  "TV 시청하기",
                  "공연 보기",
                  "콘서트 보기",
                  "공원 가기",
                  "해변 가기",
                  "카페/커피전문점",
                ]}
                selected={[
                  "영화보기",
                  "쇼핑하기",
                  "TV 시청하기",
                  "공연 보기",
                  "콘서트 보기",
                ]}
              />
              <SurveyCategory
                label="취미/관심사"
                options={[
                  "음악 감상하기",
                  "악기 연주",
                  "요리하기",
                  "독서",
                  "게임",
                ]}
                selected={["음악 감상하기"]}
              />
              <SurveyCategory
                label="운동"
                options={[
                  "조깅",
                  "걷기",
                  "헬스",
                  "수영",
                  "자전거",
                  "운동을 전혀 하지 않음",
                ]}
                selected={["조깅", "걷기", "운동을 전혀 하지 않음"]}
              />
              <SurveyCategory
                label="휴가/출장"
                options={[
                  "집에서 보내는 휴가",
                  "국내 여행",
                  "해외 여행",
                  "출장",
                ]}
                selected={[
                  "집에서 보내는 휴가",
                  "국내 여행",
                  "해외 여행",
                ]}
              />
            </div>
          </div>
        </div>

        {/* 난이도 설정 + 전략 안내 — 2열 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 3. 난이도 설정 */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 lg:h-10 lg:w-10">
                <span className="text-sm font-bold text-primary-500 lg:text-base">
                  3
                </span>
              </div>
              <h2 className="text-sm font-bold text-foreground lg:text-base">
                난이도 설정
              </h2>
              <span className="ml-auto text-[11px] text-foreground-muted">
                Self Assessment
              </span>
            </div>
            <div className="rounded-lg border border-border bg-surface-secondary p-4">
              <div className="mb-3 flex items-center justify-center gap-4">
                <div className="text-center">
                  <p className="mb-1.5 text-[10px] text-foreground-muted">
                    처음 선택
                  </p>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-foreground text-2xl font-bold text-white shadow">
                    5
                  </div>
                </div>
                <span className="mt-4 text-lg text-foreground-muted">→</span>
                <div className="text-center">
                  <p className="mb-1.5 text-[10px] text-foreground-muted">
                    7번 이후
                  </p>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-foreground text-2xl font-bold text-white shadow">
                    5
                  </div>
                </div>
              </div>
              <p className="text-center text-xs font-semibold text-foreground">
                소리담 권장 난이도
              </p>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-foreground-secondary">
              OPIc 시험은 시작 전 자신의 영어 수준을 1~6단계 중 선택하고, 7번
              문제 이후 난이도를 상향·유지·하향 중 재조정합니다. 소리담의 모든
              콘텐츠는{" "}
              <span className="font-semibold text-foreground">5-5 기준</span>
              으로 구성되어 있으므로 실제 시험에서도 동일하게 선택하세요.
            </p>
          </div>

          {/* 전략 안내 */}
          <div className="flex flex-col rounded-xl bg-foreground p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-secondary-500">
                <span className="text-sm">💡</span>
              </div>
              <h3 className="text-sm font-bold text-white lg:text-base">
                소리담 OPIc 전략
              </h3>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-border lg:text-sm">
              OPIc은 배경 설문과 난이도에 따라 출제 문제가 달라집니다.
              소리담은{" "}
              <span className="font-semibold text-secondary-500">
                위 배경 설문 + 난이도 5-5 조합의 기출문제를 모두 수집
              </span>
              하여 모의고사와 훈련 콘텐츠를 구성했습니다.
            </p>
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center gap-2.5 rounded-lg bg-white/10 p-3">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-600">
                  <Check size={10} className="text-white" />
                </div>
                <p className="text-xs text-primary-50">
                  <span className="font-semibold text-white">
                    동일 선택 시
                  </span>{" "}
                  — 소리담에서 연습한 문제가 실제 시험에 그대로 출제
                </p>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg bg-white/10 p-3">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-500">
                  <span className="text-[10px] font-bold text-white">✕</span>
                </div>
                <p className="text-xs text-primary-50">
                  <span className="font-semibold text-white">
                    다른 항목 선택 시
                  </span>{" "}
                  — 소리담에서 훈련하지 못한 주제가 출제될 수 있음
                </p>
              </div>
            </div>
            <div className="mt-4 border-t border-foreground-secondary pt-3">
              <p className="text-center text-xs font-semibold text-secondary-500">
                실제 시험에서도 반드시 동일하게 선택하세요!
              </p>
            </div>
          </div>
        </div>

        {/* 하단 버튼 — 소리담과 동일하게 우측 정렬 */}
        <div className="flex justify-end pt-4 lg:pt-6">
          <button
            onClick={onComplete}
            className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-primary-600 hover:shadow-xl lg:gap-2 lg:px-10 lg:py-3"
          >
            확인했습니다
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
});

/** 단일 선택 질문 (기본 설문용) */
function SurveyQuestion({
  label,
  options,
  selected,
}: {
  label: string;
  options: string[];
  selected: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-foreground-secondary">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const isSelected = option === selected;
          return (
            <span
              key={option}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] lg:text-xs ${
                isSelected
                  ? "bg-foreground font-medium text-white"
                  : "border border-border bg-surface-secondary text-foreground-muted"
              }`}
            >
              {isSelected && <Check size={12} />}
              {option}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** 다중 선택 카테고리 (배경 설문용) */
function SurveyCategory({
  label,
  options,
  selected,
}: {
  label: string;
  options: string[];
  selected: string[];
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-foreground-secondary">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <span
              key={option}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] lg:text-xs ${
                isSelected
                  ? "bg-foreground font-medium text-white"
                  : "border border-border bg-surface-secondary text-foreground-muted"
              }`}
            >
              {isSelected && <Check size={12} />}
              {option}
            </span>
          );
        })}
      </div>
    </div>
  );
}
