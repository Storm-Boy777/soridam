"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
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
  TrendingUp,
  BarChart3,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile, updateGoals } from "@/lib/actions/auth";
import { serverSignOut } from "@/lib/supabase";

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
  weeklyGoal: string;
};

/* ── 상수 ── */

const tabs = [
  { id: "profile", label: "프로필", icon: User },
  { id: "plan", label: "플랜", icon: CreditCard },
  { id: "goal", label: "목표", icon: Target },
  { id: "history", label: "학습", icon: BarChart3 },
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

const weeklyGoals = [
  { value: "", label: "선택해 주세요" },
  { value: "2", label: "주 2회" },
  { value: "3", label: "주 3회" },
  { value: "5", label: "주 5회" },
  { value: "7", label: "매일" },
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
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  return (
    <div>
      {/* 탭 네비게이션 */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex min-w-max border-b border-border">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:gap-2 sm:px-4 ${
                  active
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-foreground-muted hover:border-border hover:text-foreground-secondary"
                }`}
              >
                <tab.icon size={16} className="hidden sm:block" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="mx-auto max-w-2xl">
        {activeTab === "profile" && <ProfileTab user={user} />}
        {activeTab === "plan" && <PlanTab user={user} />}
        {activeTab === "goal" && <GoalTab user={user} />}
        {activeTab === "history" && <HistoryTab />}
        {activeTab === "account" && <AccountTab user={user} />}
      </div>
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
    <div className="space-y-6">
      {/* 프로필 이미지 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h3 className="mb-4 font-semibold text-foreground">프로필 사진</h3>
        <div className="flex items-center gap-5">
          <div className="relative">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt="프로필"
                width={72}
                height={72}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-600">
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
          <div>
            <p className="text-sm text-foreground-secondary">
              {user.avatarUrl
                ? "소셜 계정 프로필 사진이 표시됩니다."
                : "프로필 사진 업로드 기능은 곧 지원됩니다."}
            </p>
          </div>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h3 className="mb-4 font-semibold text-foreground">기본 정보</h3>
        <div className="space-y-5">
          {/* 이름 */}
          <div>
            <label
              htmlFor="mypage-name"
              className="mb-1.5 block text-sm text-foreground-secondary"
            >
              이름
            </label>
            <div className="flex gap-2">
              <Input
                id="mypage-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="max-w-xs"
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

          {/* 이메일 */}
          <div>
            <p className="mb-1 text-sm text-foreground-secondary">이메일</p>
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-foreground-muted" />
              <p className="text-sm text-foreground">{user.email}</p>
            </div>
          </div>

          {/* 가입 방법 */}
          <div>
            <p className="mb-1 text-sm text-foreground-secondary">가입 방법</p>
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-foreground-muted" />
              <p className="text-sm text-foreground">
                {providerLabel(user.provider)}
              </p>
            </div>
          </div>

          {/* 가입일 */}
          <div>
            <p className="mb-1 text-sm text-foreground-secondary">가입일</p>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-foreground-muted" />
              <p className="text-sm text-foreground">
                {formatDate(user.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 비밀번호 변경 — 이메일 가입자만 */}
      {user.provider !== "google" && user.provider !== "kakao" && (
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
          <h3 className="mb-4 font-semibold text-foreground">비밀번호</h3>
          <p className="mb-3 text-sm text-foreground-secondary">
            비밀번호를 변경하려면 이메일로 재설정 링크를 받으세요.
          </p>
          <Link href="/forgot-password">
            <Button variant="outline" size="sm">
              <KeyRound size={16} className="mr-1.5" />
              비밀번호 변경
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

/* ── 플랜 탭 ── */

function PlanTab({ user }: { user: UserData }) {
  return (
    <div className="space-y-6">
      {/* 현재 플랜 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h3 className="mb-4 font-semibold text-foreground">현재 요금제</h3>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-primary-50 px-4 py-1.5 text-sm font-bold text-primary-600">
            체험
          </span>
          <span className="text-sm text-foreground-muted">무료</span>
        </div>
        <p className="mt-3 text-sm text-foreground-secondary">
          가입일: {formatDate(user.createdAt)}
        </p>
      </div>

      {/* 남은 사용량 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h3 className="mb-4 font-semibold text-foreground">남은 사용량</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[var(--radius-lg)] bg-surface-secondary p-4">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-secondary-600" />
              <p className="text-sm text-foreground-secondary">모의고사</p>
            </div>
            <p className="mt-2 text-xl font-bold text-foreground">
              1<span className="text-sm font-normal text-foreground-muted">회 남음</span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
              <div className="h-full w-full rounded-full bg-secondary-500" />
            </div>
          </div>
          <div className="rounded-[var(--radius-lg)] bg-surface-secondary p-4">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-primary-500" />
              <p className="text-sm text-foreground-secondary">스크립트 생성</p>
            </div>
            <p className="mt-2 text-xl font-bold text-foreground">
              무제한
              <span className="text-sm font-normal text-foreground-muted"> 체험판</span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
              <div className="h-full w-full rounded-full bg-primary-500" />
            </div>
          </div>
        </div>
      </div>

      {/* 업그레이드 CTA */}
      <div className="rounded-[var(--radius-xl)] border border-primary-200 bg-gradient-to-br from-primary-50 to-primary-100/50 p-6">
        <p className="font-semibold text-primary-700">
          더 많은 학습이 필요하신가요?
        </p>
        <p className="mt-1 text-sm text-primary-600/80">
          베이직 플랜(₩9,900/월)으로 업그레이드하면 실전 모의고사 3회 +
          스크립트 15회를 이용할 수 있어요.
        </p>
        <Link href="/pricing" className="mt-4 inline-block">
          <Button size="sm">
            요금제 보기
            <ArrowRight size={14} className="ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* ── 목표 탭 ── */

function GoalTab({ user }: { user: UserData }) {
  const [currentGrade, setCurrentGrade] = useState(user.currentGrade);
  const [targetGrade, setTargetGrade] = useState(user.targetGrade);
  const [examDate, setExamDate] = useState(user.examDate);
  const [weeklyGoal, setWeeklyGoal] = useState(user.weeklyGoal);
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
      fd.append("weeklyGoal", weeklyGoal);
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
    examDate !== user.examDate ||
    weeklyGoal !== user.weeklyGoal;

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h3 className="mb-5 font-semibold text-foreground">목표 설정</h3>
        <div className="space-y-5">
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
              className="flex h-10 w-full max-w-xs rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
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
              className="flex h-10 w-full max-w-xs rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
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
            <div className="flex items-center gap-3">
              <Input
                id="exam-date"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="max-w-xs"
              />
              {dDay && (
                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${
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

          {/* 주간 학습 목표 */}
          <div>
            <label
              htmlFor="weekly-goal"
              className="mb-1.5 block text-sm text-foreground-secondary"
            >
              주간 학습 목표
            </label>
            <select
              id="weekly-goal"
              value={weeklyGoal}
              onChange={(e) => setWeeklyGoal(e.target.value)}
              className="flex h-10 w-full max-w-xs rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              {weeklyGoals.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 저장 */}
        <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
          <Button
            onClick={handleSave}
            disabled={isPending || !hasChanges}
            size="sm"
          >
            {isPending ? "저장 중..." : "목표 저장"}
          </Button>
          {msg && (
            <p
              className={`flex items-center gap-1 text-xs ${
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
      {(currentGrade || targetGrade || examDate || weeklyGoal) && (
        <div className="rounded-[var(--radius-xl)] border border-primary-200 bg-primary-50/50 p-6">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
            <Target size={18} className="text-primary-500" />
            나의 목표 요약
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {currentGrade && (
              <div className="rounded-[var(--radius-lg)] bg-white p-3 text-center">
                <p className="text-xs text-foreground-muted">현재 등급</p>
                <p className="mt-1 text-lg font-bold text-foreground">
                  {currentGrade}
                </p>
              </div>
            )}
            {targetGrade && (
              <div className="rounded-[var(--radius-lg)] bg-white p-3 text-center">
                <p className="text-xs text-foreground-muted">목표 등급</p>
                <p className="mt-1 text-lg font-bold text-primary-600">
                  {targetGrade}
                </p>
              </div>
            )}
            {examDate && (
              <div className="rounded-[var(--radius-lg)] bg-white p-3 text-center">
                <p className="text-xs text-foreground-muted">시험까지</p>
                <p className="mt-1 text-lg font-bold text-primary-600">
                  {dDay}
                </p>
              </div>
            )}
            {weeklyGoal && (
              <div className="rounded-[var(--radius-lg)] bg-white p-3 text-center">
                <p className="text-xs text-foreground-muted">주간 목표</p>
                <p className="mt-1 text-lg font-bold text-primary-600">
                  주 {weeklyGoal}회
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 학습 기록 탭 ── */

function HistoryTab() {
  return (
    <div className="space-y-6">
      {/* 모의고사 이력 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
          <ClipboardList size={18} className="text-secondary-600" />
          모의고사 이력
        </h3>
        <div className="flex flex-col items-center py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
            <ClipboardList size={24} className="text-foreground-muted" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground-secondary">
            아직 모의고사 기록이 없습니다
          </p>
          <p className="mt-1 text-xs text-foreground-muted">
            모의고사를 응시하면 여기에 결과가 표시됩니다
          </p>
        </div>
      </div>

      {/* 점수 추이 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
          <TrendingUp size={18} className="text-primary-500" />
          점수 추이
        </h3>
        <div className="flex flex-col items-center py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
            <BarChart3 size={24} className="text-foreground-muted" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground-secondary">
            학습 데이터가 쌓이면 점수 추이를 확인할 수 있습니다
          </p>
          <p className="mt-1 text-xs text-foreground-muted">
            모의고사 2회 이상 응시 시 그래프가 표시됩니다
          </p>
        </div>
      </div>
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
    <div className="space-y-6">
      {/* 로그아웃 */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h3 className="mb-2 font-semibold text-foreground">로그아웃</h3>
        <p className="mb-4 text-sm text-foreground-secondary">
          현재 기기에서 로그아웃합니다. 학습 데이터는 유지됩니다.
        </p>
        <Button
          variant="outline"
          size="sm"
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
      <div className="rounded-[var(--radius-xl)] border border-accent-200 bg-accent-50/30 p-6">
        <h3 className="mb-2 font-semibold text-accent-600">회원 탈퇴</h3>
        <p className="mb-4 text-sm text-foreground-secondary">
          탈퇴 시 모든 학습 기록과 계정 정보가 영구적으로 삭제됩니다. 이 작업은
          되돌릴 수 없습니다.
        </p>

        {!showDeleteConfirm ? (
          <Button
            variant="danger"
            size="sm"
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
