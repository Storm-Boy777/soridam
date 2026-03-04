"use client";

// 관리자 기출 입력 UI
// 텍스트 붙여넣기/직접입력 → AI 매칭 → 컨펌/수동매칭 → 검증 → 저장

import { useState, useCallback, useMemo } from "react";
import {
  Loader2,
  Check,
  X,
  RotateCcw,
  Save,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Search,
  AlertTriangle,
  CircleDot,
  CheckCircle2,
  ArrowRight,
  Pencil,
} from "lucide-react";
import {
  matchAdminQuestions,
  saveAdminReview,
  getAdminQuestionCandidates,
  type ConfirmedQuestion,
  type CandidateQuestion,
} from "@/lib/actions/admin-reviews";
import type { QuestionMatch } from "@/lib/utils/question-matcher";
import { QUESTION_TYPE_ORDER } from "@/lib/types/reviews";

// ── 세트 구조 + 카테고리 매핑 ──

function getCategoryForQNum(qNum: number): string {
  if (qNum >= 2 && qNum <= 10) return "일반";
  if (qNum >= 11 && qNum <= 13) return "롤플레이";
  return "어드밴스";
}

const SETS = [
  { label: "세트 1", type: "일반", questions: [2, 3, 4] },
  { label: "세트 2", type: "일반", questions: [5, 6, 7] },
  { label: "세트 3", type: "일반", questions: [8, 9, 10] },
  { label: "세트 4", type: "롤플레이", questions: [11, 12, 13] },
  { label: "세트 5", type: "어드밴스", questions: [14, 15] },
];

const ALL_QUESTION_NUMBERS = SETS.flatMap((s) => s.questions);

// ── 텍스트 파싱 → 폼 자동 채우기 ──

const SET_Q_NUMBERS = [
  [2, 3, 4],
  [5, 6, 7],
  [8, 9, 10],
  [11, 12, 13],
  [14, 15],
];

function parseTextToDescriptions(text: string): Record<number, string> {
  const result: Record<number, string> = {};
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let currentSetIndex = -1;
  let questionsInCurrentSet: string[] = [];

  const flushSet = () => {
    if (currentSetIndex >= 0 && currentSetIndex < 5) {
      const qNums = SET_Q_NUMBERS[currentSetIndex];
      questionsInCurrentSet.forEach((desc, i) => {
        if (i < qNums.length) result[qNums[i]] = desc;
      });
    }
    questionsInCurrentSet = [];
  };

  for (const line of lines) {
    const setMatch = line.match(/[<\[]*\s*세트\s*(\d+)\s*[:\-\s]/i);
    if (setMatch) {
      flushSet();
      currentSetIndex = parseInt(setMatch[1]) - 1;
      continue;
    }

    const qMatch = line.match(/^\d+[.\s)]+(.+)/);
    if (qMatch && currentSetIndex >= 0) {
      const cleaned = qMatch[1].replace(/[\u{1F195}\u{1F4A1}\u{2B50}]/gu, "").trim();
      if (cleaned) questionsInCurrentSet.push(cleaned);
      continue;
    }
  }

  flushSet();
  return result;
}

// ── 상태 ──

type Phase = "input" | "matching" | "review" | "saving" | "done";

interface MatchState {
  [qNum: number]: {
    match: QuestionMatch | null;
    confirmed: boolean;
  };
}

// ── 진행 단계 표시 ──

const STEPS = [
  { key: "input", label: "입력" },
  { key: "matching", label: "매칭" },
  { key: "review", label: "검토" },
  { key: "done", label: "완료" },
] as const;

function StepIndicator({ phase }: { phase: Phase }) {
  const currentIdx = STEPS.findIndex(
    (s) => s.key === (phase === "saving" ? "review" : phase)
  );

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => {
        const isDone = i < currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={step.key} className="flex items-center gap-1">
            {i > 0 && (
              <div className={`h-px w-4 ${isDone ? "bg-primary-500" : "bg-border"}`} />
            )}
            <div className="flex items-center gap-1">
              {isDone ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-primary-500" />
              ) : isCurrent ? (
                <CircleDot className="h-3.5 w-3.5 text-primary-500" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border border-border" />
              )}
              <span
                className={`text-xs ${
                  isCurrent
                    ? "font-semibold text-primary-500"
                    : isDone
                      ? "text-foreground-secondary"
                      : "text-foreground-muted"
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 메인 컴포넌트 ──

export function AdminImportContent() {
  const [phase, setPhase] = useState<Phase>("input");
  const [descriptions, setDescriptions] = useState<Record<number, string>>(
    () => Object.fromEntries(ALL_QUESTION_NUMBERS.map((n) => [n, ""]))
  );
  const [matchState, setMatchState] = useState<MatchState>({});
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [collapsedSets, setCollapsedSets] = useState<Set<number>>(new Set());
  const [pasteText, setPasteText] = useState("");
  const [inputMode, setInputMode] = useState<"paste" | "manual">("paste");

  // 수동 매칭용 질문 후보
  const [candidates, setCandidates] = useState<CandidateQuestion[] | null>(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const loadCandidates = useCallback(async () => {
    if (candidates || loadingCandidates) return;
    setLoadingCandidates(true);
    const result = await getAdminQuestionCandidates();
    if (!result.error) setCandidates(result.questions);
    setLoadingCandidates(false);
  }, [candidates, loadingCandidates]);

  // 카테고리별 → 토픽별 그룹핑 (question_type_eng 순 → 한글 가나다순)
  const candidatesByCategory = useMemo(() => {
    if (!candidates) return {} as Record<string, Record<string, CandidateQuestion[]>>;
    const map: Record<string, Record<string, CandidateQuestion[]>> = {};
    for (const q of candidates) {
      const cat = q.category || "일반";
      if (!map[cat]) map[cat] = {};
      if (!map[cat][q.topic]) map[cat][q.topic] = [];
      map[cat][q.topic].push(q);
    }
    // 토픽별 질문 정렬: question_type_eng 순 → 같은 타입이면 한글 가나다순
    for (const cat of Object.keys(map)) {
      for (const topic of Object.keys(map[cat])) {
        map[cat][topic].sort((a, b) => {
          const orderA = QUESTION_TYPE_ORDER[a.question_type_eng || ""] ?? 99;
          const orderB = QUESTION_TYPE_ORDER[b.question_type_eng || ""] ?? 99;
          if (orderA !== orderB) return orderA - orderB;
          return (a.question_korean || "").localeCompare(b.question_korean || "", "ko");
        });
        // 디버그: 정렬 결과 확인 (확인 후 제거)
        if (topic.includes("TV") || topic.includes("텔레비전")) {
          console.log(`[정렬 확인] ${cat}/${topic}:`, map[cat][topic].map(q => `${q.question_type_eng}(${QUESTION_TYPE_ORDER[q.question_type_eng || ""] ?? 99}): ${q.question_short}`));
        }
      }
    }
    return map;
  }, [candidates]);

  // 수동 매칭 적용
  const handleManualMatch = useCallback(
    (qNum: number, question: CandidateQuestion) => {
      setMatchState((prev) => ({
        ...prev,
        [qNum]: {
          match: {
            index: qNum,
            description: descriptions[qNum],
            questionId: question.id,
            topic: question.topic,
            questionShort: question.question_short,
            questionEnglish: question.question_english,
            questionKorean: question.question_korean,
            surveyType: question.survey_type,
            confidence: 1.0,
          },
          confirmed: true,
        },
      }));
    },
    [descriptions]
  );

  // 텍스트 붙여넣기 → 폼 채우기
  const handlePasteApply = useCallback(() => {
    if (!pasteText.trim()) return;
    const parsed = parseTextToDescriptions(pasteText);
    const filledKeys = Object.keys(parsed);
    if (filledKeys.length === 0) {
      setError("세트/질문 패턴을 찾을 수 없습니다. 형식을 확인하세요.");
      return;
    }
    setDescriptions((prev) => ({ ...prev, ...parsed }));
    setInputMode("manual");
    setPasteText("");
    setError(null);
    setCollapsedSets(new Set());
  }, [pasteText]);

  const handleDescChange = useCallback((qNum: number, value: string) => {
    setDescriptions((prev) => ({ ...prev, [qNum]: value }));
  }, []);

  const toggleSet = useCallback((setIndex: number) => {
    setCollapsedSets((prev) => {
      const next = new Set(prev);
      if (next.has(setIndex)) next.delete(setIndex);
      else next.add(setIndex);
      return next;
    });
  }, []);

  const filledCount = ALL_QUESTION_NUMBERS.filter(
    (n) => descriptions[n].trim().length > 0
  ).length;

  // AI 매칭 실행
  const handleMatch = async () => {
    setError(null);
    setPhase("matching");

    const descs = ALL_QUESTION_NUMBERS
      .filter((n) => descriptions[n].trim().length > 0)
      .map((n) => ({ index: n, text: descriptions[n].trim() }));

    if (descs.length === 0) {
      setError("최소 1개 질문을 입력하세요");
      setPhase("input");
      return;
    }

    try {
      const result = await matchAdminQuestions(descs);

      if (result.error) {
        setError(result.error);
        setPhase("input");
        return;
      }

      const newState: MatchState = {};
      for (const qNum of ALL_QUESTION_NUMBERS) {
        const match = result.matches.find((m) => m.index === qNum) || null;
        newState[qNum] = {
          match,
          confirmed: match?.questionId ? true : false,
        };
      }
      setMatchState(newState);
      setPhase("review");
    } catch (err) {
      console.error("AI 매칭 오류:", err);
      setError(err instanceof Error ? err.message : "AI 매칭 중 오류가 발생했습니다");
      setPhase("input");
    }
  };

  const toggleConfirm = (qNum: number) => {
    setMatchState((prev) => ({
      ...prev,
      [qNum]: {
        ...prev[qNum],
        confirmed: !prev[qNum]?.confirmed,
      },
    }));
  };

  // 저장
  const handleSave = async () => {
    setError(null);
    setPhase("saving");

    const confirmed: ConfirmedQuestion[] = [];

    for (const qNum of ALL_QUESTION_NUMBERS) {
      const state = matchState[qNum];
      if (!state?.match || !descriptions[qNum]?.trim()) continue;

      if (state.confirmed && state.match.questionId && state.match.topic) {
        confirmed.push({
          questionNumber: qNum,
          questionId: state.match.questionId,
          topic: state.match.topic,
          description: descriptions[qNum].trim(),
        });
      } else {
        const setConfig = SETS.find((s) => s.questions.includes(qNum));
        const siblingTopic = setConfig?.questions
          .map((n) => matchState[n]?.match?.topic)
          .find((t) => t) || "미분류";

        confirmed.push({
          questionNumber: qNum,
          questionId: null,
          topic: siblingTopic,
          description: descriptions[qNum].trim(),
        });
      }
    }

    if (confirmed.length === 0) {
      setError("저장할 질문이 없습니다");
      setPhase("review");
      return;
    }

    try {
      const result = await saveAdminReview(confirmed);

      if (!result.success) {
        setError(result.error || "저장 실패");
        setPhase("review");
        return;
      }

      setSavedCount((prev) => prev + 1);
      setPhase("done");
    } catch (err) {
      console.error("저장 오류:", err);
      setError(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다");
      setPhase("review");
    }
  };

  const handleReset = () => {
    setDescriptions(
      Object.fromEntries(ALL_QUESTION_NUMBERS.map((n) => [n, ""]))
    );
    setMatchState({});
    setError(null);
    setPhase("input");
    setCollapsedSets(new Set());
    setPasteText("");
    setInputMode("paste");
  };

  // 통계
  const confirmedCount = Object.values(matchState).filter(
    (s) => s.confirmed && s.match?.questionId
  ).length;
  const totalMatched = Object.values(matchState).filter(
    (s) => s.match && s.match.description
  ).length;
  const failedCount = Object.values(matchState).filter(
    (s) => s.match && !s.match.questionId
  ).length;

  // 선택형/공통형 비율 검증
  const surveyValidation = useMemo(() => {
    if (phase !== "review" && phase !== "done") return null;

    const setSurveyTypes = SETS.map((set) => {
      const st = set.questions
        .map((n) => matchState[n]?.match?.surveyType)
        .find((s) => s && s !== "시스템") || null;
      const topic = set.questions
        .map((n) => matchState[n]?.match?.topic)
        .find((t) => t) || null;
      return { label: set.label, type: set.type, surveyType: st, topic };
    });

    const selected = setSurveyTypes.filter((s) => s.surveyType === "선택형").length;
    const common = setSurveyTypes.filter((s) => s.surveyType === "공통형").length;
    const unknown = setSurveyTypes.filter((s) => !s.surveyType).length;
    const isValid = selected === 3 && common === 2;

    return { setSurveyTypes, selected, common, unknown, isValid };
  }, [phase, matchState]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-6">
      {/* ── 헤더 ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">기출 데이터 입력</h1>
          <div className="flex items-center gap-3">
            {savedCount > 0 && (
              <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                {savedCount}건 저장
              </span>
            )}
            <StepIndicator phase={phase} />
          </div>
        </div>
      </div>

      {/* ── 에러 ── */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── 입력 영역 ── */}
      {phase === "input" && (
        <div className="mb-5">
          {/* 입력 모드 토글 */}
          <div className="mb-3 flex items-center rounded-lg bg-surface-secondary p-0.5">
            <button
              type="button"
              onClick={() => setInputMode("paste")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                inputMode === "paste"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-foreground-muted hover:text-foreground-secondary"
              }`}
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              텍스트 붙여넣기
            </button>
            <button
              type="button"
              onClick={() => setInputMode("manual")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                inputMode === "manual"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-foreground-muted hover:text-foreground-secondary"
              }`}
            >
              <Pencil className="h-3.5 w-3.5" />
              직접 입력
            </button>
          </div>

          {/* 붙여넣기 모드 */}
          {inputMode === "paste" && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="mb-2 text-xs text-foreground-muted">
                {`<세트 N: 주제> 형식의 텍스트를 붙여넣으면 Q2~Q15에 자동 배분됩니다`}
              </p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={`<세트 1: 쇼핑 (선택형)>\n2. 좋아하는 쇼핑몰이나 가게 묘사\n3. 쇼핑하러 가는 루틴\n4. 쇼핑하다가 일어난 일\n\n<세트 2: 음악 (선택형)>\n5. 좋아하는 음악 장르, 가수\n...`}
                rows={10}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handlePasteApply}
                disabled={!pasteText.trim()}
                className="mt-3 flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-40"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                폼에 적용
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── 세트별 질문 폼 ── */}
      {(phase !== "input" || inputMode === "manual") && phase !== "done" && (
        <div className="space-y-3">
          {SETS.map((set, setIdx) => {
            const isCollapsed = collapsedSets.has(setIdx);
            const setMatches = set.questions.map((n) => matchState[n]).filter(Boolean);
            const setConfirmed = setMatches.filter((s) => s.confirmed && s.match?.questionId).length;
            const setFailed = setMatches.filter((s) => s.match && !s.match.questionId).length;
            const setFilled = set.questions.filter((n) => descriptions[n].trim().length > 0).length;

            const siblingTopic = set.questions
              .map((n) => matchState[n]?.match?.topic)
              .find((t) => t) || null;

            const setSurveyType = set.questions
              .map((n) => matchState[n]?.match?.surveyType)
              .find((s) => s && s !== "시스템") || null;

            return (
              <div
                key={setIdx}
                className="overflow-hidden rounded-xl border border-border bg-surface"
              >
                {/* 세트 헤더 */}
                <button
                  type="button"
                  onClick={() => toggleSet(setIdx)}
                  className="flex w-full items-center gap-2 px-4 py-2.5"
                >
                  {/* 왼쪽: 세트 이름 + 타입 */}
                  <span className="text-sm font-semibold text-foreground">
                    {set.label}
                  </span>
                  <span className="rounded bg-surface-secondary px-1.5 py-0.5 text-[10px] font-medium text-foreground-muted">
                    {set.type}
                  </span>

                  {/* 매칭된 토픽 */}
                  {phase === "review" && siblingTopic && (
                    <span className="text-xs font-medium text-primary-500">
                      {siblingTopic}
                    </span>
                  )}

                  {/* 오른쪽: 상태 뱃지들 */}
                  <div className="ml-auto flex items-center gap-1.5">
                    {phase === "input" && setFilled > 0 && (
                      <span className="text-xs text-foreground-muted">
                        {setFilled}/{set.questions.length}
                      </span>
                    )}
                    {phase === "review" && (
                      <>
                        {setConfirmed > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-green-600">
                            <Check className="h-3 w-3" />
                            {setConfirmed}
                          </span>
                        )}
                        {setFailed > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-600">
                            <AlertTriangle className="h-3 w-3" />
                            {setFailed}
                          </span>
                        )}
                        {setSurveyType && (
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            setSurveyType === "선택형"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          }`}>
                            {setSurveyType}
                          </span>
                        )}
                      </>
                    )}
                    {isCollapsed ? (
                      <ChevronDown className="h-4 w-4 text-foreground-muted" />
                    ) : (
                      <ChevronUp className="h-4 w-4 text-foreground-muted" />
                    )}
                  </div>
                </button>

                {/* 세트 내용 */}
                {!isCollapsed && (
                  <div className="space-y-2 border-t border-border px-4 pb-3 pt-2.5">
                    {set.questions.map((qNum) => (
                      <QuestionRow
                        key={qNum}
                        qNum={qNum}
                        description={descriptions[qNum]}
                        matchData={matchState[qNum]}
                        phase={phase}
                        siblingTopic={siblingTopic}
                        candidatesByCategory={candidatesByCategory}
                        loadingCandidates={loadingCandidates}
                        onDescChange={handleDescChange}
                        onToggleConfirm={toggleConfirm}
                        onLoadCandidates={loadCandidates}
                        onManualMatch={handleManualMatch}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── 검증 패널 (review) ── */}
      {surveyValidation && phase === "review" && (
        <div className={`mt-4 rounded-xl border p-3 ${
          surveyValidation.isValid
            ? "border-green-200 bg-green-50/50"
            : surveyValidation.unknown > 0
              ? "border-amber-200 bg-amber-50/50"
              : "border-red-200 bg-red-50/50"
        }`}>
          <div className="flex items-center gap-2">
            {surveyValidation.isValid ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            )}
            <span className="text-xs font-semibold text-foreground">
              선택 {surveyValidation.selected} : 공통 {surveyValidation.common}
              {surveyValidation.unknown > 0 && ` : 미확인 ${surveyValidation.unknown}`}
            </span>
            {surveyValidation.isValid ? (
              <span className="text-xs text-green-600">정상</span>
            ) : surveyValidation.unknown === 0 ? (
              <span className="text-xs text-red-600">
                3:2 비율 위반
              </span>
            ) : (
              <span className="text-xs text-amber-600">검증 대기</span>
            )}
          </div>

          {/* 세트별 한 줄 요약 */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {surveyValidation.setSurveyTypes.map((s, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${
                  s.surveyType === "선택형"
                    ? "bg-blue-100 text-blue-700"
                    : s.surveyType === "공통형"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {s.label}
                {s.topic && <span className="font-normal">({s.topic})</span>}
                : {s.surveyType || "—"}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── 완료 화면 ── */}
      {phase === "done" && (
        <div className="flex flex-col items-center rounded-xl border border-green-200 bg-green-50/50 py-12">
          <CheckCircle2 className="mb-3 h-10 w-10 text-green-500" />
          <p className="text-lg font-semibold text-foreground">저장 완료</p>
          <p className="mt-1 text-sm text-foreground-secondary">
            {confirmedCount}개 질문이 빈도 분석에 반영됩니다
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-6 flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary-700"
          >
            <RotateCcw className="h-4 w-4" />
            다음 건 입력
          </button>
        </div>
      )}

      {/* ── 로딩 오버레이 (matching / saving) ── */}
      {(phase === "matching" || phase === "saving") && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-foreground/20 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-10 py-8 shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            <span className="text-sm font-semibold text-foreground">
              {phase === "matching" ? "AI 매칭 중..." : "저장 중..."}
            </span>
            {phase === "matching" && (
              <span className="text-xs text-foreground-muted">
                GPT-4.1이 {filledCount}개 질문을 분석하고 있습니다
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── 하단 고정 액션 바 ── */}
      {phase !== "done" && phase !== "matching" && phase !== "saving" && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            {/* 왼쪽: 상태 요약 */}
            <div className="text-xs text-foreground-muted">
              {phase === "input" && filledCount > 0 && (
                <span>{filledCount}/14 입력됨</span>
              )}
              {phase === "review" && (
                <span className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-green-600">
                    <Check className="h-3 w-3" />{confirmedCount} 매칭
                  </span>
                  {failedCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="h-3 w-3" />{failedCount} 실패
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* 오른쪽: 액션 버튼 */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg px-3 py-2 text-xs text-foreground-muted transition hover:bg-surface-secondary hover:text-foreground-secondary"
              >
                초기화
              </button>

              {(phase === "input" || phase === "review") && (
                <button
                  type="button"
                  onClick={handleMatch}
                  disabled={filledCount === 0}
                  className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-40"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {phase === "review" ? "재매칭" : "AI 매칭"}
                  {filledCount > 0 && (
                    <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px]">
                      {filledCount}
                    </span>
                  )}
                </button>
              )}

              {phase === "review" && (
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                >
                  <Save className="h-3.5 w-3.5" />
                  저장
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 질문 행 컴포넌트 ──

function QuestionRow({
  qNum,
  description,
  matchData,
  phase,
  siblingTopic,
  candidatesByCategory,
  loadingCandidates,
  onDescChange,
  onToggleConfirm,
  onLoadCandidates,
  onManualMatch,
}: {
  qNum: number;
  description: string;
  matchData?: { match: QuestionMatch | null; confirmed: boolean };
  phase: Phase;
  siblingTopic: string | null;
  candidatesByCategory: Record<string, Record<string, CandidateQuestion[]>>;
  loadingCandidates: boolean;
  onDescChange: (qNum: number, value: string) => void;
  onToggleConfirm: (qNum: number) => void;
  onLoadCandidates: () => void;
  onManualMatch: (qNum: number, question: CandidateQuestion) => void;
}) {
  const match = matchData?.match;
  const confirmed = matchData?.confirmed ?? false;
  const hasInput = description.trim().length > 0;

  const [showManual, setShowManual] = useState(false);
  const [manualTopic, setManualTopic] = useState("");

  // 해당 질문 번호의 카테고리에 맞는 후보만 필터링
  const category = getCategoryForQNum(qNum);
  const catData = candidatesByCategory[category] || {};
  const filteredTopics = Object.keys(catData).sort();

  const openManual = () => {
    onLoadCandidates();
    setShowManual(true);
    setManualTopic(siblingTopic || "");
  };

  const topicQuestions = manualTopic ? (catData[manualTopic] || []) : [];

  const selectQuestion = (q: CandidateQuestion) => {
    onManualMatch(qNum, q);
    setShowManual(false);
  };

  return (
    <div>
      {/* 입력 필드 */}
      <div className="flex items-center gap-2">
        <span className={`w-7 shrink-0 text-right text-[11px] font-bold ${
          phase === "review" && match?.questionId && confirmed
            ? "text-green-600"
            : phase === "review" && match && !match.questionId
              ? "text-amber-500"
              : "text-foreground-muted"
        }`}>
          Q{qNum}
        </span>
        <input
          type="text"
          value={description}
          onChange={(e) => onDescChange(qNum, e.target.value)}
          placeholder="질문 설명..."
          disabled={phase === "matching" || phase === "saving"}
          className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary-500 focus:outline-none disabled:opacity-50"
        />
      </div>

      {/* 매칭 결과 */}
      {(phase === "review" || phase === "done") && hasInput && match && (
        <div className="ml-9 mt-1">
          {match.questionId ? (
            <div className="flex items-start gap-1.5">
              {/* 매칭 결과 카드 */}
              <div
                className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs ${
                  confirmed
                    ? "border-green-200 bg-green-50/70"
                    : "border-red-200 bg-red-50/70 opacity-60 line-through"
                }`}
              >
                {/* 1줄: 토픽 > 질문 간략명 (confidence%) */}
                <div className="flex items-baseline gap-1">
                  <span className="font-semibold text-foreground">
                    {match.questionShort}
                  </span>
                  <span className={`text-[10px] ${
                    match.confidence >= 0.9
                      ? "text-green-600"
                      : match.confidence >= 0.7
                        ? "text-amber-600"
                        : "text-red-500"
                  }`}>
                    {Math.round(match.confidence * 100)}%
                  </span>
                </div>
                {/* 2줄: 영어 */}
                {match.questionEnglish && (
                  <div className="mt-0.5 leading-snug text-foreground-secondary">
                    {match.questionEnglish}
                  </div>
                )}
                {/* 3줄: 한글 */}
                {match.questionKorean && (
                  <div className="mt-0.5 leading-snug text-foreground-muted">
                    {match.questionKorean}
                  </div>
                )}
              </div>

              {/* 액션 버튼 */}
              {phase === "review" && (
                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    onClick={() => onToggleConfirm(qNum)}
                    className={`rounded-md p-1 transition ${
                      confirmed
                        ? "text-green-600 hover:bg-green-100"
                        : "text-red-400 hover:bg-red-100"
                    }`}
                    title={confirmed ? "거절" : "승인"}
                  >
                    {confirmed ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={openManual}
                    className="rounded-md p-1 text-foreground-muted transition hover:bg-amber-100 hover:text-amber-600"
                    title="수동 매칭"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* 매칭 실패 */
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 px-2.5 py-1.5 text-xs text-amber-700">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="flex-1">매칭 실패 — DB에서 유사 질문을 찾지 못했습니다</span>
              {phase === "review" && (
                <button
                  type="button"
                  onClick={openManual}
                  className="shrink-0 rounded bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800 transition hover:bg-amber-300"
                >
                  수동 선택
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 수동 매칭 패널 */}
      {showManual && phase === "review" && (
        <div className="ml-9 mt-1.5 rounded-lg border border-primary-200 bg-primary-50/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">수동 매칭 — Q{qNum}</span>
            <button
              type="button"
              onClick={() => setShowManual(false)}
              className="rounded p-0.5 text-foreground-muted hover:bg-primary-100 hover:text-foreground-secondary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {loadingCandidates ? (
            <div className="flex items-center gap-2 py-3 text-xs text-foreground-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              질문 목록 로딩 중...
            </div>
          ) : (
            <>
              {/* 주제 선택 (카테고리: {category}) */}
              <div className="mb-2">
                <div className="mb-1 text-[10px] text-foreground-muted">
                  카테고리: <span className="font-semibold">{category}</span>
                </div>
                <select
                  value={manualTopic}
                  onChange={(e) => setManualTopic(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary-500 focus:outline-none"
                >
                  <option value="">주제를 선택하세요</option>
                  {filteredTopics.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic} ({catData[topic]?.length || 0})
                    </option>
                  ))}
                </select>
                {siblingTopic && manualTopic !== siblingTopic && (
                  <button
                    type="button"
                    onClick={() => setManualTopic(siblingTopic)}
                    className="mt-1 text-[11px] text-primary-500 hover:underline"
                  >
                    같은 세트 주제: {siblingTopic}
                  </button>
                )}
              </div>

              {/* 질문 목록 */}
              {manualTopic && (
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {topicQuestions.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => selectQuestion(q)}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-left text-xs transition hover:border-primary-300 hover:bg-primary-50"
                    >
                      <div className="flex items-baseline gap-1">
                        <span className="font-medium text-foreground">
                          {q.question_short}
                        </span>
                        {q.question_type_kor && (
                          <span className="text-[10px] text-foreground-muted">
                            {q.question_type_kor}
                          </span>
                        )}
                      </div>
                      {q.question_english && (
                        <div className="mt-0.5 text-foreground-secondary">
                          {q.question_english}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
