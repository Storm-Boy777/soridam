"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAttendanceStore } from "@/lib/stores/attendanceStore";
import type { AttendanceTabType } from "@/lib/stores/attendanceStore";
import type { EventMember } from "@/lib/stores/eventDrawStore";
import { fetchMembers, upsertMember, deleteMember, importMembers } from "@/lib/api/event-draw";
import { fetchAttendanceStatus, resetAttendance } from "@/lib/api/event-attendance";
import { QRCodeSVG } from "qrcode.react";
import { showSuccessToast, showErrorToast, showWarningToast, showInfoToast } from "@/lib/utils/toast";

// 비밀번호 게이트
function PasswordGate({ onAuth }: { onAuth: (pw: string) => boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAuth(password)) return;
    setError(true);
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setPassword("");
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 50%, #34d399 100%)" }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full animate-[float_6s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 right-16 w-20 h-20 bg-yellow-300/20 rounded-2xl rotate-12 animate-[float_6s_ease-in-out_2s_infinite]" />
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-teal-300/15 rounded-full animate-[float_6s_ease-in-out_infinite]" />
      </div>
      <div className={`relative w-full max-w-[420px] ${shake ? "animate-[shake_0.4s_ease-in-out]" : ""}`}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-white shadow-2xl mb-6">
            <span className="text-5xl">📋</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-lg">참석 관리</h1>
          <p className="text-white/70 mt-2 font-bold text-base">공정기술그룹</p>
        </div>
        <div className="bg-white rounded-[2rem] p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-lg font-extrabold text-slate-800">비밀번호를 입력하세요</h2>
            <p className="text-sm text-slate-400 mt-1">행사 관리자만 접속할 수 있습니다</p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="relative mb-4">
              <input ref={inputRef} type={showPassword ? "text" : "password"} value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                placeholder="PASSWORD"
                className={`w-full h-14 px-5 pr-12 bg-slate-100 border-2 rounded-2xl text-slate-800 text-lg font-bold tracking-widest placeholder-slate-300 text-center focus:outline-none transition-all ${
                  error ? "border-red-400 bg-red-50" : "border-transparent focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                }`} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  {showPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  ) : (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </>
                  )}
                </svg>
              </button>
            </div>
            {error && <p className="text-red-500 text-sm font-bold mb-3 text-center">비밀번호가 올바르지 않습니다</p>}
            <button type="submit" disabled={!password}
              className="w-full h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-200 disabled:to-slate-300 disabled:cursor-not-allowed text-white text-lg font-black rounded-2xl transition-all shadow-xl shadow-emerald-500/30 active:scale-[0.97] disabled:shadow-none">
              입장하기
            </button>
          </form>
        </div>
      </div>
      <style jsx>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-10px)} 40%{transform:translateX(10px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
      `}</style>
    </div>
  );
}

// 탭 정의
const TABS: { key: AttendanceTabType; label: string; icon: string }[] = [
  { key: "status", label: "참석 현황", icon: "📊" },
  { key: "members", label: "멤버 관리", icon: "👥" },
  { key: "qr", label: "QR 체크인", icon: "📱" },
];

export default function AttendanceClient() {
  const { isAuthenticated, authenticate, activeTab, setActiveTab } = useAttendanceStore();
  const [members, setMembers] = useState<EventMember[]>([]);
  const [stats, setStats] = useState<{ total: number; attended: number; departments: { name: string; total: number; attended: number }[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersData, statusData] = await Promise.all([fetchMembers(), fetchAttendanceStatus()]);
      setMembers(membersData);
      setStats(statusData);
    } catch (err) {
      console.error("데이터 로드 실패:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated, loadData]);

  if (!isAuthenticated) {
    return <PasswordGate onAuth={authenticate} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* 상단 글래스모피즘 헤더 */}
      <header className="sticky top-0 z-40 border-b border-white/50 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/events" className="text-gray-400 transition-colors hover:text-gray-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-500">Attendance</p>
              <h1 className="text-lg font-black text-gray-900 sm:text-2xl">공정기술그룹 참석 관리</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === tab.key
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
            <button
              onClick={loadData}
              disabled={loading}
              className="rounded-full border border-white/70 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-emerald-50 disabled:opacity-50"
            >
              새로고침
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        {activeTab === "status" && <StatusTab stats={stats} members={members} onRefresh={loadData} />}
        {activeTab === "members" && <MembersTab members={members} onRefresh={loadData} />}
        {activeTab === "qr" && <QRTab />}
      </main>
    </div>
  );
}

// 참석 현황 탭
function StatusTab({
  stats,
  members,
  onRefresh,
}: {
  stats: { total: number; attended: number; departments: { name: string; total: number; attended: number }[] } | null;
  members: EventMember[];
  onRefresh: () => Promise<void>;
}) {
  const [resetting, setResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetAttendance();
      await onRefresh();
      setShowResetModal(false);
    } catch (err) {
      showErrorToast("초기화 실패: " + (err as Error).message);
    }
    setResetting(false);
  };

  if (!stats) return <div className="text-center py-12 text-slate-400 font-bold">로딩 중...</div>;

  const percentage = stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0;

  // 참석한 멤버 목록
  const attendedMembers = members.filter((m) => m.is_active && (m as EventMember & { is_attended?: boolean }).is_attended);

  return (
    <div className="space-y-4">
      {/* 전체 현황 카드 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-slate-800">전체 참석 현황</h3>
          <button onClick={() => setShowResetModal(true)}
            className="px-3 py-1.5 text-[11px] font-bold text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-all">
            🔄 참석 초기화
          </button>
        </div>

        <div className="flex items-center gap-6">
          {/* 원형 진행률 */}
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="8" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="8"
                strokeDasharray={`${percentage * 2.51} 251`} strokeLinecap="round" className="transition-all duration-700" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-emerald-600">{percentage}%</span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">전체 인원</span>
              <span className="font-black text-slate-800">{stats.total}명</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-emerald-500 font-medium">참석</span>
              <span className="font-black text-emerald-600">{stats.attended}명</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400 font-medium">미참석</span>
              <span className="font-black text-slate-400">{stats.total - stats.attended}명</span>
            </div>
          </div>
        </div>
      </div>

      {/* 부서별 현황 */}
      {stats.departments.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
          <h3 className="text-sm font-black text-slate-800 mb-4">부서별 현황</h3>
          <div className="space-y-3">
            {stats.departments.map((dept) => {
              const pct = dept.total > 0 ? Math.round((dept.attended / dept.total) * 100) : 0;
              return (
                <div key={dept.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-600">{dept.name}</span>
                    <span className="text-xs font-bold text-slate-400">{dept.attended}/{dept.total}명 ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 참석자 목록 */}
      {attendedMembers.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
          <h3 className="text-sm font-black text-slate-800 mb-4">체크인 완료 ({attendedMembers.length}명)</h3>
          <div className="flex flex-wrap gap-2">
            {attendedMembers.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">
                <span className="w-5 h-5 rounded-md bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black">{m.name.charAt(0)}</span>
                {m.name}
                {m.department && <span className="text-emerald-400 font-medium">· {m.department}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 초기화 확인 모달 */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !resetting && setShowResetModal(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">참석 초기화</h3>
              <p className="text-sm text-slate-500 mb-1">전체 참석 현황을 초기화하시겠습니까?</p>
              <p className="text-xs text-red-400 font-medium mb-6">모든 멤버의 체크인이 해제됩니다</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowResetModal(false)}
                  disabled={resetting}
                  className="flex-1 h-11 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="flex-1 h-11 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all text-sm disabled:opacity-50"
                >
                  {resetting ? "초기화 중..." : "초기화"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 멤버 관리 탭 (MemberTab 이식)
function MembersTab({ members, onRefresh }: { members: EventMember[]; onRefresh: () => Promise<void> }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", department: "", email: "", phone: "", memo: "" });
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const departments = useMemo(() => {
    const depts = new Set<string>();
    members.forEach((m) => { if (m.department) depts.add(m.department); });
    return Array.from(depts).sort();
  }, [members]);

  const filteredMembers = useMemo(() => {
    if (deptFilter === "all") return members;
    return members.filter((m) => m.department === deptFilter);
  }, [members, deptFilter]);

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleAll = () => {
    const ids = filteredMembers.map((m) => m.id);
    if (ids.every((id) => checkedIds.has(id))) setCheckedIds(new Set());
    else setCheckedIds(new Set(ids));
  };
  const isAllChecked = filteredMembers.length > 0 && filteredMembers.every((m) => checkedIds.has(m.id));

  const handleBulkDelete = async () => {
    if (!confirm(`선택한 ${checkedIds.size}명을 삭제하시겠습니까?`)) return;
    setBulkDeleting(true);
    try {
      for (const id of checkedIds) { await deleteMember(id); }
      setCheckedIds(new Set());
      await onRefresh();
    } catch (err) { showErrorToast("삭제 실패: " + (err as Error).message); }
    setBulkDeleting(false);
  };

  const resetForm = () => { setForm({ name: "", department: "", email: "", phone: "", memo: "" }); setEditingId(null); setIsAdding(false); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await upsertMember({ ...(editingId ? { id: editingId } : {}), name: form.name.trim(), department: form.department.trim() || undefined, email: form.email.trim() || undefined, phone: form.phone.trim() || undefined, memo: form.memo.trim() || undefined });
      resetForm();
      await onRefresh();
    } catch (err) { showErrorToast("저장 실패: " + (err as Error).message); }
    setLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${name}을(를) 삭제하시겠습니까?`)) return;
    try { await deleteMember(id); await onRefresh(); } catch (err) { showErrorToast("삭제 실패: " + (err as Error).message); }
  };

  const handleToggleActive = async (member: EventMember) => {
    try { await upsertMember({ id: member.id, name: member.name, department: member.department || undefined, email: member.email || undefined, phone: member.phone || undefined, memo: member.memo || undefined, is_active: !member.is_active }); await onRefresh(); } catch (err) { showErrorToast("변경 실패: " + (err as Error).message); }
  };

  const startEdit = (member: EventMember) => {
    setEditingId(member.id);
    setForm({ name: member.name, department: member.department || "", email: member.email || "", phone: member.phone || "", memo: member.memo || "" });
    setIsAdding(true);
  };

  const handleBulkImport = async () => {
    const names = bulkText.split("\n").map((s) => s.trim()).filter(Boolean);
    if (names.length === 0) return;
    setLoading(true);
    try { await importMembers(names.map((name) => ({ name }))); setBulkText(""); setShowBulk(false); await onRefresh(); } catch (err) { showErrorToast("가져오기 실패: " + (err as Error).message); }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
      if (json.length === 0) { showWarningToast("빈 파일입니다"); return; }
      const headers = Object.keys(json[0]);
      const nameCol = headers.find((h) => ["이름", "name", "성명", "참가자", "멤버"].includes(h.toLowerCase())) || headers[0];
      const deptCol = headers.find((h) => ["부서", "department", "소속", "팀"].includes(h.toLowerCase()));
      const imported = json.map((row) => ({ name: String(row[nameCol] || "").trim(), department: deptCol ? String(row[deptCol] || "").trim() : undefined })).filter((m) => m.name);
      if (imported.length === 0) { showWarningToast("유효한 데이터가 없습니다"); return; }
      setLoading(true);
      await importMembers(imported);
      await onRefresh();
      showSuccessToast(`${imported.length}명 가져오기 완료`);
    } catch (err) { showErrorToast("파일 처리 실패: " + (err as Error).message); }
    setLoading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleExcelDownload = () => {
    const header = "이름,부서,이메일,전화번호,메모,상태\n";
    const rows = members.map((m) => [m.name, m.department || "", m.email || "", m.phone || "", m.memo || "", m.is_active ? "활성" : "비활성"].join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `멤버목록_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      {/* 상단 액션바 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-400">
          총 {members.length}명{deptFilter !== "all" && ` · ${deptFilter} ${filteredMembers.length}명`}
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setShowBulk(!showBulk)} className="px-3 py-1.5 text-[11px] font-bold bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-all">일괄 입력</button>
          <button onClick={() => fileRef.current?.click()} className="px-3 py-1.5 text-[11px] font-bold bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-all">엑셀 업로드</button>
          <button onClick={handleExcelDownload} className="px-3 py-1.5 text-[11px] font-bold bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-all">CSV 다운로드</button>
          <button onClick={() => { setIsAdding(true); setEditingId(null); setForm({ name: "", department: "", email: "", phone: "", memo: "" }); }}
            className="px-3 py-1.5 text-[11px] font-bold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-sm">
            + 멤버 추가
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
        </div>
      </div>

      {/* 일괄 입력 */}
      {showBulk && (
        <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm">
          <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="이름을 한 줄에 하나씩 입력하세요"
            className="w-full h-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-300 text-xs resize-none focus:outline-none focus:border-emerald-400" />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setShowBulk(false)} className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600">취소</button>
            <button onClick={handleBulkImport} disabled={loading || !bulkText.trim()} className="px-4 py-1.5 text-xs font-bold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-30">
              {loading ? "처리 중..." : "가져오기"}
            </button>
          </div>
        </div>
      )}

      {/* 추가/편집 폼 */}
      {isAdding && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[100px]">
              <label className="block text-[10px] font-bold text-slate-500 mb-1">이름 *</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-bold focus:outline-none focus:border-emerald-400" placeholder="홍길동" />
            </div>
            <div className="flex-1 min-w-[100px]">
              <label className="block text-[10px] font-bold text-slate-500 mb-1">부서</label>
              <input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-bold focus:outline-none focus:border-emerald-400" placeholder="개발팀" />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-[10px] font-bold text-slate-500 mb-1">이메일</label>
              <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-bold focus:outline-none focus:border-emerald-400" placeholder="email@example.com" />
            </div>
            <button onClick={resetForm} className="h-9 px-3 text-xs font-bold text-slate-400 hover:text-slate-600">취소</button>
            <button onClick={handleSave} disabled={loading || !form.name.trim()} className="h-9 px-4 text-xs font-bold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-30">
              {loading ? "저장 중..." : editingId ? "수정" : "추가"}
            </button>
          </div>
        </div>
      )}

      {/* 멤버 목록 */}
      {members.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <div className="text-4xl mb-3">👥</div>
          <p className="font-bold text-slate-500">등록된 멤버가 없습니다</p>
          <p className="text-xs text-slate-400 mt-1">위의 버튼으로 멤버를 추가하세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-3 items-start">
          {/* 부서 필터 */}
          <div className="flex lg:flex-col gap-1.5 flex-wrap">
            <button onClick={() => setDeptFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all text-center ${
                deptFilter === "all" ? "bg-emerald-500 text-white shadow-sm" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              }`}>
              전체 ({members.length})
            </button>
            {departments.map((dept) => {
              const count = members.filter((m) => m.department === dept).length;
              return (
                <button key={dept} onClick={() => setDeptFilter(dept)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all text-left truncate ${
                    deptFilter === dept ? "bg-emerald-500 text-white shadow-sm" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                  }`} title={dept}>
                  {dept} ({count})
                </button>
              );
            })}
          </div>

          {/* 멤버 테이블 */}
          <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200/60 overflow-y-scroll" style={{ maxHeight: "calc(100vh - 220px)" }}>
            {checkedIds.size > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border-b border-red-200">
                <span className="text-[11px] font-bold text-red-600">{checkedIds.size}명 선택</span>
                <button onClick={handleBulkDelete} disabled={bulkDeleting}
                  className="px-2.5 py-1 text-[10px] font-bold bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 transition-colors">
                  {bulkDeleting ? "삭제 중..." : "선택 삭제"}
                </button>
                <button onClick={() => setCheckedIds(new Set())} className="px-2.5 py-1 text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors">선택 해제</button>
              </div>
            )}
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-10" />
                <col className="w-[35%]" />
                <col className="w-[30%]" />
                <col className="w-[15%]" />
                <col className="w-[20%]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-2 py-2">
                    <button onClick={toggleAll} className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${isAllChecked ? "bg-emerald-500 border-emerald-500" : "border-slate-300 hover:border-emerald-300"}`}>
                      {isAllChecked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </button>
                  </th>
                  <th className="text-left px-3 py-2 text-[10px] font-extrabold text-slate-500 uppercase">이름</th>
                  <th className="text-left px-3 py-2 text-[10px] font-extrabold text-slate-500 uppercase">부서</th>
                  <th className="text-center px-3 py-2 text-[10px] font-extrabold text-slate-500 uppercase">상태</th>
                  <th className="text-right px-3 py-2 text-[10px] font-extrabold text-slate-500 uppercase">관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => {
                  const isChecked = checkedIds.has(member.id);
                  return (
                    <tr key={member.id} className={`border-b border-slate-100 transition-colors hover:bg-emerald-50/40 ${!member.is_active ? "opacity-40" : ""} ${isChecked ? "bg-emerald-50/60" : ""}`}>
                      <td className="px-2 py-2">
                        <button onClick={() => toggleCheck(member.id)} className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${isChecked ? "bg-emerald-500 border-emerald-500" : "border-slate-300 hover:border-emerald-300"}`}>
                          {isChecked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-[10px] font-black flex-shrink-0">{member.name.charAt(0)}</div>
                          <span className="text-xs font-bold text-slate-800">{member.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2"><span className="text-xs text-slate-500 font-medium">{member.department || "-"}</span></td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => handleToggleActive(member)}
                          className={`px-2 py-1 rounded-full text-[10px] font-bold transition-all ${member.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>
                          {member.is_active ? "활성" : "비활성"}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => startEdit(member)} className="px-2.5 py-1 text-[11px] font-bold text-emerald-500 hover:bg-emerald-50 rounded-md transition-colors">수정</button>
                          <button onClick={() => handleDelete(member.id, member.name)} className="px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">삭제</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// QR 체크인 탭
function QRTab() {
  const checkinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/events/attendance/checkin`
    : "";
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [liveStats, setLiveStats] = useState<{ total: number; attended: number } | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventSubtitle, setEventSubtitle] = useState("");

  // 실시간 폴링 (15초 간격)
  useEffect(() => {
    const poll = async () => {
      try {
        const data = await fetchAttendanceStatus();
        setLiveStats({ total: data.total, attended: data.attended });
        if (typeof data.event_title === "string") setEventTitle(data.event_title);
        if (typeof data.event_subtitle === "string") setEventSubtitle(data.event_subtitle);
      } catch { /* 무시 */ }
    };
    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, []);

  // ESC로 전체화면 해제
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isFullscreen]);

  // 전체화면 모드
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #064e3b 0%, #065f46 30%, #047857 60%, #059669 100%)" }}>
        {/* 닫기 버튼 */}
        <button onClick={() => setIsFullscreen(false)}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all z-10">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 배경 장식 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-20 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
          <div className="absolute bottom-20 right-20 w-60 h-60 bg-emerald-400/10 rounded-full blur-3xl" />
        </div>

        <div className="relative flex flex-col items-center gap-8">
          {/* 타이틀 (관리자 설정 > 이벤트(참석관리) 설정에서 변경 가능) */}
          <div className="text-center">
            <p className="text-emerald-300/80 text-sm font-semibold uppercase tracking-[0.3em] mb-2">{eventSubtitle || "출석 체크인"}</p>
            <h1 className="text-white text-3xl sm:text-4xl font-black">{eventTitle || "이벤트 제목을 설정하세요"}</h1>
          </div>

          {/* QR + 카운터 */}
          <div className="flex items-center gap-12">
            {/* QR 코드 */}
            {checkinUrl && (
              <div className="p-8 bg-white rounded-3xl shadow-2xl">
                <QRCodeSVG value={checkinUrl} size={360} level="H"
                  bgColor="#ffffff" fgColor="#064e3b" />
              </div>
            )}

            {/* 실시간 카운터 */}
            <div className="text-center space-y-6">
              <div>
                <p className="text-emerald-300/60 text-sm font-bold uppercase tracking-widest mb-2">현재 참석</p>
                <div className="flex items-baseline gap-2 justify-center">
                  <span className="text-8xl font-black text-white tabular-nums">{liveStats?.attended ?? 0}</span>
                  <span className="text-3xl font-bold text-white/40">/ {liveStats?.total ?? 0}</span>
                </div>
              </div>

              {/* 진행률 바 */}
              {liveStats && liveStats.total > 0 && (
                <div>
                  <div className="w-48 h-3 bg-white/10 rounded-full overflow-hidden mx-auto">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-700"
                      style={{ width: `${Math.round((liveStats.attended / liveStats.total) * 100)}%` }} />
                  </div>
                  <p className="text-emerald-300/60 text-sm font-bold mt-2">
                    {Math.round((liveStats.attended / liveStats.total) * 100)}%
                  </p>
                </div>
              )}

              <p className="text-white/30 text-xs font-medium">스마트폰으로 QR을 스캔하세요</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 전체화면 버튼 */}
      <button onClick={() => setIsFullscreen(true)}
        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-base rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0">
        🖥️ 전체화면으로 행사장에 띄우기
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          {/* 왼쪽: QR 코드 */}
          <div className="flex-1 p-6 sm:p-8 flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-slate-100">
            {checkinUrl && (
              <div className="p-4 bg-white rounded-2xl shadow-md border border-emerald-100">
                <QRCodeSVG value={checkinUrl} size={220} level="H"
                  bgColor="#ffffff" fgColor="#064e3b" />
              </div>
            )}
            <p className="text-xs text-slate-400 font-medium mt-4">스마트폰으로 스캔하세요</p>
          </div>

          {/* 오른쪽: 카운터 + URL */}
          <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center gap-6">
            {/* 실시간 카운터 */}
            {liveStats && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">실시간 참석 현황</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-5xl font-black text-emerald-600 tabular-nums">{liveStats.attended}</span>
                  <span className="text-lg text-slate-300 font-bold">/ {liveStats.total}명</span>
                </div>
                {liveStats.total > 0 && (
                  <div className="mt-3">
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-700"
                        style={{ width: `${Math.round((liveStats.attended / liveStats.total) * 100)}%` }} />
                    </div>
                    <p className="text-xs text-slate-400 font-bold mt-1">{Math.round((liveStats.attended / liveStats.total) * 100)}%</p>
                  </div>
                )}
              </div>
            )}

            {/* URL 공유 */}
            <div>
              <p className="text-xs font-bold text-slate-400 mb-2">체크인 URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-slate-50 rounded-lg text-[11px] text-slate-500 font-mono truncate border border-slate-200">{checkinUrl}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(checkinUrl); showSuccessToast("URL이 복사되었습니다!"); }}
                  className="px-3 py-2 text-xs font-bold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all flex-shrink-0">
                  복사
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
