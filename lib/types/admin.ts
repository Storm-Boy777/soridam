// 관리자 시스템 타입 정의

// ── 대시보드 ──

export interface AdminDashboardStats {
  totalUsers: number;
  dauToday: number;
  totalRevenue: number;
  pendingEvals: number;
}

export interface RecentActivity {
  id: string;
  type: "signup" | "order" | "mock_exam" | "review";
  description: string;
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
  plan_mock_exam_credits: number;
  plan_script_credits: number;
  mock_exam_credits: number;
  script_credits: number;
  current_plan: string;
}

export interface CreditAdjustParams {
  userId: string;
  creditType: "mock_exam_credits" | "script_credits" | "plan_mock_exam_credits" | "plan_script_credits";
  amount: number; // +/- 값
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
  pg_provider: string | null;
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
  plan: "free" | "basic" | "premium";
  mockExamCredits: number;
  scriptCredits: number;
  expiresInMonths: number;
  reason: string;
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

// ── 튜터링 모니터링 ──

export interface AdminTutoringSession {
  id: string;
  user_id: string;
  user_email: string;
  mock_test_session_id: string | null;
  target_level: string | null;
  current_level: string | null;
  status: string;
  total_prescriptions: number;
  completed_prescriptions: number;
  created_at: string;
  last_activity_at: string | null;
}

export interface AdminTutoringStats {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  totalPrescriptions: number;
  completedPrescriptions: number;
  totalTrainings: number;
  levelDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  questionTypeDistribution: Record<string, number>;
}

export interface AdminTutoringDetail {
  session: AdminTutoringSession;
  prescriptions: Array<{
    id: string;
    priority: number;
    question_type: string;
    weakness_tags: string[];
    status: string;
    training_count: number;
    best_score: number | null;
  }>;
  recentTrainings: Array<{
    id: string;
    prescription_id: string;
    session_type: string;
    question_type: string;
    overall_score: number | null;
    screens_completed: number;
    duration_seconds: number | null;
    started_at: string;
    completed_at: string | null;
  }>;
}

// ── 사용자 상세 ──

export interface AdminUserDetail {
  user: AdminUser;
  summary: {
    totalMockExams: number;
    completedMockExams: number;
    totalScripts: number;
    confirmedScripts: number;
    totalTutoringSessions: number;
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
    target_level: string | null;
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
  recentTutoring: Array<{
    id: string;
    target_level: string | null;
    status: string;
    total_prescriptions: number;
    completed_prescriptions: number;
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
  tutoring: number;
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
  tutoringUsers: number;
  mockExamRate: number;
  scriptRate: number;
  tutoringRate: number;
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
