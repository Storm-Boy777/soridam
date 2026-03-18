# 모의고사 동작 로직 종합 문서

> **목적**: 모의고사가 어떻게 동작하는지 전체 흐름을 이해하기 위한 문서
> **최종 업데이트**: 2026-03-11

---

## 문서 구조

| # | 문서 | 핵심 질문 |
|---|------|----------|
| 01 | [전체 흐름](01-전체-흐름.md) | "모의고사 처음부터 끝까지 어떻게 돌아가?" |
| 02 | [시험 진행](02-시험-진행.md) | "기출 선택부터 15문항 녹음 제출까지 어떻게?" |
| 03 | [평가 파이프라인](03-평가-파이프라인.md) | "답변이 제출되면 뒤에서 뭐가 일어나?" |
| 04 | [등급 판정](04-등급-판정.md) | "평가엔진이 뭐고, 등급은 어떻게 결정돼?" |
| 05 | [결과 화면](05-결과-화면.md) | "결과 페이지에 뭐가 보이고, 데이터는 어디서 와?" |
| 06 | [DB 스키마](06-DB-스키마.md) | "테이블이 뭐가 있고, 데이터가 어떻게 흘러?" |

---

## 30초 요약

```
사용자가 기출 선택 → 모드(훈련/실전) 선택 → 마이크 테스트
→ Q1~Q15 순서대로 질문 듣고 답변 녹음
→ 답변 제출될 때마다 백엔드에서 자동으로 평가 시작 (fire-and-forget)

[백엔드 4-Stage 파이프라인]
Stage A: 음성→텍스트 변환(STT) + 발음 평가 + 스킵 판정
Stage B-1: GPT-4.1-mini가 체크박스 74개 판정 + 과제충족 판정
Stage B-2: GPT-4.1이 코칭 피드백 생성 (무응답이면 룰 기반 구제)
Stage C: 평가엔진이 최종 등급 결정 + FACT 점수 + GPT 종합 리포트

→ 결과 페이지: 4탭 (종합/진단/문항별/성장)
→ 튜터링 연결: 약점 기반 자동 처방
```

---

## 핵심 숫자

| 항목 | 값 |
|------|-----|
| 총 문항 수 | 15개 (Q1 자기소개 평가 제외 → 실질 14문항) |
| 체크박스 | 74개 (INT 20 + ADV 42 + AL 12) |
| 평가 시간 | 약 2~3분 (전체 14문항 기준) |
| GPT 모델 | B-1: gpt-4.1-mini (판정) / B-2: gpt-4.1 (코칭) / C: gpt-4.1 (종합) |
| FACT 점수 | F/A/C/T 각 0~10점, 총점 = (F+A+C+T) × 2.5 = 100점 만점 |
| 등급 | NH → IL → IM1 → IM2 → IM3 → IH → AL (7단계) |
| question_type | 10종 (description, routine, comparison, past_childhood, past_recent, past_special, roleplay_11, roleplay_12, advanced_14, advanced_15) |
| 훈련 모드 만료 | 72시간 |
| 실전 모드 만료 | 90분 (시험 시간 40분) |

---

## 핵심 파일 위치

### 프론트엔드
```
components/mock-exam/
├── mock-exam-content.tsx          ← 3탭 메인 래퍼 (응시/결과/나의 이력)
├── start/                         ← 시험 준비
│   ├── mode-selector.tsx          ← 훈련/실전 모드 선택
│   ├── device-test.tsx            ← 마이크/스피커 테스트
│   └── question-pool-selector.tsx ← 기출 3개 중 선택
├── session/                       ← 시험 진행
│   ├── mock-exam-session-wrapper.tsx ← 복원 + Phase 관리
│   ├── mock-exam-session.tsx      ← 핵심: 녹음+제출+이동 로직
│   ├── session-timer.tsx          ← 경과/카운트다운 타이머
│   └── question-grid.tsx          ← 15문항 진행 상태 그리드
├── evaluation/
│   └── eval-waiting.tsx           ← 평가 진행률 모니터링
├── result-page/                   ← 결과 4탭
│   ├── result-page-content.tsx    ← 4탭 래퍼
│   ├── tab-overview.tsx           ← 종합 탭
│   ├── tab-diagnosis.tsx          ← 진단 탭
│   ├── tab-questions.tsx          ← 문항별 탭
│   └── shared-helpers.ts         ← TYPE_MAP_KO, QT_KO 등
├── result/                        ← 결과 컴포넌트
│   ├── result-summary.tsx         ← 등급+FACT 요약
│   ├── result-detail.tsx          ← 문항별 아코디언
│   └── growth-report.tsx          ← 성장 리포트 7섹션
└── history/
    └── grade-progress-chart.tsx   ← 등급 추이 차트 (Recharts)
```

### 백엔드 (Edge Functions)
```
supabase/functions/
├── mock-test-process/index.ts    ← Stage A: STT + 발음 + 스킵
├── mock-test-eval-judge/index.ts ← Stage B-1: 체크박스 판정
├── mock-test-eval-coach/index.ts ← Stage B-2: 코칭 피드백
├── mock-test-report/index.ts     ← Stage C: 평가엔진 + 종합 리포트
├── admin-trigger-eval/index.ts   ← 테스트용 평가 트리거
└── _shared/
    ├── skip-detector.ts           ← 3단계 스킵 판정
    ├── checkbox-definitions.ts    ← 74개 체크박스 정의 + FACT 매핑
    ├── rule-engine.ts             ← 평가엔진 7-Step
    └── question-type-map.ts       ← 10 타입별 체크리스트 + 구제 메시지
```

### Server Actions + 타입
```
lib/
├── actions/mock-exam.ts           ← Server Actions 10개
├── types/mock-exam.ts             ← TypeScript 타입 전체
├── hooks/use-recorder.ts          ← 녹음 훅 (WebM→WAV)
├── hooks/use-question-player.ts   ← 질문 오디오 재생
└── hooks/use-eval-polling.ts      ← 평가 상태 폴링
```

### DB
```
supabase/migrations/011_mock_test.sql  ← 6개 테이블 DDL
```
