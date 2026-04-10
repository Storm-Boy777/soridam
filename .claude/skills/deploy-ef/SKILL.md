---
name: deploy-ef
description: Supabase Edge Function 배포. EF 배포, 함수 배포, deploy edge function, supabase deploy 요청 시 사용. 프로젝트의 Edge Function을 Supabase에 배포하는 전체 플로우를 처리한다.
argument-hint: [함수명|all]
allowed-tools: Bash, Read, Glob
disable-model-invocation: true
---

# Edge Function 배포 스킬 (소리담)

## 배포 설정
- 프로젝트: `fkkdbnebsaecjpqhhdvl`
- 작업 디렉터리: `C:/Users/js777/Desktop/soridam`
- 토큰 환경변수: `SUPABASE_ACCESS_TOKEN`

## JWT 검증 비활성화 대상 (전체 — 모든 EF가 SA에서 service_role_key로 호출됨)
- `mock-test-process` — SA fire-and-forget → eval 체인
- `mock-test-eval` — SA/EF 체인 → consult 체인
- `mock-test-consult` — EF 체인 → report 체인
- `mock-test-report` — SA/EF 체인 → 최종 리포트
- `admin-trigger-eval` — 관리자 수동 트리거
- `scripts` — SA에서 generate/correct/refine/evaluate 호출
- `scripts-package` — SA에서 TTS 패키지 생성 호출
- `shadowing-speak-eval` — SA fire-and-forget 쉐도잉 평가
- `tutoring-diagnose` — SA fire-and-forget 진단
- `tutoring-generate-drills` — SA await 드릴 생성
- `tutoring-evaluate` — SA await 드릴 평가

## 실행 절차

### 인자가 특정 함수명인 경우
1. `supabase/functions/<함수명>/` 디렉터리 존재 확인
2. 배포 명령 실행 (모든 함수 `--no-verify-jwt` 적용)

### 인자가 `all`인 경우
1. `supabase/functions/` 아래 모든 함수 디렉터리 확인 (`_shared` 제외)
2. 각 함수를 순서대로 배포

## 배포 명령 템플릿

모든 함수 (--no-verify-jwt 필수):
```bash
cd C:/Users/js777/Desktop/soridam && npx supabase functions deploy <함수명> --project-ref fkkdbnebsaecjpqhhdvl --no-verify-jwt
```

> 참고: SUPABASE_ACCESS_TOKEN은 .env.local에서 자동 로드됨

## 출력
- 함수별 배포 성공/실패 상태 보고
- 실패 시 에러 메시지 포함
