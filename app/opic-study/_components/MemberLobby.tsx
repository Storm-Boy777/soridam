"use client";

/**
 * 오픽 스터디 — 입장 대기실 (Lobby)
 *
 * 세션 룸 진입 전 멤버 모이기 단계.
 * 디자인: max-width 1024 콘텐츠 페이지 (멤버 홈과 톤 통일)
 */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBrowserClient } from "@supabase/ssr";
import { ArrowLeft, MessagesSquare, Mic, Sparkles } from "lucide-react";
import { HfButton } from "./bp";
import { advanceLobby } from "@/lib/actions/opic-study";

type MbColor = "a" | "b" | "c" | "d";

interface LobbyMember {
  key: MbColor;
  userId: string;
  name: string;
  isMe: boolean;
}

interface Props {
  sessionId: string;
  groupName: string;
  members: LobbyMember[];
}

const COLOR_BG: Record<MbColor, string> = {
  a: "var(--bp-mb-a)",
  b: "var(--bp-mb-b)",
  c: "var(--bp-mb-c)",
  d: "var(--bp-mb-d)",
};

export function MemberLobby({ sessionId, groupName, members }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const me = members.find((m) => m.isMe);
  const others = members.filter((m) => !m.isMe);

  // Realtime presence — lobby에 들어온 멤버를 다른 멤버에게도 보이게.
  // 세션 룸과 동일 channel(`opic-study-presence:{sessionId}`) 사용.
  useEffect(() => {
    if (!me) return;
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const ch = supabase.channel(`opic-study-presence:${sessionId}`, {
      config: { presence: { key: me.userId } },
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
          await ch.track({
            user_id: me.userId,
            display_name: me.name,
            joined_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      void ch.untrack().catch(() => undefined);
      supabase.removeChannel(ch);
    };
  }, [sessionId, me?.userId, me?.name, me]);

  // Realtime sessions UPDATE listen — 다른 멤버가 "세션 룸 입장하기" 누르면
  // step이 mode_select → category_select로 바뀐다. 모든 멤버가 자동으로 따라감.
  // 세션이 abandoned/completed로 바뀌면 멤버 홈으로 돌아감.
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const ch = supabase
      .channel(`opic-study-session:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "opic_study_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const next = payload.new as {
            step?: string;
            status?: string;
          };
          // 세션 종료 → 멤버 홈으로
          if (next.status && next.status !== "active") {
            router.push("/opic-study");
            return;
          }
          // step 진행 → 세션 룸으로 자동 따라가기
          if (next.step && next.step !== "mode_select") {
            router.push(`/opic-study/session/${sessionId}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [sessionId, router]);

  const handleStart = () => {
    startTransition(async () => {
      const res = await advanceLobby(sessionId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      // 본인은 즉시 이동 (Realtime listen은 안전망 + 다른 멤버 자동 따라가기 용)
      router.push(`/opic-study/session/${sessionId}`);
    });
  };

  return (
    <div
      className="bp-scope"
      style={{
        minHeight: "100dvh",
        background: "var(--bp-bg)",
        color: "var(--bp-ink)",
        fontFamily: "var(--bp-font)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          width: "100%",
          background: "var(--bp-bg)",
          borderBottom: "1px solid var(--bp-line)",
          padding: "14px 24px",
          flex: "0 0 auto",
        }}
      >
        <div
          style={{
            maxWidth: 1024,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            onClick={() => router.push("/opic-study")}
            aria-label="뒤로"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "transparent",
              border: "none",
              color: "var(--bp-ink-2)",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              className="t-xs"
              style={{
                color: "var(--bp-ink-3)",
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              입장 대기실
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--bp-ink)",
              }}
            >
              {groupName}
            </span>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "32px 24px 64px",
        }}
      >
        <div
          style={{
            maxWidth: 1024,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          {/* 메인 — 멤버 모이는 카드 */}
          <div
            style={{
              position: "relative",
              padding: "40px 32px",
              background:
                "linear-gradient(135deg, var(--bp-tc-tint) 0%, var(--bp-surface) 100%)",
              borderRadius: "var(--bp-radius-lg)",
              boxShadow: "var(--bp-shadow)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                right: -50,
                top: -50,
                width: 220,
                height: 220,
                borderRadius: "50%",
                background: "var(--bp-tc)",
                opacity: 0.06,
              }}
            />
            <div
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 24,
                textAlign: "center",
              }}
            >
              <span
                className="t-xs"
                style={{
                  color: "var(--bp-tc)",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                }}
              >
                ☕ 곧 시작합니다
              </span>
              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(24px, 4vw, 32px)",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "var(--bp-ink)",
                }}
              >
                다 같이 모이고 있어요
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "var(--bp-ink-2)",
                  lineHeight: 1.6,
                }}
              >
                {`${members.length}명 멤버 중 ${onlineUserIds.size}명 입장 중`}
              </p>

              {/* 멤버 클러스터 — 입장한 멤버는 진하게, 미입장은 dimmed */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 16,
                  justifyContent: "center",
                  marginTop: 8,
                }}
              >
                {me && (
                  <MemberAvatar
                    member={me}
                    isJoined={onlineUserIds.has(me.userId)}
                  />
                )}
                {others.map((m) => (
                  <MemberAvatar
                    key={m.userId}
                    member={m}
                    isJoined={onlineUserIds.has(m.userId)}
                  />
                ))}
              </div>

              <HfButton
                variant="tc"
                size="lg"
                onClick={handleStart}
                disabled={pending}
                style={{ marginTop: 8, minWidth: 220 }}
              >
                {pending ? "잠시만…" : "세션 룸 입장하기 →"}
              </HfButton>
            </div>
          </div>

          {/* 빠른 안내 — 운영 가이드 (간략) */}
          <section
            style={{
              padding: "20px 22px",
              background: "var(--bp-surface)",
              borderRadius: "var(--bp-radius-lg)",
              boxShadow: "var(--bp-shadow-sm)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "var(--bp-ink-3)",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              잠깐 — 진행 방식 다시 보기
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              <GuideStep
                num="1"
                icon={<MessagesSquare size={16} strokeWidth={1.6} />}
                title="디스코드 합류"
                desc="음성 채널 들어가서 인사부터 나눠요."
              />
              <GuideStep
                num="2"
                icon={<Mic size={16} strokeWidth={1.6} />}
                title="한 명씩 답변, 함께 듣기"
                desc="답변자 마이크로 녹음, 나머지는 디스코드로 듣기."
              />
              <GuideStep
                num="3"
                icon={<Sparkles size={16} strokeWidth={1.6} />}
                title="AI 코칭 + 토론"
                desc="멤버별 코칭이 나오면 함께 인사이트 토론."
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MemberAvatar({
  member,
  isJoined,
}: {
  member: LobbyMember;
  isJoined: boolean;
}) {
  const me = member.isMe;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        transition: "opacity 0.2s",
      }}
    >
      <div
        style={{
          position: "relative",
          width: 72,
          height: 72,
          borderRadius: 999,
          background: isJoined ? COLOR_BG[member.key] : "var(--bp-ink-4)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          fontWeight: 700,
          boxShadow: me ? "0 0 0 4px var(--bp-tc-tint)" : "none",
          transition: "background 0.2s",
        }}
      >
        {member.name.charAt(0).toUpperCase()}
        {me && (
          <span
            style={{
              position: "absolute",
              bottom: -2,
              right: -2,
              padding: "2px 8px",
              borderRadius: 999,
              background: "var(--bp-tc)",
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.04em",
              border: "2px solid var(--bp-bg)",
            }}
          >
            나
          </span>
        )}
        {/* 입장 중 점등 — 본인이 아닌 멤버 + 입장 상태일 때 */}
        {isJoined && !me && (
          <span
            style={{
              position: "absolute",
              bottom: -2,
              right: -2,
              width: 16,
              height: 16,
              borderRadius: 999,
              background: "var(--bp-good)",
              border: "2px solid var(--bp-bg)",
            }}
          />
        )}
      </div>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--bp-ink)",
          maxWidth: 80,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {member.name}
        {isJoined && !me && (
          <span style={{ marginLeft: 4, fontSize: 11, color: "var(--bp-good)" }}>
            입장
          </span>
        )}
      </span>
    </div>
  );
}

function GuideStep({
  num,
  icon,
  title,
  desc,
}: {
  num: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div
      style={{
        padding: "14px 14px",
        background: "var(--bp-surface-2)",
        borderRadius: "var(--bp-radius)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: 999,
            background: "var(--bp-tc-tint)",
            color: "var(--bp-tc)",
            fontSize: 10,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {num}
        </span>
        <span style={{ color: "var(--bp-tc)" }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--bp-ink)" }}>
          {title}
        </span>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.55, color: "var(--bp-ink-2)" }}>
        {desc}
      </div>
    </div>
  );
}
