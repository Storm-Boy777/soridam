# CLAUDE.md - OPIcTalkDoc 프로젝트

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

## 🎯 Project Overview

**OPIcTalkDoc** - AI 기반 OPIc 영어 말하기 학습 플랫폼
- 도메인: https://opictalkdoc.com
- 소리담(soridam) 베타의 최종 버전 기능을 이관하여 구축하는 프로젝트
- 소리담 소스코드: `C:\Users\js777\Desktop\soridam`

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
├── 설계/               ← 기능별 상세 설계 (DB, API, 데이터 플로우)
│   ├── 공통기반.md      ← DB 원칙, 백엔드 아키텍처, CORS
│   ├── 시험후기.md      ← submissions 3테이블, 콤보 생성
│   ├── 모의고사.md      ← 5테이블, V7 규칙엔진, Realtime
│   ├── 스크립트.md      ← scripts 통합 테이블, RCTF 프롬프트
│   ├── 튜터링.md        ← 6테이블, 4레벨 재설계
│   └── 쉐도잉.md        ← 2테이블, 클라이언트 완결
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

### 핵심 개념

- **master_questions (510개)**: 시스템 전체의 SSOT. 모든 모듈이 이 테이블에서 시작됨
- **answer_type (10가지)**: 평가 체크박스, AI 튜터 진단, 스크립트 전략이 모두 이 값으로 분기
- **백엔드 아키텍처 (T-8)**: Server Components + Server Actions. Edge Functions 사용 안 함
- **이관 순서**: 시험후기 → 스크립트 → 모의고사 → 튜터링 → 쉐도잉

## 🎨 디자인 시스템 (현재 적용 중)

> 정의 파일: `frontend/app/globals.css` (@theme 블록)

### 컬러 팔레트

| 역할 | 토큰 | 값 | 용도 |
|------|------|-----|------|
| **Primary** | `primary-500` | `#D4835E` (테라코타) | 메인 CTA, 강조, 브랜드 컬러 |
| **Primary Light** | `primary-50` | `#FDF5F0` | 하이라이트 배경, 뱃지 |
| **Primary Dark** | `primary-700` | `#A5603F` | 호버, 진한 강조 |
| **Secondary** | `secondary-500` | `#B8945A` (웜 앰버) | 보조 강조 |
| **Accent** | `accent-500` | `#BF5B43` (웜 로즈) | 경고성 강조 |
| **Background** | `background` | `#FAF6F1` (크림) | 페이지 기본 배경 |
| **Surface** | `surface` | `#FFFCF8` | 카드, 모달 배경 |
| **Surface Secondary** | `surface-secondary` | `#F3ECE4` | 섹션 배경, 호버 |
| **Foreground** | `foreground` | `#3A2E25` (다크 브라운) | 제목, 본문 텍스트 |
| **Foreground Secondary** | `foreground-secondary` | `#8B7E72` | 보조 텍스트, 설명 |
| **Foreground Muted** | `foreground-muted` | `#B5A99D` | 비활성, 힌트 |
| **Border** | `border` | `#EAE0D5` | 카드/섹션 테두리 |

### 폰트

| 역할 | CSS 변수 | 폰트 | 용도 |
|------|----------|------|------|
| **본문** | `--font-sans` | Pretendard Variable (CDN) | 모든 본문 텍스트 |
| **디스플레이** | `--font-display` (= `--font-jua`) | Jua (로컬 TTF) | 로고, 브랜드 텍스트 |
| **세리프** | `--font-serif` | Fraunces + Noto Serif KR | 숫자 강조, 인용 |

### 로고

| 파일 | 용도 | 비고 |
|------|------|------|
| `logo-bandaid-terracotta.png` | **Navbar (현재 적용)** | 반창고 아이콘 + "오픽톡닥" 테라코타 |
| `logo-heart-terracotta.png` | 대체 로고 | 하트십자 아이콘 + 테라코타 |
| `logo-text-terracotta.png` | 텍스트 전용 | "오픽톡닥" 테라코타 |
| `logo-text-dark.png` | 텍스트 전용 (다크) | "오픽톡닥" 다크 브라운 |
| `logo-white.png` | 다크 배경용 | 흰색 버전 |
| `logo-large-4x.png` | 고해상도 | 4x 스케일 |

- **로고 생성 방식**: Canvas API + Jua 폰트 로컬 렌더링 (AI 생성 X)
- **로고 생성기**: `temp/generate-logo.html`

### 디자인 톤 & 키워드
- **톤**: 웜톤, 크림, 테라코타 — "따뜻한 진료실" 느낌
- **슬로건**: "말하다, 나답게."
- **브랜딩 컨셉**: "나는 내 삶의 주인공이다" — 평범한 일상이 완벽한 OPIc 대본
- **아이콘**: Lucide React 통일

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

## 🔑 인프라 정보

### GitHub
- **계정**: opictalkdoc
- **저장소**: `opictalkdoc/opictalkdoc-app`
- **URL**: https://github.com/opictalkdoc/opictalkdoc-app

### Supabase
- **Project ID**: `rwdsyqnrrpwkureqfxwb`
- **Project URL**: `https://rwdsyqnrrpwkureqfxwb.supabase.co`
- **Region**: Northeast Asia (Seoul)
- **DB Password**: `opictalk2026`
- **DB Host (Pooler)**: `aws-1-ap-northeast-2.pooler.supabase.com`
- **DB Port**: `6543` (Transaction) / `5432` (Session)
- **DB User**: `postgres.rwdsyqnrrpwkureqfxwb`

### Vercel
- **팀**: OPIcTalkDoc (Pro)
- **프로젝트**: opictalkdoc-app
- **도메인**: opictalkdoc.com, www.opictalkdoc.com
- **자동 배포**: main 브랜치 푸시 시 자동 배포

### DNS (Spaceship)
- **A 레코드**: `@` → `216.198.79.1`
- **CNAME**: `www` → `cname.vercel-dns.com`

### 테스트 계정 (심사/검수용)
- **ID**: `test@opictalkdoc.com`
- **PW**: `Test1234@@`
- **URL**: https://opictalkdoc.com/login
- **용도**: 카카오페이, PG사, 통신판매업 심사 등 외부 검수용

## 📁 프로젝트 구조

```
opictalkdoc/
├── CLAUDE.md              # 프로젝트 가이드 (이 파일)
├── .gitignore
├── README.md
├── supabase/
│   └── migrations/        # DB 마이그레이션
│       ├── 001_master_questions.sql
│       ├── 002_payment_tables.sql
│       └── 003_submissions.sql
└── frontend/              # Next.js 앱
    ├── app/               # App Router 페이지
    │   └── providers.tsx  # QueryClientProvider 래퍼
    ├── components/
    │   ├── dashboard/
    │   │   └── dashboard-stats.tsx  # useQuery 클라이언트 컴포넌트
    │   └── reviews/       # 시험후기 모듈 UI
    │       ├── reviews-content.tsx
    │       ├── frequency/frequency-tab.tsx
    │       ├── submit/{submit-tab,wizard-step1~3,topic-pagination,question-selector}.tsx
    │       └── list/list-tab.tsx
    ├── lib/
    │   ├── actions/reviews.ts     # Server Actions (12개)
    │   ├── queries/master-questions.ts
    │   ├── react-query.ts        # QueryClient 팩토리 (서버/브라우저 싱글턴)
    │   ├── types/reviews.ts       # 타입 정의
    │   ├── validations/reviews.ts # Zod 스키마
    │   ├── utils/combo-extractor.ts
    │   ├── auth.ts               # getUser() + getAuthClaims()
    │   ├── supabase.ts
    │   └── supabase-server.ts
    ├── middleware.ts       # 인증 세션 관리
    ├── .env.local         # 환경변수 (git 제외)
    ├── package.json
    └── tsconfig.json
```

## 🚀 Essential Commands

```bash
# 개발 서버
cd frontend && npm run dev

# 빌드
cd frontend && npm run build

# Git 커밋 & 배포 (main 푸시 = 프로덕션 자동 배포)
git add -A && git commit -m "feat: 기능 설명" && git push origin main
```

## ⚠️ Environment Variables (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://rwdsyqnrrpwkureqfxwb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# PortOne (결제)
NEXT_PUBLIC_PORTONE_STORE_ID=store-73f548e3-...
NEXT_PUBLIC_PORTONE_CHANNEL_KEY=channel-key-06303dde-...
PORTONE_API_SECRET=XFGThRDJX2...
```

## 🚨 Critical Development Workflow

### ⚠️ 모듈 이관 시 필수 원칙: 소리담 먼저 파악
- **코드 구현에 들어가기 전에**, 반드시 소리담(`C:\Users\js777\Desktop\soridam`)의 해당 모듈 소스코드를 먼저 파악한다
- 파악한 내용을 `docs/설계/{모듈}.md`에 **소리담 원본 구현** 섹션으로 정리한다
- **설계 문서 하나만 보면 구현할 수 있는 상태**가 된 후에야 구현을 시작한다
- 절차:
  1. 소리담 소스코드 파악 (Edge Functions, 컴포넌트, DB, 타입, 로직)
  2. `설계/{모듈}.md`에 소리담 원본 구현 정보 추가
  3. 소리담 → 오픽톡닥 변경 사항 매핑 확인
  4. 설계 문서 완성 확인 후 구현 시작

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

### ⚠️ 데이터 페칭 필수 원칙: TanStack Query 우선
- 클라이언트 컴포넌트에서 데이터를 로드할 때 **`useState + useEffect`를 사용하지 않는다**
- 반드시 **TanStack React Query** (`useQuery`, `useInfiniteQuery`, `useMutation`)를 사용한다
- 인프라는 이미 구축됨: `app/providers.tsx` (QueryClientProvider), `lib/react-query.ts` (QueryClient 팩토리)
- **적용 패턴**:
  - 서버에서 초기 데이터를 가져오는 경우 → `useQuery` + `initialData` (이중 로딩 제거)
  - 고정 데이터 (master_questions 등) → `staleTime: Infinity` (세션 내 1회 로드)
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
git config user.email "opictalkdoc@gmail.com"
git config user.name "opictalkdoc"

# 원격 저장소 (인증 포함)
origin: https://opictalkdoc@github.com/opictalkdoc/opictalkdoc-app.git
```

## 📅 개발 이력

### 2026-02-18 - 프로젝트 초기 세팅
- GitHub 저장소 생성 (`opictalkdoc/opictalkdoc-app`)
- Supabase 프로젝트 생성 (Seoul 리전)
- Next.js + TypeScript + Tailwind CSS 프로젝트 초기화
- 핵심 패키지 설치 (Supabase, Zustand, React Query, Hook Form, Zod)
- Supabase 클라이언트 설정 (브라우저/서버)
- 인증 미들웨어 추가
- Vercel 배포 연결 + 환경변수 설정
- opictalkdoc.com 도메인 DNS 연결 완료

### 2026-02-19 - Phase 1~2 완료 + 소리담 분석
- Phase 1 (인증): 로그인/회원가입/OAuth/프로필 완료
- Phase 2 (공개 페이지): 랜딩/요금제/이용약관/개인정보/환불규정/사업자정보 완료
- 소리담 코드 레벨 상세 분석 완료 (master_questions 핵심 코어 파악)
- 프로젝트 문서 체계 정리 (개발계획서, 기능분석, 분석결과)

### 2026-02-20 - 네비게이션 재구성 + 시험후기 + 몰입형 레이아웃 + DB Step 0 + 결제 구현
- 네비게이션 메뉴 전면 재구성: 대시보드 | 시험후기 | 스크립트 | 모의고사 | 튜터링
- 시험후기 페이지 UI 셸 구현 (/reviews, 3탭: 빈도 분석 / 후기 제출 / 시험 후기)
- 모바일 반응형 수정 (마이페이지, 풋터, 랜딩, 전략 가이드, 요금제)
- 마이페이지 저장 버튼 세로 깨짐 수정 (shrink-0)
- 모듈별 탭 구조 확정 (시험후기/스크립트/모의고사/튜터링 각각 내부 탭)
- **몰입형 레이아웃 시스템 구축**: (immersive) 레이아웃 + ImmersiveHeader 컴포넌트
- **허브 페이지 3개**: 스크립트(/scripts), 모의고사(/mock-exam), 튜터링(/tutoring) 탭 UI
- **몰입형 페이지 4개**: 모의고사 세션, 스크립트 생성, 쉐도잉, 튜터링 훈련 (UI 셸)
- **DB Step 0 완료**: master_questions + custom_mode_questions 테이블 생성 (ENUM, RLS, 트리거, RPC)
- **시드 데이터 510개 삽입**: 소리담 프로덕션에서 추출 → 오픽톡닥 DB 로드 완료
- **Storage 버킷 생성**: audio-recordings (공개 읽기, 인증 업로드)
- **결제 플로우 구현** (카카오페이 심사 대응):
  - @portone/browser-sdk 설치 (포트원 V2)
  - orders + user_credits DB 테이블 생성 (마이그레이션 002)
  - /api/payment/verify 결제 검증 API (금액 위변조 방지)
  - Store 페이지: 서버/클라이언트 분리 + 구매 버튼 활성화 + 크레딧 표시
  - Pricing 페이지: "준비 중" 제거 + 스토어 링크 연결
  - 포트원 + KG이니시스 결제창 정상 동작 확인 (프로덕션)
- **PG사 심사 대응**: 카카오페이 보완 회신, 네이버페이 재심사 요청, 토스페이 입점 정보 회신

### 2026-02-21 - 브랜딩 리뉴얼 + 넛지 배너 + 대시보드 실데이터
- **랜딩 페이지 전면 리뉴얼**: "나는 내 삶의 주인공이다" 브랜딩 컨셉 적용
  - Hero: 메인 선언문 ("화려한 필터는 끄세요. 당신의 진짜 이야기가 시작됩니다.")
  - 서비스 소개 01~05: 무대 메타포 (대본, 조명, 명대사, 리허설, 디렉팅)
  - 운영자의 편지 섹션 신규 추가
  - 슬로건 변경: "말하다, 나답게."
  - FAQ 내용 갱신
- **넛지 배너 + 등급 설정 모달**: 등급 미설정 사용자에게 설정 유도
  - GradeNudgeBanner: 대시보드 레이아웃 Navbar 아래 배치, 세션 내 닫기 가능
  - GradeSettingModal: 현재 등급(선택) + 목표 등급(필수) 인라인 모달
  - current_grade 필드 추가: server action → 마이페이지 → 대시보드 전체 연동
- **대시보드 실데이터 연결**: 정적 → 서버 컴포넌트 전환
  - user_credits 조회 (현재 플랜, 모의고사/스크립트 크레딧)
  - user_metadata 조회 (목표 등급, 현재 등급, 시험일, D-day)
  - 사이드 패널: 등급 설정됨 → 목표 요약 카드 / 미설정 → 마이페이지 유도
- **논의사항 문서 작성**: 4개 논의 항목 결정 및 구현 상태 문서화

### 2026-02-22 - 로고 적용 + 모바일 UI 개선 + 디자인 문서 정비
- **로고 이미지 시스템 구축**: Canvas API + Jua 폰트 기반 로고 생성기 (`temp/generate-logo.html`)
  - 8종 로고 에셋 생성 (반창고/하트십자/말풍선/텍스트/화이트/4x)
  - Navbar 텍스트 로고 → 반창고 로고 이미지(`logo-bandaid-terracotta.png`) 교체
- **전략 가이드 서버/클라이언트 분리**: page.tsx → StrategyContent.tsx (Framer Motion 애니메이션)
- **랜딩 페이지 모바일 개선**:
  - Hero 선언문 카드 너비 310px 조정
  - 일러스트 갤러리 카드 36vw로 축소 (3번째 카드 스와이프 힌트)
  - "서베이가 중요하다더라 → 얼마나?" 화살표 그리드 정렬
  - Pill 뱃지 모바일 축소 (0.7rem) — 랜딩 + 전략 가이드 공통 적용
- **디자인 문서 정비**: CLAUDE.md 디자인 시스템 섹션 추가, 로고 에셋 가이드 현행화
- **프로젝트 문서 전면 재구성**:
  - `docs/` 폴더 구조 신규 구축 (설계/, 참조/ 하위 폴더)
  - `docs/의사결정.md` 생성 (논의사항 + 아키텍처리뷰 통합, P/T/M 번호 체계)
  - 기능별 설계 문서 6개 분리 생성 (공통기반, 시험후기, 모의고사, 스크립트, 튜터링, 쉐도잉)
  - 기존 문서 7개 이동 + 이름 정리 (오픽톡닥_ 접두사 제거)
  - 구 문서 3개 삭제 (논의사항, 아키텍처리뷰, plan.md)
  - CLAUDE.md 문서 체계 섹션 갱신
- **M-4 의사결정 확정 + 시험후기 설문 설계**:
  - M-4 결정: 완료된 후기(complete) = **전체 공개** (기출 문제 + 설문 + 자유 후기)
  - 설문 9개 항목 설계 (통계 활용 목적):
    - 시험 배경 4개: 시험 목적, 공부 방법(복수선택), 준비 기간, 응시 횟수
    - 체감 후기 3개: 체감 난이도, 시간 여유, 실제 소요 시간
    - 자유 후기 2개: 한줄 후기(100자 필수), 팁/조언(300자 선택)
  - `docs/설계/시험후기.md` 전면 재작성 (submissions 스키마 + 위저드 3단계 + 통계 쿼리)
  - 소리담 대비 변경: 서베이 8필드 삭제, exam_difficulty 삭제, 설문 7컬럼 신규 추가
- **CLAUDE.md 이관 규칙 추가**: "모듈 이관 시 소리담 먼저 파악" 필수 원칙
- **시험후기 설계 문서 보강**: 소리담 원본 구현 섹션 추가 (Part A/B/C 3파트 구조)
  - Part A: 소리담 DB 4테이블, Edge Functions 16개, 콤보 추출 로직, 위저드 UI, 타입, 데이터 플로우
  - Part B: 소리담→오픽톡닥 변경 사항 매핑 (12항목)
  - Part C: 오픽톡닥 구현 설계 (기존)

### 2026-02-23 - Phase 3 Step 1: 시험후기 모듈 완료 + T-9 결정
- **DB 마이그레이션 생성 + 실행** (`003_submissions.sql`):
  - `custom_mode_questions` DROP + `find_similar_questions_by_frequency` DROP (M-1)
  - `submissions` 테이블 (16컬럼: 시험정보 + 설문 7개 + 후기 + 상태관리)
  - `submission_questions` 테이블 (14개 질문 기록, FK → submissions + master_questions)
  - `submission_combos` 테이블 (통합 콤보, combo_type 영어 5종)
  - RLS 정책: 본인 CRUD + complete 전체 SELECT (M-4)
  - `increment_script_credits` RPC 함수 (크레딧 보상용)
  - psql로 Supabase에 직접 실행 완료 (3테이블 확인됨)
- **TypeScript 타입** (`lib/types/reviews.ts`): DB 매핑 타입 + ENUM 리터럴 + 한글 레이블 매핑
- **Zod 스키마** (`lib/validations/reviews.ts`): Step 1/2/3 검증 스키마 (한국어 에러 메시지)
- **콤보 추출기** (`lib/utils/combo-extractor.ts`): 소리담 이식, General 3분할, 제외 주제 적용
- **Server Actions** (`lib/actions/reviews.ts`): 12개 액션 (createDraft, saveQuestions, completeSubmission, delete, updateGrade, getMySubmissions, getSubmissionDetail, getFrequency, getPublicReviews, getStats)
- **쿼리 유틸** (`lib/queries/master-questions.ts`): 주제 목록 + 질문 목록 조회
- **UI 컴포넌트** (8개 신규):
  - TopicPagination: 주제 그리드 (이모지 + 페이지네이션 + 기억안남/직접입력)
  - QuestionSelector: 질문 선택 (answer_type 뱃지 + 커스텀 입력 + 기억안남)
  - WizardStep1: React Hook Form (시험일 + 등급 + 설문 9개, Pill 선택 UI)
  - WizardStep2: 5단계 콤보 진행 (TopicPagination → QuestionSelector)
  - WizardStep3: 한줄 후기 + 팁/조언 + 크레딧 보상 안내
  - SubmitTab: 위저드 래퍼 + 내 제출 이력
  - FrequencyTab: 서브탭(일반/롤플레이/어드밴스) + 통계 카드 + 빈도 바
  - ListTab: 등급 필터 + 후기 카드 + "더 보기" 페이지네이션
- **기존 파일 수정**: reviews-content.tsx (props 추가), page.tsx (서버 컴포넌트 전환)
- **빈도 분석 미인증 분기 제거**: /reviews는 (dashboard) 레이아웃이므로 로그인 필수 → isAuthenticated 불필요
- **빌드 테스트 통과** + **커밋/푸시** (355954f)
- **T-9 의사결정 확정**: 하이브리드 백엔드 — Server Actions(CRUD) + Edge Functions(AI API)
  - 시험후기: Server Actions only (AI 호출 없음)
  - 스크립트/모의고사/튜터링: CRUD=SA, AI=EF (GPT/Whisper/Gemini TTS/Azure)
  - 비용 영향 없음 (Vercel Hobby $0 + Supabase Pro $25)
- **페이지 전환 성능 최적화** (3단계):
  - **Granular Suspense + Streaming**: 레이아웃/페이지의 데이터 의존 섹션만 Suspense로 감싸서 셸 즉시 렌더 (fa60983)
  - **getClaims() 로컬 JWT 검증 도입**: 표시용 컴포넌트에서 getUser()(34-43ms 서버 왕복) → getAuthClaims()(JWKS 캐시 후 0ms) 교체 (3210ba0)
    - `lib/auth.ts`에 `getAuthClaims()` 추가 (Asymmetric JWT ES256, WebCrypto 로컬 서명 검증)
    - 대시보드 레이아웃(배너), 대시보드 페이지(통계 카드, 사이드 패널)에 적용
    - 마이페이지는 최신 데이터 필요 → `getUser()` 유지
  - **사용 구분 원칙**: `getUser()` = 프로필 편집, Server Actions (최신 데이터 필수) / `getAuthClaims()` = 표시용 UI (통계, 배너, 등급 표시)
- **TanStack Query Hydration 적용** — user_credits 클라이언트 캐싱 (8484327):
  - QueryClient 팩토리 + Providers 래퍼 구축 (`lib/react-query.ts`, `app/providers.tsx`)
  - Root Layout에 `<Providers>` (QueryClientProvider) 래핑
  - DashboardStats를 `useQuery` 클라이언트 컴포넌트로 분리 (`components/dashboard/dashboard-stats.tsx`)
  - SidePanel을 props 기반으로 변경 (async 제거, `getAuthClaims()` 중복 호출 제거)
  - Store를 `useQuery` 전환 + 결제 후 `invalidateQueries`로 캐시 자동 갱신
  - **효과**: 재방문 시 0ms 즉시 렌더 (staleTime: 5분), Store 결제 → Dashboard 크레딧 즉시 반영
  - queryKey `["user-credits", userId]`를 Dashboard와 Store가 공유
- **/reviews TanStack Query 전면 적용** — 시험후기 페이지 성능 최적화 (40e86b4):
  - `getStats()` → `getStatsAndFrequency()` 통합 (Promise.all 병렬, 서버 쿼리 60-110ms → 20-40ms)
  - FrequencyTab: `useQuery` + `initialData` (서버 데이터 즉시 렌더, submission_combos 이중 조회 제거)
  - SubmitTab: `useQuery` + `invalidateQueries` (제출/삭제 시 my-submissions + review-frequency 캐시 자동 갱신)
  - ListTab: `useInfiniteQuery` (등급 필터별 캐시 + "더 보기" 페이지네이션 캐시)
  - TopicPagination/QuestionSelector: `useQuery` + `staleTime: Infinity` (510행 고정 데이터 세션 내 1회 로드)
  - **효과**: 탭 전환 시 캐시 히트 0ms, 위저드 주제/질문 재선택 시 로딩 없음
  - CLAUDE.md에 "TanStack Query 필수 원칙" + queryKey 목록 추가 (향후 모듈 구현 시 필수 적용)

### 2026-02-24 - 시험후기 위저드 고도화 + 크레딧 25일 룰 + 성능 최적화 11단계
- **크레딧 보상 규칙 변경**: 월 2건 제한 → **25일 룰**
  - 최초 2회: 무조건 스크립트 크레딧 2개 지급
  - 3회차부터: 마지막 지급일로부터 25일 경과 시에만 지급 (OPIc 응시 주기 반영)
  - `submissions` 테이블에 `credit_granted` boolean 컬럼 추가
  - `completeSubmission` 반환값에 `creditGranted`/`nextCreditDate` 포함
  - 완료 메시지 3분기: 지급됨 / 미지급+다음 날짜 안내 / 폴백
- **완료된 후기 삭제 불가**: 크레딧 악용 방지 + 빈도 분석 데이터 보존
  - `deleteSubmission` 서버 측 `status === "complete"` 차단 + `.eq("status", "draft")` 이중 방어
  - UI에서 완료 카드 삭제 버튼 제거, draft만 삭제 가능
- **Draft 이어쓰기**: `step_completed` 기반 진입 Step 결정 + `getDraftQuestions`로 comboResults 복원
- **완료 후기 상세 보기**: `SubmissionDetail` 아코디언 컴포넌트 (시험 정보 + 콤보별 질문 + 후기)
- **콤보 간 주제 중복 제거**: 같은 카테고리 이전 콤보에서 선택한 주제를 `excludedTopics`로 필터링
- **위저드 버그 수정**: 콤보 전환 시 페이지네이션 리셋, 중복 제출 방지 강화
- **기억안남/직접입력 UX**: 마지막 페이지로 이동, 주제 카드와 동일 스타일 적용, `itemsPerPage` 9개
- **시험후기 성능 최적화** (8~11차, 누적 11단계):
  - 8차: 주제별 질문 빈도 + 제출이력 상세 `prefetchQuery` 백그라운드 사전 로딩
  - 9차: 제출 상세 2 RTT → 1 RTT 통합 (`getSubmissionWithQuestions` nested select) + `submission_questions.topic` 인덱스
  - 10차: 3탭 서버 사전 조회 — `page.tsx`에서 `Promise.all`로 3개 데이터 병렬 조회 → `initialData`로 모든 탭 0ms 즉시 렌더
  - 11차: Prefetch 위치 최적화 — `submit-tab.tsx` → `reviews-content.tsx`(페이지 레벨)로 이동, 탭 전환 전에도 사전 로딩
  - **명칭 통일**: "스크립트 크레딧" → "스크립트 패키지 생성권" (요금제 페이지 일치)

## 🔮 현재 상태 & 다음 단계

**현재**: Phase 3 (핵심 모듈 이관) — Step 1 시험후기 완료 + 위저드 고도화 + 크레딧 25일 룰 + 성능 최적화 11단계
**다음 작업**: Step 2 — 스크립트+쉐도잉 모듈 이관 (Server Actions + Edge Functions 하이브리드)

### 네비게이션 구조 (확정)
```
대시보드 | 시험후기 | 스크립트 | 모의고사 | 튜터링
```

### 레이아웃 구조 (확정)
- **(dashboard)**: 탐색/허브 페이지 — Navbar + Footer 포함
- **(immersive)**: 활동/몰입 페이지 — ImmersiveHeader만, Navbar/Footer 없음

### 모듈별 내부 탭 구조 (확정)
- **시험후기** (/reviews): 빈도 분석 | 후기 제출 | 시험 후기
- **스크립트** (/scripts): 스크립트 생성 | 내 스크립트 | 쉐도잉 훈련
- **모의고사** (/mock-exam): 응시 | 결과 | 나의 이력
- **튜터링** (/tutoring): 진단 | 처방 | 훈련

### DB 현황
- **master_questions**: 510행 (시드 로드 완료)
- **orders**: 결제 기록 테이블 (RLS: 본인 조회만)
- **user_credits**: 사용자 이용권 테이블 (회원가입 트리거로 자동 생성)
- **submissions**: 후기 마스터 (17컬럼 + credit_granted, RLS: 본인 CRUD + complete 전체 SELECT, 완료 후기 삭제 불가)
- **submission_questions**: 14개 질문 기록 (FK → submissions, master_questions)
- **submission_combos**: 통합 콤보 (인증: 전체 SELECT, 비인증: advance만)
- **Storage**: audio-recordings 버킷 (공개, RLS 설정 완료)
- ~~custom_mode_questions~~: 삭제됨 (M-1) → submission_combos로 대체 완료

### 결제 시스템 현황
- **결제 SDK**: 포트원(PortOne) V2 — `@portone/browser-sdk`
- **PG사**: KG이니시스 (MID: `MOI7638900`) — 신용카드 일시불
- **결제 플로우**: Store 구매 버튼 → 포트원 결제창 → /api/payment/verify 검증 → DB 기록
- **취소 플로우**: 포트원 콘솔 취소 → 웹훅(`/api/payment/webhook`) → DB 자동 원복
- **상품**: 베이직(19,900), 프리미엄(49,900), 모의고사 횟수권(7,900), 스크립트 횟수권(3,900)

### ⚠️ 크레딧 시스템 (모듈 구현 시 반드시 참고)

**DB 구조 (`user_credits` 테이블):**
| 컬럼 | 용도 | 만료 |
|------|------|------|
| `plan_mock_exam_credits` | 플랜 구매로 받은 모의고사 크레딧 | 플랜 만료 시 0으로 초기화 |
| `plan_script_credits` | 플랜 구매로 받은 스크립트 크레딧 | 플랜 만료 시 0으로 초기화 |
| `mock_exam_credits` | 횟수권으로 구매한 모의고사 크레딧 | 영구 (만료 없음) |
| `script_credits` | 횟수권으로 구매한 스크립트 크레딧 | 영구 (만료 없음) |

**크레딧 소진 순서 (TODO — 모의고사/스크립트 모듈에서 구현):**
1. **플랜 크레딧 먼저 차감** (`plan_mock_exam_credits`, `plan_script_credits`) — 만료되는 것부터
2. **횟수권 크레딧 차감** (`mock_exam_credits`, `script_credits`) — 영구 크레딧은 나중에

**후기 제출 크레딧 보상 (25일 룰, 구현 완료):**
- 최초 2회: 무조건 스크립트 크레딧 2개 지급
- 3회차부터: 마지막 지급일로부터 25일 경과 시에만 지급 (OPIc 응시 주기 반영)
- `submissions.credit_granted` boolean으로 지급 이력 추적
- 완료된 후기는 삭제 불가 (크레딧 악용 방지 + 빈도 분석 데이터 보존)

**플랜 만료 처리 (TODO):**
- `plan_expires_at < NOW()` 시 → `plan_mock_exam_credits = 0`, `plan_script_credits = 0`, `current_plan = 'free'`
- 체크 시점: 모의고사/스크립트 사용 시 또는 대시보드 로드 시

### PG사 심사 현황
| PG사 | 상태 | 비고 |
|------|------|------|
| KG이니시스 | ✅ 사전심사 완료 (2026-02-20) | 본계약 절차 진행 대기 |
| 카카오페이 | 🔄 카드사 심사 진행 중 (2026-02-23~) | 영업일 2~3주, 완료 후 가맹점코드 발급 |
| 네이버페이 | ❌ 직가맹 거절 (2026-02-23) | 고위험군(횟수권 판매) + 매출 이력 없음. PG사 인증형 대안 |
| 토스페이 | 입점 정보 회신 완료 | MID 발급 대기 |

### Supabase DB 접속 (psql)
```bash
# Claude Code에서 psql 직접 실행
PGPASSWORD='opictalk2026' PGCLIENTENCODING='UTF8' "/c/Program Files/PostgreSQL/16/bin/psql" \
  -h aws-1-ap-northeast-2.pooler.supabase.com \
  -p 6543 \
  -U postgres.rwdsyqnrrpwkureqfxwb \
  -d postgres \
  --set=sslmode=require \
  -c "SQL문"
```

> 상세 진행 상황은 `docs/실행계획.md`의 "현재 진행 상태" 참조
> 의사결정 기록은 `docs/의사결정.md` 참조

---
*최종 업데이트: 2026-02-24*
*상태: Phase 3 Step 1 시험후기 완료 + 성능 최적화 11단계 — Step 2 스크립트 이관 대기*
