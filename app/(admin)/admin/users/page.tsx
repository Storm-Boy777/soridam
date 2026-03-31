"use client";

import { useState, useCallback } from "react";
import {
  Search,
  Coins,
  ArrowLeft,
  ClipboardList,
  FileText,
  CreditCard,
  User,
  Calendar,
  Loader2,
  Shield,
  ShieldOff,
  Download,
  Trash2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getUsers, getAdminUserDetail, adjustCredit, changePlan, toggleUserBan, deleteUser } from "@/lib/actions/admin/users";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { CreditAdjustModal } from "@/components/admin/credit-adjust-modal";
import { PlanChangeModal } from "@/components/admin/plan-change-modal";
import type { AdminUser, AdminUserDetail, CreditAdjustParams, PlanChangeParams } from "@/lib/types/admin";

// ── 유틸리티 ──

// 날짜 포맷
function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ko-KR");
}

// 금액 포맷
function formatCurrency(amount: number) {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

// 플랜 뱃지 색상
const planColors: Record<string, string> = {
  free: "bg-gray-100 text-gray-600",
  standard: "bg-blue-50 text-blue-700",
  allinone: "bg-purple-50 text-purple-700",
};

// 등급 뱃지 색상
const gradeColors: Record<string, string> = {
  AL: "bg-purple-100 text-purple-700",
  IH: "bg-blue-100 text-blue-700",
  IM3: "bg-sky-100 text-sky-700",
  IM2: "bg-teal-100 text-teal-700",
  IM1: "bg-emerald-100 text-emerald-700",
  IL: "bg-green-100 text-green-700",
  NH: "bg-amber-100 text-amber-700",
  NM: "bg-orange-100 text-orange-700",
  NL: "bg-red-100 text-red-700",
};

// 모드 뱃지
function ModeBadge({ mode }: { mode: string }) {
  const isTest = mode === "test";
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
        isTest ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
      }`}
    >
      {isTest ? "실전" : "훈련"}
    </span>
  );
}

// 상태 뱃지
function StatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    completed: "bg-green-50 text-green-700",
    active: "bg-blue-50 text-blue-700",
    in_progress: "bg-blue-50 text-blue-700",
    expired: "bg-gray-100 text-gray-500",
    cancelled: "bg-red-50 text-red-600",
    paid: "bg-green-50 text-green-700",
    refunded: "bg-orange-50 text-orange-600",
    pending: "bg-amber-50 text-amber-600",
    confirmed: "bg-green-50 text-green-700",
    draft: "bg-gray-100 text-gray-600",
    paused: "bg-amber-50 text-amber-600",
  };

  const statusLabels: Record<string, string> = {
    completed: "완료",
    active: "진행중",
    in_progress: "진행중",
    expired: "만료",
    cancelled: "취소",
    paid: "결제완료",
    refunded: "환불",
    pending: "대기",
    confirmed: "확정",
    draft: "초안",
    paused: "일시정지",
  };

  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
        statusStyles[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      {statusLabels[status] || status}
    </span>
  );
}

// 등급 뱃지
function GradeBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-xs text-foreground-muted">-</span>;
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
        gradeColors[level] || "bg-gray-100 text-gray-600"
      }`}
    >
      {level}
    </span>
  );
}

// 질문 타입 라벨
function getQuestionTypeLabel(type: string | null): string {
  if (!type) return "-";
  const map: Record<string, string> = {
    describe: "묘사",
    routine: "루틴",
    compare: "비교",
    past_experience: "과거경험",
    unexpected: "돌발경험",
    memorable: "기억남는경험",
    compare_change: "비교변화",
    social_issue: "사회적이슈",
    ask_question: "질문하기",
    alternative: "대안제시",
  };
  return map[type] || type;
}

// 질문 타입 색상
function getQuestionTypeColor(type: string | null): string {
  if (!type) return "bg-gray-100 text-gray-600";
  const map: Record<string, string> = {
    describe: "bg-sky-50 text-sky-700",
    routine: "bg-blue-50 text-blue-700",
    compare: "bg-indigo-50 text-indigo-700",
    past_experience: "bg-amber-50 text-amber-700",
    unexpected: "bg-orange-50 text-orange-700",
    memorable: "bg-rose-50 text-rose-700",
    compare_change: "bg-violet-50 text-violet-700",
    social_issue: "bg-emerald-50 text-emerald-700",
    ask_question: "bg-teal-50 text-teal-700",
    alternative: "bg-cyan-50 text-cyan-700",
  };
  return map[type] || "bg-gray-100 text-gray-600";
}

// ── 메인 페이지 ──

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [creditTarget, setCreditTarget] = useState<{ id: string; name: string } | null>(null);
  const [planTarget, setPlanTarget] = useState<{ id: string; name: string; plan: string } | null>(null);
  const queryClient = useQueryClient();

  // 사용자 목록 (useQuery)
  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin-users", page, search],
    queryFn: () => getUsers({ page, pageSize: 20, search }),
    staleTime: 30 * 1000,
  });

  const users = usersData?.data || [];
  const total = usersData?.total || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleAdjust = async (params: CreditAdjustParams) => {
    const result = await adjustCredit(params);
    if (!result.success) {
      toast.error(result.error || "크레딧 조정 실패");
      return;
    }
    // 목록 + 상세 캐시 모두 갱신
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    if (selectedUserId) {
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", selectedUserId] });
    }
  };

  const handlePlanChange = async (params: PlanChangeParams) => {
    const result = await changePlan(params);
    if (!result.success) {
      toast.error(result.error || "플랜 변경 실패");
      return;
    }
    setPlanTarget(null);
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    if (selectedUserId) {
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", selectedUserId] });
    }
  };

  const handleToggleBan = async (userId: string, ban: boolean) => {
    const reason = prompt(ban ? "차단 사유를 입력하세요:" : "차단 해제 사유를 입력하세요:");
    if (!reason) return;
    const result = await toggleUserBan({ userId, ban, reason });
    if (!result.success) {
      toast.error(result.error || (ban ? "차단 실패" : "차단 해제 실패"));
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    if (selectedUserId) {
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", selectedUserId] });
    }
  };

  // 상세 뷰가 선택된 경우
  if (selectedUserId) {
    return (
      <>
        <UserDetailView
          userId={selectedUserId}
          onBack={() => setSelectedUserId(null)}
          onCreditAdjust={(id, name) => setCreditTarget({ id, name })}
          onPlanChange={(id, name, plan) => setPlanTarget({ id, name, plan })}
          onBan={(id, ban) => handleToggleBan(id, ban)}
        />
        {creditTarget && (
          <CreditAdjustModal
            userId={creditTarget.id}
            userName={creditTarget.name}
            onSubmit={handleAdjust}
            onClose={() => setCreditTarget(null)}
          />
        )}
        {planTarget && (
          <PlanChangeModal
            userId={planTarget.id}
            userName={planTarget.name}
            currentPlan={planTarget.plan}
            onSubmit={handlePlanChange}
            onClose={() => setPlanTarget(null)}
          />
        )}
      </>
    );
  }

  // 목록의 이메일 열에 클릭 이벤트 추가
  const columns = [
    {
      key: "email",
      label: "이메일",
      render: (row: AdminUser) => (
        <button
          onClick={() => setSelectedUserId(row.id)}
          className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
        >
          {row.email}
        </button>
      ),
    },
    {
      key: "display_name",
      label: "이름",
      render: (row: AdminUser) => row.display_name || "-",
    },
    {
      key: "current_plan",
      label: "플랜",
      render: (row: AdminUser) => (
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-medium ${
            planColors[row.current_plan] || planColors.free
          }`}
        >
          {row.current_plan}
        </span>
      ),
    },
    {
      key: "credits",
      label: "크레딧 (모/스)",
      render: (row: AdminUser) => (
        <span className="text-xs">
          {row.mock_exam_credits + row.plan_mock_exam_credits} / {row.script_credits + row.plan_script_credits}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "가입일",
      render: (row: AdminUser) => formatDate(row.created_at),
    },
    {
      key: "actions",
      label: "",
      className: "w-10",
      render: (row: AdminUser) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCreditTarget({ id: row.id, name: row.display_name || row.email });
          }}
          title="크레딧 조정"
          className="rounded-md p-1 text-foreground-muted hover:bg-surface-secondary hover:text-primary-600"
        >
          <Coins size={16} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">사용자 관리</h1>
          <button
            onClick={async () => {
              const { toCSV, downloadCSV } = await import("@/lib/utils/csv-export");
              const allData = await getUsers({ page: 1, pageSize: 1000 });
              const csv = toCSV(allData.data as unknown as Record<string, unknown>[], [
                { key: "email", label: "이메일" },
                { key: "display_name", label: "이름" },
                { key: "current_plan", label: "플랜" },
                { key: "mock_exam_credits", label: "모의고사 크레딧" },
                { key: "script_credits", label: "스크립트 크레딧" },
                { key: "created_at", label: "가입일" },
              ]);
              downloadCSV(csv, `users_${new Date().toISOString().split("T")[0]}.csv`);
            }}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-secondary"
          >
            <Download size={13} />
            CSV
          </button>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="이메일 또는 이름 검색"
              className="rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-sm text-foreground"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
          >
            검색
          </button>
        </form>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg border border-border bg-surface-secondary" />
          ))}
        </div>
      ) : (
        <AdminDataTable
          columns={columns}
          data={users}
          total={total}
          page={page}
          pageSize={20}
          onPageChange={setPage}
          emptyMessage="사용자가 없습니다"
        />
      )}

      {creditTarget && (
        <CreditAdjustModal
          userId={creditTarget.id}
          userName={creditTarget.name}
          onSubmit={handleAdjust}
          onClose={() => setCreditTarget(null)}
        />
      )}
    </div>
  );
}

// ── 사용자 상세 뷰 ──

function UserDetailView({
  userId,
  onBack,
  onCreditAdjust,
  onPlanChange,
  onBan,
}: {
  userId: string;
  onBack: () => void;
  onCreditAdjust: (userId: string, userName: string) => void;
  onPlanChange: (userId: string, userName: string, currentPlan: string) => void;
  onBan: (userId: string, ban: boolean) => void;
}) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ["admin-user-detail", userId],
    queryFn: () => getAdminUserDetail(userId),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-foreground-secondary hover:text-foreground">
          <ArrowLeft size={16} /> 목록으로
        </button>
        <p className="py-10 text-center text-foreground-muted">사용자를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const { user, summary, recentMockExams, recentScripts, recentOrders } = detail;

  return (
    <div className="space-y-6">
      {/* 헤더 + 뒤로가기 */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground-secondary hover:bg-surface-secondary hover:text-foreground"
        >
          <ArrowLeft size={16} />
          목록
        </button>
        <h1 className="text-xl font-bold text-foreground">사용자 상세</h1>
      </div>

      {/* A. 프로필 카드 */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50">
                <User size={20} className="text-primary-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{user.display_name || user.email}</h2>
                <p className="text-sm text-foreground-secondary">{user.email}</p>
              </div>
              <span className={`rounded-md px-2.5 py-0.5 text-xs font-medium ${planColors[user.current_plan] || planColors.free}`}>
                {user.current_plan}
              </span>
              {user.banned_until && new Date(user.banned_until) > new Date() && (
                <span className="rounded-md bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                  차단됨
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-foreground-muted">
              <span className="flex items-center gap-1">
                <Calendar size={12} /> 가입: {formatDate(user.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={12} /> 접속: {formatDate(user.last_sign_in_at)}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* 크레딧 4개 표시 */}
            <div className="flex flex-wrap gap-2">
              <CreditBadge label="플랜모의" value={user.plan_mock_exam_credits} color="purple" />
              <CreditBadge label="플랜스크립트" value={user.plan_script_credits} color="blue" />
              <CreditBadge label="모의" value={user.mock_exam_credits} color="amber" />
              <CreditBadge label="스크립트" value={user.script_credits} color="teal" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onCreditAdjust(user.id, user.display_name || user.email)}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-secondary hover:text-primary-600"
              >
                <Coins size={14} />
                크레딧 조정
              </button>
              <button
                onClick={() => onPlanChange(user.id, user.display_name || user.email, user.current_plan)}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-secondary hover:text-primary-600"
              >
                플랜 변경
              </button>
              {user.banned_until && new Date(user.banned_until) > new Date() ? (
                <button
                  onClick={() => onBan(user.id, false)}
                  className="flex items-center gap-1 rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50"
                >
                  <ShieldOff size={14} />
                  차단 해제
                </button>
              ) : (
                <button
                  onClick={() => onBan(user.id, true)}
                  className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  <Shield size={14} />
                  계정 차단
                </button>
              )}
              <button
                onClick={async () => {
                  const reason = prompt(`"${user.email}" 계정을 완전히 삭제합니다.\n모든 데이터(녹음, 스크립트, 모의고사, 결제 등)가 영구 삭제됩니다.\n\n삭제 사유를 입력하세요:`);
                  if (!reason) return;
                  const confirm2 = window.confirm(`정말로 "${user.email}" 계정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`);
                  if (!confirm2) return;
                  const result = await deleteUser({ userId: user.id, reason });
                  if (result.success) {
                    toast.success("사용자가 삭제되었습니다");
                    onBack();
                  } else {
                    toast.error(result.error || "삭제 실패");
                  }
                }}
                className="flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
              >
                <Trash2 size={14} />
                계정 삭제
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* B. 활동 요약 4칸 그리드 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard
          icon={<ClipboardList size={18} className="text-sky-500" />}
          label="모의고사"
          value={`${summary.completedMockExams}/${summary.totalMockExams}`}
        />
        <SummaryCard
          icon={<FileText size={18} className="text-emerald-500" />}
          label="스크립트"
          value={`${summary.confirmedScripts}/${summary.totalScripts}`}
        />
        <SummaryCard
          icon={<CreditCard size={18} className="text-amber-500" />}
          label="결제"
          value={`${formatCurrency(summary.totalSpent)} (${summary.totalOrders}건)`}
        />
      </div>

      {/* C. 최근 모의고사 */}
      <SectionCard title="최근 모의고사">
        {recentMockExams.length === 0 ? (
          <EmptyRow />
        ) : (
          <div className="divide-y divide-border">
            {recentMockExams.map((m) => (
              <div key={m.session_id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-foreground-secondary">{formatDate(m.started_at)}</span>
                <div className="flex items-center gap-2">
                  <ModeBadge mode={m.mode} />
                  <StatusBadge status={m.status} />
                  <GradeBadge level={m.final_level} />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* D. 최근 스크립트 */}
      <SectionCard title="최근 스크립트">
        {recentScripts.length === 0 ? (
          <EmptyRow />
        ) : (
          <div className="divide-y divide-border">
            {recentScripts.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="shrink-0 text-foreground-secondary">{formatDate(s.created_at)}</span>
                  <span className="truncate text-foreground" title={s.question_korean || ""}>
                    {s.question_korean || "-"}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${getQuestionTypeColor(s.question_type)}`}>
                    {getQuestionTypeLabel(s.question_type)}
                  </span>
                  <GradeBadge level={s.target_grade} />
                  <StatusBadge status={s.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* E. 최근 결제 */}
      <SectionCard title="최근 결제">
        {recentOrders.length === 0 ? (
          <EmptyRow />
        ) : (
          <div className="divide-y divide-border">
            {recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-foreground-secondary">{formatDate(o.created_at)}</span>
                  <span className="text-foreground">{o.product_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground">{formatCurrency(o.amount)}</span>
                  <StatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

    </div>
  );
}

// ── 보조 컴포넌트 ──

// 크레딧 뱃지
function CreditBadge({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    purple: "bg-purple-50 text-purple-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    teal: "bg-teal-50 text-teal-700",
  };

  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${colorMap[color] || colorMap.blue}`}>
      {label} {value}
    </span>
  );
}

// 활동 요약 카드
function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-foreground-muted">{label}</span>
      </div>
      <p className="mt-2 text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

// 섹션 카드
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="border-b border-border bg-surface-secondary px-4 py-2">
        <span className="text-xs font-medium text-foreground-muted">{title}</span>
      </div>
      {children}
    </div>
  );
}

// 빈 행
function EmptyRow() {
  return (
    <p className="px-4 py-6 text-center text-sm text-foreground-muted">데이터가 없습니다.</p>
  );
}
