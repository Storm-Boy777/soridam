# 10. Migration Plan — 적재 마이그 시퀀스

> **목적**: 6-Layer 구조 + 2-Pass 호출의 DB·EF·UI 적재를 단계적으로 진행.
> **원칙**: 단일 유형 검증 통과 후 다음 단계. 큰 결정 일괄 적용 X.

---

## TL;DR

마이그 5건 + EF 작성 + UI 갱신을 단계별로 진행. 각 단계 끝에 Dogfooding 검증.

---

## 1. 마이그 시퀀스

### Stage 1 — System Core 적재

**마이그**: `ai_prompt_templates`에 `coaching_system` row INSERT.

```sql
INSERT INTO ai_prompt_templates (
  template_id, system_prompt, model, temperature, max_tokens, is_active
) VALUES (
  'coaching_system',
  $SYSTEM$
[01-system-core.md 본문 8 섹션을 영어 system prompt로 직조]
  $SYSTEM$,
  'gpt-4.1',
  0.5,
  2000,
  true
);
```

본문은 [01-system-core.md](./01-system-core.md) §1~§8 참조.

### Stage 2 — Grade Layer 테이블 + 6 row

```sql
CREATE TABLE coaching_grade_layer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_level text NOT NULL UNIQUE,
  text_type text NOT NULL,
  speech_constraints jsonb NOT NULL,
  discriminator_from_below text,
  tone_adjustment text NOT NULL,
  issue_count_min int NOT NULL,
  issue_count_max int NOT NULL,
  word_count_min int NOT NULL,
  word_count_max int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6 row 적재: IL / IM1 / IM2 / IM3 / IH / AL
-- 본문은 02-grade-layer.md §2 참조.
```

### Stage 3 — Type Overlay 테이블 + 11 row

```sql
CREATE TABLE coaching_type_overlay (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id text NOT NULL UNIQUE,
  reasoning_flow jsonb NOT NULL,
  intervention_triggers jsonb NOT NULL,
  optional_examples jsonb,
  group_awareness jsonb,
  applies_to jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 11 row 적재: 10 유형 + description_random
-- 본문은 03-type-overlay.md §2~§7 참조.
```

### Stage 4 — Session Context 컬럼

```sql
ALTER TABLE coaching_sessions
  ADD COLUMN current_focus jsonb DEFAULT NULL;
```

`coaching_attempts.coaching_json` 안의 `issues[]` 스키마는 EF 단계에서 강제 (DB 자유 jsonb).

### Stage 5 — EF 재작성

`supabase/functions/coaching-evaluate/index.ts`를 2-Pass 구조로 작성.

핵심 함수:
- `fetchAllLayers()` — System / Grade / Type / Session 동시 조회
- `assemblePass1Prompt()` — 평가 user prompt 조립
- `runPass1()` — 평가 GPT 호출 (temperature 0.5)
- `validatePass1Output()` — issue_count level limit / score_impact enum 검증
- `assemblePass2Prompt()` — 생성 user prompt 조립 (Pass1 output 포함)
- `runPass2()` — 생성 GPT 호출 (temperature 0.65)
- `validatePass2Output()` — model_answer 등급 충실 / preservation_check / action_items 길이 검증
- `mergePassOutputs()` — 최종 `coaching_json` 조립

상세는 [08-prompt-assembly.md](./08-prompt-assembly.md) 참조. EF 재배포는 `npx supabase functions deploy coaching-evaluate --no-verify-jwt`.

---

## 2. 단계별 검증

### Phase 1 — System Core + Grade Layer 적재 후

1. 마이그 Stage 1~2 적용
2. EF가 System Core fetch + Grade Layer fetch만으로 작동하도록 임시 구현 (Type Overlay 없이도 동작)
3. 단일 유형 (예: description) 1 회차 검증 — 등급별 issue_count limit / model_answer 등급 충실 확인

### Phase 2 — Type Overlay 추가 (description 1 row)

4. `coaching_type_overlay`에 `description` row 1건만 시드
5. 음악 IH 답변으로 검증 — reasoning_flow 작동 / intervention_triggers 정합 / 학생 골격 유지 확인
6. 통과하면 다음 유형 row 추가

### Phase 3 — description_random 추가 (1 row + 28 토픽 group_awareness)

7. `description_random` row 추가
8. 지형 IH / 미용실 IH / 직장 IH 등 28 토픽 다양화 검증
9. 강사 canon 13 + 확장 15 토픽 모두 자연스러운 코칭 나오는지 확인
10. **토론 마무리 카드 / 정량화 / 양면 토론이 학생 답변에 자연 bridge 없으면 강제로 안 들어가는지** 핵심 검증

### Phase 4 — 나머지 9 유형 순차 추가

11. routine → comparison → past_childhood → past_recent → past_special → adv_14 → adv_15 → rp_11 → rp_12 순서
12. 각 유형 1~2 회차 Dogfooding 검증 후 다음 유형

### Phase 5 — Session Context 작동

13. `current_focus` 컬럼 활용 — 학생별 집중 영역 SA 설정 가능
14. `previous_issues` 자동 추출 + `recurring_patterns` 감지 검증
15. 3 회차 연속 같은 흠 짚힐 때 micro_drill 제안 작동 확인

### Phase 6 — UI 갱신

16. `components/coaching/learn-room.tsx`에 `progress_table` 4 축 카드 추가
17. `session_progression` 진척 카드 (resolved/still_present/recurring)
18. `issues[]`에 `severity` 색상 + `score_impact` P1~P6 뱃지 + `learnability` 표시
19. `model_answer.changes[]`에 `change_type` 분류 시각화 (이미 categorizeChange 7 카테고리 있음 — 정확도 향상)

---

## 3. 검증 룰

### 등급 충실도

학생 답변 등급보다 model_answer가 1~2 등급 위로 over-shoot되면 실패.

```
IH 학생 → model_answer가 sustained AL discourse → FAIL
IH 학생 → model_answer가 skeletal paragraph + 1~2 미세 격상 → PASS
```

### 학생 골격 유지

학생의 specific topic / 본인 anecdote / 본인 chosen connector가 model_answer에 보존되어야 함.

```
학생: "I live in an apartment in Gumi"
model_answer에 "Gumi" 없음 → FAIL
model_answer에 "Gumi" + 본인 일상 유지 → PASS
```

### 표현 카드 조건부 적용

REQUIRED 표시 X. 학생 답변에 자연 bridge 있을 때만 도입.

```
환경 토픽 학생이 환경 보존 시사 X → 토론 마무리 카드 X
환경 토픽 학생이 환경 변화 언급 → 토론 마무리 카드 1~2문장 베타 OK (AL 학생만)
산업 토픽 학생이 시장 점유율 시사 X → 정량화 카드 X
산업 토픽 학생이 "famous in the world" 표현 → 정량화 substitution OK
```

### issue_count level limit

```
IL: 0-2 / IM1: 2-3 / IM2: 2-3 / IM3: 2-3 / IH: 1-2 / AL: 0-1
```

위 범위 벗어나면 검증 실패. Pass1 재호출.

### Reverse test

학생이 이미 잘한 답변에 적용. issue 0~1개 짚히거나 칭찬 위주 코칭이 나와야 함. 일률 3개 짚히면 시스템 오작동.

---

## 4. 비용 모니터링

`api_usage_logs`로 회당 비용 추적:

```sql
SELECT
  date_trunc('day', created_at) AS day,
  count(*) AS calls,
  sum(cost_usd) AS total_cost,
  avg(cost_usd) AS avg_per_attempt
FROM api_usage_logs
WHERE session_type = 'coaching'
  AND created_at >= now() - interval '7 days'
GROUP BY 1
ORDER BY 1 DESC;
```

회당 평균 비용이 $0.20 초과 시 Pass1을 `gpt-4.1-mini`로 다운그레이드 검토.

---

## 5. 변경 영향 범위

| 영역 | 변경 |
|------|------|
| DB | 마이그 5건 (System / Grade / Type / Session 컬럼 / 검증 후 정리) |
| EF | `coaching-evaluate` 2-Pass 구조 작성. `coaching-preprocess`는 그대로 유지. |
| SA | `lib/actions/coaching.ts` — `session.current_focus` 조회/저장 추가 |
| 타입 | `lib/types/coaching.ts` — `CoachingJson` / `CoachingIssue` / `ModelAnswerChange` / `ScoreImpact` / `ChangeType` |
| UI | `components/coaching/learn-room.tsx` — progress_table / session_progression / issues 시각화 |
| 문서 | `docs/coaching/` 11 파일 |

---

## 6. 작업 추정

| Phase | 작업 | 예상 |
|-------|------|------|
| 1 | System Core 마이그 + EF Stage 1 구현 + 단일 유형 검증 | 2일 |
| 2 | Grade Layer 마이그 + description 1 row + 검증 | 1일 |
| 3 | Type Overlay description_random + 28 토픽 검증 | 2일 |
| 4 | 나머지 9 유형 시드 + 각 검증 | 1주 |
| 5 | Session Context 작동 + recurring 감지 | 2일 |
| 6 | UI 갱신 | 2일 |

**총 ~2~3주** (집중 개발 시). 단계별 끊어 갈 수 있음.

---

## 7. 의사결정 기록

| 일자 | 결정 | 근거 |
|------|------|------|
| 2026-05-17 | 6-Layer 분리 + 2-Pass | 평가가 생성을 오염시키는 단일 호출 문제. 평가는 엄격(temp 0.5), 생성은 약간 변동성(temp 0.65). |
| 2026-05-17 | 표현 → optional_examples만 | 표면 언어 X, 판단 알고리즘 O. 강사 자료의 본질은 *언제 개입하는가*. |
| 2026-05-17 | issue_count level limit 강제 | GPT가 일률 3개 짚는 패턴 차단. 등급별 0~3 변동. |
| 2026-05-17 | 모범답안 학생 골격 유지 강제 | preservation_anchors 명시 + LEVEL FIDELITY GATE 통과 의무. |

---

## 8. 인덱스로

- 핵심 철학 → [00-philosophy.md](./00-philosophy.md)
- 각 Layer 본문 → [01-system-core.md](./01-system-core.md) ~ [07-output-schema.md](./07-output-schema.md)
- 강사 자료 변환 framework → [09-curriculum-conversion.md](./09-curriculum-conversion.md)
