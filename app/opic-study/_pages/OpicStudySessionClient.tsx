"use client";

/**
 * 오픽 스터디 세션 룸 — 클라이언트 컴포넌트
 *
 * Step 1~7 + 6-1~6-6 분기. Realtime 동기화.
 *
 * 분기 로직:
 * - mode_select → Step1
 * - category_select / topic_select → CategoryTopicStep (통합 화면, scripts/create BM)
 * - combo_select → Step4
 * - guide → Step5 (가이드 도착 대기 후 표시)
 * - recording: 본인 답변 상태에 따라 분기
 *   ├─ 본인 답변 + feedback 있음 → LiveStep64 (코칭 카드)
 *   ├─ 본인 답변 + feedback 없음 → Step63 (코칭 생성 중)
 *   ├─ 본인 답변 없음 + speaker null → Step61 (발화자 선정)
 *   ├─ 본인 답변 없음 + speaker == 본인 → LiveStep62Self (녹음)
 *   └─ 본인 답변 없음 + speaker != 본인 → Step62Other (청취)
 * - feedback_share / discussion → LiveStep66 (4명 비교)
 * - completed → LiveStep7 (종료)
 */

import { useEffect, useState, useTransition, useCallback, useMemo, useContext } from "react";
import {
  Globe,
  Building2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { SessionFrameContext } from "../_components/session-frame-context";
import { ImmersiveHeader } from "@/components/layout/immersive-header";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Step1, Step4, Step5, CategoryTopicStep } from "../_screens/SetupSteps";
import { goHome } from "@/lib/opic-study/nav";
import { SessionRoom } from "../_screens/SessionRoom";
import {
  Step61,
  Step62,
  Step63,
} from "../_screens/LoopSteps";
import { Step64 } from "../_screens/Step64";
import { Step66 } from "../_screens/Step66";
import { Step7 as Step7Screen } from "../_screens/Step7AndEdge";
import type { Step7Data } from "../_screens/Step7AndEdge";
import {
  selectMode,
  selectCategory,
  selectTopic,
  selectCombo,
  startRecording,
  generateGuide,
  endSession,
  claimSpeaker,
  nextSpeaker,
  nextQuestion,
  submitAnswer,
  skipQuestion,
  releaseSpeaker,
  forceReleaseSpeaker,
  retryFeedback,
  getCategoryStats,
  getTopicsForStudy,
  getCombosForStudy,
  rollbackStep,
} from "@/lib/actions/opic-study";
import type {
  CategoryStat,
  TopicForStudy,
  ComboForStudy,
} from "@/lib/types/opic-study";
import type { ComboItem, CategoryItem } from "../_screens/_mock";
import { QUESTION_TYPE_LABELS } from "@/lib/types/reviews";
import { useRecorder } from "@/lib/hooks/use-recorder";
import {
  BpConfirmDialog,
  HfPhone,
  HfStatusBar,
  HfHeader,
  HfBody,
  HfFooter,
  HfButton,
  HfCard,
  HfWave,
  CoachAvatar,
  CoachBlock,
  MbDot,
  MbStack,
  Pill,
  Tag,
  Hl,
  Insight,
  Quote,
  SectionH,
} from "../_components/bp";
import type {
  StudyCategory,
  SessionStep,
  OpicStudyAnswer,
  ApproachItem,
} from "@/lib/types/opic-study";

interface SessionState {
  id: string;
  step: SessionStep;
  status: string;
  online_mode: boolean;
  selected_category: StudyCategory | null;
  selected_topic: string | null;
  selected_combo_sig: string | null;
  selected_question_ids: string[];
  current_question_idx: number;
  current_speaker_user_id: string | null;
  ai_guide_intro: string | null;
  ai_guide_approaches: ApproachItem[] | null;
}

interface MemberInfo {
  key: "a" | "b" | "c" | "d";
  userId: string;
  name: string;
  initial: string;
}

interface StudyQuestionSummary {
  question_index: number;
  question_english: string;
  question_short: string | null;
  question_type_kor: string | null;
}

// ============================================================
// SessionFrameContext — Shell에서 presence + 연결 상태 표시용
// (정의는 _components/session-frame-context.tsx에서 분리됨)
// ============================================================
type ConnectionState = "connected" | "reconnecting" | "error";

interface Props {
  sessionId: string;
  currentUserId: string;
  groupId: string;
  groupName: string;
  /** 본인의 목표 등급 (profiles.target_grade) */
  myTargetGrade: string;
  members: MemberInfo[];
  initialSession: SessionState;
}

export function OpicStudySessionClient({
  sessionId,
  currentUserId,
  groupId,
  groupName,
  myTargetGrade,
  members,
  initialSession,
}: Props) {
  const router = useRouter();
  const [session, setSession] = useState<SessionState>(initialSession);
  const [answers, setAnswers] = useState<Record<string, OpicStudyAnswer>>({});
  const [, startTransition] = useTransition();

  // 학습 콘텐츠 데이터 (단계별 fetch)
  const [categoryStats, setCategoryStats] = useState<CategoryStat[] | null>(null);
  const [topics, setTopics] = useState<TopicForStudy[] | null>(null);
  const [combos, setCombos] = useState<ComboForStudy[] | null>(null);
  const [contentLoading, setContentLoading] = useState(false);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  // 멤버 매핑 헬퍼
  const memberByUserId = useMemo(
    () => Object.fromEntries(members.map((m) => [m.userId, m])),
    [members]
  );
  const me = memberByUserId[currentUserId];

  // ============================================================
  // Realtime 구독 — sessions UPDATE
  // ============================================================
  useEffect(() => {
    const channel = supabase
      .channel(`opic-study-session:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "opic_study_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload: { new: Partial<SessionState> }) => {
          setSession((prev) => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  // ============================================================
  // Realtime 구독 — answers INSERT/UPDATE + 초기 로드
  // ============================================================
  useEffect(() => {
    // 초기 로드
    void (async () => {
      const { data } = await supabase
        .from("opic_study_answers")
        .select("*")
        .eq("session_id", sessionId);
      if (data) {
        const map: Record<string, OpicStudyAnswer> = {};
        for (const a of data as unknown as OpicStudyAnswer[]) {
          map[`${a.user_id}_${a.question_idx}`] = a;
        }
        setAnswers(map);
      }
    })();

    const channel = supabase
      .channel(`opic-study-answers:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "opic_study_answers",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: { new: OpicStudyAnswer }) => {
          const a = payload.new;
          setAnswers((prev) => ({ ...prev, [`${a.user_id}_${a.question_idx}`]: a }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "opic_study_answers",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: { new: OpicStudyAnswer }) => {
          const a = payload.new;
          setAnswers((prev) => ({ ...prev, [`${a.user_id}_${a.question_idx}`]: a }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  // ============================================================
  // Realtime presence — 누가 접속 중인가 + 연결 상태 모니터링
  // ============================================================
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [connectionState, setConnectionState] = useState<
    "connected" | "reconnecting" | "error"
  >("connected");

  useEffect(() => {
    // 진짜 에러는 grace period 후 표시 (transient 에러는 자동 재연결로 회복)
    let errorTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleError = () => {
      if (errorTimer) return;
      errorTimer = setTimeout(() => setConnectionState("error"), 3000);
    };
    const clearError = () => {
      if (errorTimer) {
        clearTimeout(errorTimer);
        errorTimer = null;
      }
    };

    const ch = supabase.channel(`opic-study-presence:${sessionId}`, {
      config: { presence: { key: currentUserId } },
    });

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      setOnlineUserIds(new Set(Object.keys(state)));
    })
      .on("presence", { event: "join" }, ({ key }) => {
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          clearError();
          setConnectionState("connected");
          await ch.track({
            user_id: currentUserId,
            display_name: me?.name ?? "멤버",
            joined_at: new Date().toISOString(),
          });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // 진짜 에러 — grace period 후 표시 (즉시 X, transient 에러 흡수)
          scheduleError();
        }
        // CLOSED는 무시 — Supabase 자동 재연결 흐름의 정상 단계
        // (즉시 "reconnecting" 표시하면 카테고리 변경 등에서 깜빡임 발생)
      });

    return () => {
      clearError();
      void ch.untrack().catch(() => undefined);
      supabase.removeChannel(ch);
    };
  }, [sessionId, currentUserId, supabase, me?.name]);

  // ============================================================
  // 자동 가이드 생성 트리거
  // ============================================================
  useEffect(() => {
    if (session.step === "guide" && !session.ai_guide_intro) {
      generateGuide(sessionId).catch(() => undefined);
    }
  }, [session.step, session.ai_guide_intro, sessionId]);

  // ============================================================
  // 단계별 콘텐츠 fetch
  //   category_select → getCategoryStats
  //   topic_select → getTopicsForStudy(category, groupId)
  //   combo_select → getCombosForStudy(category, topic, groupId)
  // ============================================================
  useEffect(() => {
    if (session.step === "category_select" && !categoryStats) {
      setContentLoading(true);
      getCategoryStats()
        .then((res) => {
          if (res.data) setCategoryStats(res.data);
        })
        .finally(() => setContentLoading(false));
    }
  }, [session.step, categoryStats]);

  // 토픽 fetch — selected_category 변경 시 매번 새로 가져옴 (last-write-wins UX)
  useEffect(() => {
    if (
      session.step === "topic_select" &&
      session.selected_category
    ) {
      setContentLoading(true);
      setTopics(null); // 이전 카테고리 토픽 즉시 클리어
      getTopicsForStudy({
        category: session.selected_category,
        groupId,
      })
        .then((res) => {
          if (res.data) setTopics(res.data);
        })
        .finally(() => setContentLoading(false));
    }
  }, [session.step, session.selected_category, groupId]);

  // 콤보 fetch — selected_topic 변경 시 매번 새로 가져옴
  useEffect(() => {
    if (
      session.step === "combo_select" &&
      session.selected_category &&
      session.selected_topic
    ) {
      setContentLoading(true);
      setCombos(null); // 이전 토픽 콤보 즉시 클리어
      getCombosForStudy({
        category: session.selected_category,
        topic: session.selected_topic,
        groupId,
      })
        .then((res) => {
          if (res.data) setCombos(res.data.combos);
        })
        .finally(() => setContentLoading(false));
    }
  }, [
    session.step,
    session.selected_category,
    session.selected_topic,
    groupId,
  ]);

  // 진행 단계 (guide/recording 등) 에서 combos가 비어있으면 복구 fetch
  // — 페이지 새로고침 또는 세션 재진입 시 currentQuestion이 null로 빈 라벨 표시 방지
  useEffect(() => {
    if (combos !== null) return;
    if (!session.selected_category || !session.selected_topic) return;
    if (!session.selected_combo_sig) return;
    // combo_select은 위 effect가 처리 — 중복 방지
    if (session.step === "combo_select") return;

    getCombosForStudy({
      category: session.selected_category,
      topic: session.selected_topic,
      groupId,
    }).then((res) => {
      if (res.data) setCombos(res.data.combos);
    });
  }, [
    combos,
    session.step,
    session.selected_category,
    session.selected_topic,
    session.selected_combo_sig,
    groupId,
  ]);

  // ============================================================
  // 답변 흐름: SessionRoom 안에서 모든 phase 처리 (recording step 유지)
  //   - 모든 멤버 답변 + F/B 완료 → SessionRoom 내부에서 "다음 질문" 버튼 → handleNextQuestion
  //   - feedback_share/discussion step은 사용 X (Step66 4명 비교 폐기)
  // ============================================================
  const idx = session.current_question_idx;

  // ============================================================
  // 종료 시 라우팅
  // ============================================================
  useEffect(() => {
    if (session.status === "abandoned") {
      router.push("/opic-study");
    }
  }, [session.status, router]);

  // ============================================================
  // SA 핸들러
  // ============================================================

  const handleSelectMode = useCallback(
    (mode: "online" | "offline") => {
      startTransition(async () => {
        await selectMode(sessionId, mode === "online");
      });
    },
    [sessionId]
  );

  const handleSelectCategory = useCallback(
    (categoryKey: string) => {
      const map: Record<string, StudyCategory> = {
        general: "general",
        rp: "roleplay",
        adv: "advance",
      };
      const cat = map[categoryKey];
      if (!cat) return;

      // Optimistic — Realtime UPDATE 기다리지 않고 즉시 토픽 클리어 (로딩 표시)
      // 사용자에게 "선택 즉시 다음 단계 준비 중" 피드백 제공
      setTopics(null);
      setContentLoading(true);

      startTransition(async () => {
        await selectCategory(sessionId, cat);
      });
    },
    [sessionId]
  );

  const handleSelectTopic = useCallback(
    (topicName: string) => {
      // 실제 데이터: 한글 topic name 직접 전달
      startTransition(async () => {
        await selectTopic(sessionId, topicName);
      });
    },
    [sessionId]
  );

  const handleSelectCombo = useCallback(
    (combo: ComboItem) => {
      const qids = combo.qids;
      const sig = combo.sig;
      if (!qids || !sig) {
        toast.error("콤보 데이터가 올바르지 않아요.");
        return;
      }
      startTransition(async () => {
        await selectCombo(sessionId, sig, qids);
      });
    },
    [sessionId]
  );

  const handleStartRecording = useCallback(() => {
    startTransition(async () => {
      await startRecording(sessionId);
    });
  }, [sessionId]);

  const handleClaimSpeaker = useCallback(() => {
    startTransition(async () => {
      await claimSpeaker(sessionId);
    });
  }, [sessionId]);

  const handleNextSpeaker = useCallback(() => {
    startTransition(async () => {
      const res = await nextSpeaker(sessionId);
      if (res.error) toast.error(`다음 발화자 전환 실패: ${res.error}`);
    });
  }, [sessionId]);

  const handleNextQuestion = useCallback(() => {
    startTransition(async () => {
      const res = await nextQuestion(sessionId);
      if (res.error) {
        toast.error(`다음 질문 전환 실패: ${res.error}`);
      }
      // res.data?.completed: session.status='completed'로 전환됨, 자동 분기
    });
  }, [sessionId]);

  // 확인 다이얼로그 상태 (세션 종료 / 모드 전환 / 답변 패스 / 단계 되돌리기)
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "end" | "skip" | "toggleMode" | "rollback";
    title: string;
    description?: string;
    confirmLabel: string;
    variant: "danger" | "warning";
    icon: string;
    onConfirm: () => void;
  } | null>(null);

  const handleSkipAnswer = useCallback(() => {
    setConfirmDialog({
      type: "skip",
      title: "이번 질문을 건너뛸까요?",
      description:
        "이 질문에서는 답변하지 않아요. 다른 멤버 답변을 함께 들으며 학습할 수 있어요.",
      confirmLabel: "건너뛰기",
      variant: "warning",
      icon: "⏭",
      onConfirm: () => {
        setConfirmDialog(null);
        const questionId = session.selected_question_ids[idx];
        if (!questionId) return;
        startTransition(async () => {
          // skipQuestion — INSERT audio_url=null + 발화권 해제 (본인이 발화자였다면)
          // → 본인은 이 질문에서 더 이상 자임 못 함 (myAnswered 통과)
          const res = await skipQuestion({
            sessionId,
            questionId,
            questionIdx: idx,
          });
          if (res.error) {
            toast.error(`패스 실패: ${res.error}`);
          }
        });
      },
    });
  }, [sessionId, idx, session.selected_question_ids]);

  const handleEndSession = useCallback(() => {
    setConfirmDialog({
      type: "end",
      title: "세션을 종료할까요?",
      description: "지금까지 학습한 내용은 이력에 저장돼요.",
      confirmLabel: "종료",
      variant: "danger",
      icon: "🔚",
      onConfirm: () => {
        setConfirmDialog(null);
        startTransition(async () => {
          await endSession(sessionId);
          router.push("/opic-study");
        });
      },
    });
  }, [sessionId, router]);

  // 단계 되돌리기 (Step 3 → Step 2: 카테고리 다시 / Step 4 → Step 3: 주제 다시)
  const handleRollbackToCategory = useCallback(() => {
    setConfirmDialog({
      type: "rollback",
      title: "카테고리를 다시 고를까요?",
      description: "모든 멤버 화면이 카테고리 선택으로 함께 돌아가요.",
      confirmLabel: "돌아가기",
      variant: "warning",
      icon: "⏮",
      onConfirm: () => {
        setConfirmDialog(null);
        startTransition(async () => {
          const res = await rollbackStep(sessionId, "category_select");
          if (res.error) toast.error(res.error);
        });
      },
    });
  }, [sessionId]);

  const handleRollbackToTopic = useCallback(() => {
    setConfirmDialog({
      type: "rollback",
      title: "주제를 다시 고를까요?",
      description: "모든 멤버 화면이 주제 선택으로 함께 돌아가요.",
      confirmLabel: "돌아가기",
      variant: "warning",
      icon: "⏮",
      onConfirm: () => {
        setConfirmDialog(null);
        startTransition(async () => {
          const res = await rollbackStep(sessionId, "topic_select");
          if (res.error) toast.error(res.error);
        });
      },
    });
  }, [sessionId]);

  const handleSubmitAnswer = useCallback(
    async (audioBlob: Blob) => {
      const questionId = session.selected_question_ids[idx];
      if (!questionId) return;

      const fileName = `${sessionId}/${currentUserId}/${idx}.webm`;
      const MAX_RETRIES = 3;
      const sleep = (ms: number) =>
        new Promise<void>((r) => setTimeout(r, ms));

      // ─── Storage 업로드 (3회 자동 재시도, 지수 백오프 1s→2s→4s) ───
      let uploadErr: { message: string } | null = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const { error } = await supabase.storage
          .from("opic-study-recordings")
          .upload(fileName, audioBlob, {
            contentType: "audio/webm",
            upsert: true,
          });
        if (!error) {
          uploadErr = null;
          break;
        }
        uploadErr = { message: error.message };
        if (attempt < MAX_RETRIES) {
          // 재시도 알림 (사용자 인지)
          toast.message(
            `업로드 재시도 중… (${attempt + 1}/${MAX_RETRIES})`,
            { duration: 2000 }
          );
          await sleep(1000 * Math.pow(2, attempt));
        }
      }
      if (uploadErr) {
        toast.error(`업로드 실패 (${MAX_RETRIES}회 시도): ${uploadErr.message}`);
        await releaseSpeaker(sessionId).catch(() => undefined);
        throw new Error(`업로드 실패: ${uploadErr.message}`);
      }

      // ─── submitAnswer SA (3회 자동 재시도) ───
      let saErr: string | null = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const res = await submitAnswer({
          sessionId,
          questionId,
          questionIdx: idx,
          audioUrl: fileName,
        });
        if (!res.error) {
          saErr = null;
          break;
        }
        saErr = res.error;
        if (attempt < MAX_RETRIES) {
          toast.message(
            `답변 제출 재시도 중… (${attempt + 1}/${MAX_RETRIES})`,
            { duration: 2000 }
          );
          await sleep(1000 * Math.pow(2, attempt));
        }
      }
      if (saErr) {
        toast.error(`답변 제출 실패 (${MAX_RETRIES}회 시도): ${saErr}`);
        await releaseSpeaker(sessionId).catch(() => undefined);
        throw new Error(`답변 제출 실패: ${saErr}`);
      }
    },
    [sessionId, currentUserId, idx, session.selected_question_ids, supabase]
  );

  // ============================================================
  // 디자인 컴포넌트용 데이터 매핑
  // ============================================================

  // Step2: 고정 3개 카테고리 + categoryStats 카운트 결합 (scripts/create BM)
  const step2Categories: CategoryItem[] = useMemo(() => {
    const BASE: CategoryItem[] = [
      { key: "general", name: "일반", desc: "일상·습관·선호", questions: "2~10번 문제", tag: null },
      { key: "rp", name: "롤플레이", desc: "상황극·문제해결", questions: "11~13번 문제", tag: null },
      { key: "adv", name: "어드밴스", desc: "비교·변화·의견", questions: "14~15번 문제", tag: null },
    ];
    if (!categoryStats) return BASE;
    const SA_TO_KEY: Record<string, string> = {
      general: "general",
      roleplay: "rp",
      advance: "adv",
    };
    return BASE.map((c) => {
      const stat = categoryStats.find((s) => SA_TO_KEY[s.category] === c.key);
      return {
        ...c,
        // stat이 있으면 보조 정보로 표시 (desc는 카테고리 결을 그대로 유지)
        stat: stat
          ? `${stat.topic_count}개 토픽 · ${stat.combo_count}개 콤보`
          : undefined,
      };
    });
  }, [categoryStats]);

  // Step3: TopicForStudy[] → mock 형식 (콤보 수 표시)
  const step3Topics = useMemo(() => {
    if (!topics) return undefined;
    return topics.map((t) => ({
      key: t.topic,
      name: t.topic,
      meta:
        t.combo_count > 0 ? `콤보 ${t.combo_count}개` : "콤보 없음",
      recent: t.studied_count > 0,
    }));
  }, [topics]);

  // Step4: ComboForStudy[] → ComboItem 형식
  // 영어 원문(메인) + 한글 짧은 요약(보조) + [질문 유형] 라벨
  const step4Combos: ComboItem[] | undefined = useMemo(() => {
    if (!combos) return undefined;
    return combos.map((c, i) => ({
      key: c.sig,
      tag:
        i === 0
          ? "가장 자주 출제"
          : i === 1
            ? "두 번째로 자주"
            : `${c.frequency}회 출제`,
      questions: c.questions.map((q) => ({
        english: q.question_english,
        short: q.question_short ?? undefined,
        typeLabel: QUESTION_TYPE_LABELS[q.question_type] ?? q.question_type,
        appearancePct: q.appearance_pct,
        studiedByUser: q.studied_by_user,
      })),
      learned: c.studied_in_group,
      sig: c.sig,
      qids: c.representative_qids,
      frequency: c.frequency,
      appearancePct: c.appearance_pct,
    }));
  }, [combos]);

  // 현재 선택된 콤보 (답변 단계에서 질문 텍스트 매핑용)
  const currentCombo = useMemo(() => {
    if (!combos || !session.selected_combo_sig) return null;
    return combos.find((c) => c.sig === session.selected_combo_sig) ?? null;
  }, [combos, session.selected_combo_sig]);

  // 현재 콤보의 질문 list (Step5 가이드 — 카드 메인 데이터)
  // question_type_kor는 DB SSOT 값 그대로 (questions.question_type_kor)
  const comboQuestionsList = useMemo(() => {
    if (!currentCombo) return [];
    return currentCombo.questions.map((q, i) => ({
      question_index: i + 1, // 1-based — approaches.question_index와 매칭
      question_english: q.question_english,
      question_short: q.question_short,
      question_type_kor: q.question_type_kor ?? null,
    }));
  }, [currentCombo]);

  // 현재 답변 중인 질문 (Step61, Step62)
  const currentQuestion = currentCombo?.questions[idx] ?? null;

  // ============================================================
  // Step 분기
  // ============================================================

  const myAnswer = answers[`${currentUserId}_${idx}`];
  const speaker = session.current_speaker_user_id;

  // 세션 룸 안에서 모드 변경 X — 모드는 그룹 schedule에서 자동 결정.
  // (handleToggleMode 제거됨)

  const stepUi = renderStep();
  const isSessionCompleted =
    session.step === "completed" || session.status === "completed";
  // Step별 ImmersiveHeader subtitle 매핑
  const stepSubtitle = (() => {
    switch (session.step) {
      case "mode_select":
        return "입장 대기";
      case "category_select":
      case "topic_select":
        return "카테고리·주제";
      case "combo_select":
        return "콤보";
      case "guide":
        return "시작 전 가이드";
      case "recording":
        return `Q${idx + 1} · 답변`;
      case "feedback_share":
        return `Q${idx + 1} · 함께 보기`;
      case "discussion":
        return `Q${idx + 1} · 토론`;
      case "completed":
        return "오늘의 학습";
      default:
        return undefined;
    }
  })();

  return (
    <SessionFrameContext.Provider
      value={{
        onlineUserIds,
        members,
        connectionState,
        onlineMode: session.online_mode,
        isImmersiveLayout: true,
      }}
    >
      <ImmersiveHeader
        title="오픽 스터디"
        subtitle={stepSubtitle}
        backHref="/opic-study"
        onBack={
          // 통합 화면(category_select+topic_select)에서는 컴포넌트 내부에서 카테고리 단계 복귀를 다룸 — 외곽 ←는 홈
          session.step === "combo_select"
            ? handleRollbackToTopic
            : undefined
        }
        rightContent={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              aria-label={`오늘 모임 방식: ${session.online_mode ? "온라인" : "오프라인"}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 9px",
                fontSize: 11,
                fontWeight: 500,
                color: "var(--foreground-secondary, #6B6B7B)",
                background: "var(--surface-secondary, #F3F2EF)",
                border: "1px solid var(--border, #E8E6E1)",
                borderRadius: 8,
              }}
            >
              {session.online_mode ? (
                <Globe size={12} strokeWidth={1.8} aria-hidden="true" />
              ) : (
                <Building2 size={12} strokeWidth={1.8} aria-hidden="true" />
              )}
              <span className="hidden sm:inline">
                {session.online_mode ? "온라인" : "오프라인"}
              </span>
            </span>
            <button
              onClick={
                isSessionCompleted
                  ? () => router.push("/opic-study")
                  : handleEndSession
              }
              aria-label={isSessionCompleted ? "스터디 나가기" : "세션 종료"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "5px 10px",
                fontSize: 11,
                fontWeight: 500,
                color: "var(--foreground-secondary, #6B6B7B)",
                background: "transparent",
                border: "1px solid var(--border, #E8E6E1)",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              <X size={12} strokeWidth={2} aria-hidden="true" />
              {isSessionCompleted ? "나가기" : "종료"}
            </button>
          </div>
        }
      />
      <main className="flex h-0 min-h-0 flex-grow flex-col">
        {stepUi}
      </main>
      <BpConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.title ?? ""}
        description={confirmDialog?.description}
        confirmLabel={confirmDialog?.confirmLabel ?? "확인"}
        variant={confirmDialog?.variant ?? "danger"}
        icon={confirmDialog?.icon}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />
    </SessionFrameContext.Provider>
  );

  function renderStep(): React.ReactNode {
    switch (session.step) {
    case "mode_select":
      return (
        <Shell onEnd={handleEndSession}>
          <Step1
            groupName={groupName}
            memberCount={members.length}
            onStart={handleSelectMode}
            liveMode
          />
        </Shell>
      );

    case "category_select":
    case "topic_select":
      return (
        <Shell onEnd={handleEndSession}>
          <CategoryTopicStep
            step={session.step}
            selectedCategoryKey={
              session.selected_category === "general"
                ? "general"
                : session.selected_category === "roleplay"
                  ? "rp"
                  : session.selected_category === "advance"
                    ? "adv"
                    : null
            }
            categories={step2Categories}
            topics={step3Topics}
            topicsLoading={contentLoading}
            onSelectCategory={handleSelectCategory}
            onSelectTopic={handleSelectTopic}
            onBackToCategory={handleRollbackToCategory}
            liveMode
            groupName={groupName}
          />
        </Shell>
      );

    case "combo_select":
      return (
        <Shell onEnd={handleEndSession}>
          <Step4
            topic={session.selected_topic ?? "콤보"}
            combos={step4Combos ?? []}
            loading={contentLoading}
            onNext={handleSelectCombo}
            onBack={handleRollbackToTopic}
            liveMode
            groupName={groupName}
          />
        </Shell>
      );

    case "guide":
      return (
        <Shell onEnd={handleEndSession}>
          {session.ai_guide_intro && session.ai_guide_approaches ? (
            <Step5
              topic={session.selected_topic ?? undefined}
              introText={session.ai_guide_intro}
              approaches={session.ai_guide_approaches}
              comboQuestions={comboQuestionsList}
              onStart={handleStartRecording}
              liveMode
              groupName={groupName}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={28} className="animate-spin" style={{ color: "var(--bp-tc, #c96442)" }} />
                <p className="text-sm" style={{ color: "var(--bp-ink-3, #7a6f63)" }}>
                  AI 코치가 가이드를 준비하고 있어요
                </p>
              </div>
            </div>
          )}
        </Shell>
      );

    case "recording": {
      // 통합 SessionRoom — 모의고사 UI/UX BM (5단계 가이드 + AVA + 자동 녹음 흐름)
      const speakerAnswer = speaker ? answers[`${speaker}_${idx}`] ?? null : null;
      const handleRetryFb = async () => {
        await retryFeedback({ sessionId, questionIdx: idx });
      };
      return (
        <Shell onEnd={handleEndSession}>
          <SessionRoom
            sessionId={sessionId}
            questionIdx={idx}
            totalQuestions={session.selected_question_ids.length}
            questionText={currentQuestion?.question_english ?? ""}
            questionAudioUrl={currentQuestion?.audio_url ?? null}
            questionTypeLabel={
              currentQuestion?.question_type_kor ??
              (currentQuestion?.question_type
                ? QUESTION_TYPE_LABELS[currentQuestion.question_type] ??
                  currentQuestion.question_type
                : "")
            }
            questionShortKor={currentQuestion?.question_short ?? null}
            members={members.map((m) => ({
              key: m.key,
              name: m.name,
              userId: m.userId,
              initial: m.initial,
              isMe: m.userId === currentUserId,
              isOnline: m.userId === currentUserId
                ? true
                : onlineUserIds.has(m.userId),
            }))}
            currentSpeakerUserId={speaker}
            myAnswer={myAnswer ?? null}
            currentSpeakerAnswer={speakerAnswer}
            allAnswers={answers}
            groupName={groupName}
            topicLabel={`${session.selected_topic ?? "콤보"} 콤보`}
            comboProgress={`콤보 ${idx + 1}/${session.selected_question_ids.length}`}
            onClaimSpeaker={handleClaimSpeaker}
            onSubmitAnswer={handleSubmitAnswer}
            onSkipAnswer={handleSkipAnswer}
            onRetryFeedback={handleRetryFb}
            onNextSpeaker={handleNextSpeaker}
            onNextQuestion={handleNextQuestion}
            onForceReleaseSpeaker={async () => {
              const res = await forceReleaseSpeaker(sessionId);
              if (res.error) toast.error(res.error);
            }}
          />
        </Shell>
      );
    }

    // feedback_share/discussion: Step66 4명 비교 폐기 — SessionRoom의 coaching_review가 처리
    // (레거시 세션이 이 step에 머물러 있을 경우만 도달)
    case "feedback_share":
    case "discussion": {
      const speakerAnswer = speaker ? answers[`${speaker}_${idx}`] ?? null : null;
      const handleRetryFb = async () => {
        await retryFeedback({ sessionId, questionIdx: idx });
      };
      return (
        <Shell onEnd={handleEndSession}>
          <SessionRoom
            sessionId={sessionId}
            questionIdx={idx}
            totalQuestions={session.selected_question_ids.length}
            questionText={currentQuestion?.question_english ?? ""}
            questionAudioUrl={currentQuestion?.audio_url ?? null}
            questionTypeLabel={
              currentQuestion?.question_type_kor ??
              (currentQuestion?.question_type
                ? QUESTION_TYPE_LABELS[currentQuestion.question_type] ??
                  currentQuestion.question_type
                : "")
            }
            questionShortKor={currentQuestion?.question_short ?? null}
            members={members.map((m) => ({
              key: m.key,
              name: m.name,
              userId: m.userId,
              initial: m.initial,
              isMe: m.userId === currentUserId,
              isOnline:
                m.userId === currentUserId ? true : onlineUserIds.has(m.userId),
            }))}
            currentSpeakerUserId={speaker}
            myAnswer={myAnswer ?? null}
            currentSpeakerAnswer={speakerAnswer}
            allAnswers={answers}
            groupName={groupName}
            topicLabel={`${session.selected_topic ?? "콤보"} 콤보`}
            comboProgress={`콤보 ${idx + 1}/${session.selected_question_ids.length}`}
            onClaimSpeaker={handleClaimSpeaker}
            onSubmitAnswer={handleSubmitAnswer}
            onSkipAnswer={handleSkipAnswer}
            onRetryFeedback={handleRetryFb}
            onNextSpeaker={handleNextSpeaker}
            onNextQuestion={handleNextQuestion}
            onForceReleaseSpeaker={async () => {
              const res = await forceReleaseSpeaker(sessionId);
              if (res.error) toast.error(res.error);
            }}
          />
        </Shell>
      );
    }

    case "completed":
      return (
        <Shell onEnd={handleEndSession}>
          <LiveStep7
            members={members}
            answers={answers}
            questions={comboQuestionsList}
            selectedQuestionCount={session.selected_question_ids.length}
            topic={session.selected_topic ?? "콤보"}
            level={myTargetGrade}
            onHome={() => router.push("/opic-study")}
            groupName={groupName}
          />
        </Shell>
      );

    default:
      return null;
    }
  }
}

// ============================================================
// Shell — 풀스크린 wrapper + 종료 버튼 + presence/연결 상태 배너
// ============================================================
function Shell({
  children,
}: {
  children: React.ReactNode;
  /** 종료 핸들러 — ImmersiveHeader로 이동, prop 호환성 유지 */
  onEnd?: () => void;
}) {
  const ctx = useContext(SessionFrameContext);
  const connectionState = ctx?.connectionState ?? "connected";

  return (
    <div
      style={{
        position: "relative",
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}

      {/* 연결 끊김 배너 (전역, fixed top) */}
      {connectionState !== "connected" && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            padding: "8px 16px",
            background:
              connectionState === "error"
                ? "rgba(201, 100, 66, 0.95)"
                : "rgba(164, 129, 33, 0.95)",
            color: "white",
            fontSize: 12,
            fontWeight: 600,
            textAlign: "center",
            zIndex: 200,
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {connectionState === "error" ? (
            <>
              <AlertCircle
                size={14}
                strokeWidth={2}
                aria-hidden="true"
              />
              연결 오류 — 페이지를 새로고침해주세요
            </>
          ) : (
            <>
              <Loader2
                size={14}
                strokeWidth={2}
                aria-hidden="true"
                style={{ animation: "bp-spin 1s linear infinite" }}
              />
              연결이 불안정해요. 재연결 중…
            </>
          )}
        </div>
      )}

      {/* 멤버 presence pill은 ImmersiveHeader rightContent로 이동됨 (모든 단계 일관 표시) */}
    </div>
  );
}

function LiveStep7({
  members,
  answers,
  questions,
  selectedQuestionCount,
  topic,
  level,
  onHome,
  groupName,
}: {
  members: MemberInfo[];
  answers: Record<string, OpicStudyAnswer>;
  questions: StudyQuestionSummary[];
  selectedQuestionCount: number;
  topic: string;
  level: string;
  onHome: () => void;
  groupName?: string;
}) {
  const answerRecords = Object.values(answers);
  const questionCount = Math.max(
    selectedQuestionCount,
    questions.length,
    ...answerRecords.map((a) => a.question_idx + 1),
    0
  );

  const hasRecordForMember = (member: MemberInfo) =>
    answerRecords.some((a) => a.user_id === member.userId);

  const activeMembers = members.filter(hasRecordForMember);
  const displayMembers = activeMembers.length > 0 ? activeMembers : members;

  const questionSummaries: Step7Data["questionSummaries"] = Array.from(
    { length: questionCount },
    (_, i) => {
      const questionAnswers = answerRecords.filter((a) => a.question_idx === i);
      const answerCount = questionAnswers.filter((a) => !!a.audio_url).length;
      const skipCount = questionAnswers.filter((a) => !a.audio_url).length;
      const coachNoteCount = questionAnswers.filter((a) => !!a.feedback_result).length;
      const question = questions[i];
      const status =
        answerCount > 0 && skipCount > 0
          ? "mixed"
          : answerCount > 0
            ? "completed"
            : skipCount > 0
              ? "skipped"
              : "waiting";

      return {
        number: i + 1,
        label:
          question?.question_short ||
          question?.question_english ||
          `${topic} ${i + 1}번 질문`,
        status,
        meta: `답변 ${answerCount} · 패스 ${skipCount} · 코치노트 ${coachNoteCount}`,
      };
    }
  );

  const memberNotes: Step7Data["memberNotes"] = displayMembers.map((member) => {
    const memberAnswers = answerRecords.filter((a) => a.user_id === member.userId);
    return {
      key: member.key,
      name: member.name,
      answeredCount: memberAnswers.filter((a) => !!a.audio_url).length,
      skippedCount: memberAnswers.filter((a) => !a.audio_url).length,
      coachNoteCount: memberAnswers.filter((a) => !!a.feedback_result).length,
    };
  });

  const answerCount = answerRecords.filter((a) => !!a.audio_url).length;
  const skipCount = answerRecords.filter((a) => !a.audio_url).length;
  const coachNoteCount = answerRecords.filter((a) => !!a.feedback_result).length;
  const participantCount = displayMembers.length;
  const subtitleText =
    participantCount > 0
      ? `${participantCount}명이 함께 ${topic} 콤보 ${questionCount}문항을 마쳤어요 · ${level}`
      : `${topic} 콤보 ${questionCount}문항을 마쳤어요 · ${level}`;

  return (
    <Step7Screen
      onHome={onHome}
      data={{
        title: "잘 다녀왔어요",
        subtitle: subtitleText,
        sessionStats: {
          memberCount: participantCount,
          totalQuestions: questionCount,
          answerCount,
          skipCount,
          coachNoteCount,
        },
        questionSummaries,
        memberNotes,
        // nextRecommend: 추천 알고리즘 미구현 — 실데이터 연결 전까지 미표시
        nextRecommend: { name: "", meta: "" },
      }}
    />
  );
}


// 미사용 import silence
void MbStack;
void Pill;
void Step63;
