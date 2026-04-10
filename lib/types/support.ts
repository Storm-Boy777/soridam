// ── 카테고리 ──
export const SUPPORT_CATEGORIES = [
  "bug",
  "suggestion",
  "question",
  "refund",
  "account",
  "other",
] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const PUBLIC_CATEGORIES: SupportCategory[] = [
  "bug",
  "suggestion",
  "question",
];
export const PRIVATE_CATEGORIES: SupportCategory[] = [
  "refund",
  "account",
  "other",
];

// ── 상태 ──
export const SUPPORT_STATUSES = [
  "open",
  "in_progress",
  "resolved",
  "closed",
] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export type SupportVisibility = "public" | "private";

// ── 한글 레이블 ──
export const CATEGORY_LABELS: Record<SupportCategory, string> = {
  bug: "버그",
  suggestion: "건의",
  question: "질문",
  refund: "환불",
  account: "계정",
  other: "기타",
};

export const CATEGORY_EMOJI: Record<SupportCategory, string> = {
  bug: "🐛",
  suggestion: "💡",
  question: "❓",
  refund: "💳",
  account: "👤",
  other: "📩",
};

export const CATEGORY_COLORS: Record<SupportCategory, string> = {
  bug: "bg-red-100 text-red-700",
  suggestion: "bg-amber-100 text-amber-700",
  question: "bg-blue-100 text-blue-700",
  refund: "bg-purple-100 text-purple-700",
  account: "bg-teal-100 text-teal-700",
  other: "bg-gray-100 text-gray-600",
};

export const STATUS_LABELS: Record<SupportStatus, string> = {
  open: "대기",
  in_progress: "처리중",
  resolved: "해결",
  closed: "종료",
};

export const STATUS_COLORS: Record<SupportStatus, string> = {
  open: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

// ── DB Row 인터페이스 ──
export interface SupportPost {
  id: number;
  user_id: string;
  category: SupportCategory;
  visibility: SupportVisibility;
  title: string;
  content: string;
  status: SupportStatus;
  is_pinned: boolean;
  vote_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  // JOIN 필드
  profiles?: { display_name: string | null };
}

export interface SupportComment {
  id: number;
  post_id: number;
  user_id: string;
  content: string;
  is_admin_reply: boolean;
  created_at: string;
  updated_at: string;
  // JOIN 필드
  profiles?: { display_name: string | null };
}

export interface SupportVote {
  id: number;
  post_id: number;
  user_id: string;
}

// ── 정렬 옵션 ──
export type FeedbackSort = "latest" | "votes";
