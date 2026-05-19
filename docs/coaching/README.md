# 소리담 스피킹 코치 — 프롬프트 아키텍처

> **목적**: 표현이 아니라 **판단 기준 엔진**. 강사의 *표면 언어*가 아니라 *개입 알고리즘*을 시스템화.
> **결정 (2026-05-17)**: 6-Layer 분리 + 2-Pass 호출 구조.

---

## TL;DR — 한 문장

> 표현을 저장하지 않는다. **표현이 등장하는 조건**을 저장한다.

---

## 6-Layer 아키텍처

```
┌────────────────────────────────────────────────────────────────┐
│ Layer 1 — System Core (강사 세계관)                            │
│   고정. 절대 원칙만. 표현 X.                                    │
│   "Never generate beyond level"                                │
│   "Preserve student story"                                     │
│   "Skeleton paragraph = IM3→IH discriminator"                  │
│   "Avoid template-like AL"                                     │
└────────────────────────────────────────────────────────────────┘
                              +
┌────────────────────────────────────────────────────────────────┐
│ Layer 2 — Grade Layer (등급 = 텍스트 타입)                     │
│   IL: sentence fragments                                        │
│   IM2: simple sentences                                         │
│   IM3: connected sentences                                      │
│   IH: skeletal paragraph                                        │
│   AL: sustained cohesive discourse                              │
│   { vocab_ceiling, syntax_complexity, cohesive_density }       │
└────────────────────────────────────────────────────────────────┘
                              +
┌────────────────────────────────────────────────────────────────┐
│ Layer 3 — Type Overlay (유형 사고 흐름)                        │
│   reasoning_flow + intervention_triggers                       │
│   ex) description_environment:                                  │
│       physical features → human engagement → optional reflection│
└────────────────────────────────────────────────────────────────┘
                              +
┌────────────────────────────────────────────────────────────────┐
│ Layer 4 — Session Context (학생 상태, 동적)                    │
│   previous_issues / current_focus / filler_patterns            │
└────────────────────────────────────────────────────────────────┘
                              +
┌────────────────────────────────────────────────────────────────┐
│ Layer 5 — Evaluation Contract (Pass1 평가)                     │
│   우선순위: discourse > sustain > sequencing > cohesive > vocab │
│   score_impact 큰 흠 식별 — 개수 X                              │
└────────────────────────────────────────────────────────────────┘
                              +
┌────────────────────────────────────────────────────────────────┐
│ Layer 6 — Generation Contract (Pass2 생성)                     │
│   "Preserve student original story"                            │
│   "Discourse first, vocab last"                                │
│   "Naturally speakable, no memorized tone"                     │
└────────────────────────────────────────────────────────────────┘
                              ↓
                  Output Schema (strict JSON)
            issues[]: { issue_type, severity, score_impact,
                        learnability, quote, fix_strategy, micro_drill }
            model_answer: { text, changes[] }
```

---

## 2-Pass 호출 분리

```
                  ┌──────────────┐
   학생 답변  →   │   Pass 1     │   ← Layers 1+2+3+4+5
                  │  Evaluation  │   "흠 식별 + 회차 진단"
                  └──────┬───────┘
                         │  issues + repair_plan
                         ↓
                  ┌──────────────┐
                  │   Pass 2     │   ← Layers 1+2+3+6
                  │  Generation  │   "학생 골격 유지 + 최소 격상"
                  └──────┬───────┘
                         │  model_answer + changes[]
                         ↓
                  coaching_json 출력
```

**두 호출 분리**. 평가가 끝난 뒤 그 결과를 input으로 받아 생성. 평가 로직과 생성 로직이 서로 오염되지 않음.

---

## 파일 인덱스

| # | 파일 | 역할 |
|---|------|------|
| 00 | [philosophy.md](./00-philosophy.md) | ★ 핵심 철학 — 표현 누적 ↔ 판단 추상화. 모든 다른 파일이 여기서 derive |
| 01 | [system-core.md](./01-system-core.md) | Layer 1 — 강사 세계관 (절대 원칙) |
| 02 | [grade-layer.md](./02-grade-layer.md) | Layer 2 — 등급 = 텍스트 타입 차이 |
| 03 | [type-overlay.md](./03-type-overlay.md) | Layer 3 — 유형별 reasoning_flow + intervention_triggers |
| 04 | [session-context.md](./04-session-context.md) | Layer 4 — 회차 기반 학생 상태 |
| 05 | [evaluation-contract.md](./05-evaluation-contract.md) | Layer 5 — Pass1 우선순위 평가 |
| 06 | [generation-contract.md](./06-generation-contract.md) | Layer 6 — Pass2 학생 골격 유지 생성 |
| 07 | [output-schema.md](./07-output-schema.md) | strict JSON 스키마 |
| 08 | [prompt-assembly.md](./08-prompt-assembly.md) | Pass1/Pass2 실제 조립 + EF 코드 위치 |
| 09 | [curriculum-conversion.md](./09-curriculum-conversion.md) | 강사 자료 #1~#21 → 판단 로직 변환 framework |
| 10 | [migration-plan.md](./10-migration-plan.md) | 적재 마이그 시퀀스 + Phase 1~6 검증 흐름 |

---

## 핵심 철학 한 줄

> **"강사의 언어를 학습하지 말고, 강사의 개입 기준을 학습해라."**

표현 X. 표현이 등장하는 조건 O.

추가 X. 제거 O.

자세한 내용은 [00-philosophy.md](./00-philosophy.md).

---

## 다음 단계

[10-migration-plan.md](./10-migration-plan.md) — Stage 1 (System Core 적재) 부터 순차 진행.
