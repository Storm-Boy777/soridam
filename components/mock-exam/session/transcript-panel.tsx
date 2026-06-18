"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import {
  getAnswerTranscript,
  type AnswerTranscriptData,
} from "@/lib/actions/mock-exam";

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

interface TranscriptPanelProps {
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

export function TranscriptPanel({
  sessionId,
  questionNumber,
  questionInfo,
  onClose,
}: TranscriptPanelProps) {
  const [data, setData] = useState<AnswerTranscriptData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);
    getAnswerTranscript({
      session_id: sessionId,
      question_number: questionNumber,
    }).then((res) => {
      if (cancelled) return;
      setData(res.data || null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId, questionNumber]);

  const transcript = data?.transcript?.trim() || "";
  const isDone =
    data?.eval_status === "completed" || data?.eval_status === "skipped";
  const isFailed = data?.eval_status === "failed";
  const wordCount = data?.word_count ?? null;
  const wpm = data?.wpm ?? null;

  return (
    <div className="mx-auto flex h-0 w-full max-w-3xl flex-grow flex-col overflow-hidden px-3 py-2 sm:px-6 sm:py-4 animate-fadeIn">
      {/* 헤더 */}
      <div className="mb-3 flex shrink-0 items-center gap-3 md:mb-4">
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-secondary md:h-9 md:w-9"
        >
          <ArrowLeft size={18} className="text-foreground-secondary" />
        </button>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 md:h-9 md:w-9">
            <FileText size={14} className="text-emerald-600 md:h-[18px] md:w-[18px]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground md:text-base">
              Q{questionNumber} 내 답변
            </h3>
            {questionInfo && (
              <p className="text-[10px] text-foreground-muted md:text-xs">
                {QT_KO[questionInfo.question_type_eng] ||
                  questionInfo.question_type_eng}
                {questionInfo.topic && ` · ${questionInfo.topic}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 콘텐츠 — 스크롤 영역 */}
      <div className="relative h-0 flex-grow">
        <div className="absolute inset-0 overflow-y-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
          <div className="rounded-xl border border-border bg-surface">
            {loading ? (
              <div className="flex flex-col items-center py-12">
                <Loader2 size={24} className="animate-spin text-primary-500" />
                <p className="mt-2 text-sm text-foreground-secondary">
                  트랜스크립트를 불러오는 중...
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {/* 질문 */}
                {questionInfo &&
                  (questionInfo.question_english ||
                    questionInfo.question_korean) && (
                    <div className="px-4 py-4 md:px-6">
                      <p className="text-[11px] font-bold text-foreground-secondary md:text-xs">
                        질문
                      </p>
                      {questionInfo.question_english && (
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {questionInfo.question_english}
                        </p>
                      )}
                      {questionInfo.question_korean && (
                        <p className="mt-0.5 text-xs text-foreground-secondary">
                          {questionInfo.question_korean}
                        </p>
                      )}
                    </div>
                  )}

                {/* 내 답변 */}
                <div className="px-4 py-4 md:px-6">
                  <p className="text-[11px] font-bold text-foreground-secondary md:text-xs">
                    내 답변 트랜스크립트
                  </p>

                  {/* 음성 재생 */}
                  {data?.audio_url && (
                    <audio
                      src={data.audio_url}
                      controls
                      preload="metadata"
                      className="mt-3 h-10 w-full"
                    />
                  )}

                  <div className="mt-3 rounded-lg bg-surface-secondary px-4 py-3">
                    {isDone && transcript ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground md:leading-7">
                        {transcript}
                      </p>
                    ) : isFailed ? (
                      <p className="text-sm text-red-500">
                        트랜스크립트 생성에 실패했습니다.
                      </p>
                    ) : isDone ? (
                      <p className="text-sm text-foreground-muted">(무응답)</p>
                    ) : (
                      <p className="flex items-center gap-1.5 text-sm text-foreground-muted">
                        <Loader2 size={14} className="animate-spin" />
                        생성 중...
                      </p>
                    )}
                  </div>

                  {/* 메타 */}
                  {isDone &&
                    transcript &&
                    (wordCount != null || (wpm != null && wpm > 0)) && (
                      <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-foreground-muted">
                        {wordCount != null && <span>단어 {wordCount}개</span>}
                        {wpm != null && wpm > 0 && (
                          <span>속도 {Math.round(wpm)} WPM</span>
                        )}
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 하단 돌아가기 버튼 */}
      <div className="mt-3 shrink-0 md:mt-4">
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
