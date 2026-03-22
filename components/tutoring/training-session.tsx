"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ChevronRight,
  CheckCircle2,
  Target,
  BookOpen,
  Timer,
  Wrench,
  Trophy,
  ArrowRight,
  AlertTriangle,
  Lightbulb,
  Headphones,
  Shuffle,
  Volume2,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  createTrainingSession,
  saveAttempt,
  completeTrainingSession,
} from "@/lib/actions/tutoring";
import { createClient } from "@/lib/supabase";

// ── 타입 ──

type ScreenId = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface SessionBrief {
  session_goal: string;
  weaknesses: string[];
  forbidden_habit: string;
  success_criteria: Array<{ criteria: string; met: boolean }>;
  estimated_minutes: number;
}

interface WarmupData {
  question: { id: string; english: string; korean: string };
  model_answer: string;
  sentences: Array<{
    english: string;
    korean: string;
    keywords: string[];
  }>;
  rhythm_tips: string[];
  key_expressions: string[];
}

interface VariationCard {
  question: { id: string; english: string; korean: string };
  variation_type: string;
  instruction: string;
  forced_mission: {
    connector: string;
    detail_prompt: string;
  };
  time_limit_seconds: number;
  example_starter: string;
}

interface TransformationCard {
  original: string;
  transform_type: string;
  instruction: string;
  expected_pattern: string;
  time_limit_seconds: number;
}

interface VariationData {
  variation_cards: VariationCard[];
}

interface TransformationData {
  transformation_cards: TransformationCard[];
}

interface EPPData {
  question: { id: string; english: string; korean: string };
  epp_cards: Array<{
    template: string;
    korean_hint: string;
    slots: string[];
  }>;
  required_connectors: string[];
  forbidden_patterns: string[];
  tip: string;
}

interface TimedEvaluation {
  block_checklist: Record<string, { met: boolean; comment: string }>;
  structure_score: number;
  content_score: number;
  time_management: string;
  grammar_issues: Array<{ original: string; corrected: string; rule: string }>;
  strengths: string[];
  improvements: string[];
  overall_comment: string;
  passed: boolean;
}

interface SessionRecap {
  best_improvement: string;
  next_focus: string;
  kpi_summary: string;
  encouragement: string;
  next_recommendation: { type: string; reason: string };
}

// ── 상수 ──

const SCREENS: { id: ScreenId; label: string; icon: React.ComponentType<{ size: number; className?: string }> }[] = [
  { id: 0, label: "브리프", icon: Target },
  { id: 1, label: "워밍업", icon: Headphones },
  { id: 2, label: "EPP 패턴", icon: BookOpen },
  { id: 3, label: "변형 훈련", icon: Shuffle },
  { id: 4, label: "타임드 실전", icon: Timer },
  { id: 5, label: "Self-repair", icon: Wrench },
  { id: 6, label: "리캡", icon: Trophy },
];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// EF 호출 헬퍼
async function callTutoringEF(action: string, params: Record<string, unknown>) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || SUPABASE_ANON_KEY;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/tutoring`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...params }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "EF 호출 실패" }));
    throw new Error(err.error || `EF error ${res.status}`);
  }
  return res.json();
}

// ============================================================
// 메인 컴포넌트
// ============================================================

export function TrainingSession({
  prescriptionId,
}: {
  prescriptionId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [trainingSessionId, setTrainingSessionId] = useState<string | null>(null);
  const [currentScreen, setCurrentScreen] = useState<ScreenId>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Screen 데이터
  const [brief, setBrief] = useState<SessionBrief | null>(null);
  const [warmupData, setWarmupData] = useState<WarmupData | null>(null);
  const [eppData, setEppData] = useState<EPPData | null>(null);
  const [variationData, setVariationData] = useState<VariationData | null>(null);
  const [transformationData, setTransformationData] = useState<TransformationData | null>(null);
  const [timedEval, setTimedEval] = useState<TimedEvaluation | null>(null);
  const [recap, setRecap] = useState<SessionRecap | null>(null);

  // 처방 정보
  const [prescriptionInfo, setPrescriptionInfo] = useState<{
    question_type: string;
    target_grade: string;
    weakness_tags: string[];
    timerConfig: { prep: number; main: number; wrap: number };
  } | null>(null);

  // 초기화: 훈련 세션 생성 + 브리프 조회
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);

        // 1. 훈련 세션 생성
        const result = await createTrainingSession({
          prescription_id: prescriptionId,
        });
        if (result.error || !result.data) {
          setError(result.error || "훈련 세션 생성 실패");
          return;
        }

        const tsId = result.data.training_session_id;
        setTrainingSessionId(tsId);

        // 처방 정보 가져오기
        const supabase = createClient();
        const { data: presc } = await supabase
          .from("tutoring_prescriptions")
          .select("question_type, level_params, weakness_tags")
          .eq("id", prescriptionId)
          .single();

        if (presc) {
          const lp = presc.level_params as {
            timer?: { prep: number; main: number; wrap: number };
          } | null;
          // target_grade 조회
          const { data: tsSession } = await supabase
            .from("tutoring_training_sessions")
            .select("target_grade")
            .eq("id", tsId)
            .single();
          setPrescriptionInfo({
            question_type: presc.question_type,
            target_grade: tsSession?.target_grade || "IM2",
            weakness_tags: (presc.weakness_tags as string[]) || [],
            timerConfig: lp?.timer || { prep: 15, main: 60, wrap: 15 },
          });
        }

        // 2. 브리프 생성
        const briefRes = await callTutoringEF("session-brief", {
          training_session_id: tsId,
          prescription_id: prescriptionId,
        });
        setBrief(briefRes.brief);
      } catch (err) {
        setError(err instanceof Error ? err.message : "초기화 실패");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [prescriptionId]);

  // Screen 전환
  const goToScreen = useCallback((screen: ScreenId) => {
    setCurrentScreen(screen);
  }, []);

  const nextScreen = useCallback(() => {
    const idx = SCREENS.findIndex((s) => s.id === currentScreen);
    if (idx < SCREENS.length - 1) {
      setCurrentScreen(SCREENS[idx + 1].id);
    }
  }, [currentScreen]);

  // 세션 종료
  const handleFinish = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["tutoring-diagnosis"] });
    router.push("/tutoring");
  }, [queryClient, router]);

  // 로딩
  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-primary-500" />
        <p className="text-sm text-foreground-secondary">
          훈련 세션을 준비하고 있습니다...
        </p>
      </div>
    );
  }

  // 에러
  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
        <AlertTriangle size={32} className="text-red-400" />
        <p className="text-sm text-red-500">{error}</p>
        <button
          onClick={() => router.push("/tutoring")}
          className="mt-2 rounded-[var(--radius-lg)] border border-border px-4 py-2 text-sm"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* 상단 진행 바 */}
      <div className="border-b border-border bg-surface px-4 py-2">
        <div className="mx-auto flex max-w-3xl items-center gap-1">
          {SCREENS.map((s, i) => {
            const done = SCREENS.findIndex((x) => x.id === currentScreen) > i;
            const active = s.id === currentScreen;
            return (
              <div key={s.id} className="flex flex-1 items-center gap-1">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    done
                      ? "bg-green-500 text-white"
                      : active
                        ? "bg-primary-500 text-white"
                        : "bg-surface-secondary text-foreground-muted"
                  }`}
                >
                  {done ? <CheckCircle2 size={12} /> : i + 1}
                </div>
                <span
                  className={`hidden text-xs sm:block ${
                    active ? "font-medium text-foreground" : "text-foreground-muted"
                  }`}
                >
                  {s.label}
                </span>
                {i < SCREENS.length - 1 && (
                  <div className="mx-1 h-px flex-1 bg-border" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Screen 콘텐츠 */}
      <div className="mobile-scrollbar-hidden h-0 flex-grow overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {currentScreen === 0 && (
            <Screen0Brief brief={brief} onStart={nextScreen} />
          )}
          {currentScreen === 1 && trainingSessionId && prescriptionInfo && (
            <Screen1Warmup
              trainingSessionId={trainingSessionId}
              prescriptionInfo={prescriptionInfo}
              warmupData={warmupData}
              setWarmupData={setWarmupData}
              onNext={nextScreen}
            />
          )}
          {currentScreen === 2 && trainingSessionId && prescriptionInfo && (
            <Screen2EPP
              trainingSessionId={trainingSessionId}
              prescriptionInfo={prescriptionInfo}
              eppData={eppData}
              setEppData={setEppData}
              onNext={nextScreen}
            />
          )}
          {currentScreen === 3 && trainingSessionId && prescriptionInfo && (
            <Screen3Variation
              trainingSessionId={trainingSessionId}
              prescriptionInfo={prescriptionInfo}
              variationData={variationData}
              setVariationData={setVariationData}
              transformationData={transformationData}
              setTransformationData={setTransformationData}
              onNext={nextScreen}
            />
          )}
          {currentScreen === 4 && trainingSessionId && prescriptionInfo && (
            <Screen4Timed
              trainingSessionId={trainingSessionId}
              prescriptionInfo={prescriptionInfo}
              timedEval={timedEval}
              setTimedEval={setTimedEval}
              onNext={nextScreen}
            />
          )}
          {currentScreen === 5 && trainingSessionId && (
            <Screen5Repair
              trainingSessionId={trainingSessionId}
              timedEval={timedEval}
              onNext={nextScreen}
            />
          )}
          {currentScreen === 6 && trainingSessionId && (
            <Screen6Recap
              trainingSessionId={trainingSessionId}
              recap={recap}
              setRecap={setRecap}
              brief={brief}
              onFinish={handleFinish}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Screen 0: 세션 브리프
// ============================================================

function Screen0Brief({
  brief,
  onStart,
}: {
  brief: SessionBrief | null;
  onStart: () => void;
}) {
  if (!brief) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">오늘의 훈련 목표</h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          {brief.session_goal}
        </p>
      </div>

      {/* 약점 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4">
        <h3 className="text-sm font-semibold text-foreground">
          오늘의 교정 포인트
        </h3>
        <div className="mt-2 space-y-1.5">
          {brief.weaknesses.map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0 text-amber-500" />
              <span className="text-sm text-foreground-secondary">{w}</span>
            </div>
          ))}
        </div>
        {brief.forbidden_habit && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-2.5">
            <span className="text-xs font-bold text-red-600">금지</span>
            <span className="text-xs text-red-600">
              {brief.forbidden_habit}
            </span>
          </div>
        )}
      </div>

      {/* 성공 기준 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4">
        <h3 className="text-sm font-semibold text-foreground">
          성공 기준 체크리스트
        </h3>
        <div className="mt-2 space-y-2">
          {brief.success_criteria.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-border bg-background" />
              <span className="text-sm text-foreground-secondary">
                {c.criteria}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 예상 시간 */}
      <div className="flex items-center justify-center gap-2 text-sm text-foreground-muted">
        <Timer size={14} />
        예상 소요 시간: 약 {brief.estimated_minutes}분
      </div>

      {/* 시작 버튼 */}
      <button
        onClick={onStart}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 py-3.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
      >
        훈련 시작하기
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

// ============================================================
// Screen 1: 워밍업 (쉐도잉 + 등급별 텍스트 정책)
// ============================================================

function Screen1Warmup({
  trainingSessionId,
  prescriptionInfo,
  warmupData,
  setWarmupData,
  onNext,
}: {
  trainingSessionId: string;
  prescriptionInfo: { question_type: string; target_grade: string; weakness_tags: string[]; timerConfig: { prep: number; main: number; wrap: number } };
  warmupData: WarmupData | null;
  setWarmupData: (d: WarmupData) => void;
  onNext: () => void;
}) {
  const [loading, setLoading] = useState(!warmupData);
  const [warmupError, setWarmupError] = useState<string | null>(null);
  const [shadowingRound, setShadowingRound] = useState(0); // 0: 듣기, 1: 1회차, 2: 2회차
  const [currentSentence, setCurrentSentence] = useState(0);
  const [showText, setShowText] = useState(true);

  // 등급별 텍스트 정책 결정
  const textPolicy = (() => {
    const level = prescriptionInfo.target_grade;
    if (["IL", "NL", "NM", "NH", "IM1"].includes(level)) return "full";
    if (["IM2", "IM3", "IH"].includes(level)) return "keywords";
    return "off"; // AL
  })();

  // 워밍업 데이터 생성
  useEffect(() => {
    if (warmupData) return;
    async function loadWarmup() {
      setLoading(true);
      setWarmupError(null);
      try {
        const res = await callTutoringEF("generate-warmup", {
          training_session_id: trainingSessionId,
          question_type: prescriptionInfo.question_type,
          target_grade: prescriptionInfo.target_grade,
          text_policy: textPolicy,
        });
        setWarmupData(res.warmup);
      } catch (err) {
        setWarmupError(err instanceof Error ? err.message : "워밍업 생성에 실패했습니다");
      } finally {
        setLoading(false);
      }
    }
    loadWarmup();
  }, [warmupData, trainingSessionId, prescriptionInfo, textPolicy, setWarmupData]);

  const sentences = warmupData?.sentences || [];
  const totalSentences = sentences.length;

  const handleNextSentence = () => {
    if (currentSentence < totalSentences - 1) {
      setCurrentSentence((c) => c + 1);
    } else {
      // 현재 라운드 종료
      if (shadowingRound < 2) {
        setShadowingRound((r) => r + 1);
        setCurrentSentence(0);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <Loader2 size={24} className="animate-spin text-primary-500" />
        <p className="text-sm text-foreground-secondary">모범 답변을 생성하고 있습니다...</p>
      </div>
    );
  }

  if (warmupError) {
    return (
      <div className="space-y-4 py-8 text-center">
        <AlertTriangle size={28} className="mx-auto text-amber-400" />
        <p className="text-sm text-foreground-secondary">{warmupError}</p>
        <button
          onClick={onNext}
          className="mx-auto flex items-center gap-2 rounded-[var(--radius-lg)] border border-border px-4 py-2 text-sm text-foreground-secondary hover:bg-surface-secondary"
        >
          건너뛰고 다음으로 <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">워밍업</h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          {shadowingRound === 0
            ? "모범 답변을 먼저 확인하세요"
            : `따라 말하기 ${shadowingRound}/2회`}
        </p>
      </div>

      {/* 질문 */}
      {warmupData?.question && (
        <div className="rounded-[var(--radius-xl)] border border-primary-200 bg-primary-50/50 p-4">
          <p className="text-xs font-medium text-primary-600">오늘의 질문</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {warmupData.question.english}
          </p>
          <p className="mt-0.5 text-xs text-foreground-secondary">
            {warmupData.question.korean}
          </p>
        </div>
      )}

      {/* 텍스트 정책 토글 (keywords/off 모드에서만) */}
      {textPolicy !== "full" && (
        <button
          onClick={() => setShowText(!showText)}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground-secondary hover:bg-surface-secondary"
        >
          {showText ? <EyeOff size={12} /> : <Eye size={12} />}
          {showText ? "텍스트 숨기기" : "텍스트 보기"}
          {textPolicy === "keywords" && (
            <span className="text-foreground-muted">(키워드만 표시)</span>
          )}
        </button>
      )}

      {/* 모범 답변 (라운드 0: 전체 확인) */}
      {shadowingRound === 0 && (
        <div className="space-y-3">
          <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4">
            <h3 className="text-sm font-semibold text-foreground">모범 답변</h3>
            {textPolicy === "full" || showText ? (
              <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
                {warmupData?.model_answer}
              </p>
            ) : textPolicy === "off" ? (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-surface-secondary p-3">
                <Volume2 size={16} className="text-foreground-muted" />
                <span className="text-xs text-foreground-muted">
                  AL 레벨: 음성으로만 확인하세요
                </span>
              </div>
            ) : null}
          </div>

          {/* 핵심 표현 */}
          {warmupData?.key_expressions && warmupData.key_expressions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {warmupData.key_expressions.map((expr) => (
                <span
                  key={expr}
                  className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600"
                >
                  {expr}
                </span>
              ))}
            </div>
          )}

          {/* 리듬 팁 */}
          {warmupData?.rhythm_tips && warmupData.rhythm_tips.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3">
              <Lightbulb size={14} className="mt-0.5 shrink-0 text-amber-500" />
              <div className="space-y-0.5">
                {warmupData.rhythm_tips.map((tip, i) => (
                  <p key={i} className="text-xs text-amber-700">{tip}</p>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setShadowingRound(1);
              setCurrentSentence(0);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 py-3.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            <Headphones size={16} />
            따라 말하기 시작
          </button>
        </div>
      )}

      {/* 쉐도잉 라운드 (1, 2) */}
      {shadowingRound > 0 && (
        <div className="space-y-4">
          {/* 진행률 */}
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-secondary">
              <div
                className="h-full rounded-full bg-primary-500 transition-all"
                style={{ width: `${((currentSentence + 1) / totalSentences) * 100}%` }}
              />
            </div>
            <span className="text-xs text-foreground-muted">
              {currentSentence + 1}/{totalSentences}
            </span>
          </div>

          {/* 현재 문장 */}
          {sentences[currentSentence] && (
            <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5">
              {/* 영어 문장 (텍스트 정책 적용) */}
              {textPolicy === "full" || showText ? (
                <p className="text-base font-medium leading-relaxed text-foreground">
                  {textPolicy === "keywords"
                    ? sentences[currentSentence].english
                        .split(" ")
                        .map((word, wi) =>
                          sentences[currentSentence].keywords.some(
                            (kw) => word.toLowerCase().includes(kw.toLowerCase())
                          ) ? (
                            <span key={wi} className="font-bold text-primary-600">{word} </span>
                          ) : (
                            <span key={wi} className="text-foreground-muted/40">{word} </span>
                          )
                        )
                    : sentences[currentSentence].english}
                </p>
              ) : (
                <div className="flex items-center gap-2 py-2">
                  <Volume2 size={18} className="text-foreground-muted" />
                  <span className="text-sm text-foreground-muted">소리를 듣고 따라 말하세요</span>
                </div>
              )}

              {/* 한국어 번역 (full 모드에서만 항상 표시) */}
              {textPolicy === "full" && (
                <p className="mt-2 text-xs text-foreground-muted">
                  {sentences[currentSentence].korean}
                </p>
              )}
            </div>
          )}

          {/* 다음 문장 / 라운드 완료 */}
          {currentSentence < totalSentences - 1 ? (
            <button
              onClick={handleNextSentence}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 py-3 text-sm font-medium text-white"
            >
              다음 문장 <ChevronRight size={14} />
            </button>
          ) : shadowingRound < 2 ? (
            <button
              onClick={() => {
                setShadowingRound(2);
                setCurrentSentence(0);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 py-3 text-sm font-medium text-white"
            >
              2회차 시작 <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={onNext}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-primary-500 py-3 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50"
            >
              EPP 패턴으로 <ArrowRight size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Screen 2: EPP 패턴 고정
// ============================================================

function Screen2EPP({
  trainingSessionId,
  prescriptionInfo,
  eppData,
  setEppData,
  onNext,
}: {
  trainingSessionId: string;
  prescriptionInfo: { question_type: string; target_grade: string; weakness_tags: string[]; timerConfig: { prep: number; main: number; wrap: number } };
  eppData: EPPData | null;
  setEppData: (d: EPPData) => void;
  onNext: () => void;
}) {
  const [loading, setLoading] = useState(!eppData);
  const [attemptCount, setAttemptCount] = useState(0);
  const [userText, setUserText] = useState("");
  const [saving, setSaving] = useState(false);
  const [eppError, setEppError] = useState<string | null>(null);

  // EPP 생성
  useEffect(() => {
    if (eppData) return;
    async function loadEPP() {
      setLoading(true);
      setEppError(null);
      try {
        const res = await callTutoringEF("generate-epp", {
          training_session_id: trainingSessionId,
          ...prescriptionInfo,
        });
        setEppData(res.epp);
      } catch (err) {
        setEppError(err instanceof Error ? err.message : "EPP 패턴 생성에 실패했습니다");
      } finally {
        setLoading(false);
      }
    }
    loadEPP();
  }, [eppData, trainingSessionId, prescriptionInfo, setEppData]);

  const handleSubmitAttempt = async () => {
    if (!userText.trim()) return;
    setSaving(true);
    try {
      await saveAttempt({
        training_session_id: trainingSessionId,
        screen_number: 2,
        protocol: "epp",
        question_id: eppData?.question?.id,
        attempt_number: attemptCount + 1,
        user_answer: userText,
        passed: true,
      });
      setAttemptCount((c) => c + 1);
      setUserText("");
    } catch {
      // 에러 무시
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <Loader2 size={24} className="animate-spin text-primary-500" />
        <p className="text-sm text-foreground-secondary">
          EPP 패턴을 생성하고 있습니다...
        </p>
      </div>
    );
  }

  if (eppError) {
    return (
      <div className="space-y-4 py-8 text-center">
        <AlertTriangle size={28} className="mx-auto text-amber-400" />
        <p className="text-sm text-foreground-secondary">{eppError}</p>
        <button
          onClick={onNext}
          className="mx-auto flex items-center gap-2 rounded-[var(--radius-lg)] border border-border px-4 py-2 text-sm text-foreground-secondary hover:bg-surface-secondary"
        >
          건너뛰고 다음으로
          <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">
          EPP 패턴 고정
        </h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          뼈대를 내 문장으로 3회 반복해 보세요
        </p>
      </div>

      {/* 질문 */}
      {eppData?.question && (
        <div className="rounded-[var(--radius-xl)] border border-primary-200 bg-primary-50/50 p-4">
          <p className="text-xs font-medium text-primary-600">오늘의 질문</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {eppData.question.english}
          </p>
          <p className="mt-0.5 text-xs text-foreground-secondary">
            {eppData.question.korean}
          </p>
        </div>
      )}

      {/* EPP 카드 */}
      {eppData?.epp_cards && (
        <div className="space-y-3">
          {eppData.epp_cards.map((card, i) => (
            <div
              key={i}
              className="rounded-[var(--radius-xl)] border border-border bg-surface p-4"
            >
              <p className="text-sm font-medium text-foreground">
                {card.template}
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                {card.korean_hint}
              </p>
              {card.slots.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {card.slots.map((s) => (
                    <span
                      key={s}
                      className="rounded bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-600"
                    >
                      [{s}]
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 필수 연결어 + 금지 표현 */}
      <div className="flex gap-3">
        {eppData?.required_connectors && (
          <div className="flex-1 rounded-lg bg-green-50 p-3">
            <p className="text-[10px] font-bold text-green-700">필수 연결어</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {eppData.required_connectors.map((c) => (
                <span key={c} className="text-xs text-green-600">{c}</span>
              ))}
            </div>
          </div>
        )}
        {eppData?.forbidden_patterns && (
          <div className="flex-1 rounded-lg bg-red-50 p-3">
            <p className="text-[10px] font-bold text-red-700">금지 표현</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {eppData.forbidden_patterns.map((p) => (
                <span key={p} className="text-xs text-red-600">{p}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 팁 */}
      {eppData?.tip && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3">
          <Lightbulb size={14} className="mt-0.5 shrink-0 text-amber-500" />
          <p className="text-xs text-amber-700">{eppData.tip}</p>
        </div>
      )}

      {/* 답변 입력 (MVP: 텍스트 입력, 추후 녹음으로 전환) */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-foreground-secondary">
          EPP를 활용해 답변을 말해 보세요 ({attemptCount}/3회)
        </p>
        <textarea
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          placeholder="패턴을 활용해 나만의 답변을 영어로 입력하세요..."
          className="h-24 w-full resize-none rounded-[var(--radius-lg)] border border-border bg-background p-3 text-sm focus:border-primary-500 focus:outline-none"
        />
        <button
          onClick={handleSubmitAttempt}
          disabled={!userText.trim() || saving}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <CheckCircle2 size={14} />
          )}
          제출 ({attemptCount + 1}/3)
        </button>
      </div>

      {/* 다음 Screen 이동 (3회 완료 후) */}
      {attemptCount >= 3 && (
        <button
          onClick={onNext}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-primary-500 py-3 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50"
        >
          변형 훈련으로
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

// ============================================================
// Screen 3: 변형 훈련 (Forced Variation + Oral Transformation)
// ============================================================

function Screen3Variation({
  trainingSessionId,
  prescriptionInfo,
  variationData,
  setVariationData,
  transformationData,
  setTransformationData,
  onNext,
}: {
  trainingSessionId: string;
  prescriptionInfo: { question_type: string; target_grade: string; weakness_tags: string[]; timerConfig: { prep: number; main: number; wrap: number } };
  variationData: VariationData | null;
  setVariationData: (d: VariationData) => void;
  transformationData: TransformationData | null;
  setTransformationData: (d: TransformationData) => void;
  onNext: () => void;
}) {
  type Phase = "variation" | "transformation" | "done";
  const [phase, setPhase] = useState<Phase>("variation");
  const [loading, setLoading] = useState(!variationData);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Variation 상태
  const [currentCard, setCurrentCard] = useState(0);
  const [varUserText, setVarUserText] = useState("");
  const [varSaving, setVarSaving] = useState(false);
  const [varCompleted, setVarCompleted] = useState<number[]>([]);

  // Transformation 상태
  const [transLoading, setTransLoading] = useState(false);
  const [currentTransCard, setCurrentTransCard] = useState(0);
  const [transUserText, setTransUserText] = useState("");
  const [transSaving, setTransSaving] = useState(false);
  const [transCompleted, setTransCompleted] = useState<number[]>([]);
  const [showExpected, setShowExpected] = useState(false);

  // 등급별 변경 요소 수 결정
  const variationChanges = (() => {
    const level = prescriptionInfo.target_grade;
    if (["IL", "NL", "NM", "NH", "IM1"].includes(level)) return 1;
    if (["IM2", "IM3", "IH"].includes(level)) return 2;
    return 3; // AL
  })();

  // Variation 데이터 로드
  useEffect(() => {
    if (variationData) return;
    async function loadVariation() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await callTutoringEF("generate-variation", {
          training_session_id: trainingSessionId,
          question_type: prescriptionInfo.question_type,
          target_grade: prescriptionInfo.target_grade,
          weakness_tags: prescriptionInfo.weakness_tags,
          variation_changes: variationChanges,
        });
        setVariationData(res.variation);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "변형 카드 생성에 실패했습니다");
      } finally {
        setLoading(false);
      }
    }
    loadVariation();
  }, [variationData, trainingSessionId, prescriptionInfo, variationChanges, setVariationData]);

  // Transformation 데이터 로드 (phase 전환 시)
  useEffect(() => {
    if (phase !== "transformation" || transformationData) return;
    async function loadTransformation() {
      setTransLoading(true);
      try {
        const res = await callTutoringEF("generate-transformation", {
          training_session_id: trainingSessionId,
          question_type: prescriptionInfo.question_type,
          target_grade: prescriptionInfo.target_grade,
        });
        setTransformationData(res.transformation);
      } catch {
        // 실패 시 바로 done으로
        setPhase("done");
      } finally {
        setTransLoading(false);
      }
    }
    loadTransformation();
  }, [phase, transformationData, trainingSessionId, prescriptionInfo, setTransformationData]);

  const variationCards = variationData?.variation_cards || [];
  const transCards = transformationData?.transformation_cards || [];

  // Variation 카드 제출
  const handleVarSubmit = async () => {
    if (!varUserText.trim()) return;
    setVarSaving(true);
    try {
      await saveAttempt({
        training_session_id: trainingSessionId,
        screen_number: 3,
        protocol: "variation",
        question_id: variationCards[currentCard]?.question?.id,
        attempt_number: currentCard + 1,
        user_answer: varUserText,
        passed: true,
      });
      setVarCompleted((c) => [...c, currentCard]);
      setVarUserText("");
    } catch {
      // 에러 무시
    } finally {
      setVarSaving(false);
    }
  };

  // Transformation 카드 제출
  const handleTransSubmit = async () => {
    if (!transUserText.trim()) return;
    setTransSaving(true);
    try {
      await saveAttempt({
        training_session_id: trainingSessionId,
        screen_number: 3,
        protocol: "transformation",
        attempt_number: currentTransCard + 1,
        user_answer: transUserText,
        passed: true,
      });
      setTransCompleted((c) => [...c, currentTransCard]);
      setTransUserText("");
      setShowExpected(false);
    } catch {
      // 에러 무시
    } finally {
      setTransSaving(false);
    }
  };

  // 변형 타입 한국어 라벨
  const variationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      time_change: "시간 변화",
      condition_change: "조건 변화",
      comparison: "비교",
      reason_reversal: "이유 반전",
    };
    return labels[type] || type;
  };

  const transformTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      tense_change: "시제 변환",
      add_reason: "이유 추가",
      comparison: "비교",
      subjunctive: "가정법",
      expansion: "확장",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <Loader2 size={24} className="animate-spin text-primary-500" />
        <p className="text-sm text-foreground-secondary">변형 카드를 생성하고 있습니다...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4 py-8 text-center">
        <AlertTriangle size={28} className="mx-auto text-amber-400" />
        <p className="text-sm text-foreground-secondary">{loadError}</p>
        <button
          onClick={onNext}
          className="mx-auto flex items-center gap-2 rounded-[var(--radius-lg)] border border-border px-4 py-2 text-sm text-foreground-secondary hover:bg-surface-secondary"
        >
          건너뛰고 다음으로 <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">변형 훈련</h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          {phase === "variation"
            ? "같은 유형, 다른 조건으로 변형해서 말해보세요"
            : phase === "transformation"
              ? "짧은 문장을 즉석에서 변환해 보세요"
              : "변형 훈련 완료!"}
        </p>
      </div>

      {/* Phase 탭 */}
      <div className="flex gap-2">
        <button
          onClick={() => setPhase("variation")}
          className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
            phase === "variation"
              ? "bg-primary-500 text-white"
              : "bg-surface-secondary text-foreground-muted"
          }`}
        >
          강제 변주 ({varCompleted.length}/{variationCards.length})
        </button>
        <button
          onClick={() => setPhase("transformation")}
          className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
            phase === "transformation"
              ? "bg-primary-500 text-white"
              : "bg-surface-secondary text-foreground-muted"
          }`}
        >
          구두 변환 ({transCompleted.length}/{transCards.length})
        </button>
      </div>

      {/* ── Forced Variation ── */}
      {phase === "variation" && variationCards.length > 0 && (
        <div className="space-y-4">
          {/* 카드 선택 */}
          <div className="flex gap-2">
            {variationCards.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrentCard(i);
                  setVarUserText("");
                }}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  varCompleted.includes(i)
                    ? "bg-green-500 text-white"
                    : currentCard === i
                      ? "bg-primary-500 text-white"
                      : "bg-surface-secondary text-foreground-muted"
                }`}
              >
                {varCompleted.includes(i) ? <CheckCircle2 size={12} /> : i + 1}
              </button>
            ))}
          </div>

          {/* 현재 변형 카드 */}
          {variationCards[currentCard] && (
            <>
              {/* 질문 */}
              <div className="rounded-[var(--radius-xl)] border border-primary-200 bg-primary-50/50 p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-700">
                    {variationTypeLabel(variationCards[currentCard].variation_type)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {variationCards[currentCard].question.english}
                </p>
                <p className="mt-0.5 text-xs text-foreground-secondary">
                  {variationCards[currentCard].question.korean}
                </p>
              </div>

              {/* 변형 지시 */}
              <div className="rounded-[var(--radius-xl)] border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-800">
                  {variationCards[currentCard].instruction}
                </p>
                <div className="mt-2 flex gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-green-700">필수 연결어</p>
                    <p className="mt-0.5 text-xs text-green-600">
                      {variationCards[currentCard].forced_mission.connector}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-blue-700">디테일 미션</p>
                    <p className="mt-0.5 text-xs text-blue-600">
                      {variationCards[currentCard].forced_mission.detail_prompt}
                    </p>
                  </div>
                </div>
              </div>

              {/* 시작 문장 힌트 */}
              {variationCards[currentCard].example_starter && (
                <div className="rounded-lg bg-surface-secondary p-3">
                  <p className="text-xs text-foreground-muted">시작 예시:</p>
                  <p className="mt-0.5 text-sm italic text-foreground-secondary">
                    &quot;{variationCards[currentCard].example_starter}&quot;
                  </p>
                </div>
              )}

              {/* 답변 입력 */}
              {!varCompleted.includes(currentCard) && (
                <div className="space-y-2">
                  <textarea
                    value={varUserText}
                    onChange={(e) => setVarUserText(e.target.value)}
                    placeholder="변형된 답변을 영어로 입력하세요..."
                    className="h-24 w-full resize-none rounded-[var(--radius-lg)] border border-border bg-background p-3 text-sm focus:border-primary-500 focus:outline-none"
                  />
                  <button
                    onClick={handleVarSubmit}
                    disabled={!varUserText.trim() || varSaving}
                    className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {varSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    제출
                  </button>
                </div>
              )}

              {/* 완료 표시 */}
              {varCompleted.includes(currentCard) && (
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <CheckCircle2 size={16} className="mx-auto text-green-500" />
                  <p className="mt-1 text-xs text-green-600">완료!</p>
                </div>
              )}
            </>
          )}

          {/* 모든 변형 카드 완료 → Transformation으로 이동 */}
          {varCompleted.length >= variationCards.length && (
            <button
              onClick={() => setPhase("transformation")}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-primary-500 py-3 text-sm font-medium text-primary-600"
            >
              구두 변환으로 <ArrowRight size={14} />
            </button>
          )}
        </div>
      )}

      {/* ── Oral Transformation ── */}
      {phase === "transformation" && (
        <div className="space-y-4">
          {transLoading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 size={24} className="animate-spin text-primary-500" />
              <p className="text-sm text-foreground-secondary">변환 카드를 생성하고 있습니다...</p>
            </div>
          ) : transCards.length > 0 ? (
            <>
              {/* 진행률 */}
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-secondary">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all"
                    style={{ width: `${(transCompleted.length / transCards.length) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-foreground-muted">
                  {transCompleted.length}/{transCards.length}
                </span>
              </div>

              {/* 현재 변환 카드 */}
              {currentTransCard < transCards.length && transCards[currentTransCard] && (
                <>
                  <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        {transformTypeLabel(transCards[currentTransCard].transform_type)}
                      </span>
                    </div>
                    <p className="mt-3 text-base font-medium text-foreground">
                      &quot;{transCards[currentTransCard].original}&quot;
                    </p>
                    <p className="mt-2 text-sm font-medium text-primary-600">
                      → {transCards[currentTransCard].instruction}
                    </p>
                  </div>

                  {/* 정답 패턴 힌트 (토글) */}
                  <button
                    onClick={() => setShowExpected(!showExpected)}
                    className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground-secondary"
                  >
                    <Lightbulb size={12} />
                    {showExpected ? "힌트 숨기기" : "힌트 보기"}
                  </button>
                  {showExpected && (
                    <div className="rounded-lg bg-amber-50 p-3">
                      <p className="text-xs text-amber-700">
                        예상 패턴: {transCards[currentTransCard].expected_pattern}
                      </p>
                    </div>
                  )}

                  {/* 답변 입력 */}
                  {!transCompleted.includes(currentTransCard) && (
                    <div className="space-y-2">
                      <textarea
                        value={transUserText}
                        onChange={(e) => setTransUserText(e.target.value)}
                        placeholder="변환된 문장을 영어로 입력하세요..."
                        className="h-16 w-full resize-none rounded-[var(--radius-lg)] border border-border bg-background p-3 text-sm focus:border-primary-500 focus:outline-none"
                      />
                      <button
                        onClick={handleTransSubmit}
                        disabled={!transUserText.trim() || transSaving}
                        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {transSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        제출
                      </button>
                    </div>
                  )}

                  {/* 완료 → 다음 카드 */}
                  {transCompleted.includes(currentTransCard) && currentTransCard < transCards.length - 1 && (
                    <button
                      onClick={() => {
                        setCurrentTransCard((c) => c + 1);
                        setTransUserText("");
                        setShowExpected(false);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-surface-secondary py-2.5 text-sm font-medium text-foreground-secondary"
                    >
                      다음 문장 <ChevronRight size={14} />
                    </button>
                  )}
                </>
              )}

              {/* 모든 변환 완료 */}
              {transCompleted.length >= transCards.length && (
                <button
                  onClick={onNext}
                  className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-primary-500 py-3 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50"
                >
                  타임드 실전으로 <ArrowRight size={14} />
                </button>
              )}
            </>
          ) : (
            <div className="space-y-4 py-4 text-center">
              <p className="text-sm text-foreground-secondary">변환 카드가 없습니다</p>
              <button
                onClick={onNext}
                className="mx-auto flex items-center gap-2 rounded-[var(--radius-lg)] border border-border px-4 py-2 text-sm text-foreground-secondary"
              >
                다음으로 <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Done phase */}
      {phase === "done" && (
        <button
          onClick={onNext}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-primary-500 py-3 text-sm font-medium text-primary-600"
        >
          타임드 실전으로 <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

// ============================================================
// Screen 4: 타임드 실전 (15-60-15)
// ============================================================

function Screen4Timed({
  trainingSessionId,
  prescriptionInfo,
  timedEval,
  setTimedEval,
  onNext,
}: {
  trainingSessionId: string;
  prescriptionInfo: { question_type: string; target_grade: string; weakness_tags: string[]; timerConfig: { prep: number; main: number; wrap: number } };
  timedEval: TimedEvaluation | null;
  setTimedEval: (e: TimedEvaluation) => void;
  onNext: () => void;
}) {
  type Phase = "ready" | "prep" | "speak" | "wrap" | "evaluating" | "result";
  const [phase, setPhase] = useState<Phase>("ready");
  const [timer, setTimer] = useState(0);
  const [userText, setUserText] = useState("");
  const [question, setQuestion] = useState<{ id: string; english: string; korean: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speakStartRef = useRef(0); // speak 시작 시각
  const speakDurationRef = useRef(0); // 실제 답변 시간 (초)

  // 등급별 타이머 설정 (처방의 level_params에서 전달)
  const timerConfig = prescriptionInfo.timerConfig;

  // 질문 로딩
  useEffect(() => {
    async function loadQuestion() {
      const supabase = createClient();
      const { data: questions } = await supabase
        .from("questions")
        .select("id, question_english, question_korean")
        .eq("question_type_eng", prescriptionInfo.question_type)
        .eq("category", "일반")
        .limit(10);
      if (questions && questions.length > 0) {
        const q = questions[Math.floor(Math.random() * questions.length)];
        setQuestion({
          id: q.id,
          english: q.question_english,
          korean: q.question_korean,
        });
      }
    }
    loadQuestion();
  }, [prescriptionInfo.question_type]);

  // 타이머 카운트다운
  useEffect(() => {
    if (phase === "prep" || phase === "speak" || phase === "wrap") {
      // speak 시작/종료 시 실제 답변 시간 추적
      if (phase === "speak") {
        speakStartRef.current = Date.now();
      } else if (phase === "wrap" && speakStartRef.current > 0) {
        speakDurationRef.current = Math.round((Date.now() - speakStartRef.current) / 1000);
      }

      const maxTime =
        phase === "prep"
          ? timerConfig.prep
          : phase === "speak"
            ? timerConfig.main
            : timerConfig.wrap;

      setTimer(maxTime);
      timerRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            if (phase === "prep") setPhase("speak");
            else if (phase === "speak") setPhase("wrap");
            else if (phase === "wrap") setPhase("evaluating");
            return 0;
          }
          return t - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [phase, timerConfig.prep, timerConfig.main, timerConfig.wrap]);

  // evaluating phase 진입 시 speak 시간 확정
  useEffect(() => {
    if (phase === "evaluating" && speakStartRef.current > 0 && speakDurationRef.current === 0) {
      speakDurationRef.current = Math.round((Date.now() - speakStartRef.current) / 1000);
    }
  }, [phase]);

  // 평가 요청
  useEffect(() => {
    if (phase !== "evaluating" || !userText.trim()) {
      if (phase === "evaluating" && !userText.trim()) {
        setPhase("result");
      }
      return;
    }

    // 의존 값 캡처 (stale closure 방지)
    const capturedText = userText;
    const capturedQuestion = question;
    const capturedDuration = speakDurationRef.current || timerConfig.main;

    async function evaluate() {
      try {
        const res = await callTutoringEF("evaluate-timed", {
          training_session_id: trainingSessionId,
          question_id: capturedQuestion?.id || "",
          question_english: capturedQuestion?.english || "",
          question_type: prescriptionInfo.question_type,
          user_answer: capturedText,
          audio_duration_seconds: capturedDuration,
          target_grade: prescriptionInfo.target_grade,
        });
        setTimedEval(res.evaluation);

        // 시도 저장
        await saveAttempt({
          training_session_id: trainingSessionId,
          screen_number: 4,
          protocol: "timed",
          question_id: capturedQuestion?.id,
          user_answer: capturedText,
          audio_duration_seconds: capturedDuration,
          evaluation: res.evaluation,
          passed: res.evaluation.passed,
        });
      } catch {
        // 평가 실패 — 결과 없이 진행
      } finally {
        setPhase("result");
      }
    }

    evaluate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">타임드 실전</h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          15초 준비 → 60초 답변 → 15초 마무리
        </p>
      </div>

      {/* 질문 표시 */}
      {question && (
        <div className="rounded-[var(--radius-xl)] border border-primary-200 bg-primary-50/50 p-4">
          <p className="text-sm font-medium text-foreground">
            {question.english}
          </p>
          <p className="mt-0.5 text-xs text-foreground-secondary">
            {question.korean}
          </p>
        </div>
      )}

      {/* 대기 상태 */}
      {phase === "ready" && (
        <button
          onClick={() => setPhase("prep")}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 py-3.5 text-sm font-medium text-white"
        >
          <Timer size={16} />
          시작하기
        </button>
      )}

      {/* 준비/답변/마무리 타이머 */}
      {(phase === "prep" || phase === "speak" || phase === "wrap") && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-xs font-medium text-foreground-secondary">
              {phase === "prep"
                ? "구조 잡기"
                : phase === "speak"
                  ? "답변 진행"
                  : "마무리"}
            </p>
            <p
              className={`mt-1 text-4xl font-bold ${
                timer <= 10 ? "text-red-500" : "text-primary-600"
              }`}
            >
              {timer}초
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-secondary">
              <div
                className={`h-full rounded-full transition-all ${
                  phase === "prep"
                    ? "bg-blue-500"
                    : phase === "speak"
                      ? "bg-primary-500"
                      : "bg-amber-500"
                }`}
                style={{
                  width: `${
                    (timer /
                      (phase === "prep"
                        ? timerConfig.prep
                        : phase === "speak"
                          ? timerConfig.main
                          : timerConfig.wrap)) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>

          {/* 답변 중 텍스트 입력 (MVP: 녹음 대신 텍스트) */}
          {(phase === "speak" || phase === "wrap") && (
            <textarea
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              placeholder="영어로 답변을 입력하세요..."
              className="h-32 w-full resize-none rounded-[var(--radius-lg)] border border-border bg-background p-3 text-sm focus:border-primary-500 focus:outline-none"
              autoFocus
            />
          )}

          {/* 수동 다음 단계 */}
          <button
            onClick={() => {
              if (timerRef.current) clearInterval(timerRef.current);
              if (phase === "prep") setPhase("speak");
              else if (phase === "speak") setPhase("wrap");
              else setPhase("evaluating");
            }}
            className="flex w-full items-center justify-center gap-1 text-xs text-foreground-muted hover:text-foreground-secondary"
          >
            다음 단계로 <ChevronRight size={12} />
          </button>
        </div>
      )}

      {/* 평가 중 */}
      {phase === "evaluating" && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 size={24} className="animate-spin text-primary-500" />
          <p className="text-sm text-foreground-secondary">답변을 평가하고 있습니다...</p>
        </div>
      )}

      {/* 결과 */}
      {phase === "result" && (
        <div className="space-y-4">
          {timedEval ? (
            <>
              {/* 블록 체크리스트 */}
              <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  필수 블록 체크
                </h3>
                <div className="mt-2 space-y-1.5">
                  {Object.entries(timedEval.block_checklist).map(
                    ([key, val]) => (
                      <div key={key} className="flex items-center gap-2">
                        {val.met ? (
                          <CheckCircle2 size={14} className="text-green-500" />
                        ) : (
                          <AlertTriangle size={14} className="text-red-400" />
                        )}
                        <span className="text-xs font-medium text-foreground">
                          {key}
                        </span>
                        <span className="text-xs text-foreground-muted">
                          {val.comment}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* 점수 */}
              <div className="flex gap-3">
                <div className="flex-1 rounded-lg bg-surface p-3 text-center">
                  <p className="text-xs text-foreground-muted">구조</p>
                  <p className="text-lg font-bold text-primary-600">
                    {timedEval.structure_score}/10
                  </p>
                </div>
                <div className="flex-1 rounded-lg bg-surface p-3 text-center">
                  <p className="text-xs text-foreground-muted">내용</p>
                  <p className="text-lg font-bold text-primary-600">
                    {timedEval.content_score}/10
                  </p>
                </div>
                <div className="flex-1 rounded-lg bg-surface p-3 text-center">
                  <p className="text-xs text-foreground-muted">시간</p>
                  <p className="text-lg font-bold text-primary-600">
                    {timedEval.time_management}
                  </p>
                </div>
              </div>

              {/* 총평 */}
              <div className="rounded-lg bg-surface-secondary p-3">
                <p className="text-sm text-foreground-secondary">
                  {timedEval.overall_comment}
                </p>
              </div>

              {/* 문법 교정 */}
              {timedEval.grammar_issues.length > 0 && (
                <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    문법 교정
                  </h3>
                  <div className="mt-2 space-y-2">
                    {timedEval.grammar_issues.map((g, i) => (
                      <div key={i} className="text-xs">
                        <p className="text-red-500 line-through">
                          {g.original}
                        </p>
                        <p className="font-medium text-green-600">
                          {g.corrected}
                        </p>
                        <p className="text-foreground-muted">{g.rule}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg bg-surface-secondary p-4 text-center">
              <p className="text-sm text-foreground-secondary">
                답변이 입력되지 않았습니다
              </p>
            </div>
          )}

          <button
            onClick={onNext}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 py-3 text-sm font-medium text-white"
          >
            Self-repair로
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Screen 5: Self-repair
// ============================================================

function Screen5Repair({
  trainingSessionId,
  timedEval,
  onNext,
}: {
  trainingSessionId: string;
  timedEval: TimedEvaluation | null;
  onNext: () => void;
}) {
  const [repairText, setRepairText] = useState("");
  const [selectedPhrase, setSelectedPhrase] = useState("I mean...");
  const [evaluating, setEvaluating] = useState(false);
  const [repairResult, setRepairResult] = useState<Record<string, unknown> | null>(null);
  const [repairError, setRepairError] = useState<string | null>(null);

  const repairPhrases = [
    "I mean...",
    "Let me rephrase that.",
    "What I'm trying to say is...",
    "Actually, I should say...",
    "Well, not exactly...",
  ];

  const grammarIssues = timedEval?.grammar_issues || [];

  const handleRepair = async () => {
    if (!repairText.trim()) return;
    setEvaluating(true);
    setRepairError(null);
    try {
      const res = await callTutoringEF("evaluate-repair", {
        training_session_id: trainingSessionId,
        original_text: grammarIssues.map((g) => g.original).join(". "),
        errors: grammarIssues.map((g) => ({ text: g.original, type: "grammar" })),
        repair_text: repairText,
        repair_phrase: selectedPhrase,
      });
      setRepairResult(res.evaluation);

      await saveAttempt({
        training_session_id: trainingSessionId,
        screen_number: 5,
        protocol: "self_repair",
        user_answer: repairText,
        repair_before: grammarIssues.map((g) => g.original).join(". "),
        repair_after: repairText,
        repair_type: "grammar",
        evaluation: res.evaluation,
        passed: res.evaluation?.passed,
      });
    } catch (err) {
      setRepairError(err instanceof Error ? err.message : "평가에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setEvaluating(false);
    }
  };

  // 문법 교정 데이터가 없으면 스킵
  if (grammarIssues.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-foreground">Self-repair</h2>
          <p className="mt-1 text-sm text-foreground-secondary">
            교정할 문법 오류가 없습니다. 잘하셨어요!
          </p>
        </div>
        <button
          onClick={onNext}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 py-3 text-sm font-medium text-white"
        >
          리캡으로
          <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">Self-repair</h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          오류를 찾고 자연스럽게 고쳐서 다시 말해 보세요
        </p>
      </div>

      {/* 오류 하이라이트 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4">
        <h3 className="text-sm font-semibold text-foreground">발견된 오류</h3>
        <div className="mt-3 space-y-2">
          {grammarIssues.map((g, i) => (
            <div key={i} className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-600 line-through">{g.original}</p>
              <p className="mt-0.5 text-sm font-medium text-green-600">
                → {g.corrected}
              </p>
              <p className="mt-0.5 text-xs text-foreground-muted">{g.rule}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Self-repair 문구 선택 */}
      <div>
        <p className="text-xs font-medium text-foreground-secondary">
          수정 문구 선택
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {repairPhrases.map((phrase) => (
            <button
              key={phrase}
              onClick={() => setSelectedPhrase(phrase)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedPhrase === phrase
                  ? "border-primary-500 bg-primary-50 text-primary-600"
                  : "border-border bg-surface text-foreground-secondary"
              }`}
            >
              {phrase}
            </button>
          ))}
        </div>
      </div>

      {/* 수정 답변 입력 */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-foreground-secondary">
          &quot;{selectedPhrase}&quot;로 시작해서 고쳐 말해 보세요
        </p>
        <textarea
          value={repairText}
          onChange={(e) => setRepairText(e.target.value)}
          placeholder={`${selectedPhrase} ...`}
          className="h-24 w-full resize-none rounded-[var(--radius-lg)] border border-border bg-background p-3 text-sm focus:border-primary-500 focus:outline-none"
        />
        <button
          onClick={handleRepair}
          disabled={!repairText.trim() || evaluating}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {evaluating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Wrench size={14} />
          )}
          수정 제출
        </button>
      </div>

      {/* 수정 에러 */}
      {repairError && (
        <div className="rounded-lg bg-red-50 p-3 text-center text-xs text-red-600">
          {repairError}
        </div>
      )}

      {/* 수정 결과 */}
      {repairResult && (
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            {repairResult.passed ? (
              <CheckCircle2 size={16} className="text-green-500" />
            ) : (
              <AlertTriangle size={16} className="text-amber-500" />
            )}
            <span className="text-sm font-medium text-foreground">
              {(repairResult.repair_quality as string) === "excellent"
                ? "훌륭합니다!"
                : (repairResult.repair_quality as string) === "good"
                  ? "잘했어요!"
                  : "조금 더 연습이 필요해요"}
            </span>
          </div>
          <p className="mt-2 text-xs text-foreground-secondary">
            {repairResult.before_after_comparison as string}
          </p>
          {repairResult.tip ? (
            <p className="mt-1 text-xs text-foreground-muted">
              {String(repairResult.tip)}
            </p>
          ) : null}
        </div>
      )}

      {/* 다음 */}
      {(repairResult || repairError) && (
        <button
          onClick={onNext}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-primary-500 py-3 text-sm font-medium text-primary-600"
        >
          리캡으로
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

// ============================================================
// Screen 6: 리캡
// ============================================================

function Screen6Recap({
  trainingSessionId,
  recap,
  setRecap,
  brief,
  onFinish,
}: {
  trainingSessionId: string;
  recap: SessionRecap | null;
  setRecap: (r: SessionRecap) => void;
  brief: SessionBrief | null;
  onFinish: () => void;
}) {
  const [loading, setLoading] = useState(!recap);

  useEffect(() => {
    if (recap) return;
    async function loadRecap() {
      setLoading(true);
      try {
        // 1. EF로 리캡 생성 + DB 완료 처리 (EF 측)
        const res = await callTutoringEF("complete-session", {
          training_session_id: trainingSessionId,
        });
        setRecap(res.recap);

        // 2. SA로 처방 진행률 업데이트 (training_count 기반 완료 판정)
        await completeTrainingSession({
          training_session_id: trainingSessionId,
        });
      } catch {
        // EF 실패해도 SA 완료 처리는 시도
        try {
          await completeTrainingSession({
            training_session_id: trainingSessionId,
          });
        } catch { /* 무시 */ }
      } finally {
        setLoading(false);
      }
    }
    loadRecap();
  }, [recap, trainingSessionId, setRecap]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Loader2 size={24} className="animate-spin text-primary-500" />
        <p className="text-sm text-foreground-secondary">
          세션 결과를 정리하고 있습니다...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
          <Trophy size={28} className="text-green-500" />
        </div>
        <h2 className="mt-3 text-lg font-bold text-foreground">훈련 완료!</h2>
      </div>

      {recap && (
        <>
          {/* 3줄 요약 */}
          <div className="space-y-3">
            <div className="rounded-[var(--radius-xl)] border border-green-200 bg-green-50 p-4">
              <p className="text-xs font-bold text-green-700">가장 좋아진 점</p>
              <p className="mt-1 text-sm text-green-600">
                {recap.best_improvement}
              </p>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-bold text-amber-700">다음에 고칠 1개</p>
              <p className="mt-1 text-sm text-amber-600">
                {recap.next_focus}
              </p>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4">
              <p className="text-xs font-bold text-foreground-secondary">
                KPI 달성
              </p>
              <p className="mt-1 text-sm text-foreground-secondary">
                {recap.kpi_summary}
              </p>
            </div>
          </div>

          {/* 격려 */}
          <div className="rounded-lg bg-primary-50 p-4 text-center">
            <p className="text-sm font-medium text-primary-600">
              {recap.encouragement}
            </p>
          </div>

          {/* 다음 추천 */}
          {recap.next_recommendation && (
            <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4">
              <p className="text-xs font-bold text-foreground-secondary">
                다음 훈련 추천
              </p>
              <p className="mt-1 text-sm text-foreground-secondary">
                {recap.next_recommendation.reason}
              </p>
            </div>
          )}
        </>
      )}

      {/* 완료 버튼 */}
      <button
        onClick={onFinish}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-500 py-3.5 text-sm font-medium text-white"
      >
        <CheckCircle2 size={16} />
        훈련 종료
      </button>
    </div>
  );
}
