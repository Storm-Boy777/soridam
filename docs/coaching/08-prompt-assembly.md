# 08. Prompt Assembly — 두 Pass 조립

> **위치**: `supabase/functions/coaching-evaluate/index.ts`.
> **흐름**: `processAttempt()` → `runPass1()` → `runPass2()` → validate → DB 저장.

---

## TL;DR

> Pass1과 Pass2는 같은 Layer 1~3을 공유하되, Layer 5/6은 분리. 두 GPT 호출로 평가와 생성 책임 명확히 분리.

---

## 1. EF processAttempt 메인 흐름

```ts
async function processAttempt(supabase, body) {
  // 1. attempt + session + question fetch
  const { attempt, session, question } = await fetchAttemptContext(supabase, body.attempt_id);

  // 2. preprocess (raw → cleaned transcript)
  const preprocessed = await callPreprocessEF(attempt.raw_transcript);

  // 3. Layers 조립
  const layers = await fetchAllLayers(supabase, {
    session,
    question,
    attempt,
    cleanedTranscript: preprocessed.cleaned_transcript,
  });

  // 4. Pass 1 — 평가
  const pass1 = await runPass1(supabase, layers);

  // 5. Pass1 검증
  validatePass1Output(pass1, layers.gradeLayer.target_level);

  // 6. Pass 2 — 생성 (Pass1 결과를 input으로)
  const pass2 = await runPass2(supabase, layers, pass1);

  // 7. Pass2 검증
  validatePass2Output(pass2, layers.gradeLayer.target_level);

  // 8. 최종 coaching_json 조립
  const coachingJson = mergePassOutputs(pass1, pass2);

  // 9. DB 저장
  await supabase
    .from("coaching_attempts")
    .update({
      coaching_json: coachingJson,
      status: "completed",
    })
    .eq("id", body.attempt_id);

  return { ok: true };
}
```

---

## 2. fetchAllLayers — 4 Layer 동시 조회

```ts
async function fetchAllLayers(supabase, params): Promise<CoachingLayers> {
  const { session, question, attempt, cleanedTranscript } = params;

  // Layer 1 — System Core (단일 row)
  const { data: systemCore } = await supabase
    .from("ai_prompt_templates")
    .select("system_prompt, model, temperature, max_tokens")
    .eq("template_id", "coaching_system")
    .eq("is_active", true)
    .single();

  // Layer 2 — Grade Layer (target_level 매칭)
  const { data: gradeLayer } = await supabase
    .from("coaching_grade_layer")
    .select("*")
    .eq("target_level", session.target_level)
    .single();

  // Layer 3 — Type Overlay (question_type 매칭, 돌발이면 description_random)
  const typeId = resolveTypeOverlay({
    survey_type: question.survey_type,
    category: question.category,
    topic: question.topic,
    question_type_eng: question.question_type_eng,
  });
  const { data: typeOverlay } = await supabase
    .from("coaching_type_overlay")
    .select("*")
    .eq("type_id", typeId)
    .single();

  // Layer 4 — Session Context (직전 1~3 회차 attempts)
  const sessionContext = await fetchSessionContext(
    supabase, session.id, attempt.attempt_number,
  );

  return {
    systemCore,
    gradeLayer,
    typeOverlay,
    sessionContext,
    studentTranscript: cleanedTranscript,
    audioMeta: {
      word_count: countWords(cleanedTranscript),
      filler_count: countFillers(cleanedTranscript),
      duration_sec: attempt.audio_duration ?? 0,
    },
  };
}
```

---

## 3. runPass1 — 평가 호출

```ts
async function runPass1(supabase, layers): Promise<Pass1Output> {
  const userPrompt = assemblePass1Prompt(layers);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: layers.systemCore.system_prompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,    // 평가는 낮은 변동성
      max_tokens: 2000,
      response_format: { type: "json_object" },
    }),
  });

  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  return parsed as Pass1Output;
}

function assemblePass1Prompt(layers): string {
  const lines: string[] = [];

  // ⓘ LEVEL GATE
  lines.push(`## TARGET LEVEL: ${layers.gradeLayer.target_level}`);
  lines.push("");
  lines.push("### Grade Layer constraints");
  lines.push("```json");
  lines.push(JSON.stringify(layers.gradeLayer.speech_constraints, null, 2));
  lines.push("```");
  lines.push("");

  // Type Overlay
  lines.push(`## Type Overlay: ${layers.typeOverlay.type_id}`);
  lines.push("");
  lines.push("### reasoning_flow");
  lines.push("```json");
  lines.push(JSON.stringify(layers.typeOverlay.reasoning_flow, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("### intervention_triggers");
  lines.push("```json");
  lines.push(JSON.stringify(layers.typeOverlay.intervention_triggers, null, 2));
  lines.push("```");
  lines.push("");
  if (layers.typeOverlay.optional_examples) {
    lines.push("### optional_examples (reference only — do NOT mandate)");
    lines.push("```json");
    lines.push(JSON.stringify(layers.typeOverlay.optional_examples, null, 2));
    lines.push("```");
    lines.push("");
  }

  // Session Context
  lines.push(`## Session Context (Attempt ${layers.sessionContext.attempt_number})`);
  lines.push("```json");
  lines.push(JSON.stringify(layers.sessionContext, null, 2));
  lines.push("```");
  lines.push("");

  // Student Transcript
  lines.push("## Student Transcript (cleaned)");
  lines.push("```");
  lines.push(layers.studentTranscript);
  lines.push("```");
  lines.push("");
  lines.push("## Audio Meta");
  lines.push("```json");
  lines.push(JSON.stringify(layers.audioMeta, null, 2));
  lines.push("```");
  lines.push("");

  // Pass1 TASK
  lines.push("## TASK — PASS 1: Evaluation Only");
  lines.push("");
  lines.push("Identify the highest score-impact issues. Do NOT generate a model answer.");
  lines.push("");
  lines.push("Output strict JSON matching Pass1Output schema:");
  lines.push("```");
  lines.push("{");
  lines.push('  "evaluation_summary": { discourse_quality, level_fit, sustainment, filler_naturalness },');
  lines.push('  "issues": [...],');
  lines.push('  "session_progression": { previous_issues_resolved, previous_issues_still_present, recurring_pattern_action },');
  lines.push('  "repair_plan_for_pass2": { top_issue_to_address, preservation_anchors, what_to_change, what_NOT_to_change, target_level_after_fix, expected_word_count }');
  lines.push("}");
  lines.push("```");

  return lines.join("\n");
}
```

---

## 4. runPass2 — 생성 호출

```ts
async function runPass2(supabase, layers, pass1): Promise<Pass2Output> {
  const userPrompt = assemblePass2Prompt(layers, pass1);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: layers.systemCore.system_prompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.65,   // 생성은 약간 변동성 허용
      max_tokens: 2000,
      response_format: { type: "json_object" },
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content) as Pass2Output;
}

function assemblePass2Prompt(layers, pass1): string {
  const lines: string[] = [];

  // Layer 1~3 (같은 컨텍스트)
  lines.push(`## TARGET LEVEL: ${layers.gradeLayer.target_level}`);
  lines.push("```json");
  lines.push(JSON.stringify(layers.gradeLayer.speech_constraints, null, 2));
  lines.push("```");
  lines.push("");

  lines.push(`## Type Overlay: ${layers.typeOverlay.type_id}`);
  lines.push("```json");
  lines.push(JSON.stringify({
    reasoning_flow: layers.typeOverlay.reasoning_flow,
    optional_examples: layers.typeOverlay.optional_examples,
  }, null, 2));
  lines.push("```");
  lines.push("");

  // Student Transcript
  lines.push("## Student Transcript");
  lines.push("```");
  lines.push(layers.studentTranscript);
  lines.push("```");
  lines.push("");

  // Pass1 Output (repair_plan + top issue)
  lines.push("## PASS 1 OUTPUT — repair_plan + top issue");
  lines.push("```json");
  lines.push(JSON.stringify(pass1.repair_plan_for_pass2, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("Top issue to address:");
  lines.push("```json");
  lines.push(JSON.stringify(pass1.issues[0], null, 2));
  lines.push("```");
  lines.push("");

  // Pass2 TASK
  lines.push("## TASK — PASS 2: Generation Only");
  lines.push("");
  lines.push("Generate a model answer that:");
  lines.push("  1. Preserves the student's original story (preservation_anchors).");
  lines.push("  2. Addresses ONLY the top_issue_to_address.");
  lines.push("  3. Stays within target_level constraints.");
  lines.push("  4. Sounds naturally speakable (not a written essay).");
  lines.push("  5. Substitutes vocabulary minimally (1-2 max), only at highest-frequency repeats.");
  lines.push("");
  lines.push("Output strict JSON matching Pass2Output schema:");
  lines.push("```");
  lines.push("{");
  lines.push('  "model_answer": { text, preservation_check, changes, level_fit_check },');
  lines.push('  "action_items": [...],');
  lines.push('  "closing_message": "..."');
  lines.push("}");
  lines.push("```");

  return lines.join("\n");
}
```

---

## 5. mergePassOutputs — 최종 coaching_json 조립

```ts
function mergePassOutputs(pass1, pass2): CoachingJsonV6 {
  return {
    intro: generateIntro(pass1.evaluation_summary, pass1.session_progression),
    progress_table: pass1.evaluation_summary,
    issues: pass1.issues,
    session_progression: pass1.session_progression,
    model_answer: pass2.model_answer,
    action_items: pass2.action_items,
    closing: pass2.closing_message,
  };
}

function generateIntro(summary, progression): string {
  // 격려 + 진척 + 다음 단계 한두 문장
  // Pass1 evaluation_summary와 session_progression을 한국어로 직조
  // (또는 별도 GPT 호출 — 매우 작아서 옵션)
  return `1회차 답변 잘 하셨어요! ${summary.discourse_quality}에 도달했어요. ...`;
}
```

---

## 6. 검증 함수

```ts
function validatePass1Output(pass1, targetLevel) {
  // 1. issue_count level limit
  const limit = ISSUE_COUNT_LIMITS[targetLevel];
  if (pass1.issues.length > limit.max) {
    throw new ValidationError(`Pass1 issues ${pass1.issues.length} > ${limit.max}`);
  }

  // 2. 각 issue의 score_impact enum
  for (const issue of pass1.issues) {
    if (!P1_TO_P6_ENUM.includes(issue.score_impact)) {
      throw new ValidationError(`Invalid score_impact: ${issue.score_impact}`);
    }
  }

  // 3. repair_plan 존재
  if (!pass1.repair_plan_for_pass2?.top_issue_to_address) {
    throw new ValidationError(`Pass1 missing repair_plan_for_pass2`);
  }
}

function validatePass2Output(pass2, targetLevel) {
  // 1. model_answer text 길이 범위
  const range = WORD_COUNT_RANGES[targetLevel];
  const wc = countWords(pass2.model_answer.text);
  if (wc < range.min * 0.7 || wc > range.max * 1.3) {
    throw new ValidationError(`model_answer word count ${wc} far from range [${range.min}, ${range.max}]`);
  }

  // 2. action_items 2~3
  if (pass2.action_items.length < 2 || pass2.action_items.length > 3) {
    throw new ValidationError(`action_items ${pass2.action_items.length} not in [2,3]`);
  }

  // 3. preservation_check 통과 여부
  if (!pass2.model_answer.preservation_check?.student_anchors_kept?.length) {
    throw new ValidationError(`Pass2 preservation_check missing anchors`);
  }
}
```

---

## 7. 에러 처리 / 재시도

```ts
try {
  const pass1 = await runPass1(supabase, layers);
  validatePass1Output(pass1, targetLevel);
  // ...
} catch (err) {
  if (err instanceof ValidationError && retryCount < 1) {
    // 1회 재시도 (temperature 더 낮춰서)
    const pass1 = await runPass1WithRetry(supabase, layers, retryCount + 1);
    // ...
  } else {
    // attempt status='failed'
    await markAttemptFailed(supabase, body.attempt_id, err.message);
    throw err;
  }
}
```

---

## 8. 비용 추정 (Pass 분리)

Pass1 + Pass2 두 호출이라 회당 토큰이 단일 호출 대비 약 1.7배.

```
Pass1: prompt ~10K + completion ~1.5K
Pass2: prompt ~10K + completion ~2K
합계:  prompt ~20K + completion ~3.5K = 23.5K tokens

GPT-4.1 가격 (2026-05 기준):
  input  $5/1M
  output $15/1M

회당 비용 = 20K × $5 + 3.5K × $15 = $0.10 + $0.0525 = $0.1525
```

→ 학생당 평균 10 회차 = $1.525 / 세션 ≈ 약 2,000원. 충분히 감당 가능.

비용 최적화 옵션 (검증 후 결정):
- Pass1만 `gpt-4.1-mini`로 (평가는 작은 모델로) → 약 60% 비용 절감
- Pass2는 `gpt-4.1` 유지 (생성 품질 우선)

---

## 9. 흐름도

```
[fetch attempt + question]
   → [fetchAllLayers (system + grade + type + session)]
   → [assemblePass1Prompt]
   → [Pass1 GPT call (temperature 0.5)]
   → [validatePass1Output]
   → [assemblePass2Prompt with Pass1 output]
   → [Pass2 GPT call (temperature 0.65)]
   → [validatePass2Output]
   → [mergePassOutputs → coaching_json]
   → [DB 저장 coaching_attempts.coaching_json]
```

---

## 10. 적재 항목

| 항목 | 변경 |
|------|------|
| EF | `supabase/functions/coaching-evaluate/index.ts` 2-Pass 구조로 작성 |
| 마이그 | `coaching_system` row 신설 (System Core) |
| 마이그 | `coaching_grade_layer` 테이블 + 6 row (Grade Layer) |
| 마이그 | `coaching_type_overlay` 테이블 + 11 row (Type Overlay) |
| 마이그 | `coaching_sessions.current_focus jsonb` 컬럼 추가 |
| `lib/types/coaching.ts` | `CoachingJson` 타입 정의 (output schema) |
| `lib/actions/coaching.ts` | session/attempt 조회에 `current_focus` 포함 |
| `components/coaching/learn-room.tsx` | progress_table / session_progression / issues[] severity·score_impact 시각화 |

---

## 11. 다음 문서

- 적재 마이그 시퀀스 → [10-migration-plan.md](./10-migration-plan.md)
- output 스키마 상세 → [07-output-schema.md](./07-output-schema.md)
