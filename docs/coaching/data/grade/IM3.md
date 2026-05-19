# Grade Layer — IM3 row

> **적재 대상**: `coaching_grade_layer` row (target_level: `IM3`)
> **출처**: [docs/coaching/02-grade-layer.md](../02-grade-layer.md) §2.IM3
> **본질**: 종속절·연결 안정. 단락 구조는 아직 완성 X (Skeleton 4~5 roles 베타).

---

## column: `target_level` (text, unique)

```
IM3
```

## column: `text_type` (text)

```
connected_sentences
```

## column: `speech_constraints` (jsonb)

```json
{
  "discourse_type": "connected_sentences",
  "text_role_count_range": [4, 5],
  "vocab_ceiling": "intermediate",
  "syntax_complexity": "subordination_plus_occasional_participial",
  "cohesive_density": "medium_low",
  "cohesive_categories_min": 2,
  "allow_minor_breakdown": true,
  "allow_significant_breakdown": false
}
```

## column: `discriminator_from_below` (text)

```
IM2 → IM3: 종속절 + topic sentence 안정 (sustained subordination).
연결 문장 안정적으로 이어감. 답변이 단락 베타에 진입.
```

## column: `tone_adjustment` (text)

```
"이제 단락으로 묶어볼 수 있어요. Skeleton 6 roles 익히면 IH로 가요."

- Skeleton 골격 베타 시도 (4~5 roles).
- Cohesive 2~3 카테고리 시도 (firstly / besides / in conclusion).
- 분사구문 1~2 베타 OK (강요 X).
- 어휘 격상 1~2개 시도 (many → numerous / use → take advantage of).
- 위치별 표지(Q2 표지) 베타 시도.
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
110
```

## column: `word_count_max` (int)

```
160
```
