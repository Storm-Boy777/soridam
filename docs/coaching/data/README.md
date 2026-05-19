# DB 적재 본문 — 검수용 문서

> 실제 DB row에 들어갈 본문을 마크다운으로 정리. 사용자 검수 → OK 신호 후 SQL 마이그로 변환·적용.

---

## 폴더 구조

```
docs/coaching/data/
├── prompt/        ← 시스템 + 유저 프롬프트 본문 (CO-STAR)
│   ├── system.md          ← coaching_system_core 1 row
│   ├── user-pass1.md      (예정 — Pass 1 user prompt 템플릿)
│   └── user-pass2.md      (예정 — Pass 2 user prompt 템플릿)
│
├── grade/         ← 등급 6 row (coaching_grade_layer)
│   ├── IL.md
│   ├── IM1.md
│   ├── IM2.md
│   ├── IM3.md
│   ├── IH.md
│   └── AL.md
│
└── type/          ← 유형 11 row (coaching_type_overlay)
    ├── description.md          (예정)
    ├── description_random.md   (예정)
    ├── routine.md              (예정)
    ├── comparison.md           (예정)
    ├── past_childhood.md       (예정)
    ├── past_recent.md          (예정)
    ├── past_special.md         (예정)
    ├── adv_14.md               (예정)
    ├── adv_15.md               (예정)
    ├── rp_11.md                (예정)
    └── rp_12.md                (예정)
```

---

## 작성 상태

| 묶음 | 파일 | 상태 |
|------|------|------|
| **prompt** | system.md | ✅ CO-STAR 6 섹션 |
| **prompt** | user-pass1.md / user-pass2.md | ⏳ 예정 |
| **grade** | 6 row (IL/IM1/IM2/IM3/IH/AL) | ✅ |
| **type** | description.md | ✅ |
| **type** | description_random / routine / comparison / past_*×3 / adv_*×2 / rp_*×2 | ⏳ (10 row 예정) |

---

## 인프라 마이그 (본문 없음 — 스키마만)

| 작업 | 내용 |
|------|------|
| 학생 데이터 청산 | `TRUNCATE coaching_attempts / coaching_sessions / coaching_topic_mastery / coaching_type_mastery CASCADE` |
| `coaching_system_core` 테이블 생성 | id / prompt_id / system_prompt / model / pass1_temperature / pass2_temperature / max_tokens / is_active / notes |
| `coaching_grade_layer` 테이블 생성 | id / target_level / text_type / speech_constraints jsonb / discriminator_from_below / tone_adjustment / issue_count_min/max / word_count_min/max |
| `coaching_type_overlay` 테이블 생성 | id / type_id / reasoning_flow jsonb / intervention_triggers jsonb / optional_examples jsonb / group_awareness jsonb / applies_to jsonb / notes / is_active |
| `coaching_sessions.current_focus` 컬럼 추가 | jsonb DEFAULT NULL |

---

## 검수 흐름

1. **본문 검수** — `prompt/` `grade/` `type/` 폴더의 MD 파일들을 읽고 본문 정합성 / 톤 / 표현 확인.
2. **수정 사항** — 발견 시 알려서 MD 파일 수정.
3. **OK 신호** — "적용해" 같은 명시 신호 주시면 Claude가:
   - 인프라 SQL 마이그 작성
   - MD 본문을 SQL INSERT 문으로 직조
   - `psql -f`로 적용
   - 검증 쿼리 결과 보고
4. **롤백** — MD 파일이 source of truth. SQL은 항상 MD에서 재생성.

---

## 본문 작성 원칙

각 MD 파일 상단 헤더 통일:

```markdown
# {row 이름}

> **적재 대상**: `{table_name}` row (key: `{key_value}`)
> **출처**: docs/coaching/{설계 문서}.md
> **변동성**: {고정 / 낮음 / 중간 / 높음}
```

본문은 **DB 컬럼별로 명확히 구분**:

```markdown
## column: `column_name` (type)

\`\`\`
DB에 들어갈 본문 그대로
\`\`\`
```

→ MD → SQL 변환 시 컬럼 매핑 정확.
