"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ArrowLeft,
  Loader2,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertTriangle,
  FileText,
  X,
  Coffee,
  Clapperboard,
  Lightbulb,
  Languages,
  CaseSensitive,
  Type,
  Columns2,
  Headphones,
  Volume2,
  Package,
  MessageCircleHeart,
  Repeat2,
  BookOpenText,
  Heart,
  GraduationCap,
} from "lucide-react";
import { TopicPagination } from "@/components/reviews/submit/topic-pagination";
import {
  QuestionSelector,
  type SelectedQuestion,
} from "@/components/reviews/submit/question-selector";
import {
  createScript,
  refineScript,
  confirmScript,
  checkScriptCredit,
  getScriptDetail,
  getOpicTips,
  createPackage,
} from "@/lib/actions/scripts";
import { GradeSettingModal } from "@/components/ui/grade-setting-modal";
import {
  ScriptRenderer,
  ScriptFlatText,
  ScriptSummaryView,
} from "./script-renderer";
import { QUESTION_TYPE_LABELS } from "@/lib/types/reviews";
import { TARGET_LEVELS } from "@/lib/types/scripts";
import type {
  TargetLevel,
  TtsVoice,
  ScriptDetail,
  OpicTip,
  OpicTipCategory,
} from "@/lib/types/scripts";
import {
  TTS_VOICES,
  TTS_VOICE_LABELS,
} from "@/lib/types/scripts";

/* ── Edge Function 호출 헬퍼 ── */

async function callEdgeFunction(
  route: "generate" | "correct" | "refine",
  body: Record<string, unknown>
) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/scripts/${route}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "AI 생성에 실패했습니다" }));
    throw new Error(err.error || "AI 생성에 실패했습니다");
  }

  return res.json();
}

/* ── 타입 ── */

interface QuestionOption {
  question_id: string;         // questions.id
  question_english: string;
  question_korean: string;
  topic: string;
  topic_category: string;      // questions.category
  question_type: string;         // questions.question_type_eng
}

/* ── 위저드 5단계 정의 ── */

const WIZARD_STEPS = [
  { label: "주제·질문" },
  { label: "경험 입력" },
  { label: "생성 중" },
  { label: "결과 확인" },
  { label: "완료" },
];

/* ── 메인 위저드 ── */

export function ScriptWizard({
  currentGrade = "",
  targetGrade = "",
}: {
  currentGrade?: string;
  targetGrade?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const viewId = searchParams.get("view");

  // viewId가 있으면 Step 4(결과 확인)로 직접 이동
  const [step, setStep] = useState(viewId ? 4 : 1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] =
    useState<QuestionOption | null>(null);
  const [targetLevel, setTargetLevel] = useState<TargetLevel>(
    (targetGrade as TargetLevel) || "IM2"
  );
  const [userInput, setUserInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScriptId, setGeneratedScriptId] = useState<string | null>(
    viewId
  );
  const [error, setError] = useState<string | null>(null);

  // ── 크레딧 확인 ──
  const { data: creditInfo } = useQuery({
    queryKey: ["script-credit"],
    queryFn: async () => {
      const result = await checkScriptCredit();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    staleTime: 60 * 1000,
  });

  // ── 생성된 스크립트 상세 (Step 3 폴링 + Step 4 표시) ──
  const { data: scriptDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["script-detail", generatedScriptId],
    queryFn: async () => {
      if (!generatedScriptId) return null;
      const result = await getScriptDetail(generatedScriptId);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!generatedScriptId && step >= 3 && step <= 4,
    staleTime: 30 * 1000,
    refetchInterval: (query) => {
      // english_text가 비어있으면 3초마다 폴링 (EF 완료 대기)
      const data = query.state.data;
      if (data && !data.english_text) return 3000;
      return false;
    },
  });

  // ── Step 3 → Step 4 자동 전환 ──
  useEffect(() => {
    if (step === 3 && scriptDetail && scriptDetail.english_text) {
      setStep(4);
    }
  }, [step, scriptDetail]);

  // ── 카테고리 변경 → 주제/질문 리셋 ──
  const handleCategorySelect = useCallback((cat: string) => {
    setSelectedCategory(cat);
    setSelectedTopic(null);
    setSelectedQuestion(null);
  }, []);

  // ── 주제 변경 ──
  const handleTopicSelect = useCallback((topic: string) => {
    setSelectedTopic(topic);
    setSelectedQuestion(null);
  }, []);

  // ── Step 1 → Step 2 (QuestionSelector의 SelectedQuestion → QuestionOption 변환) ──
  const handleQuestionSelect = useCallback(
    (sq: SelectedQuestion) => {
      if (!sq.question_id || !selectedTopic || !selectedCategory) return;

      const cached = queryClient.getQueryData<
        Array<{
          id: string;
          question_english: string;
          question_korean: string;
          question_type_eng: string | null;
          topic: string;
        }>
      >(["questions", selectedTopic, selectedCategory]);

      const full = cached?.find((q) => q.id === sq.question_id);
      if (!full) return;

      setSelectedQuestion({
        question_id: full.id,
        question_english: full.question_english,
        question_korean: full.question_korean,
        topic: full.topic,
        topic_category: selectedCategory,
        question_type: full.question_type_eng || "",
      });
      setStep(2);
    },
    [selectedTopic, selectedCategory, queryClient]
  );

  // ── Step 2 → Step 3 (AI 생성) ──
  const handleGenerate = useCallback(async () => {
    if (!selectedQuestion) return;

    setIsGenerating(true);
    setError(null);

    try {
      const input = {
        question_id: selectedQuestion.question_id,
        topic: selectedQuestion.topic,
        category: selectedQuestion.topic_category,
        question_english: selectedQuestion.question_english,
        question_korean: selectedQuestion.question_korean,
        question_type: selectedQuestion.question_type,
        target_level: targetLevel,
        user_story: userInput,
      };

      const result = await createScript(input);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.data?.id) {
        setGeneratedScriptId(result.data.id);
        setStep(3);

        // EF fire-and-forget — 폴링(refetchInterval 3s)이 결과 감지
        callEdgeFunction("generate", { script_id: result.data.id }).catch(
          (efErr) => {
            console.error("EF generate 호출 실패:", efErr);
            setError(
              "AI 스크립트 생성에 실패했습니다. 새로고침 후 다시 시도해주세요."
            );
          }
        );
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedQuestion, targetLevel, userInput]);

  // ── 수정 요청 (Step 4 → Step 3 → Step 4) ──
  const [refinePrompt, setRefinePrompt] = useState("");
  const [isRefining, setIsRefining] = useState(false);

  const handleRefine = useCallback(async () => {
    if (!generatedScriptId) return;

    setIsRefining(true);
    setError(null);

    try {
      const result = await refineScript({
        script_id: generatedScriptId,
        user_prompt: refinePrompt,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      // 캐시 무효화 → UI가 로딩 상태 + 폴링 재개
      queryClient.invalidateQueries({
        queryKey: ["script-detail", generatedScriptId],
      });

      // Step 3 (생성 중)으로 이동 — 학습 콘텐츠 표시
      setStep(3);

      // EF fire-and-forget
      callEdgeFunction("refine", {
        script_id: generatedScriptId,
        user_prompt: refinePrompt,
      }).catch((efErr) => {
        console.error("EF refine 호출 실패:", efErr);
        setError(
          "스크립트 수정에 실패했습니다. 새로고침 후 다시 시도해주세요."
        );
      });

      setRefinePrompt("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsRefining(false);
    }
  }, [generatedScriptId, refinePrompt, queryClient]);

  // ── 재생성 ──
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regenerateStory, setRegenerateStory] = useState("");

  const openRegenerateModal = useCallback(() => {
    // 기존 user_story 프리필
    setRegenerateStory(
      scriptDetail?.user_story || userInput
    );
    setShowRegenerateModal(true);
  }, [scriptDetail?.user_story, userInput]);

  const handleRegenerate = useCallback(async () => {
    // 재생성에 필요한 질문 정보 (selectedQuestion 또는 scriptDetail에서)
    const question = selectedQuestion || (scriptDetail?.question_detail
      ? {
          question_id: scriptDetail.question_detail.id,
          question_english: scriptDetail.question_detail.question_english,
          question_korean: scriptDetail.question_detail.question_korean,
          topic: scriptDetail.question_detail.topic,
          topic_category: scriptDetail.question_detail.category,
          question_type: scriptDetail.question_detail.question_type_eng,
        }
      : null);

    if (!question) {
      setError("질문 정보를 찾을 수 없습니다");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setShowRegenerateModal(false);

    try {
      const input = {
        question_id: question.question_id,
        topic: question.topic,
        category: question.topic_category,
        question_english: question.question_english,
        question_korean: question.question_korean,
        question_type: question.question_type,
        target_level: scriptDetail?.target_level || targetLevel,
        user_story: regenerateStory,
      };

      const result = await createScript(input);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.data?.id) {
        setGeneratedScriptId(result.data.id);

        // 기존 캐시 무효화
        queryClient.invalidateQueries({
          queryKey: ["script-detail", result.data.id],
        });
        queryClient.invalidateQueries({ queryKey: ["script-credit"] });

        setStep(3);

        callEdgeFunction("generate", { script_id: result.data.id }).catch(
          (efErr) => {
            console.error("EF generate 호출 실패:", efErr);
            setError(
              "AI 스크립트 생성에 실패했습니다. 새로고침 후 다시 시도해주세요."
            );
          }
        );
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }, [
    selectedQuestion,
    scriptDetail,
    targetLevel,
    regenerateStory,
    queryClient,
  ]);

  // ── 확정 → Step 5 ──
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (!generatedScriptId) return;

    setIsConfirming(true);
    try {
      const result = await confirmScript({ script_id: generatedScriptId });
      if (result.error) {
        setError(result.error);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["my-scripts"] });
      queryClient.invalidateQueries({
        queryKey: ["script-detail", generatedScriptId],
      });
      queryClient.invalidateQueries({ queryKey: ["script-credit"] });
      setStep(5);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsConfirming(false);
    }
  }, [generatedScriptId, queryClient]);

  // ── 위저드 리셋 (새 스크립트 만들기) ──
  const resetWizard = useCallback(() => {
    setStep(1);
    setSelectedCategory(null);
    setSelectedTopic(null);
    setSelectedQuestion(null);
    setUserInput("");
    setGeneratedScriptId(null);
    setError(null);
    setRefinePrompt("");
    setRegenerateStory("");
  }, []);

  // 목표 등급 미설정 → 등급 설정 모달 표시
  if (!targetGrade) {
    return (
      <GradeSettingModal
        initialCurrentGrade={currentGrade}
        initialTargetGrade={targetGrade}
        onClose={() => router.push("/scripts")}
        onSaved={() => window.location.reload()}
      />
    );
  }

  // opic_tips 필터용 question_type
  const questionType =
    selectedQuestion?.question_type || scriptDetail?.question_type || undefined;

  return (
    <div className="flex h-0 flex-grow flex-col md:h-auto md:flex-1">
      {/* ── 단계 표시 (5단계) ── */}
      <div className="border-b border-border bg-surface px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-1.5 sm:gap-3">
          {WIZARD_STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1.5 sm:gap-3">
              <div className="flex items-center gap-1.5">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    i + 1 < step
                      ? "bg-green-500 text-white"
                      : i + 1 === step
                        ? "bg-primary-500 text-white"
                        : "border border-border bg-surface-secondary text-foreground-muted"
                  }`}
                >
                  {i + 1 < step ? <Check size={14} /> : i + 1}
                </div>
                <span
                  className={`hidden text-xs sm:inline ${
                    i + 1 === step
                      ? "font-medium text-foreground"
                      : i + 1 < step
                        ? "text-green-600"
                        : "text-foreground-muted"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < WIZARD_STEPS.length - 1 && (
                <div className="h-px w-4 bg-border sm:w-8" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 크레딧 표시 ── */}
      {creditInfo && step <= 2 && (
        <div className="border-b border-border bg-surface-secondary/50 px-4 py-2 text-center text-xs text-foreground-muted">
          스크립트 생성권:{" "}
          <span className="font-semibold text-primary-500">
            {creditInfo.totalCredits}회
          </span>{" "}
          남음
          {creditInfo.planCredits > 0 && (
            <span className="ml-1">
              (플랜 {creditInfo.planCredits} + 횟수권{" "}
              {creditInfo.permanentCredits})
            </span>
          )}
        </div>
      )}

      {/* ── 에러 표시 ── */}
      {error && (
        <div className="mx-auto mt-4 max-w-3xl px-4">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        </div>
      )}

      {/* ── 콘텐츠 영역 (스크롤) ── */}
      <div className="mx-auto w-full max-w-3xl h-0 flex-grow overflow-y-auto px-4 py-6 sm:px-6 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden md:h-auto md:flex-1">
        {step === 1 && (
          <Step1Selection
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
            selectedTopic={selectedTopic}
            onSelectTopic={handleTopicSelect}
            onSelectQuestion={handleQuestionSelect}
          />
        )}

        {step === 2 && (
          <Step2Input
            question={selectedQuestion!}
            targetLevel={targetLevel}
            onTargetLevelChange={setTargetLevel}
            userInput={userInput}
            onUserInputChange={setUserInput}
            isGenerating={isGenerating}
            hasCredit={creditInfo?.hasCredit ?? false}
            onBack={() => setStep(1)}
            onGenerate={handleGenerate}
          />
        )}

        {step === 3 && (
          <Step3Loading
            targetLevel={targetLevel}
            questionType={questionType}
          />
        )}

        {step === 4 && (
          <Step4Result
            detail={scriptDetail as ScriptDetail | null | undefined}
            isLoading={isLoadingDetail}
            refinePrompt={refinePrompt}
            onRefinePromptChange={setRefinePrompt}
            isRefining={isRefining}
            onRefine={handleRefine}
          />

        )}

        {step === 5 && (
          <Step5Complete
            onGoToScripts={() => router.push("/scripts")}
            onCreateNew={resetWizard}
            scriptId={generatedScriptId ?? undefined}
            targetLevel={targetLevel}
            questionType={questionType}
          />
        )}
      </div>

      {/* ── Step 4 하단 액션 바 (스크롤 밖 고정) ── */}
      {step === 4 && scriptDetail && (
        <div className="border-t border-border bg-surface px-4 py-3 sm:px-6 sm:py-4">
          <div className="mx-auto max-w-3xl">
            {scriptDetail.status !== "confirmed" ? (
              /* 초안: 재생성 + 확정 */
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={openRegenerateModal}
                  className="inline-flex items-center gap-1.5 text-sm text-foreground-secondary hover:text-foreground"
                >
                  <RotateCcw size={14} />
                  재생성 (1크레딧)
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isConfirming}
                  className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-lg)] bg-green-600 px-5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                  {isConfirming ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  스크립트 확정
                </button>
              </div>
            ) : (
              /* 확정: 패키지 생성 / 쉐도잉 / 내 스크립트 */
              <div className="flex flex-wrap items-center justify-center gap-3">
                {scriptDetail.package?.status === "completed" && (
                  <Link
                    href={`/scripts/shadowing?packageId=${scriptDetail.package.id}&scriptId=${scriptDetail.id}`}
                    className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 px-5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
                  >
                    <Headphones size={16} />
                    쉐도잉 훈련
                  </Link>
                )}
                {!scriptDetail.package && (
                  <button
                    onClick={() => setStep(5)}
                    className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 px-5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
                  >
                    <Package size={16} />
                    패키지 생성
                  </button>
                )}
                {scriptDetail.package && scriptDetail.package.status !== "completed" && scriptDetail.package.status !== "failed" && (
                  <span className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-lg)] bg-surface-secondary px-5 text-sm font-medium text-foreground-secondary">
                    <Loader2 size={16} className="animate-spin" />
                    패키지 생성중 {scriptDetail.package.progress}%
                  </span>
                )}
                {scriptDetail.package?.status === "failed" && (
                  <button
                    onClick={() => setStep(5)}
                    className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 px-5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
                  >
                    <RotateCcw size={16} />
                    패키지 재생성
                  </button>
                )}
                <Link
                  href="/scripts"
                  className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-lg)] border border-border bg-surface px-5 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary"
                >
                  <FileText size={14} />
                  내 스크립트
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 재생성 확인 모달 ── */}
      {showRegenerateModal && (
        <RegenerateModal
          story={regenerateStory}
          onStoryChange={setRegenerateStory}
          isGenerating={isGenerating}
          hasCredit={creditInfo?.hasCredit ?? false}
          onConfirm={handleRegenerate}
          onClose={() => setShowRegenerateModal(false)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Step 1: 카테고리 → 주제 → 질문 선택
   ══════════════════════════════════════════════════════════════ */

const CATEGORIES = [
  { value: "일반", Icon: Coffee, desc: "일상·습관·선호", questions: "2~10번 문제" },
  { value: "롤플레이", Icon: Clapperboard, desc: "상황극·문제해결", questions: "11~13번 문제" },
  { value: "어드밴스", Icon: Lightbulb, desc: "비교·변화·의견", questions: "14~15번 문제" },
] as const;

function Step1Selection({
  selectedCategory,
  onSelectCategory,
  selectedTopic,
  onSelectTopic,
  onSelectQuestion,
}: {
  selectedCategory: string | null;
  onSelectCategory: (cat: string) => void;
  selectedTopic: string | null;
  onSelectTopic: (topic: string) => void;
  onSelectQuestion: (sq: SelectedQuestion) => void;
}) {
  return (
    <div className="space-y-6">
      {/* ① 카테고리 선택 (카드형 UI) */}
      <div>
        <h3 className="text-sm font-semibold text-foreground">카테고리</h3>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => onSelectCategory(cat.value)}
                className={`flex flex-col items-center gap-1 rounded-[var(--radius-lg)] px-3 py-3 transition-all ${
                  isSelected
                    ? "border-2 border-primary-500 bg-primary-50/60 shadow-sm"
                    : "border border-border bg-surface hover:border-primary-300 hover:bg-primary-50/30"
                }`}
              >
                <cat.Icon
                  size={20}
                  className={
                    isSelected ? "text-primary-600" : "text-foreground-muted"
                  }
                />
                <span
                  className={`text-sm font-semibold ${
                    isSelected ? "text-primary-700" : "text-foreground"
                  }`}
                >
                  {cat.value}
                </span>
                <span className="text-[11px] text-foreground-muted">
                  {cat.questions}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ② 주제 선택 */}
      {selectedCategory && (
        <div>
          <h3 className="text-sm font-semibold text-foreground">주제 선택</h3>
          <div className="mt-3">
            <TopicPagination
              category={
                selectedCategory as "일반" | "롤플레이" | "어드밴스"
              }
              selectedTopic={selectedTopic}
              onSelectTopic={onSelectTopic}
            />
          </div>
        </div>
      )}

      {/* ③ 질문 선택 */}
      {selectedTopic && selectedCategory && (
        <div>
          <h3 className="text-sm font-semibold text-foreground">질문 선택</h3>
          <div className="mt-3">
            <QuestionSelector
              topic={selectedTopic}
              category={
                selectedCategory as "일반" | "롤플레이" | "어드밴스"
              }
              questionCount={1}
              selectedQuestions={[]}
              onSelect={onSelectQuestion}
              onRemove={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Step 2: 입력 + 등급 선택
   ══════════════════════════════════════════════════════════════ */

function Step2Input({
  question,
  targetLevel,
  onTargetLevelChange,
  userInput,
  onUserInputChange,
  isGenerating,
  hasCredit,
  onBack,
  onGenerate,
}: {
  question: QuestionOption;
  targetLevel: TargetLevel;
  onTargetLevelChange: (level: TargetLevel) => void;
  userInput: string;
  onUserInputChange: (v: string) => void;
  isGenerating: boolean;
  hasCredit: boolean;
  onBack: () => void;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* 선택된 질문 */}
      <div className="rounded-[var(--radius-lg)] border border-primary-200 bg-primary-50/30 p-4">
        <p className="text-sm font-medium text-foreground">
          {question.question_english}
        </p>
        <p className="mt-1 text-xs text-foreground-secondary">
          {question.question_korean}
        </p>
      </div>

      {/* 목표 등급 */}
      <div>
        <label className="text-sm font-semibold text-foreground">
          목표 등급
        </label>
        <div className="mt-2 grid grid-cols-6 gap-1.5 sm:gap-2">
          {TARGET_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => onTargetLevelChange(level)}
              className={`rounded-lg py-1.5 text-xs font-medium transition-colors sm:rounded-full sm:py-1.5 sm:text-sm ${
                targetLevel === level
                  ? "bg-primary-500 text-white"
                  : "border border-border bg-surface text-foreground-secondary hover:border-primary-300"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* 입력 */}
      <div>
        <label className="text-sm font-semibold text-foreground">
          내 경험 (한국어)
        </label>
        <p className="mt-1 text-xs text-foreground-muted">
          키워드나 간단한 경험을 한국어로 입력하세요 (선택사항)
        </p>
        <textarea
          value={userInput}
          onChange={(e) => onUserInputChange(e.target.value)}
          placeholder="집 근처 공원에 자주 가요. 주말에 산책하면서 쉬는 걸 좋아해요."
          rows={5}
          className="mt-2 w-full rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          maxLength={2000}
        />
        <div className="mt-1 text-right text-xs text-foreground-muted">
          {userInput.length}/2000자
        </div>
      </div>

      {/* 액션 */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-foreground-secondary hover:text-foreground"
        >
          <ArrowLeft size={14} />
          이전
        </button>

        <button
          onClick={onGenerate}
          disabled={isGenerating || !hasCredit}
          className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 px-5 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              AI 스크립트 생성
            </>
          )}
        </button>
      </div>

      {!hasCredit && (
        <p className="text-center text-xs text-red-500">
          스크립트 생성권이 없습니다. 스토어에서 구매해주세요.
        </p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Step 3: AI 생성 중 + 학습 콘텐츠 카드 로테이션
   ══════════════════════════════════════════════════════════════ */

// 카테고리별 Lucide 아이콘 컴포넌트
const TIP_CATEGORY_ICONS: Record<OpicTipCategory, typeof MessageCircleHeart> = {
  opening: MessageCircleHeart,
  filler: Repeat2,
  pattern: BookOpenText,
  emotion: Heart,
  tip: GraduationCap,
};

const TIP_CATEGORY_LABELS: Record<OpicTipCategory, string> = {
  opening: "만능 도입",
  filler: "필러 표현",
  pattern: "유형별 패턴",
  emotion: "감정 표현",
  tip: "등급 팁",
};

// 타이틀에서 카테고리 접두사 제거 ("감정 — 즐거움" → "즐거움")
function stripCategoryPrefix(title: string): string {
  const idx = title.indexOf("—");
  if (idx === -1) return title;
  return title.slice(idx + 1).trim();
}

// 설명에서 "한국어 뜻" 부분과 해설 분리
function parseDescription(desc: string): { korean: string; note: string } {
  const quoteMatch = desc.match(/^["""](.+?)["""][\s—\-]+(.+)$/);
  if (quoteMatch) return { korean: quoteMatch[1], note: quoteMatch[2] };
  const dashMatch = desc.match(/^(.+?)[\s]—[\s](.+)$/);
  if (dashMatch) return { korean: dashMatch[1], note: dashMatch[2] };
  return { korean: "", note: desc };
}

/** 팁 카드 (Step 3 / Step 5 공통) */
function TipCard({
  tip,
  tipList,
  tipIndex,
  onPrev,
  onNext,
}: {
  tip: OpicTip;
  tipList: OpicTip[];
  tipIndex: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const shortTitle = stripCategoryPrefix(tip.title);
  const parsed = tip.description ? parseDescription(tip.description) : null;
  const CategoryIcon = TIP_CATEGORY_ICONS[tip.category];

  return (
    <div className="mt-8 w-full max-w-lg">
      {/* 화살표 + 카드 가로 배치 */}
      <div className="flex items-center gap-2">
        {/* 좌 화살표 */}
        {tipList.length > 1 ? (
          <button
            onClick={onPrev}
            className="shrink-0 rounded-full border border-border bg-surface p-1.5 text-foreground-muted shadow-sm transition-colors hover:bg-surface-secondary hover:text-foreground"
          >
            <ChevronLeft size={16} />
          </button>
        ) : (
          <div className="w-[30px] shrink-0" />
        )}

        {/* 카드 */}
        <div className="min-w-0 flex-1 overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface shadow-sm">
          {/* 상단 카테고리 바 */}
          <div className="flex items-center justify-between border-b border-border bg-primary-50/50 px-4 py-2">
            <div className="flex items-center gap-1.5">
              <CategoryIcon size={14} className="text-primary-500" />
              <span className="text-[12px] font-semibold text-primary-700">
                {TIP_CATEGORY_LABELS[tip.category]}
              </span>
              <span className="text-[11px] text-foreground-muted">
                {shortTitle}
              </span>
            </div>
            <span className="text-[11px] tabular-nums text-foreground-muted">
              {tipIndex + 1}/{tipList.length}
            </span>
          </div>

          {/* 본문 */}
          <div className="px-4 py-3.5">
            <p className="text-[15px] font-semibold leading-relaxed text-foreground">
              {tip.expression}
            </p>

            {parsed && (
              <div className="mt-2.5 rounded-lg bg-primary-50/40 px-3 py-2">
                {parsed.korean && (
                  <p className="text-[13px] font-medium text-primary-600">
                    {parsed.korean}
                  </p>
                )}
                {parsed.note && (
                  <p className="mt-0.5 text-[11px] leading-relaxed text-foreground-secondary">
                    {parsed.note}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 우 화살표 */}
        {tipList.length > 1 ? (
          <button
            onClick={onNext}
            className="shrink-0 rounded-full border border-border bg-surface p-1.5 text-foreground-muted shadow-sm transition-colors hover:bg-surface-secondary hover:text-foreground"
          >
            <ChevronRight size={16} />
          </button>
        ) : (
          <div className="w-[30px] shrink-0" />
        )}
      </div>
    </div>
  );
}

function Step3Loading({
  targetLevel,
  questionType,
}: {
  targetLevel: string;
  questionType?: string;
}) {
  const [tipIndex, setTipIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  // opic_tips 조회
  const { data: tips } = useQuery({
    queryKey: ["opic-tips", targetLevel, questionType],
    queryFn: async () => {
      const result = await getOpicTips(targetLevel, questionType);
      if (result.error) return [];
      return result.data ?? [];
    },
    staleTime: Infinity,
  });

  const tipList = tips ?? [];

  // 5초 자동 전환
  useEffect(() => {
    if (tipList.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tipList.length);
    }, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tipList.length]);

  const goToPrev = () => {
    if (tipList.length <= 1) return;
    setTipIndex((prev) => (prev - 1 + tipList.length) % tipList.length);
    // 수동 조작 시 타이머 리셋
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tipList.length);
    }, 5000);
  };

  const goToNext = () => {
    if (tipList.length <= 1) return;
    setTipIndex((prev) => (prev + 1) % tipList.length);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tipList.length);
    }, 5000);
  };

  const currentTip: OpicTip | undefined = tipList[tipIndex];

  return (
    <div className="flex flex-col items-center justify-center py-8">
      {/* 스피너 + 메시지 */}
      <div className="relative mb-8">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary-100 border-t-primary-500" />
        <Sparkles
          size={24}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-500"
        />
      </div>
      <p className="text-sm font-medium text-foreground">
        나만의 스크립트를 만들고 있어요...
      </p>
      <p className="mt-1 text-xs text-foreground-muted">약 15~30초 소요</p>

      {/* 학습 팁 카드 */}
      {currentTip && (
        <TipCard
          tip={currentTip}
          tipList={tipList}
          tipIndex={tipIndex}
          onPrev={goToPrev}
          onNext={goToNext}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Step 4: 결과 확인 (4계층 렌더링 + 수정/재생성/확정)
   ══════════════════════════════════════════════════════════════ */

function Step4Result({
  detail,
  isLoading,
  refinePrompt,
  onRefinePromptChange,
  isRefining,
  onRefine,
}: {
  detail?: ScriptDetail | null;
  isLoading: boolean;
  refinePrompt: string;
  onRefinePromptChange: (v: string) => void;
  isRefining: boolean;
  onRefine: () => void;
}) {
  const [viewTab, setViewTab] = useState<"script" | "expressions">("script");
  const [scriptMode, setScriptMode] = useState<
    "both" | "en" | "ko" | "split"
  >("both");

  // viewId로 진입했으나 아직 로딩 중
  if (isLoading || !detail) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-primary-500" />
        <p className="mt-3 text-sm text-foreground-secondary">
          스크립트를 불러오고 있습니다...
        </p>
      </div>
    );
  }

  // EF 처리 중 (english_text 비어있음) — viewId로 직접 진입한 경우
  if (!detail.english_text) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-primary-500" />
        <p className="mt-3 text-sm text-foreground-secondary">
          AI가 스크립트를 생성하고 있습니다...
        </p>
      </div>
    );
  }

  const isConfirmed = detail.status === "confirmed";
  const canRefine = !isConfirmed && detail.refine_count < 3;

  // paragraphs 4계층 구조 확인
  const hasParagraphs =
    detail.paragraphs &&
    "paragraphs" in detail.paragraphs &&
    Array.isArray(detail.paragraphs.paragraphs) &&
    detail.paragraphs.paragraphs.length > 0;

  const paragraphs = hasParagraphs
    ? detail.paragraphs!.paragraphs
    : undefined;
  const fullTextEnglish =
    detail.paragraphs?.full_text?.english || detail.english_text;
  const fullTextKorean =
    detail.paragraphs?.full_text?.korean || detail.korean_translation;

  return (
    <div className="space-y-4">
      {/* 메타 바 */}
      <div className="flex flex-wrap items-center gap-2">
        {detail.target_level && (
          <span className="inline-flex items-center rounded-full bg-primary-500 px-2.5 py-1 text-xs font-semibold text-white">
            {detail.target_level}
          </span>
        )}
        {detail.question_type && (
          <span className="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
            {QUESTION_TYPE_LABELS[detail.question_type] || detail.question_type}
          </span>
        )}
        {detail.word_count && (
          <span className="ml-auto inline-flex items-center rounded-full bg-surface-secondary px-2.5 py-1 text-xs font-medium text-foreground-secondary">
            {detail.word_count} words
          </span>
        )}
        {isConfirmed && (
          <div className="ml-auto flex items-center gap-1.5 text-xs font-medium text-green-600">
            <CheckCircle2 size={14} />
            확정됨
          </div>
        )}
        {detail.refine_count > 0 && !isConfirmed && (
          <span className="text-xs text-foreground-muted">
            수정 {detail.refine_count}/3회
          </span>
        )}
      </div>

      {/* 질문 카드 */}
      {(detail.question_english || detail.question_korean) && (
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3.5">
          <div className="mb-1 text-[11px] font-medium text-foreground-muted">
            질문
          </div>
          {detail.question_english && (
            <div className="text-sm font-medium leading-snug text-foreground">
              {detail.question_english}
            </div>
          )}
          {detail.question_korean && (
            <div className="mt-1 text-xs text-foreground-secondary">
              {detail.question_korean}
            </div>
          )}
        </div>
      )}

      {/* 보기 모드 탭 (2탭) */}
      <div className="flex gap-1 rounded-[10px] bg-surface-secondary p-[3px]">
        {(
          [
            { key: "script" as const, label: "스크립트" },
            { key: "expressions" as const, label: "핵심 정리" },
          ]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setViewTab(key)}
            className={`flex-1 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
              viewTab === key
                ? "bg-surface text-foreground shadow-sm"
                : "text-foreground-secondary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 스크립트 탭 */}
      {viewTab === "script" && (
        <>
          {/* 보기 옵션 세그먼트 컨트롤 */}
          <div className="flex gap-0.5 rounded-lg border border-border bg-surface-secondary p-[3px]">
            {(
              [
                { key: "both" as const, label: "영/한", Icon: Languages },
                { key: "en" as const, label: "EN", Icon: CaseSensitive },
                { key: "ko" as const, label: "한글", Icon: Type },
                { key: "split" as const, label: "구분", Icon: Columns2 },
              ] as const
            ).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setScriptMode(key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-all ${
                  scriptMode === key
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-foreground-muted hover:text-foreground-secondary"
                }`}
              >
                <Icon size={14} className={scriptMode === key ? "text-primary-500" : ""} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* 스크립트 콘텐츠 */}
          {hasParagraphs ? (
            <ScriptRenderer paragraphs={paragraphs!} mode={scriptMode} />
          ) : (
            <ScriptFlatText
              englishText={detail.english_text}
              koreanTranslation={detail.korean_translation}
              mode={scriptMode}
            />
          )}
        </>
      )}

      {/* 핵심 정리 탭 */}
      {viewTab === "expressions" && (
        <ScriptSummaryView
          fullTextEnglish={fullTextEnglish}
          paragraphs={paragraphs}
          keyExpressions={detail.paragraphs?.key_expressions || detail.key_expressions}
          reusablePatterns={detail.paragraphs?.reusable_patterns}
          connectors={detail.paragraphs?.connectors}
          fillers={detail.paragraphs?.fillers}
        />
      )}

      {/* 수정 요청 */}
      {canRefine && (
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5">
          <h3 className="text-sm font-semibold text-foreground">
            수정 요청{" "}
            <span className="font-normal text-foreground-muted">
              ({detail.refine_count}/3회 사용)
            </span>
          </h3>
          <textarea
            value={refinePrompt}
            onChange={(e) => onRefinePromptChange(e.target.value)}
            placeholder="수정하고 싶은 부분을 입력하세요 (예: 두 번째 문장을 더 자연스럽게 바꿔줘)"
            rows={3}
            className="mt-2 w-full rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            maxLength={500}
          />
          <button
            onClick={onRefine}
            disabled={isRefining || !refinePrompt.trim()}
            className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-lg)] bg-surface-secondary px-3 text-xs font-medium text-foreground-secondary transition-colors hover:bg-primary-50 hover:text-primary-600 disabled:opacity-50"
          >
            {isRefining ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            수정 요청
          </button>
        </div>
      )}

      {/* 액션 버튼은 부모(ScriptWizard)의 스크롤 밖 고정 영역에서 렌더링 */}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Step 5: 완료 화면
   ══════════════════════════════════════════════════════════════ */

function Step5Complete({
  onGoToScripts,
  onCreateNew,
  scriptId,
  targetLevel,
  questionType,
}: {
  onGoToScripts: () => void;
  onCreateNew: () => void;
  scriptId?: string;
  targetLevel: string;
  questionType?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedVoice, setSelectedVoice] = useState<TtsVoice>("Zephyr");
  const [packageState, setPackageState] = useState<
    "idle" | "phase1" | "phase2" | "completed" | "partial" | "error"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [packageId, setPackageId] = useState<string | null>(null);

  // 팁 데이터 (패키지 생성 대기 중 표시)
  const [tipIndex, setTipIndex] = useState(0);
  const tipIntervalRef = useRef<ReturnType<typeof setInterval>>(null);

  const { data: tips } = useQuery({
    queryKey: ["opic-tips", targetLevel, questionType],
    queryFn: async () => {
      const result = await getOpicTips(targetLevel, questionType);
      if (result.error) return [];
      return result.data ?? [];
    },
    staleTime: Infinity,
  });

  const tipList = tips ?? [];

  // 패키지 생성 중일 때만 팁 자동 전환
  useEffect(() => {
    if (packageState !== "phase1" && packageState !== "phase2") return;
    if (tipList.length <= 1) return;
    tipIntervalRef.current = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tipList.length);
    }, 5000);
    return () => {
      if (tipIntervalRef.current) clearInterval(tipIntervalRef.current);
    };
  }, [packageState, tipList.length]);

  // 시뮬레이션 프로그레스 (20% → 85%까지 점진 증가, 완료 시 100%로 점프)
  useEffect(() => {
    if (packageState !== "phase1" && packageState !== "phase2") return;
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) return prev;
        return Math.min(85, prev + Math.random() * 4 + 1);
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [packageState]);

  async function handleCreatePackage() {
    if (!scriptId) return;
    setPackageState("phase1");
    setProgress(20);
    setErrorMsg("");

    try {
      const result = await createPackage({
        script_id: scriptId,
        tts_voice: selectedVoice,
      });

      if (result.error) {
        setPackageState("error");
        setErrorMsg(result.error);
        return;
      }

      setPackageId(result.data!.packageId);
      setProgress(100);
      setPackageState("completed");
      queryClient.invalidateQueries({ queryKey: ["my-scripts"] });
      queryClient.invalidateQueries({ queryKey: ["script-detail", scriptId] });
    } catch {
      setPackageState("error");
      setErrorMsg("패키지 생성 중 오류가 발생했습니다");
    }
  }

  // 패키지 생성 전 (idle)
  if (packageState === "idle") {
    return (
      <div className="flex flex-col items-center justify-center py-8 sm:py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 sm:h-16 sm:w-16">
          <CheckCircle2 size={28} className="text-green-600 sm:hidden" />
          <CheckCircle2 size={32} className="hidden text-green-600 sm:block" />
        </div>
        <h2 className="mt-3 text-base font-semibold text-foreground sm:mt-4 sm:text-lg">
          스크립트가 확정되었습니다!
        </h2>
        <p className="mt-1.5 text-center text-xs text-foreground-secondary sm:mt-2 sm:text-sm">
          원어민 음성 패키지를 생성하면 쉐도잉 훈련을 시작할 수 있습니다.
        </p>

        {/* 음성 선택 */}
        <div className="mt-5 w-full max-w-xs sm:mt-6">
          <p className="mb-2 text-center text-xs font-medium text-foreground-secondary">
            원어민 음성 선택
          </p>
          <div className="flex gap-2">
            {TTS_VOICES.map((voice) => (
              <button
                key={voice}
                onClick={() => setSelectedVoice(voice)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-lg)] border px-3 py-2 text-xs font-medium transition-colors sm:py-2.5 sm:text-sm ${
                  selectedVoice === voice
                    ? "border-primary-400 bg-primary-50 text-primary-600"
                    : "border-border bg-surface text-foreground-secondary hover:border-primary-200"
                }`}
              >
                <Volume2 size={14} />
                {TTS_VOICE_LABELS[voice]}
              </button>
            ))}
          </div>
        </div>

        {/* 패키지 생성 버튼 */}
        <button
          onClick={handleCreatePackage}
          disabled={!scriptId}
          className="mt-4 flex h-9 w-full max-w-xs items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50 sm:mt-5 sm:h-10 sm:w-auto sm:px-6"
        >
          <Package size={16} />
          패키지 생성 (음성 + 쉐도잉)
        </button>

        <div className="mt-4 flex gap-3 sm:mt-6">
          <button
            onClick={onGoToScripts}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-lg)] border border-border bg-surface px-3 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary sm:h-9 sm:px-4"
          >
            <FileText size={13} />
            내 스크립트
          </button>
          <button
            onClick={onCreateNew}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-lg)] border border-border bg-surface px-3 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary sm:h-9 sm:px-4"
          >
            <Sparkles size={13} />
            새 스크립트
          </button>
        </div>
      </div>
    );
  }

  // 패키지 생성 중 (phase1/phase2)
  if (packageState === "phase1" || packageState === "phase2") {
    const currentTip = tipList[tipIndex] as OpicTip | undefined;

    const goTipPrev = () => {
      if (tipList.length <= 1) return;
      setTipIndex((prev) => (prev - 1 + tipList.length) % tipList.length);
      if (tipIntervalRef.current) clearInterval(tipIntervalRef.current);
      tipIntervalRef.current = setInterval(() => {
        setTipIndex((prev) => (prev + 1) % tipList.length);
      }, 5000);
    };

    const goTipNext = () => {
      if (tipList.length <= 1) return;
      setTipIndex((prev) => (prev + 1) % tipList.length);
      if (tipIntervalRef.current) clearInterval(tipIntervalRef.current);
      tipIntervalRef.current = setInterval(() => {
        setTipIndex((prev) => (prev + 1) % tipList.length);
      }, 5000);
    };

    return (
      <div className="flex flex-col items-center justify-center py-6 sm:py-8">
        {/* 브랜드 스피너 */}
        <div className="relative mb-5 sm:mb-6">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary-100 border-t-primary-500 sm:h-16 sm:w-16" />
          <Headphones
            size={20}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-500 sm:hidden"
          />
          <Headphones
            size={24}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-500 max-sm:hidden"
          />
        </div>

        <p className="text-sm font-medium text-foreground sm:text-base">
          원어민 음성을 준비하고 있어요...
        </p>
        <p className="mt-1 text-xs text-foreground-muted sm:mt-1.5">약 30~60초 소요</p>

        {/* 프로그레스 바 */}
        <div className="mt-4 w-full max-w-xs sm:mt-5">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary sm:h-2">
            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-1000"
              style={{ width: `${Math.round(progress)}%` }}
            />
          </div>
          <p className="mt-1.5 text-center text-xs text-foreground-muted">
            {Math.round(progress)}%
          </p>
        </div>

        {/* 학습 팁 카드 */}
        {currentTip && (
          <TipCard
            tip={currentTip}
            tipList={tipList}
            tipIndex={tipIndex}
            onPrev={goTipPrev}
            onNext={goTipNext}
            />
        )}
      </div>
    );
  }

  // 에러
  if (packageState === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-8 sm:py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 sm:h-16 sm:w-16">
          <AlertTriangle size={28} className="text-red-500 sm:hidden" />
          <AlertTriangle size={32} className="hidden text-red-500 sm:block" />
        </div>
        <h2 className="mt-3 text-base font-semibold text-foreground sm:mt-4 sm:text-lg">
          패키지 생성 실패
        </h2>
        <p className="mt-1.5 text-center text-xs text-red-500 sm:mt-2 sm:text-sm">{errorMsg}</p>

        <div className="mt-5 flex gap-2.5 sm:mt-6 sm:gap-3">
          <button
            onClick={() => setPackageState("idle")}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-lg)] border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-secondary sm:h-10 sm:gap-2 sm:px-5 sm:text-sm"
          >
            <RotateCcw size={14} className="sm:hidden" />
            <RotateCcw size={16} className="hidden sm:block" />
            다시 시도
          </button>
          <button
            onClick={onGoToScripts}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-lg)] border border-border bg-surface px-3 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary sm:h-10 sm:gap-2 sm:px-5 sm:text-sm"
          >
            <FileText size={13} className="sm:hidden" />
            <FileText size={16} className="hidden sm:block" />
            내 스크립트
          </button>
        </div>
      </div>
    );
  }

  // 완료 (completed / partial)
  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-12">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 sm:h-16 sm:w-16">
        <CheckCircle2 size={28} className="text-green-600 sm:hidden" />
        <CheckCircle2 size={32} className="hidden text-green-600 sm:block" />
      </div>
      <h2 className="mt-3 text-base font-semibold text-foreground sm:mt-4 sm:text-lg">
        패키지가 생성되었습니다!
      </h2>
      <p className="mt-1.5 text-center text-xs text-foreground-secondary sm:mt-2 sm:text-sm">
        이제 쉐도잉 훈련을 시작할 수 있습니다.
      </p>

      <div className="mt-5 flex w-full flex-col items-center gap-2.5 sm:mt-8 sm:w-auto sm:flex-row sm:gap-3">
        {packageId && (
          <button
            onClick={() =>
              router.push(
                `/scripts/shadowing?packageId=${packageId}&scriptId=${scriptId}`
              )
            }
            className="flex h-9 w-full max-w-xs items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 text-sm font-medium text-white transition-colors hover:bg-primary-600 sm:h-10 sm:w-auto sm:px-5"
          >
            <Headphones size={16} />
            쉐도잉 훈련 시작
          </button>
        )}
        <div className="flex gap-2.5 sm:gap-3">
          <button
            onClick={onGoToScripts}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-lg)] border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-secondary sm:h-10 sm:gap-2 sm:px-5 sm:text-sm"
          >
            <FileText size={13} className="sm:hidden" />
            <FileText size={16} className="hidden sm:block" />
            내 스크립트
          </button>
          <button
            onClick={onCreateNew}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-lg)] border border-border bg-surface px-3 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary sm:h-10 sm:gap-2 sm:px-5 sm:text-sm"
          >
            <Sparkles size={13} className="sm:hidden" />
            <Sparkles size={14} className="hidden sm:block" />
            새 스크립트
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   재생성 확인 모달
   ══════════════════════════════════════════════════════════════ */

function RegenerateModal({
  story,
  onStoryChange,
  isGenerating,
  hasCredit,
  onConfirm,
  onClose,
}: {
  story: string;
  onStoryChange: (v: string) => void;
  isGenerating: boolean;
  hasCredit: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-[var(--radius-xl)] bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">
              스크립트 재생성
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-foreground-muted hover:bg-surface-secondary hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mt-3 text-xs text-foreground-secondary">
          현재 스크립트가 삭제되고 새로 생성됩니다.{" "}
          <span className="font-semibold text-primary-600">1크레딧</span>이
          차감됩니다.
        </p>

        <div className="mt-4">
          <label className="text-xs font-medium text-foreground">
            내 경험 수정 (선택)
          </label>
          <textarea
            value={story}
            onChange={(e) => onStoryChange(e.target.value)}
            placeholder="기존 스토리를 수정하거나 비워두세요"
            rows={4}
            className="mt-1.5 w-full rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            maxLength={2000}
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 rounded-[var(--radius-lg)] px-4 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={isGenerating || !hasCredit}
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-lg)] bg-primary-500 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RotateCcw size={14} />
            )}
            재생성 (1크레딧)
          </button>
        </div>

        {!hasCredit && (
          <p className="mt-2 text-center text-xs text-red-500">
            스크립트 생성권이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
