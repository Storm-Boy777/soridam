# 05. Layer 5 — Evaluation Contract (Pass 1)

> **변동성**: 매우 높음. 매 호출 조립.
> **위치**: Pass1 user prompt의 마지막 섹션.
> **들어가는 것**: 평가 우선순위, 흠 식별 룰, issue_count 게이트, output JSON 강제.
> **들어가지 않는 것**: model_answer 생성 룰 → Layer 6 / 표현 리스트 → Layer 3.

---

## TL;DR

> Pass1 = 학생 답변을 **판단**한다. 모범답안 생성 X. 흠 식별 + score_impact 분석 + 회차 진척 평가만.

---

## 1. Pass1 입력 / 출력 명세

### 입력

```
[System Core]               — Layer 1 절대 원칙
[Grade Layer]               — Layer 2 speech_constraints
[Type Overlay]              — Layer 3 reasoning_flow + intervention_triggers
[Session Context]           — Layer 4 회차 상태
[Student Transcript]        — cleaned_transcript
[Audio Meta]                — word_count, filler_count, duration

[TASK]
Evaluate the answer. Identify highest score-impact issues.
Do NOT generate a model answer. Strict JSON output only.
```

### 출력 (Pass1)

```json
{
  "evaluation_summary": {
    "discourse_quality": "skeletal_paragraph_partial",
    "level_fit": "approaching_IH",
    "sustainment": "adequate",
    "filler_naturalness": "natural"
  },
  "issues": [
    {
      "issue_type": "skeleton_role_missing",
      "severity": "high",
      "score_impact": "P3_sequencing",
      "learnability": "moderate",
      "quote": "...",
      "fix_strategy": "...",
      "micro_drill": "..."
    }
  ],
  "session_progression": {
    "previous_issues_resolved": [...],
    "previous_issues_still_present": [...],
    "recurring_pattern_action": null | "isolated_focus"
  },
  "repair_plan_for_pass2": {
    "top_issue_to_address": "...",
    "preservation_anchors": [...],     // 학생 답변에서 반드시 유지해야 할 부분
    "target_level_after_fix": "IH"
  }
}
```

`repair_plan_for_pass2`가 Pass2의 입력이 된다. Pass1과 Pass2의 인터페이스.

---

## 2. 우선순위 평가 룰 (CRITICAL)

System Core P1~P6 우선순위를 Pass1에서 강제:

```
EVALUATION PRIORITY ORDER (apply strictly):

P1. Discourse breakdown
P2. Failure to sustain
P3. Weak logical sequencing
P4. Cohesive repetition
P5. Vocabulary limitation
P6. Grammar accuracy

DECISION RULE:
  Identify issues at the LOWEST priority level present.
  If P1 violated → focus all issues on P1.
  If P1-P2 clean → may raise P3.
  Skip P5-P6 entirely if P1-P3 violated.

NEVER:
  - skip P1/P2/P3 to "show off" by catching grammar.
  - raise vocabulary issue when discourse is broken.
  - raise multiple issues across non-adjacent priorities.
```

---

## 3. issue_count 게이트 (level별)

```
ISSUE COUNT BY TARGET LEVEL (hard limit):

IL:   0-2 issues  (격려 우선)
IM1:  2-3 issues
IM2:  2-3 issues
IM3:  2-3 issues  (skeleton 진입 트레이닝)
IH:   1-2 issues  (한 가지 큰 흠만)
AL:   0-1 issues  (작은 자연스러움 조정만)

If you find more issues than the limit, you MUST:
  1. Rank by score_impact (P1 highest → P6 lowest)
  2. Keep only the top N where N matches the limit
  3. Drop the rest, even if technically valid
```

→ issue_count는 등급에 따라 변동. GPT가 등급 무시하고 일정 개수를 일률 짚는 패턴을 차단.

---

## 4. STUDENT TEXT VERIFICATION (Pass1 전용 강화)

```
BEFORE generating any issue, run STUDENT TEXT VERIFICATION:

For each candidate issue:
  Q1. Does the student's transcript actually contain the problem?
  Q2. Is the student missing a feature, or did they attempt it in a different form?
  Q3. Does my quote field exactly match transcript text? (verbatim)

If Q1=No → drop the issue.
If Q2=attempted-differently → reframe issue as "form variation suggestion", not "missing".
If Q3=No → fix the quote to exact transcript or drop the issue.

EXAMPLES:
  ❌ "missing closing tag" — but student said "That's about it."
     → DROP. Student handled it.

  ❌ "Cohesive variety needed" — but student used "however / on the other hand / besides"
     → DROP. Cohesive is varied.

  ❌ "Skeleton incomplete" — but 6 roles detected on careful read
     → DROP. Re-analyze before raising.

  ✅ "Vocab repetition: 'really like' appears 4 times"
     → KEEP. Verifiable.
```

---

## 5. evaluation_summary 4 축

Pass1은 issues[] 외에도 4개 큰 축으로 답변을 요약:

### discourse_quality

```
- fragment_only            (IL)
- simple_sentences         (IM1)
- simple_with_connections  (IM2)
- connected_sentences      (IM3)
- skeletal_paragraph       (IH)
- sustained_discourse      (AL)
- skeletal_paragraph_partial   (IM3 → IH transition)
- sustained_discourse_partial  (IH → AL transition)
```

### level_fit

```
- below_target          (학생 답변이 목표 등급 아래)
- approaching_target    (목표 등급 진입 신호 있음)
- at_target             (목표 등급 정합)
- above_target          (드물지만 가능 — 목표 등급 초과)
```

### sustainment

```
- failed                (조기 종료)
- inadequate            (시간/단어 부족)
- adequate              (목표 범위 충족)
- strong                (자연스러운 확장)
```

### filler_naturalness

```
- natural               (≤5%)
- spoken_normal         (5-15%)
- excessive             (>15%)
```

→ 4 축은 ACTFL rubric 대응. Pass2가 model_answer 생성 시 이 축을 참조.

---

## 6. session_progression 자동 산출

Pass1은 previous_issues를 받아 진척 자동 판정:

```
For each previous issue:
  - is the same pattern present in current answer? → still_present
  - is it absent? → resolved
  - is it transformed? → partial_resolution

session_progression:
  previous_issues_resolved: [
    "P3 closing_tag_absent (resolved in attempt 3)"
  ]
  previous_issues_still_present: [
    "P5 vocab_repetition 'really like' (3rd consecutive)"
  ]
  recurring_pattern_action:
    if any issue in "still_present" hits 3+ consecutive:
      → "isolated_focus"
    else:
      → null
```

→ 회차 학습 곡선 시스템화.

---

## 7. repair_plan_for_pass2 — Pass1 / Pass2 인터페이스

```yaml
repair_plan_for_pass2:
  top_issue_to_address: "skeleton_role_missing_closing"

  preservation_anchors:
    - "student's specific topic (집/음악/직장)"
    - "student's personal anecdote: 'I usually relax on the sofa watching TV'"
    - "student's chosen connectors that worked: 'first of all', 'besides'"

  what_to_change:
    - "add closing role: one synthesis sentence + tag"

  what_NOT_to_change:
    - "do not add advanced vocab"
    - "do not add reflective/discussion layer (level=IH)"
    - "do not replace student's personal anecdote"

  target_level_after_fix: "IH"
  expected_word_count: 150-200
```

→ 이게 Pass2 input. Pass2는 이 plan만 받고 model_answer 생성.

---

## 8. 등급 충실도 게이트 (Pass1 출력 직전)

```
LEVEL FIDELITY GATE:

Before finalizing Pass1 output:
  1. Does each issue raised match an intervention_trigger that allows
     this level? (Layer 3 reference)
  2. Does the issue_count match level limit? (Section 3 above)
  3. Are P1-P3 violations addressed before any P4-P6?
  4. Does my repair_plan stay within target_level constraints?
     (no AL features pushed to IH student)

If any check fails → regenerate Pass1.
```

---

## 9. EF Pass1 호출 코드 (예정)

```ts
async function runPass1(supabase, attempt, layers) {
  const userPrompt = assemblePass1Prompt({
    systemCore: layers.systemCore,
    gradeLayer: layers.gradeLayer,
    typeOverlay: layers.typeOverlay,
    sessionContext: layers.sessionContext,
    studentTranscript: attempt.cleaned_transcript,
    audioMeta: attempt.audio_meta,
  });

  const response = await callGPT({
    system: layers.systemCore.absolute_principles,
    user: userPrompt,
    response_format: { type: "json_object" },
    model: "gpt-4.1",
    temperature: 0.5,    // 평가는 낮은 temp
    max_tokens: 2000,
  });

  return JSON.parse(response);  // Pass1 output JSON
}
```

→ Pass2와 분리된 호출. 평가만 담당.

---

## 10. 다음 문서

- Pass2 생성 계약 → [06-generation-contract.md](./06-generation-contract.md)
- output JSON 스키마 — Pass1 + Pass2 합쳐서 → [07-output-schema.md](./07-output-schema.md)
- 실제 EF 조립 코드 → [08-prompt-assembly.md](./08-prompt-assembly.md)
