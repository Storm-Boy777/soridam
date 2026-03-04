"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  Mic2,
  AlertTriangle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
  BarChart3,
} from "lucide-react";
import { getEvaluation } from "@/lib/actions/mock-exam";
import type {
  MockTestEvaluation,
  CheckboxResult,
  CorrectionItem,
  DeepAnalysis,
  PronunciationAssessment,
  EvalStatus,
} from "@/lib/types/mock-exam";

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

// ── Props ──

interface TrainingEvalPanelProps {
  sessionId: string;
  evalStatusMap: Record<number, EvalStatus>;
  questions: Array<{
    id: string;
    question_english: string;
    question_korean: string;
    question_type_eng: string;
    topic: string;
    category: string;
    audio_url: string | null;
  }>;
  questionIds: string[]; // session.question_ids (Q1~Q15)
  onEvalNotify?: (questionNumber: number) => void;
}

// ── 외부에서 호출 가능한 메서드 ──

export interface TrainingEvalPanelRef {
  openPanel: (questionNumber: number) => void;
}


// ── 메인 컴포넌트 ──

export const TrainingEvalPanel = forwardRef<
  TrainingEvalPanelRef,
  TrainingEvalPanelProps
>(function TrainingEvalPanel({ sessionId, evalStatusMap, questions, questionIds, onEvalNotify }, ref) {
  // 이미 알림 표시한 문항
  const notifiedRef = useRef<Set<number>>(new Set());
  // 패널 열기 (어떤 문항의 상세를 보는지)
  const [panelQNum, setPanelQNum] = useState<number | null>(null);
  // 패널 평가 데이터
  const [panelData, setPanelData] = useState<MockTestEvaluation | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);

  // questions 맵
  const qMap = new Map(questions.map((q) => [q.id, q]));

  // evalStatusMap 변화 감지 → 부모에게 알림 전달
  useEffect(() => {
    for (const [qStr, status] of Object.entries(evalStatusMap)) {
      const qNum = Number(qStr);
      if (qNum <= 1) continue; // Q1 제외
      if (notifiedRef.current.has(qNum)) continue;

      if (status === "completed" || status === "skipped" || status === "failed") {
        notifiedRef.current.add(qNum);

        if (status === "completed") {
          onEvalNotify?.(qNum);
        }
      }
    }
  }, [evalStatusMap, onEvalNotify]);

  // 패널 열기
  const openPanel = useCallback(
    async (qNum: number) => {
      setPanelQNum(qNum);
      setPanelLoading(true);
      setPanelData(null);

      const res = await getEvaluation({
        session_id: sessionId,
        question_number: qNum,
      });

      setPanelData(res.data || null);
      setPanelLoading(false);
    },
    [sessionId]
  );

  // 외부에서 openPanel 호출 가능하도록 노출
  useImperativeHandle(ref, () => ({ openPanel }), [openPanel]);

  // 패널 닫기
  const closePanel = useCallback(() => {
    setPanelQNum(null);
    setPanelData(null);
  }, []);

  // 현재 패널 문항의 질문 정보
  const panelQuestionId = panelQNum ? questionIds[panelQNum - 1] : null;
  const panelQuestion = panelQuestionId ? qMap.get(panelQuestionId) : null;

  return (
    <>
      {/* ── 바텀 시트 패널 ── */}
      {panelQNum && (
        <>
          {/* 배경 오버레이 */}
          <div
            className="fixed inset-0 z-50 bg-black/30 animate-fadeIn"
            onClick={closePanel}
          />

          {/* 패널 */}
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface shadow-2xl animate-slideUp md:inset-x-auto md:right-4 md:bottom-4 md:left-auto md:w-[420px] md:rounded-2xl md:border">
            {/* 헤더 */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-50">
                  <BarChart3 size={14} className="text-primary-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Q{panelQNum} 개별 평가
                  </h3>
                  {panelQuestion && (
                    <p className="text-[10px] text-foreground-muted">
                      {QT_KO[panelQuestion.question_type_eng] || panelQuestion.question_type_eng}
                      {panelQuestion.topic && ` · ${panelQuestion.topic}`}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={closePanel}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-secondary"
              >
                <X size={16} className="text-foreground-muted" />
              </button>
            </div>

            {/* 콘텐츠 */}
            <div className="px-4 py-4">
              {panelLoading ? (
                <div className="flex flex-col items-center py-8">
                  <Loader2
                    size={24}
                    className="animate-spin text-primary-500"
                  />
                  <p className="mt-2 text-sm text-foreground-secondary">
                    평가 결과를 불러오는 중...
                  </p>
                </div>
              ) : !panelData ? (
                <p className="py-8 text-center text-sm text-foreground-muted">
                  평가 데이터가 없습니다.
                </p>
              ) : panelData.skipped ? (
                <p className="py-8 text-center text-sm text-foreground-muted">
                  이 문항은 건너뛰었습니다.
                </p>
              ) : (
                <div className="space-y-4">
                  {/* 통과율 요약 바 */}
                  {panelData.pass_rate != null && (
                    <PassRateBar
                      passRate={panelData.pass_rate}
                      passCount={panelData.pass_count}
                      failCount={panelData.fail_count}
                      checkboxType={panelData.checkbox_type}
                    />
                  )}

                  {/* 나의 답변 */}
                  {panelData.transcript && (
                    <TranscriptSection
                      transcript={panelData.transcript}
                      wpm={panelData.wpm}
                      audioDuration={panelData.audio_duration}
                      fillerCount={panelData.filler_count}
                      longPauseCount={panelData.long_pause_count}
                    />
                  )}

                  {/* 발음 점수 */}
                  {panelData.pronunciation_assessment && (
                    <PronunciationSection
                      assessment={panelData.pronunciation_assessment}
                    />
                  )}

                  {/* 체크박스 상세 */}
                  {panelData.checkboxes && (
                    <CheckboxSection
                      checkboxes={panelData.checkboxes}
                      passCount={panelData.pass_count}
                      failCount={panelData.fail_count}
                    />
                  )}

                  {/* 교정 사항 */}
                  {panelData.corrections &&
                    panelData.corrections.length > 0 && (
                      <CorrectionsSection
                        corrections={panelData.corrections}
                      />
                    )}

                  {/* 심층 분석 */}
                  {panelData.deep_analysis && (
                    <DeepAnalysisSection analysis={panelData.deep_analysis} />
                  )}
                </div>
              )}
            </div>

            {/* 하단 닫기 버튼 */}
            <div className="sticky bottom-0 border-t border-border bg-surface px-4 py-3">
              <button
                onClick={closePanel}
                className="w-full rounded-xl bg-surface-secondary py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:bg-border"
              >
                닫기
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
});

// ── 통과율 바 ──

function PassRateBar({
  passRate,
  passCount,
  failCount,
  checkboxType,
}: {
  passRate: number;
  passCount: number | null;
  failCount: number | null;
  checkboxType: string | null;
}) {
  const pct = (passRate * 100).toFixed(0);
  const color =
    passRate >= 0.7
      ? "bg-green-500"
      : passRate >= 0.4
        ? "bg-yellow-500"
        : "bg-red-500";
  const textColor =
    passRate >= 0.7
      ? "text-green-600"
      : passRate >= 0.4
        ? "text-yellow-600"
        : "text-red-500";

  return (
    <div className="rounded-xl border border-border bg-surface-secondary/30 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground-muted">
          체크박스 통과율 {checkboxType && `(${checkboxType})`}
        </span>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-0.5 text-green-600">
            <CheckCircle2 size={11} /> {passCount ?? 0}
          </span>
          <span className="flex items-center gap-0.5 text-red-500">
            <XCircle size={11} /> {failCount ?? 0}
          </span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex-1">
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-secondary">
            <div
              className={`h-full rounded-full ${color} transition-all duration-500`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <span className={`text-lg font-bold ${textColor}`}>{pct}%</span>
      </div>
    </div>
  );
}

// ── 답변 트랜스크립트 ──

function TranscriptSection({
  transcript,
  wpm,
  audioDuration,
  fillerCount,
  longPauseCount,
}: {
  transcript: string;
  wpm: number | null;
  audioDuration: number | null;
  fillerCount: number | null;
  longPauseCount: number | null;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-foreground-muted">
        나의 답변
      </p>
      <p className="whitespace-pre-wrap rounded-lg bg-white p-3 text-sm leading-relaxed text-foreground border border-border">
        {transcript}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-foreground-muted">
        {wpm != null && wpm > 0 && <span>WPM: {wpm.toFixed(0)}</span>}
        {audioDuration != null && audioDuration > 0 && (
          <span>{audioDuration.toFixed(0)}초</span>
        )}
        {fillerCount != null && fillerCount > 0 && (
          <span>필러: {fillerCount}개</span>
        )}
        {longPauseCount != null && longPauseCount > 0 && (
          <span>긴 침묵: {longPauseCount}</span>
        )}
      </div>
    </div>
  );
}

// ── 발음 점수 ──

function PronunciationSection({
  assessment,
}: {
  assessment: PronunciationAssessment;
}) {
  const scores = [
    { label: "정확도", value: assessment.accuracy_score },
    { label: "유창성", value: assessment.fluency_score },
    { label: "운율", value: assessment.prosody_score },
  ];

  const mispronounced = assessment.words?.filter(
    (w) => w.errorType !== "None"
  );

  return (
    <div>
      <p className="mb-2 flex items-center gap-1 text-xs font-medium text-foreground-muted">
        <Mic2 size={12} className="text-primary-400" />
        발음 평가
      </p>
      <div className="flex gap-2">
        {scores.map((s) => {
          const v = s.value ?? 0;
          const color =
            v >= 70
              ? "text-green-600"
              : v >= 40
                ? "text-yellow-600"
                : "text-red-500";
          const bgColor =
            v >= 70
              ? "bg-green-50"
              : v >= 40
                ? "bg-yellow-50"
                : "bg-red-50";
          return (
            <div
              key={s.label}
              className={`flex-1 rounded-lg ${bgColor} px-3 py-2 text-center`}
            >
              <p className="text-[10px] text-foreground-muted">{s.label}</p>
              <p className={`text-lg font-bold ${color}`}>
                {v > 0 ? v.toFixed(0) : "-"}
              </p>
            </div>
          );
        })}
      </div>
      {mispronounced && mispronounced.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 text-[10px] text-foreground-muted">
            오발음 단어 ({mispronounced.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {mispronounced.slice(0, 8).map((w, i) => (
              <span
                key={i}
                className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-500"
              >
                {w.word}{" "}
                <span className="text-red-400">({w.accuracyScore})</span>
              </span>
            ))}
            {mispronounced.length > 8 && (
              <span className="text-[10px] text-foreground-muted">
                +{mispronounced.length - 8}개
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 체크박스 상세 ──

function CheckboxSection({
  checkboxes,
  passCount,
  failCount,
}: {
  checkboxes: Record<string, CheckboxResult>;
  passCount: number | null;
  failCount: number | null;
}) {
  const entries = Object.entries(checkboxes);
  const passed = entries.filter(([, v]) => v.pass);
  const failed = entries.filter(([, v]) => !v.pass);

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-foreground-muted">
        체크박스 상세
      </p>

      {/* 실패 항목 */}
      {failed.length > 0 && (
        <div className="space-y-1">
          {failed.map(([id, cb]) => (
            <div
              key={id}
              className="flex items-start gap-2 rounded-lg bg-red-50/50 px-2.5 py-2"
            >
              <XCircle
                size={12}
                className="mt-0.5 shrink-0 text-red-400"
              />
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-medium text-red-500">
                  {id}
                </span>
                {cb.evidence && (
                  <p className="text-[10px] leading-relaxed text-foreground-secondary">
                    {cb.evidence}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 통과 항목 */}
      {passed.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[10px] text-green-600 hover:underline">
            통과 항목 {passed.length}개 보기
          </summary>
          <div className="mt-1 space-y-1">
            {passed.map(([id]) => (
              <div
                key={id}
                className="flex items-center gap-2 rounded-lg bg-green-50/50 px-2.5 py-1.5"
              >
                <CheckCircle2
                  size={10}
                  className="shrink-0 text-green-400"
                />
                <span className="text-[10px] font-mono text-green-600">
                  {id}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ── 교정 사항 ──

function CorrectionsSection({
  corrections,
}: {
  corrections: CorrectionItem[];
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1 text-xs font-medium text-foreground-muted">
        <AlertTriangle size={12} className="text-yellow-500" />
        교정 사항 ({corrections.length})
      </p>
      <div className="space-y-2">
        {corrections.map((c, i) => (
          <div
            key={i}
            className="rounded-lg border border-yellow-100 bg-yellow-50/30 p-2.5"
          >
            {c.error_parts && c.error_parts.length > 0 && (
              <p className="text-[11px] text-red-500 line-through">
                {c.error_parts.join(" ")}
              </p>
            )}
            {c.corrected_segment && (
              <p className="text-[11px] font-medium text-green-700">
                → {c.corrected_segment}
              </p>
            )}
            {c.tip_korean && (
              <p className="mt-1 text-[10px] text-foreground-secondary">
                💡 {c.tip_korean}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 심층 분석 ──

function DeepAnalysisSection({ analysis }: { analysis: DeepAnalysis }) {
  const [expanded, setExpanded] = useState(false);

  const sections = [
    { label: "전체 평가", text: analysis.overall_assessment },
    { label: "언어적 분석", text: analysis.linguistic_analysis },
    { label: "의사소통 효과", text: analysis.communicative_effectiveness },
    { label: "숙련도 갭", text: analysis.proficiency_gap },
    { label: "학습 권장", text: analysis.recommendation },
  ].filter((s) => s.text);

  if (sections.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs font-medium text-foreground-muted hover:text-foreground-secondary"
      >
        <MessageSquare size={12} className="text-primary-400" />
        심층 분석
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {expanded && (
        <div className="mt-2 space-y-2.5">
          {sections.map((s, i) => (
            <div key={i}>
              <p className="text-[10px] font-medium text-primary-500">
                {s.label}
              </p>
              <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground-secondary">
                {s.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
