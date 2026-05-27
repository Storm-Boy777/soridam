// study-freetalk-generate
// 테마 + 난이도를 받아 금요일(Free Talk) 게임 세트 콘텐츠를 한 번에 생성한다.
// 월요일 study-podcast-generate와 동일한 패턴: EF는 "생성만" 하고 저장하지 않는다.
// 클라이언트(FridayPrepare)가 미리보기·선별 후 SA(createTalklishGameSet)로 저장한다.
//
// 흐름: theme + difficulty → GPT(gpt-4.1-mini) → 게임 세트 JSON
//
// 출력 배열:
//   - spinner_topics  토픽 스피너 / JAM 모드 주제
//   - taboo           Taboo(설명) + 스무고개(추측) 공용 단어 카드
//   - wyr             Would You Rather 딜레마
//   - roleplay        2인 무대 역할극 (OPIc 롤플레이 직결)
//   - story           한 문장 이어쓰기 시작 문장
//   - debate          찬반 토론 명제

import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateRequestId, captureAndRespond } from "../_shared/errorLogger.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const MODEL = "gpt-4.1-mini";

type Difficulty = "beginner" | "intermediate" | "advanced";
type Category = "daily" | "opinions" | "hypothetical" | "culture" | "current";

interface GenInput {
  theme: string;
  difficulty?: Difficulty;
}

interface SpinnerTopic {
  english: string;
  korean: string;
  follow_up: string;
  category: Category;
}
interface TabooCard {
  target: string;
  forbidden: string[];
}
interface WyrCard {
  optionA: string;
  optionB: string;
}
interface RoleplayCard {
  title: string;
  situation: string;
  situation_ko: string;
  role_a: { name: string; mission: string };
  role_b: { name: string; mission: string };
  phrases: string[];
  emotion: string;
}
interface StoryCard {
  opening: string;
  genre: string;
}
interface DebateCard {
  topic: string;
  context: string;
  proPoints: string[];
  conPoints: string[];
}

interface GenOutput {
  theme: string;
  difficulty: Difficulty;
  description: string;
  spinner_topics: SpinnerTopic[];
  taboo: TabooCard[];
  wyr: WyrCard[];
  roleplay: RoleplayCard[];
  story: StoryCard[];
  debate: DebateCard[];
}

const SYSTEM_PROMPT = `너는 영어 회화 게임 콘텐츠 설계 전문가다. 한국 OPIc 학습자들이 오프라인 스터디 모임(6명·큰 모니터에 띄우고 진행)의 "금요일 — 가볍게 말로 푸는 게임 밤"에서 쓸 콘텐츠를 만든다.

금요일의 철학: 점수도 평가도 없다. 그냥 영어로 입을 자주 여는 시간. 즐겁고 부담 없되, OPIc 실전에 도움 되는 표현·상황을 자연스럽게 녹인다.

# 입력
하나의 테마(예: "여행", "음식", "직장")와 난이도를 받는다. 모든 게임 콘텐츠를 그 테마에 묶어, 하룻밤이 하나의 세계관으로 흐르게 한다.

# 난이도 보정
- beginner: 쉬운 어휘·짧은 문장. 일상적이고 구체적.
- intermediate: 자연스러운 구어체. 의견·경험을 말하게.
- advanced: 미묘한 뉘앙스·추상 주제·찬반 논점.

# 게임별 콘텐츠 (모두 테마에 연결)

1) spinner_topics — 토픽 스피너 / 1분 자유 발화 주제 (4~6개)
   각 { "english": 발화 주제/질문, "korean": 자연스러운 한국어 번역, "follow_up": 후속 영문 질문 1개, "category": "daily"|"opinions"|"hypothetical"|"culture"|"current" }
   한국어는 사전식 직역이 아니라 실제 한국인이 그 질문을 던질 때의 말투로.

2) taboo — 금지어 설명 + 스무고개 공용 단어 카드 (5~6개)
   각 { "target": 테마 관련 명사 단어(추측 가능한 사물·장소·개념), "forbidden": 그 단어 설명에 가장 쓰기 쉬운 금지어 정확히 5개(영문) }
   target은 한 단어 또는 짧은 명사구. 너무 추상적이지 않게(설명·추측이 가능해야 함).

3) wyr — Would You Rather 딜레마 (4~6개)
   각 { "optionA": 선택지 A(영문), "optionB": 선택지 B(영문) }
   테마와 연결된, 이유를 말하고 싶어지는 흥미로운 양자택일.

4) roleplay — 2인 무대 역할극 (3~4개). OPIc 11~13번 롤플레이 직결이라 가장 중요.
   각 {
     "title": 한국어 짧은 상황 제목,
     "situation": 영문 상황 설명(2인이 무엇을 하는지),
     "situation_ko": 한국어 번역,
     "role_a": { "name": "역할명 · 한글", "mission": 그 역할이 할 일(한국어) },
     "role_b": { "name": "역할명 · 한글", "mission": 그 역할이 할 일(한국어) },
     "phrases": 이 상황에서 쓸 유용한 영문 표현 4개,
     "emotion": 감정 연기 미션(한국어, 예: "😤 짜증 → 🙂 누그러짐")
   }
   실제 일상 상황(주문·문의·항의·예약·약속·분실 등)을 테마에 맞게. 감탄·좌절·놀람 같은 리액션을 넣도록 emotion에 명시.

5) story — 한 문장 이어쓰기 시작 문장 (3개)
   각 { "opening": 영문 시작 문장, "genre": 장르 힌트(영문 한 단어, 예: "Mystery") }
   다음 사람이 이어 붙이고 싶어지는 열린 시작.

6) debate — 찬반 토론 명제 (2개)
   각 { "topic": 영문 찬반 명제(한 문장), "context": 영문 배경 1~2문장, "proPoints": 찬성 근거 3개(영문), "conPoints": 반대 근거 3개(영문) }
   proPoints는 명제를 지지하는 논점, conPoints는 반대하는 논점.

# 응답 형식
순수 JSON 객체만. 마크다운/코드펜스 없이.

{
  "theme": string,
  "difficulty": "beginner" | "intermediate" | "advanced",
  "description": string,
  "spinner_topics": [{ "english": string, "korean": string, "follow_up": string, "category": string }],
  "taboo": [{ "target": string, "forbidden": [string, string, string, string, string] }],
  "wyr": [{ "optionA": string, "optionB": string }],
  "roleplay": [{ "title": string, "situation": string, "situation_ko": string, "role_a": { "name": string, "mission": string }, "role_b": { "name": string, "mission": string }, "phrases": [string], "emotion": string }],
  "story": [{ "opening": string, "genre": string }],
  "debate": [{ "topic": string, "context": string, "proPoints": [string], "conPoints": [string] }]
}`;

function buildUserPrompt(input: GenInput): string {
  const diff = input.difficulty ?? "intermediate";
  return [
    `# 테마\n${input.theme}`,
    `# 난이도\n${diff}`,
    `\n위 테마와 난이도로 금요일 게임 세트를 스키마대로 JSON만 응답해줘. description은 이 세트가 어떤 분위기·내용인지 한국어 1~2줄(50~100자).`,
  ].join("\n\n");
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

const CATEGORIES: Category[] = ["daily", "opinions", "hypothetical", "culture", "current"];

function validateOutput(data: unknown, input: GenInput): GenOutput {
  if (!data || typeof data !== "object") throw new Error("응답이 객체가 아님");
  const d = data as Record<string, unknown>;

  const spinner_topics: SpinnerTopic[] = (Array.isArray(d.spinner_topics) ? d.spinner_topics : [])
    .map((raw) => {
      const t = (raw ?? {}) as Record<string, unknown>;
      const cat = CATEGORIES.includes(t.category as Category) ? (t.category as Category) : "daily";
      return { english: str(t.english), korean: str(t.korean), follow_up: str(t.follow_up), category: cat };
    })
    .filter((t) => t.english);

  const taboo: TabooCard[] = (Array.isArray(d.taboo) ? d.taboo : [])
    .map((raw) => {
      const t = (raw ?? {}) as Record<string, unknown>;
      return { target: str(t.target), forbidden: asStringArray(t.forbidden).slice(0, 6) };
    })
    .filter((t) => t.target);

  const wyr: WyrCard[] = (Array.isArray(d.wyr) ? d.wyr : [])
    .map((raw) => {
      const t = (raw ?? {}) as Record<string, unknown>;
      return { optionA: str(t.optionA), optionB: str(t.optionB) };
    })
    .filter((t) => t.optionA && t.optionB);

  const roleplay: RoleplayCard[] = (Array.isArray(d.roleplay) ? d.roleplay : [])
    .map((raw) => {
      const t = (raw ?? {}) as Record<string, unknown>;
      const ra = (t.role_a ?? {}) as Record<string, unknown>;
      const rb = (t.role_b ?? {}) as Record<string, unknown>;
      return {
        title: str(t.title),
        situation: str(t.situation),
        situation_ko: str(t.situation_ko),
        role_a: { name: str(ra.name), mission: str(ra.mission) },
        role_b: { name: str(rb.name), mission: str(rb.mission) },
        phrases: asStringArray(t.phrases),
        emotion: str(t.emotion),
      };
    })
    .filter((t) => t.situation && (t.role_a.name || t.role_b.name));

  const story: StoryCard[] = (Array.isArray(d.story) ? d.story : [])
    .map((raw) => {
      const t = (raw ?? {}) as Record<string, unknown>;
      return { opening: str(t.opening), genre: str(t.genre) };
    })
    .filter((t) => t.opening);

  const debate: DebateCard[] = (Array.isArray(d.debate) ? d.debate : [])
    .map((raw) => {
      const t = (raw ?? {}) as Record<string, unknown>;
      return {
        topic: str(t.topic),
        context: str(t.context),
        proPoints: asStringArray(t.proPoints),
        conPoints: asStringArray(t.conPoints),
      };
    })
    .filter((t) => t.topic);

  // 최소 1개 게임이라도 나와야 의미 있음
  const total = spinner_topics.length + taboo.length + wyr.length + roleplay.length + story.length + debate.length;
  if (total === 0) throw new Error("생성된 게임 콘텐츠가 비어 있음");

  const difficulty: Difficulty =
    typeof d.difficulty === "string" && ["beginner", "intermediate", "advanced"].includes(d.difficulty)
      ? (d.difficulty as Difficulty)
      : input.difficulty ?? "intermediate";

  return {
    theme: str(d.theme) || input.theme,
    difficulty,
    description: str(d.description),
    spinner_topics,
    taboo,
    wyr,
    roleplay,
    story,
    debate,
  };
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
    // 인증 — 관리자 또는 활성 패널 멤버 (월요일 EF와 동일)
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
    if (user.app_metadata?.role !== "admin") {
      const { data: member } = await supabase
        .from("study_panel_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (!member) return json({ error: "스터디 패널 멤버만 자료를 만들 수 있습니다" }, 403);
    }

    // 입력 검증
    const input = (await req.json()) as GenInput;
    if (!input.theme || !input.theme.trim()) {
      return json({ error: "테마가 필요합니다" }, 400);
    }

    // GPT 호출
    const userPrompt = buildUserPrompt(input);
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
        temperature: 0.7,
        max_tokens: 6000,
      }),
    });
    const elapsedMs = Date.now() - t0;

    if (!openaiResp.ok) {
      const errText = await openaiResp.text();
      console.error("[study-freetalk-generate] GPT 에러:", errText);
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
      result = validateOutput(parsed, input);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return json({ error: `응답 검증 실패: ${msg}`, raw: parsed }, 502);
    }

    if (input.difficulty) result.difficulty = input.difficulty;

    return json({
      success: true,
      data: result,
      meta: {
        model: MODEL,
        elapsed_ms: elapsedMs,
        tokens: openaiData.usage,
      },
    });
  } catch (error) {
    console.error("[study-freetalk-generate] Error:", error);
    return captureAndRespond(error, requestId, "study-freetalk-generate", corsHeaders);
  }
});
