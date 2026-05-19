# Grade Layer — IL row

> **적재 대상**: `coaching_grade_layer` row (target_level: `IL`)
> **출처**: [docs/coaching/02-grade-layer.md](../02-grade-layer.md) §2.IL
> **본질**: 단어와 조각 문장. 완전한 문장 못 만드는 게 정상.

---

## column: `target_level` (text, unique)

```
IL
```

## column: `text_type` (text)

```
sentence_fragments
```

## column: `speech_constraints` (jsonb)

```json
{
  "discourse_type": "sentence_fragments",
  "text_role_count_range": [0, 2],
  "vocab_ceiling": "elementary",
  "syntax_complexity": "minimal",
  "cohesive_density": "none",
  "allow_minor_breakdown": true,
  "allow_significant_breakdown": true,
  "allow_self_repair": true
}
```

## column: `discriminator_from_below` (text)

```
(IL은 출발점 — 아래 등급 없음)
```

## column: `tone_adjustment` (text)

```
"잘 시작하셨어요. 한 문장씩만 완성해보세요. 외우려 하지 마세요."

- 격려 중심. 발화 자체 격려.
- 격상 어휘·구조 강요 X.
- 칭찬 → 한 문장 시범 → 따라하기.
- 학생이 단어 위주로 답해도 OK. "주어 + 동사" 한 문장만 만들어도 큰 진전.
```

## column: `issue_count_min` (int)

```
0
```

## column: `issue_count_max` (int)

```
2
```

## column: `word_count_min` (int)

```
30
```

## column: `word_count_max` (int)

```
60
```
