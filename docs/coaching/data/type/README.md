# Type 폴더 — 유형별 reasoning_flow + intervention_triggers 본문

> `coaching_type_overlay` 테이블의 11 row. 각 유형의 사고 흐름 + 개입 조건.

---

## 파일 인덱스

| 파일 | type_id | 강사 자료 | 상태 |
|------|---------|---------|------|
| [description.md](./description.md) | description | #1 + #5 (음악 IH 1:1 + Skeleton) | ✅ |
| [description_random.md](./description_random.md) | description_random | #11~#14 (돌발 4 그룹) | ✅ |
| routine.md | routine | DB 합성 | ⏳ |
| comparison.md | comparison | DB 합성 | ⏳ |
| past_childhood.md | past_childhood | #8 | ⏳ |
| past_recent.md | past_recent | #9 | ⏳ |
| past_special.md | past_special | #10 | ⏳ |
| adv_14.md | adv_14 | #15 / #16 | ⏳ |
| adv_15.md | adv_15 | #17 | ⏳ |
| rp_11.md | rp_11 | #2 / #6 | ⏳ |
| rp_12.md | rp_12 | #2 / #7 | ⏳ |

**진행률**: 1 / 11

---

## 역할

학생의 질문 유형(`question_type`)에 매칭되는 row 1개를 fetch해서 user prompt에 삽입.

예: 학생이 description (일반 묘사) 답변 → `type/description.md` 적재 본문이 user message의 Context block에 들어감.

각 row의 핵심 컬럼:

```yaml
reasoning_flow:         # 유형별 사고 흐름 (step1~step_n)
intervention_triggers:  # 조건별 개입 룰 (condition / score_impact / suggestion)
optional_examples:      # 표현 example (참고만, 강제 X)
group_awareness:        # description_random만 — 4 그룹 thematic context
applies_to:             # 매칭 룰 {survey_type, category, question_type, topic_in[]}
```

---

## 작성 원칙

[09-curriculum-conversion.md](../../09-curriculum-conversion.md) framework 적용:

```
1. Trigger Condition    — 학생 답변에 무엇이 있을 때/없을 때
2. Score Impact         — ACTFL 평가축 P1~P6 매핑
3. Intervention Logic   — 강사라면 어떻게 판단하는가 (일반화)
4. Optional Examples    — 표현은 example로만 (강제 X)
```

표현 누적 X. 판단 알고리즘 O.

---

## 작성 우선순위

```
1차: description (음악 IH 검증으로 framework 정합 확인)
2차: description_random (28 토픽 검증)
3차: rp_11 / rp_12 (롤플레이 패턴)
4차: past_childhood / past_recent / past_special
5차: adv_14 / adv_15
6차: routine / comparison (강사 자료 X — DB 합성)
```
