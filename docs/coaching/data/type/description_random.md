# Type Overlay — description_random (돌발 묘사)

> **적재 대상**: `coaching_type_overlay` row (type_id: `description_random`)
> **출처**: 자료 #11~#14 (시사 / 환경 / 산업·기술 / 개인 4 그룹)
> **변환 framework**: [09-curriculum-conversion.md](../../09-curriculum-conversion.md) §4
> **본질**: AL discriminator — un-prepared 토픽에 organized discourse 유지 능력. 14 토픽 풀 모범 암기 X.

---

## column: `type_id` (text, unique)

```
description_random
```

## column: `applies_to` (jsonb)

```json
{
  "survey_type": "공통형",
  "category": "일반",
  "question_type_eng": "description",
  "topic_in": [
    "은행", "호텔", "음식점", "교통",
    "미용실", "병원", "치과", "약국", "약속", "예약",
    "재활용", "지형", "날씨",
    "산업", "기술", "전화기", "가전제품", "인터넷", "선호회사",
    "모임", "휴일", "자유시간",
    "가족/친구", "음식", "패션", "건강", "가구", "직장"
  ],
  "match_rule": "공통형 + 일반 + description + 28 화이트리스트 토픽 중 하나",
  "match_count": 28
}
```

→ 28 토픽 중 강사 직접 모범 13개(자료 #11~#14에 풀 모범 등장) + 확장 15개(동일 그룹 본질 적용).

## column: `reasoning_flow` (jsonb)

```json
{
  "steps": [
    {
      "step_id": "stalling_acknowledgment",
      "description": "시간 벌기 + 어려움 인정 — 첫 인지 시 부담 표출 + 노력 의지",
      "level_applicability": "all",
      "purpose": "외운 티 없이 자연스럽게 답변 시작점 마련"
    },
    {
      "step_id": "generalization",
      "description": "일반화 한 줄 — 'there are many ___ in Korea' 같은 양적·일반 표현",
      "level_applicability": "IM2+",
      "purpose": "토픽 도메인 진입"
    },
    {
      "step_id": "light_classification",
      "description": "가벼운 분류 — 2~3 종류 나열 (강제 X)",
      "level_applicability": "IM3+",
      "purpose": "내용 확장 자료 제공"
    },
    {
      "step_id": "personal_anchor",
      "description": "본인 경험 anchor — 1개 'I' 문장으로 본인 실제 관계 표명",
      "level_applicability": "all",
      "purpose": "답변이 3인칭만으로 흐르지 않도록 학생 자신을 박음"
    },
    {
      "step_id": "cultural_or_modern_angle",
      "description": "(선택) 디지털 대체 / 외국인 시각 / 사회적 변화 등 1개 각도",
      "level_applicability": "IH+",
      "purpose": "단순 묘사 → 사회적 맥락 확장",
      "important": "조건부. 학생 답변에 자연 bridge 있을 때만."
    },
    {
      "step_id": "graceful_close",
      "description": "자연스러운 마무리 — breakdown 없이 답변 종료",
      "level_applicability": "all"
    }
  ],
  "what_this_is_NOT": [
    "memorizing 28 topic-specific answer scripts",
    "reciting the planet belongs to children's children card",
    "quoting market share is 30% globally",
    "inserting It fills me with an immense sense of pride"
  ],
  "what_this_actually_IS": [
    "quick stalling to buy thinking time",
    "generalization from limited knowledge",
    "1-2 personal hooks despite unfamiliar topic",
    "graceful close without breakdown"
  ]
}
```

## column: `intervention_triggers` (jsonb)

```json
{
  "rules": [
    {
      "rule_id": "sustainment_under_30_seconds",
      "trigger_condition": "answer duration < 30 seconds OR word count < 70",
      "score_impact": "P2_sustainment",
      "intervention_logic": "Sustainment coaching ONLY. Do NOT raise vocabulary or structure issues until sustainment achieved. Suggest one extension move — generalization sentence OR personal anchor.",
      "level_applicability": "all",
      "do_not": "do not raise P5/P6 issues when P2 is violated."
    },
    {
      "rule_id": "no_personal_anchor",
      "trigger_condition": "answer entirely in 3rd person — no 'I' / 'my' / 'me' sentence",
      "score_impact": "P3_sequencing",
      "intervention_logic": "Suggest ONE personal sentence — student's actual relation to the topic. Even one sentence transforms the answer from generic to authentic.",
      "level_applicability": "IM3+"
    },
    {
      "rule_id": "stalling_absent_at_random_topic",
      "trigger_condition": "answer starts immediately without acknowledging the difficulty/unfamiliarity",
      "score_impact": "P3_sequencing",
      "intervention_logic": "Suggest one short stalling phrase at the opening. This is a natural reflex of native-like spontaneous speech, not an OPIc trick.",
      "level_applicability": "IM2+",
      "do_not": "do not raise this if the answer opens naturally and student clearly knows the topic."
    },
    {
      "rule_id": "AL_target_descriptive_only",
      "trigger_condition": "target_level == AL AND answer is purely descriptive with no extension/reflection AND the topic naturally invites reflection",
      "score_impact": "P3_sequencing",
      "intervention_logic": "Suggest ONE reflective sentence — IF and ONLY IF the student's answer naturally bridges to it. Do NOT force a debate card / quantification / pride statement.",
      "level_applicability": "AL only",
      "do_not": "do not insert reflection if the bridge feels artificial. A descriptive AL answer with smooth sustained discourse is fine on its own."
    },
    {
      "rule_id": "cohesive_repetition",
      "trigger_condition": "same connector or transition phrase 3+ times within answer",
      "score_impact": "P4_cohesive_repetition",
      "intervention_logic": "Identify the most-repeated connector. Substitute ONE instance with a different category device. Do not provide a 6-category matrix.",
      "level_applicability": "IH+"
    },
    {
      "rule_id": "vocab_repetition_basic",
      "trigger_condition": "basic word (many, people, good, famous, use, like) repeated 3+ times AND P1-P3 are clean",
      "score_impact": "P5_vocab_limitation",
      "intervention_logic": "Substitute ONE instance at highest-frequency slot. Stay within target_level vocab_ceiling.",
      "level_applicability": "IH+",
      "do_not": "do not raise this if discourse issues (P1-P3) are present. Do not provide vocabulary matrices."
    },
    {
      "rule_id": "memorized_phrasing_detected",
      "trigger_condition": "answer contains template phrases that don't naturally bridge from student's prior sentences (debate cards, fixed quantifiers, pride statements appearing out of nowhere)",
      "score_impact": "P3_sequencing",
      "intervention_logic": "Suggest REMOVAL of the bolt-on phrase. Recommend a natural replacement that follows from student's actual content. This is critical for AL — memorized AL phrases disqualify AL.",
      "level_applicability": "IH+ (escalates at AL)",
      "source": "자료 #21 강사 1:1 코칭 etalon — 학생 골격 유지 원칙"
    }
  ],
  "priority_order_reminder": "P1 > P2 > P3 > P4 > P5 > P6. For random topics, sustainment (P2) is often the highest-impact intervention.",
  "group_specific_rules": "see group_awareness column for thematic context and conditional cards by group."
}
```

## column: `group_awareness` (jsonb)

```json
{
  "purpose": "Thematic context per group for natural framing. These are NOT required cards. Use ONLY when the student's answer naturally bridges to that angle.",
  "groups": {
    "current_affairs": {
      "topics": ["은행", "호텔", "음식점", "교통", "미용실", "병원", "치과", "약국", "약속", "예약"],
      "thematic_essence": "공공 서비스 / 생활 시설 / 서비스업",
      "common_natural_angles": [
        "general prevalence in Korea",
        "type/classification of the service",
        "user behavior",
        "digital alternative (mobile / online booking) — IF student already mentioned modernization",
        "foreigner reaction — IF student already mentioned Korea's quality"
      ],
      "do_not_force": [
        "digital alternative phrasing if student didn't bring it up",
        "pride statements about Korean services if student is just describing"
      ]
    },
    "environment": {
      "topics": ["재활용", "지형", "날씨"],
      "thematic_essence": "자연 / 시간 / 보존",
      "common_natural_angles": [
        "natural feature description",
        "personal engagement (hiking / activities)",
        "environmental change or seasonal shift — IF student mentioned change",
        "future-generation reflection — IF student naturally reaches that level (AL only)"
      ],
      "do_not_force": [
        "the planet belongs to children's children card — only use if (a) AL target AND (b) student answer reaches an environmental reflection naturally AND (c) the insertion sounds organic",
        "global warming pivot if student is just describing terrain/weather objectively"
      ]
    },
    "industry_tech": {
      "topics": ["산업", "기술", "전화기", "가전제품", "인터넷", "선호회사"],
      "thematic_essence": "한국 산업 / 기술 / 기기 / 회사",
      "common_natural_angles": [
        "list of industries/technologies in Korea",
        "student's choice of one",
        "market position or popularity claim",
        "personal use of the technology",
        "global recognition by foreigners — IF student already framed Korea on global stage"
      ],
      "do_not_force": [
        "market share quantification (30% globally) — only ONE quantifier and only if student already made a scale/market claim that invites it",
        "immense sense of pride phrasing if student isn't naturally expressing pride",
        "industry = technology unification claim if student is just describing one specific tool"
      ]
    },
    "personal": {
      "topics": ["모임", "휴일", "자유시간", "가족/친구", "음식", "패션", "건강", "가구", "직장"],
      "thematic_essence": "일상 / 관계 / 가치 / 자기 표현",
      "common_natural_angles": [
        "personal routine or preference",
        "family/friend emphasis",
        "good side / bad side reflection (especially for 자유시간 / 스마트폰)",
        "trade-off or value statement — IF student naturally reaches it (AL only)"
      ],
      "do_not_force": [
        "양면 토론 5단 (good→reversal→bad→solution→meta-reflection) — only if (a) AL target AND (b) student answer naturally moves through these phases AND (c) the topic genuinely has duality (자유시간/스마트폰/SNS 등)",
        "family bonding statement if student is describing something unrelated to family",
        "meta-reflection on technology/society if student is just describing their daily routine"
      ]
    }
  },
  "global_principle": "Group awareness is for the GPT to recognize natural thematic context. It is NEVER a checklist to insert. Student's actual answer dictates whether any group-specific angle should be coached."
}
```

## column: `optional_examples` (jsonb)

```json
{
  "note": "Examples for GPT pattern recognition ONLY. Do NOT insert verbatim unless student already used similar phrasing.",
  "stalling_examples": [
    "It's a tough question.",
    "I haven't thought about it before.",
    "I don't have much to say about this, but let me try."
  ],
  "generalization_examples": [
    "There are many ___ in Korea.",
    "Wherever you go in Korea, you can see ___."
  ],
  "personal_anchor_examples": [
    "For me, I usually ___.",
    "Personally, I ___."
  ],
  "graceful_close_examples": [
    "That's about it.",
    "Yeah, that's pretty much what I can say."
  ]
}
```

## column: `notes` (text)

```
1차 시드 — 자료 #11~#14 (돌발 4 그룹) 변환.
강사 자료 #11~#14의 본질은 '14 토픽 풀 모범 암기'가 아니라
'un-prepared 주제도 organized discourse 유지하는 AL discriminator' 능력 측정.

핵심 원칙:
  - REQUIRED 카드 X (토론 마무리 / 정량화 / 양면 토론 모두 조건부 적용)
  - group_awareness는 thematic context — 절대 강제 X
  - 학생 답변에 자연 bridge 있을 때만 group-specific 각도 도입
  - 가장 큰 score_impact는 P2 sustainment (돌발 주제에서 학생이 끊김)

자료 #21 (산업 1:1 코칭)의 minimal_intervention_principle 정합:
  학생 답변 골격 유지 + 슬롯 카피 1~2개 + 메모리즈드 표현 검출 시 제거 권고.
```

## column: `is_active` (boolean)

```
true
```
