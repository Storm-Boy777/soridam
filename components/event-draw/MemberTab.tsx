"use client";

import { useState, useRef, useMemo } from "react";
import { useEventDrawStore } from "@/lib/stores/eventDrawStore";
import type { EventMember } from "@/lib/stores/eventDrawStore";
import { upsertMember, deleteMember, importMembers } from "@/lib/api/event-draw";
import { showSuccessToast, showErrorToast, showWarningToast } from "@/lib/utils/toast";

interface MemberTabProps {
  onRefresh: () => Promise<void>;
}

export default function MemberTab({ onRefresh }: MemberTabProps) {
  const members = useEventDrawStore((s) => s.members);
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
      {/* 상단: 액션바 + 필터 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-400">
          총 {members.length}명{deptFilter !== "all" && ` · ${deptFilter} ${filteredMembers.length}명`}
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setShowBulk(!showBulk)} className="px-3 py-1.5 text-[11px] font-bold bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-all">일괄 입력</button>
          <button onClick={() => fileRef.current?.click()} className="px-3 py-1.5 text-[11px] font-bold bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-all">엑셀 업로드</button>
          <button onClick={handleExcelDownload} className="px-3 py-1.5 text-[11px] font-bold bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-all">CSV 다운로드</button>
          <button
            onClick={() => { setIsAdding(true); setEditingId(null); setForm({ name: "", department: "", email: "", phone: "", memo: "" }); }}
            className="px-3 py-1.5 text-[11px] font-bold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-sm"
          >
            + 멤버 추가
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
        </div>
      </div>

      {/* 일괄 입력 */}
      {showBulk && (
        <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm">
          <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="이름을 한 줄에 하나씩 입력하세요"
            className="w-full h-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-300 text-xs resize-none focus:outline-none focus:border-blue-400" />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setShowBulk(false)} className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600">취소</button>
            <button onClick={handleBulkImport} disabled={loading || !bulkText.trim()} className="px-4 py-1.5 text-xs font-bold bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-30">
              {loading ? "처리 중..." : "가져오기"}
            </button>
          </div>
        </div>
      )}

      {/* 추가/편집 폼 */}
      {isAdding && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[100px]">
              <label className="block text-[10px] font-bold text-slate-500 mb-1">이름 *</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-bold focus:outline-none focus:border-blue-400" placeholder="홍길동" />
            </div>
            <div className="flex-1 min-w-[100px]">
              <label className="block text-[10px] font-bold text-slate-500 mb-1">부서</label>
              <input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-bold focus:outline-none focus:border-blue-400" placeholder="개발팀" />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-[10px] font-bold text-slate-500 mb-1">이메일</label>
              <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-bold focus:outline-none focus:border-blue-400" placeholder="email@example.com" />
            </div>
            <button onClick={resetForm} className="h-9 px-3 text-xs font-bold text-slate-400 hover:text-slate-600">취소</button>
            <button onClick={handleSave} disabled={loading || !form.name.trim()} className="h-9 px-4 text-xs font-bold bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-30">
              {loading ? "저장 중..." : editingId ? "수정" : "추가"}
            </button>
          </div>
        </div>
      )}

      {/* 2컬럼: 왼쪽(필터) + 오른쪽(테이블) */}
      {members.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <div className="text-4xl mb-3">👥</div>
          <p className="font-bold text-slate-500">등록된 멤버가 없습니다</p>
          <p className="text-xs text-slate-400 mt-1">위의 버튼으로 멤버를 추가하세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-3 items-start">
          {/* 왼쪽: 파트 필터 */}
          <div className="flex lg:flex-col gap-1.5 flex-wrap">
            <button
              onClick={() => setDeptFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all text-center ${
                deptFilter === "all"
                  ? "bg-blue-500 text-white shadow-sm"
                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              전체 ({members.length})
            </button>
            {departments.map((dept) => {
              const count = members.filter((m) => m.department === dept).length;
              return (
                <button
                  key={dept}
                  onClick={() => setDeptFilter(dept)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all text-left truncate ${
                    deptFilter === dept
                      ? "bg-blue-500 text-white shadow-sm"
                      : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                  }`}
                  title={dept}
                >
                  {dept} ({count})
                </button>
              );
            })}
          </div>

          {/* 오른쪽: 멤버 테이블 */}
          <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200/60 overflow-y-scroll" style={{ maxHeight: "calc(100vh - 220px)" }}>
            {/* 선택 액션 바 */}
            {checkedIds.size > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border-b border-red-200">
                <span className="text-[11px] font-bold text-red-600">{checkedIds.size}명 선택</span>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="px-2.5 py-1 text-[10px] font-bold bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {bulkDeleting ? "삭제 중..." : "선택 삭제"}
                </button>
                <button
                  onClick={() => setCheckedIds(new Set())}
                  className="px-2.5 py-1 text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors"
                >
                  선택 해제
                </button>
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
                    <button onClick={toggleAll} className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                      isAllChecked ? "bg-blue-500 border-blue-500" : "border-slate-300 hover:border-blue-300"
                    }`}>
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
                    <tr key={member.id}
                      className={`border-b border-slate-100 transition-colors hover:bg-blue-50/40 ${!member.is_active ? "opacity-40" : ""} ${isChecked ? "bg-blue-50/60" : ""}`}>
                      <td className="px-2 py-2">
                        <button onClick={() => toggleCheck(member.id)} className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                          isChecked ? "bg-blue-500 border-blue-500" : "border-slate-300 hover:border-blue-300"
                        }`}>
                          {isChecked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white text-[10px] font-black flex-shrink-0">
                            {member.name.charAt(0)}
                          </div>
                          <span className="text-xs font-bold text-slate-800">{member.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-slate-500 font-medium">{member.department || "-"}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => handleToggleActive(member)}
                          className={`px-2 py-1 rounded-full text-[10px] font-bold transition-all ${
                            member.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                          }`}>
                          {member.is_active ? "활성" : "비활성"}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => startEdit(member)} className="px-2.5 py-1 text-[11px] font-bold text-blue-500 hover:bg-blue-50 rounded-md transition-colors">수정</button>
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
