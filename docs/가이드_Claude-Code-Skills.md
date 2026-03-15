# Claude Code Skills 가이드

## 개요

Skills는 Claude Code의 **확장 시스템**으로, `SKILL.md` 파일에 지시사항을 작성하면 `/명령어`로 호출할 수 있는 커스텀 작업 프리셋이다.

## Skills vs Commands vs Plugins

| 구분 | 경로 | 특징 |
|------|------|------|
| **Skills** | `~/.claude/skills/` 또는 `.claude/skills/` | 공식 확장 시스템. `SKILL.md` + 리소스 파일 |
| **Commands** | `~/.claude/commands/` | SuperClaude 커맨드. `allowed-tools` 제어 가능 |
| **Plugins** | `~/.claude/plugins/` | 마켓플레이스 플러그인. Skills 포함 가능 |

## 저장 위치 (스코프별)

| 스코프 | 경로 | 적용 범위 |
|--------|------|-----------|
| **개인 (Global)** | `~/.claude/skills/스킬명/SKILL.md` | 모든 프로젝트 |
| **프로젝트** | `.claude/skills/스킬명/SKILL.md` | 해당 프로젝트만 |
| **플러그인** | `~/.claude/plugins/.../skills/스킬명/SKILL.md` | 플러그인 활성화된 곳 |

우선순위: Enterprise > 개인 > 프로젝트 (같은 이름이면 상위가 우선)

## 스킬 디렉토리 구조

```
스킬명/
├── SKILL.md           # 필수: YAML frontmatter + 마크다운 지시사항
├── references/        # 선택: 상세 문서 (필요 시 로딩)
│   └── api-docs.md
├── scripts/           # 선택: 실행 가능 스크립트
│   └── helper.py
└── assets/            # 선택: 템플릿, 아이콘 등
```

## SKILL.md 작성법

### YAML Frontmatter (설정)

```yaml
---
name: my-skill              # /slash-command 이름 (소문자, 하이픈, 최대 64자)
description: 설명            # Claude 자동 호출 판단에 사용 (핵심!)
disable-model-invocation: true   # true: 수동 호출만 (자동 호출 차단)
user-invocable: false            # false: Claude만 호출 가능 (배경 지식)
argument-hint: [인자1] [인자2]   # 자동완성에 표시될 힌트
allowed-tools: Read, Grep, Bash  # 사용 가능 도구 제한
context: fork                    # 격리된 서브에이전트에서 실행
agent: Explore                   # 서브에이전트 타입 (Explore, Plan, general-purpose)
---
```

### 주요 설정 설명

| 필드 | 필수 | 설명 |
|------|------|------|
| `name` | O | `/명령어` 이름. 소문자+하이픈만 |
| `description` | O | **트리거링 핵심**. Claude가 이 설명을 보고 자동 호출 여부를 결정 |
| `disable-model-invocation` | X | `true`면 사용자가 직접 `/명령어`로만 호출 가능 |
| `user-invocable` | X | `false`면 `/` 메뉴에 안 보임 (Claude 전용 배경 지식) |
| `allowed-tools` | X | 스킬 실행 중 권한 확인 없이 사용 가능한 도구 |
| `context: fork` | X | 메인 대화와 격리된 서브에이전트에서 실행 |

### 인자 전달

```yaml
---
name: deploy
argument-hint: [함수명] [옵션]
---

$0번째 함수를 배포하세요.
$1 옵션을 적용합니다.
$ARGUMENTS  ← 전체 인자 문자열
```

사용: `/deploy mock-test-eval --no-verify-jwt`
→ `$0` = `mock-test-eval`, `$1` = `--no-verify-jwt`, `$ARGUMENTS` = `mock-test-eval --no-verify-jwt`

### 동적 컨텍스트 주입

쉘 명령 결과를 스킬 본문에 주입 가능:

```markdown
## 현재 Git 상태
!`git status --short`

## 최근 커밋
!`git log --oneline -5`
```

`!`명령`` 구문이 실행 결과로 치환된다.

### 사용 가능한 변수

| 변수 | 설명 |
|------|------|
| `$ARGUMENTS` | 전달된 전체 인자 |
| `$0`, `$1`, `$2`... | 개별 인자 (인덱스) |
| `${CLAUDE_SESSION_ID}` | 현재 세션 ID |
| `${CLAUDE_SKILL_DIR}` | 스킬 디렉토리 절대 경로 |

## 3단계 로딩 시스템

Skills는 Progressive Disclosure로 토큰을 효율적으로 사용한다:

1. **메타데이터** (name + description) — 항상 컨텍스트에 로딩 (~100 단어)
2. **SKILL.md 본문** — 스킬 트리거 시 로딩 (500줄 이하 권장)
3. **번들 리소스** (references/, scripts/) — 필요 시에만 로딩 (무제한)

> SKILL.md는 500줄 이하로 유지. 상세 내용은 references/ 파일로 분리하고 포인터만 남긴다.

## 내장 스킬 (Claude Code 기본 제공)

| 스킬 | 용도 |
|------|------|
| `/simplify` | 변경된 코드 품질 검토 + 자동 수정 (3개 에이전트 병렬) |
| `/loop [간격] [명령]` | 주기적 반복 실행 (기본 10분). 예: `/loop 5m /check-deploy` |
| `/claude-api` | Claude API/SDK 레퍼런스 로딩 |

## 트리거링 동작 원리

1. Claude는 모든 스킬의 `name` + `description`을 항상 알고 있음
2. 사용자 메시지가 description과 매칭되면 **자동으로 스킬을 호출**할 수 있음
3. 단순한 1-step 작업은 스킬 없이 처리 → 복잡한 multi-step 작업에서 스킬이 트리거됨
4. `disable-model-invocation: true`면 자동 호출 차단, `/명령어`로만 실행

> description을 잘 쓰는 것이 핵심. "pushy"하게 작성하여 관련 상황에서 확실히 트리거되도록 한다.

## CLI 명령어 vs Skills 비교

| 항목 | CLI 명령어 | Skills |
|------|-----------|--------|
| 예시 | `/help`, `/compact`, `/model` | `/simplify`, `/deploy-ef` |
| 동작 | 고정 로직 실행 | Claude가 도구를 조합해 동적 수행 |
| 커스터마이징 | 불가 | 자유롭게 가능 |
| 자동 호출 | 안됨 | description 매칭 시 자동 호출 |
| 만들기 | 불가 (내장) | SKILL.md만 작성하면 됨 |

## 현재 이 프로젝트의 확장 체계

```
~/.claude/
├── commands/sc/          # SuperClaude 커맨드 18개
│   ├── analyze.md        # /sc:analyze
│   ├── implement.md      # /sc:implement
│   ├── improve.md        # /sc:improve
│   └── ... (15개 더)
├── plugins/              # 플러그인 스킬 15개
│   └── marketplaces/claude-plugins-official/
│       ├── plugins/skill-creator/       # /skill-creator
│       ├── plugins/frontend-design/     # /frontend-design
│       └── ...
└── skills/               # (없음 — 커스텀 스킬 미사용)
```

---

*작성일: 2026-03-13*
