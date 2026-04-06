# DB 이전 계획: 소리담 v1 → 소리담 v2

## 개요

**목표**: 소리담 v1 DB(fkkdbnebsaecjpqhhdvl)에 v2 테이블을 `v2_` 접두사로 추가한다.
3개 서비스(하루오픽, 소리담 v1, 소리담 v2)가 동시에 정상 운영되어야 한다.
마이그레이션 완료 후 v1 테이블 DROP → v2_ 접두사 RENAME → 코드 접두사 제거.

**핵심 원칙:**
- **하루오픽 DB** = 스키마 참조용 (독립 운영 유지)
- **소리담 v1 DB** = 운영 중 (절대 건드리지 않음)
- **소리담 v2** = 같은 DB에 `v2_` 접두사 테이블로 공존
- 코드에서 테이블명을 상수(`lib/constants/tables.ts`)로 관리 → 전환 시 1줄 수정

## 3개 서비스 동시 운영

| 서비스 | DB | 도메인 | 상태 |
|--------|-----|--------|------|
| 하루오픽 | rwdsyqnrrpwkureqfxwb | haruopic.com | 독립 운영 |
| 소리담 v1 | fkkdbnebsaecjpqhhdvl | soridamhub.com | 운영 중 |
| 소리담 v2 | fkkdbnebsaecjpqhhdvl (동일) | soridamhub.com (전환 후) | 준비 중 |

## DB 정보

| 항목 | 하루오픽 (스키마 원본) | 소리담 (운영 DB) |
|------|---------------------|----------------|
| Project ID | rwdsyqnrrpwkureqfxwb | fkkdbnebsaecjpqhhdvl |
| Host | aws-1-ap-northeast-2.pooler.supabase.com | aws-0-ap-northeast-2.pooler.supabase.com |
| Password | opictalk2026 | soridam2026 |
| User | postgres.rwdsyqnrrpwkureqfxwb | postgres.fkkdbnebsaecjpqhhdvl |
| 테이블 수 | 40개 | 92개 (v1) + 39개 (v2_) = 131개 |
| Auth 사용자 | ~30명 (테스트) | 1,686명 (운영) |

## 완료된 작업

### Phase 1: v2_ 테이블 생성 ✅
- `034_v2_tables.sql` — 39개 테이블 + 30개 RPC 함수 + RLS 정책 + 인덱스
- 하루오픽 DB에서 실제 스키마를 `information_schema`로 추출하여 정확한 복제
- 모든 테이블명, 제약조건, 인덱스, RLS 정책, RPC 함수에 `v2_` 접두사 적용
- 소리담 DB에 에러 없이 적용 완료

### Phase 2: 참조 데이터 INSERT ✅
하루오픽 DB에서 추출하여 소리담 v2_ 테이블에 INSERT 완료:

| 테이블 | 행 수 | 상태 |
|--------|------|------|
| v2_questions | 471 | ✅ |
| v2_script_specs | 60 | ✅ |
| v2_evaluation_criteria | 60 | ✅ |
| v2_evaluation_prompts | 23 | ✅ |
| v2_type_templates | 10 | ✅ |
| v2_level_modifiers | 6 | ✅ |
| v2_task_fulfillment_checklists | 10 | ✅ |
| v2_opic_tips | 52 | ✅ |
| v2_ai_prompt_templates | 3 | ✅ |
| v2_mock_test_eval_settings | 1 | ✅ |
| v2_admin_audit_log | 47 | ✅ |
| v2_user_activity_log | 189 | ✅ |
| v2_master_questions | 471 | ✅ |

### 스킵한 테이블 (하루오픽 사용자 제외 결정)
하루오픽 Auth 사용자(~30명)가 소리담 DB에 없어서 FK 위반 → 사용자 관련 데이터는 전부 스킵.

| 테이블 | 사유 |
|--------|------|
| v2_profiles | auth.users FK |
| v2_user_credits | auth.users FK |
| v2_polar_balances | auth.users FK |
| v2_orders | auth.users FK |
| v2_beta_applications | auth.users FK |
| v2_submissions | auth.users FK |
| v2_scripts | auth.users FK |
| v2_mock_test_sessions | auth.users FK |
| v2_tutoring_sessions | auth.users FK |
| v2_shadowing_sessions | auth.users FK |
| + 모든 자식 테이블 | 부모 테이블 비어있음 |

## 남은 작업

### Phase 3: v1 데이터 → v2 변환 (별도 논의 필요)
소리담 v1 사용자(1,686명)의 학습 데이터를 v2 스키마로 변환.
어떤 데이터를 옮길지, 스키마 차이를 어떻게 매핑할지 논의가 필요함.

**논의 대상:**
- v1 모의고사 데이터 (613세션, 6,632답변) → v2 스키마로 변환 가능한가?
- v1 후기 데이터 (289건, 3,511질문) → v2 스키마 차이는?
- v1 쉐도잉 데이터 (813세션) → v2 스키마와 매핑?
- v1 튜터링 (6세션) → v2와 완전히 다른 구조, 변환 가능한가?
- v1 사용자 포인트/구독/결제 → v2 크레딧 시스템으로 변환?

### Phase 4: 코드 연결 변경
- [ ] `lib/constants/tables.ts` 생성 — v2_ 접두사 상수 관리
- [ ] 코드 전체에서 테이블명 하드코딩 → 상수 참조로 변경
- [ ] `.env.local` → 소리담 DB 연결 정보로 변경
- [ ] Edge Function 환경변수 변경
- [ ] MCP 서버 project_ref 변경

### Phase 5: 검증 + 전환 (Phase 3, 4 완료 후)
- [ ] v2 전체 기능 테스트
- [ ] v1 서비스 중단
- [ ] v1 테이블 DROP (또는 백업 보관)
- [ ] `v2_` 접두사 RENAME 제거
- [ ] 코드에서 접두사 `""` 로 변경

## 파일 목록

| 파일 | 용도 |
|------|------|
| `supabase/migrations/034_v2_tables.sql` | v2_ 테이블 39개 + RPC 30개 CREATE |
| `temp_haruopic_schema.csv` | 하루오픽 컬럼 정보 (522행) |
| `temp_haruopic_constraints.csv` | 제약조건 정보 |
| `temp_haruopic_indexes.csv` | 인덱스 정보 |
| `temp_haruopic_policies.csv` | RLS 정책 (109행) |
| `temp_haruopic_functions.sql` | RPC 함수 소스코드 (724줄) |
| `temp_data_*.csv` | 참조 데이터 CSV (13개 파일) |

---
*최종 업데이트: 2026-04-06*
