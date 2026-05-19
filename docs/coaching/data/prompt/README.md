# Prompt 폴더 — 시스템 + 유저 프롬프트 본문

> GPT 호출에 직접 들어가는 prompt 본문. CO-STAR 구조.

---

## 파일

| 파일 | 적재 대상 | 상태 |
|------|---------|------|
| [system.md](./system.md) | `coaching_system_core` 1 row | ✅ |
| user-pass1.md | (예정) Pass 1 user prompt 템플릿 | ⏳ |
| user-pass2.md | (예정) Pass 2 user prompt 템플릿 | ⏳ |

---

## 역할

```
GPT 호출 1번 = system_message + user_message

system_message ← prompt/system.md (정적, 모든 호출 공통)
user_message   ← EF가 동적 조립:
                  · prompt/user-pass1.md (또는 pass2) 템플릿
                  · grade/{IH}.md fetch한 내용 삽입
                  · type/{description}.md fetch한 내용 삽입
                  · Session Context + Student Transcript 삽입
```

system.md는 한 번 적재하면 매 호출 재사용. user-pass1.md / user-pass2.md는 EF가 매 회차 변수 치환해서 조립.
