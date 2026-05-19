# 03. Layer 3 — Type Overlay (유형 사고 흐름)

> **변동성**: 중간. 10 유형(description / routine / comparison / past_*×3 / adv_14 / adv_15 / rp_11 / rp_12) 정의는 안정적.
> **DB 위치**: `coaching_type_overlay` (예정 신규 테이블, 11 row — 10 유형 + description_random 1).
> **들어가는 것**: 유형별 *reasoning_flow* + *intervention_triggers* + *optional_examples*.
> **들어가지 않는 것**: 등급별 표현 / 토픽 어휘 / 표현 매트릭스.

---

## TL;DR

> Type Overlay는 *내용*이 아니라 *사고 흐름*을 정의한다.
>
> "what to say"가 아니라 "**how thinking organizes itself in this question type**".

---

## 1. 유형 정의 (10 + 1)

| 유형 | reasoning_flow 본질 |
|------|------------------|
| `description` | 대상 묘사 → 구성요소 → 개인 연결 → 의의 |
| `description_random` | 돌발 — un-prepared 토픽에 organized discourse 유지 |
| `routine` | 일과 묘사 → 빈도·순서 → 의미 |
| `comparison` | 과거 ↔ 현재 — 변화 식별 → 원인 → 영향 |
| `past_childhood` | 어린 시절 회상 — setting → memorable event → reflection |
| `past_recent` | 최근 회상 — context → event → outcome |
| `past_special` | 특별 경험 — setup → unexpected → reaction → lesson |
| `adv_14` | 어드밴스 비교/변화 — claim → evidence → implication |
| `adv_15` | 사회 이슈 — issue → cause → consequence → solution |
| `rp_11` | 롤플레이 정보 요청 — context → polite request → 3 specific Q |
| `rp_12` | 롤플레이 문제 해결 — problem → empathy → alternatives |

각 유형 row의 핵심 4 필드:
```yaml
type_id: "..."
reasoning_flow: [step1, step2, ...]
intervention_triggers: [...]
optional_examples: [...]  # 표현은 옵션 참고
```

---

## 2. description (선택형 일반 묘사)

```yaml
type_id: "description"
applies_to:
  survey_type: "선택형"
  question_type: "description"

reasoning_flow:
  - object_introduction      # 묘사 대상 도입
  - component_breakdown      # 구성요소 / 측면 분해
  - personal_engagement      # 본인이 이 대상과 어떻게 관계 맺는지
  - significance_or_closure  # 의의 / 마무리

intervention_triggers:
  - condition: "answer skips component_breakdown"
    score_impact: "P3 — sequencing"
    suggestion: "add one concrete aspect or feature"

  - condition: "answer has component breakdown but no personal_engagement"
    score_impact: "P2 — sustainment"
    suggestion: "add personal connection — student's actual relation"

  - condition: "answer ends without closure (length OK)"
    score_impact: "P3 — sequencing"
    suggestion: "natural close — overall statement or feeling"

optional_examples:
  note: "examples for the GPT to recognize patterns, NOT to insert"
  - "To talk about ___, ..." (object_introduction pattern)
  - "First / Another thing is that ..." (component_breakdown pattern)
  - "Overall, ___ means a lot to me." (significance pattern)
```

→ description의 본질 = **대상 → 구성요소 → 개인 → 의의** 흐름. 표현은 부산물.

---

## 3. description_random (돌발 묘사)

```yaml
type_id: "description_random"
applies_to:
  survey_type: "공통형"
  category: "일반"
  question_type: "description"
  topic_in: [28 topics from 4 groups]

reasoning_flow:
  - stalling_acknowledgment  # 시간 벌기 + 어렵다 인정
  - generalization           # 일반화 한 줄 ("there are many ___ in Korea")
  - light_classification     # 가벼운 분류 (2~3 종류 나열)
  - personal_anchor          # 1개 본인 경험 anchor
  - cultural_or_modern_angle # 디지털 대체 OR 외국인 시각 (선택)
  - graceful_close           # 자연스러운 마무리

intervention_triggers:
  - condition: "answer < 30 seconds OR < 70 words"
    score_impact: "P2 — sustainment failure"
    suggestion: "extension coaching — NOT vocabulary upgrade"
    do_not: "do not raise vocab issues until sustainment achieved"

  - condition: "answer has zero personal_anchor (all 3rd person)"
    score_impact: "P3 — answer feels generic"
    suggestion: "add ONE 'I' sentence — student's actual relation"

  - condition: "target_level == AL AND answer is purely descriptive"
    score_impact: "P3 — AL discriminator missing"
    suggestion: "ONE reflective sentence — IF naturally bridged"
    important: "never force a reflective card; quality > insertion"

  - condition: "vocab repetition: many/people/good/famous 3+ each"
    score_impact: "P5 — vocab limitation (IH/AL only)"
    suggestion: "one substitution at highest-frequency slot"
    level_applicability: "IH+"

group_awareness:
  note: "groups exist for thematic context, NOT for forced card insertion"
  current_affairs:
    typical_angle: "public service / digital alternative"
    cards_to_NEVER_force: "디지털 대체 표현"
  environment:
    typical_angle: "natural / temporal / preservation"
    cards_to_NEVER_force: "토론 마무리 4문장"
  industry_tech:
    typical_angle: "Korean industry / global standing"
    cards_to_NEVER_force: "시장 점유율 정량화"
  personal:
    typical_angle: "daily life / relationships / values"
    cards_to_NEVER_force: "양면 토론 5단"

  use_cards_when:
    a: "target_level == AL"
    b: "student answer naturally bridges to that angle"
    c: "insertion sounds organic, not bolted-on"
```

→ "REQUIRED 카드 의무 인용" X. 조건부 + 자연스러운 bridge가 충족될 때만 도입.

---

## 4. comparison (과거 ↔ 현재 비교)

```yaml
type_id: "comparison"

reasoning_flow:
  - establish_then            # 과거 상태
  - establish_now             # 현재 상태
  - identify_change           # 변화 식별 (단순 차이가 아닌 패턴)
  - cause_or_implication      # 변화의 원인 또는 영향

intervention_triggers:
  - condition: "answer describes 'then' OR 'now' but not both"
    score_impact: "P3 — comparison incomplete"
    suggestion: "add the missing side — minimum 2-3 sentences"

  - condition: "both sides present but no explicit change statement"
    score_impact: "P3 — comparison implicit, not articulated"
    suggestion: "ONE sentence that names the change"

  - condition: "target_level >= IH AND no implication/cause"
    score_impact: "P3 — analytical depth missing"
    suggestion: "ONE sentence on why or what it means"
```

---

## 5. past_special (특별 경험)

```yaml
type_id: "past_special"

reasoning_flow:
  - setup                     # 상황 설정 (when/where/who)
  - unexpected_event          # 예상치 못한 일
  - reaction                  # 본인 반응
  - reflection_or_lesson      # 회상 / 교훈

intervention_triggers:
  - condition: "answer has unexpected_event but no setup"
    score_impact: "P3 — listener can't situate"
    suggestion: "1-2 sentences of context BEFORE the event"

  - condition: "event narrated but no personal reaction shown"
    score_impact: "P2 — answer feels third-person, lifeless"
    suggestion: "describe what student felt or did"

  - condition: "target_level == AL AND no reflection"
    score_impact: "P3 — AL needs meta-layer"
    suggestion: "one sentence on what student learned or how it shaped them"
```

---

## 6. adv_15 (사회 이슈)

```yaml
type_id: "adv_15"

reasoning_flow:
  - issue_statement           # 이슈 명시
  - cause                     # 원인
  - consequence               # 결과
  - solution_or_outlook       # 해결 / 전망

intervention_triggers:
  - condition: "answer states issue but no cause/consequence"
    score_impact: "P3 — analytical chain broken"
    suggestion: "ONE sentence of cause OR consequence"
    do_not: "do not require both at IH; one is enough"

  - condition: "target_level == AL AND no solution/outlook"
    score_impact: "P3 — AL discriminator (sustained reasoning)"
    suggestion: "one solution-oriented sentence"

  - condition: "answer attempts political/economic terminology beyond level"
    score_impact: "P6 — over-reach"
    suggestion: "simpler reasoning is acceptable; avoid forced jargon"
    important: "do NOT push 'inflation/Trump/tariff' just because lessons mentioned them"

optional_examples:
  note: "issue domain examples for context recognition only"
  - housing costs
  - traffic congestion
  - aging population
  - environmental degradation
```

→ 자료 #17 (인플레이션·트럼프) 강의의 본질 = **issue→cause→consequence→solution 추론 흐름**. 토픽 자체는 example.

---

## 7. rp_12 (롤플레이 문제 해결)

```yaml
type_id: "rp_12"

reasoning_flow:
  - acknowledge_problem        # 문제 인지 (공감)
  - express_empathy            # 공감 표현
  - propose_alternative_1      # 대안 1
  - propose_alternative_2      # 대안 2 (선택)
  - polite_close               # 정중한 마무리

intervention_triggers:
  - condition: "answer jumps to solution without acknowledging problem"
    score_impact: "P3 — interpersonal sequencing broken"
    suggestion: "one sentence of acknowledgment first"

  - condition: "only one alternative offered AND target >= IH"
    score_impact: "P3 — limited problem-solving"
    suggestion: "second alternative — different angle"

  - condition: "tone too direct / lacks politeness markers"
    score_impact: "P3 — register mismatch"
    suggestion: "soften with conditional or apology phrasing"
```

---

## 8. routine / past_childhood / past_recent / adv_14 / rp_11

작성 패턴 동일. 각 유형의:
- reasoning_flow (4~5 step)
- intervention_triggers (3~5 rule, score_impact 명시)
- optional_examples (있다면 표현 example 1~3개)

상세 spec은 자료 추가 시 09-curriculum-conversion.md framework로 변환 후 적재.

---

## 9. EF resolveTypeOverlay 매칭 로직

```ts
function resolveTypeOverlay(q): string {
  if (q.question_type_eng === "self_intro") {
    throw new Error("self_intro not a coaching target");
  }

  // 돌발 분기 (description × 공통형 × 일반 × 28 토픽)
  const isRandom =
    q.survey_type === "공통형" &&
    q.category === "일반" &&
    q.question_type_eng === "description" &&
    RANDOM_TOPICS_28.includes(q.topic);

  if (isRandom) return "description_random";

  // 그 외는 자기 유형
  return q.question_type_eng;  // description / routine / comparison / past_* / adv_* / rp_*
}
```

→ description_random은 단일 row. 4 그룹 차별 카드는 그 row 안의 `group_awareness` 섹션에서 토픽별로 분기.

---

## 10. 적재 계획

- 마이그: `coaching_type_overlay` 테이블 신설.
- 11 row 적재: 10 유형(description / routine / comparison / past_childhood / past_recent / past_special / adv_14 / adv_15 / rp_11 / rp_12) + description_random 1.
- 각 row 컬럼: `type_id` / `reasoning_flow jsonb` / `intervention_triggers jsonb` / `optional_examples jsonb` / `group_awareness jsonb` (description_random만 사용) / `applies_to jsonb`.

---

## 11. 다음 문서

- 학생 회차 상태가 어떻게 들어가는지 → [04-session-context.md](./04-session-context.md)
- Pass1 평가에서 이 reasoning_flow가 어떻게 쓰이는지 → [05-evaluation-contract.md](./05-evaluation-contract.md)
- Pass2 생성에서 어떻게 학생 골격 유지하면서 reasoning_flow 강화하는지 → [06-generation-contract.md](./06-generation-contract.md)
