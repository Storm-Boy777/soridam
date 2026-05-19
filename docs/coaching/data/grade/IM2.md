# Grade Layer — IM2 row

> **적재 대상**: `coaching_grade_layer` row (target_level: `IM2`)
> **출처**: [docs/coaching/02-grade-layer.md](../02-grade-layer.md) §2.IM2
> **본질**: 두 문장 묶기 시도. 'and/so/but' + 단순 종속절.

---

## column: `target_level` (text, unique)

```
IM2
```

## column: `text_type` (text)

```
simple_with_connections
```

## column: `speech_constraints` (jsonb)

```json
{
  "discourse_type": "simple_with_connections",
  "text_role_count_range": [3, 4],
  "vocab_ceiling": "low_intermediate",
  "syntax_complexity": "simple_plus_emerging_subordination",
  "cohesive_density": "low",
  "allowed_connectors": ["and", "but", "so", "where", "when", "because"],
  "allow_minor_breakdown": true,
  "allow_significant_breakdown": false
}
```

## column: `discriminator_from_below` (text)

```
IM1 → IM2: 두 문장 묶기 (and/so/but) + 단순 종속절(where/when/because) 도입.
Topic sentence 베타 시도 가능.
```

## column: `tone_adjustment` (text)

```
"두 문장을 'and'나 'where'로 묶어볼까요? 한 슬롯씩 늘려봅시다."

- 종속절(where/when) 도입 시도.
- Topic sentence 베타 시도 ("To talk about my house, ...").
- 격상 어휘 1~2개만 베타 (many → a lot of / good → comfortable).
- 분사구문 1개 베타 (lying on the bed) — 강요 X.
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
80
```

## column: `word_count_max` (int)

```
130
```
