"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import { fetchAttendanceStatus } from "@/lib/api/event-attendance";
import {
  createSession,
  resetCheckins,
  startGame,
  endGame,
  armBuzzer,
  stopBuzzer,
  clearRound,
  type GwpSession,
  type GwpAssignment,
  type GwpPress,
} from "@/lib/api/gwp-team-game";
import { showSuccessToast, showErrorToast } from "@/lib/utils/toast";

const PASSWORD = "2026";
const AUTH_KEY = "gwp-game-auth";

// 파트(부서)별 색상 — 팀 그리드에서 두 파트 구분
const PART_COLORS = [
  { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  { bg: "bg-rose-100", text: "text-rose-700", dot: "bg-rose-500" },
  { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500" },
  { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
];

type RosterMember = { id: string; name: string; department: string | null };

export default function GwpTeamGameConsolePage() {
  const [authed, setAuthed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && localStorage.getItem(AUTH_KEY) === "1") {
      setAuthed(true);
    }
  }, []);

  if (!mounted) return null;
  if (!authed) return <PasswordGate onPass={() => setAuthed(true)} />;
  return <Console />;
}

// ─────────────────────────────────────────────
// 비밀번호 게이트
// ─────────────────────────────────────────────
function PasswordGate({ onPass }: { onPass: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === PASSWORD) {
      localStorage.setItem(AUTH_KEY, "1");
      onPass();
    } else {
      setError(true);
      setPw("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-6">
          <div className="inline-flex w-20 h-20 rounded-[1.75rem] bg-white shadow-xl items-center justify-center mb-4">
            <span className="text-4xl">🤝</span>
          </div>
          <h1 className="text-2xl font-black text-amber-800">팀 매칭 게임 · 진행자</h1>
          <p className="text-amber-700/60 mt-1 text-sm font-bold">GWP</p>
        </div>
        <form onSubmit={submit} className="bg-white rounded-[1.75rem] p-7 shadow-2xl">
          <h2 className="text-center text-base font-extrabold text-slate-800 mb-1">비밀번호</h2>
          <p className="text-center text-xs text-slate-400 mb-5">진행자만 접속할 수 있어요</p>
          <input
            autoFocus
            type="password"
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              setError(false);
            }}
            placeholder="PASSWORD"
            className={`w-full h-14 px-5 bg-slate-100 border-2 rounded-2xl text-slate-800 text-lg font-bold tracking-widest text-center focus:outline-none transition-all ${
              error ? "border-red-400 bg-red-50" : "border-transparent focus:border-amber-400 focus:bg-white"
            }`}
          />
          {error && <p className="text-red-500 text-sm font-bold mt-2 text-center">비밀번호가 올바르지 않아요</p>}
          <button
            type="submit"
            disabled={!pw}
            className="mt-4 w-full h-14 bg-gradient-to-r from-amber-500 to-orange-500 disabled:opacity-40 text-white text-lg font-black rounded-2xl shadow-lg active:scale-[0.97] transition-all"
          >
            입장하기
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 콘솔 (설정 / 체크인 / 게임)
// ─────────────────────────────────────────────
type Tab = "setup" | "checkin" | "game";

function Console() {
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>("setup");
  const [session, setSession] = useState<GwpSession | null>(null);
  const [assignments, setAssignments] = useState<GwpAssignment[]>([]);
  const [presses, setPresses] = useState<GwpPress[]>([]);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [loading, setLoading] = useState(true);

  // 명단 로드 (파트 선택지용)
  useEffect(() => {
    fetchAttendanceStatus()
      .then((d) => setRoster(d.members || []))
      .catch(() => {});
  }, []);

  // 활성 세션 + 데이터 로드
  const loadSession = useCallback(async () => {
    setLoading(true);
    const { data: sessions } = await supabase
      .from("gwp_team_sessions")
      .select("*")
      .neq("status", "ended")
      .order("created_at", { ascending: false })
      .limit(1);
    const s = (sessions?.[0] as GwpSession) || null;
    setSession(s);
    if (s) {
      const [{ data: a }, { data: pr }] = await Promise.all([
        supabase.from("gwp_team_assignments").select("*").eq("session_id", s.id),
        supabase.from("gwp_buzzer_presses").select("*").eq("session_id", s.id).eq("round", s.buzzer_round),
      ]);
      setAssignments((a as GwpAssignment[]) || []);
      setPresses((pr as GwpPress[]) || []);
      setTab((t) => (t === "setup" && s.status !== "setup" ? "checkin" : t));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Realtime — 세션/배정/버저
  useEffect(() => {
    if (!session) return;
    const sid = session.id;
    const ch = supabase
      .channel(`gwp-console:${sid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gwp_team_assignments", filter: `session_id=eq.${sid}` },
        () => {
          supabase
            .from("gwp_team_assignments")
            .select("*")
            .eq("session_id", sid)
            .then(({ data }) => setAssignments((data as GwpAssignment[]) || []));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gwp_buzzer_presses", filter: `session_id=eq.${sid}` },
        () => {
          setSession((cur) => {
            const round = cur?.buzzer_round ?? 0;
            supabase
              .from("gwp_buzzer_presses")
              .select("*")
              .eq("session_id", sid)
              .eq("round", round)
              .then(({ data }) => setPresses((data as GwpPress[]) || []));
            return cur;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "gwp_team_sessions", filter: `id=eq.${sid}` },
        (payload) => {
          const next = payload.new as GwpSession;
          setSession(next);
          // 라운드 바뀌면 새 라운드 누름 다시 로드
          supabase
            .from("gwp_buzzer_presses")
            .select("*")
            .eq("session_id", sid)
            .eq("round", next.buzzer_round)
            .then(({ data }) => setPresses((data as GwpPress[]) || []));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, session?.id]);

  const checkedInCount = assignments.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <header className="sticky top-0 z-40 border-b border-white/50 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Link href="/events/gwp" className="text-gray-400 hover:text-gray-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-amber-500">Team Game</p>
              <h1 className="text-base font-black text-gray-900 sm:text-xl">팀 매칭 게임 진행자</h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {([
              ["setup", "⚙️ 설정"],
              ["checkin", "📋 체크인"],
              ["game", "🔔 게임"],
            ] as [Tab, string][]).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-full px-3.5 py-2 text-sm font-bold transition-colors ${
                  tab === k
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 sm:p-6">
        {loading ? (
          <div className="py-16 text-center font-bold text-slate-400">불러오는 중…</div>
        ) : tab === "setup" ? (
          <SetupTab roster={roster} session={session} onChanged={loadSession} />
        ) : tab === "checkin" ? (
          <CheckinTab session={session} assignments={assignments} count={checkedInCount} onReset={loadSession} />
        ) : (
          <GameTab session={session} presses={presses} />
        )}
      </main>
    </div>
  );
}

// ── 설정 탭 ────────────────────────────────────
function SetupTab({
  roster,
  session,
  onChanged,
}: {
  roster: RosterMember[];
  session: GwpSession | null;
  onChanged: () => void;
}) {
  const allParts = useMemo(() => {
    const s = new Set<string>();
    roster.forEach((m) => m.department && s.add(m.department));
    return Array.from(s).sort((a, b) => a.localeCompare(b, "ko"));
  }, [roster]);

  const [title, setTitle] = useState(session?.title || "GWP 팀 매칭 게임");
  const [teamCount, setTeamCount] = useState(session?.team_count || 6);
  const [teamSize, setTeamSize] = useState(session?.team_size || 5);
  const [parts, setParts] = useState<string[]>(session?.parts || []);
  const [saving, setSaving] = useState(false);

  const togglePart = (p: string) =>
    setParts((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const partCount = (p: string) => roster.filter((m) => m.department === p).length;
  const selectedTotal = parts.reduce((acc, p) => acc + partCount(p), 0);

  const handleCreate = async () => {
    if (parts.length < 1) return showErrorToast("참가 파트를 1개 이상 선택하세요");
    if (!confirm(session ? "새 게임을 시작하면 기존 체크인/팀이 모두 초기화됩니다. 진행할까요?" : "게임을 시작할까요?"))
      return;
    setSaving(true);
    try {
      await createSession({ title, team_count: teamCount, team_size: teamSize, parts });
      showSuccessToast("새 게임 세션을 시작했어요");
      onChanged();
    } catch (e) {
      showErrorToast((e as Error).message);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl space-y-5">
      {session && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-800">
          현재 진행 중인 세션이 있어요 · 상태: {session.status} · {session.team_count}팀
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-extrabold text-slate-500 mb-1.5">게임 이름</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-extrabold text-slate-500 mb-1.5">팀 개수 (기준)</label>
            <input
              type="number"
              min={1}
              max={50}
              value={teamCount}
              onChange={(e) => setTeamCount(Math.max(1, Number(e.target.value)))}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-slate-500 mb-1.5">팀당 인원 (목표)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={teamSize}
              onChange={(e) => setTeamSize(Math.max(1, Number(e.target.value)))}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-500 mb-2">
            참가 파트(부서) 선택 — 선택한 파트끼리 팀에 골고루 섞여요
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {allParts.map((p) => {
              const on = parts.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => togglePart(p)}
                  className={`flex items-center justify-between gap-1 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-all ${
                    on
                      ? "border-amber-400 bg-amber-50 text-amber-800 shadow-sm"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate">{p}</span>
                  <span className="shrink-0 opacity-60">{partCount(p)}명</span>
                </button>
              );
            })}
          </div>
          {parts.length > 0 && (
            <p className="mt-2 text-xs font-bold text-slate-500">
              선택 {parts.length}개 파트 · 최대 {selectedTotal}명 · {teamCount}팀 (팀당 약{" "}
              {Math.ceil(selectedTotal / teamCount)}명)
            </p>
          )}
        </div>

        <button
          onClick={handleCreate}
          disabled={saving || parts.length < 1}
          className="w-full h-13 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 disabled:opacity-40 text-white font-black rounded-2xl shadow-lg active:scale-[0.98] transition-all"
        >
          {saving ? "시작 중…" : session ? "🔄 새 게임 시작 (기존 초기화)" : "🚀 게임 시작"}
        </button>
      </div>
    </div>
  );
}

// ── 체크인 탭 ───────────────────────────────────
function CheckinTab({
  session,
  assignments,
  count,
  onReset,
}: {
  session: GwpSession | null;
  assignments: GwpAssignment[];
  count: number;
  onReset: () => void;
}) {
  const joinUrl = useMemo(
    () => (typeof window !== "undefined" ? `${window.location.origin}/events/gwp/team-game/join` : ""),
    [],
  );

  if (!session) return <NoSession />;

  const partColor = (part: string) => {
    const idx = session.parts.indexOf(part);
    return PART_COLORS[idx % PART_COLORS.length] || PART_COLORS[0];
  };

  const teams = Array.from({ length: session.team_count }, (_, i) => i + 1);

  const handleResetCheckins = async () => {
    if (!confirm("모든 체크인과 팀 배정을 초기화할까요?")) return;
    try {
      await resetCheckins(session.id);
      showSuccessToast("체크인을 초기화했어요");
      onReset();
    } catch (e) {
      showErrorToast((e as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      {/* QR 배포 + 카운터 */}
      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
          {joinUrl && (
            <div className="rounded-xl border border-amber-100 p-3">
              <QRCodeSVG value={joinUrl} size={180} level="H" fgColor="#b45309" />
            </div>
          )}
          <p className="mt-3 text-xs font-bold text-slate-400">폰으로 QR을 스캔하세요</p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(joinUrl);
              showSuccessToast("URL 복사됨");
            }}
            className="mt-2 rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-600"
          >
            URL 복사
          </button>
        </div>

        <div className="flex flex-col justify-center rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">체크인 현황</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-5xl font-black text-amber-600 tabular-nums">{count}</span>
            <span className="text-lg font-bold text-slate-300">명 체크인</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {session.parts.map((p) => {
              const c = partColor(p);
              const n = assignments.filter((a) => a.part === p).length;
              return (
                <span key={p} className={`inline-flex items-center gap-1.5 rounded-full ${c.bg} ${c.text} px-3 py-1 text-xs font-bold`}>
                  <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                  {p} {n}명
                </span>
              );
            })}
          </div>
          <button
            onClick={handleResetCheckins}
            className="mt-4 self-start rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-100"
          >
            🔄 체크인 초기화
          </button>
        </div>
      </div>

      {/* 팀 그리드 (실시간) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => {
          const members = assignments.filter((a) => a.team_number === t);
          return (
            <div key={t} className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="text-base font-black text-slate-800">{t}팀</h3>
                <span className="text-xs font-bold text-slate-400">{members.length}명</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {members.length === 0 ? (
                  <span className="text-xs text-slate-300 font-medium">대기 중…</span>
                ) : (
                  members.map((m) => {
                    const c = partColor(m.part);
                    return (
                      <span key={m.id} className={`inline-flex items-center gap-1 rounded-lg ${c.bg} ${c.text} px-2 py-1 text-xs font-bold`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                        {m.member_name}
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 게임 탭 (버저) ──────────────────────────────
function GameTab({ session, presses }: { session: GwpSession | null; presses: GwpPress[] }) {
  const [busy, setBusy] = useState(false);
  if (!session) return <NoSession />;

  // 서버 도착시각 순 정렬 → 1등
  const ranked = [...presses].sort((a, b) => a.pressed_at.localeCompare(b.pressed_at));
  const first = ranked[0];

  const doArm = async () => {
    setBusy(true);
    try {
      await armBuzzer(session.id);
    } catch (e) {
      showErrorToast((e as Error).message);
    }
    setBusy(false);
  };
  const doStop = async () => {
    setBusy(true);
    try {
      await stopBuzzer(session.id);
    } catch (e) {
      showErrorToast((e as Error).message);
    }
    setBusy(false);
  };
  const doClear = async () => {
    setBusy(true);
    try {
      await clearRound(session.id);
    } catch (e) {
      showErrorToast((e as Error).message);
    }
    setBusy(false);
  };

  const doStart = async () => {
    setBusy(true);
    try {
      await startGame(session.id);
    } catch (e) {
      showErrorToast((e as Error).message);
    }
    setBusy(false);
  };
  const doEnd = async () => {
    if (!confirm("게임을 종료할까요? 참가자 폰에 종료 화면이 표시돼요.")) return;
    setBusy(true);
    try {
      await endGame(session.id);
    } catch (e) {
      showErrorToast((e as Error).message);
    }
    setBusy(false);
  };

  // 게임 시작 전 — 큰 시작 버튼만. 누르면 모든 폰이 게임 화면으로 전환.
  if (session.status !== "playing") {
    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-3xl border border-slate-200/60 bg-white p-8 text-center shadow-sm">
          <div className="text-5xl mb-3">🎮</div>
          <h3 className="text-xl font-black text-slate-800">게임을 시작할까요?</h3>
          <p className="mt-2 text-sm font-medium text-slate-500">
            행사 마지막에 누르세요. 누르는 순간 <b>모든 참가자 폰</b>이 팀 발표 화면에서
            <br />게임(저요 버저) 화면으로 동시에 전환돼요.
          </p>
          <button
            onClick={doStart}
            disabled={busy}
            className="mt-6 w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-lg font-black rounded-2xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-40"
          >
            🎮 게임 시작
          </button>
          <p className="mt-3 text-xs text-slate-400">시작 전까지 참가자 폰엔 팀 번호가 크게 표시돼요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 컨트롤 */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
        {!session.buzzer_active ? (
          <button
            onClick={doArm}
            disabled={busy}
            className="flex-1 min-w-[180px] py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-lg font-black rounded-2xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-40"
          >
            🔔 저요 버저 활성화
          </button>
        ) : (
          <button
            onClick={doStop}
            disabled={busy}
            className="flex-1 min-w-[180px] py-4 bg-gradient-to-r from-slate-600 to-slate-700 text-white text-lg font-black rounded-2xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-40"
          >
            ⏸ 버저 끄기
          </button>
        )}
        <button
          onClick={doClear}
          disabled={busy}
          className="rounded-2xl bg-amber-50 px-5 py-4 text-sm font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-40"
        >
          다음 문제 (초기화)
        </button>
        <span className="text-xs font-bold text-slate-400">라운드 {session.buzzer_round}</span>
        <button
          onClick={doEnd}
          disabled={busy}
          className="ml-auto rounded-2xl px-4 py-4 text-sm font-bold text-slate-400 hover:text-red-500 disabled:opacity-40"
        >
          게임 종료
        </button>
      </div>

      {/* 1등 발표 */}
      <div className="rounded-3xl border border-slate-200/60 bg-gradient-to-br from-amber-500 to-orange-500 p-8 text-center shadow-lg">
        {first ? (
          <>
            <p className="text-sm font-bold uppercase tracking-widest text-white/70">가장 먼저!</p>
            <p className="mt-2 text-5xl font-black text-white sm:text-6xl">{first.member_name}</p>
            <p className="mt-2 text-xl font-bold text-white/90">{first.team_number}팀</p>
          </>
        ) : (
          <p className="py-8 text-lg font-bold text-white/80">
            {session.buzzer_active ? "🟢 버저 활성화됨 — 누가 먼저 누를까요?" : "버저를 활성화하세요"}
          </p>
        )}
      </div>

      {/* 누른 순서 */}
      {ranked.length > 0 && (
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-black text-slate-800">누른 순서</h3>
          <div className="space-y-2">
            {ranked.map((pr, i) => (
              <div key={pr.id} className="flex items-center gap-3 text-sm">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                    i === 0 ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="font-bold text-slate-800">{pr.member_name}</span>
                <span className="text-slate-400">· {pr.team_number}팀</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NoSession() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
      <div className="text-4xl mb-3">⚙️</div>
      <p className="font-bold text-slate-500">진행 중인 게임이 없어요</p>
      <p className="mt-1 text-xs text-slate-400">설정 탭에서 게임을 시작하세요</p>
    </div>
  );
}
