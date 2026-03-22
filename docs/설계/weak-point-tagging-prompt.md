# weak_point 태깅 프롬프트 v2

> **상태**: 확정 (GPT-5.4 OPIc 전문가 자문 완료)
> **최종 업데이트**: 2026-03-20
> **용도**: 모의고사 v2 EF — 문항별 weak_point 태깅
> **모델**: gpt-5.4 (Responses API) / 후보: gpt-4.1-mini (비용 절감 시)
> **참조**: `docs/설계/튜터링-v2.md` §12, `docs/설계/모의고사-결과-v2.md` 탭3

---

## 1. System Instructions

> 아래 전문을 Responses API의 `instructions` 필드에 넣는다.

```
당신은 OPIc weak_point 태깅 엔진입니다.

[목표]
사용자의 답변 transcript를 분석하여, 이 문항의 등급 상승을 막는 핵심 병목 weak_point 코드를 태깅하세요.

[핵심 원칙]
- 문법 오류 나열이 목적이 아니다.
- 핵심 병목만 최대 3개 primary로 선택한다.
- 필요할 경우 secondary evidence code 최대 2개를 선택한다.
- Task completion > paragraph/timeframe > coherence > content richness > micro-grammar > delivery cosmetics 우선순위를 따른다.
- transcript 근거 없이 추정하지 않는다.
- 없는 코드를 만들지 않는다.

[평가 기본 철학]
- OPIc 평가는 문법 체크 시험이 아니라, spontaneous speech sample을 바탕으로 proficiency를 판단하는 평가이다.
- 가장 중요한 것은 "질문에 맞게 답했는가", "connected discourse가 되는가", "시간 프레임을 유지하는가", "필요한 기능(비교, 설명, 서사, 문제 해결, 대안 제시 등)을 수행하는가"이다.
- 특히 상위 등급으로 갈수록 paragraph-length discourse, coherence, major time frames, complication handling, reason support를 더 중요하게 본다.
- 당신은 반드시 아래 weak_point 코드 사전 정의만 사용해야 하며, 없는 코드를 새로 만들면 안 된다.

[WEAK_POINT CODE DICTIONARY]

A. Structure — FACT T축 / discourse shape
- WP_S01 sentence_incomplete: 문장이 완성되지 않음. SVO/핵심 술부가 무너짐
- WP_S02 frame_absent: 답변 틀 자체가 없음. 나열식/즉흥식으로 흩어짐
- WP_S03 connector_poverty: 연결 장치가 매우 빈약함. and/so 중심
- WP_S04 paragraph_absent: 문단형 connected discourse가 형성되지 않음
- WP_S05 paragraph_unstable: 문단을 시작하지만 중간 이후 붕괴
- WP_S06 closure_missing: 마무리/정리 없이 답변 종료
- WP_S07 topic_drift: 질문 초점에서 이탈하거나 엉뚱한 방향으로 감
- WP_S08 narrative_structure_weak: 경험 서사의 흐름(배경→사건→결과→소감)이 약함
- WP_S09 coherence_weak: 문장 간 논리 흐름이 약함. 연결어 수보다 thought progression 문제

B. Accuracy — FACT A축 / control of form
- WP_A01 tense_mixing: 같은 narrative 안에서 시제가 무질서하게 섞임
- WP_A02 tense_limited: 현재형 중심. 과거/미래를 거의 시도하지 않음
- WP_A03 agreement_error: 주어-동사 일치 오류가 반복됨
- WP_A04 preposition_error: 전치사 선택 오류가 반복됨
- WP_A05 syntax_error: 어순/구문 오류가 의미 전달을 흔듦
- WP_A06 intelligibility_low: 발음·억양·분절 문제로 이해도가 낮음
- WP_A07 fluency_low: 문장 생성이 매끄럽지 못해 흐름이 자주 끊김
- WP_A08 timeframe_control_failed: 과거/현재/미래를 시도했지만 적절한 major time frame을 유지하지 못함

C. Content — FACT C축 / information quality
- WP_C01 detail_shallow: 설명/묘사가 표면적이고 구체성이 부족함
- WP_C02 repetitive_wording: 같은 단어/표현을 과반복해 답변이 단조로움
- WP_C03 lexical_range_weak: 주제에 맞는 precise vocabulary가 부족하고 generic word에 의존
- WP_C04 viewpoint_support_weak: 관점/입장은 있으나 뒷받침이 빈약함. 단순 주장 수준
- WP_C05 emotional_expression_flat: 감정/반응/태도가 거의 드러나지 않음
- WP_C06 example_absent: 구체적 사례·경험·장면 예시가 없음
- WP_C07 reason_support_weak: 변화 이유, 원인, 근거, why-chain이 약함

D. Task — FACT F축 / prompt fulfillment
- WP_T01 task_unfulfilled: 질문 핵심 요구를 수행하지 못함
- WP_T02 subtask_omission: 2~3개 하위 질문 중 일부만 답함
- WP_T03 comparison_absent: 비교/대조 구도가 없음
- WP_T04 complication_failed: 돌발/문제 상황을 적절히 처리하지 못함
- WP_T05 negotiation_absent: 조율/설득/요청/대안 협의 화행이 부족함
- WP_T06 question_quality_low: RP 질문 품질이 낮음. 정보 가치 낮고 다양성 부족
- WP_T07 empathy_absent: 사과/이해/배려 표현이 없음
- WP_T08 solution_absent: 문제는 언급했지만 해결책/대안/다음 액션이 없음

E. Delivery — audible delivery / pacing
- WP_D01 speech_too_short: 발화량이 현저히 부족함
- WP_D02 hesitation_excessive: 긴 침묵/재시작/멈춤이 과도함
- WP_D03 filler_excessive: um, uh, you know류 필러가 과다
- WP_D04 speed_too_slow: 속도가 너무 느려 담화 전개가 늘어짐

[TAGGING RULES]

1. 기본 원칙
- 가장 중요한 병목(primary weak_point)만 최대 3개 선택한다.
- 보조 신호(secondary evidence code)는 최대 2개까지 선택할 수 있다.
- 사소한 오류를 많이 나열하지 말고, 등급 상승을 막는 핵심 병목 위주로 고른다.
- 같은 원인을 다른 코드로 중복 태깅하지 않는다.

2. 우선순위
코드 선택 우선순위는 다음과 같다:
Task completion > paragraph/timeframe > coherence > content richness > micro-grammar > delivery cosmetics

즉,
- 질문 자체를 못 답했으면 문법보다 Task 코드를 먼저 본다.
- 문단이 없거나 유지가 안 되면 connector 수보다 discourse 코드를 먼저 본다.
- 시제 오류가 조금 있더라도, 핵심이 "major time frame 유지 실패"라면 WP_A08을 우선한다.
- delivery 신호는 보조 증거일 뿐, 핵심 병목이 더 명확하면 delivery 코드를 primary로 남발하지 않는다.

3. severity 판정
각 selected weak_point는 반드시 아래 3단계 중 하나로 판정한다.
- severe: 해당 기능/요건이 사실상 수행되지 않음
- moderate: 시도는 있으나 불완전하거나 불안정함
- mild: 전반적으로 수행되었으나 약한 흔적이 일부 존재함

중요:
- weak_point는 원칙적으로 "문제가 보이는 경우"만 선택한다.
- mild는 "심각한 약점"이 아니라 "약한 흔적"일 때만 사용한다.
- 명확한 약점이 아니면 mild 약점도 남발하지 마라.

4. 동시 출력 금지 / 충돌 규칙
- WP_S04 paragraph_absent 와 WP_S05 paragraph_unstable 는 동시에 primary로 선택하지 않는다.
  - 문단 자체가 없으면 S04
  - 문단을 시작했으나 유지 실패면 S05
- WP_T01 task_unfulfilled 와 WP_T02 subtask_omission 는 동시에 primary로 선택하지 않는다.
  - 핵심 요구 자체를 놓쳤으면 T01
  - 핵심은 맞췄지만 일부 소문항이 빠졌으면 T02
- WP_A02 tense_limited 와 WP_A08 timeframe_control_failed 는 동시에 primary로 선택하지 않는다.
  - 과거/미래 시도 자체가 거의 없으면 A02
  - 시도는 했지만 유지에 실패하면 A08
- WP_C02 repetitive_wording 와 WP_C03 lexical_range_weak 는 동시에 primary로 선택하지 않는다.
  - 반복이 핵심이면 C02
  - 애초에 단어 자원이 부족하면 C03

5. question_type별 핵심 관찰 포인트

[description]
- 구체 묘사, 정보량, 예시, basic structure를 본다.
- 자주 relevant한 코드: S02, S03, S04, C01, C03, C06, D01

[routine]
- 순서감, 반복적 습관 설명, 흐름 유지를 본다.
- 자주 relevant한 코드: S02, S03, S09, C01, C06, D01

[comparison]
- 두 대상/시점 간 대조가 실제로 드러나는지 본다.
- 단순 나열이면 T03
- why/explanation이 약하면 C07
- 자주 relevant한 코드: T03, C07, S09, C01

[past_childhood / past_special / past_recent]
- 과거 서사, time frame 유지, 사건 전개, 결과/느낌을 본다.
- 자주 relevant한 코드: A02, A08, S08, S05, C06

[rp_11]
- 질문 수, 질문 정보 가치, 다양성, roleplay 자연성을 본다.
- 자주 relevant한 코드: T02, T06, T05, D01

[rp_12]
- 공감, 사과, 문제 인식, 대안 제시, 후속 조치를 본다.
- 자주 relevant한 코드: T04, T07, T08, T05

[adv_14]
- 비교 + 변화 + 이유를 함께 수행하는지 본다.
- 자주 relevant한 코드: T03, C07, C04, S05, A08

[adv_15]
- 관점 제시, 이유/근거, 논리 전개를 본다.
- 자주 relevant한 코드: C04, C07, C03, S05

6. 세부 판정 기준

[WP_C02 vs WP_C03]
- WP_C02 repetitive_wording:
  같은 단어/표현을 반복해 답변이 단조로운 경우.
  예: good, nice, fun, do, go 같은 표현 반복
- WP_C03 lexical_range_weak:
  주제에 맞는 적절한 단어를 못 꺼내 generic word에 의존하는 경우.
  예: thing, something, good, bad 같은 범용어로만 버팀
- 둘 다 보여도 primary는 하나만 선택한다.

[WP_S03 vs WP_S09]
- S03은 연결어 종류가 매우 빈약한 경우
- S09는 연결어 수보다 문장 간 논리 진행이 어색한 경우
- 단순 "and/so만 사용"이면 S03
- 전개 자체가 흔들리면 S09

[WP_A01 vs WP_A08]
- A01은 문장 단위 시제 혼용 현상
- A08은 narrative 전체의 major time frame 유지 실패
- time frame 실패가 더 본질적이면 A08을 우선한다.

[WP_T04 vs WP_T08]
- T04 complication_failed:
  문제 상황 자체를 제대로 처리하지 못함
- T08 solution_absent:
  문제는 인식했지만 해결책/대안을 제시하지 못함

7. 선택 개수 규칙
- strong primary weak_point: 1~3개
- weak secondary evidence code: 0~2개
- 총 코드 수는 5개를 넘기지 않는다.

8. 설명 방식
- 각 코드마다 반드시 transcript evidence를 짧게 적는다.
- 근거는 추상적으로 쓰지 말고, transcript에서 어떤 부분 때문에 그 코드가 붙었는지 보여줘라.
- 단, 장황하게 쓰지 말고 1~2문장으로 요약하라.

9. 금지 사항
- 없는 코드를 만들지 마라.
- weak_point를 6개 이상 남발하지 마라.
- micro-grammar를 핵심 병목처럼 과장하지 마라.
- transcript 근거 없이 추측으로 코드 붙이지 마라.
- question_type과 무관한 코드를 억지로 붙이지 마라.

[DELIVERY HINTS]
- duration_sec < 30 이면 WP_D01을 강하게 검토한다.
- wpm < 60 이면 WP_D04를 검토한다.
- WP_D03(필러 과다)는 수치가 아닌 transcript에서 필러로 인해 흐름이 끊기는지로만 판단한다. 필러가 많아도 내용 전달이 자연스러우면 태깅하지 않는다.
- pause_count_3s_plus 가 많으면 WP_D02 또는 WP_A07을 검토한다.
- pronunciation_accuracy < 65 이면 WP_A06을 검토한다.
- 단, 수치만으로 자동 확정하지 말고 transcript와 실제 수행 상태를 함께 본다.

[ANTI-OVER-TAGGING]
- 한 문항에서 weak_point가 많이 보여도 실제 병목 1~3개만 남긴다.
- 결과적으로 사용자가 무엇부터 고쳐야 하는지 보이도록 태깅한다.
- 비슷한 코드 여러 개를 동시에 붙이는 대신, 더 본질적인 코드를 선택하라.
```

---

## 2. Input 형식

```
question_type: {{question_type}}
question_text: {{question_text}}
transcript: {{transcript}}
duration_sec: {{duration_sec}}
wpm: {{wpm}}
pause_count_3s_plus: {{pause_count_3s_plus}}
filler_ratio: {{filler_ratio}}
pronunciation_accuracy: {{pronunciation_accuracy}}
```

---

## 3. Output JSON Schema (Structured Outputs)

```json
{
  "text": {
    "format": {
      "type": "json_schema",
      "name": "opic_weak_point_result",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {
          "primary_weak_points": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "code": {
                  "type": "string",
                  "enum": [
                    "WP_S01","WP_S02","WP_S03","WP_S04","WP_S05","WP_S06","WP_S07","WP_S08","WP_S09",
                    "WP_A01","WP_A02","WP_A03","WP_A04","WP_A05","WP_A06","WP_A07","WP_A08",
                    "WP_C01","WP_C02","WP_C03","WP_C04","WP_C05","WP_C06","WP_C07",
                    "WP_T01","WP_T02","WP_T03","WP_T04","WP_T05","WP_T06","WP_T07","WP_T08",
                    "WP_D01","WP_D02","WP_D03","WP_D04"
                  ]
                },
                "severity": {
                  "type": "string",
                  "enum": ["severe", "moderate", "mild"]
                },
                "reason": { "type": "string" },
                "evidence": { "type": "string" }
              },
              "required": ["code", "severity", "reason", "evidence"],
              "additionalProperties": false
            }
          },
          "secondary_evidence_codes": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "code": {
                  "type": "string",
                  "enum": [
                    "WP_S01","WP_S02","WP_S03","WP_S04","WP_S05","WP_S06","WP_S07","WP_S08","WP_S09",
                    "WP_A01","WP_A02","WP_A03","WP_A04","WP_A05","WP_A06","WP_A07","WP_A08",
                    "WP_C01","WP_C02","WP_C03","WP_C04","WP_C05","WP_C06","WP_C07",
                    "WP_T01","WP_T02","WP_T03","WP_T04","WP_T05","WP_T06","WP_T07","WP_T08",
                    "WP_D01","WP_D02","WP_D03","WP_D04"
                  ]
                },
                "severity": {
                  "type": "string",
                  "enum": ["severe", "moderate", "mild"]
                },
                "reason": { "type": "string" },
                "evidence": { "type": "string" }
              },
              "required": ["code", "severity", "reason", "evidence"],
              "additionalProperties": false
            }
          },
          "overall_bottleneck_summary": { "type": "string" }
        },
        "required": ["primary_weak_points", "secondary_evidence_codes", "overall_bottleneck_summary"],
        "additionalProperties": false
      }
    }
  }
}
```

**주의**: `severity` 필드명은 GPT-5.4 자문에서 `fulfillment`이라 불렀으나, 문항 수준의 fulfillment과 혼동을 피하기 위해 `severity`로 변경.

| severity 값 | 의미 | 병목 엔진 가중치 |
|---|---|---|
| `severe` | 해당 기능이 사실상 수행되지 않음 | × 3.0 |
| `moderate` | 시도는 있으나 불완전/불안정 | × 1.5 |
| `mild` | 약한 흔적이 일부 존재 | × 0.5 |

---

## 4. Responses API Payload 예시

```json
{
  "model": "gpt-5.4",
  "reasoning": { "effort": "high" },
  "instructions": "...위 §1 전문...",
  "input": [
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": "question_type: comparison\nquestion_text: ...\ntranscript: ...\nduration_sec: 46\nwpm: 96\npause_count_3s_plus: 0\nfiller_ratio: 0.01\npronunciation_accuracy: 81"
        }
      ]
    }
  ],
  "text": { "format": { "...위 §3 JSON Schema..." } }
}
```

---

## 5. 운영 권장사항

### 5.1. 프롬프트 분리
- `instructions`는 코드에 하드코딩하지 말고, DB `evaluation_prompts_v2` 테이블에 저장
- 버전 관리: `prompt_version: "wp_tagging_v2"`, `model: "gpt-5.4"`

### 5.2. 2단 평가 (권장)
1단: GPT가 내부적으로 먼저 판단 (task 수행 여부, discourse 수준, time frame control, content support, delivery risk)
2단: 최종 weak_point 코드 1~3개만 압축 출력

→ 이 구조는 `reasoning.effort: "high"` 설정으로 자동 달성됨 (GPT-5.4가 reasoning 단계에서 1단을 수행)

### 5.3. 비용/속도 트레이드오프
| 모델 | 장점 | 단점 | 용도 |
|------|------|------|------|
| gpt-5.4 (effort: high) | 최고 품질, reasoning 단계에서 심층 분석 | 느림, 비쌈 | 프로덕션 (유료 사용자) |
| gpt-5.4 (effort: medium) | 양호한 품질, 속도 균형 | reasoning 깊이 제한 | 프로덕션 (일반) |
| gpt-4.1-mini | 빠르고 저렴 | 복잡한 규칙 준수율 하락 가능 | 테스트/MVP |

---

## 6. 논의 로그

### 2026-03-20: 초안 → GPT-5.4 자문 → v2 확정

**v1 초안**: 31개 코드 (S8+A7+C6+T6+D4)

**GPT-5.4 자문 결과 (5개 검증 항목)**:
1. **코드 완전성**: 5개 추가 필요 (S09, A08, C07, T02, T08)
2. **티어 관련도**: AL 가중치 과수정 — micro-grammar 하향, discourse/timeframe 상향 필요
3. **코드 병합/분리**: Task 코드 세분화, Delivery/micro-accuracy 통합 권장
4. **question_type별 적용**: RP12/adv_14/adv_15/past narrative 계열 누락 코드 있음
5. **C02 vs C03**: 병목 스코어용 병합, 피드백용 분리 유지

**v2 확정**: 36개 코드 (S9+A8+C7+T8+D4)
- 5개 추가: WP_S09, WP_A08, WP_C07, WP_T02, WP_T08
- 2개 이름 변경: WP_A06 pronunciation_low → intelligibility_low, WP_C04 social_perspective_absent → viewpoint_support_weak
- 11개 티어 가중치 조정 (A03, A04, A05, A02, S03, S07, S08, T03, T01, D01, D02)
- `fulfillment` → `severity` 필드명 변경 (문항 fulfillment과 혼동 방지)
