"use client";

// 기출 보관함 — 한 기출의 콤보 블록 (카테고리 뱃지 + 토픽 + 가이드 점프 + 질문들)

import { ChevronRight } from "lucide-react";
import type { ExamLibraryCombo, QuestionTypeGuide, StudyCategory } from "@/lib/types/opic-study";
import { QuestionAudioRow } from "./question-audio-row";

interface Props {
  combo: ExamLibraryCombo;
  typeGuideMap: Map<string, QuestionTypeGuide>;
  onJumpToComboGuide: (cat: StudyCategory, topic: string, sig: string) => void;
}

// 카테고리별 톤 클래스
const TONE_CLASSES: Record<ExamLibraryCombo["category"], { bg: string; text: string }> = {
  self_intro: { bg: "bg-[#5a7a55]/10", text: "text-[#5a7a55]" },
  general: { bg: "bg-primary-50", text: "text-primary-600" },
  roleplay: { bg: "bg-[#3b5fa0]/10", text: "text-[#3b5fa0]" },
  advance: { bg: "bg-[#9b59b6]/10", text: "text-[#9b59b6]" },
};

export function ExamComboBlock({ combo, typeGuideMap, onJumpToComboGuide }: Props) {
  const isSelfIntro = combo.category === "self_intro";
  const tone = TONE_CLASSES[combo.category];

  const handleJump = () => {
    if (!combo.sig || isSelfIntro) return;
    onJumpToComboGuide(combo.category as StudyCategory, combo.topic, combo.sig);
  };

  return (
    <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 shadow-sm sm:p-5">
      {/* 헤더 — 카테고리 + 토픽 + 가이드 점프 */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${tone.bg} ${tone.text}`}
          >
            {combo.category_label}
          </span>
          {combo.topic && (
            <span className="text-sm font-bold text-foreground">· {combo.topic}</span>
          )}
        </div>

        {!isSelfIntro && combo.sig && (
          <button
            type="button"
            onClick={handleJump}
            title="콤보 풀 가이드 보기"
            className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold text-primary-600 hover:bg-primary-100"
          >
            가이드 보기
            <ChevronRight size={12} strokeWidth={1.8} />
          </button>
        )}
      </div>

      {/* 질문들 */}
      <div className="flex flex-col">
        {combo.questions.map((q, idx) => {
          const typeGuide = q.question_type_eng ? typeGuideMap.get(q.question_type_eng) : undefined;
          return (
            <div
              key={`${q.question_number}-${idx}`}
              className={idx > 0 ? "border-t border-border" : ""}
            >
              <QuestionAudioRow
                questionNumber={q.question_number}
                typeLabel={typeGuide?.type_short_kor ?? null}
                korean={q.question_short ?? q.question_korean}
                english={q.question_english}
                audioUrl={q.audio_url}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
