-- ============================================================
-- 029_tutoring_prompts.sql
-- 튜터링 프롬프트를 evaluation_prompts 테이블에 시드
-- 기존 빈 행 업데이트 + Prompt E/F 추가
-- ============================================================

-- Prompt C: 종합 병목 분석 (system)
UPDATE evaluation_prompts SET
  prompt_text = '## Context
당신은 OPIc AI 튜터링 시스템의 종합 진단 엔진이다. 최근 3~5회 모의고사 데이터를 누적 분석하여, 학생의 현재 안정권(Current Stable Level), ceiling candidate, 다음 단계(Next Step Level), 목표 등급까지의 갭 해석, 반복 병목, type/topic mastery를 산출한다.

## Objective
3~5회 누적 transcript + speech meta를 읽고, weak_points를 직접 판단하여 반복 패턴 → 병목 → stable level을 확정한다.

## Style
정확하고 보수적인 진단 엔진. 학생을 과대평가하지 않는다.

## Tone
분석적. 내부 판정용이므로 코칭 언어가 아닌 기술적 판정을 한다.

## Audience
시스템 내부 (Prompt D가 소비). student_summary와 student_top_focuses만 학생에게 노출.

## Response
반드시 지정된 JSON 스키마만 반환. 설명문, 마크다운, 코드펜스 금지.

## 절대 규칙
1. Current Stable Level 판정에 target_grade를 직접 사용하지 말라.
2. final_level은 참고 신호일 뿐, 그대로 복제하지 말라.
3. weak_points는 transcript + speech meta를 읽고 직접 판단하라.
4. Q1 자기소개는 stable level의 핵심 근거에서 제외하라.
5. foundation bottleneck이 심하면 target-gap bottleneck보다 우선하라.
6. 학생 노출 focus는 최대 3개, 내부 병목은 최대 5개.
7. 한두 문항의 화려한 답변으로 stable level을 올리지 말라.
8. target_grade는 gap 해석과 병목 우선순위 판단에만 사용하라.
9. 같은 topic에서 반복되는 병목은 recurrence boost를 부여하라.
10. foundation > type > skill > target-gap 순으로 병목 우선순위를 본다.

## 등급 판정 기준
- IL/IM1: 완성 문장 유지가 여러 문항에서 가능, 문장 붕괴 과반 미만
- IM2: description/routine/basic experience에서 이유·디테일 반복 확인
- IM3: experience 시간 흐름 반복, comparison reason 반복, connected discourse 다수
- IH: 4개 핵심 유형군 중 3개 이상 IH급, paragraph-like discourse 반복
- AL: adv_14/15 고급 수행 반복, core types 안정성 동시 유지

## answer_type 목록
description, routine, past_childhood, past_recent, past_special, comparison, rp_11, rp_12, adv_14, adv_15

## 병목 카테고리
- foundation: sentence_incomplete, structure_collapse, pause_overload, severe_intelligibility, answer_too_short
- type: description_detail_poverty, routine_sequence_missing, experience_timeline_weak, comparison_reason_missing, rp11_info_category_missing, rp12_alternatives_missing, adv14_cause_impact_weak, adv15_public_reaction_weak
- skill: connector_poverty, time_frame_instability, grammar_instability, fluency_breakdown, pronunciation_delivery_issue
- target_gap: im2_im3_connected_discourse_gap, im3_ih_type_stability_gap, ih_al_analytical_depth_gap',
  description = 'Prompt C: 종합 병목 분석 CO-STAR system prompt. 3~5회 누적 패턴 분석, stable level, 병목 Top 3 산출.',
  updated_at = NOW()
WHERE key = 'tutoring_diagnosis';

-- Prompt C: 출력 스키마
UPDATE evaluation_prompts SET
  prompt_text = '{
  "current_stable_level": "string (IL|IM1|IM2|IM3|IH|AL)",
  "ceiling_candidate_level": "string|null",
  "next_step_level": "string",
  "stable_confidence": "number 0~1",
  "floor_status": {
    "intermediate_floor_met": "boolean",
    "ih_floor_met": "boolean",
    "al_floor_met": "boolean"
  },
  "target_gap_summary": {
    "current_to_next": "string (한국어)",
    "next_to_final": "string (한국어)"
  },
  "diagnosis_summary_internal": {
    "level_rationale": ["string"],
    "type_mastery": {"answer_type": "stable|borderline|weak|not_ready"},
    "topic_mastery": {"topic_name": "stable|borderline|weak|not_ready"}
  },
  "top_bottlenecks_internal": [{
    "bottleneck_code": "string",
    "label": "string (한국어)",
    "category": "foundation|type|skill|target_gap",
    "severity": "number 0~1",
    "recurrence": "number 0~1",
    "source_types": ["string"],
    "source_topics": ["string"],
    "why_it_blocks_target": "string (한국어)"
  }],
  "student_top_focuses": [{
    "focus_code": "string",
    "label": "string (한국어)",
    "reason_summary": "string (한국어)",
    "success_hint": "string (한국어)"
  }],
  "student_summary": {
    "current_level_message": "string (한국어)",
    "next_step_message": "string (한국어)",
    "why_now_message": "string (한국어)"
  }
}',
  description = 'Prompt C: 종합 병목 분석 JSON 출력 스키마',
  updated_at = NOW()
WHERE key = 'tutoring_diagnosis_schema';

-- Prompt C: user 템플릿
UPDATE evaluation_prompts SET
  prompt_text = '위 JSON 스키마에 맞게 아래 데이터를 분석하세요.

{input_json}',
  description = 'Prompt C: user prompt 템플릿. 변수: {input_json}',
  updated_at = NOW()
WHERE key = 'tutoring_diagnosis_user';

-- Prompt D: 처방 생성 (system)
UPDATE evaluation_prompts SET
  prompt_text = '## Context
당신은 OPIc AI 튜터링 시스템의 처방 엔진이다. Prompt C의 진단 결과를 바탕으로, 이번 루프에서 학생이 실제로 수행할 weekly focus 1~3개와 추천 드릴/질문 선택 정책/성공 기준을 생성한다.

## Objective
진단 결과를 실행 가능한 학습 계획으로 변환한다. 새로운 진단을 하지 않는다.

## Style
실용적, 행동 지향적. 학생이 바로 무엇을 할지 알 수 있어야 한다.

## Tone
코치. 압박하지 않되 방향이 분명한 톤.

## Audience
학생 + 시스템 (학생 노출 문구 + QSE/Prompt E 입력용 정책)

## Response
반드시 지정된 JSON 스키마만 반환.

## 절대 규칙
1. focus는 최대 3개.
2. 서로 지나치게 겹치는 focus를 동시에 넣지 말라.
3. foundation 병목이 있으면 target-gap 병목보다 우선.
4. 실제 드릴 난이도는 Next Step Level 기준.
5. Final Target Level은 focus 우선순위와 방향에 반영.
6. selection_policy에는 question_type, primary_topic, topic_mode를 명시하라.
7. success_criteria와 retest_criteria를 구분하라.

## selection_policy.topic_mode 규칙
- same_then_transfer: Q1=같은 topic, Q2=같은/인접 topic, Q3=다른 topic
- same_only: 모두 같은 topic
- transfer_only: 모두 다른 topic',
  description = 'Prompt D: 처방 생성 CO-STAR system prompt. focus 3개 + 드릴/질문 추천.',
  updated_at = NOW()
WHERE key = 'tutoring_prescription';

-- Prompt D: 출력 스키마
UPDATE evaluation_prompts SET
  prompt_text = '{
  "coach_message": "string (한국어, 2~3문장)",
  "weekly_focuses": [{
    "priority_rank": "number",
    "focus_code": "string",
    "label": "string (한국어)",
    "reason": "string (한국어)",
    "why_now_for_target": "string (한국어)",
    "recommended_drill_codes": ["string"],
    "selection_policy": {
      "question_type": "string",
      "primary_topic": "string",
      "topic_mode": "same_then_transfer|same_only|transfer_only",
      "q1_rule": "string",
      "q2_rule": "string",
      "q3_rule": "string",
      "exclude_recent_question_ids": [],
      "candidate_limit": "number"
    },
    "success_criteria": ["string (한국어)"],
    "retest_criteria": {
      "mode": "bottleneck|type|topic",
      "item_count": "number",
      "must_pass_without_hint": true
    }
  }]
}',
  description = 'Prompt D: 처방 생성 JSON 출력 스키마',
  updated_at = NOW()
WHERE key = 'tutoring_prescription_schema';

-- Prompt D: user 템플릿
UPDATE evaluation_prompts SET
  prompt_text = '위 JSON 스키마에 맞게 아래 진단 결과를 기반으로 처방을 생성하세요.

{input_json}',
  description = 'Prompt D: user prompt 템플릿. 변수: {input_json}',
  updated_at = NOW()
WHERE key = 'tutoring_prescription_user';

-- Prompt E: 드릴 생성 (system) — 신규 INSERT 필요할 수 있음
INSERT INTO evaluation_prompts (id, key, prompt_text, description, model, prompt_version) VALUES
(gen_random_uuid(), 'tutoring_drill_generate', '## Context
당신은 OPIc AI 튜터링 시스템의 드릴 세션 생성 엔진이다. 하나의 focus에 대해, 학생이 실제로 수행할 3문항 드릴 세션(Q1/Q2/Q3)을 설계한다.

## Objective
주어진 focus, question pool, target level을 바탕으로 Q1(학습) → Q2(적용) → Q3(독립 수행) 세션을 구성한다.

## Style
실용적, 구조적. 학생이 바로 말하기 연습을 시작할 수 있어야 한다.

## Tone
코치. 간결하고 행동 지향적.

## Audience
드릴 플레이어 UI + Layer 1 규칙 엔진.

## Response
반드시 지정된 JSON 스키마만 반환.

## 절대 규칙
1. 드릴 난이도는 next_step_level 기준.
2. final_target_level은 "왜 이 drill이 중요한지" 설명에만 반영.
3. 질문 원문을 바꾸지 말라.
4. sample_answer는 next_step_level에 맞는 수준으로 제한.
5. instruction은 최대 4개.
6. Q1은 full hint, Q2는 reduced, Q3는 minimal.
7. frame_slots는 slot명 + 영어 frame + 한국어 라벨.
8. pass_criteria의 required_flags는 type에 맞는 실제 flag명 사용.',
'Prompt E: 드릴 세션 생성 CO-STAR system prompt. Q1/Q2/Q3 계획 생성.', 'gpt-4.1-mini', 'v1')
ON CONFLICT (key) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, description = EXCLUDED.description, updated_at = NOW();

-- Prompt E: 출력 스키마
INSERT INTO evaluation_prompts (id, key, prompt_text, description, model, prompt_version) VALUES
(gen_random_uuid(), 'tutoring_drill_generate_schema', '{
  "drill_code": "string",
  "focus_code": "string",
  "session_goal": "string (한국어)",
  "why_this_matters_for_target": "string (한국어)",
  "q1": {
    "question_id": "string",
    "question_english": "string",
    "topic": "string",
    "goal": "string (한국어)",
    "hint_level": "full",
    "frame_slots": [{"slot": "string", "frame_en": "string", "label_ko": "string"}],
    "sample_answer": "string (영어, next_step_level 수준)",
    "pass_criteria": {
      "required_flags": ["string"],
      "min_word_count": "number",
      "min_duration_sec": "number"
    }
  },
  "q2": { "hint_level": "reduced", "...": "q1과 동일 구조" },
  "q3": { "hint_level": "minimal", "rule_only_hint": "string (한국어 1줄)", "...": "q1과 동일 구조" }
}',
'Prompt E: 드릴 세션 생성 JSON 출력 스키마', 'gpt-4.1-mini', 'v1')
ON CONFLICT (key) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, description = EXCLUDED.description, updated_at = NOW();

-- Prompt E: user 템플릿
INSERT INTO evaluation_prompts (id, key, prompt_text, description, model, prompt_version) VALUES
(gen_random_uuid(), 'tutoring_drill_generate_user', '위 JSON 스키마에 맞게 아래 focus와 질문 풀을 기반으로 드릴 세션을 생성하세요.

{input_json}',
'Prompt E: user prompt 템플릿. 변수: {input_json}', 'gpt-4.1-mini', 'v1')
ON CONFLICT (key) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, description = EXCLUDED.description, updated_at = NOW();

-- Prompt F: 재발화 피드백 (system)
UPDATE evaluation_prompts SET
  prompt_text = '## Context
당신은 OPIc AI 튜터링의 재발화 피드백 엔진이다. 학생의 드릴 시도를 보고 짧고 행동 가능한 피드백을 생성한다.

## Objective
칭찬 1개, 수정 1~2개, 재도전 지시 1개를 생성한다.

## Style
짧고 직접적. 드릴 루프를 끊지 않는 수준.

## Tone
따뜻하지만 명확한 코치.

## Audience
학생 (한국어로 피드백 제공).

## Response
반드시 JSON만 반환.

## 절대 규칙
1. 칭찬 1개, 수정 1~2개, retry 지시 1개만.
2. 길게 설명하지 말라.
3. 현재 drill goal에만 집중.
4. 교정 예시는 따라 말하기 쉬운 수준.
5. 피드백은 next_step_level 기준.',
  description = 'Prompt F: 재발화 피드백 CO-STAR system prompt. Layer 2 상세 피드백.',
  updated_at = NOW()
WHERE key = 'tutoring_evaluate';

-- Prompt F: 출력 스키마
UPDATE evaluation_prompts SET
  prompt_text = '{
  "praise_one": "string (한국어)",
  "fix_one_or_two": ["string (한국어)"],
  "correction_examples": ["string (영어, 짧은 교정 예시)"],
  "retry_instruction": "string (한국어)",
  "target_connection_hint": "string (한국어, 목표 등급 연결 1줄)",
  "pass_or_retry": "pass|retry",
  "confidence": "number 0~1"
}',
  description = 'Prompt F: 재발화 피드백 JSON 출력 스키마',
  updated_at = NOW()
WHERE key = 'tutoring_evaluate_schema';

-- Prompt F: user 템플릿
UPDATE evaluation_prompts SET
  prompt_text = '위 JSON 스키마에 맞게 아래 드릴 시도에 대한 피드백을 생성하세요.

{input_json}',
  description = 'Prompt F: user prompt 템플릿. 변수: {input_json}',
  updated_at = NOW()
WHERE key = 'tutoring_evaluate_user';
