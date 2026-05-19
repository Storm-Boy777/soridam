# 07. Output Schema — coaching_json strict

> **위치**: `coaching_attempts.coaching_json jsonb` 컬럼.
> **계약**: Pass1 + Pass2 결과 결합 후 단일 JSON으로 저장.
> **UI**: [learn-room.tsx](../../components/coaching/learn-room.tsx) ModelAnswer / IssueCard / ActionChecklist가 렌더링.

---

## TL;DR

> strict JSON 스키마. 모든 필드 type/필수 여부 명시. UI 및 향후 마이그·분석에 안정.

---

## 1. 전체 스키마

```json
{
  "intro": "string",
  "progress_table": {
    "discourse_quality": "string",
    "level_fit": "string",
    "sustainment": "string",
    "filler_naturalness": "string"
  },
  "issues": [
    {
      "issue_type": "string",
      "severity": "high | medium | low",
      "score_impact": "P1_discourse_breakdown | P2_sustainment | P3_sequencing | P4_cohesive_repetition | P5_vocab_limitation | P6_grammar_accuracy",
      "learnability": "easy | moderate | hard",
      "quote": "string (verbatim from student)",
      "fix_strategy": "string (Korean coaching tone)",
      "micro_drill": "string | null"
    }
  ],
  "session_progression": {
    "previous_issues_resolved": ["string"],
    "previous_issues_still_present": ["string"],
    "recurring_pattern_action": "isolated_focus | null"
  },
  "model_answer": {
    "text": "string (English, level-faithful)",
    "preservation_check": {
      "student_anchors_kept": ["string"],
      "additions": ["string"],
      "removals": ["string"]
    },
    "changes": [
      {
        "change_type": "structure | vocab | grammar | participial | cohesive | closing | removal",
        "from": "string",
        "to": "string",
        "rationale": "string"
      }
    ],
    "level_fit_check": "string"
  },
  "action_items": ["string"],
  "closing": "string"
}
```

---

## 2. 필드별 상세

### intro (string, required)

```
- 1~2 문장
- 학생 답변에 대한 첫 격려 + 회차 진척 한 줄
- 한국어
- 예: "1회차 답변 잘 하셨어요! Skeleton 6 roles 중 5개를 채우셨네요.
        마무리 한 줄만 더하면 완성도가 높아질 거예요."
```

### progress_table (object, required)

Pass1 evaluation_summary 4 축 그대로:

```yaml
progress_table:
  discourse_quality: "skeletal_paragraph_partial"
  level_fit: "approaching_IH"
  sustainment: "adequate"
  filler_naturalness: "natural"
```

UI에서 4 축을 작은 카드로 시각화. Pass1 / Pass2 둘 다 이 객체 참조.

### issues[] (array, length matches level)

각 issue 7 필드:

```yaml
issue_type: "skeleton_role_missing_closing"   # 표준화된 ID
severity: "high"                              # high / medium / low
score_impact: "P3_sequencing"                 # P1~P6 우선순위 매핑
learnability: "easy"                          # easy: 1회차 해결 / moderate: 3~5 회차 / hard: 장기
quote: "I usually relax on the sofa."         # 학생 transcript 그대로
fix_strategy: |
  마무리 한 줄을 추가해보세요. 'Overall, my house gives me comfort. That's about it.'
  같이 짧게 합쳐도 됩니다.
micro_drill: |
  3회차에 같은 흠이 보이면, '5초 안에 closing tag 외우기' 드릴 1회.
  null이면 micro_drill 없음.
```

**issue_type 표준화 (예시 카탈로그)**:

```
discourse_breakdown_early_cutoff
sustainment_under_30s
sequencing_random_order
skeleton_role_missing_intro
skeleton_role_missing_transition
skeleton_role_missing_supporting
skeleton_role_missing_closing
cohesive_repetition_basic
cohesive_variety_low
vocab_repetition_basic_verbs
vocab_repetition_basic_adjs
agreement_quantifier_plural
preposition_time_marker
participial_opportunity_missed (IH+ only)
register_too_formal_for_spoken
closing_tag_absent
unnatural_phrase_choice
```

→ 표준화 ID는 recurring 감지 + 분석 추적 가능.

**severity 정의**:
- `high`: score blocker — ACTFL rater가 이 흠으로 등급 깎음
- `medium`: polish — 등급 영향 작지만 자연스러움 영향
- `low`: optional — 무시해도 OK

**learnability 정의**:
- `easy`: 1회차 시범 보면 다음 회차에 해결 가능
- `moderate`: 3~5 회차 누적 연습 필요
- `hard`: 장기 트레이닝 — 등급 진입 후 6+ 회차

### session_progression (object, required)

```yaml
previous_issues_resolved:
  - "P3 closing_tag_absent (resolved in attempt 3)"

previous_issues_still_present:
  - "P5 vocab_repetition 'really like' (3rd consecutive)"

recurring_pattern_action: "isolated_focus"   # null if no recurring
```

UI에 작은 진척 카드 표시 — "지난 회차에 짚힌 흠 1개 해결됨" / "3회 연속 같은 흠 — 집중 모드".

### model_answer (object, required)

#### text (string)

```
- 영어
- 등급 충실 (vocab_ceiling 내, discourse_type 일치)
- 학생 anchors 보존
- 자연스러운 spoken English (written essay 톤 X)
```

#### preservation_check (object — Pass2 자가 검증)

```yaml
student_anchors_kept:
  - "Gumi 도시명"
  - "sofa watching TV 일과"
  - "wife and two kids 가족"
additions:
  - "opening: To talk about my house, ..."
  - "closing: Overall, ... That's about it."
removals: []
```

→ GPT가 자가 검증 통과한 결과. UI에는 표시 X (디버그·추적용).

#### changes[] (array)

```yaml
- change_type: "structure"
  from: "(no opening)"
  to: "To talk about my house, I live in an apartment in Gumi."
  rationale: "topic_introduction role 추가 (skeleton 6 roles 완성)"

- change_type: "vocab"
  from: "really like (4 times)"
  to: "enjoy (2nd instance)"
  rationale: "highest-frequency repeat 1개만 substitution"

- change_type: "closing"
  from: "(answer ends abruptly)"
  to: "Overall, my house gives me comfort. That's about it."
  rationale: "closure_signal role 추가"
```

UI ModelAnswer의 `categorizeChange()` 함수가 `change_type`을 보고 카테고리 칩 + 그루핑.

#### level_fit_check (string)

```
- "passed: discourse_type=skeletal_paragraph matches target=IH"
- "passed: vocab within upper_intermediate ceiling"
- 또는 fail 사유 (재생성 트리거)
```

### action_items[] (array, length 2-3)

```yaml
action_items:
  - "다음 답변 끝에 'Overall, ___' + 'That's about it.' 마무리 시도"
  - "really 반복 줄이기 — 한 번만 enjoy로 바꿔보기"
```

→ 2~3개 고정. 5개+ 절대 X. 등급 적합.

### closing (string)

```
- 1~2 문장
- 격려 + 다음 회차 안내
- 예: "Skeleton 5/6 채우셨어요. 마무리만 한 번 외워보면 IH 안정권이에요. ☕"
```

---

## 3. UI 렌더링 매핑

```
coaching_json
├── intro                → 학습룸 상단 격려 박스
├── progress_table       → 4 축 미니 카드 (discourse_quality 등)
├── issues[]             → IssueCard × N
│   ├── severity         → 카드 좌측 색상 (high=red, medium=amber, low=slate)
│   ├── score_impact     → 작은 P1~P6 뱃지
│   ├── quote            → 인용 박스 (Quote icon)
│   ├── fix_strategy     → 본문
│   └── micro_drill      → 접기 영역 (있을 때만)
├── session_progression  → 진척 미니 카드 (있을 때만)
├── model_answer
│   ├── text             → 통합 답변 본문 + 듣기 버튼 (Web Speech API)
│   ├── changes[]        → "무엇이 바뀌었나" 그루핑 (categorizeChange 7 카테고리)
│   └── (preservation_check, level_fit_check) → UI 표시 X (디버그)
├── action_items[]       → ActionChecklist
└── closing              → 학습룸 하단 마무리 메시지
```

---

## 4. JSON 유효성 검증 (서버측)

EF가 GPT 응답 받은 후 검증:

```ts
function validateCoachingJson(json: unknown): CoachingJson {
  // 1. 최상위 필드 존재
  assertHas(json, ["intro", "progress_table", "issues", "model_answer", "action_items", "closing"]);

  // 2. issues[] length match level
  const levelLimit = getIssueCountLimit(targetLevel);
  if (json.issues.length > levelLimit.max) {
    throw new ValidationError(`issues count ${json.issues.length} exceeds ${targetLevel} limit ${levelLimit.max}`);
  }

  // 3. 각 issue의 score_impact enum 확인
  for (const issue of json.issues) {
    assertEnum(issue.score_impact, P1_TO_P6_ENUM);
    assertEnum(issue.severity, ["high", "medium", "low"]);
    assertEnum(issue.learnability, ["easy", "moderate", "hard"]);
  }

  // 4. model_answer 등급 충실도
  validateLevelFit(json.model_answer, targetLevel);

  // 5. action_items length 2~3
  if (json.action_items.length < 2 || json.action_items.length > 3) {
    throw new ValidationError(`action_items count ${json.action_items.length} not in [2,3]`);
  }

  return json as CoachingJson;
}
```

검증 실패 시 GPT 재호출 (max 1회). 두 번 실패 시 attempt status='failed'.

---

## 6. TypeScript 타입 (참조)

```ts
// lib/types/coaching.ts

export type ScoreImpact =
  | "P1_discourse_breakdown"
  | "P2_sustainment"
  | "P3_sequencing"
  | "P4_cohesive_repetition"
  | "P5_vocab_limitation"
  | "P6_grammar_accuracy";

export type ChangeType =
  | "structure" | "vocab" | "grammar"
  | "participial" | "cohesive" | "closing" | "removal";

export interface CoachingIssue {
  issue_type: string;
  severity: "high" | "medium" | "low";
  score_impact: ScoreImpact;
  learnability: "easy" | "moderate" | "hard";
  quote: string;
  fix_strategy: string;
  micro_drill: string | null;
}

export interface ModelAnswerChange {
  change_type: ChangeType;
  from: string;
  to: string;
  rationale: string;
}

export interface CoachingJson {
  intro: string;
  progress_table: {
    discourse_quality: string;
    level_fit: string;
    sustainment: string;
    filler_naturalness: string;
  };
  issues: CoachingIssue[];
  session_progression: {
    previous_issues_resolved: string[];
    previous_issues_still_present: string[];
    recurring_pattern_action: "isolated_focus" | null;
  };
  model_answer: {
    text: string;
    preservation_check: {
      student_anchors_kept: string[];
      additions: string[];
      removals: string[];
    };
    changes: ModelAnswerChange[];
    level_fit_check: string;
  };
  action_items: string[];
  closing: string;
}
```

---

## 7. 다음 문서

- 이 스키마가 어떻게 두 Pass에서 조립되는지 → [08-prompt-assembly.md](./08-prompt-assembly.md)
- 적재 마이그 시퀀스 → [10-migration-plan.md](./10-migration-plan.md)
- UI 컴포넌트 (ModelAnswer / IssueCard) → [learn-room.tsx](../../components/coaching/learn-room.tsx)
