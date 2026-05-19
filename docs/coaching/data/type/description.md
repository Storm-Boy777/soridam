# Type Overlay — description (일반 묘사)

> **적재 대상**: `coaching_type_overlay` row (type_id: `description`)
> **출처**: 자료 #1 (음악 IH 1:1 코칭) + 자료 #5 (Skeleton paragraph 강의)
> **변환 framework**: [09-curriculum-conversion.md](../../09-curriculum-conversion.md) §2~§3
> **본질**: 대상 → 구성요소 → 개인 연결 → 의의 흐름. 선택형 묘사 + 공통형 description 중 13 토픽 외.

---

## column: `type_id` (text, unique)

```
description
```

## column: `applies_to` (jsonb)

```json
{
  "question_type_eng": "description",
  "match_rule": "description AND NOT (survey_type='공통형' AND category='일반' AND topic IN random_topics_28)"
}
```

→ EF resolveTypeOverlay()에서 돌발 28 토픽이 아닌 모든 description 매칭. 선택형 묘사가 주 대상이지만, 13 토픽 외 공통형 description도 여기로.

## column: `reasoning_flow` (jsonb)

```json
{
  "steps": [
    {
      "step_id": "object_introduction",
      "description": "묘사 대상 도입 — 학생이 무엇을 묘사할 것인지 명시",
      "level_applicability": "all"
    },
    {
      "step_id": "component_breakdown",
      "description": "구성요소 / 측면 분해 — 대상의 여러 면을 나눠 설명",
      "level_applicability": "IM2+"
    },
    {
      "step_id": "personal_engagement",
      "description": "본인이 이 대상과 어떻게 관계 맺는지 — 학생의 실제 경험·취향",
      "level_applicability": "all"
    },
    {
      "step_id": "significance_or_closure",
      "description": "의의 / 마무리 — 대상이 본인에게 갖는 의미 또는 자연스러운 마무리",
      "level_applicability": "IM2+"
    }
  ],
  "skeleton_paragraph_overlay": {
    "applies_at": "IM3+",
    "roles": [
      "topic_introduction",
      "transition_to_details",
      "supporting_point_1",
      "supporting_point_2",
      "closing_synthesis",
      "closure_signal"
    ],
    "discriminator": "IM3 → IH 전환점 — 6 roles 검출 가능하면 IH 진입",
    "source": "자료 #5 (Skeleton paragraph)"
  }
}
```

## column: `intervention_triggers` (jsonb)

```json
{
  "rules": [
    {
      "rule_id": "discourse_breakdown_early_cutoff",
      "trigger_condition": "answer terminates without completing the thought",
      "score_impact": "P1_discourse_breakdown",
      "intervention_logic": "Focus all attention on completing one full skeleton paragraph. Vocabulary upgrade is not relevant until P1 resolved.",
      "level_applicability": "all",
      "source": "자료 #1 + System Core P1"
    },
    {
      "rule_id": "sustainment_under_target_length",
      "trigger_condition": "answer length significantly below target_level word_count_min",
      "score_impact": "P2_sustainment",
      "intervention_logic": "Suggest one extension move — add a personal anecdote or one more supporting point. Do not request vocabulary upgrade.",
      "level_applicability": "all"
    },
    {
      "rule_id": "skeleton_role_missing",
      "trigger_condition": "target_level IH AND fewer than 5 of 6 skeleton roles detected",
      "score_impact": "P3_sequencing",
      "intervention_logic": "Identify the single most impactful missing role. Suggest one structural sentence. Do not ask to add multiple roles in one attempt.",
      "level_applicability": "IM3+",
      "source": "자료 #5 (Skeleton)",
      "do_not": "do not raise this for IL/IM1/IM2 — skeleton is not yet their target."
    },
    {
      "rule_id": "object_pronoun_for_inanimate_concept",
      "trigger_condition": "student uses subject pronoun (he/she/it) to describe a non-human concept where natural English expects metonymy or specifier",
      "score_impact": "P3_sequencing",
      "intervention_logic": "Guide toward specifier/metonymy via ONE direct substitution. Example: 'He is beautiful' (about a singer's music) → 'His music is beautiful'.",
      "level_applicability": "IM3+",
      "source": "자료 #1 (음악)"
    },
    {
      "rule_id": "cohesive_repetition_basic",
      "trigger_condition": "same connector or transition phrase used 3 or more times within one answer",
      "score_impact": "P4_cohesive_repetition",
      "intervention_logic": "Identify the most-repeated connector. Suggest ONE substitution at the second occurrence. Do not provide a full cohesive matrix.",
      "level_applicability": "IM3+"
    },
    {
      "rule_id": "vocab_repetition_basic_verbs",
      "trigger_condition": "a basic verb (like, enjoy, have, see, go, want, use) repeated 3+ times within the answer",
      "score_impact": "P5_vocab_limitation",
      "intervention_logic": "Identify the highest-frequency repeat. Suggest ONE synonym at the most natural slot. Do not replace every instance. Do not provide a vocabulary matrix.",
      "level_applicability": "IM3+",
      "source": "자료 #1 etalon priority 1",
      "do_not": "do not raise this if P1-P3 issues are present."
    },
    {
      "rule_id": "agreement_quantifier_plural",
      "trigger_condition": "some of / one of / a number of + singular verb, OR various / many / several + singular noun",
      "score_impact": "P6_grammar_accuracy",
      "intervention_logic": "Point to subject-verb agreement via direct correction. This is binary — right or wrong. Critical AL blocker.",
      "level_applicability": "all",
      "source": "자료 #1 etalon priority 2",
      "escalates_at": "IH and AL — agreement violation auto-disqualifies AL."
    },
    {
      "rule_id": "participial_opportunity_when_doing",
      "trigger_condition": "two clauses with same subject in 'when [subject] + V-ing' pattern, AND target_level >= IH",
      "score_impact": "P3_sequencing",
      "intervention_logic": "Suggest participial reduction. Example: 'When I watch him playing piano, I feel ...' → 'Watching him play the piano, I feel ...'. ONLY if the slot naturally fits — do NOT force.",
      "level_applicability": "IH+",
      "source": "자료 #1 etalon priority 5",
      "do_not": "do not make participial mandatory at IH. AL students should show this naturally without prompting."
    },
    {
      "rule_id": "closing_tag_absence",
      "trigger_condition": "answer length meets target word_count_target AND no closure signal phrase present",
      "score_impact": "P3_sequencing",
      "intervention_logic": "Only raise if length is sufficient. If length is short, the issue is sustainment (P2), not closing tag. Suggest one natural closing phrase consistent with the student's register.",
      "level_applicability": "IM3+",
      "source": "자료 #1 etalon priority 7"
    }
  ],
  "priority_order_reminder": "Always intervene at the LOWEST priority level violated. P1 > P2 > P3 > P4 > P5 > P6. Skip lower priorities if higher ones violated."
}
```

## column: `optional_examples` (jsonb)

```json
{
  "note": "Examples for GPT pattern recognition ONLY. Do NOT insert verbatim into model_answer unless student already used similar phrasing.",
  "skeleton_role_examples": {
    "topic_introduction": [
      "To talk about ___, ...",
      "Speaking of ___, ..."
    ],
    "transition_to_details": [
      "to get into more details, ...",
      "let me get into more specifics."
    ],
    "supporting_point_marker": [
      "The first thing is that ...",
      "Another thing is that ...",
      "And the last thing is that ..."
    ],
    "closing_synthesis": [
      "Overall, ___ means a lot to me.",
      "All in all, ___ is something I genuinely enjoy."
    ],
    "closure_signal": [
      "That's about it.",
      "That's pretty much it.",
      "Yeah, that's all I can say."
    ]
  },
  "vocab_substitution_examples": {
    "like_repetition": ["appreciate", "be fond of", "enjoy", "adore"],
    "many_repetition": ["a lot of", "numerous", "various"],
    "good_repetition": ["comfortable", "peaceful", "well-designed"]
  },
  "participial_transformations": {
    "when_doing_pattern": [
      "When I watch him playing piano → Watching him play the piano",
      "When I drive listening to music → Driving in the car, I listen to music"
    ]
  }
}
```

## column: `group_awareness` (jsonb)

```json
null
```

→ description은 그룹 분류 없음. group_awareness는 description_random row만 사용.

## column: `notes` (text)

```
1차 시드 — 자료 #1 (음악 IH 1:1 코칭) + 자료 #5 (Skeleton paragraph) 변환.
선택형 묘사가 주 대상이며 13 토픽 외 공통형 description도 매칭.
표현 풀 카탈로그 X — intervention_triggers의 조건/판단/제안 3축에 핵심 적재.
표현은 optional_examples에 참고만 (강제 X).
```

## column: `is_active` (boolean)

```
true
```
