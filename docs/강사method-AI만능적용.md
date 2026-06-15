# 강지완 AL method 적용 — AI 만능 답변 설계

> **목적**: 강지완 OPIc AL 교본(62파일)의 방법론을 추출해, 소리담 코칭 "만능" 탭의 답변을 IH 통째대본 → **AL 골격+슬롯+격상블록**으로 업그레이드. 핵심 전환: 강사의 **"모든 변화·이슈 = 스마트폰"** 만능을 **"= AI(생성형 AI/ChatGPT)"** 로 현대화.
> **대상**: 전진성 (IM2~IH → AL · 약점 = 시제·주제유지·기본문법(수일치/관사))
> **근거**: 교본 `D:\강지완 오픽 AL 강의\편집본\교본` 62파일 · 6에이전트 추출 + 적대적 검증 워크플로우
> **연결**: `docs/만능스토리-전략분석.md` · `lib/data/universal-stories.json`(업그레이드 대상)

---

## 1. 강사 방법론의 정수 — AL 만능 답변 제작 공식

```
AL 만능 답변 = [골격단락(햄버거)] ⊕ [연결어 돌려쓰기] ⊕ [격상 어휘(such as~, among others 안에 슬쩍)]
              ⊕ [고급문법 무기(분사구문·대과거·가정법·정량화)] ⊕ [토론 결론(양면·역설·자긍심)]
              ⊕ [전달(날것·끝강세·90초+)]
```

### 🍔 골격단락(햄버거) — 모든 답변의 그릇
- Topic Sentence ×2 (AL은 시작표현 + 강화 강문장 2개) → Supporting ×3(`The first/second/last thing is that`) → Concluding(`Overall / The bottom line is that`) + 종료신호(`That's pretty much about it.`)
- 채점표 `skeleton paragraph` 체크=무조건 IH이상, `strings of sentences`=IM2 추락. **묘사 2·5·8번(현재시제)에서 측정** — 여기서 문단 못 만들면 뒤 답변 채점 반영 안 됨('우측 라인').

### ⭐ 강사의 2대 대표 만능 → 현대화
| 강사 원본 | 본 설계의 현대화 | 들어가는 자리 |
|---|---|---|
| 📱 스마트폰 = 모든 변화 | **🤖 AI = 모든 변화** | 14번 변화, 아크 F |
| 💵 돈/인플레 = 모든 이슈 | **🤖 AI = 모든 이슈** (돈/인플레는 순수 경제 이슈용 보조) | 15번 사회이슈, 아크 ! |

---

## 2. 핵심 긴장 + 화해 — "외우고 싶다" vs "통째 암기 금지"

강사: **"샘플은 외우지 말 것 — 읽어서 인지만. 암기티=감점. 통째대본=스크립트 회귀로 AL 막힘."**
사용자: **"그냥 다 외우고 싶다."**

### 화해안 — '암기의 대상'을 3층으로 분리
| 층 | 외운다? | 근거 |
|---|---|---|
| ① 소재·골격(뼈) | ✅ | 강사: 소재 미리 정하기·7골격 익히기 권장 |
| ② 격상블록(양념) — 정형구·연결어·시사어휘 | ✅ | 강사: 어휘는 창작 아닌 습득, phrase 단위 |
| ③ 표현 슬롯[ ] — 구체 명사·디테일 | ❌ 즉흥 | 강사: 말하기는 내 슬롯으로, 날것처럼 |

> 통째 대본 → **골격 + 슬롯 + 격상블록**으로 재정의. 외우는 안정감(①②)은 챙기고, 슬롯(③)만 비워 암기티 제거.
> ⚠️ 검증 지적: 슬롯 즉흥 중 시제가 또 무너질 위험(진성님 약점) → **슬롯 동사의 시제는 사전 고정**(예: 과거 사건 슬롯은 동사를 과거형으로 미리 박아둠)으로 안전장치.

---

## 3. 🤖 AI 만능 답변 — 왜 AI가 스마트폰보다 강한 피벗인가

| 강사 원본(스마트폰) | AI 업그레이드 |
|---|---|
| "요즘 화제" | **지금 가장 핫한 화제** — adv_15 "what people talk about these days"에 가장 진정성 |
| 기술·전화기 중심 | 기술·인터넷·전화기·**산업·직장·교육·음악·영화·쇼핑·교통·은행·건강**까지 |
| 양면토론 소재 보통 | **양면토론·역설 결론에 천연 소재**(편리 👍 vs 일자리·사생활 👎) |
| 정량화 약함 | **신뢰 정량화 천연**: "ChatGPT 2개월 만에 1억 사용자", "AI가 3억 일자리 영향" |

> 강사 원칙 **"선택주제도 14·15번은 사회이슈로 받아라"** + AI = **어떤 주제든 "AI가 이걸 어떻게 바꿨나/AI가 가져온 이슈"로 격상**.

### 🤖 AI 변화 만능 (14번 — 모든 변화) · 아크 F 이식
```text
[1 선언]   Honestly, when I think about how [주제] has changed, I'd say AI has completely
           transformed the way we live these days.
[2 과거불편] In the past, people had to do everything manually — [옛날행동1] and [옛날행동2],
           all by hand, doing everything on their own. It took a lot of time and effort.   (분사구문 -ing ⭐)
[3 반전]    But now, with AI, things that used to take hours can be done in a matter of seconds.
[4 기능+격상+정량화] For instance, with generative AI tools such as ChatGPT, among others,
           you can [기능1], [기능2], and even [기능3] instantly.
           In fact, ChatGPT hit a hundred million users in just two months —
           the fastest-growing app in history.   (정량화 ⭐ 실제 수치)
[5 역설 결론] The bottom line is that AI has made our lives far more convenient and efficient.   (much/far+비교급)
           But ironically, the smarter our tools become, the more dependent on them we get —
           sometimes I wonder if we're slowly losing the ability to think on our own.
           Still, there's no denying it's a total game changer. That's pretty much about it.   (역설 토론결론 + 종료신호)
```
> 주제 슬롯 교체: 음악(buy CDs → AI recommends/creates playlists) · 영화(AI generates & recommends) · 쇼핑(AI personalized recommendations) · 교통(self-driving·AI navigation) · 은행(AI fintech) · 직장(AI automates tasks) · 교육(AI tutors).

### 🤖 AI 이슈 만능 (15번 — 모든 이슈) · 아크 ! 이식
```text
[토픽 토론화] It is commonly said that AI is the hottest topic these days. AI is incredibly useful,
            but it's not all good news — still, it's something none of us can ignore.   (양면 토론화 ⭐)
[1 인식+연결] When people talk about AI, the first thing that comes to mind is how it's reshaping
            the job market, and there's a strong connection between AI and [주제].
[2 원인+정량화] As AI keeps getting smarter, more and more companies are relying on it to cut costs
            and boost efficiency. In fact, some experts estimate that AI could affect up to
            three hundred million jobs worldwide.   (정량화 ⭐)
[3 양면]     On one hand, it makes our work faster and far more productive. On the other hand,
            a large number of people are worried about losing their jobs, and there are growing
            concerns about privacy and fake information.   (a large number of people → are/worried 복수 수일치)
[4 역설+촉구 결론] In conclusion, AI is truly a double-edged sword. Ironically, the very technology
            built to help us could end up replacing us if we're not careful. So I believe it is
            imperative that we learn to use it wisely, rather than depend on it blindly.
            That's all I can think of for now.   (가주어 + imperative that+원형 learn + 역설 + incomplete ending 방지)
```
> 주제 슬롯 교체: `[주제]`=음악/영화/쇼핑/교육/의료/교통 등. 한국화 첨가 가능: "In Korea, AI is everywhere now — even in schools and hospitals."
> 보조 피벗(돈/인플레): AI 못 끼우는 순수 경제 이슈(집값·물가)엔 인플레이션 4단계(돈 토론화 → 인플레 → 관세 → 정부 촉구) 유지.

---

## 4. 만능 답변 재료 라이브러리 (검증 교정 반영)

### ⓐ 격상 어휘 매트릭스
| 평범(IH) | AL 격상 | ⚠️수일치 |
|---|---|---|
| many | numerous / countless / a large number of / a great deal of | a large number of people → **are/go**(복수) |
| many people | a large portion of the population | → **is/goes**(단수!) |
| use | take advantage of / utilize / make use of | |
| good | high-quality / sophisticated / cozy / welcoming | |
| famous | has gained fame / widely recognized / on the rise | |
| change | transform / revolutionize / reshape | |
| amazed | fascinated / captivated / stunned | |
| convenient | efficient / seamless / effortless | |

> 한 답변에 **1~3개만**(과하면 암기티). `such as ~, among others` 안에 슬쩍.

### ⓑ 용도별 연결어 (repetitive 금지 — 종류 바꿔가며)
시작 `To talk about / When it comes to` · 전환 `To get into the details` · 추가 `Moreover / On top of that` · 예시 `For instance / such as~, among others` · 인과 `Therefore / As a result` · 결론 `Overall / The bottom line is that` · 종료 `That's pretty much about it.`

### ⓒ 고급문법 무기고 (시제약점 → 무기 전환)
| 무기 | 형태 | 정형구 |
|---|---|---|
| 분사구문 -ing ⭐최강 | `~, doing X` | `I drive, listening to music.` |
| 대과거 | `had pp`(했었다) | `I had never had such an experience.` |
| 추측 | `must have pp`(였나 봐요) | `I must have lost it somewhere.` |
| 후회 | `should have pp`(했어야죠) | `I should have saved it on the cloud.` |
| 가정법 | `If I had to choose, it would be ~` | 자기소개·돌발 만능 |
| 가정법 최상 | `it couldn't have been better` | 긍정경험 마무리 |
| 비교급 강조 | `much/far + 비교급`(❌very) | `far more convenient` |
| 정량화 | 숫자/% | `100 million users in two months` |
| 가주어 | `It is commonly said that ~` | 사회이슈 도입 |

### ⓓ 마무리/결론 멘트
종료신호 `That's pretty much about it. / That's all I can think of for now.` · 양면토론 `X is useful, but it's not all good — still, ~` · 역설 `Ironically, the very technology built to help us could end up replacing us.` · 자긍심 `I'm so proud of that as a Korean.` · 추천(긍정경험) `I highly recommend it. You won't regret it.` · 미래확신 `You can bet I'll be there, without a doubt.`

> ⚠️ **검증 교정 연어**: stress는 `cause/create` (❌drive). `not long ago **that**`(❌when). `beyond my **expectations**`(복수). `consider money **important**` 또는 `think about money`.

---

## 5. 진단표 — 현행 10편이 강사 8대 요소 대비 빠진 것

| # | 스토리 | 골격 | 연결어 | 격상어휘 | 고급문법 | 토론결론 | 최우선 gap |
|---|---|:-:|:-:|:-:|:-:|:-:|---|
| 0 | 자기소개 | △ | △ | ✗ | △ | ✗ | 격상어휘·`If I had to describe myself` |
| **B** | 그날 다 고장났다 ⭐ | △ | △ | ✗ | ✗ | ✗ | **시제 3종(must have/had pp/should have)** |
| A | 제주 인생여행 | △ | △ | ✗ | △ | △ | 대과거·추천 결론 |
| C | 그 콘서트 밤 | △ | △ | ✗ | ✗ | △ | `had never had such`·미래확신 |
| E2 | 롤플12 | △ | △ | ✗ | △ | ✗ | 간접의문문·정중표현 |
| E1 | 롤플11 | △ | △ | ✗ | △ | ✗ | **질문 8~10개 부족**(관문구조) |
| **F** | 예전엔~지금은 ⭐ | △ | △ | ✗ | △ | ✗ | **AI 만능 미이식**·비교급강조 |
| D | 우리집&동네 | ✗(나열) | ✗ | ✗ | ✗ | ✗ | **햄버거 골격 자체 없음** |
| R | 일상 | △ | △ | ✗ | ✗ | ✗ | 분사구문 |
| **!** | adv15 사회이슈 ⭐ | △ | △ | ✗ | ✗ | △ | **AI/인플레 만능 미이식** |

공통 결함 3: ①격상어휘 전 스토리 ✗ ②고급문법(시제3종·분사구문) 거의 ✗ — 진성님 시제약점과 정확히 겹침 ③토론 결론 거의 ✗.

---

## 6. 검증이 짚은 누락 방법론 (보강 필수)

1. **관문구조** — 롤플11(E1)이 IM3 확보=IH 심사 시작 전제. 질문 4개=IM2. **질문 8~10개로 격상 + 우선순위 상향**.
2. **신호어 판별** — `memorable/unforgettable/special`→좋은추억 · `challenging/trouble`→곤란 · `recent/last`→최근 · `in your country`→돌발. 질문 듣자마자 유형·시제 분기(진성님 시제·주제유지 약점 직격).
3. **전달 드릴** — 끝강세(마지막 명사), 슈와 발음, 90초+, 단호한 톤, 롤플 연기. 내용뿐 아니라 전달이 AL 변별.
4. **자원배분** — 쉬운 문항(집·일상) 아끼고 돌발·12·14·15에 화력 집중.

---

## 7. 코칭 "만능" 탭 적용 계획 — `universal-stories.json` 확장

### 7-1. 스키마 확장 (기존 필드 유지 — 하위호환)
각 스토리에 AL 레이어 추가: `alSkeleton`(햄버거 골격: topic1/topic2/supporting[]/conclusion/ending) · `alWeapons`(박을 무기 배지: type/label/chunk) · `slots`(즉흥 슬롯: key/examples[]) · `memorizePolicy`(memorize=[alSkeleton,alWeapons] / improvise=[slots]).
> UI: 비트/블록에 `🔒외워(골격·격상블록)` vs `🎲즉흥(슬롯)` 배지 색 구분 → 화해안 시각화.

### 7-2. 업그레이드 우선순위
| 순위 | 스토리 | 작업 |
|:-:|---|---|
| 1 | B 그날 다 고장났다 | 시제 3종 + 역설결론 + E2 연동 |
| 2 | F 예전엔~지금은 | **🤖 AI 변화 만능** 5단계 이식 |
| 3 | ! adv15 | **🤖 AI 이슈 만능** 4단계 이식(돈/인플레 보조) |
| 4 | C·A 긍정경험 | 대과거 had + 추천/미래확신 결론 |
| 5 | E1 롤플11 | 질문 8~10개(관문) — 우선순위 상향 |
| 6~ | D·R·E2·0 | 골격화·분사구문·간접의문문 양념 |

### 7-3. 신규 추가 — 강사 대표 만능 2편(별도 frame 카드)
| 배지 | 제목 | kind | 내용 |
|:-:|---|---|---|
| 🤖 | **AI 만능 — 모든 변화 (14번)** | frame | AI 변화 만능 5단계(§3). F의 엔진으로 재사용 |
| 🤖 | **AI 만능 — 모든 이슈 (15번)** | frame | AI 이슈 만능 4단계(§3). !의 엔진으로 재사용 |
| 💵 | (보조) 돈·인플레 만능 | frame | 순수 경제 이슈용 |

---

## ☕ 한 줄 요약
> 통째 대본이 아니라 **뼈🦴 + 양념🧂**을 외우고 슬롯[ ]만 즉흥. 시제약점은 강사의 **대과거·must have·should have**로 무기화, 주제유지약점은 **햄버거 골격**이 차단. **B(고장)** 부터, 그다음 **🤖AI 변화·이슈 만능 2편**을 심으면 14·15번 화력 급상승.

*근거: 강사 교본 62파일 6에이전트 추출 + 적대적 검증(영어 연어·정량화·관문구조 교정 반영). 2026-06-09.*
