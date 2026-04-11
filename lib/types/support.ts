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

// ── 한글 레이블 (따뜻한 소통함 톤) ──
export const CATEGORY_LABELS: Record<SupportCategory, string> = {
  bug: "버그제보",
  suggestion: "기능건의",
  question: "응원/인사",
  refund: "환불",
  account: "계정",
  other: "기타",
};

export const CATEGORY_EMOJI: Record<SupportCategory, string> = {
  bug: "",
  suggestion: "",
  question: "",
  refund: "",
  account: "",
  other: "",
};

export const CATEGORY_COLORS: Record<SupportCategory, string> = {
  bug: "bg-rose-50 text-rose-400",
  suggestion: "bg-blue-50 text-blue-400",
  question: "bg-orange-50 text-orange-400",
  refund: "bg-purple-50 text-purple-400",
  account: "bg-teal-50 text-teal-400",
  other: "bg-slate-100 text-slate-400",
};


// ── DB Row 인터페이스 ──
export interface SupportPost {
  id: number;
  user_id: string;
  category: SupportCategory;
  visibility: SupportVisibility;
  title: string;
  content: string;
  status?: string;
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
