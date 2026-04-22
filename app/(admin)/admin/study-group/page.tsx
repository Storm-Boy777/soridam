"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Headphones, MessageCircle, Ban, ArrowLeftRight, Scale, Link, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import {
  getAdminPodcasts, createPodcast, updatePodcast, deletePodcast,
  getAdminFreetalk, createFreetalk, updateFreetalk, deleteFreetalk,
  getAdminGameCards, createGameCard, updateGameCard, deleteGameCard,
} from "@/lib/actions/admin/study-group";
import type { PodcastRow, FreetalkRow, GameCardRow, GameCardGameType, TabooCard, WouldYouRatherCard, DebateTopic, StoryStarter, FreeTalkCategory } from "@/lib/types/study-group";

/* ── 탭 정의 ── */

const tabs = [
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
        <button onClick={() => { setIsNew(true); setEditing({} as PodcastRow); }} className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600 transition-colors">
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
              <button onClick={() => handleToggle(item)} className="p-1.5 text-foreground-muted hover:text-foreground transition-colors" title={item.is_active ? "비활성화" : "활성화"}>
                {item.is_active ? <ToggleRight size={18} className="text-green-600" /> : <ToggleLeft size={18} />}
              </button>
              <button onClick={() => { setIsNew(false); setEditing(item); }} className="p-1.5 text-foreground-muted hover:text-primary-600 transition-colors"><Pencil size={14} /></button>
              <button onClick={() => handleDelete(item.id)} className="p-1.5 text-foreground-muted hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
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
  const [keyExpressions, setKeyExpressions] = useState(JSON.stringify(initial?.key_expressions ?? [], null, 2));
  const [comprehensionQuestions, setComprehensionQuestions] = useState(JSON.stringify(initial?.comprehension_questions ?? [], null, 2));
  const [discussionQuestions, setDiscussionQuestions] = useState(JSON.stringify(initial?.discussion_questions ?? [], null, 2));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        title, source, url, duration, difficulty: difficulty as PodcastRow["difficulty"], topic, description,
        warmup_question: warmupQuestion,
        key_expressions: JSON.parse(keyExpressions),
        comprehension_questions: JSON.parse(comprehensionQuestions),
        discussion_questions: JSON.parse(discussionQuestions),
        sort_order: initial?.sort_order ?? 0,
        is_active: initial?.is_active ?? true,
      };
      const result = initial?.id
        ? await updatePodcast(initial.id, payload)
        : await createPodcast(payload);
      if (!result.success) { alert(result.error); return; }
      onSaved();
    } catch (e) { alert("JSON 형식 오류를 확인해주세요."); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-xl bg-surface p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-bold text-foreground">{initial?.id ? "팟캐스트 수정" : "팟캐스트 추가"}</h3>
        <div className="space-y-3">
          <Field label="제목" value={title} onChange={setTitle} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="소스" value={source} onChange={setSource} placeholder="BBC 6 Minute English" />
            <Field label="URL" value={url} onChange={setUrl} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="시간" value={duration} onChange={setDuration} placeholder="6 min" />
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-secondary">난이도</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as "beginner" | "intermediate" | "advanced")} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                <option value="beginner">초급</option>
                <option value="intermediate">중급</option>
                <option value="advanced">고급</option>
              </select>
            </div>
            <Field label="토픽" value={topic} onChange={setTopic} placeholder="집/주거" />
          </div>
          <Field label="설명" value={description} onChange={setDescription} />
          <Field label="워밍업 질문" value={warmupQuestion} onChange={setWarmupQuestion} />
          <TextareaField label="핵심 표현 (JSON)" value={keyExpressions} onChange={setKeyExpressions} rows={6} />
          <TextareaField label="이해도 질문 (JSON)" value={comprehensionQuestions} onChange={setComprehensionQuestions} rows={4} />
          <TextareaField label="토론 질문 (JSON)" value={discussionQuestions} onChange={setDiscussionQuestions} rows={4} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary transition-colors">취소</button>
          <button onClick={handleSave} disabled={saving || !title} className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 transition-colors">{saving ? "저장 중..." : "저장"}</button>
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
        <button onClick={() => { setIsNew(true); setEditing({} as FreetalkRow); }} className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600 transition-colors">
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
              <button onClick={() => handleToggle(item)} className="p-1.5 text-foreground-muted hover:text-foreground transition-colors">
                {item.is_active ? <ToggleRight size={18} className="text-green-600" /> : <ToggleLeft size={18} />}
              </button>
              <button onClick={() => { setIsNew(false); setEditing(item); }} className="p-1.5 text-foreground-muted hover:text-primary-600 transition-colors"><Pencil size={14} /></button>
              <button onClick={() => handleDelete(item.id)} className="p-1.5 text-foreground-muted hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
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
            <label className="mb-1 block text-xs font-medium text-foreground-secondary">카테고리</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as FreeTalkCategory)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary transition-colors">취소</button>
          <button onClick={handleSave} disabled={saving || !english} className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 transition-colors">{saving ? "저장 중..." : "저장"}</button>
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
        <button onClick={() => { setIsNew(true); setEditing({} as GameCardRow); }} className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600 transition-colors">
          <Plus size={14} /> 추가
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className={`flex items-center justify-between rounded-lg border p-3 ${item.is_active ? "border-border bg-surface" : "border-border/50 bg-surface-secondary/50 opacity-60"}`}>
            <p className="text-sm font-medium text-foreground truncate flex-1">{cardSummary(item)}</p>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button onClick={() => handleToggle(item)} className="p-1.5 text-foreground-muted hover:text-foreground transition-colors">
                {item.is_active ? <ToggleRight size={18} className="text-green-600" /> : <ToggleLeft size={18} />}
              </button>
              <button onClick={() => { setIsNew(false); setEditing(item); }} className="p-1.5 text-foreground-muted hover:text-primary-600 transition-colors"><Pencil size={14} /></button>
              <button onClick={() => handleDelete(item.id)} className="p-1.5 text-foreground-muted hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
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
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary transition-colors">취소</button>
          <button onClick={handleSave} disabled={saving} className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 transition-colors">{saving ? "저장 중..." : "저장"}</button>
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
    <div>
      <label className="mb-1 block text-xs font-medium text-foreground-secondary">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary-500 focus:outline-none" />
    </div>
  );
}

function TextareaField({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-foreground-secondary">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-mono text-foreground placeholder:text-foreground-muted focus:border-primary-500 focus:outline-none" />
    </div>
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
