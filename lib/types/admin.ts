// 관리자 시스템 타입 정의

// ── 대시보드 ──

export interface AdminDashboardStats {
  totalUsers: number;
  todayLearners: number;
  monthlyAICostUsd: number;
  creditBalanceCents: number;
}

export interface RecentActivity {
  id: string;
  type: "signup" | "order" | "mock_exam" | "review";
  description: string;
  userName: string;
  created_at: string;
}

// ── 사용자 관리 ──

export interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  current_grade: string | null;
  target_grade: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  // user_credits 조인
  current_plan: string;
  // polar_balances 조인
  balance_cents: number;
}

export interface CreditAdjustParams {
  userId: string;
  amountCents: number; // +/- 센트 단위 (예: 500 = $5.00)
  reason: string;
}

// ── 결제 관리 ──

export interface AdminOrder {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  product_name: string;
  product_id: string;
  amount: number;
  status: string;
  payment_id: string | null;
  payment_provider: string | null;
  pg_tx_id: string | null;
  pay_method: string | null;
  paid_at: string | null;
  receipt_url: string | null;
  created_at: string;
}

export interface RevenueStats {
  totalRevenue: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  monthGrowth: number;
  productDistribution: Array<{
    productId: string;
    productName: string;
    count: number;
    revenue: number;
  }>;
}

// ── 플랜 변경 ──

export interface PlanChangeParams {
  userId: string;
  plan: "free" | "beta";
  balanceCents: number;
  expiresInMonths: number;
  reason: string;
}

// ── 베타 관리 ──

export interface BetaUser {
  application_id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  granted_cents: number;
  balance_cents: number;
  plan_expires_at: string | null;
  memo: string | null;
  granted_at: string;
}

export interface BetaStats {
  active: number;
  revoked: number;
  total: number;
}

export interface UserSearchResult {
  user_id: string;
  email: string;
  display_name: string | null;
  current_plan: string;
  is_beta_active: boolean;
}

// ── 감사 로그 ──

export interface AuditLogEntry {
  id: number;
  admin_id: string;
  admin_email?: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

// ── 콘텐츠 관리 ──

export interface AdminPromptTemplate {
  id: string;
  name: string;
  content: string;
  updated_at: string;
}

// ── 모의고사 모니터링 ──

export interface AdminMockSession {
  id: string;
  user_id: string;
  user_email: string;
  mode: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  eval_progress: string; // 'pending' | 'processing' | ... | 'complete'
  final_level: string | null;
}

export interface MockExamStats {
  totalSessions: number;
  completedSessions: number;
  pendingEvals: number;
  failedEvals: number;
  avgGrade: string | null;
  // 확장 통계
  levelDistribution: Record<string, number>;
  modeDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
}

// ── 사용자 상세 ──

export interface AdminUserDetail {
  user: AdminUser;
  summary: {
    totalMockExams: number;
    completedMockExams: number;
    totalScripts: number;
    confirmedScripts: number;
    totalOrders: number;
    totalSpent: number;
  };
  recentMockExams: Array<{
    session_id: string;
    mode: string;
    status: string;
    final_level: string | null;
    started_at: string;
  }>;
  recentScripts: Array<{
    id: string;
    question_korean: string | null;
    target_grade: string | null;
    question_type: string | null;
    status: string;
    created_at: string;
  }>;
  recentOrders: Array<{
    id: string;
    product_name: string;
    amount: number;
    status: string;
    created_at: string;
  }>;
}

// ── 대시보드 추이 ──

export interface DailyTrend {
  date: string;
  signups: number;
  revenue: number;
  mockExams: number;
  scripts: number;
}

// ── 전환율 지표 ──

export interface ConversionMetrics {
  totalUsers: number;
  paidUsers: number;
  planUsers: number;
  conversionRate: number;
  planRate: number;
  avgOrderValue: number;
  mockExamUsers: number;
  scriptUsers: number;
  mockExamRate: number;
  scriptRate: number;
}

// ── 튜터링 모니터링 ──

export interface AdminTutoringSession {
  id: string;
  user_id: string;
  user_email: string;
  status: string;
  current_stable_level: string | null;
  final_target_level: string | null;
  created_at: string;
  completed_at: string | null;
  focus_count: number;
  graduated_count: number;
  tokens_used: number;
}

export interface TutoringStats {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  diagnosingSessions: number;
  avgTokensUsed: number;
  focusGraduationRate: number; // graduated / total focuses
  statusDistribution: Record<string, number>;
  levelDistribution: Record<string, number>;
}

export interface AdminTutoringDetail {
  session: AdminTutoringSession;
  focuses: Array<{
    id: string;
    label: string;
    focus_code: string;
    priority_rank: number;
    status: string;
    drill_pass_count: number;
    retest_pass_count: number;
  }>;
  drills: Array<{
    id: string;
    focus_id: string;
    question_number: number;
    question_english: string;
    status: string;
    attempt_count: number;
  }>;
  retests: Array<{
    id: string;
    focus_id: string;
    overall_result: string | null;
    created_at: string;
  }>;
}

// ── 공통 ──

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  filter?: string;
}
