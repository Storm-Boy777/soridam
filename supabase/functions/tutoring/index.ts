// tutoring — 튜터링 v3 Edge Function
// Phase A: session-brief, generate-epp, evaluate-timed, evaluate-repair, complete-session
// 라우팅: POST body의 action 필드로 핸들러 분기

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

// GPT 호출 헬퍼 (JSON mode 강제)
async function callGPT(
  systemPrompt: string,
  userPrompt: string,
  model = "gpt-4.1-mini",
  temperature = 0.5,
  maxTokens = 2000,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`GPT API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// JSON 파싱 헬퍼 (안전 파싱 + 폴백)
function parseGPTJson<T>(raw: string): T {
  try {
    // JSON mode 사용 시 보통 깨끗한 JSON이 오지만, 방어적으로 코드블록 제거
    const cleaned = raw
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("GPT JSON parse failed:", raw.slice(0, 300));
    throw new Error(`GPT 응답 파싱 실패: ${(e as Error).message}`);
  }
}

// Supabase 클라이언트 생성
function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// JWT 인증: Authorization 헤더에서 사용자 확인
async function authenticateUser(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("인증 토큰이 없습니다");

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("인증에 실패했습니다");
  return user.id;
}

// ============================================================
// 메인 핸들러
// ============================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 인증 검증
    const userId = await authenticateUser(req);

    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      case "session-brief":
        return await handleSessionBrief(params, userId);
      case "generate-warmup":
        return await handleGenerateWarmup(params);
      case "generate-epp":
        return await handleGenerateEPP(params);
      case "generate-variation":
        return await handleGenerateVariation(params);
      case "generate-transformation":
        return await handleGenerateTransformation(params);
      case "evaluate-timed":
        return await handleEvaluateTimed(params);
      case "evaluate-repair":
        return await handleEvaluateRepair(params);
      case "complete-session":
        return await handleCompleteSession(params, userId);
      default:
        return errorResponse(`Unknown action: ${action}`);
    }
  } catch (err) {
    console.error("Tutoring EF error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message.includes("인증") ? 401 : 500;
    return errorResponse(message, status);
  }
});

// ============================================================
// A-5: session-brief — Screen 0 데이터 생성
// ============================================================

async function handleSessionBrief(params: {
  training_session_id: string;
  prescription_id: string;
}, userId: string) {
  const supabase = getSupabase();

  // 처방 + 훈련 세션 조회 (user_id 검증 포함)
  const [{ data: prescription }, { data: trainingSession }] = await Promise.all([
    supabase
      .from("tutoring_prescriptions")
      .select("*")
      .eq("id", params.prescription_id)
      .eq("user_id", userId)
      .single(),
    supabase
      .from("tutoring_training_sessions")
      .select("*")
      .eq("id", params.training_session_id)
      .eq("user_id", userId)
      .single(),
  ]);

  if (!prescription || !trainingSession) {
    return errorResponse("처방 또는 훈련 세션을 찾을 수 없습니다");
  }

  const weaknessTags = prescription.weakness_tags || [];
  const questionType = prescription.question_type;

  const systemPrompt = `You are an OPIc speaking coach for Korean learners.
Generate a session brief in Korean (한국어).
Return JSON only, no markdown.`;

  const userPrompt = `Generate a training session brief for:
- Question type: ${questionType}
- Weakness tags: ${weaknessTags.join(", ")}
- Current level: ${trainingSession.target_grade || "IM2"}
- Priority: ${prescription.priority}

Return this JSON:
{
  "session_goal": "오늘 세션 목표 1문장 (한국어)",
  "weaknesses": ["약점1", "약점2"],
  "forbidden_habit": "금지 습관 1개 (한국어)",
  "success_criteria": [
    {"criteria": "성공 기준 1", "met": false},
    {"criteria": "성공 기준 2", "met": false},
    {"criteria": "성공 기준 3", "met": false}
  ],
  "estimated_minutes": 25
}`;

  const raw = await callGPT(systemPrompt, userPrompt, "gpt-4.1-mini", 0.5, 500);
  const brief = parseGPTJson<Record<string, unknown>>(raw);

  // 훈련 세션에 목표/기준 저장
  await supabase
    .from("tutoring_training_sessions")
    .update({
      session_goal: brief.session_goal as string,
      success_criteria: brief.success_criteria,
    })
    .eq("id", params.training_session_id);

  return jsonResponse({ brief });
}

// ============================================================
// B-1: generate-warmup — Screen 1 워밍업 모범 답변 생성
// ============================================================

async function handleGenerateWarmup(params: {
  training_session_id: string;
  question_type: string;
  target_grade: string;
  text_policy: "full" | "keywords" | "off";
}) {
  const supabase = getSupabase();

  // 해당 유형의 질문 1개 랜덤 선택
  const { data: questions } = await supabase
    .from("questions")
    .select("id, question_english, question_korean, question_type_eng, topic")
    .eq("question_type_eng", params.question_type)
    .eq("category", "일반")
    .limit(10);

  const question =
    questions && questions.length > 0
      ? questions[Math.floor(Math.random() * questions.length)]
      : null;

  const questionData = question
    ? { id: question.id, english: question.question_english, korean: question.question_korean }
    : { id: "", english: "Tell me about something you do regularly.", korean: "" };

  const levelGuide = params.target_grade.startsWith("I")
    ? "IM level (3-5 sentences, simple connectors)"
    : params.target_grade.startsWith("A")
      ? "AL level (5-7 sentences, complex structures)"
      : "IL level (2-3 sentences, basic vocabulary)";

  const systemPrompt = `You are an OPIc speaking coach for Korean learners.
Generate a model answer for shadowing warmup practice.
The answer should be natural, conversational English at ${levelGuide}.
All Korean text in 한국어. Return JSON only.`;

  const userPrompt = `Generate a model answer for warmup shadowing:
- Question: ${questionData.english}
- Question type: ${params.question_type}
- Target level: ${params.target_grade}

Return this JSON:
{
  "question": ${JSON.stringify(questionData)},
  "model_answer": "Full model answer in English (natural, conversational)",
  "sentences": [
    {
      "english": "English sentence 1",
      "korean": "한국어 번역 1",
      "keywords": ["key", "words"]
    }
  ],
  "rhythm_tips": ["한국어 리듬 팁 1", "한국어 리듬 팁 2"],
  "key_expressions": ["expression 1", "expression 2"]
}`;

  const raw = await callGPT(systemPrompt, userPrompt, "gpt-4.1-mini", 0.6, 1000);
  const warmup = parseGPTJson<Record<string, unknown>>(raw);

  return jsonResponse({ warmup });
}

// ============================================================
// A-6: generate-epp — Screen 2 EPP 패턴 생성
// ============================================================

async function handleGenerateEPP(params: {
  training_session_id: string;
  question_type: string;
  target_grade: string;
  weakness_tags: string[];
}) {
  const supabase = getSupabase();

  // 해당 유형의 질문 1개 랜덤 선택
  const { data: questions } = await supabase
    .from("questions")
    .select("id, question_english, question_korean, question_type_eng, topic")
    .eq("question_type_eng", params.question_type)
    .eq("category", "일반")
    .limit(10);

  const question =
    questions && questions.length > 0
      ? questions[Math.floor(Math.random() * questions.length)]
      : null;

  const systemPrompt = `You are an OPIc speaking coach for Korean learners.
Generate EPP (Essential Pattern Pack) cards for OPIc practice.
All explanations in Korean (한국어). Pattern templates in English.
Return JSON only, no markdown.`;

  const questionData = question
    ? { id: question.id, english: question.question_english, korean: question.question_korean }
    : { id: "", english: "Describe something you do regularly", korean: "" };

  const userPrompt = `Generate EPP patterns for:
- Question type: ${params.question_type}
- Target level: ${params.target_grade}
- Question: ${questionData.english}
- Weakness tags: ${params.weakness_tags.join(", ")}
- Question data: ${JSON.stringify(questionData)}

Return this JSON:
{
  "question": ${JSON.stringify(questionData)},
  "epp_cards": [
    {
      "template": "English sentence template with [slots]",
      "korean_hint": "한국어 힌트",
      "slots": ["slot1", "slot2"]
    }
  ],
  "required_connectors": ["First of all", "For example"],
  "forbidden_patterns": ["I think so", "Something like that"],
  "tip": "한국어 팁 1문장"
}`;

  const raw = await callGPT(systemPrompt, userPrompt, "gpt-4.1-mini", 0.6, 800);
  const epp = parseGPTJson<Record<string, unknown>>(raw);

  return jsonResponse({ epp });
}

// ============================================================
// B-2: generate-variation — Screen 3 변형 카드 생성
// ============================================================

async function handleGenerateVariation(params: {
  training_session_id: string;
  question_type: string;
  target_grade: string;
  weakness_tags: string[];
  variation_changes: number;
}) {
  const supabase = getSupabase();

  // 같은 유형의 질문 여러 개 선택 (변형 카드용)
  const { data: questions } = await supabase
    .from("questions")
    .select("id, question_english, question_korean, question_type_eng, topic")
    .eq("question_type_eng", params.question_type)
    .eq("category", "일반")
    .limit(20);

  const shuffled = (questions || []).sort(() => Math.random() - 0.5);
  const selectedQs = shuffled.slice(0, 3);

  const systemPrompt = `You are an OPIc speaking coach for Korean learners.
Generate Forced Variation cards for speaking practice. Each card forces the learner to adapt their answer to a different condition.
All Korean text in 한국어. Return JSON only.`;

  const userPrompt = `Generate ${Math.min(3, params.variation_changes + 1)} Forced Variation cards:
- Question type: ${params.question_type}
- Target level: ${params.target_grade}
- Weakness tags: ${params.weakness_tags.join(", ")}
- Changes per card: ${params.variation_changes}
- Available questions: ${JSON.stringify(selectedQs.map(q => ({
    id: q.id,
    english: q.question_english,
    korean: q.question_korean,
  })))}

Each card should force ONE type of variation:
1. Time change: "now" vs "used to" / "past" vs "present"
2. Condition change: "alone" vs "with friends" / "weekday" vs "weekend"
3. Comparison: A vs B
4. Reason reversal: "like but 1 downside" / "dislike but 1 upside"

Return this JSON:
{
  "variation_cards": [
    {
      "question": {"id": "...", "english": "...", "korean": "..."},
      "variation_type": "time_change | condition_change | comparison | reason_reversal",
      "instruction": "한국어 지시 (예: '과거형으로 바꿔서 말해보세요')",
      "forced_mission": {
        "connector": "Required connector (e.g. 'However', 'On the other hand')",
        "detail_prompt": "한국어 디테일 요구 (예: '구체적인 장소 1개를 포함하세요')"
      },
      "time_limit_seconds": 40,
      "example_starter": "English starter sentence"
    }
  ]
}`;

  const raw = await callGPT(systemPrompt, userPrompt, "gpt-4.1-mini", 0.7, 1200);
  const variation = parseGPTJson<Record<string, unknown>>(raw);

  return jsonResponse({ variation });
}

// ============================================================
// B-3: generate-transformation — Screen 3 구두 변환 카드 생성
// ============================================================

async function handleGenerateTransformation(params: {
  training_session_id: string;
  question_type: string;
  target_grade: string;
}) {
  const systemPrompt = `You are an OPIc speaking coach for Korean learners.
Generate Oral Transformation cards for rapid speaking drill.
Each card shows a simple sentence and asks the learner to transform it instantly.
All Korean text in 한국어. Return JSON only.`;

  const cardCount = params.target_grade.startsWith("A") ? 10
    : params.target_grade.startsWith("IH") ? 8
    : 6;

  const userPrompt = `Generate ${cardCount} Oral Transformation cards:
- Question type: ${params.question_type}
- Target level: ${params.target_grade}

Transformation types to include (mix them):
- Tense change: present → past / past → present perfect
- Add reason: statement → statement + because...
- Comparison: statement → compared to X, ...
- Subjunctive: statement → If I had/could...
- Expansion: short → add detail/example

Return this JSON:
{
  "transformation_cards": [
    {
      "original": "Simple English sentence",
      "transform_type": "tense_change | add_reason | comparison | subjunctive | expansion",
      "instruction": "한국어 변환 지시 (예: '과거형으로 바꾸세요')",
      "expected_pattern": "Expected answer pattern (e.g. 'I used to...')",
      "time_limit_seconds": 4
    }
  ]
}`;

  const raw = await callGPT(systemPrompt, userPrompt, "gpt-4.1-mini", 0.7, 1200);
  const transformation = parseGPTJson<Record<string, unknown>>(raw);

  return jsonResponse({ transformation });
}

// ============================================================
// A-6: evaluate-timed — Screen 4 타임드 실전 평가
// ============================================================

async function handleEvaluateTimed(params: {
  training_session_id: string;
  question_id: string;
  question_english: string;
  question_type: string;
  user_answer: string;
  audio_duration_seconds: number;
  target_grade: string;
}) {
  const systemPrompt = `You are an OPIc speaking coach for Korean learners.
Evaluate a timed practice response. Focus on structure, content blocks, and time management.
All feedback in Korean (한국어). Return JSON only.`;

  const userPrompt = `Evaluate this OPIc response:
- Question: ${params.question_english}
- Question type: ${params.question_type}
- Target level: ${params.target_grade}
- Duration: ${params.audio_duration_seconds}s
- Response: "${params.user_answer}"

Return this JSON:
{
  "block_checklist": {
    "opening": {"met": true, "comment": "한국어 코멘트"},
    "background": {"met": false, "comment": "한국어 코멘트"},
    "detail": {"met": false, "comment": "한국어 코멘트"},
    "emotion": {"met": false, "comment": "한국어 코멘트"},
    "closing": {"met": true, "comment": "한국어 코멘트"}
  },
  "structure_score": 7,
  "content_score": 6,
  "time_management": "적절 | 부족 | 과도",
  "grammar_issues": [
    {"original": "English error", "corrected": "English corrected", "rule": "한국어 규칙"}
  ],
  "strengths": ["한국어 강점1"],
  "improvements": ["한국어 개선점1"],
  "overall_comment": "한국어 총평 2문장",
  "passed": true
}`;

  const raw = await callGPT(systemPrompt, userPrompt, "gpt-4.1", 0.3, 1200);
  const evaluation = parseGPTJson<Record<string, unknown>>(raw);

  return jsonResponse({ evaluation });
}

// ============================================================
// A-7: evaluate-repair — Screen 5 Self-repair 평가
// ============================================================

async function handleEvaluateRepair(params: {
  training_session_id: string;
  original_text: string;
  errors: Array<{ text: string; type: string }>;
  repair_text: string;
  repair_phrase: string;
}) {
  const systemPrompt = `You are an OPIc speaking coach for Korean learners.
Evaluate a self-repair attempt. Compare before/after and assess naturalness.
All feedback in Korean (한국어). Return JSON only.`;

  const userPrompt = `Evaluate self-repair:
- Original: "${params.original_text}"
- Errors highlighted: ${JSON.stringify(params.errors)}
- Repair phrase used: "${params.repair_phrase}"
- Repaired version: "${params.repair_text}"

Return this JSON:
{
  "repair_quality": "excellent | good | needs_work",
  "corrections_addressed": ${params.errors.length},
  "corrections_fixed": 0,
  "naturalness_score": 7,
  "before_after_comparison": "한국어 비교 설명 1문장",
  "tip": "한국어 개선 팁 1문장",
  "passed": true
}`;

  const raw = await callGPT(systemPrompt, userPrompt, "gpt-4.1-mini", 0.3, 500);
  const evaluation = parseGPTJson<Record<string, unknown>>(raw);

  return jsonResponse({ evaluation });
}

// ============================================================
// A-5: complete-session — Screen 6 리캡 생성
// ============================================================

async function handleCompleteSession(params: {
  training_session_id: string;
}, userId: string) {
  const supabase = getSupabase();

  // 훈련 세션 + 시도 기록 조회 (user_id 검증 포함)
  const [{ data: ts }, { data: attempts }] = await Promise.all([
    supabase
      .from("tutoring_training_sessions")
      .select("*")
      .eq("id", params.training_session_id)
      .eq("user_id", userId)
      .single(),
    supabase
      .from("tutoring_attempts")
      .select("*")
      .eq("training_session_id", params.training_session_id)
      .order("created_at"),
  ]);

  if (!ts) return errorResponse("훈련 세션을 찾을 수 없습니다");

  const attemptList = attempts || [];
  const passedCount = attemptList.filter((a: { passed: boolean }) => a.passed).length;
  const totalCount = attemptList.length;

  const systemPrompt = `You are an OPIc speaking coach for Korean learners.
Generate a session recap in Korean (한국어). Be encouraging but specific.
Return JSON only, no markdown.`;

  const userPrompt = `Generate a recap for the completed training session:
- Question type: ${ts.question_type}
- Session goal: ${ts.session_goal || "훈련 완료"}
- Total attempts: ${totalCount}
- Passed attempts: ${passedCount}
- Screens completed: ${ts.screens_completed || 0}
- Success criteria: ${JSON.stringify(ts.success_criteria || [])}

Return this JSON:
{
  "best_improvement": "가장 좋아진 점 1문장 (한국어)",
  "next_focus": "다음에 고칠 1개 (한국어)",
  "kpi_summary": "KPI 달성 여부 요약 (한국어)",
  "encouragement": "격려 메시지 1문장 (한국어)",
  "next_recommendation": {
    "type": "same_type_different_topic | weakness_switch | mini_simulation",
    "reason": "한국어 추천 이유"
  }
}`;

  const raw = await callGPT(systemPrompt, userPrompt, "gpt-4.1-mini", 0.5, 500);
  const recap = parseGPTJson<Record<string, unknown>>(raw);

  // 훈련 세션 완료 처리
  await supabase
    .from("tutoring_training_sessions")
    .update({
      completed_at: new Date().toISOString(),
      next_recommendation: recap.next_recommendation,
    })
    .eq("id", params.training_session_id);

  return jsonResponse({ recap });
}
