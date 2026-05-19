# 02. Layer 2 — Grade Layer (등급 = 텍스트 타입)

> **변동성**: 낮음. 6 등급(IL/IM1/IM2/IM3/IH/AL) 정의는 ACTFL 기준 안정적.
> **DB 위치**: `coaching_grade_layer` (예정 신규 테이블, 6 row).
> **들어가는 것**: 등급별 텍스트 타입 / vocab ceiling / syntax 복잡도 / cohesive 밀도 / breakdown 허용.
> **들어가지 않는 것**: 표현 리스트 / 유형 전략 / 토픽 어휘.

---

## TL;DR

> **등급 차이는 어휘 차이가 아니라 텍스트 타입 차이다.**
>
> IH가 IM3과 다른 것은 "captivated를 쓰는가"가 아니라 "skeletal paragraph를 만드는가"이다.

---

## 1. ACTFL 텍스트 타입 매핑

| 등급 | 텍스트 타입 | 자연어 정의 |
|------|----------|----------|
| **IL** | sentence fragments | 단어와 조각 문장. 완전한 문장 못 만드는 게 정상. |
| **IM1** | simple sentences | 단순 문장 가능. 시제 일관성 시도. |
| **IM2** | simple sentences with attempts at connection | 두 문장 묶기 시도. 'and/so/but'. |
| **IM3** | connected sentences | 종속절·연결 안정. 단락 구조는 아직 없음. |
| **IH** | skeletal paragraph | 6 roles 단락 구조 형성. 시제 일관. 일부 cohesive. |
| **AL** | sustained cohesive discourse | 지속 가능한 조직된 담화. 토픽 확장. 자연스러운 흐름. |

---

## 2. 등급별 speech_constraints (JSON)

각 등급의 Pass1/Pass2 prompt에 주입되는 제약 객체:

### IL

```yaml
target_level: "IL"
speech_constraints:
  discourse_type: "sentence_fragments"
  text_role_count: 0-2          # topic + maybe one fact
  vocab_ceiling: "elementary"
  syntax_complexity: "minimal"   # simple present, "be" verb dominant
  cohesive_density: "none"       # zero cohesive devices expected
  allow_minor_breakdown: true
  allow_significant_breakdown: true
  allow_self_repair: true
  word_count_target: 30-60
```

**코칭 의도**: 격려 + 한 문장 완성 시도. 격상 어휘 X. 격상 구조 X.

### IM1

```yaml
target_level: "IM1"
speech_constraints:
  discourse_type: "simple_sentences"
  text_role_count: 2-3
  vocab_ceiling: "basic"
  syntax_complexity: "simple_present + simple_past"
  cohesive_density: "very_low"   # "and" / "so" allowed, nothing higher
  allow_minor_breakdown: true
  allow_significant_breakdown: false
  word_count_target: 50-90
```

**코칭 의도**: 빈도 부사 1~2개 / 단순 묶기 시도. 종속절 X.

### IM2

```yaml
target_level: "IM2"
speech_constraints:
  discourse_type: "simple_with_connections"
  text_role_count: 3-4
  vocab_ceiling: "low_intermediate"
  syntax_complexity: "simple + emerging_subordination"
  cohesive_density: "low"        # "and / but / so / where / when"
  allow_minor_breakdown: true
  allow_significant_breakdown: false
  word_count_target: 80-130
```

**코칭 의도**: 두 문장 묶기 / 종속절(where, when) 시도. Topic sentence 시도.

### IM3

```yaml
target_level: "IM3"
speech_constraints:
  discourse_type: "connected_sentences"
  text_role_count: 4-5
  vocab_ceiling: "intermediate"
  syntax_complexity: "subordination + occasional_participial"
  cohesive_density: "medium_low"  # "firstly / besides / however / in conclusion"
  allow_minor_breakdown: true
  allow_significant_breakdown: false
  word_count_target: 110-160
```

**코칭 의도**: 단락 구조 골격 시도. Cohesive 2~3 카테고리. 분사구문 1~2 베타.

### IH

```yaml
target_level: "IH"
speech_constraints:
  discourse_type: "skeletal_paragraph"
  text_role_count: 6              # full skeleton (see Layer 3 description)
  vocab_ceiling: "upper_intermediate"
  syntax_complexity: "moderate"   # subordination, participial, occasional fronting
  cohesive_density: "medium"      # 4 cohesive categories
  allow_minor_breakdown: true
  allow_significant_breakdown: false
  word_count_target: 150-200
```

**코칭 의도**: skeleton 6 roles 완성. 위치별 표지 일관. Cohesive repetition 회피. 어휘 폭 격상 베타.

### AL

```yaml
target_level: "AL"
speech_constraints:
  discourse_type: "sustained_cohesive_discourse"
  text_role_count: "6+ with extension"
  vocab_ceiling: "advanced"
  syntax_complexity: "complex_natural"  # 자연스러운 복잡함, written-style X
  cohesive_density: "high"              # 5-6 cohesive categories, varied
  allow_minor_breakdown: false
  allow_significant_breakdown: false
  word_count_target: 200-280
  additional_capabilities:
    - topic_extension                   # 주제 확장
    - reflective_moment                 # 메타적 reflection 가능
    - comparative_or_hypothetical       # 비교급 / 가정법 자연 동원
    - graceful_recovery_from_error      # 오류 자가 수정
```

**코칭 의도**: discourse 유지력 + 자연스러운 reflection. Template phrase X. AL은 능력이지 표현 리스트가 아님.

---

## 3. 등급 간 결정 신호 (Discriminators)

각 인접 등급 차이를 발생시키는 **단일 결정 신호**:

```
IL  → IM1:   complete sentence (vs fragments)
IM1 → IM2:   two-sentence connection
IM2 → IM3:   sustained subordination + topic sentence
IM3 → IH:    SKELETON PARAGRAPH (6 roles)          ★ 가장 큰 분기점
IH  → AL:    SUSTAINED DISCOURSE + extension       ★ AL 진짜 본질
```

### IM3 → IH 분기점 (가장 결정적)

```
discriminator: "skeletal paragraph capability"

6 roles must be detectable:
  1. topic_introduction       (소재 도입)
  2. transition_to_details    (세부로 전환 신호)
  3. supporting_point_1       (지원 포인트 1)
  4. supporting_point_2       (지원 포인트 2 — 다른 측면)
  5. closing_synthesis        (마무리 종합)
  6. closure_signal           (마무리 tag)

IM3 = roles 4-5 detected, 6 incomplete
IH  = all 6 roles detected, repetitive transitions OK
AL  = all 6 roles detected + transitions varied + extension
```

→ "skeleton 슬롯 부재 [강]" 흠 판정은 이 6 roles 기반.

### IH → AL 분기점

```
discriminator: "sustained cohesive discourse"

IH가 skeletal paragraph로 끝난다면,
AL은 그 skeleton을 유지하면서 추가로:

  a. topic_extension          — 주제를 깊이/넓이로 확장 (예: 환경 → 미래 세대)
  b. cohesive_variety         — 6 카테고리에서 골고루 (도입/반전/예시/추가/결론도입/마무리)
  c. natural_complexity       — 자연스러운 복잡 구조 (외운 분사구문 X)
  d. self_repair              — 실수 시 자가 수정 가능
  e. reflective_moment        — 메타적 한 문장 자연스럽게 (선택적, 강제 X)

AL ≠ checklist of advanced features
AL = these capabilities flowing naturally in unscripted speech
```

→ "토론 마무리 카드 4문장 그대로 인용"은 AL이 **아니다**. 외운 티 나는 답변은 AL 박탈 신호.

---

## 4. 등급별 issue_count 가이드

System Core의 "ONE core weakness at a time" 원칙을 등급별로 구체화:

| 등급 | 권장 issue 수 | 이유 |
|------|------------|------|
| IL | 0-2 | 발화 자체가 도전 — 격려 우선 |
| IM1 | 2-3 | 단순 문법·시제 점검 |
| IM2 | 2-3 | 묶기 시도 점검 |
| IM3 | 2-3 | 단락 골격 점검 (skeleton 진입 트레이닝) |
| IH | 1-2 | discourse 완성 — 한 가지 큰 흠만 |
| AL | 0-1 | 작은 자연스러움 조정만 (대부분 흠 없음) |

→ issue 개수는 등급에 따라 변동. issue_count level limit이 강제된다.

---

## 5. 등급별 tone_adjustment

```
IL:  "잘 시작하셨어요. 한 문장씩만 완성해보세요. 외우려 하지 마세요."
IM1: "이 표현 한 번 따라해볼래요? 한 단어만 바꿔도 자연스러워져요."
IM2: "두 문장을 'and'나 'where'로 묶어볼까요? 한 슬롯씩 늘려봅시다."
IM3: "이제 단락으로 묶어볼 수 있어요. Skeleton 6 roles 익히면 IH로 가요."
IH:  "Skeleton 완성도 좋아요. 한 가지만 더 자연스럽게 — 어떤 부분이 좋을까요?"
AL:  "충분히 자연스러워요. 굳이 더 멋부리지 말고 이 흐름을 유지하세요."
```

→ tone은 등급별 학습 단계에 맞춤. IL/AL은 격려·검증 중심, IM3/IH는 도전·확장 중심.

---

## 6. 등급 충실도 검증 룰 (Pass1 끝에 GPT가 통과해야 할 게이트)

```
GRADE FIDELITY GATE (after issues identified, before output):

1. Each issue must be appropriate for the target_level.
   - IL student: do NOT raise "Skeleton 6 roles 미달" — they aren't there yet.
   - IM3 student: DO raise skeleton issues — primary growth area.
   - AL student: do NOT raise "어휘 격상 매트릭스 부족" — vocab is not the AL bar.

2. The model_answer's discourse_type must match target_level.
   - IL: fragments → don't write paragraphs.
   - IH: skeletal_paragraph → don't write sustained AL discourse.

3. The model_answer's vocab_ceiling must match.
   - "captivated" / "immense" / "unparalleled" → AL only.
   - Forced into IH model answer = level violation.

If any of above fails → regenerate before output.
```

---

## 7. 적재 계획

- 마이그: `coaching_grade_layer` 테이블 신설.
- 6 row(IL/IM1/IM2/IM3/IH/AL) 적재.
- 각 row 컬럼: `target_level` / `text_type` / `speech_constraints jsonb` / `discriminator_from_below` / `tone_adjustment` / `issue_count_min` / `issue_count_max` / `word_count_min` / `word_count_max`.

---

## 8. 다음 문서

- 유형별 reasoning_flow + intervention_triggers → [03-type-overlay.md](./03-type-overlay.md)
- Pass1 평가 우선순위 (등급 게이트와 어떻게 결합되는지) → [05-evaluation-contract.md](./05-evaluation-contract.md)
- Pass2 model_answer 생성 (등급 충실도 강제) → [06-generation-contract.md](./06-generation-contract.md)
