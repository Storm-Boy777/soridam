"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Megaphone, Plus, Pencil, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "@/lib/actions/admin/announcements";
import type { Announcement } from "@/lib/actions/admin/announcements";

const TYPE_OPTIONS = [
  { value: "notice", label: "공지" },
  { value: "maintenance", label: "점검" },
  { value: "event", label: "이벤트" },
  { value: "update", label: "업데이트" },
];

const AUDIENCE_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "free", label: "무료 회원" },
  { value: "paid", label: "유료 회원" },
];

const TYPE_COLORS: Record<string, string> = {
  notice: "bg-blue-100 text-blue-700",
  maintenance: "bg-red-100 text-red-700",
  event: "bg-green-100 text-green-700",
  update: "bg-purple-100 text-purple-700",
};

export default function AdminAnnouncementsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: getAnnouncements,
    staleTime: 30_000,
  });

  // 토글 활성/비활성
  const handleToggle = async (id: string, isActive: boolean) => {
    const result = await updateAnnouncement(id, { is_active: !isActive });
    if (result.success) {
      toast.success(isActive ? "비활성화되었습니다" : "활성화되었습니다");
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
    } else {
      toast.error(result.error || "변경 실패");
    }
  };

  // 삭제
  const handleDelete = async (id: string) => {
    if (!confirm("이 공지사항을 삭제하시겠습니까?")) return;
    const result = await deleteAnnouncement(id);
    if (result.success) {
      toast.success("삭제되었습니다");
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
    } else {
      toast.error(result.error || "삭제 실패");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary-500" />
          <h1 className="text-xl font-bold text-foreground">공지사항 관리</h1>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowForm(true); }}
          className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
        >
          <Plus size={14} />
          새 공지
        </button>
      </div>

      {/* 작성/수정 폼 */}
      {showForm && (
        <AnnouncementForm
          initial={editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditTarget(null);
            queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
          }}
        />
      )}

      {/* 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
        </div>
      ) : announcements.length === 0 ? (
        <p className="py-12 text-center text-sm text-foreground-muted">공지사항이 없습니다</p>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a.id}
              className={`rounded-xl border bg-surface p-4 transition-opacity ${a.is_active ? "border-border" : "border-border/50 opacity-50"}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[a.type] || TYPE_COLORS.notice}`}>
                      {TYPE_OPTIONS.find((t) => t.value === a.type)?.label || a.type}
                    </span>
                    <span className="text-xs text-foreground-muted">
                      {AUDIENCE_OPTIONS.find((o) => o.value === a.target_audience)?.label || a.target_audience}
                    </span>
                    {!a.is_active && (
                      <span className="rounded-md bg-surface-secondary px-2 py-0.5 text-xs text-foreground-muted">비활성</span>
                    )}
                  </div>
                  <h3 className="mt-1.5 text-sm font-semibold text-foreground">{a.title}</h3>
                  <p className="mt-1 text-xs text-foreground-secondary line-clamp-2">{a.content}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-foreground-muted">
                    <span>{new Date(a.created_at).toLocaleDateString("ko-KR")}</span>
                    {a.end_at && <span>~ {new Date(a.end_at).toLocaleDateString("ko-KR")}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => handleToggle(a.id, a.is_active)}
                    className="rounded-md p-1.5 text-foreground-muted hover:bg-surface-secondary"
                    title={a.is_active ? "비활성화" : "활성화"}
                  >
                    {a.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    onClick={() => { setEditTarget(a); setShowForm(true); }}
                    className="rounded-md p-1.5 text-foreground-muted hover:bg-surface-secondary"
                    title="수정"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="rounded-md p-1.5 text-foreground-muted hover:bg-red-50 hover:text-red-500"
                    title="삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── 공지사항 폼 ── */

function AnnouncementForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: Announcement | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [content, setContent] = useState(initial?.content || "");
  const [type, setType] = useState(initial?.type || "notice");
  const [audience, setAudience] = useState(initial?.target_audience || "all");
  const [endAt, setEndAt] = useState(initial?.end_at?.split("T")[0] || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("제목과 내용을 입력해주세요");
      return;
    }
    setSaving(true);
    try {
      const result = initial
        ? await updateAnnouncement(initial.id, {
            title,
            content,
            type,
            target_audience: audience,
            end_at: endAt ? new Date(endAt).toISOString() : null,
          })
        : await createAnnouncement({
            title,
            content,
            type,
            target_audience: audience,
            end_at: endAt ? new Date(endAt).toISOString() : undefined,
          });

      if (result.success) {
        toast.success(initial ? "수정되었습니다" : "생성되었습니다");
        onSaved();
      } else {
        toast.error(result.error || "저장 실패");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50/30 p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        {initial ? "공지사항 수정" : "새 공지사항"}
      </h3>
      <div className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용"
          rows={4}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          >
            {AUDIENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-foreground-muted">종료일</span>
            <input
              type="date"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground-secondary hover:bg-surface-secondary"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg bg-primary-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? "저장 중..." : initial ? "수정" : "생성"}
          </button>
        </div>
      </div>
    </div>
  );
}
