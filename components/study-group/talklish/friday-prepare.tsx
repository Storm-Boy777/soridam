"use client";

// 금요일(Free Talk) 게임 세트 생성 흐름:
//   테마 + 난이도 입력 → AI 세트 생성(study-freetalk-generate) → 미리보기 → 저장(createTalklishGameSet)
// 월요일 MondayPrepare와 동일 패턴. EF는 생성만, 저장은 SA.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";
import {
  createTalklishGameSet,
  updateTalklishGameSet,
  fetchTalklishGameSetsForEdit,
} from "@/lib/actions/study-group";
import type { TalklishGameSet, TalklishGameSetContent } from "@/lib/types/study-group";
import { TLK, TLK_FONT } from "./tokens";
import { Sparkles, Loader2, Save, Check, AlertCircle, FilePlus, Pencil } from "lucide-react";

type Difficulty = TalklishGameSet["difficulty"];

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "beginner", label: "초급" },
  { value: "intermediate", label: "중급" },
  { value: "advanced", label: "고급" },
];

// 빠른 테마 제안 (OPIc 서베이 주제 기반)
const THEME_SUGGESTIONS = ["여행", "음식·카페", "영화·드라마", "운동·건강", "직장·일", "집·동네", "쇼핑", "기술·SNS"];

export function FridayPrepare() {
  const { data: editableSets = [], refetch } = useQuery({
    queryKey: ["talklish-gamesets-edit"],
    queryFn: fetchTalklishGameSetsForEdit,
    staleTime: 30 * 1000,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [theme, setTheme] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [description, setDescription] = useState("");

  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState<TalklishGameSetContent | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setError("");
    if (!theme.trim()) { setError("테마를 입력해주세요"); return; }
    setGenerating(true);
    setContent(null);
    setSaved(false);
    try {
      const supabase = createClient();
      const { data, error: efErr } = await supabase.functions.invoke("study-freetalk-generate", {
        body: { theme: theme.trim(), difficulty },
      });
      if (efErr || !data?.success) { setError(data?.error || efErr?.message || "세트 생성에 실패했습니다"); return; }
      const c = data.data as TalklishGameSetContent;
      setContent(c);
      setDescription(c.description ?? "");
      if (c.theme) setTheme(c.theme);
    } catch (e) {
      setError(e instanceof Error ? e.message : "세트 생성 중 오류가 발생했습니다");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setError("");
    if (!content) return;
    setSaving(true);
    try {
      const payload = {
        theme: theme.trim() || content.theme || "테마 없음",
        difficulty,
        description: description.trim(),
        spinner_topics: content.spinner_topics,
        taboo: content.taboo,
        wyr: content.wyr,
        roleplay: content.roleplay,
        story: content.story,
        debate: content.debate,
        sort_order: 0,
        is_active: true,
      };
      const res = editingId
        ? await updateTalklishGameSet(editingId, payload)
        : await createTalklishGameSet(payload);
      if (!res.success) { setError(res.error || "저장에 실패했습니다"); return; }
      setSaved(true);
      void refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다");
    } finally {
      setSaving(false);
    }
  };

  const loadSet = (row: TalklishGameSet) => {
    setEditingId(row.id);
    setTheme(row.theme ?? "");
    setDifficulty(row.difficulty);
    setDescription(row.description ?? "");
    setContent({
      theme: row.theme,
      difficulty: row.difficulty,
      description: row.description,
      spinner_topics: row.spinner_topics ?? [],
      taboo: row.taboo ?? [],
      wyr: row.wyr ?? [],
      roleplay: row.roleplay ?? [],
      story: row.story ?? [],
      debate: row.debate ?? [],
    });
    setSaved(false);
    setError("");
  };

  const resetToNew = () => {
    setEditingId(null);
    setTheme("");
    setDifficulty("intermediate");
    setDescription("");
    setContent(null);
    setSaved(false);
    setError("");
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 sm:px-10">
      {/* 헤더 */}
      <p style={{ fontFamily: TLK_FONT.sans, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: TLK.inkFaint, textTransform: "uppercase" }}>
        금요일 · Free Talk
      </p>
      <h2 style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 32, fontWeight: 500, color: TLK.ink, marginTop: 6, letterSpacing: -0.5 }}>
        테마로 게임 세트 만들기
      </h2>
      <p style={{ fontFamily: TLK_FONT.ko, fontSize: 13, color: TLK.inkDim, marginTop: 8, lineHeight: 1.6 }}>
        테마 하나를 넣으면 AI가 스피너·Taboo·WYR·롤플레이·이어쓰기·Debate를 한 번에 만들어요. 하룻밤이 하나의 주제로 흐릅니다.
      </p>

      {/* 새로 만들기 / 기존 세트 수정 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={resetToNew}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{
            background: editingId ? TLK.bg2 : TLK.accent,
            color: editingId ? TLK.inkDim : "#fff",
            border: editingId ? `1px solid ${TLK.rule}` : "none",
            fontFamily: TLK_FONT.sans, fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}
        >
          <FilePlus size={13} /> 새로 만들기
        </button>
        {editableSets.length > 0 && (
          <label className="inline-flex items-center gap-1.5">
            <Pencil size={13} style={{ color: TLK.inkFaint }} />
            <select
              aria-label="기존 세트 수정"
              value={editingId ?? ""}
              onChange={(e) => {
                const row = editableSets.find((s) => s.id === e.target.value);
                if (row) loadSet(row);
                else resetToNew();
              }}
              className="rounded-lg px-2.5 py-1.5 text-sm outline-none"
              style={{ background: TLK.paperHi, border: `1px solid ${TLK.rule}`, color: TLK.ink, fontFamily: TLK_FONT.ko, maxWidth: 320 }}
            >
              <option value="">기존 세트 수정…</option>
              {editableSets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.theme} · {s.difficulty}
                  {s.is_active ? "" : " · 비활성"}
                </option>
              ))}
            </select>
          </label>
        )}
        {editingId && (
          <span style={{ fontFamily: TLK_FONT.sans, fontSize: 11, fontWeight: 700, color: TLK.accent }}>수정 중</span>
        )}
      </div>

      {/* Step 1 — 테마 + 난이도 + 생성 */}
      <section className="mt-7 rounded-2xl px-6 py-6" style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}>
        <label className="mb-2 flex items-center gap-1.5" style={{ fontFamily: TLK_FONT.sans, fontSize: 11, fontWeight: 700, color: TLK.inkDim }}>
          <Sparkles size={13} /> 테마
        </label>
        <input
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="예: 여행"
          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
          style={{ background: TLK.paperHi, border: `1px solid ${TLK.rule}`, color: TLK.ink, fontFamily: TLK_FONT.ko }}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {THEME_SUGGESTIONS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{ background: TLK.bg2, color: TLK.inkDim, border: `1px solid ${TLK.rule}`, fontFamily: TLK_FONT.sans, cursor: "pointer" }}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span style={{ fontFamily: TLK_FONT.sans, fontSize: 10.5, fontWeight: 700, color: TLK.inkFaint, display: "block", marginBottom: 3 }}>난이도</span>
            <div className="flex gap-1.5">
              {DIFFICULTIES.map((d) => {
                const active = difficulty === d.value;
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDifficulty(d.value)}
                    className="rounded-full px-3 py-1.5 text-xs font-bold"
                    style={{
                      background: active ? TLK.accent : TLK.bg2,
                      color: active ? "#fff" : TLK.inkDim,
                      border: `1px solid ${active ? TLK.accent : TLK.rule}`,
                      fontFamily: TLK_FONT.sans, cursor: "pointer",
                    }}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </label>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !theme.trim()}
            className="ml-auto flex items-center gap-1.5 rounded-lg px-5 py-2.5 transition-all disabled:opacity-50"
            style={{ background: TLK.accent, color: "#fff", border: 0, fontFamily: TLK_FONT.sans, fontSize: 13, fontWeight: 700, cursor: generating ? "wait" : "pointer" }}
          >
            {generating ? (<><Loader2 size={14} className="animate-spin" /> 생성 중… (20~40초)</>) : (<><Sparkles size={14} /> 세트 생성</>)}
          </button>
        </div>
      </section>

      {/* Step 2 — 미리보기 + 저장 */}
      {content && (
        <section className="mt-5 rounded-2xl px-6 py-6" style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}>
          <div style={{ fontFamily: TLK_FONT.sans, fontSize: 11, fontWeight: 700, color: TLK.inkDim }}>세트 미리보기</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip label={`스피너 ${content.spinner_topics.length}`} />
            <Chip label={`Taboo·스무고개 ${content.taboo.length}`} />
            <Chip label={`WYR ${content.wyr.length}`} />
            <Chip label={`롤플레이 ${content.roleplay.length}`} />
            <Chip label={`이어쓰기 ${content.story.length}`} />
            <Chip label={`Debate ${content.debate.length}`} />
          </div>

          {/* 설명 (편집 가능) */}
          <label className="mt-4 block" style={{ fontFamily: TLK_FONT.sans, fontSize: 10.5, fontWeight: 700, color: TLK.inkFaint }}>
            세트 설명
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 세트 소개 한 줄"
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: TLK.paperHi, border: `1px solid ${TLK.rule}`, color: TLK.ink, fontFamily: TLK_FONT.ko, fontWeight: 400 }}
            />
          </label>

          {/* 게임별 콘텐츠 미리보기 */}
          <div className="mt-4 flex flex-col gap-3">
            <PreviewBlock label="🎯 토픽 스피너" items={content.spinner_topics.map((t) => t.english)} />
            <PreviewBlock label="🚫 Taboo · 🔍 스무고개" items={content.taboo.map((t) => `${t.target} — 금지어 ${t.forbidden.length}`)} />
            <PreviewBlock label="↔️ Would You Rather" items={content.wyr.map((t) => `${t.optionA} / ${t.optionB}`)} />
            <PreviewBlock label="🎬 롤플레이" items={content.roleplay.map((t) => `${t.title} — ${t.role_a.name} ↔ ${t.role_b.name}`)} />
            <PreviewBlock label="📚 한 문장 이어쓰기" items={content.story.map((t) => t.opening)} />
            <PreviewBlock label="⚖️ Debate" items={content.debate.map((t) => t.topic)} />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || saved}
            className="mt-5 flex items-center gap-2 rounded-full px-7 py-3 transition-all disabled:opacity-60"
            style={{ background: saved ? TLK.accent2 : TLK.ink, color: "#fff", border: 0, fontFamily: TLK_FONT.sans, fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer" }}
          >
            {saved ? (<><Check size={15} /> {editingId ? "수정됨" : "저장됨"}</>) : saving ? (<><Loader2 size={15} className="animate-spin" /> 저장 중…</>) : (<><Save size={15} /> {editingId ? "수정 저장" : "세트 저장"}</>)}
          </button>
          {saved && (
            <p style={{ fontSize: 12, color: TLK.accent2, marginTop: 8, fontFamily: TLK_FONT.sans }}>
              금요일 스터디 화면의 세트 선택자에서 이 세트로 진행할 수 있어요.
            </p>
          )}
        </section>
      )}

      {error && (
        <div className="mt-5 flex items-start gap-2 rounded-xl px-4 py-3" style={{ background: `${TLK.accent}10`, border: `1px solid ${TLK.accent}40` }}>
          <AlertCircle size={15} style={{ color: TLK.accent, marginTop: 1 }} />
          <p style={{ fontSize: 12.5, color: TLK.ink, fontFamily: TLK_FONT.ko }}>{error}</p>
        </div>
      )}
    </div>
  );
}

function PreviewBlock({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl px-4 py-3" style={{ background: TLK.bg2, border: `1px solid ${TLK.rule}` }}>
      <p style={{ fontFamily: TLK_FONT.sans, fontSize: 11, fontWeight: 700, color: TLK.inkDim, marginBottom: 6 }}>{label}</p>
      <ul className="flex flex-col gap-1">
        {items.map((it, i) => (
          <li key={i} style={{ fontFamily: TLK_FONT.ko, fontSize: 12.5, color: TLK.inkDim, lineHeight: 1.5 }}>
            · {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full px-2.5 py-1" style={{ background: TLK.bg2, border: `1px solid ${TLK.rule}`, fontFamily: TLK_FONT.sans, fontSize: 11, color: TLK.inkDim }}>
      {label}
    </span>
  );
}
