// study-podcast-generate
// YouTube URL을 받아 Supadata로 자막(타임스탬프 포함)을 추출하고,
// GPT-4.1-mini로 EnglishPod 기반 스터디 학습 자료를 자동 생성한다.
//
// 흐름: YouTube URL → Supadata 자막 → GPT → 학습 자료 JSON
//
// 출력 필드:
//   - description            한국어 1~2줄 요약
//   - warmup_question        워밍업 질문 (영문)
//   - listening_mission      1차 청취 focus 미션 (한국어)
//   - dialogue_segment       대화 1차 구간 { start_sec, end_sec }
//   - key_expressions        어휘 훈련 카드 (표현/뜻+뉘앙스/영영정의/예문/유사표현/말하기 프롬프트/난이도)
//   - comprehension_questions / discussion_questions
//   - todays_picks           오늘의 표현 후보 3개
//   - difficulty / topic

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { generateRequestId, captureAndRespond } from "../_shared/errorLogger.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPADATA_API_KEY = Deno.env.get("SUPADATA_API_KEY")!;
const MODEL = "gpt-4.1-mini";

type Difficulty = "beginner" | "intermediate" | "advanced";

interface GenInput {
  youtubeUrl: string;
  youtubeTitle?: string;
  channelName?: string;
  currentDifficulty?: Difficulty;
  currentTopic?: string;
}

interface TranscriptSegment {
  text: string;
  offset: number; // ms
  duration: number; // ms
}

interface KeyExpressionCard {
  expression: string;
  type: "word" | "phrase" | "pattern";  // 단어 / 구동사·관용구 / 회화 기능 패턴
  pronunciation: string;       // 발음기호 (예: /rɪˈzɔːrsɪz/)
  part_of_speech: string;      // 품사 (noun/verb/phrase 등)
  meaning_ko: string;
  meaning_en: string;
  examples: { en: string; ko: string }[];
  similar_expressions: string[];
  related_vocab: { word: string; meaning_ko: string; relation: string }[];  // 확장 어휘 (유의어·반의어·관련어)
  speaking_prompt: string;
  level: "core" | "stretch";
}

interface RoleplayRole {
  name: string;
  description: string;
  objectives: string[];        // 이 역할의 목표 2~3개
  suggested_phrases: string[]; // 롤플레이에서 쓸 표현 3~5개
}

interface RoleplayData {
  scenario: string;            // 영문 상황 설명
  scenario_ko: string;         // 한국어 번역
  role_a: RoleplayRole;
  role_b: RoleplayRole;
}

interface DialogueLine {
  start_ms: number;
  end_ms: number;
  text: string;
}

interface GenOutput {
  description: string;
  dialogue_title: string;       // 대화 상황 영문 제목
  dialogue_script: string;      // 화자 구분 대화 스크립트 (Whisper STT 가라오케 기준)
  warmup_question: string;
  listening_mission: string;
  dialogue_segment: { start_sec: number; end_sec: number } | null;
  dialogue_lines: DialogueLine[];
  key_expressions: KeyExpressionCard[];
  roleplay: RoleplayData | null;
  comprehension_questions: string[];
  discussion_questions: string[];
  todays_picks: string[];
  difficulty: Difficulty;
  topic: string;
}

// ============================================================
// Supadata 자막 추출 (타임스탬프 포함)
// ============================================================
async function fetchTranscript(youtubeUrl: string): Promise<TranscriptSegment[]> {
  const endpoint =
    "https://api.supadata.ai/v1/transcript?url=" +
    encodeURIComponent(youtubeUrl) +
    "&text=false";
  const res = await fetch(endpoint, {
    headers: { "x-api-key": SUPADATA_API_KEY },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supadata ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  if (!Array.isArray(data.content) || data.content.length === 0) {
    throw new Error("자막 세그먼트가 비어 있음 (자막 없는 영상일 수 있음)");
  }
  return data.content as TranscriptSegment[];
}

// 세그먼트 → "[Ns | mm:ss] text" 라인 (GPT 입력)
// 초 단위를 먼저 표기해 GPT가 mm*60+ss 변환을 하지 않게 한다 (대화 시작 시각 오인식 방지).
function segmentsToLines(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => {
      const sec = Math.floor((s.offset ?? 0) / 1000);
      const mm = String(Math.floor(sec / 60)).padStart(2, "0");
      const ss = String(sec % 60).padStart(2, "0");
      return `[${sec}s | ${mm}:${ss}] ${s.text}`;
    })
    .join("\n");
}

const SYSTEM_PROMPT = `너는 영어 학습 콘텐츠 설계 전문가다. EnglishPod 형식의 영어 학습 영상 자막을 받아, 한국 학습자가 오프라인 스터디 모임(6명·1시간·큰 모니터에 띄우고 함께 진행)에서 쓸 학습 자료를 만든다.

작업은 두 단계다. 반드시 STEP 1(대화 추출)을 먼저 정확히 끝낸 뒤, 그 결과를 근거로 STEP 2(학습 자료)를 만든다.

# EnglishPod 영상 구조 (항상 비슷한 순서)
인트로(호스트 인사+주제) → [vocabulary preview] → ★대화 1차(정상 속도) → 호스트 해설 → language takeaway / putting it together / fluency builder / grammar breakdown(어휘·문법 설명) → ★대화 2차(느림) → 추가 설명 → ★대화 3차 → 호스트 잡담 → 아웃트로 → audio review

핵심: 같은 대화가 2~3번 반복된다(정상 / 느림 / 다시). 반복 횟수는 1~3회로 일정하지 않다.

자막 각 줄 앞에는 [Ns | mm:ss] 타임스탬프가 붙어 있다. N은 영상 시작부터의 초(절대값), mm:ss는 참고용. 시각 출력은 항상 N(초)을 그대로 쓴다. 절대 mm:ss를 다시 계산하지 말 것.

══════════════════════════════════════════
STEP 1 — 역할극 대화 추출 (가장 중요, 먼저 수행)
══════════════════════════════════════════
전체 자막에서 등장인물 사이의 실제 역할극 대화(상황극)만 정확히 찾는다.

[유지] 맨 처음(1차) 대화만 추출한다.

[제거] 아래는 대화가 아니므로 절대 포함하지 않는다:
- 인트로 / 아웃트로 / 호스트 해설·잡담
- vocabulary preview, language takeaway, putting it together, fluency builder, grammar breakdown
- 예문(example one / example two / example three …)
- audio review (맨 끝의 "뜻 → 단어" 나열 구간)
- 2차·3차 반복 대화 (느린 버전·다시 듣기 버전)

[경계 anchor]
- 대화 시작: 호스트 큐 직후 — "let's listen to (the/our/this) dialogue", "for the first time", "when we come back", "today" 등.
- 대화 종료: "and we're back"가 나오면 거기까지. 없으면, 호스트가 대화를 평가하기 시작하거나 설명 섹션(language takeaway / putting it together / fluency builder / grammar breakdown / vocabulary)으로 진입하기 직전 라인까지.
- 반복 대화 큐(추출 대상 아님, 무시): "a second time", "one more time", "slow", "slower", "a third time", "a last time".

[화자 추론 — 정확도 핵심]
- 자막에는 화자 정보가 없으므로 내용·맥락으로 추론한다.
- 대화는 보통 2명(가끔 3명)이 번갈아 말한다. 발화 교대를 기본으로 보되, 한 화자가 연속으로 여러 문장을 말할 수도 있다.
- 화자 단서를 적극 활용한다:
  · 직접 호명: "...don't you think so Ellen", "trust me Carol", "haven't we Joe" → 화자/상대 파악.
  · 질문 ↔ 답변 교대.
  · 자기소개·인사: "hi I'm Adam", "I'm Tony", "nice to meet you".
  · 역할 말투: 상사=거절·지시·결정 / 부하=요청·설명·제안 / 손님=주문·문의 / 점원·직원=안내·응대 / 리포터=질문·중계 / 인터뷰이=답변.
- 이름이 불리면 그 이름을, 없으면 역할 라벨(Boss, Employee, Customer, Bank Teller, Reporter, Protester, Husband, Wife, Police Officer, Santa 등)을 대화 전체에서 일관되게 쓴다. 같은 사람을 도중에 다른 라벨로 바꾸지 말 것.
- 대사 원문(영어)을 그대로 옮긴다. 요약·번역·창작·문장 추가 금지.

STEP 1의 결과로 아래 3개를 확정한다:
- dialogue_segment: 1차 대화 첫 줄의 N을 start_sec, 마지막 줄의 N을 end_sec. 대화를 못 찾으면 null.
- dialogue_title: 1차 대화 상황을 보여주는 짧은 영문 제목 (예: "Asking for a Raise", "Ordering at a Cafe").
- dialogue_script: 1차 대화를 "화자명: 대사" 한 줄씩. 호스트의 진행·설명 멘트는 빼고 등장인물의 실제 대화만, 순서·내용을 정확히. 화자명은 위 화자 추론 규칙으로 일관되게. (이 스크립트가 추출 음성 STT 가라오케의 화자 매칭 기준이 되므로 정확해야 한다.)

══════════════════════════════════════════
STEP 2 — 학습 자료 생성 (STEP 1의 대화를 근거로)
══════════════════════════════════════════
- key_expressions (★어휘·표현 학습 단계의 핵심 자료. 멤버가 화면 카드를 함께 보고, 예문을 돌아가며 소리 내 읽고, 한국어로 뜻을 설명하며 익힌다): Vocabulary Preview · Language Takeaway · Putting It Together · Fluency Builder 섹션에서 호스트가 실제로 가르친 것만 추출(5~9개). 자막에 없는 표현을 지어내지 말 것.
  · 단순 단어보다 표현(콜로케이션·구동사·관용구·회화 기능 패턴)을 우선한다. "would you be okay with that", "what do you do for a living", "do you have a second" 같은 회화 패턴은 스피킹에 바로 쓰이므로 반드시 포함한다.
  · type: 표현 유형 — "word"(단어) | "phrase"(구동사·관용구·콜로케이션) | "pattern"(회화 기능 표현·문장 틀).
  · expression: 표현 원문.
  · pronunciation: 발음기호(예: "/rɪˈzɔːrsɪz/"). 모르면 빈 문자열. part_of_speech: 품사(noun/verb/adjective/phrase/idiom 등).
  · meaning_ko: 한국어 뜻 + 뉘앙스. 사전식 직역이 아니라 "언제, 어떤 느낌으로 쓰는지"를 풀어준다(멤버가 한국어로 설명하는 활동에 쓰인다).
  · meaning_en: 쉬운 영영 정의 한 문장.
  · examples: 자연스러운 구어체 예문 2~3개. 서로 다른 상황으로, 학습자가 자기 이야기로 바꿔 말하기 쉽게. 각 { "en": 영문, "ko": 자연스러운 한국어 번역 }(멤버가 돌아가며 소리 내 읽는 자료).
  · similar_expressions: 같은 뜻의 다른 표현 0~3개(영문).
  · related_vocab: 이 표현과 함께 알면 좋은 확장 어휘 0~4개(audio review식 — 유의어·반의어·관련어). 각 { "word": 영문, "meaning_ko": 한국어 뜻, "relation": "유의어" | "반의어" | "관련어" }.
  · speaking_prompt: 이 표현을 직접 써보게 하는 한국어 질문 (예: "이 표현을 써서 최근 여행 경험을 말해보세요").
  · level: 필수 표현은 "core", 상급 도전 표현은 "stretch".
- listening_mission: 1차 청취 전 학습자가 집중해서 잡아낼 focus 1가지 (한국어 한 문장).
- todays_picks: 오늘 꼭 가져갈 핵심 표현 3개 (key_expressions의 expression 값 중에서 골라 그대로).
- warmup_question: 주제를 여는 가벼운 영문 질문 1개.
- comprehension_questions: 1차 대화 내용 확인 영문 질문 3~5개 (Yes/No가 아닌, 한 문장 이상 답이 나오는 형태).
- discussion_questions: 자기 경험·의견을 묻는 개방형 영문 질문 5개.
- description: 한국어 1~2줄 (이 에피소드가 다루는 내용, 50~120자).
- roleplay: 1차 대화 주제를 응용한 2인 무대 역할극 가이드. scenario(영문 상황 설명), scenario_ko(한국어 번역), role_a/role_b 각각 { name(역할명), description(역할 설명), objectives(이 역할의 목표 2~3개·영문), suggested_phrases(롤플레이에서 쓸 표현 3~5개·key_expressions 활용·영문) }. 멤버 2명이 A/B를 맡아 무대에서 연기하고 나머지는 지켜보는 방식이라, 각 역할이 무엇을 말해야 할지 분명히.
- difficulty / topic.

# 응답 형식
순수 JSON 객체만. 마크다운/코드펜스 없이.

{
  "description": string,
  "dialogue_title": string,
  "dialogue_script": string,
  "warmup_question": string,
  "listening_mission": string,
  "dialogue_segment": { "start_sec": number, "end_sec": number } | null,
  "key_expressions": [
    {
      "expression": string,
      "type": "word" | "phrase" | "pattern",
      "pronunciation": string,
      "part_of_speech": string,
      "meaning_ko": string,
      "meaning_en": string,
      "examples": [{ "en": string, "ko": string }],
      "similar_expressions": [string],
      "related_vocab": [{ "word": string, "meaning_ko": string, "relation": string }],
      "speaking_prompt": string,
      "level": "core" | "stretch"
    }
  ],
  "roleplay": {
    "scenario": string,
    "scenario_ko": string,
    "role_a": { "name": string, "description": string, "objectives": [string], "suggested_phrases": [string] },
    "role_b": { "name": string, "description": string, "objectives": [string], "suggested_phrases": [string] }
  },
  "comprehension_questions": [string],
  "discussion_questions": [string],
  "todays_picks": [string],
  "difficulty": "beginner" | "intermediate" | "advanced",
  "topic": string
}`;

function buildUserPrompt(input: GenInput, transcriptLines: string): string {
  const lines: string[] = [];
  if (input.youtubeTitle) lines.push(`# 영상 제목\n${input.youtubeTitle}`);
  if (input.channelName) lines.push(`# 채널\n${input.channelName}`);
  if (input.currentDifficulty)
    lines.push(`# 사전 지정 난이도\n${input.currentDifficulty} (그대로 사용)`);
  if (input.currentTopic)
    lines.push(`# 사전 지정 토픽\n${input.currentTopic} (그대로 사용)`);
  lines.push(`# 자막 (타임스탬프 포함)\n${transcriptLines}`);
  lines.push(`\n위 자막을 분석해 스키마대로 JSON만 응답해줘.`);
  return lines.join("\n\n");
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function parseRoleplayRole(raw: unknown): RoleplayRole {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    name: typeof r.name === "string" ? r.name : "",
    description: typeof r.description === "string" ? r.description : "",
    objectives: asStringArray(r.objectives),
    suggested_phrases: asStringArray(r.suggested_phrases),
  };
}

function validateOutput(data: unknown): GenOutput {
  if (!data || typeof data !== "object") throw new Error("응답이 객체가 아님");
  const d = data as Record<string, unknown>;
  if (typeof d.description !== "string") throw new Error("description 누락");
  if (typeof d.warmup_question !== "string") throw new Error("warmup_question 누락");
  if (typeof d.listening_mission !== "string") throw new Error("listening_mission 누락");
  if (!Array.isArray(d.key_expressions) || d.key_expressions.length === 0)
    throw new Error("key_expressions 누락");

  // key_expressions 정규화 — 누락 필드는 기본값
  const keyExpressions: KeyExpressionCard[] = (d.key_expressions as unknown[]).map(
    (raw) => {
      const k = (raw ?? {}) as Record<string, unknown>;
      const examples = Array.isArray(k.examples)
        ? (k.examples as unknown[]).map((e) => {
            const ex = (e ?? {}) as Record<string, unknown>;
            return {
              en: typeof ex.en === "string" ? ex.en : "",
              ko: typeof ex.ko === "string" ? ex.ko : "",
            };
          })
        : [];
      const relatedVocab = Array.isArray(k.related_vocab)
        ? (k.related_vocab as unknown[])
            .map((r) => {
              const rv = (r ?? {}) as Record<string, unknown>;
              return {
                word: typeof rv.word === "string" ? rv.word : "",
                meaning_ko: typeof rv.meaning_ko === "string" ? rv.meaning_ko : "",
                relation: typeof rv.relation === "string" ? rv.relation : "관련어",
              };
            })
            .filter((rv) => rv.word)
        : [];
      const exprType: "word" | "phrase" | "pattern" =
        k.type === "phrase" ? "phrase" : k.type === "pattern" ? "pattern" : "word";
      return {
        expression: typeof k.expression === "string" ? k.expression : "",
        type: exprType,
        pronunciation: typeof k.pronunciation === "string" ? k.pronunciation : "",
        part_of_speech: typeof k.part_of_speech === "string" ? k.part_of_speech : "",
        meaning_ko: typeof k.meaning_ko === "string" ? k.meaning_ko : "",
        meaning_en: typeof k.meaning_en === "string" ? k.meaning_en : "",
        examples,
        similar_expressions: asStringArray(k.similar_expressions),
        related_vocab: relatedVocab,
        speaking_prompt:
          typeof k.speaking_prompt === "string" ? k.speaking_prompt : "",
        level: k.level === "stretch" ? "stretch" : "core",
      };
    }
  );
  if (keyExpressions.some((k) => !k.expression))
    throw new Error("key_expressions 항목에 expression 누락");

  // dialogue_segment — 없거나 형식 불일치면 null
  let dialogueSegment: GenOutput["dialogue_segment"] = null;
  const ds = d.dialogue_segment as Record<string, unknown> | null | undefined;
  if (ds && typeof ds.start_sec === "number" && typeof ds.end_sec === "number") {
    dialogueSegment = { start_sec: ds.start_sec, end_sec: ds.end_sec };
  }

  // roleplay — 없거나 핵심 필드가 비면 null
  let roleplay: RoleplayData | null = null;
  const rp = d.roleplay as Record<string, unknown> | null | undefined;
  if (rp && typeof rp === "object") {
    const parsed: RoleplayData = {
      scenario: typeof rp.scenario === "string" ? rp.scenario : "",
      scenario_ko: typeof rp.scenario_ko === "string" ? rp.scenario_ko : "",
      role_a: parseRoleplayRole(rp.role_a),
      role_b: parseRoleplayRole(rp.role_b),
    };
    if (parsed.scenario || parsed.role_a.name || parsed.role_b.name) roleplay = parsed;
  }

  const difficulty: Difficulty =
    typeof d.difficulty === "string" &&
    ["beginner", "intermediate", "advanced"].includes(d.difficulty)
      ? (d.difficulty as Difficulty)
      : "intermediate";

  return {
    description: d.description,
    dialogue_title: typeof d.dialogue_title === "string" ? d.dialogue_title : "",
    dialogue_script: typeof d.dialogue_script === "string" ? d.dialogue_script : "",
    warmup_question: d.warmup_question,
    listening_mission: d.listening_mission,
    dialogue_segment: dialogueSegment,
    dialogue_lines: [], // main 흐름에서 segments + dialogue_segment로 채움
    key_expressions: keyExpressions,
    roleplay,
    comprehension_questions: asStringArray(d.comprehension_questions),
    discussion_questions: asStringArray(d.discussion_questions),
    todays_picks: asStringArray(d.todays_picks),
    difficulty,
    topic: typeof d.topic === "string" ? d.topic : "",
  };
}

// dialogue_segment 구간에 해당하는 자막 라인만 추출 (가라오케용)
function extractDialogueLines(
  segments: TranscriptSegment[],
  seg: { start_sec: number; end_sec: number } | null
): DialogueLine[] {
  if (!seg) return [];
  const startMs = seg.start_sec * 1000;
  const endMs = seg.end_sec * 1000;
  return segments
    .filter((s) => {
      const lineStart = s.offset ?? 0;
      const lineEnd = lineStart + (s.duration ?? 0);
      // 라인이 구간과 겹치면 포함 (시작이 구간 내 OR 끝이 구간 내 OR 라인이 구간을 포함)
      return lineEnd >= startMs && lineStart <= endMs;
    })
    .map((s) => ({
      start_ms: s.offset ?? 0,
      end_ms: (s.offset ?? 0) + (s.duration ?? 0),
      text: (s.text ?? "").trim(),
    }))
    .filter((l) => l.text.length > 0);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = req.headers.get("x-request-id") || generateRequestId();
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // 인증 — admin만
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "인증이 필요합니다" }, 401);
    // 관리자 또는 활성 패널 멤버 (멤버가 /talklish에서 직접 자료 생성 — 관리자 결석 대비)
    if (user.app_metadata?.role !== "admin") {
      const { data: member } = await supabase
        .from("study_panel_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (!member)
        return json({ error: "스터디 패널 멤버만 자료를 만들 수 있습니다" }, 403);
    }

    // 입력 검증
    const input = (await req.json()) as GenInput;
    if (!input.youtubeUrl || !/(youtube\.com|youtu\.be)/.test(input.youtubeUrl)) {
      return json({ error: "유효한 YouTube URL이 필요합니다" }, 400);
    }

    // 1. Supadata 자막 추출
    let segments: TranscriptSegment[];
    try {
      segments = await fetchTranscript(input.youtubeUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return json({ error: `자막 추출 실패: ${msg}` }, 502);
    }
    const transcriptLines = segmentsToLines(segments);

    // 2. GPT 호출
    const userPrompt = buildUserPrompt(input, transcriptLines);
    const t0 = Date.now();
    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 5000,
      }),
    });
    const elapsedMs = Date.now() - t0;

    if (!openaiResp.ok) {
      const errText = await openaiResp.text();
      console.error("[study-podcast-generate] GPT 에러:", errText);
      return json({ error: "AI 생성 실패", detail: errText.slice(0, 500) }, 502);
    }

    const openaiData = await openaiResp.json();
    const content = openaiData.choices?.[0]?.message?.content;
    if (!content) return json({ error: "빈 응답" }, 502);

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return json({ error: "JSON 파싱 실패", raw: content.slice(0, 500) }, 502);
    }

    let result: GenOutput;
    try {
      result = validateOutput(parsed);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return json({ error: `응답 검증 실패: ${msg}`, raw: parsed }, 502);
    }

    // 사전 지정값 강제 반영
    if (input.currentDifficulty) result.difficulty = input.currentDifficulty;
    if (input.currentTopic) result.topic = input.currentTopic;

    // 대화 구간 자막 라인 추출 (가라오케용)
    result.dialogue_lines = extractDialogueLines(segments, result.dialogue_segment);

    return json({
      success: true,
      data: result,
      meta: {
        model: MODEL,
        elapsed_ms: elapsedMs,
        tokens: openaiData.usage,
        transcript_segments: segments.length,
      },
    });
  } catch (error) {
    console.error("[study-podcast-generate] Error:", error);
    return captureAndRespond(error, requestId, "study-podcast-generate", corsHeaders);
  }
});
