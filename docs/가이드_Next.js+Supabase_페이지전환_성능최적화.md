# Next.js + Supabase 페이지 전환 성능 최적화 가이드

> **적용 환경**: Next.js App Router + Supabase + TanStack Query
> **검증 기준**: 시험후기 모듈(/reviews)에서 12차에 걸쳐 검증된 패턴
> **핵심 효과**: 첫 진입 160ms+ → 20-40ms, 탭 전환 40-60ms → 0ms (캐시 히트)

---

## 목차

1. [인프라 구성](#1-인프라-구성)
2. [인증 3계층](#2-인증-3계층)
3. [Suspense 경계 설계](#3-suspense-경계-설계)
4. [서버 컴포넌트 데이터 로딩](#4-서버-컴포넌트-데이터-로딩)
5. [TanStack Query 클라이언트 캐싱](#5-tanstack-query-클라이언트-캐싱)
6. [Prefetch 전략](#6-prefetch-전략)
7. [Supabase 쿼리 최적화](#7-supabase-쿼리-최적화)
8. [서버 액션 설계 원칙](#8-서버-액션-설계-원칙)
9. [안티 패턴 & 올바른 패턴](#9-안티-패턴--올바른-패턴)
10. [새 모듈 구현 체크리스트](#10-새-모듈-구현-체크리스트)

---

## 1. 인프라 구성

TanStack Query가 동작하려면 아래 3개 파일이 필요하다. (이미 구성됨)

### QueryClient 팩토리 (`lib/react-query.ts`)

```typescript
import { QueryClient, isServer } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5분 — 프로젝트 기본값
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) return makeQueryClient(); // 서버: 매 요청마다 새로 생성
  if (!browserQueryClient) browserQueryClient = makeQueryClient(); // 브라우저: 싱글턴
  return browserQueryClient;
}
```

**핵심**: 브라우저에서는 싱글턴 → 탭 전환/페이지 이동 시에도 캐시 유지.

### Provider 래퍼 (`app/providers.tsx`)

```typescript
"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/react-query";

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

### Root Layout에서 감싸기

```tsx
// app/layout.tsx
import { Providers } from "./providers";

export default function RootLayout({ children }) {
  return (
    <html><body>
      <Providers>{children}</Providers>
    </body></html>
  );
}
```

---

## 2. 인증 3계층

용도에 따라 3가지 인증 함수를 구분한다. 잘못 쓰면 페이지당 34-43ms씩 낭비된다.

| 함수 | 동작 | 속도 | 용도 |
|------|------|------|------|
| `getSession()` | 쿠키에서 JWT 읽기 (검증 없음) | ~0ms | middleware 라우팅 판단 전용 |
| `getAuthClaims()` | 로컬 JWT ES256 서명 검증 (WebCrypto) | 0ms (JWKS 캐시 후) | 표시용 UI (배너, 등급, 통계) |
| `getUser()` | Supabase 서버에 JWT 전송 → 서버 검증 | 34-43ms | 프로필 편집, Server Actions |

### 구현 (`lib/auth.ts`)

```typescript
import { cache } from "react";
import { createServerSupabaseClient } from "./supabase-server";

// cache()로 동일 요청 내 중복 호출 제거
export const getUser = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export const getAuthClaims = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  return data.claims;
});
```

### 필드 매핑

| 데이터 | getUser() | getClaims() |
|--------|-----------|-------------|
| 유저 ID | `user.id` | `claims.sub` |
| 이메일 | `user.email` | `claims.email` |
| 메타데이터 | `user.user_metadata` | `claims.user_metadata` |

### getClaims() 작동 원리

```
1회차: JWKS 엔드포인트에서 공개키 다운로드 (37ms) → 로컬 캐시
2회차~: 캐시된 공개키로 JWT 서명을 WebCrypto API로 검증 (0ms)
```

- Supabase JWT가 **Asymmetric (ES256)** 알고리즘이어야 함
- 2024년 이후 생성된 Supabase 프로젝트는 기본 ES256
- supabase-js **2.49.4+** 필요 (정식 2.51.0+)

### 사용 구분 원칙

**getAuthClaims()** — 표시용:
- 대시보드 통계 카드, 넛지 배너, 사이드 패널, 네비게이션 이름 표시

**getUser()** — 검증 필수:
- 마이페이지 프로필 편집, Server Actions (데이터 변경), 결제 처리

**getSession()** — middleware 전용:
- `middleware.ts`에서 라우팅 판단만. **Server Component에서 절대 사용 금지** (Supabase 공식 경고)

---

## 3. Suspense 경계 설계

### 핵심 원칙: 데이터 의존 섹션만 Suspense로 감싼다

```tsx
// app/(dashboard)/reviews/page.tsx
export default function ReviewsPage() {
  return (
    <div>
      {/* 셸: 즉시 렌더 (데이터 의존 없음) */}
      <div>
        <h1>시험후기</h1>
        <p>실제 시험 후기를 분석하여 출제 빈도를 파악하세요.</p>
      </div>

      {/* 데이터 영역: 로딩 중 플레이스홀더 → 로딩 완료 시 스트리밍 */}
      <Suspense fallback={<ReviewsPlaceholder />}>
        <ReviewsDataLoader />
      </Suspense>
    </div>
  );
}
```

### Before vs After

```
Before: 사용자 클릭 → [빈 화면 34-43ms+] → 페이지 전체 한꺼번에 표시
After:  사용자 클릭 → [즉시] 헤더+네비 표시 → [20-40ms 후] 데이터 스트리밍
```

### 레이아웃에서 async 제거

```tsx
// ❌ layout.tsx — async → 모든 하위 페이지 차단
export default async function DashboardLayout({ children }) {
  const user = await getUser();  // 34-43ms 차단
  return <div><Banner user={user} />{children}</div>;
}

// ✅ layout.tsx — 동기 렌더, 데이터 부분만 Suspense
export default function DashboardLayout({ children }) {
  return (
    <div>
      <Navbar />
      <Suspense fallback={null}>
        <BannerLoader />  {/* async 컴포넌트를 Suspense로 분리 */}
      </Suspense>
      <main>{children}</main>
    </div>
  );
}
```

### Fallback 패턴

```tsx
// 실제 컴포넌트와 동일한 높이/구조의 스켈레톤
function StatsPlaceholder() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-[118px] rounded-xl border bg-surface" />
      ))}
    </div>
  );
}

// "없어도 되는" 요소는 fallback={null}
<Suspense fallback={null}>
  <OptionalBanner />
</Suspense>
```

### 주의사항

| 패턴 | 결과 |
|------|------|
| `loading.tsx` (전역/그룹 레벨) | 페이지 전환마다 전체 화면 깜빡임 → **사용 금지** |
| `async layout` | 하위 모든 렌더링 차단 → **layout에서 async 제거** |
| 넓은 Suspense 경계 | 헤더/네비 포함 전체 차단 → **데이터 영역만 감싸기** |

---

## 4. 서버 컴포넌트 데이터 로딩

### 핵심 패턴: 서버에서 모든 탭 데이터를 병렬 조회 → initialData로 전달

탭 구조 페이지에서 가장 효과가 큰 패턴. 서버에서 모든 탭의 초기 데이터를 한 번에 조회하고, 클라이언트 컴포넌트에 `initialData`로 넘긴다.

```
[서버] Promise.all → 모든 탭 데이터 1회 조회 (20-40ms)
  ↓ props로 전달
[클라이언트] useQuery({ initialData }) → 0ms 즉시 렌더
```

### 실제 구현 (`app/(dashboard)/reviews/page.tsx`)

```tsx
async function ReviewsDataLoader() {
  // 1단계: 모든 탭의 초기 데이터를 병렬 조회
  const [{ stats, frequency }, submissionsResult, publicReviewsResult] = await Promise.all([
    getStatsAndFrequency(),                      // 빈도 분석 탭
    getMySubmissions(),                          // 후기 제출 탭
    getPublicReviews({ page: 1, limit: 10 }),    // 시험 후기 탭
  ]);

  const submissions = submissionsResult.data || [];

  // 2단계: 완료된 후기 상세를 단일 쿼리로 일괄 조회 (N+1 → 1 쿼리)
  const completeIds = submissions.filter(s => s.status === "complete").map(s => s.id);
  const submissionDetails = await getSubmissionsWithQuestionsBatch(completeIds);

  return (
    <ReviewsContent
      initialStats={stats}
      initialFrequency={frequency}
      initialSubmissions={submissions}
      initialPublicReviews={publicReviewsResult.data || { reviews: [], total: 0 }}
      initialSubmissionDetails={submissionDetails}
    />
  );
}
```

### 적용 규칙

1. **서버 컴포넌트(page.tsx)에서 `Promise.all`로 병렬 조회** — 순차 `await` 금지
2. **클라이언트 컴포넌트에 props로 전달** — 서버 → 클라이언트 데이터 브릿지
3. **관련 데이터는 서버 액션 1개로 통합** — `getStatsAndFrequency()`처럼 여러 집계를 하나로
4. **목록 → 상세 패턴은 일괄 조회** — `getSubmissionsWithQuestionsBatch()`로 N+1 방지

---

## 5. TanStack Query 클라이언트 캐싱

### 5-1. 기본 패턴: useQuery + initialData

서버에서 받은 데이터를 `initialData`로 넣으면 첫 렌더 즉시 표시 + 캐시 등록.

```tsx
const { data: frequencyData = [] } = useQuery({
  queryKey: ["review-frequency"],
  queryFn: async () => {
    const result = await getFrequency();
    return result.data || [];
  },
  initialData: initialFrequency,       // 서버에서 받은 데이터
  initialDataUpdatedAt: Date.now(),     // 캐시 시각 기준
  staleTime: 5 * 60 * 1000,            // 5분간 fresh
});
```

### 5-2. 페이지네이션: useInfiniteQuery + initialData

```tsx
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ["public-reviews", levelFilter],
  queryFn: async ({ pageParam }) => {
    const result = await getPublicReviews({
      level: levelFilter || undefined,
      page: pageParam,
      limit,
    });
    return result.data || { reviews: [], total: 0 };
  },
  initialPageParam: 1,
  getNextPageParam: (lastPage, allPages) => {
    const loaded = allPages.reduce((acc, p) => acc + p.reviews.length, 0);
    return loaded < lastPage.total ? allPages.length + 1 : undefined;
  },
  // 필터 초기값일 때만 서버 데이터 사용
  initialData: levelFilter === "" && initialPublicReviews
    ? { pages: [initialPublicReviews], pageParams: [1] }
    : undefined,
  initialDataUpdatedAt: levelFilter === "" && initialPublicReviews ? Date.now() : undefined,
  staleTime: 5 * 60 * 1000,
});
```

### 5-3. 고정 데이터: staleTime: Infinity

변하지 않는 마스터 데이터(510개 질문 등)는 세션 내 1회만 로드.

```tsx
const { data: topics = [] } = useQuery({
  queryKey: ["topics", category],
  queryFn: async () => {
    const result = await getTopicsByCategory(category);
    return result || [];
  },
  staleTime: Infinity,  // 세션 내 영구 캐시
});
```

### 5-4. 데이터 변경 후 캐시 갱신: invalidateQueries

```tsx
const queryClient = useQueryClient();

// 후기 제출 완료 시 관련 캐시 모두 갱신
queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
queryClient.invalidateQueries({ queryKey: ["review-frequency"] });
queryClient.invalidateQueries({ queryKey: ["user-credits"] });
```

### 5-5. staleTime 기준표

| 데이터 성격 | staleTime | 예시 |
|------------|-----------|------|
| 변하지 않는 마스터 데이터 | `Infinity` | 주제 목록, 질문 목록, 완료 후기 상세 |
| 일반 동적 데이터 | `5 * 60 * 1000` (5분) | 빈도 분석, 제출 이력, 공개 후기 |
| 자주 변하는 실시간 데이터 | `0` 또는 짧은 값 | (현재 사용 안 함) |

### 5-6. queryKey 현황

| queryKey | staleTime | 용도 |
|----------|-----------|------|
| `["user-credits", userId]` | 5분 | 대시보드 + 스토어 공유 |
| `["review-frequency"]` | 5분 | 빈도 분석 |
| `["my-submissions"]` | 5분 | 내 후기 이력 |
| `["public-reviews", levelFilter]` | 5분 | 공개 후기 (필터별) |
| `["submission-detail", submissionId]` | Infinity | 완료 후기 상세 |
| `["question-frequency", topic]` | 5분 | 주제별 질문 빈도 |
| `["topics", category]` | Infinity | 주제 목록 (고정) |
| `["questions", topic, category]` | Infinity | 질문 목록 (고정) |

---

## 6. Prefetch 전략

### 6-1. 서버에서 조회한 데이터를 캐시에 직접 세팅

서버 컴포넌트에서 이미 조회한 상세 데이터를 `setQueryData`로 캐시에 넣는다.

```tsx
// reviews-content.tsx (페이지 레벨 클라이언트 컴포넌트)
useEffect(() => {
  for (const [id, detail] of Object.entries(initialSubmissionDetails)) {
    queryClient.setQueryData(["submission-detail", Number(id)], detail);
  }
}, [initialSubmissionDetails, queryClient]);
```

**효과**: 완료 후기 클릭 시 추가 API 호출 없이 0ms 즉시 표시.

### 6-2. 클라이언트에서 예측 Prefetch

사용자가 클릭할 가능성이 높은 데이터를 백그라운드에서 미리 로딩.

```tsx
// frequency-tab.tsx — 주제별 질문 빈도 사전 로딩
const prefetchedRef = useRef(false);

useEffect(() => {
  if (prefetchedRef.current || frequencyData.length === 0) return;
  prefetchedRef.current = true;

  const uniqueTopics = [...new Set(frequencyData.map((item) => item.topic))];
  for (const topic of uniqueTopics) {
    queryClient.prefetchQuery({
      queryKey: ["question-frequency", topic],
      queryFn: async () => {
        const result = await getQuestionFrequency(topic);
        return result.data || [];
      },
      staleTime: 5 * 60 * 1000,
    });
  }
}, [frequencyData, queryClient]);
```

### 6-3. Prefetch 배치 위치 원칙

**Prefetch는 반드시 최상위 컴포넌트에 배치한다.**

```
❌ SubmitTab 내부 → 기본 탭이 다르면 마운트 안 됨 → prefetch 미실행
✅ reviews-content.tsx (페이지 레벨) → 탭과 무관하게 페이지 진입 시 즉시 실행
```

실제로 이 프로젝트에서 겪은 문제:
- 8차에서 SubmitTab 내부에 prefetch 배치
- 기본 탭이 "빈도 분석"이라 SubmitTab 미마운트 → prefetch 미실행
- 10차에서 initialData 적용 후 목록이 즉시 표시 → 사용자가 prefetch 전에 클릭
- 11차에서 reviews-content.tsx(페이지 레벨)로 이동하여 해결

### 6-4. Prefetch 적합성 판단

| 조건 | Prefetch 여부 |
|------|-------------|
| 데이터가 가볍고 (< 수 KB) + 클릭 확률 높음 | O |
| 목록 데이터에서 상세 클릭이 예상됨 | O |
| 대량 데이터 (이미지, 파일 등) | X |
| 클릭 확률이 낮은 옵션 | X |

---

## 7. Supabase 쿼리 최적화

### 7-1. Nested Select로 1 RTT 통합

관련 테이블을 별도 쿼리가 아닌 Supabase 관계 쿼리로 한 번에 가져온다.

```typescript
// ❌ 2 RTT
const submission = await supabase.from("submissions").select("*").eq("id", id).single();
const questions = await supabase.from("submission_questions").select("*").eq("submission_id", id);

// ✅ 1 RTT — nested select
const { data } = await supabase
  .from("submissions")
  .select(`
    *,
    submission_questions(
      *,
      master_questions(question_id, question_title, question_english, question_korean, answer_type, topic)
    )
  `)
  .eq("id", id)
  .single();
```

### 7-2. N+1 방지: `.in()` 일괄 조회

```typescript
// ❌ N+1 — N개 후기 × 1쿼리
const details = await Promise.all(ids.map(id => getSubmissionWithQuestions(id)));

// ✅ 1 쿼리 — .in()으로 일괄 조회
const { data } = await supabase
  .from("submissions")
  .select("*, submission_questions(*, master_questions(...))")
  .in("id", submissionIds)
  .eq("user_id", userId);
```

### 7-3. COUNT 전용 쿼리: `head: true`

행 데이터 없이 개수만 필요할 때:

```typescript
const { count } = await supabase
  .from("submissions")
  .select("id", { count: "exact", head: true })  // head: true → 행 0개 전송, count만 반환
  .eq("status", "complete");
```

### 7-4. 인덱스 추가

자주 필터/조인되는 컬럼에 인덱스 생성:

```sql
CREATE INDEX idx_submission_questions_topic ON submission_questions(topic);
```

---

## 8. 서버 액션 설계 원칙

### 8-1. 독립 쿼리는 반드시 Promise.all

```typescript
// ❌ 순차 — 60-110ms
const stats = await getStats();
const frequency = await getFrequency();
const submissions = await getMySubmissions();

// ✅ 병렬 — 20-40ms (가장 느린 쿼리 시간만 소요)
const [stats, frequency, submissions] = await Promise.all([
  getStats(),
  getFrequency(),
  getMySubmissions(),
]);
```

### 8-2. 관련 데이터는 하나의 서버 액션으로 통합

같은 페이지에서 함께 사용되는 데이터는 서버 액션 1개로 묶는다.

```typescript
// ❌ 별도 — 클라이언트에서 2번 호출, 내부 쿼리 중복
export async function getStats() { /* combos 조회 + 집계 */ }
export async function getFrequency() { /* combos 조회 + 빈도 계산 */ }

// ✅ 통합 — 1회 호출로 stats + frequency, combos 1회만 조회
export async function getStatsAndFrequency() {
  const [reviewsResult, { combos, surveyTypeMap }, participantsResult] = await Promise.all([
    /* 후기 수 */,
    fetchCombosAndSurveyTypes(supabase),  // 공유 헬퍼
    /* 참여자 수 */,
  ]);
  return { stats: { ... }, frequency: buildFrequencyList(combos, surveyTypeMap) };
}
```

### 8-3. 공유 헬퍼로 중복 로직 제거

여러 서버 액션에서 같은 데이터/로직을 사용하면 내부 헬퍼 함수로 추출한다.

```typescript
// 내부 헬퍼 — getFrequency()와 getStatsAndFrequency() 공유
async function fetchCombosAndSurveyTypes(supabase) {
  const [combosResult, surveyTypeResult] = await Promise.all([
    supabase.from("submission_combos").select("topic, combo_type"),
    supabase.from("master_questions").select("topic, survey_type"),
  ]);
  // 공통 가공 로직
  return { combos, surveyTypeMap, error };
}

function buildFrequencyList(combos, surveyTypeMap): FrequencyItem[] {
  // 공통 집계 로직
}
```

### 8-4. 일괄 조회 함수 제공

목록 → 상세 패턴에서 N+1을 방지하는 배치 함수를 별도로 제공한다.

```typescript
// 개별 조회 (클라이언트에서 단일 상세 보기용)
export async function getSubmissionWithQuestions(submissionId: number) { /* ... */ }

// 일괄 조회 (서버 사전 로딩용 — N+1 방지)
export async function getSubmissionsWithQuestionsBatch(submissionIds: number[]) {
  if (submissionIds.length === 0) return {};
  const { data } = await supabase
    .from("submissions")
    .select("*, submission_questions(*, master_questions(...))")
    .in("id", submissionIds)
    .eq("user_id", userId);
  // Record<id, data> 형태로 반환
}
```

---

## 9. 안티 패턴 & 올바른 패턴

| 안티 패턴 | 올바른 패턴 | 효과 |
|----------|-----------|------|
| `useState` + `useEffect`로 데이터 로딩 | `useQuery` + `initialData` | 캐시 + 재방문 0ms |
| 탭 컴포넌트마다 독립적 fetch | 서버에서 모든 탭 `Promise.all` 조회 | 탭 전환 0ms |
| 고정 데이터 매번 API 호출 | `staleTime: Infinity` | 세션 내 1회 |
| 표시용 UI에 `getUser()` 사용 | `getAuthClaims()` 사용 | -34~43ms |
| `async layout` | layout에서 async 제거 + Suspense 분리 | 셸 즉시 렌더 |
| 전역 `loading.tsx` | 삭제 + 개별 Suspense fallback | 깜빡임 제거 |
| 순차 `await` 3개 | `Promise.all` 병렬 | 60-110ms → 20-40ms |
| 별도 쿼리 2개 (submission + questions) | Supabase nested select 1개 | RTT 2 → 1 |
| N개 ID를 `map(id => getDetail(id))` | `.in("id", ids)` 일괄 조회 | N쿼리 → 1쿼리 |
| 자식 컴포넌트에서 prefetch | 최상위 컴포넌트에서 prefetch | 마운트 의존 제거 |
| 서버 액션 간 동일 쿼리 중복 | 내부 헬퍼 함수로 추출 후 공유 | 코드 중복 제거 |
| 서버 stats + 클라이언트 frequency 이중 로드 | 서버에서 1회 통합 조회 | RTT 1회 제거 |

---

## 10. 새 모듈 구현 체크리스트

새 모듈(스크립트, 모의고사, 튜터링) 구현 시 아래를 순서대로 적용한다.

### 서버 컴포넌트 (page.tsx)

- [ ] 모든 탭의 초기 데이터를 `Promise.all`로 병렬 조회
- [ ] Suspense로 데이터 영역만 감싸기 (헤더는 즉시 렌더)
- [ ] 목록 → 상세 패턴이 있으면 일괄 조회 함수(`*Batch`)로 서버에서 사전 로딩

### 클라이언트 컴포넌트

- [ ] 모든 데이터 로딩에 `useQuery` / `useInfiniteQuery` 사용 (`useState + useEffect` 금지)
- [ ] 서버에서 받은 데이터는 `initialData` + `initialDataUpdatedAt: Date.now()` 설정
- [ ] 고정 마스터 데이터는 `staleTime: Infinity`
- [ ] 일반 동적 데이터는 `staleTime: 5 * 60 * 1000` (5분)
- [ ] 데이터 변경 후 `invalidateQueries`로 관련 캐시 갱신

### Prefetch

- [ ] 서버에서 사전 조회한 상세 데이터는 `setQueryData`로 캐시에 직접 세팅
- [ ] 클릭 가능한 드릴다운 데이터는 `prefetchQuery`로 백그라운드 로딩
- [ ] Prefetch는 최상위 컴포넌트(content.tsx)에 배치
- [ ] `useRef`로 중복 prefetch 방지

### 서버 액션

- [ ] 독립 쿼리는 `Promise.all` 병렬
- [ ] 관련 데이터는 Supabase nested select로 1 RTT
- [ ] 여러 액션이 같은 데이터를 쓰면 내부 헬퍼로 추출
- [ ] COUNT만 필요하면 `{ count: "exact", head: true }`
- [ ] 목록 → 상세 일괄 조회가 필요하면 `.in()` 배치 함수 제공

### 인증

- [ ] 표시용 UI → `getAuthClaims()`
- [ ] 데이터 변경 → `getUser()`
- [ ] 같은 요청에서 중복 호출 걱정 없음 (React `cache()` 적용됨)

---

## 데이터 플로우 요약

```
[서버 컴포넌트 - page.tsx]
  │
  ├─ Promise.all (모든 탭 데이터 병렬 조회, 20-40ms)
  │   ├─ 탭A 데이터
  │   ├─ 탭B 데이터
  │   └─ 탭C 데이터
  │
  ├─ 일괄 상세 조회 (N+1 방지, 1쿼리)
  │
  └─ Suspense 스트리밍 → props로 전달
       │
       ▼
[클라이언트 컴포넌트 - content.tsx]
  │
  ├─ setQueryData (서버 상세 데이터 → 캐시 직접 세팅)
  ├─ prefetchQuery (클릭 예상 데이터 백그라운드 로딩)
  │
  └─ 각 탭 컴포넌트
       │
       ├─ useQuery({ initialData }) → 0ms 즉시 렌더
       ├─ useInfiniteQuery({ initialData }) → 페이지네이션 + 캐시
       ├─ staleTime: Infinity → 고정 데이터 영구 캐시
       └─ invalidateQueries → 변경 시 관련 캐시 자동 갱신
```

---

*최종 업데이트: 2026-02-24*
*적용 프로젝트: OPIcTalkDoc (Next.js 16 + Supabase + TanStack Query)*
