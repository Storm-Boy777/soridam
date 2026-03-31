---
name: deploy-ef
description: Supabase Edge Function 배포. EF 배포, 함수 배포, deploy edge function, supabase deploy 요청 시 사용. 프로젝트의 Edge Function을 Supabase에 배포하는 전체 플로우를 처리한다.
argument-hint: [함수명|all]
allowed-tools: Bash, Read, Glob
disable-model-invocation: true
---

# Edge Function 배포 스킬

## 배포 설정
- 프로젝트: `rwdsyqnrrpwkureqfxwb`
- 작업 디렉터리: `C:/Users/js777/Desktop/haruopic`
- 토큰 환경변수: `SUPABASE_ACCESS_TOKEN`

## JWT 검증 비활성화가 필요한 함수
- `mock-test-eval-judge`
- `mock-test-eval-coach`
- `mock-test-report`
- `admin-trigger-eval`

## 실행 절차

### 인자가 특정 함수명인 경우
1. `supabase/functions/<함수명>/` 디렉터리 존재 확인
2. JWT 비활성화 대상인지 확인
3. 배포 명령 실행

### 인자가 `all`인 경우
1. `supabase/functions/` 아래 모든 함수 디렉터리 확인 (`_shared` 제외)
2. 각 함수를 순서대로 배포

## 배포 명령 템플릿

일반 함수:
```bash
cd C:/Users/js777/Desktop/haruopic && npx supabase functions deploy <함수명> --project-ref rwdsyqnrrpwkureqfxwb
```

JWT 검증 비활성화 함수:
```bash
cd C:/Users/js777/Desktop/haruopic && npx supabase functions deploy <함수명> --project-ref rwdsyqnrrpwkureqfxwb --no-verify-jwt
```

> 참고: SUPABASE_ACCESS_TOKEN은 .env.local에서 자동 로드됨

## 출력
- 함수별 배포 성공/실패 상태 보고
- 실패 시 에러 메시지 포함
