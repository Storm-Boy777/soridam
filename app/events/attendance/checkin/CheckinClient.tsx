"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchAttendanceStatus, checkinMember } from "@/lib/api/event-attendance";
import { showErrorToast } from "@/lib/utils/toast";

interface MemberInfo {
  id: string;
  name: string;
  department: string | null;
  is_attended: boolean;
  attended_at: string | null;
}

export default function CheckinClient() {
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberInfo | null>(null);
  const [checkedIn, setCheckedIn] = useState<MemberInfo | null>(null);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [closed, setClosed] = useState(false);
  const [deptFilter, setDeptFilter] = useState<string>("all");

  const loadMembers = useCallback(async () => {
    try {
      const data = await fetchAttendanceStatus();
      setMembers(data.members || []);
    } catch (err) {
      console.error("멤버 로드 실패:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const departments = useMemo(() => {
    const depts = new Set<string>();
    members.forEach((m) => { if (m.department) depts.add(m.department); });
    // "공정기술그룹"을 제외하고 정렬, 마지막에 "공정기술그룹" 배치
    const sorted = Array.from(depts).filter((d) => d !== "공정기술그룹").sort((a, b) => a.localeCompare(b, "ko"));
    if (depts.has("공정기술그룹")) sorted.push("공정기술그룹");
    return sorted;
  }, [members]);

  const filteredMembers = useMemo(() => {
    if (deptFilter === "all") return members;
    return members.filter((m) => m.department === deptFilter);
  }, [members, deptFilter]);

  const handleCheckin = async () => {
    if (!selectedMember) return;
    setCheckinLoading(true);
    try {
      const result = await checkinMember(selectedMember.id);
      if (result.already_checked_in) {
        setAlreadyCheckedIn(true);
      }
      setCheckedIn(selectedMember);
    } catch (err) {
      showErrorToast("체크인 실패: " + (err as Error).message);
    }
    setCheckinLoading(false);
  };

  const handleReset = () => {
    setSelectedMember(null);
    setCheckedIn(null);
    setAlreadyCheckedIn(false);
    loadMembers();
  };

  // 종료 화면
  if (closed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 50%, #34d399 100%)" }}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-white text-lg font-bold">체크인이 완료되었습니다</p>
          <p className="text-white/60 text-sm mt-1">이 페이지를 닫아주세요</p>
        </div>
      </div>
    );
  }

  // 체크인 완료 화면
  if (checkedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 50%, #34d399 100%)" }}>
        <div className="w-full max-w-md bg-white rounded-[2rem] p-8 shadow-2xl text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
            {alreadyCheckedIn ? (
              <span className="text-4xl">ℹ️</span>
            ) : (
              <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>

          <h2 className="text-2xl font-black text-slate-800 mb-2">
            {alreadyCheckedIn ? "이미 체크인됨" : "체크인 완료!"}
          </h2>

          <div className="mt-4 p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xl font-black">
                {checkedIn.name.charAt(0)}
              </div>
              <div className="text-left">
                <p className="text-lg font-black text-slate-800">{checkedIn.name}</p>
                {checkedIn.department && (
                  <p className="text-sm text-slate-500 font-medium">{checkedIn.department}</p>
                )}
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-400 font-medium">
            {alreadyCheckedIn ? "이전에 이미 체크인하셨습니다" : "환영합니다! 즐거운 행사 되세요 🎉"}
          </p>

          <button onClick={() => setClosed(true)}
            className="mt-6 w-full h-12 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm">
            종료하기
          </button>
        </div>
      </div>
    );
  }

  // 확인 화면
  if (selectedMember) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 50%, #34d399 100%)" }}>
        <div className="w-full max-w-md bg-white rounded-[2rem] p-8 shadow-2xl text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-3xl font-black shadow-lg">
            {selectedMember.name.charAt(0)}
          </div>

          <h2 className="text-2xl font-black text-slate-800">{selectedMember.name}</h2>
          {selectedMember.department && (
            <p className="text-base text-slate-500 font-medium mt-1">{selectedMember.department}</p>
          )}

          <p className="mt-6 text-sm text-slate-600 font-bold">본인이 맞으시면 체크인 버튼을 눌러주세요</p>

          <div className="mt-6 space-y-3">
            <button onClick={handleCheckin} disabled={checkinLoading}
              className="w-full h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-lg font-black rounded-2xl transition-all shadow-xl shadow-emerald-500/30 hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.97] disabled:opacity-50">
              {checkinLoading ? "처리 중..." : "✅ 체크인"}
            </button>
            <button onClick={() => setSelectedMember(null)}
              className="w-full h-12 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm">
              돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 멤버 선택 화면
  return (
    <div className="min-h-screen p-4 pb-20"
      style={{ background: "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 50%, #ecfdf5 100%)" }}>
      <div className="max-w-lg mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-6 pt-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg mb-4">
            <span className="text-3xl">📋</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800">출석 체크인</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">본인 이름을 찾아 체크인해 주세요</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 font-bold">로딩 중...</div>
        ) : (
          <>
            {/* 부서 필터 */}
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {departments.map((dept) => (
                <button key={dept} onClick={() => setDeptFilter(deptFilter === dept ? "all" : dept)}
                  className={`px-2 py-2 rounded-lg text-xs font-bold transition-all text-center truncate ${
                    deptFilter === dept ? "bg-emerald-500 text-white shadow-sm" : "bg-white text-slate-500 border border-slate-200"
                  }`} title={dept}>
                  {dept}
                </button>
              ))}
            </div>

            {/* 멤버 목록 */}
            <div className="space-y-2">
              {filteredMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => !member.is_attended && setSelectedMember(member)}
                  disabled={member.is_attended}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all text-left ${
                    member.is_attended
                      ? "bg-emerald-50 border border-emerald-200 opacity-60 cursor-not-allowed"
                      : "bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md active:scale-[0.98]"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0 ${
                    member.is_attended ? "bg-emerald-400" : "bg-gradient-to-br from-slate-400 to-slate-500"
                  }`}>
                    {member.is_attended ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      member.name.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${member.is_attended ? "text-emerald-700" : "text-slate-800"}`}>
                      {member.name}
                    </p>
                    {member.department && (
                      <p className="text-xs text-slate-400 font-medium">{member.department}</p>
                    )}
                  </div>
                  {member.is_attended ? (
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-100 px-2 py-1 rounded-full">체크인 완료</span>
                  ) : (
                    <svg className="w-5 h-5 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
