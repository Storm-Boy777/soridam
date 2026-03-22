# WP 유형별 우선순위 체계 (wp_type_priority)

> **상태**: 확정 (OPIc 전문가 자문 기반)
> **최종 업데이트**: 2026-03-21
> **용도**: consult-v2 프롬프트에 유형별 WP 체크 목록 동적 주입
> **참조**: `docs/설계/weak-point-tagging-prompt.md` (WP 코드 사전 v2, 36개)

---

## 1. 운영 원칙

### 1.1 역할 분리

```
WP 코드 목록 (뭘 체크할지)      →  유형이 결정  →  wp_type_priority (10행)
severity (얼마나 심각한지)       →  등급이 결정  →  evaluation_criteria_v2 (60행)
체크리스트 항목 (과제 충족 기준)  →  등급이 결정  →  evaluation_criteria_v2 (60행)
소견 톤                          →  등급이 결정  →  evaluation_criteria_v2 (60행)
```

### 1.2 3-Tier 체크 체계

| Tier | 의미 | 프롬프트 지시 |
|------|------|--------------|
| **1차 (primary)** | 이 유형의 핵심 과업에서 반드시 확인 | "반드시 확인하세요" |
| **2차 (secondary)** | 1차에서 문제없을 때 추가 확인 | "1차 확인 후 추가로 검토하세요" |
| **낮은 우선순위 (low)** | 이 유형에서는 거의 해당 안 됨. 명백한 경우만 | "명백한 경우에만 태깅하세요. 과잉 체크 금지" |

### 1.3 전 유형 공통 안전장치 (5개)

모든 유형에서 항상 체크하는 코드:

| 코드 | 설명 |
|------|------|
| WP_T01 | task_unfulfilled — 질문 핵심 요구 미수행 |
| WP_D01 | speech_too_short — 발화량 현저히 부족 |
| WP_A07 | fluency_low — 문장 생성이 매끄럽지 못함 |
| WP_A06 | intelligibility_low — 발음/억양/분절 문제 |
| WP_S07 | topic_drift — 질문 초점에서 이탈 |

---

## 2. 유형별 WP 체크 목록

### 2.1 Description (묘사)

> 핵심 과업: "story"가 아니라 "clear picture" — 대상 설명 + 구체화

**1차 체크:**

| 코드 | 설명 |
|------|------|
| WP_T01 | task_unfulfilled |
| WP_T02 | subtask_omission |
| WP_C01 | detail_shallow — 설명/묘사가 표면적이고 구체성 부족 |
| WP_C03 | lexical_range_weak — precise vocabulary 부족 |
| WP_S02 | frame_absent — 답변 틀 자체가 없음 |
| WP_S03 | connector_poverty — 연결 장치가 매우 빈약함 |
| WP_S04 | paragraph_absent — 문단형 connected discourse 미형성 |
| WP_S07 | topic_drift |

**2차 체크:**

| 코드 | 설명 |
|------|------|
| WP_C02 | repetitive_wording |
| WP_C04 | viewpoint_support_weak |
| WP_C06 | example_absent |
| WP_S06 | closure_missing |
| WP_S09 | coherence_weak |
| WP_A07 | fluency_low |
| WP_D01 | speech_too_short |

**낮은 우선순위:**

| 코드 | 설명 |
|------|------|
| WP_A01 | tense_mixing |
| WP_A08 | timeframe_control_failed |
| WP_T03 | comparison_absent |
| WP_T04 | complication_failed |
| WP_T08 | solution_absent |

**게이트키퍼:** C01, S02
**과잉 체크 금지:** comparison_absent, solution_absent

**해석 포인트:**
- 묘사에서 제일 많이 깨지는 건 디테일 부족(C01)과 틀 부재(S02)
- "It is nice / good / big / convenient" 반복이면 C02, C03 동시 체크 가능
- why가 포함된 묘사면 C04도 같이 본다

---

### 2.2 Routine (루틴 / 절차)

> 핵심 과업: habitual process + sequence control — "보통 어떻게 하냐"

**1차 체크:**

| 코드 | 설명 |
|------|------|
| WP_T01 | task_unfulfilled |
| WP_T02 | subtask_omission |
| WP_S02 | frame_absent |
| WP_S03 | connector_poverty |
| WP_S09 | coherence_weak — 문장 간 논리 흐름이 약함 |
| WP_C01 | detail_shallow |
| WP_C06 | example_absent |

**2차 체크:**

| 코드 | 설명 |
|------|------|
| WP_S04 | paragraph_absent |
| WP_S06 | closure_missing |
| WP_C03 | lexical_range_weak |
| WP_A07 | fluency_low |
| WP_D01 | speech_too_short |
| WP_D02 | hesitation_excessive |

**낮은 우선순위:**

| 코드 | 설명 |
|------|------|
| WP_A01 | tense_mixing |
| WP_A08 | timeframe_control_failed |
| WP_T03 | comparison_absent |
| WP_T04 | complication_failed |
| WP_T08 | solution_absent |

**게이트키퍼:** S09, S02
**과잉 체크 금지:** comparison_absent, solution_absent

**해석 포인트:**
- 루틴은 시제보다 순서가 더 중요
- 문장이 맞아도 "그다음 뭐 하는지"가 안 이어지면 S09
- 단계만 툭툭 던지고 why/세부행동이 없으면 C01

---

### 2.3 Past Experience — Childhood (어릴 적 경험)

> 핵심 과업: 과거 회상 + 장면 묘사 + 느낌

**1차 체크:**

| 코드 | 설명 |
|------|------|
| WP_T01 | task_unfulfilled |
| WP_T02 | subtask_omission |
| WP_S08 | narrative_structure_weak — 서사 흐름(배경→사건→결과→소감) 약함 |
| WP_A01 | tense_mixing — 시제 무질서하게 섞임 |
| WP_A08 | timeframe_control_failed — major time frame 유지 실패 |
| WP_C01 | detail_shallow |
| WP_C05 | emotional_expression_flat — 감정/반응/태도 미표출 |
| WP_C06 | example_absent |

**2차 체크:**

| 코드 | 설명 |
|------|------|
| WP_S04 | paragraph_absent |
| WP_S05 | paragraph_unstable |
| WP_S06 | closure_missing |
| WP_S09 | coherence_weak |
| WP_C03 | lexical_range_weak |
| WP_A07 | fluency_low |
| WP_D01 | speech_too_short |

**낮은 우선순위:**

| 코드 | 설명 |
|------|------|
| WP_T03 | comparison_absent |
| WP_T04 | complication_failed |
| WP_T08 | solution_absent |
| WP_T06 | question_quality_low |

**게이트키퍼:** S08, A08
**과잉 체크 금지:** comparison_absent, question_quality_low

**해석 포인트:**
- childhood는 단순 과거 사실 나열이 아니라 memory scene이 살아야 함
- 감정/인상 질문이 많아서 C05를 일반 past보다 더 중요하게 봄
- past major timeframe 무너지면 A08은 강하게 체크

---

### 2.4 Past Experience — Memorable (기억에 남는 경험)

> 핵심 과업: 전형적 story telling — 배경→사건→문제/전환→결말→소감

**1차 체크:**

| 코드 | 설명 |
|------|------|
| WP_T01 | task_unfulfilled |
| WP_T02 | subtask_omission |
| WP_S08 | narrative_structure_weak |
| WP_A01 | tense_mixing |
| WP_A08 | timeframe_control_failed |
| WP_C01 | detail_shallow |
| WP_C05 | emotional_expression_flat |
| WP_C06 | example_absent |

**2차 체크:**

| 코드 | 설명 |
|------|------|
| WP_C07 | reason_support_weak |
| WP_S04 | paragraph_absent |
| WP_S05 | paragraph_unstable |
| WP_S09 | coherence_weak |
| WP_T04 | complication_failed |
| WP_T08 | solution_absent |
| WP_A07 | fluency_low |
| WP_D02 | hesitation_excessive |

**낮은 우선순위:**

| 코드 | 설명 |
|------|------|
| WP_T03 | comparison_absent |
| WP_T06 | question_quality_low |

**게이트키퍼:** S08, C06
**치명적 조합:** S08 + C01 + C05 동시 발생 시 severe

**해석 포인트:**
- memorable인데 "I went there. It was fun. I came back." 수준이면 S08+C01+C05 동시 가능
- 문제 해결형 story면 T04, T08을 반드시 봄
- 배경→사건→문제/전환→결말→소감 골격이 핵심

---

### 2.5 Past Experience — Recent (최근 경험)

> 핵심 과업: 구체적 사건화 + 시간 흐름 — 특정 1회 사건

**1차 체크:**

| 코드 | 설명 |
|------|------|
| WP_T01 | task_unfulfilled |
| WP_T02 | subtask_omission |
| WP_S08 | narrative_structure_weak |
| WP_A01 | tense_mixing |
| WP_A08 | timeframe_control_failed |
| WP_C01 | detail_shallow |
| WP_C06 | example_absent |

**2차 체크:**

| 코드 | 설명 |
|------|------|
| WP_C05 | emotional_expression_flat |
| WP_S04 | paragraph_absent |
| WP_S05 | paragraph_unstable |
| WP_S09 | coherence_weak |
| WP_T04 | complication_failed |
| WP_T08 | solution_absent |
| WP_D01 | speech_too_short |

**낮은 우선순위:**

| 코드 | 설명 |
|------|------|
| WP_T03 | comparison_absent |
| WP_T06 | question_quality_low |

**게이트키퍼:** S08, A08

**해석 포인트:**
- "last time"인데 habitual answer로 가면 T01 또는 S07
- 최근 경험은 누구와/언제/왜/무엇이 있었는지 빠지면 T02
- chronological markers 약하면 S09

---

### 2.6 Comparison (비교)

> 핵심 과업: past vs present, A vs B, change over time — 비교 구도가 생명

**1차 체크:**

| 코드 | 설명 |
|------|------|
| WP_T03 | comparison_absent — 비교/대조 구도가 없음 |
| WP_T02 | subtask_omission |
| WP_A08 | timeframe_control_failed |
| WP_A01 | tense_mixing |
| WP_S09 | coherence_weak |
| WP_S03 | connector_poverty |
| WP_S04 | paragraph_absent |
| WP_C01 | detail_shallow |
| WP_C07 | reason_support_weak — 변화 이유/원인/근거가 약함 |

**2차 체크:**

| 코드 | 설명 |
|------|------|
| WP_C04 | viewpoint_support_weak |
| WP_C06 | example_absent |
| WP_S05 | paragraph_unstable |
| WP_S06 | closure_missing |
| WP_A07 | fluency_low |
| WP_D01 | speech_too_short |

**낮은 우선순위:**

| 코드 | 설명 |
|------|------|
| WP_T04 | complication_failed |
| WP_T08 | solution_absent |
| WP_C05 | emotional_expression_flat |

**게이트키퍼:** T03, A08
**치명적 약점:** T03 하나만으로도 중대 약점 처리 가능

**해석 포인트:**
- 과거/현재 한쪽만 길게 말하면 comparison fail
- "changed because…"가 약하면 C07
- past/present를 섞어버리면 A08

---

### 2.7 Roleplay 11 (Q11: 정보 요청 / 질문하기)

> 핵심 과업: 영어를 많이 말하는 게 아니라 질문을 제대로 설계하느냐

**1차 체크:**

| 코드 | 설명 |
|------|------|
| WP_T06 | question_quality_low — 질문 품질이 낮음 |
| WP_T01 | task_unfulfilled |
| WP_T02 | subtask_omission |
| WP_S02 | frame_absent |
| WP_S07 | topic_drift |
| WP_S06 | closure_missing |

**2차 체크:**

| 코드 | 설명 |
|------|------|
| WP_T05 | negotiation_absent |
| WP_C03 | lexical_range_weak |
| WP_A05 | syntax_error — 질문문 구문 오류 |
| WP_A07 | fluency_low |
| WP_D02 | hesitation_excessive |

**낮은 우선순위:**

| 코드 | 설명 |
|------|------|
| WP_C01 | detail_shallow |
| WP_C05 | emotional_expression_flat |
| WP_A08 | timeframe_control_failed |
| WP_T03 | comparison_absent |

**게이트키퍼:** T06
**치명적 약점:** T06 단독으로 severe 가능
**과잉 체크 금지:** detail_shallow 과잉 체크 금지

**해석 포인트:**
- RP11은 질문 수보다 질문 가치가 중요
- "Where is it? How much? What time?"만 반복이면 T06
- arrangement형 RP11은 T05도 같이 볼 수 있음
- 문법적으로 질문문을 만들 수 있는지(A05)도 중요

---

### 2.8 Roleplay 12 (Q12: 문제 해결 / 대안 제시)

> 핵심 과업: complication handling — 문제 설명, 상황 전달, 대안 제시, 조율

**1차 체크:**

| 코드 | 설명 |
|------|------|
| WP_T04 | complication_failed — 문제 상황 처리 실패 |
| WP_T08 | solution_absent — 해결책/대안 없음 |
| WP_T05 | negotiation_absent — 조율/설득/요청 부족 |
| WP_T01 | task_unfulfilled |
| WP_T02 | subtask_omission |
| WP_S02 | frame_absent |
| WP_S09 | coherence_weak |

**2차 체크:**

| 코드 | 설명 |
|------|------|
| WP_T07 | empathy_absent — 사과/이해/배려 표현 없음 |
| WP_C01 | detail_shallow |
| WP_C07 | reason_support_weak |
| WP_S06 | closure_missing |
| WP_A07 | fluency_low |
| WP_D02 | hesitation_excessive |

**낮은 우선순위:**

| 코드 | 설명 |
|------|------|
| WP_T03 | comparison_absent |
| WP_C05 | emotional_expression_flat |
| WP_A08 | timeframe_control_failed |

**게이트키퍼:** T04, T08
**치명적 약점:** T04 또는 T08 단독으로 severe 가능
**과잉 체크 금지:** fancy vocabulary 부족만으로 큰 감점 금지

**해석 포인트:**
- "문제만 설명하고 끝"이면 T08
- "대안은 있는데 상대와 조율이 없음"이면 T05
- friend/boss/store/staff와의 상호작용에서는 T07도 생각보다 중요

---

### 2.9 Advanced 14

> 핵심 과업: 상위 버전 comparison — 변화, 세대 차이, 과거-현재 비교, trend 분석

**1차 체크:**

| 코드 | 설명 |
|------|------|
| WP_T03 | comparison_absent |
| WP_T02 | subtask_omission |
| WP_A08 | timeframe_control_failed |
| WP_A01 | tense_mixing |
| WP_S04 | paragraph_absent |
| WP_S05 | paragraph_unstable |
| WP_S09 | coherence_weak |
| WP_C07 | reason_support_weak |
| WP_C01 | detail_shallow |

**2차 체크:**

| 코드 | 설명 |
|------|------|
| WP_C04 | viewpoint_support_weak |
| WP_C06 | example_absent |
| WP_C03 | lexical_range_weak |
| WP_S03 | connector_poverty |
| WP_A07 | fluency_low |
| WP_D01 | speech_too_short |

**낮은 우선순위:**

| 코드 | 설명 |
|------|------|
| WP_T04 | complication_failed |
| WP_T08 | solution_absent |
| WP_C05 | emotional_expression_flat |

**게이트키퍼:** T03, C07
**치명적 약점:** T03 단독으로 severe 가능

**해석 포인트:**
- comparison보다 reason chain 비중이 더 높음
- "무엇이 달라졌는지"만 말하고 "왜 달라졌는지"가 약하면 C07
- 문단 수준 유지 실패는 S05로 강하게 봄

---

### 2.10 Advanced 15

> 핵심 과업: 이슈/뉴스/사회적 담론 — issue explanation + significance + reaction/support

**1차 체크:**

| 코드 | 설명 |
|------|------|
| WP_C07 | reason_support_weak |
| WP_C04 | viewpoint_support_weak |
| WP_C01 | detail_shallow |
| WP_T01 | task_unfulfilled |
| WP_T02 | subtask_omission |
| WP_S04 | paragraph_absent |
| WP_S05 | paragraph_unstable |
| WP_S09 | coherence_weak |
| WP_C03 | lexical_range_weak |

**2차 체크:**

| 코드 | 설명 |
|------|------|
| WP_C06 | example_absent |
| WP_A08 | timeframe_control_failed |
| WP_A01 | tense_mixing |
| WP_T04 | complication_failed |
| WP_T08 | solution_absent |
| WP_A07 | fluency_low |
| WP_D01 | speech_too_short |

**낮은 우선순위:**

| 코드 | 설명 |
|------|------|
| WP_T03 | comparison_absent |
| WP_C05 | emotional_expression_flat |
| WP_T06 | question_quality_low |

**게이트키퍼:** C07, C04
**과잉 체크 금지:** 감정 표현 부족만으로 큰 약점 판정 금지

**해석 포인트:**
- Advanced 15의 핵심 약점은 대개 내용 논리(C07, C04)
- 뉴스/이슈를 말하면서 배경-사건-반응-의미가 안 서면 S09
- 최근 사건을 설명하는 문항에서는 A08도 같이 강하게 봄

---

## 3. 실전 운영 요약

### 3.1 유형별 게이트키퍼 코드

| 유형 | 게이트키퍼 | 의미 |
|------|-----------|------|
| Description | C01, S02 | 디테일 부족 + 틀 부재 |
| Routine | S09, S02 | 논리 흐름 약함 + 틀 부재 |
| Past Childhood | S08, A08 | 서사 구조 약함 + 시간 프레임 실패 |
| Past Memorable | S08, C06 | 서사 구조 약함 + 구체 사례 없음 |
| Past Recent | S08, A08 | 서사 구조 약함 + 시간 프레임 실패 |
| Comparison | T03, A08 | 비교 구도 없음 + 시간 프레임 실패 |
| RP11 | T06 | 질문 품질 낮음 |
| RP12 | T04, T08 | 문제 처리 실패 + 대안 없음 |
| Advanced 14 | T03, C07 | 비교 없음 + 이유/근거 약함 |
| Advanced 15 | C07, C04 | 이유/근거 약함 + 관점 뒷받침 약함 |

### 3.2 치명적 약점 (즉시 severe 가능)

- Comparison / Advanced 14: WP_T03
- RP11: WP_T06
- RP12: WP_T04 또는 WP_T08
- Past 계열: WP_A08 + WP_S08 동시 발생

### 3.3 유형별 과잉 체크 금지

- Description / Routine: comparison_absent, solution_absent 과잉 금지
- RP11: detail_shallow 과잉 금지
- RP12: fancy vocabulary 부족만으로 큰 감점 금지
- Advanced 15: 감정 표현 부족만으로 큰 약점 판정 금지

---

## 4. DB 테이블 설계

### `wp_type_priority` (10행)

```sql
CREATE TABLE wp_type_priority (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_type TEXT NOT NULL UNIQUE,
  wp_primary TEXT[] NOT NULL,     -- 1차 체크 코드 배열
  wp_secondary TEXT[] NOT NULL,   -- 2차 체크 코드 배열
  wp_low TEXT[] NOT NULL,         -- 낮은 우선순위 코드 배열
  gatekeeper TEXT[] NOT NULL,     -- 게이트키퍼 코드 배열
  critical_combo TEXT,            -- 치명적 조합 설명 (nullable)
  anti_overtagging TEXT,          -- 과잉 체크 금지 규칙 (nullable)
  interpretation_notes TEXT,      -- 해석 포인트 (nullable)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 프롬프트 주입 흐름

```
1. question_type 확인 (예: description)
2. wp_type_priority에서 해당 행 로드
3. consult_v2 프롬프트의 {wp_check_guide} 변수에 주입:
   - 공통 안전장치 5개 (고정)
   - 1차 체크 코드 + 설명
   - 2차 체크 코드 + 설명
   - 게이트키퍼 규칙
   - 과잉 체크 금지 규칙
4. JSON Schema의 enum은 1차 + 2차 + 낮은 우선순위 전체 포함
   (GPT가 선택할 수 있되, 프롬프트에서 우선순위를 지시)
5. severity는 evaluation_criteria_v2의 등급별 기준에 따라 판정
```

---

## 5. 등급별 severity 적용 예시 (description + WP_S03)

같은 약점이 발견되었을 때, 목표 등급에 따라 severity가 달라짐:

| 목표 등급 | WP_S03 severity | 판정 근거 |
|-----------|-----------------|-----------|
| IL | — (태깅 안 함) | 단어/구 수준이면 충분. 연결어 3종도 과분 |
| IM1 | mild | 문장 연결 시도가 있으면 충분 |
| IM2 | mild | and/but/because로 문장 연결되면 수용 가능 |
| IM3 | moderate | 문장 간 연결이 자연스러워야 하는 단계 |
| IH | moderate | 단락 구성에 구조적 전환어 필수 |
| AL | severe | connected discourse 유지에 다양한 연결 장치 필수 |

→ 이 severity 판정 기준은 `evaluation_criteria_v2` 60행에 포함됨

---

*최종 업데이트: 2026-03-21*
*확정: OPIc 전문가 자문 기반 10유형 3-Tier WP 체크 체계*
