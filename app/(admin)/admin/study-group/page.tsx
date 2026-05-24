"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Ban, ArrowLeftRight, Scale, Link, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Users, Youtube, ExternalLink } from "lucide-react";
import {
  getAdminYoutubeChannels, createYoutubeChannel, updateYoutubeChannel, deleteYoutubeChannel,
  getAdminFreetalk, createFreetalk, updateFreetalk, deleteFreetalk,
  getAdminGameCards, createGameCard, updateGameCard, deleteGameCard,
  getAdminPanelMembers, createPanelMember, updatePanelMember, deletePanelMember,
} from "@/lib/actions/admin/study-group";
import type { YoutubeChannelRow, FreetalkRow, GameCardRow, GameCardGameType, TabooCard, WouldYouRatherCard, DebateTopic, StoryStarter, FreeTalkCategory, PanelMember, PanelMemberWithProfile } from "@/lib/types/study-group";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

/* ── 탭 정의 ── */

const tabs = [
  { id: "members", label: "패널 멤버", icon: Users },
  { id: "monday", label: "월요일 설정", icon: Youtube },
  { id: "freetalk", label: "프리토킹", icon: MessageCircle },
  { id: "taboo", label: "금칙어", icon: Ban },
  { id: "wyr", label: "Would You Rather", icon: ArrowLeftRight },
  { id: "debate", label: "찬반토론", icon: Scale },
  { id: "story", label: "이어말하기", icon: Link },
] as const;

type TabId = (typeof tabs)[number]["id"];

/* ── 메인 페이지 ── */

export default function AdminStudyGroupPage() {
  const [activeTab, setActiveTab] = useState<TabId>("monday");

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-foreground">스터디 콘텐츠 관리</h1>

      {/* 탭 */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-border">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
                active ? "text-primary-600" : "text-foreground-muted hover:text-foreground-secondary"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary-500" />}
            </button>
          );
        })}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === "members" && <PanelMembersAdmin />}
      {activeTab === "monday" && <YoutubeChannelsAdmin />}
      {activeTab === "freetalk" && <FreetalkAdmin />}
      {activeTab === "taboo" && <GameCardsAdmin gameType="taboo" />}
      {activeTab === "wyr" && <GameCardsAdmin gameType="would-you-rather" />}
      {activeTab === "debate" && <GameCardsAdmin gameType="debate" />}
      {activeTab === "story" && <GameCardsAdmin gameType="story-chain" />}
    </div>
  );
}

/* ══════════════════════════════════════════
   패널 멤버 관리 (Talklish 화면 표시용 6명)
   ══════════════════════════════════════════ */

const DEFAULT_COLORS = [
  "#C9522D", "#3F5A4A", "#7A5A8C", "#B58634", "#4A6B8C",
  "#8C5A4A", "#5C7A3F", "#3F6E7A", "#A0506B", "#6B5A8C",
  "#8C7A3F", "#7A3F6E", "#3F8C5A", "#6B3F8C", "#8C3F4A",
  "#3F4A8C", "#5A8C3F", "#8C3F7A", "#3F8C7A", "#7A8C3F",
];
const SAMPLE_EMOJIS = [
  "🦊", "🐺", "🦉", "🐻", "🐧",
  "🦝", "🦁", "🐯", "🐮", "🐷",
  "🐨", "🐼", "🐰", "🦌", "🦓",
  "🐹", "🦔", "🦘", "🦦", "🐵",
];

function PanelMembersAdmin() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({ queryKey: ["admin-panel-members"], queryFn: getAdminPanelMembers });
  const [editing, setEditing] = useState<PanelMemberWithProfile | null>(null);
  const [isNew, setIsNew] = useState(false);

  const handleToggle = useCallback(async (item: PanelMember) => {
    await updatePanelMember(item.id, { is_active: !item.is_active });
    qc.invalidateQueries({ queryKey: ["admin-panel-members"] });
  }, [qc]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("이 멤버를 삭제하시겠어요?")) return;
    await deletePanelMember(id);
    qc.invalidateQueries({ queryKey: ["admin-panel-members"] });
  }, [qc]);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary-100 bg-primary-50/30 p-3 text-xs text-primary-700">
        스터디 화면(큰 모니터)에 표시되는 패널 멤버입니다.
        이름만 입력하면 등록되며, 소리담 미가입자(게스트)도 자유롭게 추가할 수 있어요.
        이모지·컬러는 자동 배정됩니다.
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-secondary">총 {items.length}명</p>
        <button
          type="button"
          onClick={() => { setIsNew(true); setEditing({} as PanelMemberWithProfile); }}
          className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
        >
          <Plus size={14} /> 멤버 추가
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex flex-col items-center gap-2 rounded-xl border p-3 ${
              item.is_active ? "border-border bg-surface" : "border-border/50 bg-surface-secondary/50 opacity-60"
            }`}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
              style={{ background: `${item.color}20`, border: `2px solid ${item.color}` }}
            >
              {item.emoji}
            </div>
            <p className="text-sm font-semibold text-foreground text-center break-all">{item.name}</p>
            {item.email ? (
              <p className="text-[10px] text-foreground-muted text-center break-all line-clamp-1" title={item.email}>
                {item.email}
              </p>
            ) : (
              <p className="text-[10px] text-foreground-muted">게스트</p>
            )}
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => handleToggle(item)} className="p-1 text-foreground-muted hover:text-foreground transition-colors" title={item.is_active ? "비활성화" : "활성화"} aria-label={item.is_active ? "비활성화" : "활성화"}>
                {item.is_active ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} />}
              </button>
              <button type="button" onClick={() => { setIsNew(false); setEditing(item); }} className="p-1 text-foreground-muted hover:text-primary-600 transition-colors" title="수정" aria-label="수정"><Pencil size={12} /></button>
              <button type="button" onClick={() => handleDelete(item.id)} className="p-1 text-foreground-muted hover:text-red-600 transition-colors" title="삭제" aria-label="삭제"><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <PanelMemberFormModal
          initial={isNew ? null : editing}
          existingCount={items.length}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin-panel-members"] }); }}
        />
      )}
    </div>
  );
}

function PanelMemberFormModal({
  initial,
  existingCount,
  onClose,
  onSaved,
}: {
  initial: PanelMemberWithProfile | null;
  existingCount: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!initial?.id;
  const fallbackColor = DEFAULT_COLORS[existingCount % DEFAULT_COLORS.length];
  const fallbackEmoji = SAMPLE_EMOJIS[existingCount % SAMPLE_EMOJIS.length];

  const [name, setName] = useState(initial?.name ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? fallbackEmoji);
  const [color, setColor] = useState(initial?.color ?? fallbackColor);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { alert("이름을 입력하세요"); return; }
    setSaving(true);
    const payload = {
      user_id: initial?.user_id ?? null, // 새 멤버는 항상 게스트(NULL)
      name: name.trim(),
      emoji,
      color,
      sort_order: initial?.sort_order ?? existingCount,
      is_active: initial?.is_active ?? true,
    };
    const result = initial?.id
      ? await updatePanelMember(initial.id, payload)
      : await createPanelMember(payload);
    if (!result.success) { alert(result.error); setSaving(false); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20 overflow-y-auto">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl">
        <h3 className="mb-1 text-lg font-bold text-foreground">{isEditing ? "멤버 수정" : "멤버 추가"}</h3>
        <p className="mb-5 text-xs text-foreground-secondary">
          이름만 입력하면 등록됩니다. 이모지·컬러는 자동 배정되며 필요하면 직접 바꿀 수 있어요.
        </p>

        {/* 미리보기 카드 */}
        <div className="mb-5 flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-secondary/40 p-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-3xl"
            style={{ background: `${color}20`, border: `2px solid ${color}` }}
          >
            {emoji}
          </div>
          <p className="text-sm font-semibold text-foreground">{name || "이름"}</p>
          {initial?.email && (
            <p className="text-[11px] text-foreground-muted">{initial.email}</p>
          )}
        </div>

        <div className="space-y-4">
          <Field label="이름" value={name} onChange={setName} placeholder="예: 지수, John" />

          {/* 이모지 선택 — Picker 그리드 + 커스텀 입력 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground-secondary">
              아이콘 <span className="text-foreground-muted">(클릭으로 선택)</span>
            </label>
            <div className="grid grid-cols-10 gap-1.5 rounded-xl border border-border bg-surface-secondary/30 p-2">
              {SAMPLE_EMOJIS.map((e) => {
                const selected = emoji === e;
                return (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    aria-label={`아이콘 ${e}`}
                    aria-pressed={selected ? "true" : "false"}
                    title={`아이콘 ${e}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-all hover:bg-primary-50"
                    style={{
                      background: selected ? `${color}25` : "transparent",
                      border: selected ? `2px solid ${color}` : "2px solid transparent",
                      cursor: "pointer",
                    }}
                  >
                    {e}
                  </button>
                );
              })}
            </div>

            {/* 커스텀 이모지 입력 (선택 사항) */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-foreground-muted shrink-0">직접 입력:</span>
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="🦄"
                aria-label="이모지 직접 입력"
                className="flex-1 rounded-lg border border-border bg-surface px-2 py-1 text-sm text-center focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 컬러 선택 */}
          <div>
            <label htmlFor="member-color-picker" className="mb-1 block text-xs font-medium text-foreground-secondary">컬러</label>
            <div className="flex items-center gap-2">
              <input
                id="member-color-picker"
                type="color"
                title="컬러 선택"
                aria-label="컬러 선택"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-9 cursor-pointer rounded border border-border"
              />
              <input
                aria-label="컬러 HEX 값"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-surface px-2 py-2 font-mono text-xs uppercase text-foreground focus:border-primary-500 focus:outline-none"
              />

              {/* 컬러 프리셋 — DEFAULT_COLORS 첫 10개를 빠른 선택 칩으로 */}
              <div className="hidden flex-wrap gap-1 sm:flex">
                {DEFAULT_COLORS.slice(0, 10).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`컬러 ${c}`}
                    title={c}
                    className="h-6 w-6 rounded-full border-2 transition-all hover:scale-110"
                    style={{
                      background: c,
                      borderColor: color.toLowerCase() === c.toLowerCase() ? "var(--foreground)" : "transparent",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   월요일 설정 — 유튜버 채널 바로가기 관리 (096)
   ══════════════════════════════════════════ */

function YoutubeChannelsAdmin() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({ queryKey: ["admin-youtube-channels"], queryFn: getAdminYoutubeChannels });
  const [editing, setEditing] = useState<YoutubeChannelRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleToggle = useCallback(async (item: YoutubeChannelRow) => {
    await updateYoutubeChannel(item.id, { is_active: !item.is_active });
    qc.invalidateQueries({ queryKey: ["admin-youtube-channels"] });
  }, [qc]);

  const confirmDelete = useCallback(async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await deleteYoutubeChannel(deleteId);
    setDeleting(false);
    if (!res.success) { toast.error(res.error || "삭제에 실패했어요"); return; }
    setDeleteId(null);
    toast.success("채널을 삭제했어요");
    qc.invalidateQueries({ queryKey: ["admin-youtube-channels"] });
  }, [deleteId, qc]);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary-100 bg-primary-50/30 p-3 text-xs text-primary-700">
        월요일 자료 준비(<span className="font-mono">/talklish/manage</span>)에서 바로가기 칩으로 뜨는 유튜버 채널이에요.
        영상 URL을 찾을 때 새 창으로 채널을 바로 열 수 있어요. 자료(에피소드) 생성은 manage 페이지에서 진행합니다.
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-foreground-secondary">총 {items.length}개</p>
        <button type="button" onClick={() => { setIsNew(true); setEditing({} as YoutubeChannelRow); }} className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600 transition-colors">
          <Plus size={14} /> 채널 추가
        </button>
      </div>

      {/* 목록 */}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className={`flex items-center justify-between rounded-lg border p-3 ${item.is_active ? "border-border bg-surface" : "border-border/50 bg-surface-secondary/50 opacity-60"}`}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
              <a href={item.channel_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
                <span className="truncate">{item.channel_url}</span>
                <ExternalLink size={11} className="shrink-0" />
              </a>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button type="button" onClick={() => handleToggle(item)} className="p-1.5 text-foreground-muted hover:text-foreground transition-colors" title={item.is_active ? "비활성화" : "활성화"} aria-label={item.is_active ? "비활성화" : "활성화"}>
                {item.is_active ? <ToggleRight size={18} className="text-green-600" /> : <ToggleLeft size={18} />}
              </button>
              <button type="button" onClick={() => { setIsNew(false); setEditing(item); }} className="p-1.5 text-foreground-muted hover:text-primary-600 transition-colors" title="수정" aria-label="수정"><Pencil size={14} /></button>
              <button type="button" onClick={() => setDeleteId(item.id)} className="p-1.5 text-foreground-muted hover:text-red-600 transition-colors" title="삭제" aria-label="삭제"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* 편집 모달 */}
      {editing && (
        <ChannelFormModal
          initial={isNew ? null : editing}
          existingCount={items.length}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin-youtube-channels"] }); }}
        />
      )}

      {/* 삭제 확인 — 소리담 공용 ConfirmDialog */}
      <ConfirmDialog
        open={!!deleteId}
        title="이 채널을 삭제할까요?"
        description="삭제하면 월요일 자료 준비 페이지의 바로가기에서도 사라져요."
        confirmLabel="삭제"
        variant="danger"
        isLoading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

/* ── 채널 폼 모달 ── */

function ChannelFormModal({ initial, existingCount, onClose, onSaved }: { initial: YoutubeChannelRow | null; existingCount: number; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [channelUrl, setChannelUrl] = useState(initial?.channel_url ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !channelUrl.trim()) { toast.error("채널명과 URL을 입력하세요"); return; }
    setSaving(true);
    const payload = {
      name: name.trim(),
      channel_url: channelUrl.trim(),
      sort_order: initial?.sort_order ?? existingCount,
      is_active: initial?.is_active ?? true,
    };
    const result = initial?.id
      ? await updateYoutubeChannel(initial.id, payload)
      : await createYoutubeChannel(payload);
    if (!result.success) { toast.error(result.error || "저장에 실패했어요"); setSaving(false); return; }
    toast.success(initial?.id ? "채널을 수정했어요" : "채널을 추가했어요");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-bold text-foreground">{initial?.id ? "채널 수정" : "채널 추가"}</h3>
        <div className="space-y-3">
          <Field label="채널명" value={name} onChange={setName} placeholder="예: EnglishPod, BBC Learning English" />
          <Field label="채널 URL" value={channelUrl} onChange={setChannelUrl} placeholder="https://www.youtube.com/@..." />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary transition-colors">취소</button>
          <button type="button" onClick={handleSave} disabled={saving || !name.trim() || !channelUrl.trim()} className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 transition-colors">{saving ? "저장 중..." : "저장"}</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   프리토킹 관리
   ══════════════════════════════════════════ */

const CATEGORY_OPTIONS: { value: FreeTalkCategory; label: string }[] = [
  { value: "daily", label: "일상생활" },
  { value: "opinions", label: "의견 나누기" },
  { value: "hypothetical", label: "만약에..." },
  { value: "culture", label: "한국 문화" },
  { value: "current", label: "시사/트렌드" },
];

function FreetalkAdmin() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({ queryKey: ["admin-freetalk"], queryFn: getAdminFreetalk });
  const [editing, setEditing] = useState<FreetalkRow | null>(null);
  const [isNew, setIsNew] = useState(false);

  const handleToggle = useCallback(async (item: FreetalkRow) => {
    await updateFreetalk(item.id, { is_active: !item.is_active });
    qc.invalidateQueries({ queryKey: ["admin-freetalk"] });
  }, [qc]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("정말 삭제하시겠어요?")) return;
    await deleteFreetalk(id);
    qc.invalidateQueries({ queryKey: ["admin-freetalk"] });
  }, [qc]);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-foreground-secondary">총 {items.length}개</p>
        <button type="button" onClick={() => { setIsNew(true); setEditing({} as FreetalkRow); }} className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600 transition-colors">
          <Plus size={14} /> 추가
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className={`flex items-center justify-between rounded-lg border p-3 ${item.is_active ? "border-border bg-surface" : "border-border/50 bg-surface-secondary/50 opacity-60"}`}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{item.english}</p>
              <p className="text-xs text-foreground-muted">{item.category} · {item.korean}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button type="button" onClick={() => handleToggle(item)} className="p-1.5 text-foreground-muted hover:text-foreground transition-colors" title={item.is_active ? "비활성화" : "활성화"} aria-label={item.is_active ? "비활성화" : "활성화"}>
                {item.is_active ? <ToggleRight size={18} className="text-green-600" /> : <ToggleLeft size={18} />}
              </button>
              <button type="button" onClick={() => { setIsNew(false); setEditing(item); }} className="p-1.5 text-foreground-muted hover:text-primary-600 transition-colors" title="수정" aria-label="수정"><Pencil size={14} /></button>
              <button type="button" onClick={() => handleDelete(item.id)} className="p-1.5 text-foreground-muted hover:text-red-600 transition-colors" title="삭제" aria-label="삭제"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <FreetalkFormModal
          initial={isNew ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin-freetalk"] }); }}
        />
      )}
    </div>
  );
}

function FreetalkFormModal({ initial, onClose, onSaved }: { initial: FreetalkRow | null; onClose: () => void; onSaved: () => void }) {
  const [english, setEnglish] = useState(initial?.english ?? "");
  const [korean, setKorean] = useState(initial?.korean ?? "");
  const [followUp, setFollowUp] = useState(initial?.follow_up ?? "");
  const [category, setCategory] = useState<FreeTalkCategory>(initial?.category ?? "daily");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const payload = { english, korean, follow_up: followUp, category, sort_order: initial?.sort_order ?? 0, is_active: initial?.is_active ?? true };
    const result = initial?.id ? await updateFreetalk(initial.id, payload) : await createFreetalk(payload);
    if (!result.success) { alert(result.error); setSaving(false); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20">
      <div className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-bold text-foreground">{initial?.id ? "주제 수정" : "주제 추가"}</h3>
        <div className="space-y-3">
          <Field label="영어 질문" value={english} onChange={setEnglish} />
          <Field label="한국어 번역" value={korean} onChange={setKorean} />
          <Field label="후속 질문 (영어)" value={followUp} onChange={setFollowUp} />
          <div>
            <label htmlFor="freetalk-category" className="mb-1 block text-xs font-medium text-foreground-secondary">카테고리</label>
            <select id="freetalk-category" aria-label="카테고리" value={category} onChange={(e) => setCategory(e.target.value as FreeTalkCategory)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary transition-colors">취소</button>
          <button type="button" onClick={handleSave} disabled={saving || !english} className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 transition-colors">{saving ? "저장 중..." : "저장"}</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   게임 카드 관리 (공용 — game_type prop)
   ══════════════════════════════════════════ */

const GAME_LABELS: Record<GameCardGameType, string> = {
  "taboo": "금칙어",
  "would-you-rather": "Would You Rather",
  "debate": "찬반토론",
  "story-chain": "이어말하기",
};

function GameCardsAdmin({ gameType }: { gameType: GameCardGameType }) {
  const qc = useQueryClient();
  const qk = ["admin-game-cards", gameType];
  const { data: items = [], isLoading } = useQuery({ queryKey: qk, queryFn: () => getAdminGameCards(gameType) });
  const [editing, setEditing] = useState<GameCardRow | null>(null);
  const [isNew, setIsNew] = useState(false);

  const handleToggle = useCallback(async (item: GameCardRow) => {
    await updateGameCard(item.id, { is_active: !item.is_active });
    qc.invalidateQueries({ queryKey: qk });
  }, [qc, qk]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("정말 삭제하시겠어요?")) return;
    await deleteGameCard(id);
    qc.invalidateQueries({ queryKey: qk });
  }, [qc, qk]);

  // 카드 요약 텍스트
  const cardSummary = (item: GameCardRow) => {
    const d = item.data as unknown;
    switch (gameType) {
      case "taboo": return (d as TabooCard).target;
      case "would-you-rather": return `${(d as WouldYouRatherCard).optionA.substring(0, 30)}...`;
      case "debate": return (d as DebateTopic).topic;
      case "story-chain": return `${(d as StoryStarter).opening.substring(0, 40)}...`;
      default: return JSON.stringify(d).substring(0, 40);
    }
  };

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-foreground-secondary">{GAME_LABELS[gameType]} — 총 {items.length}개</p>
        <button type="button" onClick={() => { setIsNew(true); setEditing({} as GameCardRow); }} className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600 transition-colors">
          <Plus size={14} /> 추가
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className={`flex items-center justify-between rounded-lg border p-3 ${item.is_active ? "border-border bg-surface" : "border-border/50 bg-surface-secondary/50 opacity-60"}`}>
            <p className="text-sm font-medium text-foreground truncate flex-1">{cardSummary(item)}</p>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button type="button" onClick={() => handleToggle(item)} className="p-1.5 text-foreground-muted hover:text-foreground transition-colors" title={item.is_active ? "비활성화" : "활성화"} aria-label={item.is_active ? "비활성화" : "활성화"}>
                {item.is_active ? <ToggleRight size={18} className="text-green-600" /> : <ToggleLeft size={18} />}
              </button>
              <button type="button" onClick={() => { setIsNew(false); setEditing(item); }} className="p-1.5 text-foreground-muted hover:text-primary-600 transition-colors" title="수정" aria-label="수정"><Pencil size={14} /></button>
              <button type="button" onClick={() => handleDelete(item.id)} className="p-1.5 text-foreground-muted hover:text-red-600 transition-colors" title="삭제" aria-label="삭제"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <GameCardFormModal
          gameType={gameType}
          initial={isNew ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: qk }); }}
        />
      )}
    </div>
  );
}

function GameCardFormModal({ gameType, initial, onClose, onSaved }: { gameType: GameCardGameType; initial: GameCardRow | null; onClose: () => void; onSaved: () => void }) {
  const [dataJson, setDataJson] = useState(JSON.stringify(initial?.data ?? getDefaultData(gameType), null, 2));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        game_type: gameType,
        data: JSON.parse(dataJson),
        sort_order: initial?.sort_order ?? 0,
        is_active: initial?.is_active ?? true,
      };
      const result = initial?.id ? await updateGameCard(initial.id, payload) : await createGameCard(payload);
      if (!result.success) { alert(result.error); return; }
      onSaved();
    } catch { alert("JSON 형식 오류를 확인해주세요."); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20">
      <div className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-bold text-foreground">{initial?.id ? "카드 수정" : "카드 추가"} — {GAME_LABELS[gameType]}</h3>
        <div className="space-y-3">
          <p className="text-xs text-foreground-muted">JSON 형식으로 데이터를 입력하세요. 구조: {getDataHint(gameType)}</p>
          <TextareaField label="데이터 (JSON)" value={dataJson} onChange={setDataJson} rows={8} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary transition-colors">취소</button>
          <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 transition-colors">{saving ? "저장 중..." : "저장"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── 공용 UI 컴포넌트 ── */

function Loading() {
  return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>;
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground-secondary">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary-500 focus:outline-none" />
    </label>
  );
}

function TextareaField({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground-secondary">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} aria-label={label} placeholder={label} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-mono text-foreground placeholder:text-foreground-muted focus:border-primary-500 focus:outline-none" />
    </label>
  );
}

function getDefaultData(gameType: GameCardGameType) {
  switch (gameType) {
    case "taboo": return { target: "", forbidden: ["", "", "", "", ""] };
    case "would-you-rather": return { optionA: "", optionB: "" };
    case "debate": return { topic: "", context: "", proPoints: [""], conPoints: [""] };
    case "story-chain": return { opening: "", genre: "" };
  }
}

function getDataHint(gameType: GameCardGameType) {
  switch (gameType) {
    case "taboo": return '{ "target": "단어", "forbidden": ["금지1", "금지2", ...] }';
    case "would-you-rather": return '{ "optionA": "선택지A", "optionB": "선택지B" }';
    case "debate": return '{ "topic": "주제", "context": "배경", "proPoints": [...], "conPoints": [...] }';
    case "story-chain": return '{ "opening": "시작 문장", "genre": "장르" }';
  }
}
