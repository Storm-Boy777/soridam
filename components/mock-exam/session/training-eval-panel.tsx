"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  BarChart3,
  Loader2,
} from "lucide-react";
import { getEvaluation } from "@/lib/actions/mock-exam";

// question_type 한글
const QT_KO: Record<string, string> = {
  description: "묘사",
  routine: "루틴",
  asking_questions: "질문하기",
  comparison: "비교",
  experience_specific: "특정경험",
  experience_habitual: "습관경험",
  experience_past: "과거경험",
  suggest_alternatives: "대안제시",
  comparison_change: "비교변화",
  social_issue: "사회이슈",
};

// skill_summary 색상 (1~5)
function getSkillColor(score: number): string {
  if (score >= 4) return "text-green-600 bg-green-50";
  if (score >= 3) return "text-yellow-600 bg-yellow-50";
  return "text-red-500 bg-red-50";
}

// ── Props ──

interface TrainingEvalPanelProps {
  sessionId: string;
  questionNumber: number;
  questionInfo: {
    question_english: string;
    question_korean: string;
    question_type_eng: string;
    topic: string;
    category: string;
  } | null;
  onClose: () => void;
}

// ── 메인 컴포넌트 (인라인 뷰 — 세션 콘텐츠 영역을 대체) ──

export function TrainingEvalPanel({
  sessionId,
  questionNumber,
  questionInfo,
  onClose,
}: TrainingEvalPanelProps) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  // questionNumber 변경 시 데이터 로드
  useEffect(() => {
    setLoading(true);
    setData(null);
    getEvaluation({
      session_id: sessionId,
      question_number: questionNumber,
    }).then((res) => {
      setData(res.data || null);
      setLoading(false);
    });
  }, [sessionId, questionNumber]);

  // consults에서 observation/directions/weak_points 사용
  const observation = data?.observation as string | null;
  const directions = (data?.directions || []) as string[];
  const fulfillment = data?.fulfillment as string | null;

  return (
    <div className="mx-auto flex h-0 w-full max-w-5xl flex-grow flex-col overflow-hidden px-3 py-2 sm:px-6 sm:py-4 animate-fadeIn">
      {/* 헤더 */}
      <div className="shrink-0 mb-3 flex items-center gap-3 md:mb-4">
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-secondary md:h-9 md:w-9"
        >
          <ArrowLeft size={18} className="text-foreground-secondary" />
        </button>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 md:h-9 md:w-9">
            <BarChart3 size={14} className="text-emerald-600 md:h-[18px] md:w-[18px]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground md:text-base">
              Q{questionNumber} 개별 평가
            </h3>
            {questionInfo && (
              <p className="text-[10px] text-foreground-muted md:text-xs">
                {QT_KO[questionInfo.question_type_eng] || questionInfo.question_type_eng}
                {questionInfo.topic && ` · ${questionInfo.topic}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 콘텐츠 — 스크롤 영역 */}
      <div className="mobile-scrollbar-hidden h-0 flex-grow overflow-y-auto rounded-xl border border-border bg-surface p-4 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden md:p-6">
        {loading ? (
          <div className="flex flex-col items-center py-12">
            <Loader2 size={24} className="animate-spin text-primary-500" />
            <p className="mt-2 text-sm text-foreground-secondary">
              평가 결과를 불러오는 중...
            </p>
          </div>
        ) : !data ? (
          <p className="py-12 text-center text-sm text-foreground-muted">
            평가 데이터가 없습니다.
          </p>
        ) : data.skipped_by_preprocess ? (
          <p className="py-12 text-center text-sm text-foreground-muted">
            이 문항은 건너뛰었습니다.
          </p>
        ) : observation ? (
          <V2ConsultView
            fulfillment={fulfillment}
            observation={observation}
            directions={directions}
          />
        ) : (
          <p className="py-12 text-center text-sm text-foreground-muted">
            평가 데이터가 아직 생성되지 않았습니다.
          </p>
        )}
      </div>

      {/* 하단 돌아가기 버튼 */}
      <div className="shrink-0 mt-3 md:mt-4">
        <button
          onClick={onClose}
          className="w-full rounded-xl bg-surface-secondary py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:bg-border md:py-3"
        >
          시험으로 돌아가기
        </button>
      </div>
    </div>
  );
}

// ── 소견 뷰 (consults 데이터 기반) ──

function V2ConsultView({
  fulfillment,
  observation,
  directions,
}: {
  fulfillment: string | null;
  observation: string;
  directions: string[];
}) {
  const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
    fulfilled: { label: "충족", color: "text-green-600 bg-green-50", icon: "✓" },
    partial: { label: "부분 충족", color: "text-yellow-600 bg-yellow-50", icon: "△" },
    unfulfilled: { label: "미충족", color: "text-red-500 bg-red-50", icon: "✗" },
  };
  const s = statusConfig[fulfillment || ""] || statusConfig.unfulfilled;

  return (
    <div className="space-y-4 md:space-y-5">
      {/* 과제 수행 판정 */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-foreground-muted md:text-sm">과제 수행</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium md:text-xs ${s.color}`}>
          {s.icon} {s.label}
        </span>
      </div>

      {/* 소견 */}
      <div>
        <p className="text-xs font-medium text-foreground-muted mb-2 md:text-sm">평가 관찰</p>
        <p className="text-xs leading-relaxed text-foreground md:text-sm md:leading-7">
          {observation}
        </p>
      </div>

      {/* 개선 방향 */}
      {directions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground-muted mb-2 md:text-sm">개선 방향</p>
          <ul className="space-y-1.5">
            {directions.map((dir: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-foreground md:text-sm">
                <span className="mt-[5px] h-[5px] w-[5px] shrink-0 rounded-full bg-primary-500" />
                {dir}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

