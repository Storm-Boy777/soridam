"use client";

import { useState, useTransition, useCallback } from "react";
import { T } from "@/lib/constants/tables";
import { formatUsd } from "@/lib/constants/pricing";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  Mail,
  Shield,
  Calendar,
  Target,
  CreditCard,
  ArrowRight,
  Check,
  LogOut,
  KeyRound,
  Camera,
  ClipboardList,
  Flame,
  Zap,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile, updateGoals } from "@/lib/actions/auth";
import { getCustomerPortalUrl } from "@/lib/actions/billing";
import { serverSignOut } from "@/lib/supabase";
import { createClient } from "@/lib/supabase";

/* ── 크레딧 조회 ── */

type BalanceData = {
  balance_cents: number;
  total_charged: number;
  total_used: number;
  creem_customer_id?: string | null;
};

type TransactionData = {
  id: string;
  type: "charge" | "usage" | "refund" | "admin_adjust";
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
};

type CreditsData = {
  balance: BalanceData;
  transactions: TransactionData[];
};

async function fetchUserCredits(userId: string): Promise<CreditsData> {
  const supabase = createClient();
  const [balanceRes, txRes] = await Promise.all([
    supabase
      .from(T.polar_balances)
      .select("balance_cents, total_charged, total_used, creem_customer_id")
      .eq("user_id", userId)
      .single(),
    supabase
      .from(T.polar_transactions)
      .select("id, type, amount, balance_after, description, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  return {
    balance: (balanceRes.data as BalanceData) ?? { balance_cents: 0, total_charged: 0, total_used: 0 },
    transactions: (txRes.data as TransactionData[]) ?? [],
  };
}

/* ── 타입 ── */

type UserData = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  provider: string;
  createdAt: string;
  currentGrade: string;
  targetGrade: string;
  examDate: string;
};

/* ── 상수 ── */

const tabs = [
  { id: "profile", label: "프로필", icon: User },
  { id: "plan", label: "크레딧", icon: CreditCard },
  { id: "goal", label: "목표", icon: Target },
  { id: "account", label: "계정", icon: Shield },
] as const;

type TabId = (typeof tabs)[number]["id"];

const currentGradeOptions = [
  { value: "", label: "선택해 주세요" },
  { value: "none", label: "아직 미응시" },
  { value: "NH", label: "NH (Novice High)" },
  { value: "IL", label: "IL (Intermediate Low)" },
  { value: "IM1", label: "IM1 (Intermediate Mid 1)" },
  { value: "IM2", label: "IM2 (Intermediate Mid 2)" },
  { value: "IM3", label: "IM3 (Intermediate Mid 3)" },
  { value: "IH", label: "IH (Intermediate High)" },
  { value: "AL", label: "AL (Advanced Low)" },
];

const targetGradeOptions = [
  { value: "", label: "선택해 주세요" },
  { value: "IL", label: "IL (Intermediate Low)" },
  { value: "IM1", label: "IM1 (Intermediate Mid 1)" },
  { value: "IM2", label: "IM2 (Intermediate Mid 2)" },
  { value: "IM3", label: "IM3 (Intermediate Mid 3)" },
  { value: "IH", label: "IH (Intermediate High)" },
  { value: "AL", label: "AL (Advanced Low)" },
];


/* ── 유틸 ── */

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function getDday(dateStr: string) {
  if (!dateStr) return null;
  const diff = Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return "D-Day";
  return `D+${Math.abs(diff)}`;
}

function providerLabel(provider: string) {
  if (provider === "google") return "Google";
  if (provider === "kakao") return "카카오";
  return "이메일";
}

/* ── 메인 컴포넌트 ── */

export function MyPageContent({ user }: { user: UserData }) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabId | null;
  const initialTab: TabId = tabParam && tabs.some((t) => t.id === tabParam) ? tabParam : "profile";
  const [activeTab, setActiveTabState] = useState<TabId>(initialTab);

  const setActiveTab = useCallback((id: TabId) => {
    setActiveTabState(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url.toString());
  }, []);

  const { data: credits } = useQuery({
    queryKey: ["user-credits", user.id],
    queryFn: () => fetchUserCredits(user.id),
    staleTime: 5 * 60 * 1000,
    enabled: !!user.id,
  });

  return (
    <div>
      {/* 탭 네비게이션 — 카드형 세그먼트 (스크립트/모의고사/시험후기 통일) */}
      <div className="mb-4 flex gap-1 rounded-xl bg-surface-secondary p-1 sm:mb-6">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-medium transition-all sm:gap-2 sm:px-3 sm:text-sm ${
                active
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-foreground-secondary hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === "profile" && <ProfileTab user={user} />}
      {activeTab === "plan" && <PlanTab user={user} credits={credits} />}
      {activeTab === "goal" && <GoalTab user={user} />}
      {activeTab === "account" && <AccountTab user={user} />}
    </div>
  );
}

/* ── 프로필 탭 ── */

function ProfileTab({ user }: { user: UserData }) {
  const [name, setName] = useState(user.name);
  const [msg, setMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setMsg(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("name", name);
      const result = await updateProfile(fd);
      if (result?.error) {
        setMsg({ type: "error", text: result.error });
      } else {
        setMsg({ type: "success", text: "저장되었습니다" });
        setTimeout(() => setMsg(null), 2000);
      }
    });
  };

  const initial = user.name ? user.name[0].toUpperCase() : "U";

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 프로필 + 이름 편집 카드 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
          {/* 아바타 */}
          <div className="relative shrink-0 self-center sm:self-start">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt="프로필"
                width={80}
                height={80}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-600">
                {initial}
              </div>
            )}
            <button
              type="button"
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-surface-secondary text-foreground-muted transition-colors hover:bg-border"
              title="프로필 사진 변경 (준비 중)"
            >
              <Camera size={14} />
            </button>
          </div>
          {/* 이름 편집 */}
          <div className="min-w-0 flex-1">
            <label
              htmlFor="mypage-name"
              className="mb-1.5 block text-sm font-medium text-foreground-secondary"
            >
              이름
            </label>
            <div className="flex gap-2">
              <Input
                id="mypage-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full"
              />
              <Button
                onClick={handleSave}
                disabled={isPending || name.trim() === user.name}
                size="sm"
                className="shrink-0"
              >
                {isPending ? "저장 중..." : "저장"}
              </Button>
            </div>
            {msg && (
              <p
                className={`mt-1.5 flex items-center gap-1 text-xs ${
                  msg.type === "success"
                    ? "text-green-600"
                    : "text-accent-500"
                }`}
              >
                {msg.type === "success" && <Check size={12} />}
                {msg.text}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 기본 정보 — 그리드 */}
      <div className="grid gap-4 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-foreground-muted" />
            <p className="text-xs text-foreground-secondary">이메일</p>
          </div>
          <p className="mt-2 truncate text-sm font-medium text-foreground">{user.email}</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-foreground-muted" />
            <p className="text-xs text-foreground-secondary">가입 방법</p>
          </div>
          <p className="mt-2 text-sm font-medium text-foreground">{providerLabel(user.provider)}</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-foreground-muted" />
            <p className="text-xs text-foreground-secondary">가입일</p>
          </div>
          <p className="mt-2 text-sm font-medium text-foreground">{formatDate(user.createdAt)}</p>
        </div>
      </div>

      {/* 비밀번호 변경 — 이메일 가입자만 */}
      {user.provider !== "google" && user.provider !== "kakao" && (
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">비밀번호</h3>
              <p className="mt-0.5 text-sm text-foreground-secondary">
                이메일로 재설정 링크를 받아 변경합니다.
              </p>
            </div>
            <Link href="/forgot-password">
              <Button variant="outline" size="sm">
                <KeyRound size={16} className="mr-1.5" />
                변경
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 크레딧 탭 ── */

const TX_TYPE_LABEL: Record<string, string> = {
  charge: "충전",
  usage: "사용",
  refund: "환불",
  admin_adjust: "관리자 조정",
};

const TX_TYPE_COLOR: Record<string, string> = {
  charge: "text-blue-600",
  usage: "text-red-500",
  refund: "text-green-600",
  admin_adjust: "text-foreground-secondary",
};

function PlanTab({ credits }: { user: UserData; credits?: CreditsData }) {
  const balance = credits?.balance ?? { balance_cents: 0, total_charged: 0, total_used: 0 };
  const transactions = credits?.transactions ?? [];
  const hasCreemCustomer = !!credits?.balance?.creem_customer_id;

  return (
    <div className="space-y-6">
      {/* 잔액 */}
      <div className="rounded-[var(--radius-xl)] border border-primary-200 bg-primary-50/50 p-4 sm:p-6">
        <h3 className="mb-4 font-semibold text-foreground">크레딧 잔액</h3>
        <div className="rounded-[var(--radius-lg)] bg-white p-5 text-center">
          <p className="text-3xl font-bold text-primary-600">
            {formatUsd(balance.balance_cents)}
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-[var(--radius-lg)] bg-white p-3 text-center">
            <p className="text-xs text-foreground-muted">총 충전</p>
            <p className="mt-1 text-sm font-semibold text-blue-600">
              {formatUsd(balance.total_charged)}
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] bg-white p-3 text-center">
            <p className="text-xs text-foreground-muted">총 사용</p>
            <p className="mt-1 text-sm font-semibold text-red-500">
              {formatUsd(balance.total_used)}
            </p>
          </div>
        </div>
        <Link href="/store" className="mt-4 block">
          <Button size="sm" className="w-full">
            크레딧 충전하기
            <ArrowRight size={14} className="ml-1" />
          </Button>
        </Link>
      </div>

      {/* 후원 관리 — Creem 결제 이력이 있을 때만 */}
      {hasCreemCustomer && (
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">후원 관리</h3>
              <p className="mt-0.5 text-xs text-foreground-muted">정기 후원 취소 및 결제 수단을 관리할 수 있습니다.</p>
            </div>
            <BillingPortalButton />
          </div>
        </div>
      )}

      {/* 최근 이용 내역 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
        <h3 className="mb-4 font-semibold text-foreground">최근 이용 내역</h3>
        {transactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-foreground-muted">
            아직 이용 내역이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {tx.description}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground-muted">
                    {new Date(tx.created_at).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" · "}
                    {TX_TYPE_LABEL[tx.type] ?? tx.type}
                  </p>
                </div>
                <p className={`ml-4 text-sm font-semibold whitespace-nowrap ${TX_TYPE_COLOR[tx.type] ?? ""}`}>
                  {tx.type === "usage" ? "-" : "+"}{formatUsd(Math.abs(tx.amount))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ── 후원 관리 버튼 ── */
function BillingPortalButton() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await getCustomerPortalUrl();
      if (result.url) {
        window.open(result.url, "_blank");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "로딩..." : "관리하기"}
      {!loading && <ExternalLink size={14} className="ml-1" />}
    </Button>
  );
}

/* ── 목표 탭 ── */

function GoalTab({ user }: { user: UserData }) {
  const [currentGrade, setCurrentGrade] = useState(user.currentGrade);
  const [targetGrade, setTargetGrade] = useState(user.targetGrade);
  const [examDate, setExamDate] = useState(user.examDate);
  const [msg, setMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setMsg(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("currentGrade", currentGrade);
      fd.append("targetGrade", targetGrade);
      fd.append("examDate", examDate);
      const result = await updateGoals(fd);
      if (result?.error) {
        setMsg({ type: "error", text: result.error });
      } else {
        setMsg({ type: "success", text: "저장되었습니다" });
        setTimeout(() => setMsg(null), 2000);
      }
    });
  };

  const dDay = getDday(examDate);
  const hasChanges =
    currentGrade !== user.currentGrade ||
    targetGrade !== user.targetGrade ||
    examDate !== user.examDate;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 목표 설정 — 3컬럼 그리드 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
        <h3 className="mb-4 font-semibold text-foreground sm:mb-5">목표 설정</h3>
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
          {/* 현재 등급 */}
          <div>
            <label
              htmlFor="current-grade"
              className="mb-1.5 block text-sm text-foreground-secondary"
            >
              현재 OPIc 등급
            </label>
            <select
              id="current-grade"
              value={currentGrade}
              onChange={(e) => setCurrentGrade(e.target.value)}
              className="flex h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              {currentGradeOptions.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* 목표 등급 */}
          <div>
            <label
              htmlFor="target-grade"
              className="mb-1.5 block text-sm text-foreground-secondary"
            >
              목표 OPIc 등급
            </label>
            <select
              id="target-grade"
              value={targetGrade}
              onChange={(e) => setTargetGrade(e.target.value)}
              className="flex h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              {targetGradeOptions.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* 시험 예정일 */}
          <div>
            <label
              htmlFor="exam-date"
              className="mb-1.5 block text-sm text-foreground-secondary"
            >
              시험 예정일
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="exam-date"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full"
              />
              {dDay && (
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                    dDay === "D-Day"
                      ? "bg-accent-100 text-accent-600"
                      : dDay.startsWith("D+")
                        ? "bg-surface-secondary text-foreground-muted"
                        : "bg-primary-50 text-primary-600"
                  }`}
                >
                  {dDay}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 저장 */}
        <div className="mt-5 border-t border-border pt-4">
          <Button
            onClick={handleSave}
            disabled={isPending || !hasChanges}
            size="sm"
            className="w-full"
          >
            {isPending ? "저장 중..." : "목표 저장"}
          </Button>
          {msg && (
            <p
              className={`mt-2 flex items-center justify-center gap-1 text-xs ${
                msg.type === "success" ? "text-green-600" : "text-accent-500"
              }`}
            >
              {msg.type === "success" && <Check size={12} />}
              {msg.text}
            </p>
          )}
        </div>
      </div>

      {/* 목표 요약 카드 */}
      {(currentGrade || targetGrade || examDate) && (
        <div className="rounded-[var(--radius-xl)] border border-primary-200 bg-primary-50/50 p-4 sm:p-6">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
            <Target size={18} className="text-primary-500" />
            나의 목표 요약
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[var(--radius-lg)] bg-white p-3 text-center">
              <p className="text-xs text-foreground-muted">현재 등급</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {currentGrade || "—"}
              </p>
            </div>
            <div className="rounded-[var(--radius-lg)] bg-white p-3 text-center">
              <p className="text-xs text-foreground-muted">목표 등급</p>
              <p className="mt-1 text-lg font-bold text-primary-600">
                {targetGrade || "—"}
              </p>
            </div>
            <div className="rounded-[var(--radius-lg)] bg-white p-3 text-center">
              <p className="text-xs text-foreground-muted">시험까지</p>
              <p className="mt-1 text-lg font-bold text-primary-600">
                {dDay || "—"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 계정 관리 탭 ── */

function AccountTab({ user }: { user: UserData }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || "탈퇴 처리에 실패했습니다.");
        setIsDeleting(false);
        return;
      }

      // 탈퇴 성공 → 서버에서 쿠키 전체 삭제 후 하드 리다이렉트
      await serverSignOut();
    } catch {
      setDeleteError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
      {/* 로그아웃 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 sm:p-6">
        <h3 className="mb-2 font-semibold text-foreground">로그아웃</h3>
        <p className="mb-4 text-sm text-foreground-secondary">
          현재 기기에서 로그아웃합니다. 학습 데이터는 유지됩니다.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            setIsLoggingOut(true);
            serverSignOut();
          }}
          disabled={isLoggingOut}
        >
          <LogOut size={16} className="mr-1.5" />
          {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
        </Button>
      </div>

      {/* 회원 탈퇴 */}
      <div className="rounded-[var(--radius-xl)] border border-accent-200 bg-accent-50/30 p-4 sm:p-6">
        <h3 className="mb-2 font-semibold text-accent-600">회원 탈퇴</h3>
        <p className="mb-4 text-sm text-foreground-secondary">
          모든 학습 기록과 계정이 영구 삭제되며 복구할 수 없습니다.
        </p>

        {!showDeleteConfirm ? (
          <Button
            variant="danger"
            size="sm"
            className="w-full"
            onClick={() => setShowDeleteConfirm(true)}
          >
            회원 탈퇴
          </Button>
        ) : (
          <div className="rounded-[var(--radius-lg)] border border-accent-300 bg-white p-4">
            <p className="text-sm font-medium text-accent-600">
              정말 탈퇴하시겠습니까?
            </p>
            <p className="mt-1 text-xs text-foreground-secondary">
              모든 학습 기록, 결제 내역, 크레딧이 즉시 삭제되며 복구할 수
              없습니다.
            </p>
            {deleteError && (
              <p className="mt-2 text-xs text-accent-500">{deleteError}</p>
            )}
            <div className="mt-3 flex gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? "탈퇴 처리 중..." : "탈퇴하기"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
              >
                취소
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
