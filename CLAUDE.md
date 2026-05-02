# CLAUDE.md - 소리담 (Soridam) 프로젝트

## 🔄 자동 업데이트 규칙

**IMPORTANT**: 의미 있는 작업이 완료될 때마다, 이 CLAUDE.md의 아래 섹션들을 최신 상태로 업데이트한다.

**업데이트 대상:**
- `📅 개발 이력` — 완료된 작업 내역 추가 (날짜 + 요약)
- `🔮 현재 상태 & 다음 단계` — 현재 상태와 다음 작업 갱신
- `📚 프로젝트 문서 체계` — 문서가 추가/변경되면 반영

**업데이트 시점:**
- Phase나 Step이 완료되었을 때
- DB 테이블이 생성/변경되었을 때
- 새로운 모듈이 구현되었을 때
- 문서가 추가/삭제/이름변경 되었을 때
- 프로젝트 구조에 큰 변화가 있을 때

**업데이트하지 않는 경우:**
- 단순 버그 수정, 사소한 스타일 변경
- 대화만 하고 코드 변경이 없을 때

**연쇄 업데이트 원칙 (IMPORTANT):**
작업이 완료되면 관련된 **모든** 문서를 함께 갱신한다. 하나만 바꾸고 끝내지 않는다.

| 문서 | 갱신 내용 |
|------|----------|
| `CLAUDE.md` | 개발 이력, 현재 상태 & 다음 단계, DB 현황 |
| `docs/실행계획.md` | 현재 진행 상태, Phase/Step 상태, 바로 다음 작업 |
| `docs/의사결정.md` | 구현 현황, 새 결정 사항, 미결 항목 변경 |
| `docs/설계/*.md` | 해당 모듈 설계와 실제 구현이 다르면 설계 문서 수정 |
| `docs/오픽스터디_세션인계.md` | 새 세션 시작 시 가장 먼저 읽기 (오픽 스터디 작업 컨텍스트 풀 정리) |

---

## 🌏 Language Instruction

**IMPORTANT**: 모든 설명과 응답은 반드시 **한국어**로 작성하세요.
- 코드 주석: 한국어
- 커밋 메시지: 한국어 (예: `feat: 로그인 기능 추가`)
- 문서 작성: 한국어
- 사용자와의 대화: 한국어

영어는 오직 다음 경우에만 사용:
- 코드 자체 (변수명, 함수명 등)
- 기술 용어가 영어가 더 명확한 경우

### 소통함 답글 작성 톤 (사용자 문의 답변)
- **컨셉**: 친근한 개발자. 사용자들은 직장 동료이므로 캐주얼하게
- **톤**: 반말 X, 존댓말이지만 딱딱하지 않게. "~했습니다" 보다 "~했어요" 선호
- **이모티콘 적극 활용**: ☕ 🥲 🙌 💬 등 상황에 맞게
- **구조**: 인사 → 감사/공감 → 원인 설명 (간단히) → 해결 상태 → 추가 요청 안내
- **예시**:
  ```
  OOO님, 안녕하세요! ☕
  알려주셔서 감사합니다!
  확인해보니 ~~ 버그가 있었어요 🥲
  바로 수정 완료했으니 다시 한번 시도해 주세요! 🙌
  그래도 안 되시면 편하게 말씀해 주세요 💬
  ```

## 🎯 Project Overview

**소리담 (Soridam)** - AI 기반 OPIc 영어 말하기 학습 플랫폼
- 도메인: https://soridamhub.com
- 하루오픽 코드 기반으로 시작, 현재는 독립 프로젝트로 운영 (이관 완료)

## 📚 프로젝트 문서 체계

> **IMPORTANT**: 의사결정 및 진행사항 확인 시 반드시 `docs/의사결정.md`를 참조한다.

### 문서 구조도

```
docs/
├── 의사결정.md          ← 모든 의사결정 기록 (제품 P-1~4, 기술 T-1~8, 이관 M-1~4)
├── 실행계획.md          ← 마스터 실행 가이드 (Phase별 할 일, 순서, 참조 문서)
├── 사업운영.md          ← 사업/행정/결제 (PG사, 브랜드, 사업자 정보)
├── 디자인시스템.md       ← 아토믹 디자인 원칙, 컴포넌트 설계
├── 로고에셋.md          ← 로고 사용 가이드, 에셋 파일 경로
├── 설계철학.md          ← 서베이 중요성, 설계 방향
├── 마케팅-강점분석.md    ← 모듈별 홍보 포인트, 경쟁력 분석
├── 오픽시험구조.md       ← OPIc 시험 구조 + DB 현황 + 재설계 논의
├── 이현석DB_분석.md      ← 이현석 OPIc DB 분석 (431질문, 198세트, 28토픽, 41RP)
├── 가이드_Next.js+Supabase_페이지전환_성능최적화.md ← 성능 최적화 필수 가이드
├── 설계/               ← 기능별 상세 설계 (DB, API, 데이터 플로우)
│   ├── 공통기반.md      ← DB 원칙, 백엔드 아키텍처, CORS
│   ├── 시험후기.md      ← submissions 3테이블, 콤보 생성
│   ├── 모의고사.md      ← 5테이블, 평가엔진, Realtime
│   ├── 스크립트.md      ← scripts 통합 테이블, RCTF 프롬프트
│   ├── 튜터링.md        ← **재설계 완료** (전문가 자문, C→D→QSE→E→L1→F 파이프라인)
│   ├── 튜터링-시뮬레이션-데이터.md  ← 소리담 실데이터 시뮬레이션 근거
│   ├── 쉐도잉.md        ← 2테이블, 클라이언트 완결
│   ├── 관리자.md        ← 관리자 시스템 전체 (11페이지, 38 SA, 평가설정)
│   ├── 오픽스터디.md    ← **신규 모듈** (4테이블, Realtime 동기화, 일타강사 코칭, 콤보 빈도 학습)
│   └── weak-point-tagging-prompt.md ← GPT weak_point 태깅 프롬프트 v2 (36개 코드)
├── OPIc 자료/이현석/    ← 이현석 DB 추출 데이터
│   ├── questions_master.json  ← 고유 질문 431개
│   ├── sets_master.json       ← 세트/콤보 198개
│   ├── topics_master.json     ← 토픽 28개 + RP 41개
│   └── vision_extracted.json  ← 원본 추출 데이터 660엔트리
└── 참조/               ← 소리담 원본 분석 (읽기 전용 레퍼런스)
    ├── 소리담_기능분석.md  ← 이관 요약 + 분석결과 인덱스
    └── 소리담_분석결과.md  ← 상세 레퍼런스 (스키마, API, 타입, 플로우)
```

### 문서 사용 시나리오

| 질문 | 참조 문서 |
|------|----------|
| "다음 개발 단계가 뭐지?" | `docs/실행계획.md` → "현재 진행 상태" |
| "이 기능 어떻게 결정됐지?" | `docs/의사결정.md` → 해당 P/T/M 번호 |
| "모의고사 DB 설계는?" | `docs/설계/모의고사.md` |
| "소리담에선 어떻게 했지?" | `docs/참조/소리담_분석결과.md` |
| "PG사 계약 상태는?" | `docs/사업운영.md` |
| "UI 컴포넌트 규칙은?" | `docs/디자인시스템.md` |
| "성능 최적화 패턴은?" | `docs/가이드_Next.js+Supabase_페이지전환_성능최적화.md` |
| "오픽 스터디 설계는?" | `docs/설계/오픽스터디.md` (1450줄, 6단계 + 보강) |

### 핵심 개념

- **questions (471개)**: 시스템 전체의 SSOT. 모든 모듈이 이 테이블에서 시작됨. DB 원본: `docs/질문 DB/questions_db.xlsx`
- **question_type (10가지)**: 묘사/루틴/비교/경험3종/비교변화/사회적이슈/질문하기/대안제시. 평가 체크박스, AI 튜터 진단, 스크립트 전략이 모두 이 값으로 분기
- **백엔드 아키텍처 (T-9)**: 하이브리드 — Server Actions(CRUD) + Edge Functions(AI API 호출)
- **이관 완료**: 시험후기 → 스크립트 → 모의고사 → 튜터링 → 쉐도잉 (전체 이관 완료)

## 🎨 디자인 시스템 (현재 적용 중)

> 정의 파일: `app/globals.css` (@theme 블록)

### 컬러 팔레트

| 역할 | 토큰 | 값 | 용도 |
|------|------|-----|------|
| **Primary** | `primary-500` | `#3A5BC7` (인디고 블루) | 메인 CTA, 강조, 브랜드 컬러 |
| **Primary Light** | `primary-50` | `#EBF0FF` | 하이라이트 배경, 뱃지 |
| **Primary 100** | `primary-100` | `#D6E0FF` | 보조 배경 |
| **Primary Dark** | `primary-600` | `#2A4399` | 호버 |
| **Primary Darker** | `primary-700` | `#1E3378` | 진한 강조 |
| **Accent** | `accent-500` | `#E07A5F` (웜 코랄) | 경고성 강조 |
| **Background** | `background` | `#FAFAF7` (크림) | 페이지 기본 배경 |
| **Surface** | `surface` | `#FFFFFF` | 카드, 모달 배경 |
| **Surface Secondary** | `surface-secondary` | `#F3F2EF` | 섹션 배경, 호버 |
| **Foreground** | `foreground` | `#1A1A2E` (다크 네이비) | 제목, 본문 텍스트 |
| **Foreground Secondary** | `foreground-secondary` | `#6B6B7B` | 보조 텍스트, 설명 |
| **Foreground Muted** | `foreground-muted` | `#A0A0AF` | 비활성, 힌트 |
| **Border** | `border` | `#E8E6E1` | 카드/섹션 테두리 |
| **다크 배경 (히어로)** | — | `#12121F` | 랜딩 히어로, CTA 섹션 |
| **다크 배경 (일반)** | — | `#1A1A2E` | 필로소피, 크레딧 섹션 |

### 폰트

| 역할 | CSS 변수 | 폰트 | 용도 |
|------|----------|------|------|
| **본문** | `--font-sans` | Pretendard Variable (CDN) | 모든 본문 텍스트 |
| **디스플레이** | `--font-display` (= `--font-jua`) | Jua (로컬 TTF) | 로고, 브랜드 텍스트 |
| **세리프** | `--font-serif` | Fraunces + Noto Serif KR | 숫자 강조, 인용 |

### 로고

| 파일 | 용도 | 비고 |
|------|------|------|
| `icon-soridam.png` | 앱 아이콘 | 소리담 아이콘 |
| `favicon.ico` / `favicon.png` | 파비콘 | 브라우저 탭 아이콘 |
| `apple-icon.png` | iOS 아이콘 | Apple 터치 아이콘 |
| `icon-192.png` / `icon-512.png` | PWA 아이콘 | 매니페스트용 |

- **브랜드명**: 소리담 (Soridam)

### 디자인 톤 & 키워드
- **톤**: 인디고 블루 + 크림 — 신뢰감 있는 학습 플랫폼 (다크/라이트 투톤)
- **랜딩**: 다크 네이비(`#12121F`) 히어로 + 밝은 크림(`#FAFAF7`) 콘텐츠 교차
- **CTA 버튼**: `bg-primary-500 rounded-full` (pill 형태 인디고 블루)
- **브랜드명**: 소리담 (Soridam) — 소리를 담다
- **아이콘**: Lucide React 통일

### ⚠️ 모바일 레이아웃 필수 패턴

**Immersive 레이아웃(`h-dvh`)에서 스크롤 가능한 콘텐츠 영역을 만들 때:**

1. **`relative` + `absolute inset-0` 스크롤 패턴** — Immersive 스크롤 컨테이너의 표준 방식
   - `h-0 flex-grow overflow-y-auto`는 모바일 브라우저(Samsung Internet, iOS Safari)에서 자식 요소의 배경/테두리를 제대로 페인팅하지 않는 문제 발생
   - `relative` 래퍼가 flex 공간을 차지하고, `absolute inset-0` 자식이 그 크기를 명시적으로 상속받아 스크롤
   - **원인**: flex 높이 계산 ↔ 스크롤 높이 간 순환 의존으로 모바일 페인트 최적화가 오작동
   - 적용 대상: Immersive 레이아웃(`h-dvh`)에서 `overflow-y-auto` 스크롤 영역
   ```tsx
   {/* ❌ 모바일에서 카드 배경/테두리 잘림 */}
   <div className="h-0 flex-grow overflow-y-auto">...</div>

   {/* ✅ 모바일에서 안정적 페인팅 + 스크롤 */}
   <div className="relative h-0 flex-grow">
     <div className="absolute inset-0 overflow-y-auto">...</div>
   </div>
   ```

2. **모바일 스크롤바 숨김** — 모바일에서 스크롤바 제거, PC에서는 유지
   ```tsx
   <div className="overflow-y-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
   ```

## 🏗️ 기술 스택

| 영역 | 기술 |
|------|------|
| **프레임워크** | Next.js (App Router) |
| **언어** | TypeScript (strict mode) |
| **스타일링** | Tailwind CSS |
| **상태관리** | Zustand |
| **데이터 페칭** | TanStack React Query |
| **폼** | React Hook Form + Zod |
| **백엔드** | Server Actions(CRUD) + Edge Functions(AI) 하이브리드 (T-9 결정) |
| **DB** | Supabase PostgreSQL + RLS |
| **인증** | Supabase Auth |
| **배포** | Vercel (프론트) + Supabase (백엔드) |

## 🔌 MCP 서버

### Supabase MCP (설정 완료)
- **설정 파일**: `.claude/settings.local.json`
- **타입**: HTTP (원격)
- **URL**: `https://mcp.supabase.com/mcp?project_ref=fkkdbnebsaecjpqhhdvl`
- **인증**: Supabase Access Token

**사용 가능한 도구**:
| 도구 | 용도 |
|------|------|
| `execute_sql` | SQL 쿼리 실행 (SELECT/INSERT/UPDATE/DELETE) |
| `list_tables` | 테이블 목록 조회 |
| `get_table_schema` | 테이블 스키마 확인 |
| `apply_migration` | 마이그레이션 적용 |
| `generate_typescript_types` | DB → TypeScript 타입 자동 생성 |
| `list_edge_functions` | Edge Function 목록 |
| `search_documentation` | Supabase 공식 문서 검색 |

**사용 원칙**:
- DB 조회/탐색/스키마 확인 → **MCP 우선** (자연어 요청)
- 복잡한 스크립트/반복 작업 → **psql** (기존 방식 유지)
- 마이그레이션 설계/타입 생성 → **MCP 활용**

## 🛠️ Skills (설치됨)

| 스킬 | 출처 | 용도 | 위치 |
|------|------|------|------|
| `deploy-ef` | 직접 작성 | Edge Function 배포 자동화 | `.claude/skills/` |
| `find-skills` | Vercel Labs | 스킬 검색/설치 도우미 | `.claude/skills/` (심링크) |
| `vercel-react-best-practices` | Vercel Labs | React/Next.js 베스트 프랙티스 적용 | `.claude/skills/` (심링크) |
| `frontend-design` | Anthropic 공식 | 프론트엔드 디자인/UI 구현 가이드 | `.claude/skills/` (심링크) |
| `web-design-guidelines` | Vercel Labs | 웹 디자인 가이드라인 | `.claude/skills/` (심링크) |
| `nano-banana-2` | inferen-sh | 코드 품질 최적화 | `.claude/skills/` (심링크) |

**스킬 관리**:
- 설치: `npx skills add <github-url> --skill <name> -y`
- 검색: `npx skills find [query]`
- 업데이트: `npx skills update`
- 원본 저장: `.agents/skills/` → `.claude/skills/`에 심링크

## 🔑 인프라 정보

### GitHub
- **계정**: Storm-Boy777
- **저장소**: `Storm-Boy777/soridam`
- **URL**: https://github.com/Storm-Boy777/soridam

### Supabase (소리담 — 현재 사용)
- **Project ID**: `fkkdbnebsaecjpqhhdvl`
- **Project URL**: `https://fkkdbnebsaecjpqhhdvl.supabase.co`
- **Region**: Northeast Asia (Seoul)
- **DB Password**: `soridam2026`
- **DB Host (Pooler)**: `aws-0-ap-northeast-2.pooler.supabase.com`
- **DB Port**: `6543` (Transaction) / `5432` (Session)
- **DB User**: `postgres.fkkdbnebsaecjpqhhdvl`
- **Access Token**: 별도 보관 (1Password / 로컬 `.env.secrets`). git 커밋 X. 분실 시 [Supabase Dashboard](https://supabase.com/dashboard/account/tokens)에서 재발급

### Supabase (하루오픽 — 아카이브, 필요 시만 참조)
- **Project ID**: `rwdsyqnrrpwkureqfxwb`
- **DB Host (Pooler)**: `aws-1-ap-northeast-2.pooler.supabase.com:6543`
- **DB User**: `postgres.rwdsyqnrrpwkureqfxwb` / **PW**: `opictalk2026`

### Vercel
- **팀**: jays-projects-ef86099d
- **프로젝트**: soridam-frontend
- **프로젝트 ID**: `prj_KND5lcBF3OBgGcD4C5DHRjS2lr2d`
- **URL**: https://vercel.com/jays-projects-ef86099d/soridam-frontend
- **도메인**: soridamhub.com
- **자동 배포**: main 브랜치 푸시 시 자동 배포

### DNS (Spaceship)
- **A 레코드**: `@` → `216.198.79.1`
- **CNAME**: `www` → `cname.vercel-dns.com`

### 테스트 계정 (심사/검수용)
- **ID**: `soridamhub@gmail.com`
- **PW**: (관리자 계정)
- **URL**: https://soridamhub.com/login

## 📁 프로젝트 구조

```
soridam/                     # Git 루트 = Next.js 루트 (표준 구조)
├── CLAUDE.md                # 프로젝트 가이드 (이 파일)
├── .gitignore
├── README.md
├── package.json             # Next.js 앱 패키지
├── tsconfig.json
├── next.config.ts
├── middleware.ts             # 인증 세션 관리
├── postcss.config.mjs
├── eslint.config.mjs
├── .env.local               # 환경변수 (git 제외)
├── supabase/
│   ├── migrations/          # DB 마이그레이션
│   │   ├── 001_master_questions.sql
│   │   ├── 002_payment_tables.sql
│   │   ├── 003_submissions.sql
│   │   ├── 004_scripts.sql
│   │   ├── 009_questions.sql
│   │   ├── 011_mock_test.sql
│   │   └── 014_tutoring.sql
│   └── functions/
│       ├── _shared/
│       │   ├── azure-pronunciation.ts     # Azure Speech SDK 발음 평가 (WebSocket)
│       │   ├── skip-detector.ts           # 3단계 스킵 판정 (15초/15자/환청)
│       │   ├── checkbox-definitions.ts    # 체크박스 74개 ID 정의 + FACT 매핑 + 누적 로직
│       │   ├── question-type-map.ts       # question_type 매핑 유틸
│       │   └── rule-engine.ts             # 평가엔진 7-Step + FACT 점수 계산
│       ├── scripts/index.ts               # Edge Function (generate/correct/refine/evaluate)
│       ├── scripts-package/index.ts       # Edge Function (TTS 패키지 + 타임스탬프)
│       ├── mock-test-process/index.ts     # Stage A (Whisper STT + Azure 발음) → eval 체인
│       ├── mock-test-eval/index.ts        # Stage B-1 (GPT-4.1 체크박스 74개 판정) → consult 체인
│       ├── mock-test-consult/index.ts     # Stage B-2 (GPT-4.1 소견/방향/WP 생성) → report 체인
│       ├── mock-test-report/index.ts      # Stage C (평가엔진 + overview/growth GPT) → DB 저장
│       ├── admin-trigger-eval/index.ts    # 관리자용 평가 수동 트리거 (fire-and-forget)
│       └── (tutoring EF — 삭제됨, 새 설계 기반 재생성 예정)
├── app/                     # App Router 페이지
│   ├── providers.tsx        # QueryClientProvider 래퍼
│   ├── (admin)/             # 관리자 라우트 그룹 (사이드바 + 역할 검증)
│   │   ├── layout.tsx       # AdminLayout (getAdminUser 검증 → redirect)
│   │   └── admin/{page,users,payments,content,import,mock-exam,logs}/
├── components/
│   ├── dashboard/
│   │   └── dashboard-stats.tsx  # useQuery 클라이언트 컴포넌트
│   ├── reviews/             # 시험후기 모듈 UI
│   │   ├── reviews-content.tsx
│   │   ├── frequency/frequency-tab.tsx
│   │   ├── submit/{submit-tab,wizard-step1~3,topic-pagination,question-selector}.tsx
│   │   └── list/list-tab.tsx
│   ├── scripts/             # 스크립트 모듈 UI
│   │   ├── scripts-content.tsx
│   │   └── create/
│   │       ├── script-wizard.tsx      # 5단계 생성 위저드 + 패키지 생성
│   │       └── script-renderer.tsx    # 4모드 뷰어 + 인터랙티브 핵심정리
│   ├── mock-exam/           # 모의고사 모듈 UI
│   │   ├── mock-exam-content.tsx      # 3탭 래퍼 (응시/결과/이력)
│   │   ├── start/
│   │   │   ├── mode-selector.tsx      # 모드 선택 (훈련/실전)
│   │   │   ├── device-test.tsx        # 마이크 테스트
│   │   │   ├── exam-pool-selector.tsx # 기출 선택
│   │   │   └── survey-intro.tsx       # 서베이 인트로
│   │   ├── session/
│   │   │   ├── mock-exam-session-wrapper.tsx # 세션 래퍼 + 복원 UX
│   │   │   ├── mock-exam-session.tsx  # 시험 진행 메인
│   │   │   ├── session-timer.tsx      # 타이머 (훈련 경과/실전 카운트다운)
│   │   │   ├── question-grid.tsx      # 15문항 상태 그리드
│   │   │   ├── ava-avatar.tsx         # AVA 아바타
│   │   │   └── training-eval-panel.tsx # 훈련 모드 실시간 평가
│   │   ├── result/                  # 결과 페이지 (4탭)
│   │   │   ├── result-page.tsx      # 4탭 래퍼 (종합진단/세부진단/문항별/성장)
│   │   │   ├── tab-overview.tsx     # 종합 진단 (FACT, 코칭)
│   │   │   ├── tab-diagnosis.tsx    # 세부진단 (체크박스 pass/fail 진단표)
│   │   │   ├── tab-questions.tsx    # 문항별 상세 (아코디언, 음성, WP 태그)
│   │   │   └── tab-growth.tsx       # 성장 리포트 (비교표, 병목, CTA)
│   │   ├── history/
│   │   │   └── grade-progress-chart.tsx # 등급 추이 그래프 (Recharts)
│   │   └── evaluation/
│   │       └── eval-waiting.tsx       # 평가 대기 + 진행률
│   ├── tutoring/            # 튜터링 V2 모듈 UI
│   │   └── (삭제됨 — 새 설계 기반 재생성 예정)
│   ├── admin/               # 관리자 컴포넌트 (8개)
│   │   ├── admin-sidebar.tsx, admin-stat-card.tsx, admin-data-table.tsx
│   │   ├── admin-import-content.tsx, credit-adjust-modal.tsx
│   │   ├── prompt-editor.tsx, eval-pipeline-view.tsx, audit-log-detail.tsx
│   └── shadowing/           # 쉐도잉 훈련 모듈 UI (9개 컴포넌트)
│       ├── shadowing-content.tsx      # 메인 래퍼 + 키보드 단축키
│       ├── shadowing-player.tsx       # 오디오 플레이어 + 문장 하이라이트
│       ├── shadowing-recorder.tsx     # MediaRecorder 녹음
│       ├── shadowing-step-nav.tsx     # 4단계 네비게이션
│       ├── step-listen.tsx            # Step 1: 전체 듣기
│       ├── step-shadow.tsx            # Step 2: 따라읽기 (텍스트 힌트 토글)
│       ├── step-recite.tsx            # Step 3: 혼자 말하기
│       ├── step-speak.tsx             # Step 4: 실전 녹음 + AI 평가
│       ├── evaluation-result.tsx      # 평가 결과 표시
│       └── evaluation-history.tsx     # 평가 이력
├── lib/
│   ├── actions/reviews.ts     # Server Actions (12개)
│   ├── actions/scripts.ts     # Server Actions (16개)
│   ├── actions/mock-exam.ts   # Server Actions (10개: 세션CRUD, 이력)
│   ├── actions/mock-exam-result.ts # Server Actions (6개: 4탭 데이터, 평가/리포트 트리거)
│   ├── (actions/tutoring — 삭제됨, 새 설계 기반 재생성 예정)
│   ├── actions/admin-reviews.ts  # 관리자 기출 입력 (requireAdmin 적용)
│   ├── actions/admin/stats.ts    # 관리자 대시보드 통계 (2함수)
│   ├── actions/admin/users.ts    # 사용자 관리 (3함수)
│   ├── actions/admin/payments.ts # 결제 관리 (1함수)
│   ├── actions/admin/content.ts  # 콘텐츠 관리 (8함수)
│   ├── actions/admin/mock-exam.ts # 모의고사 모니터링 (3함수)
│   ├── actions/admin/logs.ts     # 감사 로그 (1함수)
│   ├── hooks/use-recorder.ts  # 녹음 훅 (볼륨 분석, 무음 감지)
│   ├── hooks/use-question-player.ts  # 질문 오디오 재생 훅
│   ├── hooks/use-eval-polling.ts     # 평가 폴링 훅
│   ├── queries/master-questions.ts
│   ├── react-query.ts        # QueryClient 팩토리 (서버/브라우저 싱글턴)
│   ├── stores/shadowing.ts    # Zustand 쉐도잉 상태 (persist)
│   ├── types/{reviews,scripts,mock-exam,mock-exam-result,tutoring,admin}.ts  # 타입 정의
│   ├── mock-data/mock-exam-result.ts           # 결과 고정 데이터 + 타입 (FulfillmentStatus 등)
│   ├── mock-data/mock-exam-result-questions.ts # 문항별 평가 타입 (QuestionEvalV2Real, WeakPointV2)
│   ├── mock-exam-result/diagnosis-transformer.ts # 체크박스 → 진단표 변환기
│   ├── validations/{reviews,scripts,mock-exam}.ts # Zod 스키마
│   ├── utils/combo-extractor.ts
│   ├── auth.ts               # getUser() + getAuthClaims() + getAdminUser() + requireAdmin()
│   ├── supabase.ts
│   └── supabase-server.ts
└── public/                  # 정적 파일 (로고, 폰트 등)
```

## 🚀 Essential Commands

```bash
# 개발 서버
npm run dev

# 빌드
npm run build

# Git 커밋 & 배포 (main 푸시 = 프로덕션 자동 배포)
git add -A && git commit -m "feat: 기능 설명" && git push origin main
```

## ⚠️ Environment Variables (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://fkkdbnebsaecjpqhhdvl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# Creem (결제 — 현재 사용)
CREEM_API_KEY=creem_...
CREEM_WEBHOOK_SECRET=whsec_...

# OpenAI (GPT-4.1 스크립트 생성, Whisper STT)
OPENAI_API_KEY=sk-proj-...

# Gemini (TTS - 현재 사용)
GEMINI_API_KEY=AIzaSyC...

# ElevenLabs (TTS - 향후 전환 예정)
ELEVENLABS_API_KEY=sk_d67...

# Azure Speech (발음 평가)
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=koreacentral
```

## 🚨 Critical Development Workflow

### ✅ 모듈 이관 완료
- 하루오픽 → 소리담 전체 이관 완료 (시험후기/스크립트/모의고사/튜터링/쉐도잉)
- 신규 기능 구현 시 `docs/설계/{모듈}.md` 참조
- 하루오픽 소스코드(`C:\Users\js777\Desktop\haruopic`)는 필요 시에만 참조

### ⚠️ 기술 제안 시 필수 원칙: 업계 표준 우선
- 기술 방식, 아키텍처, 패턴을 제안할 때는 **현재 기술 스택에서 업계에서 가장 보편적이고 검증된 표준 방식**을 먼저 확인한 후 제안한다
- 편의성이나 단순함보다 **품질과 안정성이 검증된 정석 방식**을 우선한다
- 확신이 없으면 표준 방식을 조사한 후 제안하고, 추측으로 제안하지 않는다

### ⚠️ 문제 해결 시 필수 원칙: 환경 제약사항 먼저 확인
- **코드 수정에 들어가기 전에**, 문제의 원인이 코드가 아닌 **실행 환경 자체의 제약사항**인지 먼저 확인한다
- 예시:
  - 네이버 앱 인앱 브라우저: 웹폰트를 시스템 폰트로 강제 교체 (CSS로 해결 불가)
  - iOS Safari: 특정 Web API 미지원
  - 인앱 WebView: CSP, CORS, 리소스 로딩 제한 등
- **"특정 환경에서만 안 된다"는 보고 → 해당 환경의 알려진 제약사항부터 조사**
- 환경 제약이면 사용자에게 즉시 알리고, 불필요한 코드 수정을 반복하지 않는다

### ⚠️ 데이터 페칭 + 성능 최적화 필수 원칙
> **IMPORTANT**: 새 모듈 구현 시 반드시 `docs/가이드_Next.js+Supabase_페이지전환_성능최적화.md`를 참조한다.
> 인증 3계층, Suspense 경계, 서버 병렬 조회, TanStack Query 캐싱, Prefetch, Supabase 쿼리 최적화, 서버 액션 설계 패턴이 정리되어 있다.

- 클라이언트 컴포넌트에서 데이터를 로드할 때 **`useState + useEffect`를 사용하지 않는다**
- 반드시 **TanStack React Query** (`useQuery`, `useInfiniteQuery`, `useMutation`)를 사용한다
- 인프라는 이미 구축됨: `app/providers.tsx` (QueryClientProvider), `lib/react-query.ts` (QueryClient 팩토리)
- **적용 패턴**:
  - 서버에서 초기 데이터를 가져오는 경우 → `useQuery` + `initialData` (이중 로딩 제거)
  - 고정 데이터 (questions 등) → `staleTime: Infinity` (세션 내 1회 로드)
  - 페이지네이션 → `useInfiniteQuery` (필터별 캐시 + "더 보기" 캐시)
  - 일반 동적 데이터 → `staleTime: 5 * 60 * 1000` (5분 캐시)
  - 데이터 변경 후 갱신 → `queryClient.invalidateQueries()` (관련 캐시 자동 갱신)
- **서버 사전 조회**: 탭이 여러 개인 페이지는 서버에서 모든 탭의 초기 데이터를 `Promise.all`로 병렬 조회 → 각 탭에 `initialData` 전달
- **Prefetch 위치**: `prefetchQuery`는 페이지 최상위 컴포넌트에 배치 (자식에 두면 마운트 시점에 의존하여 실행 안 될 수 있음)
- **서버 쿼리 최적화**: 여러 독립 쿼리는 `Promise.all`로 병렬 실행, 공통 데이터는 1회 조회 후 공유
- **현재 사용 중인 queryKey 목록**:
  - `["user-credits", userId]` — 대시보드 + 스토어 공유 (후기 완료 시 invalidate)
  - `["review-frequency"]` — 빈도 분석 데이터
  - `["my-submissions"]` — 내 후기 이력
  - `["public-reviews", levelFilter]` — 공개 후기 (필터별)
  - `["topics", category]` — 주제 목록 (고정)
  - `["questions", topic, category]` — 질문 목록 (고정)
  - `["submission-detail", submissionId]` — 완료 후기 상세 + 질문 통합 (Infinity, prefetch)
  - `["question-frequency", topic]` — 주제별 질문 빈도 (5분, prefetch)
  - `["topics-all"]` — 전체 주제 목록 (Infinity, 스크립트 위저드)
  - `["questions-by-category", category]` — 카테고리별 질문 (Infinity, 스크립트 위저드)
  - `["script-credit"]` — 스크립트 크레딧 잔량 (1분)
  - `["my-scripts"]` — 내 스크립트 목록 (5분, initialData)
  - `["script-detail", scriptId]` — 스크립트 상세 (30초, 폴링)
  - `["shadowing-history"]` — 쉐도잉 이력 (5분, initialData)
  - `["shadowable-scripts"]` — 쉐도잉 가능 스크립트 목록 (5분)
  - `["opic-tips", targetLevel, answerType]` — 학습 팁 (Infinity, Step 3 대기 화면)
  - `["mock-session", sessionId]` — 모의고사 세션 데이터 (10초)
  - `["mock-active-session"]` — 활성 세션 확인 (5분)
  - `["mock-exam-history"]` — 모의고사 이력 (5분)
  - `["mock-exam-session-detail", sessionId]` — 모의고사 세션 전체 결과 (10분, 결과탭)

1. **코드 수정** - 필요한 변경사항 구현
2. **사용자가 요청한 경우에만**:
   - `npm run build` 실행하여 빌드 테스트
   - `npx tsc --noEmit` 타입 체크
3. **사용자가 커밋/푸시 요청한 경우에만**:
   - Git 커밋 & 푸시

### ⛔ 자동 실행 금지 항목 (사용자 요청 시에만!)
- ❌ `npm run build`
- ❌ `npx tsc --noEmit`
- ❌ `git commit`
- ❌ `git push`

## 📝 Git Commit Convention (한국어)

```
feat: 새로운 기능
fix: 버그 수정
docs: 문서 수정
refactor: 코드 리팩토링
test: 테스트 코드
chore: 빌드/설정 변경
style: 코드 포맷팅
perf: 성능 개선
```

## 📋 Git 설정

```bash
# 이 저장소 전용 설정
git config user.email "soridamhub@gmail.com"
git config user.name "Storm-Boy777"

# 원격 저장소 (인증 포함)
origin: https://Storm-Boy777@github.com/Storm-Boy777/soridam.git
```

## 📅 개발 이력

> **상세 이력**: auto memory `memory/개발이력.md` 참조
> **모듈별 설계**: `docs/설계/*.md` | **진행 상태**: `docs/실행계획.md` | **의사결정**: `docs/의사결정.md`

| 날짜 | Phase | 요약 |
|------|-------|------|
| 02-18 | 초기 세팅 | GitHub + Supabase + Next.js + Vercel + 도메인 DNS |
| 02-19 | Phase 1~2 | 인증(OAuth/프로필) + 공개 페이지 6개 + 소리담 분석 |
| 02-20 | Phase 3 prep | 네비게이션 + 몰입형 레이아웃 + DB Step 0(510행) + 결제(포트원 V2) |
| 02-21 | 브랜딩 | 랜딩 리뉴얼 + 넛지 배너 + 대시보드 실데이터 |
| 02-22 | 디자인 | 로고 8종 + 모바일 개선 + 문서 체계 재구성 + M-4 결정 |
| 02-23 | Step 1 ✅ | **시험후기** 완료 (3테이블 + SA 12개 + UI 8개) + T-9 결정 + 성능 최적화 |
| 02-24 | Step 1 고도화 | 25일 룰 크레딧 + Draft 이어쓰기 + 성능 최적화 12단계 + 가이드 문서 |
| 02-25 | Step 2 ✅ | **스크립트+쉐도잉** (6테이블 + SA 16개 + EF 2개 + 위저드+뷰어) + P-5 리브랜딩 결정 |
| 02-26 | Step 2 고도화 | Two-Pass 간소화(808→380줄) + 인터랙티브 핵심정리 + 쉐도잉 4단계 |
| 02-27 | UX 개선 | 스크립트 탭 카테고리/주제 필터 + CTA 통합 |
| 02-28 | DB 분석 | 이현석 OPIc DB PDF(735p) → 431질문/198세트/28토픽/41RP 구조화 |
| 03-01 | D-1 ✅ | questions 471행 전면 교체 결정 (새 ID 체계, 14컬럼, 10 question_types) |
| 03-02 | 구조 표준화 | frontend/ → 루트 (126+ 파일 이동, Next.js 표준 구조) |
| 03-02 | Step 3 ✅ | **모의고사** Phase A~D (5테이블 + SA 10개 + EF 4개 + 평가엔진 + 결과 UI) |
| 03-03 | Step 3 안정화 | 세션 플로우 버그 수정 (녹음 레이스컨디션, Q1 플로우, 자동재생 제거) + 문서 현행화 |
| 03-08 | 평가+튜터링 설계 | 모의고사 평가 설계 확정 (개별 6-Layer + 종합 5개 개선) + **튜터링 완전 재설계** (GPT-5.2 전문가 4회 자문 → 세션+5프로토콜) |
| 03-08 | **평가 확정** | GPT-5.2/5.4 전문가 2회 자문 기반 — 개별평가 5단계 표시순서 + 10 question_type별 체크리스트 + 3축 무응답 감지 + 피드백 분기(무응답/부분/정상) + 구제 메시지 설계 |
| 03-08 | Step 4 ✅ | **튜터링** 전체 구현 (7테이블 + SA 7개 + 처방엔진 + 3탭 UI + 훈련 세션 Screen 0~6 + EF 8 handler 배포) |
| 03-10 | UX+설계 | 전 모듈 탭 URL 동기화(history.replaceState) + 모의고사 초기 로딩 최적화 + 성장리포트 설계 문서 (GPT-5.4 자문) |
| 03-10 | 성장리포트 A ✅ | **등급 추이 그래프** Recharts (등급 라인+준비도 바+FACT 미니+병목 감지+커스텀 툴팁) |
| 03-10 | 성장리포트 B-D ✅ | **성장 리포트** DB 3컬럼 + EF 성장분석 GPT(gpt-4.1-mini) + UI 7섹션 + 튜터링 CTA + 성장패턴 감지 |
| 03-13 | 관리자 시스템 ✅ | **관리자** Phase 0~2 (app_metadata.role + admin_audit_log + RLS 확장 + 7페이지 + SA 18함수 + 8컴포넌트) |
| 03-15 | 플랜 리뉴얼 ✅ | 베이직→실전, 프리미엄→올인원 리네이밍 + 카테고리 그룹 플랜 카드 (disabled 흐리게+취소선) + 스토어/랜딩/요금제 3곳 레이아웃 통일 |
| 03-15 | 결제 개선 ✅ | 카카오페이 연동 (결제 수단 선택 모달) + 스크립트 횟수권 10회→5회 |
| 03-15 | 마이페이지 개선 ✅ | 플랜 탭 DB 기반 + 학습 탭 제거 + 주간학습목표 제거 |
| 03-15 | UI/UX 개선 | PC 진행과정 화살표 + 제출이력 수직정렬 + 스크립트 크레딧 2회 통일 + 전략가이드 수치 제거 |
| 03-25 | **튜터링 재설계** | 전문가 자문 기반 새 설계서 완성. 기존 V2 코드/DB 전부 삭제. 파이프라인 C→D→QSE→E→L1→F, 3단 등급, Layer1 규칙엔진, CO-STAR 프롬프트 |
| 03-26 | **튜터링 구현** | Phase 1 전체 구현 (7테이블 + SA 12개 + EF 3개 + Layer1 엔진 + QSE + 9컴포넌트 + 2페이지) |
| 03-31 | **리브랜딩 완료 확인** | P-5 전항목 완료 확인 + 레거시 EF 4개 삭제 (tutoring-v2-* 3개 + tutoring) + 문서 갱신 |
| 04-08 | **결제 시스템 전면 리팩토링** | Provider 패턴(Creem/Polar 전환) + DB KRW→USD(센트) 전환 + RPC 7개 재생성 + UI 30개 파일 $ 표시 |
| 04-08 | **Creem 연동 완료** | 상품 3종($10 충전, $15 충전+후원, $5 월간후원) + 웹훅 핸들러 + 서명 검증(Creem 측 이슈 대기) |
| 04-08 | **정기 후원 시스템** | sponsorships 테이블 + 구독 lifecycle 웹훅 전체 처리(active/paid/canceled/scheduled_cancel/expired/paused) + Customer Portal 연동 |
| 04-08 | **마이페이지 리뉴얼** | 크레딧 탭(잔액+충전/사용+이력) + 후원 상태 뱃지(후원 중💛/취소 예정/취소됨) + 관리하기 버튼 |
| 04-08 | **서베이 UI 개선** | 2열 레이아웃(설문|전략) + 칩 색상 개선 + 반응형 최적화 + 기출 본인 제외 버그 수정 |
| 04-08 | **EF 전체 재배포** | api-usage-logger 센트 전환 반영 — 10개 EF 일괄 배포 |
| 04-10 | **관리자 통계 정확도** | Supabase 1000행 제한 → RPC 기반 정확 집계 + AI 비용 api_usage_logs 실데이터 전환 |
| 04-10 | **크레딧 사전 경고** | 모듈별 예상 비용 상수(estimated-costs.ts) + balance >= estimatedCost 기준 사전 차단 |
| 04-10 | **약관/환불/개인정보** | 크레딧 시스템 반영 + 사업자 정보 삭제 + 이메일 템플릿 3종 소리담 디자인 적용 |
| 04-10 | **랜딩 FAQ** | 10개 질문 아코디언 + 대시보드 CTA 크레딧 기반 수정 |
| 04-10 | **회원가입 채널 제어** | Google/Kakao/이메일 개별 토글 + 이메일 도메인 화이트리스트 (실시간 검증) |
| 04-10 | **디자인 시스템 현행화** | CLAUDE.md 컬러 팔레트 실제 값으로 갱신 (테라코타→인디고 블루) |
| 05-01 | **오픽 스터디 설계 ✅** | Phase 6 신규 모듈 설계 완료 (1450줄 6단계+리뷰). 4테이블 + Realtime 동기화 + 일타강사 톤 AI 코칭(점수 비공개) + 콤보 빈도 학습(시험후기 SSOT) + 온라인/오프라인 듀얼 모드 + 완전 무료 정책. 의사결정 18개(O-1~O-18) Part G. 마이그레이션 `047_opic_study.sql` 작성. → 구현 단계 진입 |
| 05-02 | **오픽 스터디 백엔드 ✅** | DB 마이그레이션 047/048(프롬프트)/049(톤 v2)/050(Storage) 적용. SA 28개 (사용자 19 + 관리자 9). EF 2개(`opic-study-guide`/`opic-study-feedback`) 작성. AI 프롬프트 4 row v2 등록 (페르소나: AI 스터디 코치, 톤 절제) |
| 05-02 | **오픽 스터디 디자인 ✅** | Claude Design 협업 — BP 디렉션(Notion+Things 3+크림/테라코타). 별도 디자인 시스템 격리(.bp-scope, hifi.css→opic-study.css). 공통 컴포넌트 20개 + 19개 화면(Step 1~7 + 6-1~6-6 + 진입 + 엣지). 미리보기 페이지(`/opic-study/preview`) |
| 05-02 | **오픽 스터디 라우트 ✅** | 사용자 5개 페이지(홈/마이/이력/lobby/세션) + 관리자 3개 페이지(목록/생성/상세). 세션 룸: Realtime 2채널(sessions+answers) + Step 분기 9가지 + 마이크 녹음(useRecorder)+Storage 업로드+EF fire-and-forget. 카테고리/토픽/콤보 실데이터 통합. 네비바+사이드바 메뉴. EF 배포 완료 |
| 05-02 | **이슈 3건 수정 ✅** | (1) `study_group_members→profiles` join 실패 → 분리 쿼리 패턴 (3 파일), (2) RLS 재귀 정책 → 마이그레이션 051 + `is_study_group_member()` SECURITY DEFINER 함수 (10개 정책 단순화), (3) Home "멤버 4명" mock 하드코딩 → 실제 멤버 데이터 + 첫 글자 initial 매핑. 새 세션 인계 문서 `docs/오픽스터디_세션인계.md` 작성 |
| 05-02 | **PC 풀 레이아웃 ✅** | Claude Design PC 시안 (hf-pc.jsx) 적용. 19개 화면 모바일/PC 분기 wrapper. Home/Step 1~5/6-1/6-2/6-3/6-4/6-6/7 = Claude Design 그대로. Lobby/MyPage/History/6-5/Edge = BP 자체 디자인. PcStepShell + PcStepBar 신규. CSS 미디어 쿼리 풀 추가 |
| 05-02 | **P0+P1 디테일 ✅** | Live\* 5개 PC 실데이터 매핑 (mock 4명 → 실제 멤버 N명). Step 4 콤보 빈도(횟수+%)+뱃지(🔥/⭐)+질문별 등장률+✓학습. History 멤버별 ✓강점 ⚠개선 요약. Step 1~5 PC breadcrumb 실제 그룹명 |
| 05-02 | **V2 8개 항목 ✅** | M1+M2 presence + 끊김 배너 (전역 fixed banner + 우측하단 pill), M3 모드 토글, M4 답변 패스, M5 F/B 재시도(60초 timeout + retryFeedback SA), M6 자동 step 전환(EF가 모두 답변 완료 시 feedback_share), M8 마이크 권한 거부 시 EdgeMic, W4 Step 6-6 토론 타이머 5분 |
| 05-02 | **라우트 그룹 분리 ✅** | `(entry)/` (홈/마이/이력 + Navbar+Footer) vs `(immersive)/` (lobby/session/preview, 자체 헤더). 외곽 layout 단순화 (auth만). 사용자 지적 "홈으로 돌아가기 버튼 없음" 해결 |
| 05-02 | **Dialog/Toast 통일 ✅** | BpConfirmDialog 신규 (BP 디자인 — terracotta/yellow variant). native confirm 3개 → BpConfirmDialog 교체. native alert 4개 → sonner toast 교체. 시스템 OS 다이얼로그 사라짐 |
| 05-02 | **그룹 등급 폐기 ✅** | 마이그레이션 052 (study_groups.target_level 삭제). profiles.target_grade 사용 (멤버별 개인 등급). EF 둘 다 재배포 — feedback은 답변자 본인 등급으로 코칭, guide는 등급 비특정. Admin/User UI 등급 표시 모두 제거. 핵심 결정: "스터디는 함께 하지만 멤버마다 목표 다를 수 있음" |
| 05-02 | **불필요 요소 제거 ✅** | "등급별 그룹 둘러보기" 점선 카드 삭제 (그룹 등급 폐기 + 자가 가입 X 모델과 충돌). HomeProps.onNewGroup prop 제거 |

<!-- 이후 새 이력은 이 테이블에 행 추가 + memory/개발이력.md에 상세 기록 -->

## 🔮 현재 상태 & 다음 단계

> **⚠️ 새 세션 시작 시 필수**: `docs/오픽스터디_세션인계.md` 먼저 읽기. 직전 세션 컨텍스트 풀로 정리됨 (현재 상태/해결한 이슈/미해결/테스트 시나리오/트러블슈팅).

**현재**: Phase 1~5 ✅ + **Phase 6 오픽 스터디 풀 + PC 레이아웃 + V2 + 라우트 분리 + 그룹 등급 폐기 + Dialog/Toast 통일 완료** ✅ (코드 100% 완료, 사용자 검증 진행 중)
**다음 작업**: 사용자 검증 계속 + 발견 이슈 수정 + 미니 시뮬레이션 테스트 (마이크 + 멤버 2명 풀 플로우)

**⚠️ Claude는 프리뷰 검증 X** (사용자가 직접 브라우저로 진행). 코드 작성/수정만.

### 오픽 스터디 모듈 진행 상태
> **설계서**: `docs/설계/오픽스터디.md` | **결정 기록**: `docs/의사결정.md` Part G (O-1~O-18)

| 단계 | 상태 |
|------|------|
| 설계 (1~6단계 + 리뷰 보강) | ✅ |
| 구현 1: DB 마이그레이션 (047/048/049/050/**051 RLS 재귀 수정**) | ✅ |
| 구현 2: 타입 정의 (`lib/types/opic-study.ts`) | ✅ |
| 구현 3: Server Actions (사용자 19 + 관리자 9) | ✅ |
| 구현 4: EF 2개 작성 + 배포 (`guide`/`feedback`) | ✅ |
| 구현 5: 프롬프트 DB 등록 (4 row v2) | ✅ |
| 구현 6: 디자인 시스템 + 19 화면 | ✅ |
| 구현 7: 사용자 5개 라우트 + 관리자 3개 | ✅ |
| 구현 8: Realtime 통합 + 마이크 녹음 + 실데이터 | ✅ |
| 구현 9: 네비바/사이드바 통합 | ✅ |
| 구현 10: 직전 세션 이슈 3건 해결 (profiles join / RLS 재귀 / Home mock) | ✅ |
| 구현 11: PC 풀 레이아웃 (Claude Design 시안 + BP 자체) | ✅ |
| 구현 12: P0+P1 디테일 (Live\* 실데이터, Step 4 빈도, History 멤버 요약) | ✅ |
| 구현 13: V2 8개 (presence/끊김/타이머/패스/모드/F/B 재시도/자동 step) | ✅ |
| 구현 14: 라우트 그룹 분리 (entry+Navbar / immersive) | ✅ |
| 구현 15: Dialog/Toast 통일 (BpConfirmDialog + sonner) | ✅ |
| 구현 16: 그룹 등급 폐기 (마이그레이션 052, profiles.target_grade 사용) | ✅ |
| **구현 17: 사용자 검증 + 미니 시뮬레이션** | 🔄 **진행 중** |

### 오픽 스터디 라우트 카탈로그 (2026-05-02 라우트 그룹 분리)

**Entry — Navbar + Footer 표시** (`(entry)/`)
- `/opic-study` — 홈 (활성 그룹 + 입장)
- `/opic-study/my` — 마이페이지 (학습 이력)
- `/opic-study/history` — 그룹 세션 이력

**Immersive — 자체 헤더만** (`(immersive)/`)
- `/opic-study/lobby/[sessionId]` — 입장 대기실
- `/opic-study/session/[sessionId]` — 세션 룸 (Step 1~7 + 6-1~6-6 분기)
- `/opic-study/preview` — 디자인 시안 미리보기 (개발용)

**관리자**
- `/admin/study-groups` — 그룹 목록
- `/admin/study-groups/new` — 새 그룹 생성 (등급 입력 X)
- `/admin/study-groups/[groupId]` — 그룹 상세 (멤버/세션 관리)

### ⚠️ 반드시 해야 할 일: 크레딧 예상 비용 실측 업데이트
- **파일**: `lib/constants/estimated-costs.ts`
- **현재**: 보수적 추정값 (script: 5¢, mock_exam: 30¢, tutoring: 10¢)
- **시점**: 각 모듈 실사용 테스트 후 `api_usage_logs`에 충분한 데이터가 쌓이면
- **방법**: 아래 쿼리로 모듈별 1회 평균 비용 산출 후 상수 업데이트
```sql
SELECT session_type, round(avg(session_cost)::numeric, 2) AS avg_cost_cents
FROM (
  SELECT session_type, session_id, sum(cost_usd) * 100 AS session_cost
  FROM api_usage_logs
  WHERE session_id IS NOT NULL
  GROUP BY session_type, session_id
) t
GROUP BY session_type;
```

### 모의고사 평가 파이프라인 (현행)
```
submitAnswer (SA) → fire-and-forget
  ↓
Stage A: mock-test-process (Whisper STT + Azure 발음)
  ↓ fire-and-forget
Stage B-1: mock-test-eval (GPT-4.1 체크박스 74개 pass/fail)
  ↓ fire-and-forget
Stage B-2: mock-test-consult (GPT-4.1 소견/방향/WP 생성)
  ↓ 전체 완료 시 fire-and-forget
Stage C: mock-test-report (평가엔진 7-Step + overview/growth GPT)
```
- **DB**: evaluations(체크박스) + consults(소견) + reports(종합) + answers(음성/STT)
- **결과 페이지**: result-v2/ (4탭: 종합진단/세부진단/문항별/성장)
- **SA V1** (`mock-exam.ts`): 세션 CRUD, 이력 조회 (10함수)
- **SA V2** (`mock-exam-v2.ts`): 4탭 데이터, 평가/리포트 트리거 (6함수)

### 튜터링 모듈 (Phase 1 구현 완료)
> **설계서**: `docs/설계/튜터링.md` | **시뮬레이션 근거**: `docs/설계/튜터링-시뮬레이션-데이터.md`

| 항목 | 상태 | 비고 |
|------|------|------|
| 설계서 | ✅ | 전문가 자문 기반. 파이프라인 C→D→QSE→E→L1→F |
| DB 스키마 | ✅ | 028_tutoring.sql — 7테이블 + type_templates(10행) + level_modifiers(6행) |
| 타입 정의 | ✅ | lib/types/tutoring.ts — 20+ 인터페이스 |
| SA | ✅ | lib/actions/tutoring.ts — 12개 함수 |
| QSE | ✅ | lib/tutoring/question-selection-engine.ts |
| Layer 1 | ✅ | lib/tutoring/layer1-engine.ts — 10 type 마커 + 규칙 판정 |
| EF 3개 | ✅ | tutoring-diagnose (Prompt C+D), tutoring-generate-drills (QSE+Prompt E), tutoring-evaluate (Whisper+L1+Prompt F) |
| 페이지 2개 | ✅ | /tutoring (3탭), /tutoring/drill (immersive) |
| 컴포넌트 9개 | ✅ | 진단탭, 훈련탭, 드릴플레이어, 재평가, 이력탭 등 |
| 진입 조건 | ✅ | 모의고사 3회 이상, 최근 최대 5회, 재진입 시 새 3회 |
| 다음 | ⏳ | EF 배포 + 실데이터 테스트 + 프롬프트 조정 |

### 소리담 프로젝트 구축 (하루오픽 코드 기반)

| # | 작업 | 상태 |
|---|------|------|
| 1 | GitHub 저장소 생성 (Storm-Boy777/soridam) | ✅ |
| 2 | 하루오픽 코드 복사 + 디자인 변경 | ✅ |
| 3 | Supabase 소리담 프로젝트 연결 (fkkdbnebsaecjpqhhdvl) | ✅ |
| 4 | Vercel 소리담 프로젝트 생성 | ✅ |
| 5 | 도메인 연결 (soridamhub.com) | ✅ |
| 6 | 결제 시스템 (Creem 연동) | ✅ |
| 7 | CLAUDE.md 소리담 맞춤 갱신 | 🔄 진행 중 |

### 네비게이션 구조 (확정)
```
대시보드 | 시험후기 | 스크립트 | 모의고사 | 튜터링
```

> **오픽 스터디** (`/opic-study`)는 별도 페이지 — 멤버 전용으로 직접 진입. 일반 네비게이션에는 미노출 (또는 멤버에게만 표시).

### 레이아웃 구조 (확정)
- **(dashboard)**: 탐색/허브 페이지 — Navbar + Footer 포함
- **(immersive)**: 활동/몰입 페이지 — ImmersiveHeader만, Navbar/Footer 없음

### 모듈별 내부 탭 구조 (확정)
- **시험후기** (/reviews): 빈도 분석 | 후기 제출 | 시험 후기
- **스크립트** (/scripts): 스크립트 생성 | 내 스크립트 | 쉐도잉 훈련
- **모의고사** (/mock-exam): 응시 | 결과 | 나의 이력
- **튜터링** (/tutoring): 진단 | 훈련 | 나의 튜터링
- **오픽 스터디** (/opic-study): 별도 디자인 시스템(.bp-scope) — 홈 / lobby / session(Step 1~7) / my / history

### DB 현황 (39개 테이블 — 오픽 스터디 4개 추가 ✅)

> **오픽 스터디 신규 4테이블** (마이그레이션 047 적용, 052에서 target_level 삭제):
> - `study_groups` — 모임 자체 (월별, ~~등급별~~ — 등급은 멤버 개인 `profiles.target_grade`로)
> - `study_group_members` — 멤버십 (관리자 등록)
> - `opic_study_sessions` — 한 번의 스터디 룸 (Realtime 동기화)
> - `opic_study_answers` — 멤버별 답변 + AI F/B 결과
>
> **오픽 스터디 Storage 버킷** (050 적용 완료):
> - `opic-study-recordings` — 답변 음성 (private, 그룹 멤버만 접근)
>
> **오픽 스터디 EF** (배포 완료):
> - `opic-study-guide` — 일타강사 가이드 생성 (CO-STAR + GPT-4.1)
> - `opic-study-feedback` — 답변 코칭 (Whisper + Azure + GPT-4.1)

- **questions**: 471행 (D-1 전면 교체 — 13컬럼, 새 ID 체계. 원본: `docs/질문 DB/questions_db.xlsx`)
- **profiles**: 사용자 프로필 (Supabase Auth 연동)
- **submissions**: 후기 마스터 (17컬럼 + credit_granted, RLS: 본인 CRUD + complete 전체 SELECT)
- **submission_questions**: 14개 질문 기록 (FK → submissions, questions)
- **submission_combos**: 통합 콤보 (인증: 전체 SELECT, 비인증: advance만)
- **ai_prompt_templates**: 2행 RCTF System+User Prompt (스크립트 공유)
- **script_specs**: 60행 등급별 규격서 (10 question_types × 6 levels, 4컬럼 분할)
- **scripts**: 스크립트 마스터 (생성+교정 통합, UNIQUE(user_id, question_id))
- **script_packages**: TTS 패키지 WAV+JSON (FK → scripts, CASCADE)
- **shadowing_sessions**: 쉐도잉 세션 (FK → scripts, script_packages)
- **shadowing_evaluations**: 쉐도잉 AI 평가 (5영역 + OPIc 등급)
- **opic_tips**: 학습 팁 (등급별, 답변 유형별)
- **mock_test_sessions**: 모의고사 세션 (mode, status, 14 question_ids, started_at, 72h/90min)
- **mock_test_answers**: 답변 기록 (question_number, audio_url, transcript, pronunciation_assessment)
- **mock_test_evaluations**: 체크박스 평가 (checkboxes JSONB, checkbox_type, pass_rate)
- **mock_test_consults**: 소견 평가 (fulfillment, observation, directions, weak_points, task_checklist)
- **mock_test_reports**: 종합 리포트 (aggregated_checkboxes, overview, growth, final_level, rule_engine_result)
- **evaluation_prompts**: 평가 프롬프트 템플릿 (CO-STAR, 모의고사+튜터링 공유)
- **evaluation_criteria**: 60행 평가 기준표 (6등급 × 10유형, consult EF용)
- **task_fulfillment_checklists**: 과제 충족 체크리스트 (question_type별)
- **system_settings**: 사이트 설정 (key-value, 점검 모드/결제 Provider/공지 등)
- **tutoring_sessions**: 세션 마스터 + Prompt C/D 결과 (stable_level, bottlenecks, prescription)
- **tutoring_focuses**: focus별 처방 (세션당 1~3개, 졸업 추적)
- **tutoring_drills**: 드릴 문항 (focus당 Q1/Q2/Q3)
- **tutoring_attempts**: 드릴 시도 기록 (transcript, Layer1/2 결과)
- **tutoring_retests**: 미니 재평가 (graduated/improving/hold)
- **type_templates**: 10개 answer_type별 구조 + Layer1 마커 (참조)
- **level_modifiers**: 6개 등급별 수행 요구 (참조)
- **polar_balances**: 크레딧 잔액 (balance_cents, total_charged, total_used, creem_customer_id)
- **polar_transactions**: 크레딧 거래 이력 (charge/usage/refund/admin_adjust)
- **polar_orders**: 결제 주문 기록 (polar_checkout_id UNIQUE, 중복 방지)
- **sponsorships**: 정기 후원 상태 (creem_subscription_id, status, started_at, cancelled_at, current_period_end)
- **admin_audit_log**: 관리자 감사 로그 (action, target_type, target_id, details JSONB, RLS: admin SELECT만)
- **Storage**: audio-recordings + script-packages + mock-test-recordings + tutoring-recordings 버킷

### 결제 시스템 현황 (USD 크레딧 기반)

**Provider 패턴**: `PAYMENT_PROVIDER` 환경변수로 Creem ↔ Polar 전환
- **현재**: Creem (프로덕션 사용 중)
- **대기**: Polar (승인 대기 중 — 승인 시 전환 가능)

**상품 3종 (USD)**:
| 상품 | 결제 | 충전 | Creem 상품 ID |
|------|------|------|--------------|
| Soridam AI Usage | $10 | $10 (1000¢) | `prod_6LdgDmmfhBFbE5HpJQi5Ll` |
| Soridam AI Usage + Support | $15 | $10 (1000¢) + 후원 $5 | `prod_7fn2850tZh2jX06vMud5Zz` |
| Soridam Support | $5/월 | 없음 (순수 후원) | `prod_2wkBwgDh8hJDSmVU5IQFrI` |

**결제 플로우**:
```
스토어 → createCheckout() → Creem 결제 페이지 → 웹훅(checkout.completed)
  → process_polar_payment RPC → polar_balances 충전 + polar_orders 기록
```

**환불 플로우**:
```
Creem 대시보드 환불 → 웹훅(refund.created)
  → polar_reverse_charge RPC → balance 차감 + total_charged 차감
```

**정기 후원 플로우**:
```
구독 시작 → subscription.active → sponsorships INSERT
매월 갱신 → subscription.paid → period_end 갱신
즉시 취소 → subscription.canceled → status=cancelled (즉시 해지)
예약 취소 → subscription.scheduled_cancel → status=scheduled_cancel (period_end까지 유지)
```

**웹훅**: `app/api/creem/webhook/route.ts` (서명 검증 — Creem 기술팀 이슈 대기)
**Customer Portal**: `lib/actions/billing.ts` → Creem 고객 포털 URL 생성

### ⚠️ 크레딧 시스템 (USD 센트 기반)

**DB 구조 (`polar_balances` 테이블):**
| 컬럼 | 용도 |
|------|------|
| `balance_cents` | 현재 잔액 (센트 단위, $10 = 1000) |
| `total_charged` | 누적 충전 |
| `total_used` | 누적 사용 |
| `creem_customer_id` | Creem 고객 ID (Customer Portal 용) |

**RPC 함수:**
- `polar_get_balance` — 잔액 조회
- `polar_charge_balance` — 충전 (결제 시)
- `polar_deduct_balance` — 사용 차감 (API 호출 시)
- `polar_reverse_charge` — 환불 (total_charged 차감)
- `polar_refund_balance` — 사용 환불 (total_used 차감)
- `polar_admin_adjust_balance` — 관리자 수동 조정
- `process_polar_payment` — 원자적 결제 처리 (주문 기록 + 충전)

**비용 차감 (api-usage-logger)**:
- API 호출 후 실비용 USD → 센트 변환 → `polar_deduct_balance` RPC
- 환율 변환 불필요 (USD → USD)

**사전 잔액 체크**: 모의고사/스크립트/튜터링 시작 전 `polar_get_balance > 0` 확인

### DB 접속 방식

**1순위: Supabase MCP** (자연어 요청 → 자동 SQL 실행)
- 일상적 DB 조회, 스키마 확인, 마이그레이션, 타입 생성 등 모든 DB 작업에 MCP 우선 사용

**2순위 (폴백): psql 직접 실행** — MCP 연결 실패 또는 대량 데이터 작업 시

소리담 DB:
```bash
PGPASSWORD='soridam2026' PGCLIENTENCODING='UTF8' "/c/Program Files/PostgreSQL/16/bin/psql" \
  -h aws-0-ap-northeast-2.pooler.supabase.com \
  -p 6543 \
  -U postgres.fkkdbnebsaecjpqhhdvl \
  -d postgres \
  --set=sslmode=require \
  -c "SQL문"
```

하루오픽 DB (아카이브, 필요 시만):
```bash
PGPASSWORD='opictalk2026' PGCLIENTENCODING='UTF8' "/c/Program Files/PostgreSQL/16/bin/psql" -h aws-1-ap-northeast-2.pooler.supabase.com -p 6543 -U postgres.rwdsyqnrrpwkureqfxwb -d postgres --set=sslmode=require -c "SQL문"
```

> 상세 진행 상황은 `docs/실행계획.md`의 "현재 진행 상태" 참조
> 의사결정 기록은 `docs/의사결정.md` 참조

---
*최종 업데이트: 2026-05-02*
*상태: Phase 1~5 ✅ + **Phase 6 오픽 스터디 풀 통합 완료** ✅ (백엔드+디자인+라우트+EF 배포) → 미니 시뮬레이션 테스트*
