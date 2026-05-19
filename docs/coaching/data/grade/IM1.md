# Grade Layer — IM1 row

> **적재 대상**: `coaching_grade_layer` row (target_level: `IM1`)
> **출처**: [docs/coaching/02-grade-layer.md](../02-grade-layer.md) §2.IM1
> **본질**: 단순 문장 가능. 시제 일관성 시도.

---

## column: `target_level` (text, unique)

```
IM1
```

## column: `text_type` (text)

```
simple_sentences
```

## column: `speech_constraints` (jsonb)

```json
{
  "discourse_type": "simple_sentences",
  "text_role_count_range": [2, 3],
  "vocab_ceiling": "basic",
  "syntax_complexity": "simple_present_and_past",
  "cohesive_density": "very_low",
  "allowed_connectors": ["and", "so", "but"],
  "allow_minor_breakdown": true,
  "allow_significant_breakdown": false
}
```

## column: `discriminator_from_below` (text)

```
IL → IM1: complete sentence 완성 (vs fragments).
주어 + 동사 + (목적어/보어) 한 문장을 안정적으로 발화.
```

## column: `tone_adjustment` (text)

```
"이 표현 한 번 따라해볼래요? 한 단어만 바꿔도 자연스러워져요."

- 빈도 부사 1~2개 시도 (usually / sometimes / always / every day).
- 단순 묶기 ('and / so / but') 시도.
- 종속절·격상 어휘는 아직 X.
- 3인칭 단수 -s 정확성 베타.
```

## column: `issue_count_min` (int)

```
2
```

## column: `issue_count_max` (int)

```
3
```

## column: `word_count_min` (int)

```
50
```

## column: `word_count_max` (int)

```
90
```
