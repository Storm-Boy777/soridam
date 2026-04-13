"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, RotateCcw, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { getPromptHistory } from "@/lib/actions/admin/content";

interface PromptEditorProps {
  id: string;
  name: string;
  initialContent: string;
  onSave: (id: string, content: string) => Promise<{ success: boolean; error?: string }>;
  showHistory?: boolean;
}

export function PromptEditor({ id, name, initialContent, onSave, showHistory = true }: PromptEditorProps) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const hasChanges = content !== initialContent;

  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: history } = useQuery({
    queryKey: ["prompt-history", id],
    queryFn: () => getPromptHistory(id),
    staleTime: 5 * 60 * 1000,
    enabled: historyOpen && showHistory,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await onSave(id, content);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        // 히스토리 캐시 갱신
        queryClient.invalidateQueries({ queryKey: ["prompt-history", id] });
      } else {
        alert(result.error || "저장 실패");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-semibold text-foreground">{name}</h3>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={() => setContent(initialContent)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-foreground-muted hover:bg-surface-secondary"
            >
              <RotateCcw size={12} />
              되돌리기
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex items-center gap-1 rounded-md bg-primary-500 px-3 py-1 text-xs font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            <Save size={12} />
            {saving ? "저장 중..." : saved ? "저장됨!" : "저장"}
          </button>
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={12}
        className="w-full resize-y bg-transparent p-4 font-mono text-xs text-foreground outline-none"
        spellCheck={false}
      />
      {/* 변경 이력 */}
      {showHistory && (
        <div className="border-t border-border">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex w-full items-center justify-between px-4 py-2 text-xs text-foreground-muted hover:bg-surface-secondary"
          >
            <span className="flex items-center gap-1">
              <Clock size={12} />
              변경 이력
            </span>
            {historyOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {historyOpen && (
            <div className="border-t border-border/50 px-4 py-2">
              {!history || history.length === 0 ? (
                <p className="py-2 text-center text-xs text-foreground-muted">변경 이력이 없습니다</p>
              ) : (
                <div className="space-y-1.5">
                  {history.map((h) => (
                    <div key={h.id} className="flex items-center justify-between text-xs">
                      <span className="text-foreground-secondary">
                        {new Date(h.changed_at).toLocaleString("ko-KR", {
                          month: "short",
                          day: "numeric",
                          hour12: false, hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="text-foreground-muted">{h.admin_email}</span>
                      {/* content_length_before/after (기존 감사 로그) 또는 old_length/new_length 지원 */}
                      {(h.details.content_length_before != null || h.details.old_length != null) &&
                       (h.details.content_length_after != null || h.details.new_length != null) && (
                        <span className="text-foreground-muted">
                          {String(h.details.content_length_before ?? h.details.old_length)}자 &rarr; {String(h.details.content_length_after ?? h.details.new_length)}자
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
