# Grade 폴더 — 등급별 텍스트 타입 본문

> `coaching_grade_layer` 테이블의 6 row. 각 등급의 텍스트 타입 + speech_constraints + tone_adjustment.

---

## 파일

| 파일 | target_level | text_type |
|------|------------|-----------|
| [IL.md](./IL.md) | IL | sentence_fragments |
| [IM1.md](./IM1.md) | IM1 | simple_sentences |
| [IM2.md](./IM2.md) | IM2 | simple_with_connections |
| [IM3.md](./IM3.md) | IM3 | connected_sentences |
| [IH.md](./IH.md) | IH | skeletal_paragraph |
| [AL.md](./AL.md) | AL | sustained_cohesive_discourse |

---

## 역할

학생의 `target_level`에 매칭되는 row 1개를 fetch해서 user prompt에 삽입.

예: 학생 IH 목표 → `grade/IH.md` 적재 본문이 user message의 Context block에 들어감.

각 row의 `speech_constraints` jsonb가 핵심 — GPT가 등급 텍스트 타입 충실 유지.

---

## 등급 간 결정 신호 (Discriminators)

```
IL  → IM1:   complete sentence (vs fragments)
IM1 → IM2:   two-sentence connection
IM2 → IM3:   sustained subordination + topic sentence
IM3 → IH:    SKELETON PARAGRAPH (6 roles)        ★ 가장 큰 분기점
IH  → AL:    SUSTAINED DISCOURSE + extension     ★ AL 진짜 본질
```

세부는 각 row의 `discriminator_from_below` 컬럼 참조.
