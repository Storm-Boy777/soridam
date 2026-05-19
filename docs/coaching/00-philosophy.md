# 00. Core Philosophy — 판단 기준 엔진

> 모든 다른 파일이 이 철학에서 derive된다. 작업 중 갈림길이 나오면 이 문서를 다시 읽고 결정한다.

---

## TL;DR

> **표현을 저장하지 마라. 표현이 등장하는 *조건*을 저장해라.**
>
> **강사의 *언어*를 학습하지 마라. 강사의 *개입 기준*을 학습해라.**

---

## 1. 우리가 만들려는 것

### 표현 생성기 ❌

```
AL 표현:
  - captivated
  - numerous
  - initiative
  - breathtaking
  - immense sense of pride
  - the planet belongs to children's children
  ...
```

→ 학생 답변에 위 표현을 박아 넣음 → 통합 답변이 "**시험 모범답안 톤**". 본인 경험과 분리. 외운 티.

### 판단 기준 엔진 ✅

```
조건: 학생이 감정적 강조가 필요한 순간을 묘사 중인가?
  → 감정의 vividness를 reaction-oriented language로 격상 제안.

조건: 학생 답변에 환경 변화 시그널이 있는가?
  → reflective extension on broader environmental shift.

조건: 답변이 30초에서 끊기는가?
  → vocab 격상 X. discourse extension 우선.
```

→ 학생 답변을 보고 **조건 충족 시에만** 격상 제안. 본인 경험 유지.

---

## 2. 강사의 표면 언어 vs 강사의 개입 알고리즘

### 강사가 자주 쓰는 표현 (표면)

```
"take some initiative"
"numerous mountains"
"actually, you know, to be honest"
"on top of that"
"immense sense of pride"
```

### 강사가 실제로 머릿속에서 하는 판단 (알고리즘)

```
[학생 답변]
  - 짧다 → discourse extension 필요
  - 끊긴다 → sustainment 능력 부족
  - 소재 OK → 새 소재 강요 X

[강사 결정]
  ❌ 고급 단어 추가
  ❌ 문법 교정
  ✅ 이야기 확장
  ✅ 연결 강화
  ✅ 이유 1개 추가
  ✅ 마무리 추가
```

→ 우리가 시스템화해야 할 것은 **알고리즘**이다. 표현은 부산물.

---

## 3. 추출 원칙 — 나쁜 추출 vs 좋은 추출

### 자료 #1 (음악 IH 1:1 코칭) — 표현 vs 판단

**나쁜 추출**
```
"all his songs → all of his songs"
"He is beautiful → His music is beautiful"
"Some of ... is → Some of ... are"
→ description_IH.coaching_focus에 표현 리스트로 박힘.
```

**좋은 추출**
```yaml
intervention_priority_1:
  trigger: "student uses object pronoun for non-object subject"
  example_pattern: "He/She [adjective]" applied to non-human
  judgment: "natural English expects metonymy or specifier"
  fix_strategy: "guide toward attribute/subject specification"

intervention_priority_2:
  trigger: "agreement violation in 'some/one of + plural'"
  judgment: "ACTFL grammar consistency — AL blocker"
  fix_strategy: "point to subject-verb agreement, not vocab"
```

→ 표현은 example로만 옆에 둔다. 핵심은 **언제 개입하는가** + **무엇을 측정하는가**.

---

### 자료 #5 (Skeleton paragraph 강의) — 표현 vs 판단

**나쁜 추출**
```
"To talk about my house, ..."
"to get into more details, ..."
"the first thing is that ..."
"the second thing is that ..."
"the last thing is that ..."
"Overall, ..."
"That's about it."
→ topic_skeleton의 step1~7 슬롯에 박힘.
```

**좋은 추출**
```yaml
skeleton_paragraph_capability:
  discriminator: "IM3 → IH transition point"
  judgment: "answer must have 6 detectable structural roles"
  roles:
    - topic_introduction      # 소재 도입
    - transition_to_details   # 세부로 전환
    - supporting_point_1      # 첫 지원 포인트
    - supporting_point_2      # 둘째 지원 포인트
    - closing_synthesis       # 마무리 종합
    - closure_signal          # 마무리 tag

  intervention_logic:
    - if missing 3+: "intervene on structure, not vocab"
    - if all present + repetitive markers: "diversify transition signals (NOT add fancy words)"
    - if all present + diverse: "discourse OK — focus shift to vocab/grammar"
```

→ "To talk about my house"는 example. 핵심은 **6 roles 충족 여부 + 진단 우선순위**.

---

### 자료 #11~#14 (돌발 만능 패턴) — 표현 vs 판단

**나쁜 추출**
```
"numerous banks out there in Korea"
"a large portion of the population frequents..."
"It fills me with an immense sense of pride"
"The planet belongs to our children's children..."
→ topic_skeleton.skeleton_slots에 표현 풀로 박힘. REQUIRED 카드 의무 인용.
```

**좋은 추출**
```yaml
random_topic_capability:
  judgment: "AL discriminator — can student sustain organized discourse on un-prepared topic?"

  not_a_skill: "memorizing 14 topic full-answers"
  actual_skill:
    - quick stalling for thinking time
    - generalization from limited knowledge
    - 1-2 personal hooks despite unfamiliar topic
    - graceful close without breakdown

  intervention_logic:
    - if answer < 30 seconds: "sustainment training, NOT vocab upgrade"
    - if answer generic with no personal hook: "add 1 personal anchor"
    - if AL target + answer purely descriptive: "ONE reflective sentence — if naturally bridged"
    - never force "토론 마무리 카드" if student answer doesn't earn it
```

→ 강사가 14 토픽 풀 모범을 가르치는 본질 = **"un-prepared 주제도 organized discourse 유지"**. 표현 암기가 아니라 능력 측정.

---

## 4. AL의 본질

### AL이 아닌 것 ❌

```
AL = difficult words
AL = captivated, numerous, initiative, immense
AL = "the planet belongs to children's children"
AL = 길이 200+ 단어
AL = 분사구문 풀 동원
```

### AL의 진짜 정체 ✅

```
AL = sustained organized spoken discourse

핵심 4축:
  1. sustainment       — 답변이 끊기지 않음
  2. organization      — 논리 흐름 유지
  3. natural delivery  — 외운 티가 안 남
  4. topic extension   — 주제를 깊이/넓이로 확장 가능
```

→ **단어가 아니라 능력**. 따라서 시스템도 단어 매트릭스가 아니라 능력 측정 엔진이 되어야 한다.

---

## 5. 좋은 강사의 진짜 가치

### 표면

```
"이거 한 번 따라해볼래요?"
"이 표현 외워두세요"
"AL 진입 후보예요"
```

### 본질

```
[학생 답변 진단]
  - 무엇이 가능한 수준인가
  - 무엇이 아직 이른가
  - 무엇이 시간 대비 효과 큰가
  - 무엇을 빼야 자연스러워지는가

[개입 결정]
  - 한 번에 1~2개만 짚는다
  - 학생이 이미 한 것은 짚지 않는다
  - 가장 큰 score blocker 우선
  - 학생이 카피하기 쉬운 단위로 시범
```

→ 강사의 진짜 가치 = **체화시키는 판단 framework**. 표현 사전이 아님.

---

## 6. 추가가 아니라 제거

### 함정 — 추가 중심

```
학생 답변
  + 만능 패턴 7 Step
  + 격상 어휘 매트릭스
  + 토론 마무리 4문장 카드
  + 정량화 한 줄
  + 분사구문 3개
  = 통합 답변 (학생 경험에서 멀어짐)
```

### 정답 — 제거 중심

```
[중심 질문]
  "How can this answer sound more natural and sustainable?"

[제거 대상]
  - 불필요한 문장
  - 과한 단어
  - 말 안 되는 흐름
  - 외운 티
  - 본인 경험에서 어긋난 모범답안 톤

[추가는 최소]
  - 학생이 이미 시도한 흐름의 자연스러운 연장 1~2개만
```

---

## 7. 시스템 설계 결정 원칙

작업 중 결정 갈림길이 나오면 다음 질문 순서로 판단:

```
1. 이게 표현인가, 판단인가?
   → 표현이면 example 옆에 둔다. 판단이면 system core/contract에 넣는다.

2. 이게 모든 학생에게 적용되나, 조건부인가?
   → 조건부면 intervention_triggers로 추출. 강제 X.

3. 이게 시험 점수에 큰 영향인가, 작은 영향인가?
   → 작은 영향이면 우선순위 낮춤. 큰 흠 먼저.

4. 이게 학생 본인 경험을 보존하나, 대체하나?
   → 대체하면 철학 위반. 학생 골격 유지.

5. 이걸 빼면 답변이 더 자연스러워지나?
   → YES면 빼는 게 정답.
```

---

## 8. 이 철학을 따를 때의 약속

이 철학을 따르면:

1. **템플릿 냄새가 줄어든다** — 같은 표현 반복 X
2. **Topic generalization** — 한 토픽 학습이 다른 토픽에 일반화
3. **ACTFL 평가 기준과 정합** — discourse > vocab
4. **자연스러운 학습 진척** — 한 번에 1~2개 흠만 짚어 체화
5. **본인 경험 보존** — 학생 답변이 본인 스토리로 남음
6. **장기 운영 가능** — 강사 자료 추가 시 표현 더 박는 게 아니라 판단 룰 추가

---

## 9. 다음 문서로

- 이 철학이 **Layer 1 System Core**에 절대 원칙으로 박힘 → [01-system-core.md](./01-system-core.md)
- 강사 자료를 어떻게 판단 로직으로 변환할지 → [09-curriculum-conversion.md](./09-curriculum-conversion.md)
- 출력 issues[]가 어떻게 세분화되는지 (issue_type / score_impact / learnability / micro_drill) → [07-output-schema.md](./07-output-schema.md)
