# 06. Layer 6 — Generation Contract (Pass 2)

> **변동성**: 매우 높음. 매 호출 조립.
> **위치**: Pass2 user prompt의 마지막 섹션.
> **들어가는 것**: model_answer 생성 룰 / 학생 골격 유지 강제 / 등급 충실도 게이트.
> **들어가지 않는 것**: 평가 룰 → Layer 5 / 표현 매트릭스 → optional_examples 옆에.

---

## TL;DR

> Pass2 = **학생 답변을 다시 말해주는 것**이지 강사 모범답안 낭독이 아니다.
>
> 학생 골격 유지 + 최소 격상 + 자연스러운 spoken English.

---

## 1. Pass2 입력 / 출력 명세

### 입력

```
[System Core]                — Layer 1 절대 원칙 (동일)
[Grade Layer]                — Layer 2 speech_constraints (동일)
[Type Overlay]               — Layer 3 reasoning_flow (동일)
[Student Transcript]         — cleaned_transcript (동일)
[Pass1 Output]               — repair_plan_for_pass2 객체
[Issues to Address]          — Pass1이 식별한 흠 (1~2개)

[TASK]
Generate a level-faithful improved answer.
Preserve student's original story. Apply minimal upgrade. Strict JSON.
```

### 출력 (Pass2)

```json
{
  "model_answer": {
    "text": "...",
    "preservation_check": {
      "student_anchors_kept": [...],
      "additions": [...],
      "removals": [...]
    },
    "changes": [
      {
        "change_type": "structure | vocab | grammar | participial | cohesive | closing",
        "from": "...",
        "to": "...",
        "rationale": "..."
      }
    ],
    "level_fit_check": "..."
  },
  "action_items": [...],
  "closing_message": "..."
}
```

→ Pass2는 model_answer + action_items + closing만. issues[]는 Pass1이 책임.

---

## 2. 핵심 5 원칙 (PRESERVATION FIRST)

```
MODEL ANSWER RULES (in priority order):

1. PRESERVE the student's original content and story.
   - Student's specific topic, anecdotes, examples, opinions → KEEP.
   - Personal details (집/음악 종류/회사명/취미) → NEVER replace.
   - Student's chosen connectors that worked → keep them.

2. IMPROVE discourse flow FIRST, vocabulary LAST.
   - If skeleton roles missing → add minimal structural sentence.
   - If sequencing wrong → reorder, don't replace content.
   - Vocabulary substitution is the LAST resort.

3. ADD ONLY minimal vocabulary upgrades (1-2 max per answer).
   - Substitute at the highest-frequency repeat slot only.
   - Choose words within level ceiling (Layer 2).
   - Do NOT showcase advanced vocab.

4. KEEP the answer NATURALLY SPEAKABLE.
   - Real spoken English has hesitation, simpler syntax, occasional repair.
   - Avoid written-essay register.
   - Avoid template phrases that sound memorized.

5. AVOID sounding memorized.
   - No bolt-on debate cards.
   - No forced quantification.
   - No "fills me with an immense sense of pride" unless student naturally bridged.
```

---

## 3. STUDENT ANCHOR PRESERVATION (mandatory)

```
PRESERVATION CHECK (must pass before output):

For the model_answer, verify:

  Q1. Is the student's specific topic preserved? (집 stays 집, not transformed)
  Q2. Are the student's personal anecdotes kept verbatim or close?
       (e.g., "I watch TV on the sofa" → preserved, not replaced with generic)
  Q3. Are the student's working connectors kept where they worked?
  Q4. Did I add only what's necessary to fix the top_issue_to_address?
  Q5. Did I avoid adding fancy phrases that don't relate to the student's story?

If any of Q1-Q5 fails → rewrite model_answer.

EXAMPLE OF FAILURE:
  Student: "I live in an apartment in Gumi. I like the living room."
  ❌ Model: "Speaking of my house, situated in the heart of a vibrant city,
            ... captivated by its tranquil ambiance ..."
  → topic preserved (집) but anchor (Gumi / specific simplicity) DESTROYED.

EXAMPLE OF SUCCESS:
  Student: "I live in an apartment in Gumi. I like the living room."
  ✅ Model: "To talk about my house, I live in an apartment in Gumi, which is a
            quiet city. First of all, I love my living room — that's where I
            usually relax on the sofa watching TV. ..."
  → Gumi preserved, sofa-TV preserved, only added: opening structural sentence
     + role labels for skeleton.
```

---

## 4. ADDITION DISCIPLINE (제거가 추가보다 중요)

```
ADDITION DISCIPLINE:

Before adding ANY sentence to the model answer, ask:
  - Does this address the top_issue_to_address from Pass1?
  - Does this stay within target_level?
  - Does this connect naturally to the student's prior content?

If any answer is "no" → do NOT add.

Before adding ANY phrase upgrade, ask:
  - Was this exact word/phrase used by the student in this answer?
  - Is the upgrade within the level vocab_ceiling?
  - Is this the highest-frequency repeat in the answer?

If any answer is "no" → do NOT upgrade.

PRINCIPLE OF SUBTRACTION:
  Sometimes the best coaching is removing the student's awkward word
  and not replacing it with anything fancier — just a more natural slot.
  Removal is a valid action_item.
```

---

## 5. changes[] 분류 (UI 시각화용)

```yaml
change_types:
  structure:
    description: "Skeleton role 추가 / 재배치"
    example: "added topic_introduction sentence"

  vocab:
    description: "어휘 1개 교체 (반복 회피)"
    example: "really like → enjoy (at slot with highest repetition)"

  grammar:
    description: "Agreement / preposition / tense 교정"
    example: "some of are → is (agreement fix)"

  participial:
    description: "분사구문 도입 (level >= IH only)"
    example: "When I watch him playing → Watching him play"

  cohesive:
    description: "Cohesive device 다양화"
    example: "first ... first ... first → first ... besides ... in conclusion"

  closing:
    description: "Closing tag / synthesis 추가"
    example: "added 'Overall, ...' and 'That's about it.'"

  removal:
    description: "어색한 표현 제거"
    example: "He is beautiful (referring to music) → removed"
```

→ UI의 ModelAnswer 컴포넌트 `categorizeChange()`는 이 분류 따라 시각 카드 묶음.

---

## 6. 등급 충실도 게이트 (Pass2 출력 직전)

```
LEVEL FIDELITY GATE (Pass2 specific):

1. Does model_answer's discourse_type match target_level?
   - IH target → skeletal_paragraph, NOT sustained AL discourse.
   - AL target → sustained discourse, NOT a "phrase showcase".

2. Does model_answer's vocab stay within ceiling?
   - IH ceiling = upper_intermediate
     ❌ "captivated", "immense", "unparalleled", "tremendous"
     ✅ "really", "great", "popular", "comfortable"

3. Word count within target range?
   - IH: 150-200
   - AL: 200-280
   - Going significantly over or under = fail.

4. Does the answer sound speakable?
   - Read it aloud mentally. If it sounds like a written essay → fail.
   - Real speech has shorter sentences, occasional repetition, natural flow.

5. Are level-inappropriate features ABSENT?
   - IH model: no AL participial cascades
   - IM3 model: no IH skeleton + reflective layer
   - IM2 model: no subordination chains

If any check fails → regenerate.
```

---

## 7. action_items[] 룰

```
ACTION ITEMS:

- 2-3 concrete behaviors max.
- Each should be a single trainable habit.
- Match the level (no AL-only actions for IH students).
- Link to the issues addressed.

EXAMPLE for IH student with closing_tag issue:
  ✅ ["다음 답변 끝에 'Overall, ___' 한 줄 + 'That's about it.' 마무리 시도",
      "마무리 표현 2~3개 외워두기"]

  ❌ ["분사구문 풀 동원하기",                  # too advanced
      "토론 마무리 카드 4문장 인용",             # forced
      "Breath of Vocabulary 8 카테고리 적용"]    # not relevant
```

---

## 8. closing_message 톤

```yaml
closing_message:
  purpose: "한 줄 격려 + 다음 회차 안내"
  tone: "warm, specific, forward-looking"
  do_not:
    - "generic praise (잘 하셨어요!)"
    - "discouragement (아직 멀었네요)"
    - "long paragraph"
  do:
    - "구체적 ('skeleton 6 roles 중 5개 채우셨어요')"
    - "다음 단계 ('마무리 한 줄만 더하면 완성이에요')"
    - "한두 문장"
```

---

## 9. EF Pass2 호출 코드 (예정)

```ts
async function runPass2(supabase, attempt, layers, pass1Output) {
  const userPrompt = assemblePass2Prompt({
    systemCore: layers.systemCore,
    gradeLayer: layers.gradeLayer,
    typeOverlay: layers.typeOverlay,
    studentTranscript: attempt.cleaned_transcript,
    repairPlan: pass1Output.repair_plan_for_pass2,
    topIssue: pass1Output.issues[0],
  });

  const response = await callGPT({
    system: layers.systemCore.absolute_principles,
    user: userPrompt,
    response_format: { type: "json_object" },
    model: "gpt-4.1",
    temperature: 0.65,    // 생성은 약간 변동성 허용
    max_tokens: 2000,
  });

  return JSON.parse(response);  // Pass2 output JSON
}
```

→ Pass1 후 호출. Pass1 결과를 input으로 받음.

---

## 10. 두 호출 결합 후 최종 coaching_json 조립

```ts
async function processAttempt(supabase, attempt) {
  const layers = await fetchAllLayers(supabase, attempt);

  // Pass 1
  const pass1 = await runPass1(supabase, attempt, layers);

  // Pass 2 (Pass1 output을 받아)
  const pass2 = await runPass2(supabase, attempt, layers, pass1);

  // 최종 coaching_json 조립
  const coachingJson = {
    intro: generateIntro(pass1.evaluation_summary, pass1.session_progression),
    progress_table: pass1.evaluation_summary,
    issues: pass1.issues,
    model_answer: pass2.model_answer,
    action_items: pass2.action_items,
    closing: pass2.closing_message,
  };

  return coachingJson;
}
```

---

## 11. 다음 문서

- 출력 JSON 스키마 (Pass1 + Pass2 합쳐서) → [07-output-schema.md](./07-output-schema.md)
- 두 Pass 조립 + EF 코드 → [08-prompt-assembly.md](./08-prompt-assembly.md)
- 적재 마이그 순서 → [10-migration-plan.md](./10-migration-plan.md)
