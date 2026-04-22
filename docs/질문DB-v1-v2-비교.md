# 질문 DB: v1 vs v2 비교

## 테이블 비교

| 항목 | v1 (`master_questions`) | v2 (`v2_questions`) |
|------|------------------------|---------------------|
| 행 수 | 510개 | 471개 |
| PK | `id` (integer, 자동증가) | `id` (text, 직접 지정) |
| 질문 코드 | `question_id` (별도 컬럼, 예: `COM_MOV_RP_C1_01`) | `id` 자체가 코드 (예: `APL_ADV_COM_Q14_01`) |
| 질문 유형 | `answer_type` (예: `roleplay_11`, `past_experience_recent`) | `question_type_eng` (예: `adv_14`, `adv_15`) |
| 토픽 | `topic` (예: "영화 관람 계획") | `topic` (예: "가전제품") |
| 카테고리 | `topic_category` | `category` + `sub_category` |
| 서베이 | `survey_type` | `survey_type` |
| 질문 영어 | `question_english` | `question_english` |
| 질문 한국어 | `question_korean` | `question_korean` |
| 질문 요약 | 없음 | `question_short` |
| 질문 유형 한국어 | 없음 | `question_type_kor` |
| 태그 | 없음 | `tag` |
| 오디오 | `audio_url`, `audio_voice`, `audio_generated_at` | `audio_url` |

## ID 체계 비교

### v1 ID 체계 (`question_id`)
```
COM_MOV_RP_C1_01
│   │    │  │  └─ 순번
│   │    │  └──── 콤보 번호
│   │    └─────── 유형 (N=일반, RP=롤플레이, A=어드밴스)
│   └──────────── 토픽 약어 (MOV=영화, FRE=여가, TEC=기술...)
└──────────────── 서베이 (COM=선택, SEL=필수)
```

### v2 ID 체계 (`id`)
```
APL_ADV_COM_Q14_01
│   │    │   │   └─ 순번
│   │    │   └───── 문제 번호 (Q14, Q15)
│   │    └───────── 카테고리 (COM=선택)
│   └────────────── 서브카테고리 (ADV=어드밴스, GEN=일반)
└──────────────── 토픽 약어 (APL=가전제품)
```

## 핵심 문제

1. **ID 체계가 완전히 다름** — v1 `COM_MOV_RP_C1_01` ≠ v2 `APL_ADV_COM_Q14_01`
2. **질문 내용은 유사**할 수 있음 — 같은 OPIc 질문이 다른 ID로 저장
3. **v1 스크립트 2,652개**가 v1 question_id를 참조 → v2로 옮기려면 매핑 필요

## 논의 필요 사항

### 옵션 A: v1 question_id → v2 question_id 매핑 테이블 생성
- question_english 텍스트로 매칭하여 매핑
- 매칭 안 되는 질문은 수동 처리
- 스크립트 이전 시 매핑으로 question_id 변환

### 옵션 B: v2_questions에 v1 질문도 추가
- v1에만 있는 질문을 v2 형식으로 변환하여 추가
- v2_scripts의 FK가 모든 질문을 커버

### 옵션 C: v2_scripts의 question_id FK 제거
- FK 없이 question_id를 자유 텍스트로 저장
- v1 스크립트는 v1 question_id 그대로, v2 스크립트는 v2 question_id 사용
- 가장 간단하지만 무결성 약해짐

### 옵션 D: v1 질문 DB를 v2 형식에 맞게 전면 교체
- v1 master_questions 510개를 v2 ID 체계로 재매핑
- v2_questions에 통합 (v1 + v2 합쳐서 하나의 SSOT)

---
*최종 업데이트: 2026-04-06*
