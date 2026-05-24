"use client";

// 월요일(Podcast) 자료 생성 흐름:
//   URL 입력 → AI 자료 생성(study-podcast-generate) → 대화 구간 미리듣기·조절
//   → 오디오 추출(study-audio-extract) → 저장(createTalklishPodcast)

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";
import { createTalklishPodcast, updateTalklishPodcast, fetchTalklishPodcastsForEdit, fetchTalklishYoutubeChannels } from "@/lib/actions/study-group";
import type { PodcastRow } from "@/lib/types/study-group";
import { TLK, TLK_FONT } from "./tokens";
import { Youtube, Sparkles, Loader2, Scissors, Volume2, Mic2, Check, Save, AlertCircle, ExternalLink, Pencil, FilePlus } from "lucide-react";

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

/** 초 → "m:ss" (유튜브식 타임스탬프 표기) */
function secToMMSS(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "m:ss" 또는 "초" 문자열 → 초. 부분 입력도 관대하게 파싱 */
function mmssToSec(str: string): number {
  const t = str.trim();
  if (t.includes(":")) {
    const [m, s] = t.split(":");
    return Math.max(0, (parseInt(m, 10) || 0) * 60 + (parseInt(s, 10) || 0));
  }
  return Math.max(0, parseInt(t, 10) || 0);
}

type Material = {
  description: string;
  dialogue_title: string;
  dialogue_script: string;
  roleplay: PodcastRow["roleplay"];
  warmup_question: string;
  listening_mission: string;
  dialogue_segment: { start_sec: number; end_sec: number } | null;
  dialogue_lines: PodcastRow["dialogue_lines"];
  key_expressions: PodcastRow["key_expressions"];
  comprehension_questions: string[];
  discussion_questions: string[];
  todays_picks: string[];
  difficulty: PodcastRow["difficulty"];
  topic: string;
};

export function MondayPrepare() {
  // 관리자가 등록한 유튜버 채널 바로가기 (096) — 영상 URL 찾기 편의
  const { data: channels = [] } = useQuery({
    queryKey: ["talklish-youtube-channels"],
    queryFn: fetchTalklishYoutubeChannels,
    staleTime: 5 * 60 * 1000,
  });
  // 수정용 — 기존 자료 목록 (활성/비활성 모두)
  const { data: editablePodcasts = [], refetch: refetchPodcasts } = useQuery({
    queryKey: ["talklish-podcasts-edit"],
    queryFn: fetchTalklishPodcastsForEdit,
    staleTime: 30 * 1000,
  });
  const [editingId, setEditingId] = useState<string | null>(null); // 수정 중인 자료 id (null=새로 만들기)
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");

  const [generating, setGenerating] = useState(false);
  const [material, setMaterial] = useState<Material | null>(null);

  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(0);
  const [extracting, setExtracting] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [generatingKaraoke, setGeneratingKaraoke] = useState(false);
  const [dialogueTimestamps, setDialogueTimestamps] = useState<
    { speaker: string; text: string; translation: string; start: number; end: number }[]
  >([]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const ytId = useMemo(() => extractYouTubeId(url), [url]);

  const handleGenerate = async () => {
    setError("");
    if (!url.trim() || !ytId) { setError("유효한 YouTube URL을 입력해주세요"); return; }
    setGenerating(true);
    setMaterial(null);
    setAudioUrl("");
    setDialogueTimestamps([]);
    setSaved(false);
    try {
      // oEmbed로 제목/채널 자동 채움
      let t = "", s = "";
      try {
        const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url.trim())}&format=json`);
        if (r.ok) { const d = await r.json(); t = d.title || ""; s = d.author_name || ""; }
      } catch { /* oEmbed 실패해도 진행 */ }
      setTitle(t);
      setSource(s);

      const supabase = createClient();
      const { data, error: efErr } = await supabase.functions.invoke("study-podcast-generate", {
        body: { youtubeUrl: url.trim(), youtubeTitle: t || undefined, channelName: s || undefined },
      });
      if (efErr || !data?.success) { setError(data?.error || efErr?.message || "자료 생성에 실패했습니다"); return; }
      const m = data.data as Material;
      setMaterial(m);
      setStartSec(m.dialogue_segment?.start_sec ?? 0);
      setEndSec(m.dialogue_segment?.end_sec ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "자료 생성 중 오류가 발생했습니다");
    } finally {
      setGenerating(false);
    }
  };

  const handleExtract = async () => {
    setError("");
    if (endSec <= startSec) { setError("종료 시간이 시작 시간보다 커야 합니다"); return; }
    setExtracting(true);
    setAudioUrl("");
    try {
      const supabase = createClient();
      const { data, error: efErr } = await supabase.functions.invoke("study-audio-extract", {
        body: { youtubeUrl: url.trim(), startSec, endSec },
      });
      if (efErr || !data?.success) { setError(data?.error || efErr?.message || "오디오 추출에 실패했습니다"); return; }
      setAudioUrl(data.audio_url);
      setSaved(false); // 오디오가 새로 생겼으니 다시 저장해야 반영됨
    } catch (e) {
      setError(e instanceof Error ? e.message : "오디오 추출 중 오류가 발생했습니다");
    } finally {
      setExtracting(false);
    }
  };

  const handleKaraoke = async () => {
    setError("");
    if (!audioUrl || !material?.dialogue_script) {
      setError("오디오 추출과 대화 스크립트가 모두 필요합니다");
      return;
    }
    setGeneratingKaraoke(true);
    try {
      const supabase = createClient();
      const { data, error: efErr } = await supabase.functions.invoke("study-dialogue-timestamps", {
        body: { audioUrl, dialogueScript: material.dialogue_script },
      });
      if (efErr || !data?.success) {
        setError(data?.error || efErr?.message || "가라오케 생성에 실패했습니다");
        return;
      }
      setDialogueTimestamps(data.dialogue_timestamps ?? []);
      setSaved(false); // 가라오케가 새로 생겼으니 다시 저장해야 반영됨
    } catch (e) {
      setError(e instanceof Error ? e.message : "가라오케 생성 중 오류가 발생했습니다");
    } finally {
      setGeneratingKaraoke(false);
    }
  };

  const handleSave = async () => {
    setError("");
    if (!material) return;
    setSaving(true);
    try {
      const mins = Math.max(1, Math.round((endSec - startSec) / 60));
      const payload = {
        title: title || material.topic || "제목 없음",
        source: source || "YouTube",
        url: url.trim(),
        duration: `${mins} min`,
        difficulty: material.difficulty,
        topic: material.topic,
        description: material.description,
        dialogue_title: material.dialogue_title || null,
        dialogue_script: material.dialogue_script || null,
        dialogue_timestamps: dialogueTimestamps,
        roleplay: material.roleplay ?? null,
        warmup_question: material.warmup_question,
        listening_mission: material.listening_mission,
        dialogue_segment: { start_sec: startSec, end_sec: endSec },
        dialogue_lines: material.dialogue_lines,
        key_expressions: material.key_expressions,
        comprehension_questions: material.comprehension_questions,
        discussion_questions: material.discussion_questions,
        todays_picks: material.todays_picks,
        audio_url: audioUrl || null,
        sort_order: 0,
        is_active: true,
      };
      const res = editingId
        ? await updateTalklishPodcast(editingId, payload)
        : await createTalklishPodcast(payload);
      if (!res.success) { setError(res.error || "저장에 실패했습니다"); return; }
      setSaved(true);
      void refetchPodcasts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다");
    } finally {
      setSaving(false);
    }
  };

  // 기존 자료를 편집 상태로 불러오기
  const loadPodcast = (row: PodcastRow) => {
    setEditingId(row.id);
    setUrl(row.url ?? "");
    setTitle(row.title ?? "");
    setSource(row.source ?? "");
    setMaterial({
      description: row.description ?? "",
      dialogue_title: row.dialogue_title ?? "",
      dialogue_script: row.dialogue_script ?? "",
      roleplay: row.roleplay ?? null,
      warmup_question: row.warmup_question ?? "",
      listening_mission: row.listening_mission ?? "",
      dialogue_segment: row.dialogue_segment ?? null,
      dialogue_lines: row.dialogue_lines ?? [],
      key_expressions: row.key_expressions ?? [],
      comprehension_questions: row.comprehension_questions ?? [],
      discussion_questions: row.discussion_questions ?? [],
      todays_picks: row.todays_picks ?? [],
      difficulty: row.difficulty,
      topic: row.topic ?? "",
    });
    setStartSec(row.dialogue_segment?.start_sec ?? 0);
    setEndSec(row.dialogue_segment?.end_sec ?? 0);
    setAudioUrl(row.audio_url ?? "");
    setDialogueTimestamps(row.dialogue_timestamps ?? []);
    setSaved(false);
    setError("");
  };

  // 새로 만들기 — 편집 상태 초기화
  const resetToNew = () => {
    setEditingId(null);
    setUrl("");
    setTitle("");
    setSource("");
    setMaterial(null);
    setStartSec(0);
    setEndSec(0);
    setAudioUrl("");
    setDialogueTimestamps([]);
    setSaved(false);
    setError("");
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 sm:px-10">
      {/* 헤더 */}
      <p style={{ fontFamily: TLK_FONT.sans, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: TLK.inkFaint, textTransform: "uppercase" }}>
        월요일 · Podcast
      </p>
      <h2 style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 32, fontWeight: 500, color: TLK.ink, marginTop: 6, letterSpacing: -0.5 }}>
        오늘의 영상으로 자료 만들기
      </h2>
      <p style={{ fontFamily: TLK_FONT.ko, fontSize: 13, color: TLK.inkDim, marginTop: 8, lineHeight: 1.6 }}>
        YouTube URL을 넣으면 AI가 어휘·토론·대화 구간을 뽑고, 대화 구간 오디오를 추출해 가라오케 재생에 씁니다.
      </p>

      {/* 새로 만들기 / 기존 자료 수정 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={resetToNew}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{
            background: editingId ? TLK.bg2 : TLK.accent,
            color: editingId ? TLK.inkDim : "#fff",
            border: editingId ? `1px solid ${TLK.rule}` : "none",
            fontFamily: TLK_FONT.sans,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <FilePlus size={13} /> 새로 만들기
        </button>
        {editablePodcasts.length > 0 && (
          <label className="inline-flex items-center gap-1.5">
            <Pencil size={13} style={{ color: TLK.inkFaint }} />
            <select
              aria-label="기존 자료 수정"
              value={editingId ?? ""}
              onChange={(e) => {
                const row = editablePodcasts.find((p) => p.id === e.target.value);
                if (row) loadPodcast(row);
                else resetToNew();
              }}
              className="rounded-lg px-2.5 py-1.5 text-sm outline-none"
              style={{ background: TLK.paperHi, border: `1px solid ${TLK.rule}`, color: TLK.ink, fontFamily: TLK_FONT.ko, maxWidth: 320 }}
            >
              <option value="">기존 자료 수정…</option>
              {editablePodcasts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                  {p.audio_url ? "" : " · 오디오 없음"}
                  {p.is_active ? "" : " · 비활성"}
                </option>
              ))}
            </select>
          </label>
        )}
        {editingId && (
          <span style={{ fontFamily: TLK_FONT.sans, fontSize: 11, fontWeight: 700, color: TLK.accent }}>
            수정 중
          </span>
        )}
      </div>

      {/* Step 1 — URL + 생성 */}
      <section className="mt-7 rounded-2xl px-6 py-6" style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}>
        {/* 채널 바로가기 — 관리자 등록 채널을 새 창으로 (영상 찾기 편의) */}
        {channels.length > 0 && (
          <div className="mb-4">
            <p style={{ fontFamily: TLK_FONT.sans, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: TLK.inkFaint, textTransform: "uppercase", marginBottom: 6 }}>
              채널 바로가기 · 새 창
            </p>
            <div className="flex flex-wrap gap-1.5">
              {channels.map((ch) => (
                <a
                  key={ch.id}
                  href={ch.channel_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all hover:-translate-y-0.5"
                  style={{ background: TLK.bg2, border: `1px solid ${TLK.rule}`, color: TLK.inkDim, fontFamily: TLK_FONT.sans, fontSize: 12, fontWeight: 600 }}
                >
                  <Youtube size={12} style={{ color: TLK.accent }} />
                  {ch.name}
                  <ExternalLink size={10} style={{ color: TLK.inkFaint }} />
                </a>
              ))}
            </div>
          </div>
        )}
        <label className="mb-2 flex items-center gap-1.5" style={{ fontFamily: TLK_FONT.sans, fontSize: 11, fontWeight: 700, color: TLK.inkDim }}>
          <Youtube size={13} /> YouTube URL
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtu.be/..."
            className="min-w-0 flex-1 rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{ background: TLK.paperHi, border: `1px solid ${TLK.rule}`, color: TLK.ink, fontFamily: TLK_FONT.ko }}
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !url.trim()}
            className="flex items-center gap-1.5 rounded-lg px-5 py-2.5 transition-all disabled:opacity-50"
            style={{ background: TLK.accent, color: "#fff", border: 0, fontFamily: TLK_FONT.sans, fontSize: 13, fontWeight: 700, cursor: generating ? "wait" : "pointer" }}
          >
            {generating ? (<><Loader2 size={14} className="animate-spin" /> 생성 중…</>) : (<><Sparkles size={14} /> 자료 생성</>)}
          </button>
        </div>
        {title && (
          <p style={{ fontSize: 11, color: TLK.inkDim, marginTop: 8, fontFamily: TLK_FONT.sans }}>
            ✓ {title}
            {source && <span style={{ color: TLK.inkFaint }}> · {source}</span>}
          </p>
        )}
      </section>

      {/* Step 2 — 구간 조절 + 미리듣기 + 추출 */}
      {material && (
        <section className="mt-5 rounded-2xl px-6 py-6" style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}>
          <div className="flex items-center gap-1.5" style={{ fontFamily: TLK_FONT.sans, fontSize: 11, fontWeight: 700, color: TLK.accent }}>
            <Scissors size={13} /> 대화 구간 확인 · 조절
          </div>
          <p style={{ fontFamily: TLK_FONT.ko, fontSize: 12.5, color: TLK.inkDim, marginTop: 6, lineHeight: 1.55 }}>
            AI가 잡은 구간이에요. 미리 듣고 필요하면 초 단위로 조절한 뒤 오디오를 추출하세요.
          </p>

          {ytId && (
            <div className="mt-4 overflow-hidden rounded-xl" style={{ aspectRatio: "16/9", border: `1px solid ${TLK.rule}`, maxWidth: 440 }}>
              <iframe
                key={`${ytId}-${startSec}-${endSec}`}
                src={`https://www.youtube.com/embed/${ytId}?start=${startSec}&end=${endSec}&rel=0`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="구간 미리듣기"
              />
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-end gap-4">
            <TimeField label="시작 (분:초)" value={startSec} onChange={setStartSec} />
            <TimeField label="종료 (분:초)" value={endSec} onChange={setEndSec} />
            <span style={{ fontFamily: TLK_FONT.sans, fontSize: 12, color: TLK.inkFaint, paddingBottom: 8 }}>
              길이 {secToMMSS(Math.max(0, endSec - startSec))}
            </span>
            <button
              type="button"
              onClick={handleExtract}
              disabled={extracting || endSec <= startSec}
              className="ml-auto flex items-center gap-1.5 rounded-lg px-5 py-2.5 transition-all disabled:opacity-50"
              style={{ background: TLK.accent2, color: "#fff", border: 0, fontFamily: TLK_FONT.sans, fontSize: 13, fontWeight: 700, cursor: extracting ? "wait" : "pointer" }}
            >
              {extracting ? (<><Loader2 size={14} className="animate-spin" /> 추출 중… (1~2분)</>) : (<><Volume2 size={14} /> 오디오 추출</>)}
            </button>
          </div>

          {audioUrl && (
            <div className="mt-4">
              <p style={{ fontSize: 11, color: TLK.accent2, fontFamily: TLK_FONT.sans, fontWeight: 700, marginBottom: 6 }}>✓ 추출 완료</p>
              <audio controls src={audioUrl} className="w-full" />

              {/* 가라오케 생성 — Whisper STT + 화자 매칭 + 한국어 번역 */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleKaraoke}
                  disabled={generatingKaraoke || !material?.dialogue_script}
                  className="flex items-center gap-1.5 rounded-lg px-5 py-2.5 transition-all disabled:opacity-50"
                  style={{ background: TLK.ink, color: "#fff", border: 0, fontFamily: TLK_FONT.sans, fontSize: 13, fontWeight: 700, cursor: generatingKaraoke ? "wait" : "pointer" }}
                >
                  {generatingKaraoke ? (<><Loader2 size={14} className="animate-spin" /> 가라오케 생성 중… (30초~1분)</>) : (<><Mic2 size={14} /> 가라오케 자막 생성</>)}
                </button>
                {dialogueTimestamps.length > 0 && (
                  <span style={{ fontSize: 12, color: TLK.accent2, fontFamily: TLK_FONT.sans, fontWeight: 700 }}>
                    ✓ 화자 세그먼트 {dialogueTimestamps.length}개 (한국어 번역 포함)
                  </span>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Step 3 — 미리보기 + 저장 */}
      {material && (
        <section className="mt-5 rounded-2xl px-6 py-6" style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}>
          <div style={{ fontFamily: TLK_FONT.sans, fontSize: 11, fontWeight: 700, color: TLK.inkDim }}>자료 미리보기</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip label={`표현 ${material.key_expressions.length}`} />
            <Chip label={`토론 ${material.discussion_questions.length}`} />
            <Chip label={`핵심표현 ${material.todays_picks.length}`} />
            {material.topic && <Chip label={material.topic} />}
            <Chip label={material.difficulty} />
            {material.dialogue_script && <Chip label="대화 스크립트 ✓" />}
            {material.roleplay && <Chip label="역할극 ✓" />}
          </div>
          {material.dialogue_title && (
            <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 15, color: TLK.ink, marginTop: 10 }}>
              🎬 {material.dialogue_title}
            </p>
          )}
          {material.description && (
            <p style={{ fontFamily: TLK_FONT.serif, fontStyle: "italic", fontSize: 14, color: TLK.inkDim, marginTop: 12, lineHeight: 1.6 }}>
              {material.description}
            </p>
          )}

          {/* 저장 전 체크리스트 — 오디오/가라오케 누락 방지 */}
          <div className="mt-4 flex flex-wrap items-center gap-3" style={{ fontFamily: TLK_FONT.sans, fontSize: 12, fontWeight: 700 }}>
            <span style={{ color: audioUrl ? TLK.accent2 : TLK.accent }}>
              {audioUrl ? "✓ 오디오 추출됨" : "⚠ 오디오 없음"}
            </span>
            <span style={{ color: dialogueTimestamps.length > 0 ? TLK.accent2 : TLK.accent }}>
              {dialogueTimestamps.length > 0 ? `✓ 가라오케 ${dialogueTimestamps.length}` : "⚠ 가라오케 없음"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || saved}
            className="mt-3 flex items-center gap-2 rounded-full px-7 py-3 transition-all disabled:opacity-60"
            style={{ background: saved ? TLK.accent2 : TLK.ink, color: "#fff", border: 0, fontFamily: TLK_FONT.sans, fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer" }}
          >
            {saved ? (<><Check size={15} /> {editingId ? "수정됨" : "저장됨"}</>) : saving ? (<><Loader2 size={15} className="animate-spin" /> 저장 중…</>) : (<><Save size={15} /> {editingId ? "수정 저장" : "자료 저장"}</>)}
          </button>
          {!audioUrl && !saved && (
            <p style={{ fontSize: 11, color: TLK.accent, marginTop: 8, fontFamily: TLK_FONT.sans }}>
              ⚠ 오디오를 추출하지 않았어요. 2차 청취(가라오케)를 쓰려면 위 “오디오 추출 → 가라오케 자막 생성”을 먼저 하세요. (오디오 없이도 저장은 가능)
            </p>
          )}
          {saved && (
            <p style={{ fontSize: 12, color: TLK.accent2, marginTop: 8, fontFamily: TLK_FONT.sans }}>
              월요일 스터디에서 이 자료로 진행할 수 있어요.
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

/** 유튜브식 m:ss 입력 — 내부 값은 초(number), 표시·입력은 "1:10" */
function TimeField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const [text, setText] = useState(secToMMSS(value));
  // 외부에서 value가 바뀌면(AI 생성 등) 입력 텍스트 동기화
  useEffect(() => { setText(secToMMSS(value)); }, [value]);
  return (
    <label className="block">
      <span style={{ fontFamily: TLK_FONT.sans, fontSize: 10.5, fontWeight: 700, color: TLK.inkFaint, display: "block", marginBottom: 3 }}>{label}</span>
      <input
        type="text"
        value={text}
        onChange={(e) => { setText(e.target.value); onChange(mmssToSec(e.target.value)); }}
        placeholder="1:10"
        className="w-24 rounded-lg px-3 py-2 text-center text-sm outline-none"
        style={{ background: TLK.paperHi, border: `1px solid ${TLK.rule}`, color: TLK.ink, fontFamily: TLK_FONT.mono }}
      />
    </label>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full px-2.5 py-1" style={{ background: TLK.bg2, border: `1px solid ${TLK.rule}`, fontFamily: TLK_FONT.sans, fontSize: 11, color: TLK.inkDim }}>
      {label}
    </span>
  );
}
