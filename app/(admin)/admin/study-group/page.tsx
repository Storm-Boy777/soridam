"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Headphones, MessageCircle, Ban, ArrowLeftRight, Scale, Link, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Users, Search, Sparkles, Loader2, Youtube } from "lucide-react";
import { createClient } from "@/lib/supabase";
import {
  getAdminPodcasts, createPodcast, updatePodcast, deletePodcast,
  getAdminFreetalk, createFreetalk, updateFreetalk, deleteFreetalk,
  getAdminGameCards, createGameCard, updateGameCard, deleteGameCard,
  getAdminPanelMembers, createPanelMember, updatePanelMember, deletePanelMember,
} from "@/lib/actions/admin/study-group";
import type { PodcastRow, FreetalkRow, GameCardRow, GameCardGameType, TabooCard, WouldYouRatherCard, DebateTopic, StoryStarter, FreeTalkCategory, PanelMember, PanelMemberWithProfile } from "@/lib/types/study-group";

/* ── 탭 정의 ── */

const tabs = [
  { id: "members", label: "패널 멤버", icon: Users },
  { id: "podcasts", label: "팟캐스트", icon: Headphones },
  { id: "freetalk", label: "프리토킹", icon: MessageCircle },
  { id: "taboo", label: "금칙어", icon: Ban },
  { id: "wyr", label: "Would You Rather", icon: ArrowLeftRight },
  { id: "debate", label: "찬반토론", icon: Scale },
  { id: "story", label: "이어말하기", icon: Link },
] as const;

type TabId = (typeof tabs)[number]["id"];

/* ── 메인 페이지 ── */

export default function AdminStudyGroupPage() {
  const [activeTab, setActiveTab] = useState<TabId>("podcasts");

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
      {activeTab === "podcasts" && <PodcastsAdmin />}
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
   팟캐스트 관리
   ══════════════════════════════════════════ */

function PodcastsAdmin() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({ queryKey: ["admin-podcasts"], queryFn: getAdminPodcasts });
  const [editing, setEditing] = useState<PodcastRow | null>(null);
  const [isNew, setIsNew] = useState(false);

  const handleToggle = useCallback(async (item: PodcastRow) => {
    await updatePodcast(item.id, { is_active: !item.is_active });
    qc.invalidateQueries({ queryKey: ["admin-podcasts"] });
  }, [qc]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("정말 삭제하시겠어요?")) return;
    await deletePodcast(id);
    qc.invalidateQueries({ queryKey: ["admin-podcasts"] });
  }, [qc]);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-foreground-secondary">총 {items.length}개</p>
        <button type="button" onClick={() => { setIsNew(true); setEditing({} as PodcastRow); }} className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600 transition-colors">
          <Plus size={14} /> 추가
        </button>
      </div>

      {/* 목록 */}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className={`flex items-center justify-between rounded-lg border p-3 ${item.is_active ? "border-border bg-surface" : "border-border/50 bg-surface-secondary/50 opacity-60"}`}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
              <p className="text-xs text-foreground-muted">{item.source} · {item.duration} · {item.difficulty} · {item.topic}</p>
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

      {/* 편집 모달 */}
      {editing && (
        <PodcastFormModal
          initial={isNew ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin-podcasts"] }); }}
        />
      )}
    </div>
  );
}

/* ── 팟캐스트 폼 모달 ── */

function PodcastFormModal({ initial, onClose, onSaved }: { initial: PodcastRow | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [duration, setDuration] = useState(initial?.duration ?? "");
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? "intermediate");
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [warmupQuestion, setWarmupQuestion] = useState(initial?.warmup_question ?? "");
  const [listeningMission, setListeningMission] = useState(initial?.listening_mission ?? "");
  const [dialogueSegment, setDialogueSegment] = useState(
    JSON.stringify(initial?.dialogue_segment ?? null, null, 2)
  );
  const [dialogueLines, setDialogueLines] = useState<unknown[]>(
    initial?.dialogue_lines ?? []
  );
  const [keyExpressions, setKeyExpressions] = useState(
    JSON.stringify(initial?.key_expressions ?? [], null, 2)
  );
  const [comprehensionQuestions, setComprehensionQuestions] = useState(
    JSON.stringify(initial?.comprehension_questions ?? [], null, 2)
  );
  const [discussionQuestions, setDiscussionQuestions] = useState(
    JSON.stringify(initial?.discussion_questions ?? [], null, 2)
  );
  const [todaysPicks, setTodaysPicks] = useState(
    JSON.stringify(initial?.todays_picks ?? [], null, 2)
  );
  const [saving, setSaving] = useState(false);

  // 자동화 영역 상태
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [metaError, setMetaError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [genNotice, setGenNotice] = useState("");

  /** YouTube URL → oEmbed로 title/source 자동 채움 */
  const handleFetchMeta = async () => {
    setMetaError("");
    if (!url.trim()) { setMetaError("YouTube URL을 입력하세요"); return; }
    setFetchingMeta(true);
    try {
      const u = `https://www.youtube.com/oembed?url=${encodeURIComponent(url.trim())}&format=json`;
      const r = await fetch(u);
      if (!r.ok) {
        setMetaError(r.status === 404 ? "YouTube 영상을 찾을 수 없습니다" : `oEmbed 에러 (${r.status})`);
        return;
      }
      const data = await r.json();
      if (data.title && !title) setTitle(data.title);
      if (data.author_name && !source) setSource(data.author_name);
    } catch {
      setMetaError("메타 정보 가져오기 실패");
    } finally {
      setFetchingMeta(false);
    }
  };

  /** AI로 자료 자동 생성 — YouTube URL만 있으면 자막은 Supadata가 자동 추출 */
  const handleAIGenerate = async () => {
    setGenError("");
    setGenNotice("");
    if (!url.trim()) {
      setGenError("YouTube URL을 입력해주세요");
      return;
    }
    setGenerating(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("study-podcast-generate", {
        body: {
          youtubeUrl: url.trim(),
          youtubeTitle: title || undefined,
          channelName: source || undefined,
          currentDifficulty: difficulty || undefined,
          currentTopic: topic || undefined,
        },
      });
      if (error || !data?.success) {
        setGenError(data?.error || error?.message || "AI 생성 실패");
        return;
      }
      const r = data.data as {
        description: string;
        warmup_question: string;
        listening_mission: string;
        dialogue_segment: { start_sec: number; end_sec: number } | null;
        dialogue_lines: { start_ms: number; end_ms: number; text: string }[];
        key_expressions: unknown[];
        comprehension_questions: string[];
        discussion_questions: string[];
        todays_picks: string[];
        difficulty: "beginner" | "intermediate" | "advanced";
        topic: string;
      };
      setDescription(r.description);
      setWarmupQuestion(r.warmup_question);
      setListeningMission(r.listening_mission);
      setDialogueSegment(JSON.stringify(r.dialogue_segment, null, 2));
      setDialogueLines(r.dialogue_lines ?? []);
      setKeyExpressions(JSON.stringify(r.key_expressions, null, 2));
      setComprehensionQuestions(JSON.stringify(r.comprehension_questions, null, 2));
      setDiscussionQuestions(JSON.stringify(r.discussion_questions, null, 2));
      setTodaysPicks(JSON.stringify(r.todays_picks, null, 2));
      if (!topic && r.topic) setTopic(r.topic);
      if (r.difficulty) setDifficulty(r.difficulty);
      const tokens = data.meta?.tokens?.total_tokens;
      const segs = data.meta?.transcript_segments;
      const lineCount = r.dialogue_lines?.length ?? 0;
      setGenNotice(
        `✓ AI 생성 완료${segs ? ` · 자막 ${segs}줄` : ""}${
          lineCount ? ` · 가라오케 라인 ${lineCount}` : ""
        }${tokens ? ` · ${tokens} 토큰` : ""}`
      );
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "AI 호출 중 오류");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        title, source, url, duration, difficulty: difficulty as PodcastRow["difficulty"], topic, description,
        warmup_question: warmupQuestion,
        listening_mission: listeningMission,
        dialogue_segment: JSON.parse(dialogueSegment),
        dialogue_lines: dialogueLines as PodcastRow["dialogue_lines"],
        key_expressions: JSON.parse(keyExpressions),
        comprehension_questions: JSON.parse(comprehensionQuestions),
        discussion_questions: JSON.parse(discussionQuestions),
        todays_picks: JSON.parse(todaysPicks),
        dialogue_title: initial?.dialogue_title ?? null,
        dialogue_script: initial?.dialogue_script ?? null,
        dialogue_timestamps: initial?.dialogue_timestamps ?? [],
        roleplay: initial?.roleplay ?? null,
        audio_url: initial?.audio_url ?? null,
        sort_order: initial?.sort_order ?? 0,
        is_active: initial?.is_active ?? true,
      };
      const result = initial?.id
        ? await updatePodcast(initial.id, payload)
        : await createPodcast(payload);
      if (!result.success) { alert(result.error); return; }
      onSaved();
    } catch { alert("JSON 형식 오류를 확인해주세요."); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-10 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-xl bg-surface p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-bold text-foreground">{initial?.id ? "팟캐스트 수정" : "팟캐스트 추가"}</h3>

        {/* ─── 자동화 영역 (신규 등록 시에만) ─── */}
        {!initial?.id && (
          <div className="mb-5 rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-primary-500" />
              <p className="text-sm font-semibold text-primary-700">자동 생성</p>
              <span className="text-[10px] text-primary-600">YouTube URL만 있으면 됩니다 — 자막은 자동 추출</span>
            </div>

            {/* YouTube URL + oEmbed */}
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-foreground-secondary">
                <Youtube size={12} /> YouTube URL
              </label>
              <div className="flex gap-2">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://youtu.be/..."
                  className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleFetchMeta}
                  disabled={fetchingMeta || !url.trim()}
                  className="flex items-center gap-1 rounded-lg bg-foreground px-3 py-2 text-xs font-medium text-white hover:bg-foreground/90 disabled:opacity-50 transition-colors"
                >
                  {fetchingMeta ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                  메타 채움
                </button>
              </div>
              {metaError && <p className="mt-1 text-[11px] text-accent-500">{metaError}</p>}
              {(title || source) && !metaError && (
                <p className="mt-1 text-[11px] text-foreground-secondary">
                  ✓ {title} <span className="text-foreground-muted">· {source}</span>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleAIGenerate}
              disabled={generating || !url.trim()}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> 자막 추출 + GPT 생성 중… (10~30초)
                </>
              ) : (
                <>
                  <Sparkles size={14} /> AI로 자료 자동 생성
                </>
              )}
            </button>

            {genError && <p className="text-[11px] text-accent-500">{genError}</p>}
            {genNotice && <p className="text-[11px] text-green-600">{genNotice}</p>}
          </div>
        )}

        {/* ─── 기본 폼 (수동 편집 / AI 결과 확인 가능) ─── */}
        <div className="space-y-3">
          <Field label="제목" value={title} onChange={setTitle} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="소스 (채널명)" value={source} onChange={setSource} placeholder="EnglishPod" />
            <Field label="URL" value={url} onChange={setUrl} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="시간" value={duration} onChange={setDuration} placeholder="18 min" />
            <div>
              <label htmlFor="podcast-difficulty" className="mb-1 block text-xs font-medium text-foreground-secondary">난이도</label>
              <select id="podcast-difficulty" aria-label="난이도" value={difficulty} onChange={(e) => setDifficulty(e.target.value as "beginner" | "intermediate" | "advanced")} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                <option value="beginner">초급</option>
                <option value="intermediate">중급</option>
                <option value="advanced">고급</option>
              </select>
            </div>
            <Field label="토픽" value={topic} onChange={setTopic} placeholder="여행" />
          </div>
          <Field label="설명" value={description} onChange={setDescription} />
          <Field label="워밍업 질문" value={warmupQuestion} onChange={setWarmupQuestion} />
          <Field label="1차 청취 미션" value={listeningMission} onChange={setListeningMission} />
          <TextareaField label="대화 1차 구간 (JSON · { start_sec, end_sec })" value={dialogueSegment} onChange={setDialogueSegment} rows={3} />
          <TextareaField label="어휘 훈련 카드 (JSON)" value={keyExpressions} onChange={setKeyExpressions} rows={10} />
          <TextareaField label="오늘의 표현 후보 (JSON)" value={todaysPicks} onChange={setTodaysPicks} rows={3} />
          <TextareaField label="이해도 질문 (JSON)" value={comprehensionQuestions} onChange={setComprehensionQuestions} rows={4} />
          <TextareaField label="토론 질문 (JSON)" value={discussionQuestions} onChange={setDiscussionQuestions} rows={4} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary transition-colors">취소</button>
          <button type="button" onClick={handleSave} disabled={saving || !title} className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 transition-colors">{saving ? "저장 중..." : "저장"}</button>
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
