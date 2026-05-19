# Grade Layer — AL row

> **적재 대상**: `coaching_grade_layer` row (target_level: `AL`)
> **출처**: [docs/coaching/02-grade-layer.md](../02-grade-layer.md) §2.AL
> **본질**: 지속 가능한 조직된 담화. 토픽 확장. 자연스러운 흐름.
> **주의**: AL ≠ checklist of advanced features. AL = capabilities flowing naturally.

---

## column: `target_level` (text, unique)

```
AL
```

## column: `text_type` (text)

```
sustained_cohesive_discourse
```

## column: `speech_constraints` (jsonb)

```json
{
  "discourse_type": "sustained_cohesive_discourse",
  "text_role_count_required": "6+ with extension",
  "vocab_ceiling": "advanced",
  "syntax_complexity": "complex_natural",
  "cohesive_density": "high",
  "cohesive_categories_min": 5,
  "additional_capabilities": [
    "topic_extension",
    "reflective_moment_natural",
    "comparative_or_hypothetical_natural",
    "graceful_self_repair"
  ],
  "natural_complexity_required": true,
  "written_essay_register_forbidden": true,
  "allow_minor_breakdown": false,
  "allow_significant_breakdown": false
}
```

## column: `discriminator_from_below` (text)

```
IH → AL: SUSTAINED DISCOURSE + extension. 자연스러운 reflection 가능.

IH가 skeletal paragraph로 끝난다면,
AL은 그 skeleton을 유지하면서 추가로:

  a. topic_extension          — 주제를 깊이/넓이로 확장
  b. cohesive_variety         — 6 카테고리 골고루 (도입/반전/예시/추가/결론도입/마무리)
  c. natural_complexity       — 자연스러운 복잡 구조 (외운 분사구문 X)
  d. self_repair              — 실수 시 자가 수정 가능
  e. reflective_moment        — 메타적 한 문장 자연스럽게 (선택적, 강제 X)

★ 외운 티 나는 답변은 AL 박탈 신호.
★ 토론 마무리 카드 그대로 인용 = AL 아니라 IH-template.
```

## column: `tone_adjustment` (text)

```
"충분히 자연스러워요. 굳이 더 멋부리지 말고 이 흐름을 유지하세요."

- 작은 자연스러움 조정만.
- Template phrase 사용 시 즉시 짚어 제거 권고.
- Self-repair 자연스러움 유지.
- 토론/메타 reflection은 학생이 자연 bridge 만들 때만 격려.
- issue 0~1개 — 대부분 답변에 흠 X. 칭찬 + 다음 회차 안내 중심.
```

## column: `issue_count_min` (int)

```
0
```

## column: `issue_count_max` (int)

```
1
```

## column: `word_count_min` (int)

```
200
```

## column: `word_count_max` (int)

```
280
```
