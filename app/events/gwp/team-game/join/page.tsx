"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchAttendanceStatus } from "@/lib/api/event-attendance";
import { checkin, buzz, type GwpSession, type GwpPress } from "@/lib/api/gwp-team-game";
import { showErrorToast } from "@/lib/utils/toast";

type RosterMember = { id: string; name: string; department: string | null };
type Me = { member_id: string; member_name: string; team_number: number; part: string };

const TEAM_COLORS = [
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-indigo-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-violet-400 to-purple-500",
  "from-cyan-400 to-sky-500",
  "from-fuchsia-400 to-pink-500",
  "from-lime-400 to-green-500",
];

export default function GwpJoinPage() {
  const supabase = useMemo(() => createClient(), []);
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<GwpSession | null>(null);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => setMounted(true), []);

  // 활성 세션 + 명단 로드
  useEffect(() => {
    (async () => {
      const [{ data: sessions }, roster] = await Promise.all([
        supabase
          .from("gwp_team_sessions")
          .select("*")
          .neq("status", "ended")
          .order("created_at", { ascending: false })
          .limit(1),
        fetchAttendanceStatus().catch(() => ({ members: [] })),
      ]);
      const s = (sessions?.[0] as GwpSession) || null;
      setSession(s);
      setRoster((roster as { members: RosterMember[] }).members || []);
      // 저장된 신원 복원 (같은 세션일 때만)
      if (s && typeof window !== "undefined") {
        const saved = localStorage.getItem(`gwp-game-me:${s.id}`);
        if (saved) {
          try {
            setMe(JSON.parse(saved));
          } catch {
            /* ignore */
          }
        }
      }
      setLoading(false);
    })();
  }, [supabase]);

  // 세션 상태 실시간 구독 (버저 on/off, round, 종료)
  useEffect(() => {
    if (!session) return;
    const ch = supabase
      .channel(`gwp-join:${session.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "gwp_team_sessions", filter: `id=eq.${session.id}` },
        (payload) => setSession(payload.new as GwpSession),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, session?.id]);

  const handleCheckedIn = useCallback((m: Me, sessionId: string) => {
    setMe(m);
    if (typeof window !== "undefined") localStorage.setItem(`gwp-game-me:${sessionId}`, JSON.stringify(m));
  }, []);

  if (!mounted || loading) return <CenterScreen>불러오는 중…</CenterScreen>;
  if (!session) return <CenterScreen emoji="🕐">아직 시작된 게임이 없어요</CenterScreen>;
  if (session.status === "ended") return <CenterScreen emoji="🎉">게임이 종료되었어요</CenterScreen>;

  if (!me) {
    return <CheckinView session={session} roster={roster} onCheckedIn={handleCheckedIn} />;
  }
  return <PlayView supabase={supabase} session={session} me={me} />;
}

// ─────────────────────────────────────────────
// 체크인 (부서 선택 → 이름 선택)
// ─────────────────────────────────────────────
function CheckinView({
  session,
  roster,
  onCheckedIn,
}: {
  session: GwpSession;
  roster: RosterMember[];
  onCheckedIn: (m: Me, sessionId: string) => void;
}) {
  const [dept, setDept] = useState<string | null>(session.parts.length === 1 ? session.parts[0] : null);
  const [busy, setBusy] = useState<string | null>(null);

  // 참가 파트에 속한 멤버만
  const members = useMemo(
    () => roster.filter((m) => m.department && session.parts.includes(m.department)),
    [roster, session.parts],
  );
  const deptMembers = useMemo(
    () => (dept ? members.filter((m) => m.department === dept) : []),
    [members, dept],
  );

  const handlePick = async (m: RosterMember) => {
    setBusy(m.id);
    try {
      const r = await checkin(session.id, m.id);
      onCheckedIn(
        { member_id: m.id, member_name: r.member_name, team_number: r.team_number, part: r.part },
        session.id,
      );
    } catch (e) {
      showErrorToast((e as Error).message);
    }
    setBusy(null);
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 p-4 pb-16">
      <div className="mx-auto max-w-lg pt-6">
        <div className="text-center mb-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg mb-3">
            <span className="text-3xl">🤝</span>
          </div>
          <h1 className="text-2xl font-black text-amber-900">{session.title}</h1>
          <p className="mt-1 text-sm font-bold text-amber-700/70">
            {dept ? "본인 이름을 선택하세요" : "본인 파트를 선택하세요"}
          </p>
        </div>

        {!dept ? (
          // 파트 선택
          <div className="space-y-2.5">
            {session.parts.map((p) => (
              <button
                key={p}
                onClick={() => setDept(p)}
                className="flex w-full items-center justify-between rounded-2xl border border-white/60 bg-white/80 px-5 py-4 text-left font-black text-slate-800 shadow-sm backdrop-blur active:scale-[0.98] transition-all"
              >
                {p}
                <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        ) : (
          // 이름 선택
          <>
            {session.parts.length > 1 && (
              <button onClick={() => setDept(null)} className="mb-3 text-sm font-bold text-amber-700/70">
                ← 파트 다시 선택
              </button>
            )}
            <div className="rounded-xl bg-amber-500/10 px-4 py-2 mb-3 text-center text-sm font-black text-amber-800">
              {dept}
            </div>
            <div className="space-y-2">
              {deptMembers.length === 0 ? (
                <p className="py-10 text-center text-sm font-bold text-slate-400">명단에 멤버가 없어요</p>
              ) : (
                deptMembers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handlePick(m)}
                    disabled={!!busy}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/60 bg-white/85 p-4 text-left shadow-sm backdrop-blur active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-black text-white">
                      {m.name.charAt(0)}
                    </div>
                    <span className="flex-1 font-bold text-slate-800">{m.name}</span>
                    {busy === m.id ? (
                      <span className="text-xs font-bold text-amber-500">체크인 중…</span>
                    ) : (
                      <svg className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 플레이 (내 팀 + 저요 버저)
// ─────────────────────────────────────────────
function PlayView({
  supabase,
  session,
  me,
}: {
  supabase: ReturnType<typeof createClient>;
  session: GwpSession;
  me: Me;
}) {
  const teamGradient = TEAM_COLORS[(me.team_number - 1) % TEAM_COLORS.length];

  // 버저 라운드별 상태
  const [pressedRound, setPressedRound] = useState<number | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 50, left: 50 });
  const [roundPresses, setRoundPresses] = useState<GwpPress[]>([]);
  const [pressing, setPressing] = useState(false);
  const lastRoundRef = useRef<number>(-1);

  const active = session.buzzer_active;
  const round = session.buzzer_round;

  // 새 라운드 진입(버저 ON + round 변동) → 위치 랜덤 + 상태 리셋
  useEffect(() => {
    if (active && round !== lastRoundRef.current) {
      lastRoundRef.current = round;
      setPressedRound(null);
      setRoundPresses([]);
      // 버튼 중심 위치 — 화면 밖으로 안 나가게 여백 둔 랜덤
      setPos({
        top: 22 + Math.random() * 56, // 22% ~ 78%
        left: 18 + Math.random() * 64, // 18% ~ 82%
      });
    }
  }, [active, round]);

  // 현재 라운드 누름 실시간 구독 (1등 판정)
  useEffect(() => {
    if (!active) return;
    const ch = supabase
      .channel(`gwp-buzz:${session.id}:${round}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "gwp_buzzer_presses", filter: `session_id=eq.${session.id}` },
        (payload) => {
          const row = payload.new as GwpPress;
          if (row.round === round) setRoundPresses((cur) => (cur.some((x) => x.id === row.id) ? cur : [...cur, row]));
        },
      )
      .subscribe();
    // 진입 시점 기존 누름도 로드
    supabase
      .from("gwp_buzzer_presses")
      .select("*")
      .eq("session_id", session.id)
      .eq("round", round)
      .then(({ data }) => setRoundPresses((data as GwpPress[]) || []));
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, session.id, round, active]);

  const handleBuzz = async () => {
    if (pressedRound === round || pressing) return;
    setPressing(true);
    setPressedRound(round); // 낙관적 — 중복 방지
    try {
      const r = await buzz(session.id, me.member_id);
      if (r.error) {
        showErrorToast(r.error);
        setPressedRound(null);
      }
    } catch (e) {
      showErrorToast((e as Error).message);
      setPressedRound(null);
    }
    setPressing(false);
  };

  const ranked = [...roundPresses].sort((a, b) => a.pressed_at.localeCompare(b.pressed_at));
  const firstPress = ranked[0];
  const myRank = ranked.findIndex((p) => p.member_id === me.member_id);
  const iPressed = pressedRound === round || myRank >= 0;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-gradient-to-br from-[#1a1320] via-[#0e0a16] to-[#231018] text-white">
      {/* 상단 — 내 팀 배지 */}
      <div className="relative z-10 px-5 pt-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/40">{me.part}</p>
        <div className={`mx-auto mt-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${teamGradient} px-6 py-2.5 shadow-lg`}>
          <span className="text-lg font-black">🎉 {me.team_number}팀</span>
        </div>
        <p className="mt-2 text-sm font-bold text-white/70">{me.member_name}님</p>
      </div>

      {/* 버저 영역 */}
      <div className="relative" style={{ height: "calc(100dvh - 130px)" }}>
        {!active ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <div className="mb-4 flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-2.5 w-2.5 animate-pulse rounded-full bg-white/40" style={{ animationDelay: `${i * 200}ms` }} />
              ))}
            </div>
            <p className="text-lg font-bold text-white/80">진행자가 곧 버저를 켤 거예요</p>
            <p className="mt-1.5 text-sm text-white/40">문제가 나오면 화면 어딘가에 버튼이 떠요!</p>
          </div>
        ) : iPressed ? (
          // 이미 누름 → 결과
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            {myRank === 0 ? (
              <>
                <div className="text-6xl mb-3 animate-bounce">🥇</div>
                <p className="text-3xl font-black text-amber-300">가장 먼저 눌렀어요!</p>
              </>
            ) : (
              <>
                <div className="text-5xl mb-3">✋</div>
                <p className="text-2xl font-black text-white/90">눌렀어요!</p>
                {myRank > 0 && <p className="mt-1 text-base font-bold text-white/50">{myRank + 1}번째</p>}
                {firstPress && (
                  <p className="mt-4 text-sm text-white/60">
                    1등: <span className="font-bold text-amber-300">{firstPress.member_name}</span> ({firstPress.team_number}팀)
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          // 랜덤 위치 저요 버튼
          <button
            onClick={handleBuzz}
            className="absolute flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-amber-400 text-2xl font-black text-white shadow-[0_0_50px_-5px_rgba(244,114,182,0.7)] active:scale-90 transition-transform"
            style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
          >
            저요!!
          </button>
        )}
      </div>
    </div>
  );
}

function CenterScreen({ children, emoji }: { children: React.ReactNode; emoji?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 px-8 text-center">
      {emoji && <div className="text-5xl mb-4">{emoji}</div>}
      <p className="text-lg font-bold text-amber-900/70">{children}</p>
    </div>
  );
}
