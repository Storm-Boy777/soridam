# CLAUDE.md — 소리담 (Soridam)

> **AI 기반 OPIc 영어 말하기 학습 플랫폼** · https://soridamhub.com
> 소리담 레거시(`back-up/soridam_legacy`)를 백지 재설계한 현행 버전.

---

## 🌏 언어 & 톤

**모든 응답·코드 주석·커밋 메시지·문서는 한국어**로 작성. 영어는 코드 식별자나 영어가 더 명확한 기술 용어에만.

**소통함 답글 톤** — 친근한 개발자. 존댓말이되 "~했어요" 선호, 이모티콘(☕🥲🙌💬) 적극. 구조: 인사 → 감사/공감 → 원인(간단히) → 해결 상태 → 추가 요청 안내.

---

## 🔄 자동 업데이트 규칙

의미 있는 작업이 완료될 때마다 **관련된 모든 문서를 함께** 갱신한다. 하나만 바꾸고 끝내지 않는다.

| 위치 | 무엇을 갱신 |
|------|------------|
| `memory/개발이력.md` (auto memory) | 새 작업 1행 추가 (날짜 + 요약) |
| `CLAUDE.md` (이 파일) | 핵심 상태 변화만 — 인프라/DB 구조/모듈 활성 범위가 바뀌면 |
| `docs/실행계획.md` | Phase/Step 상태, 바로 다음 작업 |
| `docs/의사결정.md` | 새 결정 사항, 미결 항목 변경 |
| `docs/설계/*.md` | 모듈 설계와 실제 구현이 다르면 설계 문서 수정 |

**갱신하지 않는 경우**: 단순 버그 수정, 사소한 스타일 변경, 대화만 하고 코드 변경 X.

---

## 📚 문서 체계

> 의사결정 및 진행사항 확인 시 반드시 `docs/의사결정.md`를 참조한다.

```
docs/
├── 의사결정.md           ← 모든 의사결정 기록 (P/T/M/O 번호)
├── 실행계획.md           ← Phase별 진행 상태 + 다음 작업
├── 사업운영.md           ← 사업/행정/결제 (PG사, 사업자 정보)
├── 디자인시스템.md
├── 가이드_Next.js+Supabase_페이지전환_성능최적화.md  ← 새 모듈 필독
├── 오픽스터디_세션인계.md  ← 오픽 스터디 작업 시 가장 먼저
├── 스피킹코치_세션인계.md  ← AI 코치 v5 작업 시 가장 먼저
└── 설계/
    ├── 공통기반.md       ← DB 원칙, 백엔드 아키텍처, CORS
    ├── 시험후기.md / 스크립트.md / 모의고사.md / 튜터링.md / 쉐도잉.md
    ├── 관리자.md
    └── 오픽스터디.md (1450줄)
```

**시나리오별 참조**

| 질문 | 문서 |
|------|------|
| "다음 개발 단계?" | `docs/실행계획.md` |
| "이 기능 어떻게 결정됐지?" | `docs/의사결정.md` |
| "{모듈} 설계는?" | `docs/설계/{모듈}.md` |
| "성능 최적화 패턴은?" | `docs/가이드_Next.js+Supabase_페이지전환_성능최적화.md` |
| "AI 코치 설계는?" | 바탕화면 `소리담_AI코치_PRD.md` v2.1 |
| "전체 작업 이력?" | auto memory `개발이력.md` |

**핵심 개념**
- **questions (471개)** — 시스템 전체의 SSOT. 모든 모듈이 이 테이블에서 시작. 원본: `docs/질문 DB/questions_db.xlsx`
- **question_type (10가지)** — 묘사/루틴/비교/경험3종/비교변화/사회적이슈/질문하기/대안제시. 평가·튜터·스크립트가 모두 이 값으로 분기
- **백엔드 아키텍처 (T-9)** — 하이브리드: Server Actions(CRUD) + Edge Functions(AI API)

---

## 🎨 디자인 시스템

> 정의 파일: `app/globals.css` (@theme 블록)

### 컬러 (인디고 블루 + 크림)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `primary-500` | `#3A5BC7` (인디고 블루) | 메인 CTA, 강조 |
| `primary-50` / `primary-100` | `#EBF0FF` / `#D6E0FF` | 하이라이트/보조 배경 |
| `primary-600` / `primary-700` | `#2A4399` / `#1E3378` | 호버 / 진한 강조 |
| `accent-500` | `#E07A5F` (웜 코랄) | 경고성 강조 |
| `background` / `surface` | `#FAFAF7` (크림) / `#FFFFFF` | 페이지 / 카드 |
| `surface-secondary` | `#F3F2EF` | 섹션, 호버 |
| `foreground` / `-secondary` / `-muted` | `#1A1A2E` / `#6B6B7B` / `#A0A0AF` | 본문 / 보조 / 비활성 |
| `border` | `#E8E6E1` | 카드/섹션 테두리 |
| 다크 배경(히어로/일반) | `#12121F` / `#1A1A2E` | 랜딩 히어로 / 필로소피 섹션 |

### 폰트
- 본문 `--font-sans` = Pretendard Variable (CDN)
- 디스플레이 `--font-display` (= `--font-jua`) = Jua (로컬 TTF)
- 세리프 `--font-serif` = Fraunces + Noto Serif KR

### 톤 키워드
- 인디고 블루 + 크림 — 신뢰감 있는 학습 플랫폼 (다크/라이트 투톤)
- 랜딩: 다크 네이비(`#12121F`) 히어로 + 크림(`#FAFAF7`) 콘텐츠 교차
- CTA: `bg-primary-500 rounded-full` (pill)
- 아이콘: Lucide React 통일

### ⚠️ Immersive 레이아웃 모바일 스크롤 패턴 (필수)

`h-dvh` + `overflow-y-auto` 자식이 Samsung Internet / iOS Safari에서 배경·테두리가 잘리는 문제 → `relative` + `absolute inset-0` 패턴으로 우회.

```tsx
{/* ❌ 모바일에서 카드 배경/테두리 잘림 */}
<div className="h-0 flex-grow overflow-y-auto">...</div>

{/* ✅ 모바일에서 안정적 페인팅 + 스크롤 */}
<div className="relative h-0 flex-grow">
  <div className="absolute inset-0 overflow-y-auto">...</div>
</div>
```

**모바일 스크롤바 숨김**: `max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden`

---

## 🏗️ 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js (App Router) |
| 언어 | TypeScript (strict) |
| 스타일 | Tailwind CSS |
| 상태 | Zustand |
| 데이터 페칭 | TanStack React Query |
| 폼 | React Hook Form + Zod |
| 백엔드 | Server Actions(CRUD) + Edge Functions(AI) 하이브리드 (T-9) |
| DB | Supabase PostgreSQL + RLS |
| 인증 | Supabase Auth |
| 배포 | Vercel (프론트) + Supabase (백엔드) |

**네비게이션**: 대시보드 · 시험후기 · 스크립트 · 모의고사 · 튜터링 · AI 코치 (오픽 스터디는 멤버 직접 진입)

**레이아웃 그룹**: `(dashboard)` Navbar+Footer / `(immersive)` ImmersiveHeader만

**모듈별 내부 탭**
- `/reviews` — 빈도 분석 · 후기 제출 · 시험 후기
- `/scripts` — 스크립트 생성 · 내 스크립트 · 쉐도잉 훈련
- `/mock-exam` — 응시 · 결과 · 나의 이력
- `/tutoring` — 진단 · 훈련 · 나의 튜터링
- `/coaching` — 유형별 · 주제별 · 쉐도잉 · 시제
- `/opic-study` — 별도 디자인 시스템(.bp-scope) — 홈 · lobby · session · my · history · explore

---

## 🔌 MCP & Skills

**Supabase MCP** (설정 완료, `.claude/settings.local.json`) — DB 조회/탐색/스키마 확인은 MCP 우선(자연어). 복잡한 스크립트·대량 작업은 psql 폴백.
- 도구: `execute_sql`, `list_tables`, `get_table_schema`, `apply_migration`, `generate_typescript_types`, `list_edge_functions`, `search_documentation`

**설치된 Skills** (`.claude/skills/`)
- `deploy-ef` — Edge Function 배포 자동화 (직접 작성)
- `find-skills`, `vercel-react-best-practices`, `frontend-design`, `web-design-guidelines`, `nano-banana-2` (심링크)

**스킬 관리**: `npx skills add <github-url> --skill <name> -y` / `find` / `update`. 원본은 `.agents/skills/`.

---

## 🔑 인프라

### Supabase (현행)
- Project ID: `fkkdbnebsaecjpqhhdvl`
- URL: `https://fkkdbnebsaecjpqhhdvl.supabase.co`
- Region: Northeast Asia (Seoul)
- DB Password: `soridam2026`
- Pooler: `aws-0-ap-northeast-2.pooler.supabase.com` · port `6543`(Transaction) / `5432`(Session)
- User: `postgres.fkkdbnebsaecjpqhhdvl`
- Access Token: 1Password / 로컬 `.env.secrets` (git 커밋 X). 분실 시 Supabase Dashboard에서 재발급

### Vercel / GitHub / DNS
- Vercel: `jays-projects-ef86099d/soridam-frontend` (프로젝트 ID `prj_KND5lcBF3OBgGcD4C5DHRjS2lr2d`) — main 브랜치 푸시 시 자동 배포
- GitHub: `Storm-Boy777/soridam`
- DNS (Spaceship): A `@` → `216.198.79.1` · CNAME `www` → `cname.vercel-dns.com`
- 도메인: soridamhub.com

### 테스트 계정 (심사/검수용)
- ID: `soridamhub@gmail.com` (관리자)
- URL: https://soridamhub.com/login

### DB 접속
1순위 **Supabase MCP** (자연어). 2순위 psql 폴백:

```bash
PGPASSWORD='soridam2026' PGCLIENTENCODING='UTF8' "/c/Program Files/PostgreSQL/16/bin/psql" \
  -h aws-0-ap-northeast-2.pooler.supabase.com -p 6543 \
  -U postgres.fkkdbnebsaecjpqhhdvl -d postgres \
  --set=sslmode=require -c "SQL문"
```

> DB 테이블 전체 목록(48개)과 결제·크레딧 시스템 상세는 `docs/설계/공통기반.md`·`docs/사업운영.md` 참조.

---

## ⚙️ Environment Variables (`.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://fkkdbnebsaecjpqhhdvl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# 결제 (Creem)
CREEM_API_KEY=creem_...
CREEM_WEBHOOK_SECRET=whsec_...

# AI
OPENAI_API_KEY=sk-proj-...          # GPT-4.1 / Whisper
GEMINI_API_KEY=AIzaSyC...           # 질문 TTS 생성용 (로컬 scripts/generate-tts.mjs) — 유지 필수
ELEVENLABS_API_KEY=sk_d67...        # 스크립트 남성 음성(ElevenLabs eleven_v3, Liam). EF 시크릿에도 등록됨 — 유지
AZURE_SPEECH_KEY=...                # 발음 평가
AZURE_SPEECH_REGION=koreacentral
```

### 🔊 TTS 정리 (용도별 2가지 — 헷갈리지 말 것)

| 용도 | 무엇 | 모델/방식 | 인증 | 코드 위치 | 출력 |
|------|------|----------|------|----------|------|
| **질문 TTS** | 469개 질문 음성 (사전 일괄 생성) | Gemini 2.5 Pro **preview** (Developer API) | `GEMINI_API_KEY` (API 키) | 로컬 `scripts/generate-tts.mjs` (수동 실행) | MP3 → `audio-recordings/questions/` |
| **스크립트(패키지) TTS** | 사용자 스크립트 쉐도잉 음성 (요청 시, 음성 2종) | 여성 `Aoede`: Gemini GA `gemini-2.5-pro-tts` / 남성 `eleven_male`: **ElevenLabs `eleven_v3`(Liam)** | 여성: SA OAuth / 남성: `xi-api-key` | EF `scripts-package` (Phase 1, `resolveVoice` 분기) | 여성 WAV / 남성 MP3 → `script-packages/audio/` |

**스크립트 TTS(GA) 동작 상세** (2026-06-07 전환):
- 엔드포인트 `texttospeech.googleapis.com/v1/text:synthesize` — **API 키로는 불가** (`aiplatform.endpoints.predict` 권한 필요 → OAuth만)
- GCP 프로젝트 `soridam-gemini-system-api`(번호 125701903198) · 서비스 계정 `soridam-tts@soridam-gemini-system-api.iam.gserviceaccount.com`(역할: Agent Platform 관리자)
- EF 시크릿 `GOOGLE_TTS_SA_KEY_B64`(SA JSON을 base64) → EF가 **RS256 JWT 서명 → OAuth 토큰 발급**(Deno Web Crypto, 1시간 캐시) → `Authorization: Bearer` + `x-goog-user-project` 헤더로 호출
- 요청: `voice.model_name="gemini-2.5-pro-tts"`, `voice.name=Zephyr|Aoede`, `audioConfig.audioEncoding="LINEAR16"` → 응답 `audioContent`가 **완성 WAV(RIFF)** (수동 PCM→WAV·리샘플 불필요)
- GA 전환 이유: preview(`gemini-2.5-pro-preview-tts`)의 **하루 50건 제한**. 단가는 preview와 동일($1/1M 입력토큰 · $20/1M 출력토큰, 오디오=초당 25토큰)
- **남성 음성 = ElevenLabs `eleven_v3`(Liam, voice `TX3LPaxmHKxFdv7VOQHJ`)** → MP3. `api.elevenlabs.io` + `xi-api-key`(EF 시크릿 `ELEVENLABS_API_KEY`). **Gemini 대비 비용이 더 높음** (공식 $0.10/1K characters, 문자수 기준 과금) → UI 선택기에 "프리미엄" 배지 + 비용 안내("비용이 더 높아요") 노출. Phase 2 Whisper는 확장자(.mp3/.wav) 맞춰 처리.
- ⚠️ 질문 TTS(preview, API 키)와는 **완전 별개 경로**. GEMINI_API_KEY를 지우면 질문 TTS가 깨짐.

---

## 🚨 개발 원칙

### 자동 실행 금지 — 사용자 요청 시에만
- ❌ `npm run build`
- ❌ `npx tsc --noEmit`
- ❌ `git commit`
- ❌ `git push`

### 기술 제안 시: 업계 표준 우선
편의성·단순함보다 **현재 스택에서 보편적이고 검증된 정석 방식**을 우선. 확신이 없으면 조사 후 제안. 추측 금지.

### 문제 해결 시: 환경 제약사항 먼저 확인
코드 수정 전, 원인이 코드인지 **실행 환경 자체의 제약**(네이버 인앱 브라우저 폰트 강제 교체, iOS Safari Web API 미지원, WebView CSP/CORS 등)인지 먼저 확인. "특정 환경에서만 안 된다" → 그 환경의 알려진 제약부터 조사.

### 데이터 페칭 — TanStack React Query 필수
> 새 모듈 구현 시 반드시 `docs/가이드_Next.js+Supabase_페이지전환_성능최적화.md`를 본다.

- 클라이언트 컴포넌트에서 데이터 로드 시 **`useState + useEffect` 금지** → `useQuery` / `useInfiniteQuery` / `useMutation`
- 인프라: `app/providers.tsx`(QueryClientProvider) · `lib/react-query.ts`(QueryClient 팩토리)
- 패턴
  - 서버 초기 데이터 → `useQuery + initialData` (이중 로딩 제거)
  - 고정 데이터(questions 등) → `staleTime: Infinity`
  - 페이지네이션 → `useInfiniteQuery` (필터별 캐시)
  - 일반 동적 → `staleTime: 5 * 60 * 1000`
  - 변경 후 갱신 → `queryClient.invalidateQueries()`
- 서버 사전 조회: 다탭 페이지는 모든 탭의 초기 데이터를 `Promise.all` 병렬 조회 → 각 탭에 `initialData` 전달
- Prefetch 위치: 페이지 최상위 컴포넌트 (자식에 두면 마운트 시점에 의존 → 실행 안 될 수 있음)

### Git Commit Convention (한국어)
```
feat / fix / docs / refactor / test / chore / style / perf
```

### Git 설정
```bash
git config user.email "soridamhub@gmail.com"
git config user.name "Storm-Boy777"
# origin: https://Storm-Boy777@github.com/Storm-Boy777/soridam.git
```

---

## 🔮 현재 상태 & 다음 단계

> **⚠️ 새 세션 시작 시 필수**
> - AI 코치 v5 작업 → `docs/스피킹코치_세션인계.md` 먼저
> - 오픽 스터디 작업 → `docs/오픽스터디_세션인계.md` 먼저

**완료**: Phase 1~6 ✅ · Phase 7 AI 코치 v5 — 묘사 + 돌발 4 그룹 (36/90 spec, 40%) ✅ · 권한 시스템 ✅ · 쉐도잉(답변뱅크, 묘사 80개 AL 격상) ✅ · 시제 만능 아크 ✅ · Talklish 금요일 개편 ✅

**다음 작업 (스피킹 코치 v5 spec 완성)**
1. ~~description_random 4 그룹 × 6 = 24 row~~ ✅ (마이그 081)
2. rp_11 / rp_12 × 6 = 12 row (자료 #2/#6/#7) — 마이그 082
3. past_childhood / past_recent / past_special × 6 = 18 row — 마이그 083
4. adv_14 / adv_15 × 6 = 12 row — 마이그 084
5. routine / comparison × 6 = 12 row — 마이그 085

→ 총 90 row 완성 시 14 유형 × 6 등급 매트릭스 완료. 현재 36/90.

**⚠️ Claude는 프리뷰 검증 X** — 사용자가 직접 브라우저로 진행. 코드 작성/수정만.

### ⚠️ 반드시 해야 할 일: 크레딧 예상 비용 실측 업데이트
- 파일: `lib/constants/estimated-costs.ts`
- 현재: 보수적 추정값 (script: 5¢, mock_exam: 30¢, tutoring: 10¢)
- 시점: 각 모듈 실사용 후 `api_usage_logs`에 충분한 데이터가 쌓이면
- 방법:
  ```sql
  SELECT session_type, round(avg(session_cost)::numeric, 2) AS avg_cost_cents
  FROM (
    SELECT session_type, session_id, sum(cost_usd) * 100 AS session_cost
    FROM api_usage_logs WHERE session_id IS NOT NULL
    GROUP BY session_type, session_id
  ) t GROUP BY session_type;
  ```

> 모듈별 진행 상태 표(오픽 스터디 19단계, 튜터링, AI 코치)는 `docs/실행계획.md` 참조.
> 모의고사 평가 파이프라인 / 모듈별 EF·SA 상세는 `docs/설계/*.md` 참조.

---

*최종 갱신: 2026-06-03 · Phase 1~6 ✅ + AI 코치 v5(36/90) + 쉐도잉(답변뱅크) + 시제 만능 아크 + Talklish 금요일 개편*
