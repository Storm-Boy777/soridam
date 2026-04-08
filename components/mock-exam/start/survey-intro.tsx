"use client";

import { memo } from "react";
import Link from "next/link";
import { ArrowRight, Check, ExternalLink } from "lucide-react";

/* ── 전략 데이터 ── */

const surveyStrategies = [
  { cat: "직업", choice: "일 경험 없음", strategy: "출제 차단", color: "text-red-600", bg: "bg-red-50" },
  { cat: "학생", choice: "아니오", strategy: "출제 차단", color: "text-red-600", bg: "bg-red-50" },
  { cat: "수강", choice: "5년 이상", strategy: "출제 차단", color: "text-red-600", bg: "bg-red-50" },
  { cat: "거주", choice: "홀로 거주", strategy: "범위 축소", color: "text-amber-600", bg: "bg-amber-50" },
  { cat: "여가", choice: "영화, 쇼핑, TV 외 2", strategy: "핵심 주제", color: "text-primary-600", bg: "bg-primary-50" },
  { cat: "취미", choice: "음악 감상 (단독)", strategy: "핵심 주제", color: "text-primary-600", bg: "bg-primary-50" },
  { cat: "운동", choice: "조깅, 걷기, 안함", strategy: "무해 필러", color: "text-foreground-muted", bg: "bg-surface-secondary" },
  { cat: "휴가", choice: "집, 국내, 해외", strategy: "핵심 주제", color: "text-primary-600", bg: "bg-primary-50" },
];

interface SurveyIntroProps {
  onComplete: () => void;
}

export const SurveyIntro = memo(function SurveyIntro({
  onComplete,
}: SurveyIntroProps) {
  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 lg:py-6">
      {/* 타이틀 */}
      <div className="mb-3 border-b border-border pb-2 sm:mb-4 sm:pb-3">
        <h1 className="text-lg font-bold text-foreground sm:text-xl lg:text-2xl">
          소리담 서베이 (Background Survey)
        </h1>
        <p className="mt-1 text-[11px] text-foreground-secondary sm:text-xs lg:text-sm">
          실제 OPIc 시험의 서베이 항목입니다.{" "}
          <span className="font-semibold text-primary-500">
            소리담 추천 항목을 동일하게 선택하세요!
          </span>
        </p>
      </div>

      {/* 2열 레이아웃: 모바일 1열 → lg 2열 */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_340px] lg:gap-4">
        {/* ── 왼쪽: 설문 ── */}
        <div className="space-y-3">
          {/* 1. 기본 설문 */}
          <div className="rounded-xl border border-border bg-surface p-3 lg:p-4">
            <SectionHeader num={1} title="기본 설문" />
            {/* 모바일 1열, md+ 2열 */}
            <div className="space-y-2 md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-x-6 md:gap-y-2 md:space-y-0">
              <SurveyQuestion
                label="직업 분야"
                options={["사업/회사 종사", "재택근무/사업", "교사/교육자", "일 경험 없음"]}
                selected="일 경험 없음"
              />
              <SurveyQuestion
                label="학생 여부"
                options={["예", "아니오"]}
                selected="아니오"
              />
              <SurveyQuestion
                label="수강 경력"
                options={["현재 수강 중", "수강 후 5년 미만", "수강 후 5년 이상"]}
                selected="수강 후 5년 이상"
              />
              <SurveyQuestion
                label="거주 형태"
                options={["홀로 거주", "친구/룸메이트", "가족과 거주", "기숙사"]}
                selected="홀로 거주"
              />
            </div>
          </div>

          {/* 2. 배경 설문 */}
          <div className="rounded-xl border border-border bg-surface p-3 lg:p-4">
            <SectionHeader num={2} title="배경 설문" badge="12개 이상 선택" />
            <div className="space-y-2">
              <SurveyCategory
                label="여가 활동"
                options={["영화보기", "쇼핑하기", "TV 시청하기", "공연 보기", "콘서트 보기", "공원 가기", "해변 가기", "카페/커피전문점"]}
                selected={["영화보기", "쇼핑하기", "TV 시청하기", "공연 보기", "콘서트 보기"]}
              />
              <SurveyCategory
                label="취미/관심사"
                options={["음악 감상하기", "악기 연주", "요리하기", "독서", "게임"]}
                selected={["음악 감상하기"]}
              />
              <SurveyCategory
                label="운동"
                options={["조깅", "걷기", "헬스", "수영", "자전거", "운동을 전혀 하지 않음"]}
                selected={["조깅", "걷기", "운동을 전혀 하지 않음"]}
              />
              <SurveyCategory
                label="휴가/출장"
                options={["집에서 보내는 휴가", "국내 여행", "해외 여행", "출장"]}
                selected={["집에서 보내는 휴가", "국내 여행", "해외 여행"]}
              />
            </div>
          </div>

          {/* 3. 난이도 설정 */}
          <div className="rounded-xl border border-border bg-surface p-3 lg:p-4">
            <SectionHeader num={3} title="난이도 설정" badge="Self Assessment" />
            {/* 모바일: 세로 스택, sm+: 가로 인라인 */}
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-secondary px-3 py-2.5 sm:flex-row sm:items-center sm:gap-4 sm:px-4">
              <p className="text-xs text-foreground-secondary">소리담 권장 난이도</p>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-500 text-sm font-bold text-white">5</span>
                <span className="text-xs text-foreground-muted">→</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-500 text-sm font-bold text-white">5</span>
                <p className="ml-2 text-[10px] leading-tight text-foreground-muted sm:ml-auto">
                  처음 선택 → 7번 이후 동일
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 오른쪽: 전략 가이드 (다크) ── */}
        <div className="flex flex-col">
          <div className="flex flex-1 flex-col rounded-xl bg-foreground p-3 sm:p-4">
            <div className="mb-2 flex items-center gap-2 sm:mb-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary-500">
                <span className="text-xs">💡</span>
              </div>
              <h3 className="text-xs font-bold text-white sm:text-sm">소리담 서베이 전략</h3>
            </div>

            <p className="mb-2 text-[10px] leading-relaxed text-border sm:mb-3 sm:text-[11px]">
              OPIc은 배경 설문과 난이도에 따라 출제 문제가 달라집니다.
              소리담은{" "}
              <span className="font-semibold text-secondary-500">
                아래 전략에 맞춘 기출문제를 모두 수집
              </span>
              하여 콘텐츠를 구성했습니다.
            </p>

            {/* 전략표 */}
            <div className="space-y-1">
              {surveyStrategies.map((row) => (
                <div
                  key={row.cat}
                  className="flex items-center gap-2 rounded-md bg-white/10 px-2 py-1 sm:px-2.5 sm:py-1.5"
                >
                  <span className="w-7 shrink-0 text-[10px] font-semibold text-white sm:w-8 sm:text-[11px]">
                    {row.cat}
                  </span>
                  <span className="flex-1 text-[9px] text-primary-50/70 sm:text-[10px]">
                    {row.choice}
                  </span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-semibold sm:text-[9px] ${row.bg} ${row.color}`}>
                    {row.strategy}
                  </span>
                </div>
              ))}
            </div>

            {/* 핵심 포인트 — 하단 고정 */}
            <div className="mt-auto space-y-1.5 pt-3">
              <div className="flex items-start gap-2 rounded-md bg-white/10 p-2">
                <div className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-green-600">
                  <Check size={8} className="text-white" />
                </div>
                <p className="text-[10px] text-primary-50 sm:text-[11px]">
                  <span className="font-semibold text-white">동일 선택 시</span> — 연습한 문제가 그대로 출제
                </p>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-white/10 p-2">
                <div className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-red-500">
                  <span className="text-[7px] font-bold text-white">✕</span>
                </div>
                <p className="text-[10px] text-primary-50 sm:text-[11px]">
                  <span className="font-semibold text-white">다른 항목 선택 시</span> — 훈련 안 한 주제 출제 가능
                </p>
              </div>
            </div>

            <div className="mt-2 border-t border-foreground-secondary pt-2 sm:mt-3">
              <p className="text-center text-[10px] font-semibold text-secondary-500 sm:text-[11px]">
                실제 시험에서도 반드시 동일하게 선택하세요!
              </p>
            </div>

            <Link
              href="/strategy"
              target="_blank"
              className="mt-2 flex items-center justify-center gap-1 text-[10px] text-primary-50/50 transition-colors hover:text-secondary-500 sm:text-[11px]"
            >
              전략 가이드 자세히 보기
              <ExternalLink size={10} />
            </Link>
          </div>

          {/* CTA */}
          <button
            onClick={onComplete}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-primary-600 hover:shadow-xl lg:py-3"
          >
            확인했습니다
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
});

/* ── 섹션 헤더 ── */
function SectionHeader({ num, title, badge }: { num: number; title: string; badge?: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 sm:mb-2.5">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-50 sm:h-7 sm:w-7">
        <span className="text-[10px] font-bold text-primary-500 sm:text-xs">{num}</span>
      </div>
      <h2 className="text-xs font-bold text-foreground lg:text-sm">{title}</h2>
      {badge && (
        <span className="ml-auto text-[10px] text-foreground-muted">{badge}</span>
      )}
    </div>
  );
}

/* ── 단일 선택 질문 ── */
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
      <p className="mb-1 text-[11px] font-medium text-foreground-secondary">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => {
          const isSelected = option === selected;
          return (
            <span
              key={option}
              className={`inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-[11px] ${
                isSelected
                  ? "border border-primary-300 bg-primary-50 font-medium text-primary-700"
                  : "border border-border bg-surface-secondary text-foreground-muted"
              }`}
            >
              {isSelected && <Check size={10} />}
              {option}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ── 다중 선택 카테고리 ── */
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
      <p className="mb-1 text-[11px] font-medium text-foreground-secondary">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <span
              key={option}
              className={`inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-[11px] ${
                isSelected
                  ? "border border-primary-300 bg-primary-50 font-medium text-primary-700"
                  : "border border-border bg-surface-secondary text-foreground-muted"
              }`}
            >
              {isSelected && <Check size={10} />}
              {option}
            </span>
          );
        })}
      </div>
    </div>
  );
}
