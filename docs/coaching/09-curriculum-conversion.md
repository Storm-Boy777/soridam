# 09. Curriculum Conversion — 강사 자료 → 판단 로직

> **목적**: 강사 자료 #1~#21을 *표현*이 아닌 *개입 알고리즘*으로 변환하는 framework.
> **위치**: docs 전용. DB에 들어가지 않음. 다른 Layer 작성의 참조 자료.
> **원칙**: [00-philosophy.md](./00-philosophy.md) "Save the WHEN, not the WHAT".

---

## TL;DR

> 강사 자료의 각 모범 표현을 **표현 자체로 저장하지 않는다**.
> 그 표현이 등장하는 *조건* + 그 표현이 해결하는 *판단 알고리즘*으로 변환한다.

---

## 1. 변환 framework

각 강사 자료에서 추출해야 할 4개 차원:

```
1. Trigger Condition    — 학생 답변에 무엇이 있을 때/없을 때
2. Score Impact         — 이 흠이 어떤 ACTFL 평가축에 작용
3. Intervention Logic   — 강사라면 어떻게 개입하는가 (판단)
4. Optional Examples    — 표현은 옵션 참고로만 (강제 X)
```

이 4개 차원이 갖춰지면 prompt에 들어갈 수 있다. 표현만 있으면 표현 누적 함정에 빠진다.

---

## 2. 자료 #1 (음악 IH 1:1 코칭) — 변환 예시

### 원자료 핵심 (강사 짚는 순서)

```
1. like 반복 → 동의어 다양화
2. some of ... is → are (Agreement)
3. all his songs → all of his songs
4. He is beautiful → His music is beautiful (사람 묘사 어색)
5. When I watch him playing → Watching him play (분사구문)
6. closing tag 부재
```

### 나쁜 추출

```
description_IH.coaching_focus:
  "1순위: like/enjoy 반복 → appreciate/be fond of로 격상"
  "2순위: some of + 복수 + are (Agreement)"
  "3순위: all his → all of his"
  ...
  → 표현 리스트로 박힘 (강사가 짚은 표현만 누적)
```

### 좋은 추출

```yaml
intervention_rules_from_lesson_1:

  rule_id: "lex_repetition_basic_verbs"
  trigger_condition:
    - "basic verb repeated 3+ times within answer"
    - "examples: like, enjoy, have, see, go, want"
  score_impact: "P5 — vocabulary limitation (IH bar)"
  intervention_logic: |
    Do NOT replace every instance.
    Identify 1-2 highest-frequency repeats.
    Suggest 1 synonym at the most natural slot.
    Avoid replacing if context already varied.
  optional_examples:
    - like → appreciate / be fond of / adore
    - have → refer to (only in classification context)
  level_applicability: "IM3+ (below IM3, vocabulary is not P5 concern)"

  rule_id: "agreement_quantifier_plural"
  trigger_condition:
    - "some of / one of / a number of + singular verb"
    - "various / many / several + singular noun"
  score_impact: "P6 — grammar accuracy (AL blocker)"
  intervention_logic: |
    This is binary — either right or wrong.
    AL students who violate this lose AL automatically.
    For IM/IH, raise as polish issue (not blocker).
  level_applicability: "all levels, but escalates at IH/AL"

  rule_id: "object_pronoun_for_inanimate_concept"
  trigger_condition:
    - "subject pronoun (he/she) applied to non-human entity description"
    - "example: 'He is beautiful' meaning a singer's music"
  score_impact: "P3 — logical clarity (mild)"
  intervention_logic: |
    Guide toward specifier or metonymy.
    Don't force formal restructuring if natural to native ear.

  rule_id: "participial_opportunity_when_doing"
  trigger_condition:
    - "two clauses with same subject and 'when [subject] + V-ing'"
    - "example: 'When I watch him playing piano, I feel ...'"
  score_impact: "P3-P4 — syntactic monotony reduction"
  intervention_logic: |
    Only suggest participial if:
      a) target_level >= IH
      b) student demonstrates ability to handle subordination
      c) the slot naturally fits (don't force)
    Do NOT make participial mandatory at IH.
    AL students should show this naturally.
  optional_examples:
    - "When I watch him playing → Watching him play, ..."
    - "When I drive listening to music → Driving in the car, I listen to music"

  rule_id: "closing_tag_absence"
  trigger_condition:
    - "answer ends abruptly without closure signal"
  score_impact: "P3 — sequencing"
  intervention_logic: |
    Only raise if answer length >= target word_count_target AND
    no closure signal present.
    Otherwise this is "answer too short" (P2 sustainment), not closing tag.
```

→ 표현은 example로만. 핵심은 **언제 개입하는가** + **어떤 평가축인가**.

---

## 3. 자료 #5 (Skeleton paragraph 강의) — 변환

### 원자료 핵심

```
강사가 가르치는 "skeleton paragraph 6 roles":
  1. To talk about my house, ...
  2. To get into more details, ...
  3. The first thing is that ...
  4. Another thing is that ...
  5. The last thing is that / Overall, ...
  6. That's about it.
```

### 나쁜 추출

```
description_IH.example_model_answer:
  자료 #5 집 토픽 풀 모범 800자 그대로 박음
  → GPT가 음악 토픽 답변할 때 집 example을 카피해서 변형
```

### 좋은 추출

```yaml
discriminator_im3_to_ih:
  capability_name: "skeleton_paragraph"
  description: |
    Student can produce a paragraph with 6 detectable structural roles.

  detection_logic:
    roles_to_detect:
      - role_id: "topic_introduction"
        signals: ["opens with topic statement", "names the subject"]
      - role_id: "transition_to_details"
        signals: ["explicit shift signal", "or natural pivot"]
      - role_id: "supporting_point_1"
        signals: ["first concrete content"]
      - role_id: "supporting_point_2"
        signals: ["second concrete content, distinct angle"]
      - role_id: "closing_synthesis"
        signals: ["overall statement", "or summary"]
      - role_id: "closure_signal"
        signals: ["explicit close phrase", "or natural ending"]

  intervention_decision:
    - if roles_detected >= 5:
        "skeleton is forming — focus on missing role only"
    - if roles_detected 3-4:
        "primary intervention area — structural coaching"
    - if roles_detected <= 2:
        "even more basic — sustainment first (P2)"

  optional_examples:
    - "To talk about ___, ..."           (transition example, not mandatory)
    - "The first thing is that ..."      (supporting example)
    - "Overall, ..." / "That's about it" (closing examples)

  level_applicability:
    primary: "IM3 → IH transition"
    secondary: "IH consolidation"
    not_applicable: "IL/IM1/IM2 (too early)"
```

→ "To talk about my house"는 example. 핵심은 **6 roles 검출 + 회차별 개입 결정**.

---

## 4. 자료 #11~#14 (돌발 만능 패턴) — 변환

### 원자료 핵심

```
강사 명시: "돌발 4 그룹 (시사/환경/산업/개인) 100% 똑같은 패턴"

만능 패턴 7 Step:
  Step 0: 시간 벌기 ("It's a tough question...")
  Step 1: 일반화 ("There are numerous ___ in Korea")
  Step 2: 종류 분류 ("Talking about ___, we refer to ___")
  Step 3: 사용자·이용 양상
  Step 4: 디지털 대체
  Step 5: 외국인 반응
  Step 6: 본인 자랑
  Step 7: 결론·전망 + closing tag

+ 그룹별 격상 카드:
  - 시사: 어휘 격상 매트릭스
  - 환경: 토론 마무리 4문장 카드
  - 산업: 시장 점유율 정량화
  - 개인: 양면 토론 5단
```

### 나쁜 추출

```
description_random_environment_IH.coaching_focus:
  "★ 토론 마무리 4문장 카드 그대로 인용 의무 (변형 X)"

topic_skeleton.full_etalon:
  자료 #12 D 지형 풀 모범 800자 그대로

→ 학생 지형 답변에 강사 풀 모범 표현 카피됨
→ 환경 격상 카드 강제 인용
```

### 좋은 추출

```yaml
random_topic_capability:
  capability_name: "unprepared_topic_discourse"
  description: |
    Can student sustain organized discourse on a topic they did
    not select in the survey? AL discriminator.

  what_this_is_NOT:
    - memorizing 14 topic-specific answer scripts
    - reciting "the planet belongs to children's children" card
    - quoting "market share is 30% globally"
    - inserting "It fills me with an immense sense of pride"

  what_this_actually_IS:
    - quick stalling technique (Step 0) to buy thinking time
    - generalization from limited knowledge ("there are many ___ in Korea")
    - 1-2 personal anchors despite unfamiliar territory
    - graceful close without breakdown

  intervention_rules:

    rule: "answer too short (P2 sustainment)"
      condition: "student answer < 30 seconds OR < 70 words"
      action: "extension coaching, NOT vocabulary"
      level_check: "applies to all levels"

    rule: "generic with no personal hook (P2-P3)"
      condition: "answer purely third-person, no 'I' anchor"
      action: "add ONE personal sentence — student's actual experience"
      level_check: "IM3+"

    rule: "AL target + answer is descriptive only"
      condition: "target=AL AND all 7 steps are factual description, no reflection"
      action: "suggest ONE reflective sentence — bridged naturally"
      important: "do NOT force the debate card. only if natural bridge."

    rule: "vocabulary repetition (P5)"
      condition: "many/people/good/famous repeated 3+ times"
      action: "suggest 1 synonym at highest-frequency slot"
      do_not: "do not provide full vocab upgrade matrix"

  topic_grouping:
    note: "groups exist for category awareness, NOT for forced card insertion"
    current_affairs:
      essence: "public services / civic facilities"
      examples: ["은행", "호텔", "음식점", "교통", "미용실", "병원", ...]
    environment:
      essence: "natural / temporal phenomena"
      examples: ["재활용", "지형", "날씨"]
    industry_tech:
      essence: "industrial / technological achievements"
      examples: ["산업", "기술", "전화기", ...]
    personal:
      essence: "daily life / relationships"
      examples: ["모임", "휴일", "자유시간", "가족/친구", ...]

  optional_examples:
    note: "these are examples of valid AL moves — NEVER required cards"

    natural_meta_reflections:
      environment:
        - "preserving this for future generations"
        - "the role of individual action in larger problems"
      industry:
        - "what this achievement means to me as a Korean"
        - "how technology reshapes daily life"
      personal:
        - "the trade-off between convenience and connection"
        - "what tradition means in a modern context"

    important: |
      Use these ONLY if:
        a) target_level == AL, AND
        b) student answer naturally leads to reflection, AND
        c) the reflection doesn't sound bolted-on
      If any condition fails, do NOT include reflection.
      A descriptive AL answer is fine.
```

→ 강사 자료 #11~#14의 **본질**은 "un-prepared 주제도 organized discourse 유지". 표현 암기 X, 능력 측정 O.

---

## 5. 자료 #21 (산업 IH→AL 1:1 코칭) — 변환

### 원자료 핵심

```
강사 1:1 코칭 etalon:
  - 학생 답변 골격 그대로 유지
  - 격상 표현 한두 개만 슬롯 카피해서 박아 넣음 (변형 X)
  - 학생이 이미 사용한 표현은 짚지 X
  - "이 가게 결정타" — 정량화 한 줄로 격상
  - 단어·구 단위로 짚어서 학생이 카피하기 쉽게
```

### 나쁜 추출

```
system_prompt 안에:
  "model_answer 생성 시 ... 핵심 표현 그대로 박아 넣음"
  "QUANTIFICATION CARD ... 산업·기술 IH→AL 격상 결정 카드"
  → GPT가 모든 산업/기술 답변에 정량화 카드 강제 인용
```

### 좋은 추출

```yaml
minimal_intervention_principle:
  source: "자료 #21 강사 1:1 코칭 etalon"

  core_axioms:
    1. "Student structure is sacred — do not rebuild."
    2. "Substitute, do not add."
    3. "Identify the ONE substitution with highest score impact."
    4. "Quote student's actual word; teach via direct swap."

  application_rules:

    rule: "substitution over insertion"
      explanation: |
        If a student says "great camera", teach "exceptional camera"
        not "exceptional camera with unparalleled image quality".
        One swap. Student copies. Habit forms.

    rule: "quantification as P3 priority for tech/industry"
      explanation: |
        For industry/tech topics at IH→AL transition, ONE quantifier
        ("more than 30% globally") is a high-impact move.
        BUT — only if student's answer has a market/scale claim already.
        Don't force quantification onto a generic answer.
      do_not: "always insert quantifier"
      do: "suggest quantifier where claim invites it"

    rule: "student-already-did detection"
      explanation: |
        If student said "smartphone is famous in the world", they have
        a generality claim. Teach upgrade: "Samsung has gained worldwide
        fame for its high-end products." Student copies.
      do_not: "raise 'missing generality' issue when student has one"
```

→ 자료 #21의 본질은 **최소 개입 + 직접 카피**. 표현 풀 인용 강제가 아님.

---

## 6. 변환 framework 적용 체크리스트

새 강사 자료가 들어왔을 때 다음 체크리스트 통과:

```
[ ] 1. Trigger Condition — 학생 답변에 무엇이 있을 때/없을 때 개입할지 명시했나?
[ ] 2. Score Impact      — ACTFL 평가축 P1~P6 중 어디에 해당하는지 매핑했나?
[ ] 3. Intervention Logic — 강사라면 어떻게 판단하는지 일반화했나?
[ ] 4. Optional Examples  — 표현은 example로만 두고 강제 X 명시했나?
[ ] 5. Level Applicability — 어느 등급에 적용되는지 명시했나?
[ ] 6. Do-Not Clause      — 흔한 오용을 명시적으로 차단했나?
```

6개 다 통과 못 한 추출은 prompt에 들어가지 않는다.

---

## 7. 변환 우선순위

자료 #1~#21 중 변환 작업 우선순위:

| 순위 | 자료 | 변환 결과 위치 |
|------|------|-----------|
| 1 | #1 (음악 IH 1:1) | intervention_rules (Pass1 평가 계약) |
| 2 | #5 (Skeleton paragraph) | discriminator_im3_to_ih (Grade Layer) |
| 3 | #11~#14 (돌발 만능 패턴) | random_topic_capability (Type Overlay) |
| 4 | #21 (산업 1:1) | minimal_intervention_principle (Generation Contract) |
| 5 | #2/#6/#7 (rp_11, rp_12) | rp_type_overlay (Type Overlay) |
| 6 | #8/#9/#10 (past 3종) | past_type_overlay |
| 7 | #15/#16/#17 (adv_14, adv_15) | adv_type_overlay |
| 8 | #3/#4 (기타 강의) | system_core 보강 |

자료 추가될 때마다 framework 통과시켜 추출 → 해당 Layer에 추가.

---

## 8. 변환의 검증 방법

각 변환 추출의 결과는 다음 검증을 통과해야 한다:

```
1. Dogfooding test:
   학생 답변 1건을 가져와 framework 룰만 적용해서 코칭 생성.
   결과가 강사 자료의 etalon과 정합하는지 확인.

2. Cross-topic test:
   같은 룰을 강사가 다루지 않은 토픽에 적용.
   결과가 자연스러운지 확인 (over-fit 안 됐는지).

3. Reverse test:
   학생이 이미 잘한 답변에 적용.
   GPT가 issue를 짚지 않거나 issue 개수가 0~1로 줄어드는지 확인.
   issue_count level limit이 작동하지 않으면 reverse test 실패한다.
```

---

## 9. 다음 문서

- 추출된 룰이 어디로 가는지:
  - System Core 절대 원칙 → [01-system-core.md](./01-system-core.md)
  - Grade Layer discriminator → [02-grade-layer.md](./02-grade-layer.md)
  - Type Overlay reasoning_flow → [03-type-overlay.md](./03-type-overlay.md)
  - Pass1 평가 룰 → [05-evaluation-contract.md](./05-evaluation-contract.md)
  - Pass2 생성 룰 → [06-generation-contract.md](./06-generation-contract.md)
