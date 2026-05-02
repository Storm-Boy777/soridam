"use client";

/**
 * 오픽 스터디 세션 룸 — 클라이언트 컴포넌트
 *
 * Step 1~7 + 6-1~6-6 분기. Realtime 동기화.
 *
 * 분기 로직:
 * - mode_select → Step1
 * - category_select → Step2
 * - topic_select → Step3
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

import { useEffect, useState, useTransition, useCallback, useMemo, createContext, useContext } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Step1, Step2, Step3, Step4, Step5 } from "../_screens/SetupSteps";
import {
  Step61,
  Step61Pc,
  Step62Other,
  Step62Pc,
  Step63,
  Step63Pc,
} from "../_screens/LoopSteps";
import { Step64Pc } from "../_screens/Step64";
import { Step66Pc } from "../_screens/Step66";
import { Step7Pc, EdgeMic } from "../_screens/Step7AndEdge";
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
  retryFeedback,
  getCategoryStats,
  getTopicsForStudy,
  getCombosForStudy,
} from "@/lib/actions/opic-study";
import type {
  CategoryStat,
  TopicForStudy,
  ComboForStudy,
} from "@/lib/types/opic-study";
import type { ComboItem, CategoryItem } from "../_screens/_mock";
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
  FeedbackResult,
  OpicStudyAnswer,
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
  ai_guide_text: string | null;
  ai_guide_key_points: string[] | null;
}

interface MemberInfo {
  key: "a" | "b" | "c" | "d";
  userId: string;
  name: string;
  initial: string;
}

// ============================================================
// SessionFrameContext — Shell에서 presence + 연결 상태 표시용
// ============================================================
type ConnectionState = "connected" | "reconnecting" | "error";
interface SessionFrameContextValue {
  onlineUserIds: Set<string>;
  members: MemberInfo[];
  connectionState: ConnectionState;
  onlineMode: boolean;
  onToggleMode?: () => void;
}
const SessionFrameContext = createContext<SessionFrameContextValue | null>(null);

interface Props {
  sessionId: string;
  currentUserId: string;
  groupId: string;
  groupName: string;
  groupLevel: string;
  members: MemberInfo[];
  initialSession: SessionState;
}

export function OpicStudySessionClient({
  sessionId,
  currentUserId,
  groupId,
  groupName,
  groupLevel,
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
          setConnectionState("connected");
          await ch.track({
            user_id: currentUserId,
            display_name: me?.name ?? "멤버",
            joined_at: new Date().toISOString(),
          });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionState("error");
        } else if (status === "CLOSED") {
          setConnectionState("reconnecting");
        }
      });

    return () => {
      void ch.untrack().catch(() => undefined);
      supabase.removeChannel(ch);
    };
  }, [sessionId, currentUserId, supabase, me?.name]);

  // ============================================================
  // 자동 가이드 생성 트리거
  // ============================================================
  useEffect(() => {
    if (session.step === "guide" && !session.ai_guide_text) {
      generateGuide(sessionId).catch(() => undefined);
    }
  }, [session.step, session.ai_guide_text, sessionId]);

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

  useEffect(() => {
    if (
      session.step === "topic_select" &&
      session.selected_category &&
      !topics
    ) {
      setContentLoading(true);
      getTopicsForStudy({
        category: session.selected_category,
        groupId,
      })
        .then((res) => {
          if (res.data) setTopics(res.data);
        })
        .finally(() => setContentLoading(false));
    }
  }, [session.step, session.selected_category, topics, groupId]);

  useEffect(() => {
    if (
      session.step === "combo_select" &&
      session.selected_category &&
      session.selected_topic &&
      !combos
    ) {
      setContentLoading(true);
      getCombosForStudy({
        category: session.selected_category,
        topic: session.selected_topic,
        groupId,
      })
        .then((res) => {
          if (res.data) setCombos(res.data);
        })
        .finally(() => setContentLoading(false));
    }
  }, [
    session.step,
    session.selected_category,
    session.selected_topic,
    combos,
    groupId,
  ]);

  // ============================================================
  // 모든 멤버 답변 완료 자동 감지 → feedback_share 전환
  //   (서버에서 자동 안 한다는 가정 — 클라이언트 보정)
  // ============================================================
  const idx = session.current_question_idx;
  const allMembersAnswered = useMemo(() => {
    if (session.step !== "recording") return false;
    return members.every((m) => {
      const a = answers[`${m.userId}_${idx}`];
      return a && a.feedback_result;
    });
  }, [session.step, members, answers, idx]);

  useEffect(() => {
    if (!allMembersAnswered) return;
    if (session.step !== "recording") return;
    // 다른 클라이언트가 먼저 변경하지 않은 경우만 전환 (race-safe하게 SA에 의존)
    // 현재 SA에 advanceToFeedbackShare 없음 → 직접 UPDATE는 RLS 통과해야 함
    void supabase
      .from("opic_study_sessions")
      .update({ step: "feedback_share" })
      .eq("id", sessionId)
      .eq("step", "recording")
      .eq("current_question_idx", idx)
      .then(() => undefined);
  }, [allMembersAnswered, session.step, idx, sessionId, supabase]);

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
      await nextSpeaker(sessionId);
    });
  }, [sessionId]);

  const handleNextQuestion = useCallback(() => {
    startTransition(async () => {
      const res = await nextQuestion(sessionId);
      if (res.data?.completed) {
        // session.status='completed'로 전환됨, 자동 분기
      }
    });
  }, [sessionId]);

  // 확인 다이얼로그 상태 (세션 종료 / 모드 전환 / 답변 패스)
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "end" | "skip" | "toggleMode";
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
      description: "다른 멤버에게 발화권이 넘어가요.",
      confirmLabel: "건너뛰기",
      variant: "warning",
      icon: "⏭",
      onConfirm: () => {
        setConfirmDialog(null);
        startTransition(async () => {
          await nextSpeaker(sessionId);
        });
      },
    });
  }, [sessionId]);

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

  const handleSubmitAnswer = useCallback(
    async (audioBlob: Blob) => {
      const questionId = session.selected_question_ids[idx];
      if (!questionId) return;

      const fileName = `${sessionId}/${currentUserId}/${idx}.webm`;

      // Storage 업로드
      const { error: uploadErr } = await supabase.storage
        .from("opic-study-recordings")
        .upload(fileName, audioBlob, {
          contentType: "audio/webm",
          upsert: true,
        });
      if (uploadErr) {
        toast.error(`업로드 실패: ${uploadErr.message}`);
        return;
      }

      // submitAnswer SA (EF fire-and-forget)
      const res = await submitAnswer({
        sessionId,
        questionId,
        questionIdx: idx,
        audioUrl: fileName,
      });
      if (res.error) {
        toast.error(`답변 제출 실패: ${res.error}`);
      }
    },
    [sessionId, currentUserId, idx, session.selected_question_ids, supabase]
  );

  // ============================================================
  // 디자인 컴포넌트용 데이터 매핑
  // ============================================================

  // Step2: 고정 3개 카테고리 + categoryStats 카운트 결합
  const step2Categories: CategoryItem[] = useMemo(() => {
    const BASE: CategoryItem[] = [
      { key: "general", name: "일반 주제", desc: "음악·여행·영화 등 일상 카테고리", tag: "추천", icon: "🌿" },
      { key: "rp", name: "롤플레이", desc: "주어진 상황에서 역할극 답변", tag: null, icon: "🎭" },
      { key: "adv", name: "어드밴스", desc: "복합 질문 · IH~AL 도전", tag: "AL 도전", icon: "🎯" },
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
        desc: stat
          ? `${stat.topic_count}개 토픽 · ${stat.combo_count}개 콤보`
          : c.desc,
      };
    });
  }, [categoryStats]);

  // Step3: TopicForStudy[] → mock 형식
  const step3Topics = useMemo(() => {
    if (!topics) return undefined;
    return topics.map((t) => ({
      key: t.topic,
      name: t.topic,
      meta:
        t.combo_count >= 10
          ? "출제율 ↑↑↑"
          : t.combo_count >= 5
            ? "출제율 ↑↑"
            : "출제율 ↑",
      recent: t.studied_count > 0,
    }));
  }, [topics]);

  // Step4: ComboForStudy[] → ComboItem 형식
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
      questions: c.questions.map(
        (q) =>
          q.question_korean ??
          q.question_english.slice(0, 30) +
            (q.question_english.length > 30 ? "…" : "")
      ),
      learned: c.studied_in_group,
      sig: c.sig,
      qids: c.representative_qids,
      frequency: c.frequency,
      appearancePct: c.appearance_pct,
      questionMeta: c.questions.map((q) => ({
        appearancePct: q.appearance_pct,
        studiedByUser: q.studied_by_user,
      })),
    }));
  }, [combos]);

  // ============================================================
  // Step 분기
  // ============================================================

  const myAnswer = answers[`${currentUserId}_${idx}`];
  const speaker = session.current_speaker_user_id;

  const handleToggleMode = useCallback(() => {
    const next = session.online_mode ? "오프라인" : "온라인";
    setConfirmDialog({
      type: "toggleMode",
      title: `${next} 모드로 변경할까요?`,
      description: session.online_mode
        ? "한 디바이스에 모여서 답변하는 모드로 바뀌어요."
        : "각자 디바이스에서 실시간 동기화되는 모드로 바뀌어요.",
      confirmLabel: "변경",
      variant: "warning",
      icon: session.online_mode ? "🏠" : "🌐",
      onConfirm: () => {
        setConfirmDialog(null);
        void selectMode(sessionId, !session.online_mode);
      },
    });
  }, [sessionId, session.online_mode]);

  const stepUi = renderStep();
  return (
    <SessionFrameContext.Provider
      value={{
        onlineUserIds,
        members,
        connectionState,
        onlineMode: session.online_mode,
        onToggleMode: handleToggleMode,
      }}
    >
      {stepUi}
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
      return (
        <Shell onEnd={handleEndSession}>
          <Step2
            categories={step2Categories}
            onNext={handleSelectCategory}
            liveMode
            groupName={groupName}
          />
        </Shell>
      );

    case "topic_select":
      return (
        <Shell onEnd={handleEndSession}>
          <Step3
            category={session.selected_category ?? "general"}
            topics={step3Topics}
            loading={contentLoading}
            onNext={handleSelectTopic}
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
            combos={step4Combos}
            loading={contentLoading}
            onNext={handleSelectCombo}
            liveMode
            groupName={groupName}
          />
        </Shell>
      );

    case "guide":
      return (
        <Shell onEnd={handleEndSession}>
          {session.ai_guide_text ? (
            <Step5
              topic={session.selected_topic ?? "콤보"}
              level={groupLevel}
              guideText={session.ai_guide_text}
              onStart={handleStartRecording}
              liveMode
              groupName={groupName}
            />
          ) : (
            <GuideLoading />
          )}
        </Shell>
      );

    case "recording": {
      // 본인 답변이 코칭까지 도착 → 코칭 카드
      if (myAnswer?.feedback_result) {
        return (
          <Shell onEnd={handleEndSession}>
            <LiveCoachCard
              myAnswer={myAnswer}
              questionIdx={idx}
              totalQuestions={session.selected_question_ids.length}
              questionEnglish=""
              speakerName={me?.name ?? "나"}
              onNextSpeaker={handleNextSpeaker}
              speakerActive={!!speaker}
              groupName={groupName}
              topicLabel={`${session.selected_topic ?? "콤보"} 콤보`}
              comboProgress={`콤보 ${idx + 1}/${session.selected_question_ids.length} 진행 중`}
              realMembers={members.map((m) => ({ key: m.key, initial: m.initial }))}
            />
          </Shell>
        );
      }
      // 본인 답변 제출했지만 코칭 미도착 → 코칭 생성 중 (또는 timeout 시 재시도)
      if (myAnswer) {
        return (
          <Shell onEnd={handleEndSession}>
            <FeedbackWaitOrFail
              answer={myAnswer}
              sessionId={sessionId}
              questionIdx={idx}
            />
          </Shell>
        );
      }
      // 발화자 미선정
      if (!speaker) {
        return (
          <Shell onEnd={handleEndSession}>
            <LiveStep61
              questionIdx={idx}
              totalQuestions={session.selected_question_ids.length}
              members={members}
              currentUserId={currentUserId}
              onClaim={handleClaimSpeaker}
              groupName={groupName}
              topicLabel={`${session.selected_topic ?? "콤보"} 콤보`}
            />
          </Shell>
        );
      }
      // 본인이 발화자 → 녹음
      if (speaker === currentUserId) {
        return (
          <Shell onEnd={handleEndSession}>
            <LiveStep62Self
              questionIdx={idx}
              totalQuestions={session.selected_question_ids.length}
              onSubmit={handleSubmitAnswer}
              onSkip={handleSkipAnswer}
              groupName={groupName}
              topicLabel={`${session.selected_topic ?? "콤보"} 콤보`}
              realMembers={members.map((m) => ({ key: m.key, name: m.name }))}
              meKey={me?.key ?? "a"}
            />
          </Shell>
        );
      }
      // 다른 멤버가 발화자 → 청취
      const speakerInfo = memberByUserId[speaker];
      return (
        <Shell onEnd={handleEndSession}>
          <Step62Other
            speakerName={speakerInfo?.name ?? "멤버"}
            speakerKey={speakerInfo?.key ?? "a"}
          />
        </Shell>
      );
    }

    case "feedback_share":
    case "discussion":
      return (
        <Shell onEnd={handleEndSession}>
          <LiveCompareView
            members={members}
            answers={answers}
            questionIdx={idx}
            totalQuestions={session.selected_question_ids.length}
            onNextQuestion={handleNextQuestion}
            groupName={groupName}
            topicLabel={`${session.selected_topic ?? "콤보"} 콤보`}
          />
        </Shell>
      );

    case "completed":
      return (
        <Shell onEnd={handleEndSession}>
          <LiveStep7
            members={members}
            answers={answers}
            topic={session.selected_topic ?? "콤보"}
            level={groupLevel}
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
  onEnd,
}: {
  children: React.ReactNode;
  onEnd?: () => void;
}) {
  const ctx = useContext(SessionFrameContext);
  const onlineCount = ctx?.onlineUserIds.size ?? 0;
  const totalMembers = ctx?.members.length ?? 0;
  const offlineMembers = (ctx?.members ?? []).filter(
    (m) => !ctx?.onlineUserIds.has(m.userId)
  );
  const allOnline = onlineCount === totalMembers && totalMembers > 0;
  const connectionState = ctx?.connectionState ?? "connected";

  return (
    <div style={{ minHeight: "100dvh", display: "flex", position: "relative" }}>
      {children}

      {/* 연결 끊김 배너 (전역, fixed top) */}
      {connectionState !== "connected" && (
        <div
          role="status"
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
          }}
        >
          {connectionState === "error"
            ? "🔴 연결 오류 — 페이지를 새로고침해주세요"
            : "🟡 연결이 불안정해요. 재연결 중…"}
        </div>
      )}

      {/* Presence indicator (fixed bottom-right) */}
      {ctx && totalMembers > 0 && (
        <div
          aria-label={`접속 멤버 ${onlineCount}/${totalMembers}`}
          title={
            offlineMembers.length > 0
              ? `오프라인: ${offlineMembers.map((m) => m.name).join(", ")}`
              : "모두 접속 중"
          }
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            padding: "8px 12px",
            fontSize: 11,
            fontWeight: 600,
            color: allOnline ? "#2d7a3d" : "var(--bp-tip)",
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(31,27,22,0.10)",
            boxShadow: "0 2px 8px rgba(31,27,22,0.08)",
            borderRadius: 999,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: allOnline ? "#4ab85a" : "var(--bp-tip)",
              display: "inline-block",
            }}
          />
          멤버 {onlineCount}/{totalMembers}
          {offlineMembers.length > 0 && offlineMembers.length <= 2 && (
            <span style={{ color: "var(--bp-ink-3)", fontWeight: 500 }}>
              · {offlineMembers.map((m) => m.name).join(", ")} 끊김
            </span>
          )}
        </div>
      )}

      {ctx?.onToggleMode && (
        <button
          onClick={ctx.onToggleMode}
          aria-label="모드 전환"
          title={`${ctx.onlineMode ? "온라인" : "오프라인"} 모드 — 클릭해서 전환`}
          style={{
            position: "fixed",
            top: 12,
            right: onEnd ? 64 : 12,
            padding: "6px 10px",
            fontSize: 11,
            color: "var(--bp-ink-3)",
            background: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(31,27,22,0.10)",
            borderRadius: 8,
            cursor: "pointer",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {ctx.onlineMode ? "🌐 온라인" : "🏠 오프라인"}
        </button>
      )}

      {onEnd && (
        <button
          onClick={onEnd}
          aria-label="세션 종료"
          style={{
            position: "fixed",
            top: 12,
            right: 12,
            padding: "6px 10px",
            fontSize: 11,
            color: "var(--bp-ink-3)",
            background: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(31,27,22,0.10)",
            borderRadius: 8,
            cursor: "pointer",
            zIndex: 100,
          }}
        >
          종료
        </button>
      )}
    </div>
  );
}

// ============================================================
// FeedbackWaitOrFail — F/B 생성 중 대기 + 60초 timeout 시 재시도 UI
// ============================================================
function FeedbackWaitOrFail({
  answer,
  sessionId,
  questionIdx,
}: {
  answer: OpicStudyAnswer;
  sessionId: string;
  questionIdx: number;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  useEffect(() => {
    const start = answer.created_at
      ? new Date(answer.created_at).getTime()
      : Date.now();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [answer.created_at]);

  const handleRetry = async () => {
    setRetrying(true);
    setRetryError(null);
    const res = await retryFeedback({ sessionId, questionIdx });
    setRetrying(false);
    if (res.error) {
      setRetryError(res.error);
    } else {
      // 재시도 카운터 리셋
      setElapsed(0);
    }
  };

  // 60초 미만 — 그냥 대기 화면
  if (elapsed < 60) {
    return <Step63 estimatedSec={20} />;
  }

  // 60초 이상 — 실패/지연 안내 + 재시도
  return (
    <HfPhone liveMode>
      <HfBody padding="24px 20px">
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 4 }}>🥲</div>
          <div className="t-h1">코칭 생성이 늦어지고 있어요</div>
          <p
            className="t-sm ink-3"
            style={{ margin: 0, lineHeight: 1.6, maxWidth: 320 }}
          >
            평소 15~25초 정도 걸리는데 1분이 넘었어요.
            <br />
            네트워크 문제일 수 있으니 다시 시도해주세요.
          </p>

          {retryError && (
            <p
              className="t-xs"
              style={{ color: "var(--bp-tc)", margin: 0 }}
            >
              {retryError}
            </p>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <HfButton
              variant="primary"
              size="lg"
              onClick={handleRetry}
              disabled={retrying}
            >
              {retrying ? "재시도 중…" : "다시 시도"}
            </HfButton>
          </div>

          <span className="t-xs ink-3">
            대기 {Math.floor(elapsed / 60)}분 {elapsed % 60}초
          </span>
        </div>
      </HfBody>
    </HfPhone>
  );
}

// ============================================================
// 가이드 로딩
// ============================================================
function GuideLoading() {
  return (
    <HfPhone liveMode>
      <HfBody padding="24px 20px">
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <div className="bp-coach-avatar lg">◐</div>
          <div className="t-h2">코치가 가이드를 준비 중이에요</div>
          <p className="t-sm ink-3" style={{ margin: 0, textAlign: "center" }}>
            잠시만 기다려주세요. (약 5초 소요)
          </p>
        </div>
      </HfBody>
    </HfPhone>
  );
}

// ============================================================
// LiveStep61 — 발화자 선정 (실제 멤버 데이터)
// ============================================================
function LiveStep61({
  questionIdx,
  totalQuestions,
  members,
  currentUserId,
  onClaim,
  groupName,
  topicLabel,
}: {
  questionIdx: number;
  totalQuestions: number;
  members: MemberInfo[];
  currentUserId: string;
  onClaim: () => void;
  groupName?: string;
  topicLabel?: string;
}) {
  const realMembers = members.map((m) => ({
    key: m.key,
    name: m.name,
    isMe: m.userId === currentUserId,
  }));
  return (
    <>
      <div className="bp-only-pc" style={{ flex: 1, minHeight: 0 }}>
        <Step61Pc
          onStart={onClaim}
          question={{
            num: questionIdx + 1,
            total: totalQuestions,
            type: "질문",
            english: "(질문 텍스트는 답변 시작 시 표시됩니다)",
            englishLong: "",
          }}
          groupName={groupName}
          topicLabel={topicLabel}
          realMembers={realMembers}
          questionText="(질문 텍스트는 답변 시작 시 표시됩니다)"
        />
      </div>
      <div className="bp-only-mobile" style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <LiveStep61Mobile
          questionIdx={questionIdx}
          totalQuestions={totalQuestions}
          members={members}
          currentUserId={currentUserId}
          onClaim={onClaim}
        />
      </div>
    </>
  );
}

function LiveStep61Mobile({
  questionIdx,
  totalQuestions,
  members,
  currentUserId,
  onClaim,
}: {
  questionIdx: number;
  totalQuestions: number;
  members: MemberInfo[];
  currentUserId: string;
  onClaim: () => void;
}) {
  return (
    <HfPhone liveMode>
      <HfHeader
        title={`Q${questionIdx + 1} · 누가 먼저?`}
        sub={`${questionIdx + 1}/${totalQuestions} 질문`}
        onBack={() => undefined}
      />

      <HfBody padding="20px">
        <HfCard
          padding={16}
          style={{ marginBottom: 16, background: "var(--bp-surface-2)", boxShadow: "none" }}
        >
          <SectionH>이번 질문</SectionH>
          <p className="t-body" style={{ margin: 0, lineHeight: 1.6 }}>
            (질문 텍스트는 답변 시작 시 표시됩니다)
          </p>
        </HfCard>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <span className="t-h3">먼저 답변할 사람</span>
          <span className="t-xs ink-3">먼저 누른 사람이 답변해요</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {members.map((m) => {
            const isMe = m.userId === currentUserId;
            return (
              <div
                key={m.userId}
                style={{
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  borderRadius: "var(--bp-radius)",
                  background: "var(--bp-surface)",
                  boxShadow: "var(--bp-shadow-sm)",
                }}
              >
                <MbDot color={m.key} initial={m.initial} live size={36} fontSize={13} />
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}
                >
                  <span className="t-sm" style={{ fontWeight: 600 }}>
                    {m.name}
                  </span>
                  <span className="t-xs ink-3">{isMe ? "나" : "대기 중"}</span>
                </div>
                {isMe && (
                  <HfButton variant="tc" size="sm" onClick={onClaim}>
                    내가 답변
                  </HfButton>
                )}
              </div>
            );
          })}
        </div>

        <HfCard
          padding={12}
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            background: "var(--bp-surface-2)",
            boxShadow: "none",
          }}
        >
          <CoachAvatar size="sm" />
          <p
            className="t-xs"
            style={{ margin: 0, lineHeight: 1.55, color: "var(--bp-ink-2)", flex: 1 }}
          >
            한 명이 답변하는 동안 나머지는 들으면서 표현을 메모해두세요.
          </p>
        </HfCard>
      </HfBody>
    </HfPhone>
  );
}

// ============================================================
// LiveStep62Self — 본인 녹음 (마이크 + 업로드)
// ============================================================
function LiveStep62Self({
  questionIdx,
  totalQuestions,
  onSubmit,
  onSkip,
  groupName,
  topicLabel,
  realMembers,
  meKey,
}: {
  questionIdx: number;
  totalQuestions: number;
  onSubmit: (blob: Blob) => Promise<void>;
  onSkip?: () => void;
  groupName?: string;
  topicLabel?: string;
  realMembers?: Array<{ key: "a" | "b" | "c" | "d"; name: string }>;
  meKey?: "a" | "b" | "c" | "d";
}) {
  const recorder = useRecorder({ maxDuration: 120, minDuration: 1 });
  const [submitting, setSubmitting] = useState(false);

  // 마운트 시 자동 녹음 시작
  useEffect(() => {
    if (recorder.state === "idle") {
      recorder.startRecording().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 마이크 권한 거부 시 — EdgeMic 화면 (mobile + PC 공통)
  if (recorder.error?.includes("권한")) {
    return (
      <EdgeMic
        onOpenSettings={() => recorder.startRecording().catch(() => undefined)}
        onLeave={onSkip}
      />
    );
  }

  const handleComplete = async () => {
    if (recorder.state === "recording") {
      recorder.stopRecording();
    }
    // recorder.audioBlob이 stopRecording 후 비동기적으로 set되므로 약간 대기
    setTimeout(async () => {
      if (recorder.audioBlob) {
        setSubmitting(true);
        await onSubmit(recorder.audioBlob);
        setSubmitting(false);
      }
    }, 200);
  };

  const fmtDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <>
      <div className="bp-only-pc" style={{ flex: 1, minHeight: 0 }}>
        <Step62Pc
          speakerKey={meKey ?? "a"}
          speakerName="나"
          duration={fmtDuration(recorder.duration)}
          question={{
            num: questionIdx + 1,
            total: totalQuestions,
            type: "질문",
            english: "(질문 텍스트는 답변 시작 시 표시됩니다)",
            englishLong: "",
          }}
          groupName={groupName}
          topicLabel={topicLabel}
          realMembers={realMembers}
          questionText="(질문 텍스트는 답변 시작 시 표시됩니다)"
          onSkip={onSkip}
        />
      </div>
      <div className="bp-only-mobile" style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <LiveStep62SelfMobile
          questionIdx={questionIdx}
          totalQuestions={totalQuestions}
          recorder={recorder}
          submitting={submitting}
          handleComplete={handleComplete}
          fmtDuration={fmtDuration}
          onSkip={onSkip}
        />
      </div>
    </>
  );
}

function LiveStep62SelfMobile({
  questionIdx,
  totalQuestions,
  recorder,
  submitting,
  handleComplete,
  fmtDuration,
  onSkip,
}: {
  questionIdx: number;
  totalQuestions: number;
  recorder: ReturnType<typeof useRecorder>;
  submitting: boolean;
  handleComplete: () => void;
  fmtDuration: (sec: number) => string;
  onSkip?: () => void;
}) {
  return (
    <HfPhone liveMode>
      <HfHeader
        title={`Q${questionIdx + 1} · 답변 중`}
        sub="당신이 답변할 차례예요"
        onBack={() => undefined}
        right={
          <span
            className="bp-pill"
            style={{ background: "rgba(201,100,66,0.12)", color: "var(--bp-tc)" }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                background: "var(--bp-tc)",
                borderRadius: "50%",
                display: "inline-block",
                animation: "bp-pulse 1.2s infinite",
              }}
            />
            {recorder.state === "recording" ? "녹음 중" : "준비 중"}
          </span>
        }
      />

      <HfBody padding="24px 20px">
        <HfCard padding={18} style={{ marginBottom: 20 }}>
          <SectionH>질문</SectionH>
          <p className="t-body" style={{ margin: 0, lineHeight: 1.6 }}>
            {questionIdx + 1}/{totalQuestions} — (질문 텍스트 표시 영역)
          </p>
        </HfCard>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div
            className="t-num"
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: "var(--bp-ink)",
              letterSpacing: "-0.02em",
            }}
          >
            {fmtDuration(recorder.duration)}
          </div>

          <HfWave bars={32} height={56} amplitude={44} color="tc" gap={3} />

          {recorder.warningMessage && (
            <span className="t-xs" style={{ color: "var(--bp-tc)" }}>
              {recorder.warningMessage}
            </span>
          )}
          <span className="t-sm ink-3">권장 답변 길이 · 40~60초</span>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <HfButton
            variant="secondary"
            style={{ flex: 1 }}
            onClick={() => recorder.reset()}
            disabled={submitting}
          >
            다시 시작
          </HfButton>
          <HfButton
            variant="primary"
            style={{ flex: 2 }}
            onClick={handleComplete}
            disabled={submitting || recorder.duration < 1}
          >
            {submitting ? "제출 중…" : "답변 완료 →"}
          </HfButton>
        </div>
        {onSkip && (
          <button
            onClick={onSkip}
            disabled={submitting}
            style={{
              marginTop: 10,
              padding: "8px 12px",
              fontSize: 12,
              color: "var(--bp-ink-3)",
              background: "transparent",
              border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
              textDecoration: "underline",
              alignSelf: "center",
            }}
          >
            이번 질문 건너뛰기
          </button>
        )}

        {recorder.error && (
          <div
            className="t-xs"
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 8,
              background: "var(--bp-polish-tint)",
              color: "var(--bp-tc)",
            }}
          >
            {recorder.error}
          </div>
        )}
      </HfBody>
    </HfPhone>
  );
}

// ============================================================
// LiveCoachCard — Step 6-4 (실제 feedback_result 매핑)
// ============================================================
function LiveCoachCard({
  myAnswer,
  questionIdx,
  totalQuestions,
  speakerName,
  onNextSpeaker,
  speakerActive,
  groupName,
  topicLabel,
  comboProgress,
  realMembers,
}: {
  myAnswer: OpicStudyAnswer;
  questionIdx: number;
  totalQuestions: number;
  questionEnglish: string;
  speakerName: string;
  onNextSpeaker: () => void;
  speakerActive: boolean;
  groupName?: string;
  topicLabel?: string;
  comboProgress?: string;
  realMembers?: Array<{ key: "a" | "b" | "c" | "d"; initial: string }>;
}) {
  const [tab, setTab] = useState<"coach" | "transcript">("coach");
  const fb = myAnswer.feedback_result as FeedbackResult | null;

  if (!fb) return null;

  return (
    <>
      <div className="bp-only-pc" style={{ flex: 1, minHeight: 0 }}>
        <Step64Pc
          onNext={onNextSpeaker}
          groupName={groupName}
          topicLabel={topicLabel}
          questionLabel={`Q${questionIdx + 1}`}
          comboProgress={comboProgress}
          realMembers={realMembers}
          realTranscript={myAnswer.transcript ?? undefined}
          feedbackText={fb.feedback_text}
          strengths={fb.strengths}
          improvements={fb.improvements}
          tips={fb.tips}
        />
      </div>
      <div className="bp-only-mobile" style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <LiveCoachCardMobile
          myAnswer={myAnswer}
          questionIdx={questionIdx}
          totalQuestions={totalQuestions}
          speakerName={speakerName}
          onNextSpeaker={onNextSpeaker}
          speakerActive={speakerActive}
          tab={tab}
          setTab={setTab}
          fb={fb}
        />
      </div>
    </>
  );
}

function LiveCoachCardMobile({
  myAnswer,
  questionIdx,
  totalQuestions,
  speakerName,
  onNextSpeaker,
  speakerActive,
  tab,
  setTab,
  fb,
}: {
  myAnswer: OpicStudyAnswer;
  questionIdx: number;
  totalQuestions: number;
  speakerName: string;
  onNextSpeaker: () => void;
  speakerActive: boolean;
  tab: "coach" | "transcript";
  setTab: (t: "coach" | "transcript") => void;
  fb: FeedbackResult;
}) {
  return (
    <HfPhone liveMode>
      <HfHeader
        title={`Q${questionIdx + 1} · 코칭`}
        sub={`${questionIdx + 1}/${totalQuestions} 질문 · ${speakerName}`}
        onBack={() => undefined}
        right={null}
      />

      <div className="bp-tabs">
        <button
          className={`bp-tab ${tab === "coach" ? "active" : ""}`}
          onClick={() => setTab("coach")}
        >
          코치 노트
        </button>
        <button
          className={`bp-tab ${tab === "transcript" ? "active" : ""}`}
          onClick={() => setTab("transcript")}
        >
          내 답변
        </button>
      </div>

      <HfBody padding="20px">
        {tab === "coach" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <CoachAvatar size="lg" />
              <div
                style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}
              >
                <span className="t-h3">AI 스터디 코치</span>
                <span className="t-xs ink-3">방금 도착</span>
              </div>
            </div>

            <p className="t-body" style={{ margin: 0, color: "var(--bp-ink)" }}>
              {fb.feedback_text}
            </p>

            {fb.strengths.length > 0 && (
              <CoachBlock tone="good">
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {fb.strengths.map((s, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      {s}
                    </li>
                  ))}
                </ul>
              </CoachBlock>
            )}

            {fb.improvements.length > 0 && (
              <CoachBlock tone="polish">
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {fb.improvements.map((s, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      {s}
                    </li>
                  ))}
                </ul>
              </CoachBlock>
            )}

            {fb.tips.length > 0 && (
              <CoachBlock tone="tip">
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {fb.tips.map((s, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      {s}
                    </li>
                  ))}
                </ul>
              </CoachBlock>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <HfButton
                variant="primary"
                full
                onClick={onNextSpeaker}
                disabled={speakerActive}
              >
                {speakerActive ? "다른 멤버 답변 중…" : "다음 발화자 →"}
              </HfButton>
            </div>
          </div>
        )}

        {tab === "transcript" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <HfCard padding={14}>
              <SectionH>내 답변</SectionH>
              <p
                className="t-body"
                style={{ margin: 0, lineHeight: 1.7, color: "var(--bp-ink)" }}
              >
                {myAnswer.transcript ?? "(답변 텍스트 없음)"}
              </p>
            </HfCard>
          </div>
        )}
      </HfBody>
    </HfPhone>
  );
}

// ============================================================
// LiveCompareView — Step 6-6 (4명 비교, 실제 데이터)
// ============================================================
function LiveCompareView({
  members,
  answers,
  questionIdx,
  totalQuestions,
  onNextQuestion,
  groupName,
  topicLabel,
}: {
  members: MemberInfo[];
  answers: Record<string, OpicStudyAnswer>;
  questionIdx: number;
  totalQuestions: number;
  onNextQuestion: () => void;
  groupName?: string;
  topicLabel?: string;
}) {
  const [focused, setFocused] = useState<string | null>(null);
  const focusedMember = focused
    ? (members.find((m) => m.userId === focused) ?? null)
    : null;
  const focusedAnswer = focused ? (answers[`${focused}_${questionIdx}`] ?? null) : null;

  // 토론 타이머 (5분, 진입 시 시작)
  const [secondsLeft, setSecondsLeft] = useState(5 * 60);
  useEffect(() => {
    setSecondsLeft(5 * 60);
    const t = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [questionIdx]);
  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const timerLabel = `${mm}:${String(ss).padStart(2, "0")}`;
  const timerExpired = secondsLeft === 0;

  // PC용 MemberAnswer 구성 (실제 멤버 + 답변 데이터)
  const pcMembers = members.map((m) => {
    const ans = answers[`${m.userId}_${questionIdx}`];
    const fb = ans?.feedback_result as FeedbackResult | null;
    return {
      key: m.key,
      initial: m.initial,
      name: m.name,
      duration: "0:--",
      answer: ans?.transcript ?? "(답변 없음)",
      bp: {
        tag: fb?.strengths?.[0]?.split("·")[0]?.trim() ?? "참여",
        note: fb?.strengths?.[0] ?? "답변 완료",
      },
      polish: fb?.improvements?.[0] ?? "다음 답변에서도 화이팅",
    };
  });

  return (
    <>
      <div className="bp-only-pc" style={{ flex: 1, minHeight: 0 }}>
        <Step66Pc
          onNext={onNextQuestion}
          members={pcMembers}
          groupName={groupName}
          topicLabel={topicLabel}
          questionLabel={`Q${questionIdx + 1} · 함께 보기`}
          comboProgress={`콤보 ${questionIdx + 1}/${totalQuestions}`}
          timerLabel={timerLabel}
          timerExpired={timerExpired}
        />
      </div>
      <div className="bp-only-mobile" style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <LiveCompareViewMobile
          members={members}
          answers={answers}
          questionIdx={questionIdx}
          totalQuestions={totalQuestions}
          onNextQuestion={onNextQuestion}
          focused={focused}
          setFocused={setFocused}
          focusedMember={focusedMember}
          focusedAnswer={focusedAnswer}
          timerLabel={timerLabel}
          timerExpired={timerExpired}
        />
      </div>
    </>
  );
}

function LiveCompareViewMobile({
  members,
  answers,
  questionIdx,
  totalQuestions,
  onNextQuestion,
  focused,
  setFocused,
  focusedMember,
  focusedAnswer,
  timerLabel,
  timerExpired,
}: {
  members: MemberInfo[];
  answers: Record<string, OpicStudyAnswer>;
  questionIdx: number;
  totalQuestions: number;
  onNextQuestion: () => void;
  focused: string | null;
  setFocused: (s: string | null) => void;
  focusedMember: MemberInfo | null;
  focusedAnswer: OpicStudyAnswer | null;
  timerLabel?: string;
  timerExpired?: boolean;
}) {
  return (
    <HfPhone liveMode>
      <HfHeader
        title="함께 보기"
        sub={`Q${questionIdx + 1} · ${members.length}명의 답변`}
        onBack={() => undefined}
        right={
          timerLabel ? (
            <span
              className="bp-pill"
              style={{
                background: timerExpired
                  ? "rgba(201, 100, 66, 0.15)"
                  : "rgba(74, 184, 90, 0.12)",
                color: timerExpired ? "var(--bp-tc)" : "#2d7a3d",
                fontWeight: 600,
                fontSize: 11,
              }}
              title="토론 시간"
            >
              💬 {timerExpired ? "시간 종료" : timerLabel}
            </span>
          ) : null
        }
      />

      <HfBody padding="20px">
        <Insight style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14 }}>✨</span>
            <span className="t-h3">함께 살펴봐요</span>
          </div>
          <p
            className="t-sm"
            style={{ margin: 0, lineHeight: 1.55, color: "var(--bp-ink)" }}
          >
            {members.length}명의 답변과 코칭을 비교하며 마음에 드는 표현 한 가지씩 골라봐요.
          </p>
        </Insight>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: members.length > 2 ? "1fr 1fr" : "1fr",
            gap: 10,
          }}
        >
          {members.map((m) => {
            const a = answers[`${m.userId}_${questionIdx}`];
            const fb = a?.feedback_result as FeedbackResult | null;
            return (
              <HfCard
                key={m.userId}
                padding={12}
                style={{ cursor: a ? "pointer" : "default", opacity: a ? 1 : 0.5 }}
                onClick={() => a && setFocused(m.userId)}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <MbDot color={m.key} initial={m.initial} size={24} fontSize={10} />
                  <span className="t-sm" style={{ fontWeight: 600 }}>
                    {m.name}
                  </span>
                </div>
                <p
                  className="t-xs"
                  style={{
                    margin: 0,
                    lineHeight: 1.5,
                    color: "var(--bp-ink-2)",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical" as const,
                    overflow: "hidden",
                  }}
                >
                  {a?.transcript ?? "(답변 미참여)"}
                </p>
                {fb?.strengths?.[0] && (
                  <div
                    style={{
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: "1px solid var(--bp-line)",
                    }}
                  >
                    <Tag tone="good" style={{ fontSize: 10 }}>
                      ✓ {fb.strengths[0]}
                    </Tag>
                  </div>
                )}
              </HfCard>
            );
          })}
        </div>
      </HfBody>

      <HfFooter>
        <HfButton variant="primary" size="lg" full onClick={onNextQuestion}>
          {questionIdx + 1 >= totalQuestions ? "세션 마무리 →" : "다음 질문 →"}
        </HfButton>
      </HfFooter>

      {/* 포커스 오버레이 */}
      {focusedMember && focusedAnswer && (
        <div
          onClick={() => setFocused(null)}
          className="bp-fade-in"
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(31,27,22,0.4)",
            display: "flex",
            alignItems: "flex-end",
            zIndex: 10,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bp-bg)",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              width: "100%",
              maxHeight: "80%",
              overflow: "auto",
            }}
          >
            <div
              style={{
                width: 40,
                height: 4,
                background: "var(--bp-line-strong)",
                borderRadius: 2,
                margin: "0 auto 16px",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <MbDot color={focusedMember.key} initial={focusedMember.initial} />
              <span className="t-h2">{focusedMember.name}</span>
            </div>
            <Quote style={{ marginBottom: 14 }}>
              {focusedAnswer.transcript ?? "(답변 없음)"}
            </Quote>
            {focusedAnswer.feedback_result &&
              (focusedAnswer.feedback_result as FeedbackResult).strengths
                .slice(0, 1)
                .map((s, i) => (
                  <CoachBlock
                    key={i}
                    tone="good"
                    label="이 점이 베스트"
                    style={{ marginBottom: 10 }}
                  >
                    {s}
                  </CoachBlock>
                ))}
            {focusedAnswer.feedback_result &&
              (focusedAnswer.feedback_result as FeedbackResult).improvements
                .slice(0, 1)
                .map((s, i) => (
                  <CoachBlock key={i} tone="polish" label="같이 배워볼 점">
                    {s}
                  </CoachBlock>
                ))}
            <HfButton
              variant="ghost"
              full
              style={{ marginTop: 12 }}
              onClick={() => setFocused(null)}
            >
              닫기
            </HfButton>
          </div>
        </div>
      )}
    </HfPhone>
  );
}

// ============================================================
// LiveStep7 — 종료 (실제 멤버 + 답변 데이터)
// ============================================================
function LiveStep7({
  members,
  answers,
  topic,
  level,
  onHome,
  groupName,
}: {
  members: MemberInfo[];
  answers: Record<string, OpicStudyAnswer>;
  topic: string;
  level: string;
  onHome: () => void;
  groupName?: string;
}) {
  // 모든 멤버의 strengths 모음
  const memberHighlights = members.map((m) => {
    const allStrengths: string[] = [];
    Object.entries(answers).forEach(([key, a]) => {
      if (key.startsWith(`${m.userId}_`)) {
        const fb = a.feedback_result as FeedbackResult | null;
        if (fb?.strengths) allStrengths.push(...fb.strengths);
      }
    });
    return {
      member: m,
      best: allStrengths[0] ?? "참여 완료",
    };
  });

  // PC용 데이터 구성 (실제 답변 기반)
  const allBestExpression = (() => {
    for (const m of members) {
      const ans = answers[`${m.userId}_0`];
      const fb = ans?.feedback_result as FeedbackResult | null;
      if (fb?.strengths?.[0]) return { text: fb.strengths[0], from: `${m.name}의 표현` };
    }
    return { text: "오늘 함께 배운 표현이 모였어요", from: "스터디" };
  })();

  return (
    <>
      <div className="bp-only-pc" style={{ flex: 1, minHeight: 0 }}>
        <Step7Pc
          onHome={onHome}
          groupName={groupName}
          topicLabel={`${topic} 콤보`}
          data={{
            title: "오늘도 한 걸음",
            subtitle: `${members.length}명이 함께 ${topic} 콤보를 끝냈어요 · ${level}`,
            bestExpression: allBestExpression.text,
            bestFrom: allBestExpression.from,
            coachNote: {
              keyword: allBestExpression.text.slice(0, 24),
              detailKeyword: "구체적 디테일",
            },
            memberNotes: memberHighlights.map((h) => ({
              key: h.member.key,
              name: h.member.name,
              note: h.best.slice(0, 16),
            })),
            nextRecommend: {
              name: "다음 추천 콤보",
              meta: "출제율 ↑↑↑",
            },
          }}
        />
      </div>
      <div className="bp-only-mobile" style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <LiveStep7Mobile
          members={members}
          topic={topic}
          level={level}
          onHome={onHome}
          memberHighlights={memberHighlights}
        />
      </div>
    </>
  );
}

function LiveStep7Mobile({
  members,
  topic,
  level,
  onHome,
  memberHighlights,
}: {
  members: MemberInfo[];
  topic: string;
  level: string;
  onHome: () => void;
  memberHighlights: Array<{ member: MemberInfo; best: string }>;
}) {
  return (
    <HfPhone liveMode>
      <HfHeader
        title="오늘의 학습"
        sub={`${topic} 콤보 · ${level}`}
        onBack={() => undefined}
        right={null}
      />

      <HfBody padding="20px">
        <div style={{ textAlign: "center", padding: "20px 0 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🌱</div>
          <div className="t-display" style={{ marginBottom: 6 }}>
            오늘도 한 걸음
          </div>
          <p className="t-sm ink-3" style={{ margin: 0 }}>
            {members.length}명이 함께 {topic} 콤보를 끝냈어요
          </p>
        </div>

        <Insight style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>✨</span>
            <span className="t-h3">오늘 함께한 멤버</span>
          </div>
          <p className="t-sm" style={{ margin: 0, color: "var(--bp-ink-2)" }}>
            각자 다른 표현으로 답변을 풀어냈어요.
          </p>
        </Insight>

        <HfCard padding={16} style={{ marginBottom: 16 }}>
          <SectionH>멤버별 한 줄 요약</SectionH>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {memberHighlights.map((mh) => (
              <div
                key={mh.member.userId}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <MbDot
                  color={mh.member.key}
                  initial={mh.member.initial}
                  size={28}
                  fontSize={11}
                />
                <span
                  className="t-sm"
                  style={{ fontWeight: 500, flex: 1 }}
                >
                  {mh.member.name}
                </span>
                <Tag tone="good" style={{ fontSize: 10 }}>
                  ✓ {mh.best}
                </Tag>
              </div>
            ))}
          </div>
        </HfCard>

        <HfCard padding={16} style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              marginBottom: 12,
            }}
          >
            <CoachAvatar />
            <div
              style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}
            >
              <span className="t-sm" style={{ fontWeight: 600 }}>
                AI 스터디 코치
              </span>
              <span className="t-xs ink-3">오늘의 마무리</span>
            </div>
          </div>
          <p
            className="t-body"
            style={{ margin: 0, lineHeight: 1.6, color: "var(--bp-ink)" }}
          >
            오늘 모두 수고했어요. 다른 멤버 답변 중 마음에 들었던 표현 하나만이라도{" "}
            <Hl>다음 학습에서 시도</Hl>해보면 좋겠어요.
          </p>
        </HfCard>
      </HfBody>

      <HfFooter>
        <HfButton variant="primary" size="lg" full onClick={onHome}>
          홈으로
        </HfButton>
      </HfFooter>
    </HfPhone>
  );
}

// 미사용 import silence
void MbStack;
void Pill;
void Step63;
