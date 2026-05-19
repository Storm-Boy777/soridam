# Grade Layer — IH row

> **적재 대상**: `coaching_grade_layer` row (target_level: `IH`)
> **출처**: [docs/coaching/02-grade-layer.md](../02-grade-layer.md) §2.IH
> **본질**: Skeleton paragraph 6 roles 완성. 가장 큰 등급 분기점.

---

## column: `target_level` (text, unique)

```
IH
```

## column: `text_type` (text)

```
skeletal_paragraph
```

## column: `speech_constraints` (jsonb)

```json
{
  "discourse_type": "skeletal_paragraph",
  "text_role_count_required": 6,
  "skeleton_roles": [
    "topic_introduction",
    "transition_to_details",
    "supporting_point_1",
    "supporting_point_2",
    "closing_synthesis",
    "closure_signal"
  ],
  "vocab_ceiling": "upper_intermediate",
  "syntax_complexity": "moderate",
  "cohesive_density": "medium",
  "cohesive_categories_min": 4,
  "allow_minor_breakdown": true,
  "allow_significant_breakdown": false
}
```

## column: `discriminator_from_below` (text)

```
IM3 → IH: SKELETON PARAGRAPH 6 roles 완성. 가장 결정적 분기점.

6 roles 검출 기준:
  1. topic_introduction       — 소재 도입
  2. transition_to_details    — 세부로 전환 신호
  3. supporting_point_1       — 첫 지원 포인트
  4. supporting_point_2       — 둘째 지원 포인트 (다른 측면)
  5. closing_synthesis        — 마무리 종합
  6. closure_signal           — 마무리 tag

IM3: roles 4-5 detected, 6 incomplete
IH:  all 6 roles detected (repetitive transitions OK)
```

## column: `tone_adjustment` (text)

```
"Skeleton 완성도 좋아요. 한 가지만 더 자연스럽게 — 어떤 부분이 좋을까요?"

- 6 roles 완성 우선.
- 한 가지 흠만 짚어 체화 (issue_count_max = 2).
- 위치별 표지 일관 + Cohesive repetition 회피.
- 분사구문 모범 사용 시연.
- AL 격상 신호 1개 미리 보여주기 OK (강요 X).
- 칭찬 → 격상 1개 시범 → 따라하기 → AL 신호 미리보기.
```

## column: `issue_count_min` (int)

```
1
```

## column: `issue_count_max` (int)

```
2
```

## column: `word_count_min` (int)

```
150
```

## column: `word_count_max` (int)

```
200
```
