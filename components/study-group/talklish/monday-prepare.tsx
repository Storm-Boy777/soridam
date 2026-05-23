"use client";

// 월요일(Podcast) 자료 생성 흐름:
//   URL 입력 → AI 자료 생성(study-podcast-generate) → 대화 구간 미리듣기·조절
//   → 오디오 추출(study-audio-extract) → 저장(createTalklishPodcast)

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { createTalklishPodcast } from "@/lib/actions/study-group";
import type { PodcastRow } from "@/lib/types/study-group";
import { TLK, TLK_FONT } from "./tokens";
import { Youtube, Sparkles, Loader2, Scissors, Volume2, Mic2, Check, Save, AlertCircle } from "lucide-react";

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return m ? m[1] : null;
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
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

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
      const res = await createTalklishPodcast({
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
      });
      if (!res.success) { setError(res.error || "저장에 실패했습니다"); return; }
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다");
    } finally {
      setSaving(false);
    }
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

      {/* Step 1 — URL + 생성 */}
      <section className="mt-7 rounded-2xl px-6 py-6" style={{ background: TLK.paper, border: `1px solid ${TLK.rule}` }}>
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
            <NumberField label="시작 (초)" value={startSec} onChange={setStartSec} hint={fmt(startSec)} />
            <NumberField label="종료 (초)" value={endSec} onChange={setEndSec} hint={fmt(endSec)} />
            <span style={{ fontFamily: TLK_FONT.sans, fontSize: 12, color: TLK.inkFaint, paddingBottom: 8 }}>
              길이 {Math.max(0, endSec - startSec)}초
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

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || saved}
            className="mt-5 flex items-center gap-2 rounded-full px-7 py-3 transition-all disabled:opacity-60"
            style={{ background: saved ? TLK.accent2 : TLK.ink, color: "#fff", border: 0, fontFamily: TLK_FONT.sans, fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer" }}
          >
            {saved ? (<><Check size={15} /> 저장됨</>) : saving ? (<><Loader2 size={15} className="animate-spin" /> 저장 중…</>) : (<><Save size={15} /> 자료 저장</>)}
          </button>
          {!audioUrl && !saved && (
            <p style={{ fontSize: 11, color: TLK.inkFaint, marginTop: 8, fontFamily: TLK_FONT.sans }}>
              오디오 없이도 저장할 수 있어요 (가라오케는 추출 후에 가능)
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

function NumberField({ label, value, onChange, hint }: { label: string; value: number; onChange: (n: number) => void; hint: string }) {
  return (
    <label className="block">
      <span style={{ fontFamily: TLK_FONT.sans, fontSize: 10.5, fontWeight: 700, color: TLK.inkFaint, display: "block", marginBottom: 3 }}>{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="w-24 rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: TLK.paperHi, border: `1px solid ${TLK.rule}`, color: TLK.ink, fontFamily: TLK_FONT.mono }}
        />
        <span style={{ fontFamily: TLK_FONT.mono, fontSize: 11, color: TLK.inkFaint }}>{hint}</span>
      </div>
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
