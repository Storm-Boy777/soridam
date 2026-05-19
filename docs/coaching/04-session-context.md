# 04. Layer 4 — Session Context (학생 상태, 동적)

> **변동성**: 높음. 매 회차마다 갱신.
> **위치**: `coaching_attempts` 테이블의 이전 row + `coaching_sessions` 메타. EF가 매번 fetch.
> **들어가는 것**: 학생 이전 회차 흠 / 반복 패턴 / current_focus / filler 습관.
> **들어가지 않는 것**: 강사 자료 / 등급 규칙 / 유형 전략.

---

## TL;DR

> Session Context는 **학생 개인의 학습 곡선**을 GPT에게 알려주는 layer.
>
> 같은 학생이 5번째 회차에서 같은 흠을 또 짚히면 코칭이 아니다. 회차별 진척을 시스템이 인지해야 한다.

---

## 1. 4개 핵심 필드

```yaml
session_context:
  attempt_number: 1                   # 이번 회차 번호
  previous_issues: [...]              # 직전 회차들에서 짚힌 흠 (recent 2~3 회차)
  current_focus: [...]                # 이번 회차에 집중할 목표 (SA에서 지정 가능)
  recurring_patterns: [...]           # 3+ 회차 연속 같은 흠 = recurring
```

---

## 2. previous_issues 구조

```yaml
previous_issues:
  - attempt: 2
    issue_type: "discourse_breakdown"
    severity: "high"
    quote: "I like to listen music, and..."
    resolved_in_next: false           # 다음 회차에 해결됐는지

  - attempt: 1
    issue_type: "vocab_repetition"
    severity: "medium"
    quote: "I really like music. I really like classical."
    resolved_in_next: true            # 2회차에서 해결됨
```

→ Pass1 prompt에 직전 1~3 회차 issues 주입. GPT가 학생 학습 곡선 이해.

---

## 3. 회차별 GPT 행동 변화

같은 spec이라도 회차에 따라 다른 코칭:

### 1회차 (첫 시도)

```
no previous_issues
→ GPT는 spec 우선순위 그대로 적용
→ 가장 큰 흠 1~2개 짚음
```

### 2회차 (직전 흠 받은 후)

```
previous_issues에 [P3 sequencing, P5 vocab repetition] 있음
→ GPT는:
   - 직전 흠이 이번에 resolved되었는지 먼저 확인
   - resolved되었으면 칭찬 + 다음 흠으로
   - 안 됐으면 같은 흠 다시 짚지만 다른 angle로 시범
```

### 3+ 회차 (recurring)

```
previous_issues에 같은 P5 vocab repetition이 3회 연속
→ GPT는:
   - "recurring pattern" 인지
   - micro_drill 제안 (해당 흠 전용 짧은 연습)
   - 다른 흠은 모두 미루고 이 흠만 집중
```

---

## 4. recurring_patterns 정의

```yaml
recurring_patterns:
  - pattern_id: "vocab_repetition_basic_verbs"
    consecutive_attempts: 3
    last_observed: 4                  # 가장 최근 4회차에서 관찰
    suggested_action: "isolated micro_drill"
```

EF가 직전 N 회차 attempts를 읽고 패턴 감지 → Pass1 prompt에 주입.

```
RECURRING PATTERN DETECTED:
"vocab_repetition_basic_verbs" — 3 consecutive attempts.

Action: focus this attempt SOLELY on this pattern.
Do NOT raise other issues even if visible.
Generate a micro_drill that targets this specific weakness.
```

---

## 5. current_focus (선택적 — SA로 지정)

```yaml
current_focus:
  - "extend discourse beyond 30 seconds"
  - "improve cohesive variety"
```

학생이 특정 영역에 집중하고 싶다고 명시하거나, 강사(관리자)가 학생별 목표 설정 시 SA로 주입. Pass1 prompt에 hint로 들어감.

```
STUDENT FOCUS THIS ATTEMPT:
  - extend discourse beyond 30 seconds
  - improve cohesive variety

If issues in these areas exist, prioritize them.
If not, proceed with normal priority order.
```

---

## 6. filler_patterns

학생의 음성 답변 분석에서 추출된 filler 습관:

```yaml
filler_patterns:
  total_word_count: 142
  filler_count: 18
  filler_ratio: 0.127
  dominant_fillers:
    - { word: "um", count: 8 }
    - { word: "you know", count: 5 }
    - { word: "actually", count: 3 }
  natural_threshold: 0.05            # 5% 이하면 자연스러움
  excessive_threshold: 0.15          # 15% 이상이면 과도
```

GPT는 filler 패턴을 보고:
- ratio < 0.05 → 짚지 않음 (자연스러움)
- 0.05 ≤ ratio < 0.15 → 정상 spoken English. 짚지 않음.
- ratio ≥ 0.15 → P3 issue (단, level별 허용도 다름)
- **AL 학생만 filler 줄이기 짚을 수 있음** (IL~IH는 filler 학습 단계 아님)

---

## 7. EF 조립 로직 (예정)

```ts
async function fetchSessionContext(supabase, sessionId, currentAttemptNumber) {
  // 1. 직전 1~3 회차 attempts fetch
  const { data: prevAttempts } = await supabase
    .from("coaching_attempts")
    .select("attempt_number, evaluation, filler_count, word_count")
    .eq("session_id", sessionId)
    .lt("attempt_number", currentAttemptNumber)
    .order("attempt_number", { ascending: false })
    .limit(3);

  // 2. previous_issues 추출
  const previous_issues = prevAttempts.flatMap(a =>
    (a.evaluation?.issues ?? []).map(i => ({
      attempt: a.attempt_number,
      issue_type: i.issue_type,
      severity: i.severity,
      quote: i.quote,
      resolved_in_next: /* 다음 회차 issues와 비교해서 자동 판정 */
    }))
  );

  // 3. recurring_patterns 감지
  const recurring_patterns = detectRecurring(previous_issues, threshold=3);

  // 4. current_focus는 session 메타에서
  const { data: session } = await supabase
    .from("coaching_sessions")
    .select("current_focus")
    .eq("id", sessionId)
    .single();

  return {
    attempt_number: currentAttemptNumber,
    previous_issues,
    current_focus: session?.current_focus ?? [],
    recurring_patterns,
  };
}
```

---

## 8. user prompt 주입 예시

```
=== SESSION CONTEXT ===
Attempt: 3

Previous issues (last 2 attempts):
  [Attempt 2] P5 vocab_repetition "really like" — NOT resolved this time
  [Attempt 2] P3 closing_tag_absent — RESOLVED
  [Attempt 1] P5 vocab_repetition "really like" — observed

RECURRING PATTERN: vocab_repetition_basic_verbs (3 consecutive)
Action: focus this attempt SOLELY on this pattern.

Current focus: (none specified by student)

Filler ratio: 0.08 (natural range — do not raise)
```

→ GPT는 이 컨텍스트를 받고 vocab repetition만 짚음. 다른 issue 무시. micro_drill 제안.

---

## 9. 적재 계획

- 마이그: `coaching_sessions.current_focus jsonb` 컬럼 추가 (학생별 집중 영역, 관리자/학생 설정).
- `coaching_attempts.coaching_json` 안의 `issues[]` 스키마에 `issue_type` 필드 강제 (recurring 감지용 — 표준화된 ID).
- EF 내부: `fetchSessionContext()` 함수 + `detectRecurring()` 로직.

---

## 10. 다음 문서

- 이 컨텍스트가 Pass1 평가에 어떻게 결합되는지 → [05-evaluation-contract.md](./05-evaluation-contract.md)
- Pass2 생성이 회차 인지하면서 model_answer 만드는 방식 → [06-generation-contract.md](./06-generation-contract.md)
- issue_type 스키마 (recurring 감지 핵심) → [07-output-schema.md](./07-output-schema.md)
