"use server";

// 내 자료 내보내기 — AI 기능 종료(2026-08-31)에 따른 사용자 데이터 백업용.
//
// script-packages 버킷은 public이라(004_scripts.sql:285) 서명 URL이 필요 없다.
// 오디오 경로는 audio/{packageId}.{wav|mp3} — tts_voice에 따라 확장자가 갈리므로
// wav_file_path를 그대로 쓴다(컬럼명이 wav지만 mp3도 담긴다).

import { getUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { T } from "@/lib/constants/tables";

export interface ExportSentence {
  index: number;
  english: string;
  korean: string;
  start: number;
  end: number;
  duration: number;
}

export interface ExportScript {
  id: string;
  title: string | null;
  /** 트리 라벨용 짧은 한글 질문 (questions.question_short) */
  questionShort: string | null;
  category: string | null;
  topic: string | null;
  questionType: string | null;
  targetGrade: string | null;
  questionKorean: string | null;
  questionEnglish: string | null;
  /** 질문(OPIc 프롬프트) 음성 — 없으면 null */
  questionAudio: { url: string; fileName: string } | null;
  englishText: string;
  koreanTranslation: string | null;
  keyExpressions: string[];
  wordCount: number | null;
  createdAt: string;
  /** 음성이 없으면 null — 텍스트만 내보낸다 */
  audio: {
    url: string;
    /** ZIP 안에서 쓸 파일명 (audio/ 하위) */
    fileName: string;
    /** ZIP 분할 판단용. 0이면 미상 */
    size: number;
    sentences: ExportSentence[];
  } | null;
}

/** key_expressions는 DB상 Json|null — 타입 선언(string[])과 달라 방어적으로 평탄화한다 */
function normalizeKeyExpressions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => (typeof v === "string" ? v : typeof v === "object" && v !== null ? String((v as { text?: unknown }).text ?? "") : String(v)))
    .filter((s) => s.trim().length > 0);
}

function normalizeSentences(raw: unknown): ExportSentence[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
    .map((s, i) => ({
      index: typeof s.index === "number" ? s.index : i + 1,
      english: String(s.english ?? ""),
      korean: String(s.korean ?? ""),
      start: Number(s.start ?? 0),
      end: Number(s.end ?? 0),
      duration: Number(s.duration ?? 0),
    }))
    .filter((s) => s.english.length > 0);
}

/** 파일명으로 쓸 수 없는 문자 제거 + 길이 제한 (Windows/macOS 공통 안전 범위) */
function safeFileName(input: string, fallback: string): string {
  const cleaned = input
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  return cleaned.length > 0 ? cleaned : fallback;
}

export async function getMyExportData(): Promise<
  { scripts: ExportScript[]; error?: never } | { scripts?: never; error: string }
> {
  const user = await getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const supabase = await createServerSupabaseClient();

  // RLS가 본인 행만 반환하지만, 명시적으로도 user_id를 건다
  const { data: scripts, error: scriptErr } = await supabase
    .from(T.scripts)
    .select(
      "id, question_id, title, category, topic, question_type, target_grade, question_korean, question_english, english_text, korean_translation, key_expressions, word_count, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (scriptErr) {
    console.error("[getMyExportData] scripts", scriptErr.message);
    return { error: "스크립트를 불러오지 못했습니다" };
  }
  if (!scripts || scripts.length === 0) return { scripts: [] };

  // 트리 라벨용 짧은 한글 질문 + 질문 음성(questions.question_short / audio_url). 조인 실패해도 폴백 있으니 무시
  const questionIds = [...new Set(scripts.map((s) => s.question_id).filter(Boolean))];
  const shortById = new Map<string, string>();
  const qAudioById = new Map<string, string>();
  if (questionIds.length > 0) {
    const { data: qs } = await supabase
      .from(T.questions)
      .select("id, question_short, audio_url")
      .in("id", questionIds);
    for (const q of qs || []) {
      if (q.question_short) shortById.set(q.id, q.question_short);
      if (q.audio_url) qAudioById.set(q.id, q.audio_url);
    }
  }

  const { data: packages, error: pkgErr } = await supabase
    .from(T.script_packages)
    .select("script_id, wav_file_path, wav_file_size, timestamp_data, status")
    .eq("user_id", user.id)
    .in(
      "script_id",
      scripts.map((s) => s.id)
    );

  if (pkgErr) {
    console.error("[getMyExportData] packages", pkgErr.message);
    // 음성을 못 가져와도 텍스트는 내보낼 수 있게 계속 진행
  }

  // script_id 하나당 패키지는 하나(재생성 시 기존 행 전량 삭제)이나, 방어적으로 마지막 것을 쓴다
  const pkgByScript = new Map<string, (typeof packages)[number]>();
  for (const p of packages || []) {
    if (p.status === "completed" && p.wav_file_path) pkgByScript.set(p.script_id, p);
  }

  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/script-packages`;
  const usedNames = new Set<string>();

  const result: ExportScript[] = scripts.map((s, i) => {
    const pkg = pkgByScript.get(s.id);
    let audio: ExportScript["audio"] = null;

    if (pkg?.wav_file_path) {
      const ext = pkg.wav_file_path.split(".").pop() || "wav";
      const seq = String(i + 1).padStart(3, "0");
      let name = `${seq}_${safeFileName(s.title || s.topic || "", "script")}.${ext}`;
      // 동일 제목 충돌 방지
      while (usedNames.has(name)) name = `${seq}_${crypto.randomUUID().slice(0, 6)}.${ext}`;
      usedNames.add(name);

      audio = {
        url: `${base}/${pkg.wav_file_path}`,
        fileName: name,
        size: pkg.wav_file_size ?? 0,
        sentences: normalizeSentences(pkg.timestamp_data),
      };
    }

    // 질문 음성 (audio_url은 이미 전체 public URL — 확장자만 뽑아 파일명 구성)
    const qUrl = (s.question_id && qAudioById.get(s.question_id)) || null;
    let questionAudio: ExportScript["questionAudio"] = null;
    if (qUrl) {
      const qExt = (qUrl.split("?")[0].split(".").pop() || "wav").toLowerCase();
      const seq = String(i + 1).padStart(3, "0");
      questionAudio = { url: qUrl, fileName: `q${seq}.${qExt}` };
    }

    return {
      id: s.id,
      title: s.title,
      questionShort: (s.question_id && shortById.get(s.question_id)) || null,
      category: s.category,
      topic: s.topic,
      questionType: s.question_type,
      targetGrade: s.target_grade,
      questionKorean: s.question_korean,
      questionEnglish: s.question_english,
      questionAudio,
      englishText: s.english_text,
      koreanTranslation: s.korean_translation,
      keyExpressions: normalizeKeyExpressions(s.key_expressions),
      wordCount: s.word_count,
      createdAt: s.created_at,
      audio,
    };
  });

  return { scripts: result };
}
