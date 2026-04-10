"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Lock,
  ChevronDown,
  ChevronUp,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { getMyInquiries, getPostDetail } from "@/lib/actions/support";
import { StatusBadge, CategoryBadge } from "../shared/status-badge";
import { CommentSection } from "../shared/comment-section";
import { InquiryForm } from "./inquiry-form";
import type { SupportPost, SupportComment } from "@/lib/types/support";

interface InquiryTabProps {
  initialInquiries: SupportPost[];
  isLoggedIn: boolean;
}

export function InquiryTab({ initialInquiries, isLoggedIn }: InquiryTabProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: inquiries = [] } = useQuery({
    queryKey: ["support-my-inquiries"],
    queryFn: async () => {
      const result = await getMyInquiries();
      return result.data || [];
    },
    initialData: initialInquiries,
    staleTime: 30_000,
    enabled: isLoggedIn,
  });

  // 상세 조회 (확장 시)
  const { data: detail } = useQuery({
    queryKey: ["support-post-detail", expandedId],
    queryFn: async () => {
      if (!expandedId) return null;
      const result = await getPostDetail(expandedId);
      return result.data || null;
    },
    enabled: !!expandedId,
    staleTime: 30_000,
  });

  const handlePostCreated = () => {
    setShowForm(false);
    queryClient.invalidateQueries({ queryKey: ["support-my-inquiries"] });
    toast.success("문의가 등록되었습니다");
  };

  if (!isLoggedIn) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-col items-center py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
            <Lock size={24} className="text-foreground-muted" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground-secondary">
            로그인 후 1:1 문의를 이용할 수 있습니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 안내 + 글쓰기 */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-foreground-muted sm:text-sm">
          환불, 계정 문제 등 비공개 문의를 남길 수 있습니다.
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 sm:text-sm"
        >
          <Plus size={14} />
          문의하기
        </button>
      </div>

      {/* 글쓰기 폼 */}
      {showForm && (
        <InquiryForm
          onSuccess={handlePostCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* 문의 목록 */}
      {inquiries.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex flex-col items-center py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
              <Lock size={24} className="text-foreground-muted" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground-secondary">
              문의 내역이 없습니다
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {inquiries.map((post) => {
            const isExpanded = expandedId === post.id;
            const hasAdminReply = detail?.comments?.some(
              (c) => c.is_admin_reply
            );

            return (
              <div
                key={post.id}
                className="rounded-xl border border-border bg-surface"
              >
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : post.id)
                  }
                  className="flex w-full items-start gap-3 p-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      <CategoryBadge category={post.category} />
                      <StatusBadge status={post.status} />
                      {isExpanded && hasAdminReply && (
                        <span className="flex items-center gap-0.5 rounded-md bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold text-primary-600">
                          <Shield size={10} />
                          답변 완료
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground sm:text-base">
                      {post.title}
                    </h3>
                    <span className="mt-1 text-[10px] text-foreground-muted sm:text-xs">
                      {new Date(post.created_at).toLocaleDateString("ko-KR")}
                    </span>
                  </div>

                  <div className="shrink-0">
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-foreground-muted" />
                    ) : (
                      <ChevronDown
                        size={16}
                        className="text-foreground-muted"
                      />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-4 pb-4 pt-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {detail?.content || post.content}
                    </p>

                    <CommentSection
                      postId={post.id}
                      comments={detail?.comments || []}
                      isLoggedIn={isLoggedIn}
                      onRefresh={() =>
                        queryClient.invalidateQueries({
                          queryKey: ["support-post-detail", post.id],
                        })
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
