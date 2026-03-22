# evaluation_criteria_v2 — 등급 × 유형별 평가 기준표 (60행)

> consult-v2가 GPT-4.1을 호출할 때 `{criteria}` 변수에 주입되는 잣대.
> 이 기준표를 보고 GPT가 **소견(observation)**, **방향(directions)**, **약점(weak_points)**을 생성한다.
>
> 근거 자료:
> - ACTFL Proficiency Guidelines 2024 — Speaking
> - ACTFL OPIc Familiarization Guide
> - 강지완 OPIc AL 강의 (22강)
> - 실제 기출문제 509개 (10 question_types)

---

## 기준표 구조

```
target_level  | question_type           | criteria_text
--------------+-------------------------+-----------------------------------
IL            | description             | (아래 각 행 참조)
...           | ...                     | ...
AL            | advanced_15             |
```

**60행 = 6등급(IL, IM1, IM2, IM3, IH, AL) × 10유형**

---

## 1. DESCRIPTION (묘사)

> 과제: 장소, 사물, 사람의 외관/특징을 묘사
> 핵심 시제: 현재
> 기출 예: "Describe your home", "What does your favorite park look like?"

### IL + description
```
[과제 기대]
- 핵심 대상을 단어 또는 짧은 구(phrase) 수준으로 언급
- 1~2개의 기본 특징(크기, 색상, 위치 등)을 나열

[충족 기준]
- 대상의 이름 또는 핵심 특징 1개 이상 언급
- 현재시제 사용 시도 (불완전해도 가능)

[severity 판정]
- severe: 대상 자체를 특정하지 못하거나, 묘사 시도 자체가 없는 경우
- moderate: 대상은 언급했으나 특징이 전혀 없는 경우
- mild: 특징 언급은 있으나 1개에 그치는 경우
```

### IM1 + description
```
[과제 기대]
- 대상의 핵심 특징 1~2개를 단문(simple sentence)으로 설명
- 기본 형용사(big, small, nice, beautiful)를 사용한 묘사

[충족 기준]
- 핵심 특징 1개 이상을 완전한 문장으로 표현
- 현재시제 기본 사용 ("It is...", "There is...")

[severity 판정]
- severe: 문장 구성 자체가 불가능, 단어 나열만 하는 경우
- moderate: 문장은 있으나 대상의 특징을 전달하지 못하는 경우
- mild: 기본 묘사는 되지만 형용사/디테일이 매우 제한적인 경우
```

### IM2 + description
```
[과제 기대]
- 핵심 특징 2개 이상을 연속된 문장(strings of sentences)으로 설명
- 개인적 선호/감상 포함 ("I like it because...")
- 기본 연결어(and, but, so)로 문장 연결

[충족 기준]
- 핵심 특징 2개 이상 제시
- 현재시제 안정적 사용
- 개인화(감상/경험) 1회 이상 포함

[severity 판정]
- severe: 특징 1개 이하이거나, 문장 간 연결이 전혀 없는 경우
- moderate: 특징 나열은 하지만 개인화나 감상이 없는 경우
- mild: 기본 요건은 충족하나 디테일 깊이가 얕은 경우
```

### IM3 + description
```
[과제 기대]
- 핵심 특징 2~3개를 연결된 문장(connected sentences)으로 설명
- 종속절(when, where, because, which) 활용한 문장 연결
- 구체적 디테일 제공 (단순 "big" → "very spacious with high ceilings")
- 개인적 감상과 이유 포함

[충족 기준]
- 핵심 특징 2개 이상 + 구체적 디테일 동반
- 종속절을 활용한 문장 연결 2회 이상
- 현재시제 일관 사용
- 개인화(감상/경험/이유) 포함

[severity 판정]
- severe: 연결 구조 없이 단순 나열만 하는 경우 (IM2 수준)
- moderate: 연결은 있으나 디테일이 없거나 단조로운 경우
- mild: 기본 연결과 디테일은 있으나 깊이 확장이 제한적인 경우
```

### IH + description
```
[과제 기대]
- Skeleton Paragraph 구조: Topic Sentence + Supporting Sentences(3개) + Concluding Sentence
- 단락 수준(paragraph-length)의 연결된 담화
- 다양한 전환어(transition words): "the first thing is that...", "another thing is that...", "the best thing is that..."
- 세부 묘사 깊이: 용도, 분위기, 비교, 개인 경험 등
- 폭넓은 어휘 사용 (기본 형용사 → 구체적 표현)

[충족 기준]
- 문단 구조(Topic + Supporting + Concluding) 확인
- 핵심 특징 2개 이상 + 세부 묘사(용도/분위기/비교 중 1개 이상)
- 전환어를 활용한 구조적 전개
- 현재시제 안정적 사용
- 개인화(감상/경험) 포함

[severity 판정]
- severe: 문단 구조 없이 문장 나열에 그치는 경우 (IM 수준)
- moderate: 문단 구조는 있으나 세부 묘사 깊이가 부족하거나 전환어가 반복적인 경우
- mild: 문단 구조와 디테일은 있으나 어휘 폭이 제한적이거나, 일부 전환어가 반복되는 경우
```

### AL + description
```
[과제 기대]
- 강화된 Skeleton Paragraph: 두 문장의 Topic Sentence + 풍부한 Supporting + Concluding
- 추상적 표현 및 비유 활용 ("offers both convenience and a strong sense of community")
- 고급 어휘: numerous, sophisticated, spacious, stunning, breathtaking 등
- 다양한 연결 장치(cohesive devices): moreover, furthermore, on top of that, in addition
- 문장 구조 다양성: 분사 구문, 관계절, 복문 구조
- 사회적/문화적 맥락 언급 가능

[충족 기준]
- 강화된 문단 구조 (두 문장 Topic Sentence 또는 이에 준하는 정교한 도입)
- 고급 어휘 3개 이상 사용 (기본 형용사 대체)
- 다양한 연결 장치 3종 이상 (동일 연결어 반복 없음)
- 세부 묘사 깊이: 용도 + 분위기 + 개인 경험/비교 등 복합적 묘사
- 문법 정확성: 수일치, 전치사, 시제 오류 최소

[severity 판정]
- severe: IH 수준의 기본 문단에 머무는 경우 (어휘/연결어/구조 심화 없음)
- moderate: 심화 시도는 있으나, 어휘 반복, 연결어 단조, 또는 문법 오류가 2개 이상인 경우
- mild: 전반적으로 양호하나 일부 영역(어휘 폭 또는 연결어 다양성)에서 미세한 부족이 있는 경우
```

---

## 2. ROUTINE (루틴/습관)

> 과제: 반복적 활동, 일상 절차를 순서대로 설명
> 핵심 시제: 현재(습관)
> 기출 예: "What do you usually do when you go to the park?", "Tell me about your daily routine"

### IL + routine
```
[과제 기대]
- 활동 1~2개를 단어/구 수준으로 나열

[충족 기준]
- 활동 관련 단어 또는 짧은 표현 1개 이상

[severity 판정]
- severe: 활동 언급 자체가 없는 경우
- moderate: 관련 없는 단어만 나열하는 경우
- mild: 활동 1개만 매우 짧게 언급하는 경우
```

### IM1 + routine
```
[과제 기대]
- 활동 2~3개를 단문으로 나열
- 기본적인 순서 표현 시도 ("First... Then...")

[충족 기준]
- 활동 2개 이상을 문장으로 표현
- 현재시제 또는 습관 표현 사용 시도

[severity 판정]
- severe: 활동을 문장으로 표현하지 못하는 경우
- moderate: 활동 나열은 하지만 순서감이 전혀 없는 경우
- mild: 기본 나열은 되지만 활동이 2개 이하인 경우
```

### IM2 + routine
```
[과제 기대]
- 활동 3개 이상을 연속 문장으로 나열
- 빈도 표현 1개 이상 (usually, sometimes, every day)
- 기본 순서 연결 (and then, after that)

[충족 기준]
- 활동 나열 3개 이상
- 빈도 표현 사용 1회 이상
- 현재시제 기본 사용
- 기본 순서 연결어 사용

[severity 판정]
- severe: 활동 2개 이하이거나 순서 연결이 전혀 없는 경우
- moderate: 활동 나열은 하지만 빈도 표현이 없는 경우
- mild: 기본 요건은 충족하나 활동 간 전환이 단조로운 경우
```

### IM3 + routine
```
[과제 기대]
- 활동들을 시간 순서대로 연결된 문장으로 설명
- 다양한 빈도 표현 (usually, typically, from time to time, every now and then)
- 종속절 활용 ("When I get home, I usually...")
- 활동에 대한 이유/설명 추가

[충족 기준]
- 활동 나열 3개 이상 + 시간 순서 명확
- 빈도 표현 2종 이상 사용
- 종속절 활용 문장 연결 1회 이상
- 현재시제 일관 사용

[severity 판정]
- severe: 순서 연결 없이 무작위 나열하는 경우 (IM2 수준)
- moderate: 순서는 있으나 빈도 표현이 1종 이하이거나, 시제 혼용이 있는 경우
- mild: 기본 구조는 갖추었으나 활동 설명에 깊이가 부족한 경우
```

### IH + routine
```
[과제 기대]
- 문단 구조(Skeleton Paragraph)로 루틴 설명
- 다양한 빈도 부사 (usually, often, sometimes, every now and then, from time to time)
- 다양한 순서 연결어 (first, then, after that, once I'm done, finally)
- 각 활동에 대한 구체적 디테일 (왜, 어떻게, 어디서)
- 현재시제 일관적 사용 (would 반복 사용 시 감점)

[충족 기준]
- 문단 구조 확인 (Topic + Supporting + Concluding)
- 빈도 표현 2종 이상 + 순서 연결어 2종 이상
- 활동에 대한 구체적 디테일 1개 이상
- 현재시제 일관 사용 (would 반복 없음)

[severity 판정]
- severe: 문단 구조 없이 나열에 그치거나, 시제 혼용(would 반복)이 심한 경우
- moderate: 문단 구조는 있으나 빈도/순서 표현이 단조롭거나, 디테일이 부족한 경우
- mild: 전반적으로 양호하나 일부 빈도 표현 또는 연결어가 반복되는 경우
```

### AL + routine
```
[과제 기대]
- 강화된 문단 구조 + 고급 어휘
- 활동의 이유, 배경, 의미까지 설명 ("I make it a point to... because it helps me...")
- 다양한 연결 장치: moreover, on top of that, additionally, in the meantime
- 습관의 변화/발전을 자연스럽게 언급 가능
- 분사 구문, 복문 구조 활용

[충족 기준]
- 강화된 문단 구조
- 고급 어휘 3개 이상 (기본 동사/형용사 대체)
- 다양한 연결 장치 3종 이상
- 활동의 이유/의미 설명 포함
- 현재시제 완벽 일관 + 문법 정확

[severity 판정]
- severe: IH 수준의 기본 문단에 머무는 경우
- moderate: 심화 시도는 있으나, 어휘 반복 또는 연결어 단조
- mild: 전반적으로 양호하나 일부 심화 영역에서 미세한 부족
```

---

## 3. COMPARISON (비교/변화)

> 과제: 과거와 현재를 비교하여 변화 설명
> 핵심 시제: 과거 + 현재 교차
> 기출 예: "How was your childhood home different from now?", "How has technology changed?"

### IL + comparison
```
[과제 기대]
- 비교 대상 중 한쪽을 단어/구로 언급

[충족 기준]
- 과거 또는 현재 한쪽이라도 언급

[severity 판정]
- severe: 비교 대상 자체를 인식하지 못하는 경우
- moderate: 한쪽만 단어 수준으로 언급하는 경우
- mild: 한쪽은 언급했으나 비교 시도가 없는 경우
```

### IM1 + comparison
```
[과제 기대]
- 과거와 현재를 각각 단문으로 언급
- 기본 시제 구분 시도 ("It was... Now it is...")

[충족 기준]
- 과거와 현재 두 시점 모두 언급
- 시제 구분 시도 (불완전해도 가능)

[severity 판정]
- severe: 한쪽 시점만 언급하는 경우
- moderate: 두 시점 모두 언급하나 시제 구분이 전혀 없는 경우
- mild: 시제 구분 시도는 있으나 오류가 빈번한 경우
```

### IM2 + comparison
```
[과제 기대]
- 과거와 현재를 각각 2~3문장으로 설명
- 기본 비교 표현 사용 ("different from", "compared to", "but now")
- 비교 관점 1개 이상 명확히 제시

[충족 기준]
- 두 시점(과거/현재) 명확히 구분
- 비교 표현 1개 이상 사용
- 비교 관점 1개 이상 제시
- 과거 시제/현재 시제 기본 구분

[severity 판정]
- severe: 비교 구조 없이 한 시점만 서술하는 경우
- moderate: 두 시점 언급은 하지만 비교 표현이 없거나, 관점이 불명확한 경우
- mild: 비교 구조는 있으나 한쪽 시점의 설명이 빈약한 경우
```

### IM3 + comparison
```
[과제 기대]
- 두 시점을 연결된 문장으로 대비
- 비교 표현 2개 이상 ("compared to", "unlike", "on the other hand")
- 비교 관점 2개 이상 (크기, 위치, 편의성, 분위기 등)
- 변화의 이유나 배경 1개 이상 언급
- 과거/현재 시제 정확한 교차 사용

[충족 기준]
- 비교 표현 2개 이상 사용
- 비교 관점 2개 이상 제시
- 시제 교차 사용 기본 성공
- 변화의 이유/배경 언급

[severity 판정]
- severe: 비교 관점 1개 이하이거나, 시제 교차가 안 되는 경우
- moderate: 관점은 있으나 비교 표현 부족, 또는 변화 이유가 없는 경우
- mild: 기본 비교는 성공했으나 깊이 확장이 제한적인 경우
```

### IH + comparison
```
[과제 기대]
- 문단 구조로 과거와 현재를 체계적으로 대비
- 비교 관점 2개 이상 + 각 관점별 구체적 설명
- 다양한 비교 표현/연결어 ("unlike", "while", "whereas", "on the flip side")
- 변화의 원인/배경 구체적 설명
- 과거/현재 시제 안정적 교차 사용

[충족 기준]
- 문단 구조 확인
- 비교 관점 2개 이상 + 각 관점별 세부 설명
- 비교 표현/연결어 2종 이상
- 변화의 원인/배경 설명
- 시제 교차 안정적 사용 (과거 시제 반 이상 성공)

[severity 판정]
- severe: 문단 구조 없이 나열하거나, 비교 관점이 1개 이하인 경우
- moderate: 문단 구조는 있으나 관점별 세부 설명이 부족하거나, 시제 오류가 빈번한 경우
- mild: 전반적으로 양호하나 비교 표현이 반복적이거나, 변화 원인 설명이 피상적인 경우
```

### AL + comparison
```
[과제 기대]
- 강화된 문단 구조로 체계적 비교
- 비교 관점 3개 이상 + 사회적/문화적 맥락 포함
- 변화의 원인을 거시적 관점에서 분석 ("with technological advancements", "due to urbanization")
- 고급 비교 표현: "in stark contrast", "has undergone significant changes"
- 관점/평가 제시: "The biggest game changer is..."
- 과거/현재 시제 거의 완벽한 교차 (80~90% 정확)

[충족 기준]
- 강화된 문단 구조
- 비교 관점 3개 이상 + 사회적/문화적 맥락
- 고급 어휘/표현 3개 이상
- 거시적 원인 분석 포함
- 시제 교차 거의 완벽 (80% 이상 정확)

[severity 판정]
- severe: IH 수준의 기본 비교에 머무는 경우 (사회적 맥락/분석 없음)
- moderate: 분석 시도는 있으나, 피상적이거나 어휘/표현이 제한적인 경우
- mild: 전반적으로 양호하나 시제 정확성 또는 연결어 다양성에서 미세한 부족
```

---

## 4. PAST_EXPERIENCE_CHILDHOOD (어린 시절 경험)

> 과제: 어린 시절의 특정 기억/경험을 회상하여 서술
> 핵심 시제: 과거
> 기출 예: "Tell me about a holiday memory from your childhood", "Describe a trip you took when you were young"

### IL + past_experience_childhood
```
[과제 기대]
- 어린 시절 관련 단어/구 수준 언급

[충족 기준]
- 어린 시절과 관련된 단어 또는 짧은 표현 1개 이상

[severity 판정]
- severe: 과거 경험 언급 자체가 없는 경우
- moderate: 관련 없는 내용을 말하는 경우
- mild: 어린 시절을 언급했으나 경험 서술이 없는 경우
```

### IM1 + past_experience_childhood
```
[과제 기대]
- 어린 시절 경험 1개를 단문으로 서술
- 과거 시제 사용 시도

[충족 기준]
- 어린 시절 에피소드 1개 언급
- 과거 시제 사용 시도 (불완전해도 가능)

[severity 판정]
- severe: 에피소드가 아닌 단순 사실만 나열하는 경우
- moderate: 에피소드는 있으나 과거 시제 시도가 전혀 없는 경우
- mild: 기본 서술은 하지만 매우 짧은 경우
```

### IM2 + past_experience_childhood
```
[과제 기대]
- 어린 시절 에피소드를 3~4문장으로 서술
- 과거 시제 기본 사용 ("I used to", "When I was young")
- 장소, 활동, 함께한 사람 중 1개 이상 구체화

[충족 기준]
- 에피소드 서술 3문장 이상
- 과거 시제/과거 습관 표현 사용
- 구체적 디테일 1개 이상 (장소/활동/사람)

[severity 판정]
- severe: 에피소드 없이 일반론만 말하는 경우
- moderate: 에피소드는 있으나 디테일이 없는 경우
- mild: 기본 서술은 되지만 감정/인상 표현이 없는 경우
```

### IM3 + past_experience_childhood
```
[과제 기대]
- 에피소드를 연결된 문장으로 시간 순서에 따라 서술
- 과거 시제 + 과거 습관("used to") 안정적 사용
- 감정/인상 표현 포함 ("I remember feeling...", "It was amazing")
- 현재와의 연결 ("Unlike now...", "As for now...")

[충족 기준]
- 시간 순서에 따른 연결된 서술
- 과거 시제 안정적 사용
- 감정/인상 표현 1회 이상
- 현재와의 연결 또는 회고적 표현

[severity 판정]
- severe: 시간 순서 없이 단편적 나열만 하는 경우
- moderate: 순서는 있으나 감정/인상이 전혀 없는 경우
- mild: 기본 서술은 좋으나 현재와의 연결이 없는 경우
```

### IH + past_experience_childhood
```
[과제 기대]
- 문단 구조로 어린 시절 경험을 체계적 서술
- 과거 시제/습관 표현 안정적 사용 (반 이상 정확)
- "When I was young, I used to..." + 구체적 에피소드 + 현재와의 대비
- 감정/인상의 구체적 표현
- 회고적 마무리 ("I still remember...", "I miss those days")

[충족 기준]
- 문단 구조 확인
- 과거 시제 반 이상 정확 사용
- 구체적 에피소드 + 감정/인상
- 현재와의 대비 또는 회고적 마무리

[severity 판정]
- severe: 문단 구조 없거나, 과거 시제 오류가 심각한 경우
- moderate: 문단 구조는 있으나 감정/인상이 없거나, 에피소드가 피상적인 경우
- mild: 전반적으로 양호하나 회고적 깊이가 부족한 경우
```

### AL + past_experience_childhood
```
[과제 기대]
- 강화된 문단 구조로 풍부한 서사
- 과거 시제 거의 완벽 (80~90% 정확): used to, was/were -ing, had PP
- 생생한 장면 묘사 ("I can still picture myself...", "I vividly remember")
- 감정의 깊이와 성찰 ("It taught me...", "Looking back, I realize...")
- 고급 어휘와 다양한 연결 장치
- 현재와의 연결에서 성장/변화를 분석적으로 서술

[충족 기준]
- 강화된 문단 구조 + 풍부한 서사
- 과거 시제 80% 이상 정확 (had PP, used to, was -ing 포함)
- 생생한 장면 묘사 + 감정 표현
- 성찰적/분석적 회고
- 고급 어휘 3개 이상 + 다양한 연결 장치

[severity 판정]
- severe: IH 수준의 기본 서술에 머무는 경우
- moderate: 서사는 있으나 시제 정확성 또는 성찰적 깊이 부족
- mild: 전반적으로 양호하나 어휘 폭 또는 연결어 다양성에서 미세한 부족
```

---

## 5. PAST_EXPERIENCE_MEMORABLE (기억에 남는 경험)

> 과제: 특별하거나 예상치 못한 경험, 문제 상황과 해결 과정을 스토리텔링
> 핵심 시제: 과거 (내러티브)
> 기출 예: "Tell me about a time you had a problem with...", "Tell me about a memorable experience"

### IL + past_experience_memorable
```
[과제 기대]
- 경험 관련 단어/구 수준 언급

[충족 기준]
- 경험과 관련된 단어 1개 이상

[severity 판정]
- severe: 경험 언급 자체가 없는 경우
- moderate: 관련 없는 내용만 말하는 경우
- mild: 경험을 암시하지만 서술이 없는 경우
```

### IM1 + past_experience_memorable
```
[과제 기대]
- 경험 1개를 2~3개 단문으로 서술
- 과거 시제 사용 시도

[충족 기준]
- 에피소드 1개 + 과거 시제 시도

[severity 판정]
- severe: 에피소드 서술이 아닌 일반론만 하는 경우
- moderate: 에피소드는 있으나 시제가 전혀 과거가 아닌 경우
- mild: 기본 서술은 하지만 매우 짧은 경우
```

### IM2 + past_experience_memorable
```
[과제 기대]
- 에피소드를 시작-중간-끝(beginning-middle-end) 기본 구조로 서술
- 과거 시제 사용 ("I went", "It happened")
- 문제 상황 또는 특별한 점 1개 언급

[충족 기준]
- 시작-끝 구조가 어느 정도 있는 서술
- 과거 시제 기본 사용
- 특별한 점 또는 문제 상황 언급

[severity 판정]
- severe: 내러티브 구조 없이 사실만 나열하는 경우
- moderate: 구조는 있으나 "기억에 남는" 이유가 없는 경우
- mild: 기본 서술은 되지만 감정 표현이 없는 경우
```

### IM3 + past_experience_memorable
```
[과제 기대]
- 시작→전개→위기→해결 구조의 연결된 서술
- 과거 시제 안정적 사용
- 문제 상황의 구체적 묘사 + 자신의 반응/감정
- 연결어로 서사 흐름 유지

[충족 기준]
- 내러티브 구조 (시작→전개→위기/해결)
- 과거 시제 안정적 사용
- 문제 상황 + 반응/감정 표현
- 연결어 활용한 서사 흐름

[severity 판정]
- severe: 서사 흐름 없이 단편적인 경우
- moderate: 흐름은 있으나 위기/해결 구조가 없는 경우
- mild: 기본 서사는 좋으나 감정 깊이가 부족한 경우
```

### IH + past_experience_memorable
```
[과제 기대]
- 문단 구조로 완결된 서사 전개
- 과거 시제 반 이상 정확 (단순 과거 + 과거 진행)
- 문제 발생→대처→결과→교훈/감상의 완결 구조
- 감정 표현의 구체성 ("My heart was pounding", "I couldn't believe it")
- 다양한 전환어로 서사 흐름 관리

[충족 기준]
- 문단 구조의 완결된 서사
- 과거 시제 반 이상 정확
- 문제→대처→결과 구조 완성
- 구체적 감정 표현 1회 이상
- 전환어 활용

[severity 판정]
- severe: 문단 구조 없거나, 완결되지 않은 서사
- moderate: 구조는 있으나 감정 표현 없거나, 시제 오류 빈번
- mild: 전반적으로 양호하나 교훈/감상 마무리가 약한 경우
```

### AL + past_experience_memorable
```
[과제 기대]
- 강화된 문단 구조로 풍부하고 생생한 서사
- 과거 시제 거의 완벽 (80~90%): had PP(대과거), was -ing, must have PP
- 핵심 문법: "must have lost it" (추측), "should have been more careful" (가정법)
- 장면의 생생한 묘사 + 감정의 깊이
- 고급 어휘와 다양한 연결 장치
- 교훈/성찰적 마무리 ("I learned that...", "It made me realize...")
- "from beginning to end" 완결된 서사

[충족 기준]
- 강화된 문단 구조 + 완결된 서사
- had PP 또는 must have PP/should have PP 1회 이상 사용
- 과거 시제 80% 이상 정확
- 생생한 장면 묘사 + 깊은 감정 표현
- 교훈/성찰 포함
- 고급 어휘 3개 이상

[severity 판정]
- severe: IH 수준의 기본 서사에 머무는 경우 (고급 시제/어휘 없음)
- moderate: 서사는 풍부하나 고급 시제 사용이 부족하거나, 성찰이 없는 경우
- mild: 전반적으로 양호하나 had PP/must have PP 사용이 없거나, 어휘 폭이 제한적인 경우
```

---

## 6. PAST_EXPERIENCE_RECENT (최근 경험)

> 과제: 가장 최근에 한 경험을 구체적으로 서술
> 핵심 시제: 과거 (특정 시점)
> 기출 예: "Tell me about the last time you went to a park", "When was the last time you ate at a restaurant?"

### IL + past_experience_recent
```
[과제 기대]
- 최근 활동 관련 단어/구 수준 언급

[충족 기준]
- 최근 활동 관련 단어 1개 이상

[severity 판정]
- severe: 활동 언급이 없는 경우
- moderate: 관련 없는 내용인 경우
- mild: 활동은 암시하나 서술이 없는 경우
```

### IM1 + past_experience_recent
```
[과제 기대]
- 최근 경험 1개를 2~3개 단문으로 서술
- 시점 언급 시도 ("Last week...", "A few days ago...")

[충족 기준]
- 최근 에피소드 1개 + 과거 시제 시도

[severity 판정]
- severe: 에피소드 서술이 없는 경우
- moderate: 에피소드는 있으나 시점이 전혀 없는 경우
- mild: 기본 서술은 하지만 매우 짧은 경우
```

### IM2 + past_experience_recent
```
[과제 기대]
- 최근 에피소드를 4~5문장으로 시간 순서에 따라 서술
- 구체적 시점 명시 ("It was about two weeks ago")
- 장소, 활동, 함께한 사람 등 디테일 포함

[충족 기준]
- 시점 명시 + 시간 순서 서술
- 과거 시제 기본 사용
- 구체적 디테일 1개 이상

[severity 판정]
- severe: 시점/순서 없이 일반론만 하는 경우
- moderate: 순서는 있으나 시점이 없거나, 디테일이 없는 경우
- mild: 기본 서술은 되지만 감정/평가가 없는 경우
```

### IM3 + past_experience_recent
```
[과제 기대]
- 연결된 문장으로 시작부터 끝까지 서술
- 과거 시제 안정적 사용
- 구체적 디테일 (장소/시간/활동/사람)
- 경험에 대한 감상/평가 포함

[충족 기준]
- 시작→끝 구조의 연결된 서술
- 과거 시제 안정적 사용
- 디테일 2개 이상
- 감상/평가 표현

[severity 판정]
- severe: 연결 구조 없이 단편적인 경우
- moderate: 구조는 있으나 디테일 또는 감상이 없는 경우
- mild: 기본 서술은 좋으나 깊이가 부족한 경우
```

### IH + past_experience_recent
```
[과제 기대]
- 문단 구조로 최근 경험을 상세히 서술
- 과거 시제 반 이상 정확
- "처음부터 끝까지" 완결된 서술
- 구체적 장면 묘사 + 감정/평가
- 다양한 전환어로 서사 흐름 관리

[충족 기준]
- 문단 구조 확인
- 과거 시제 반 이상 정확
- 완결된 서술 (시작→경과→마무리)
- 감정/평가 표현 포함

[severity 판정]
- severe: 문단 구조 없거나 완결되지 않은 서술
- moderate: 구조는 있으나 장면 묘사 또는 감정이 부족한 경우
- mild: 전반적으로 양호하나 전환어가 단조로운 경우
```

### AL + past_experience_recent
```
[과제 기대]
- 강화된 문단 구조로 상세하고 생생한 서술
- 과거 시제 거의 완벽 (80~90%)
- 풍부한 디테일: 장소/시간/활동/사람/분위기
- 생생한 장면 묘사 + 감정의 깊이
- 고급 어휘와 다양한 연결 장치
- 경험의 의미/가치에 대한 평가 ("I highly recommend...", "It was one of the best...")

[충족 기준]
- 강화된 문단 구조 + 상세한 서술
- 과거 시제 80% 이상 정확
- 풍부한 디테일 + 생생한 묘사
- 의미/가치 평가 포함
- 고급 어휘 3개 이상

[severity 판정]
- severe: IH 수준의 기본 서술에 머무는 경우
- moderate: 서술은 풍부하나 어휘/연결어가 제한적이거나 시제 오류가 있는 경우
- mild: 전반적으로 양호하나 일부 영역에서 미세한 부족
```

---

## 7. ROLEPLAY_11 (롤플레이 - 질문하기)

> 과제: 주어진 상황에서 상대방에게 3~4개의 질문으로 정보 수집
> 핵심: 의문문 생성 능력
> 기출 예: "Call the bank and ask 3-4 questions", "Ask your friend 3-4 questions about the movie"

### IL + roleplay_11
```
[과제 기대]
- 질문 시도 1개 (불완전해도 가능)

[충족 기준]
- 의문문 형태의 발화 1개 이상

[severity 판정]
- severe: 질문 시도 자체가 없는 경우
- moderate: 질문이 아닌 서술문만 하는 경우
- mild: 질문 시도는 있으나 의문문 구조가 불완전한 경우
```

### IM1 + roleplay_11
```
[과제 기대]
- 간단한 질문 2~3개 ("What time...?", "How much...?")
- 기본 의문문 구조 사용

[충족 기준]
- 의문문 2개 이상
- 상황에 관련된 질문

[severity 판정]
- severe: 질문 1개 이하인 경우
- moderate: 질문은 있으나 상황과 무관한 경우
- mild: 질문은 관련되지만 매우 단순한 경우
```

### IM2 + roleplay_11
```
[과제 기대]
- 질문 3~4개 이상
- 상황에 적절한 정보 수집 질문 (가격, 시간, 위치 등)
- 기본적인 전화/대면 도입 인사

[충족 기준]
- 질문 3개 이상
- 도입 인사 또는 상황 설명
- 질문이 상황에 적절

[severity 판정]
- severe: 질문 2개 이하인 경우
- moderate: 질문은 3개이지만 질문 간 연결이 없고 단발적인 경우
- mild: 기본 요건은 충족하나 질문이 단조로운 경우
```

### IM3 + roleplay_11
```
[과제 기대]
- 연속적이고 복잡한 질문 4~6개
- 꼬리 질문(follow-up) 사용 ("And if so, how much would it be?")
- 복잡한 의문문 구조 ("Would it be possible to...?", "I was wondering if...")
- 상황에 맞는 자연스러운 도입과 마무리

[충족 기준]
- 질문 4개 이상
- 꼬리 질문 또는 복잡한 의문문 1개 이상
- 자연스러운 도입/마무리
- 질문 간 연결성

[severity 판정]
- severe: 질문이 단발적이고 연결 없는 경우 (IM2 수준)
- moderate: 연속적이지만 복잡한 질문이 없는 경우
- mild: 기본 연속 질문은 하지만 꼬리 질문이 부족한 경우
```

### IH + roleplay_11
```
[과제 기대]
- 연속적이고 복잡한 질문 6~8개
- 다양한 의문문 유형: Wh-, Yes/No, 간접 의문문, 정중 표현
- 꼬리 질문으로 확장 ("That sounds great. And what about...?")
- 정중한 표현 ("Would it be possible to...?", "I was wondering if...")
- 자연스러운 대화 흐름 (도입→질문들→마무리)
- 만능 마무리: "Is there anything else I need to know?"

[충족 기준]
- 질문 6개 이상
- 복잡한 의문문/정중 표현 2개 이상
- 꼬리 질문 1개 이상
- 자연스러운 대화 흐름
- 적절한 마무리

[severity 판정]
- severe: 질문 4개 이하이거나, 단순 의문문만 반복하는 경우
- moderate: 질문 수는 충분하나 정중 표현 또는 꼬리 질문이 없는 경우
- mild: 전반적으로 양호하나 의문문 유형이 단조로운 경우
```

### AL + roleplay_11
```
[과제 기대]
- 연속적이고 정교한 질문 8~10개
- 다양한 의문문 유형 + 정중 표현 + 간접 의문문
- 상황에 완벽히 몰입한 자연스러운 대화
- 꼬리 질문의 자연스러운 확장
- 고급 표현: "I was wondering if you could...", "Would you happen to know...?"
- 관계 형용절/분사구 활용한 복잡한 질문 ("that is newly released", "that suits my needs")
- 만능 마무리 + 감사 표현

[충족 기준]
- 질문 8개 이상
- 고급 의문문 표현 3개 이상
- 꼬리 질문 2개 이상
- 자연스러운 대화 흐름 + 상황 몰입
- 문법 정확

[severity 판정]
- severe: IH 수준의 질문 수/복잡도에 머무는 경우
- moderate: 질문 수는 충분하나 고급 표현이 부족하거나, 대화 흐름이 부자연스러운 경우
- mild: 전반적으로 양호하나 일부 의문문이 반복적이거나 문법 오류가 있는 경우
```

---

## 8. ROLEPLAY_12 (롤플레이 - 문제 해결/대안 제시)

> 과제: 문제 상황을 설명하고 2~3개의 대안 제시
> 핵심: 문제 설명 + 해결책 제시
> 기출 예: "Your order has a problem. Call the store, explain, and offer alternatives"

### IL + roleplay_12
```
[과제 기대]
- 문제가 있다는 것을 단어/구로 표현 시도

[충족 기준]
- 문제 상황 관련 단어 1개 이상

[severity 판정]
- severe: 문제 인식 자체가 없는 경우
- moderate: 관련 없는 내용만 말하는 경우
- mild: 문제를 암시하지만 표현이 불완전한 경우
```

### IM1 + roleplay_12
```
[과제 기대]
- 문제 상황을 1~2문장으로 설명
- 해결책 시도 ("Can you help me?")

[충족 기준]
- 문제 상황 설명 1문장 이상
- 도움 요청 또는 해결 시도

[severity 판정]
- severe: 문제 설명이 전혀 없는 경우
- moderate: 문제 설명은 있으나 해결 시도가 없는 경우
- mild: 기본 시도는 있으나 매우 짧은 경우
```

### IM2 + roleplay_12
```
[과제 기대]
- 문제 상황을 3~4문장으로 설명
- 대안 1개 이상 제시 ("Can you exchange it?", "Can I get a refund?")
- 기본 전화/대면 도입

[충족 기준]
- 문제 상황 구체적 설명
- 대안 1개 이상 제시
- 상황에 맞는 도입

[severity 판정]
- severe: 문제 설명이 모호하고 대안이 없는 경우
- moderate: 문제 설명은 있으나 대안이 없는 경우
- mild: 문제+대안은 있으나 대안이 1개이고 단순한 경우
```

### IM3 + roleplay_12
```
[과제 기대]
- 문제 상황을 구체적으로 설명 + 감정 표현
- 대안 2개 이상 제시
- 정중하지만 assertive한 톤
- 연결어로 문제→대안 흐름 관리

[충족 기준]
- 문제 상황 구체적 설명 (무엇이 어떻게 잘못되었는지)
- 대안 2개 이상 제시
- 정중한 표현 사용
- 문제→대안 흐름 연결

[severity 판정]
- severe: 문제만 설명하고 대안이 없거나 1개인 경우
- moderate: 대안 2개는 있으나 구체성이 부족한 경우
- mild: 기본 구조는 좋으나 정중 표현 또는 감정 표현이 부족한 경우
```

### IH + roleplay_12
```
[과제 기대]
- 문제 상황의 상세 설명 + 당황 표현 ("I don't know what to do")
- 대안 2~3개 구체적 제시 (교환/환불/일정 변경 등)
- 해결을 위한 정중하고 구조적인 접근
- 상황에 맞는 도입, 전개, 마무리
- 전환어로 문제→대안→마무리 관리

[충족 기준]
- 문제 상황 상세 설명 + 감정/당황 표현
- 대안 2개 이상 구체적 제시
- 정중한 표현 + 구조적 전개
- 적절한 마무리

[severity 판정]
- severe: 문제 설명이 모호하거나 대안이 1개 이하인 경우
- moderate: 문제+대안은 있으나 대안이 비구체적이거나, 정중 표현이 부족한 경우
- mild: 전반적으로 양호하나 마무리가 약하거나, 대안 간 연결이 단조로운 경우
```

### AL + roleplay_12
```
[과제 기대]
- 문제 상황의 정확하고 상세한 설명 + 원인 분석
- 당황 표현 + 강력한 감정 표현
- 대안 3개 이상의 구체적이고 실현 가능한 제시
- 고급 표현: "should have double-checked", "There must have been some miscommunication"
- 협상/설득 톤: "Would it be possible to...?", "I'd really appreciate if..."
- 완벽한 대화 구조: 도입→문제 설명→감정→대안→마무리
- 만능 마무리: "Do you have any other better solutions?"

[충족 기준]
- 문제 상황 상세 설명 + 원인 분석
- 대안 3개 이상 구체적 제시
- 고급 표현 (should have PP, must have PP) 1개 이상
- 완벽한 대화 구조
- 문법 정확

[severity 판정]
- severe: IH 수준의 기본 문제 해결에 머무는 경우 (고급 표현/원인 분석 없음)
- moderate: 대안은 충분하나 고급 표현이 부족하거나, 협상 톤이 약한 경우
- mild: 전반적으로 양호하나 should have PP/must have PP 사용이 없거나, 마무리가 약한 경우
```

---

## 9. ADVANCED_14 (비교/변화 심화)

> 과제: 사회적 변화, 세대 간 차이, 두 대상의 심층 비교 분석
> 핵심: 거시적 관점의 분석적 비교
> 기출 예: "How has food shopping changed over the last 20 years?", "Compare two friends"
> 참고: 14번은 IH/AL 변별 문항. IL~IM3에서는 이 문항을 만나지 않지만, 기준표 일관성을 위해 포함.

### IL + advanced_14
```
[과제 기대]
- 비교 대상 중 한쪽을 단어/구로 언급 시도

[충족 기준]
- 비교 주제와 관련된 단어 1개 이상

[severity 판정]
- severe: 주제 인식 자체가 없는 경우
- moderate: 관련 없는 내용만 말하는 경우
- mild: 주제를 인식했으나 비교 시도가 없는 경우
```

### IM1 + advanced_14
```
[과제 기대]
- 비교 대상을 단문으로 각각 언급
- 차이점 1개 시도

[충족 기준]
- 두 대상/시점 모두 언급
- 차이점 또는 유사점 1개 시도

[severity 판정]
- severe: 한쪽만 언급하는 경우
- moderate: 양쪽 언급하나 비교 시도가 없는 경우
- mild: 비교 시도는 있으나 매우 피상적인 경우
```

### IM2 + advanced_14
```
[과제 기대]
- 과거와 현재 또는 두 대상을 각각 3~4문장으로 서술
- 기본 비교 표현 사용
- 비교 관점 1~2개 제시

[충족 기준]
- 양쪽 모두 문장 수준 서술
- 비교 표현 사용
- 비교 관점 1개 이상

[severity 판정]
- severe: 비교 구조 없이 한쪽만 서술하는 경우
- moderate: 양쪽 서술하나 비교 관점이 불명확한 경우
- mild: 기본 비교는 하지만 분석이 없는 경우
```

### IM3 + advanced_14
```
[과제 기대]
- 연결된 문장으로 체계적 비교
- 비교 관점 2개 이상
- 변화의 원인 또는 배경 1개 이상
- 비교 표현/연결어 활용

[충족 기준]
- 비교 관점 2개 이상 + 원인/배경
- 비교 표현 2개 이상
- 시제 교차 사용

[severity 판정]
- severe: 비교 관점 1개 이하인 경우
- moderate: 관점은 있으나 원인/배경이 없는 경우
- mild: 기본 비교는 좋으나 분석적 깊이가 부족한 경우
```

### IH + advanced_14
```
[과제 기대]
- 문단 구조로 체계적 비교/분석
- 비교 관점 2~3개 + 각 관점별 구체적 설명
- 사회적/기술적 변화의 원인 분석
- 다양한 비교 표현/연결어
- 시제 교차 안정적 사용

[충족 기준]
- 문단 구조 확인
- 비교 관점 2개 이상 + 세부 설명
- 변화 원인 분석
- 비교 표현/연결어 다양
- 시제 안정적 교차

[severity 판정]
- severe: 문단 구조 없이 단순 나열하는 경우
- moderate: 구조는 있으나 분석이 피상적이거나, 원인 설명이 없는 경우
- mild: 전반적으로 양호하나 비교 표현이 반복적인 경우
```

### AL + advanced_14
```
[과제 기대]
- 강화된 문단 구조로 거시적 분석
- 사회적/기술적/문화적 맥락에서의 변화 분석
- "The biggest game changer is..." 수준의 핵심 관점 제시
- 고급 비교 표현: "in stark contrast", "has undergone significant changes", "a paradigm shift"
- 구체적 사례와 추상적 분석의 결합
- 관점/평가/전망 제시
- 시제 교차 거의 완벽 (80% 이상)
- 고급 어휘 + 다양한 연결 장치

[충족 기준]
- 강화된 문단 구조 + 거시적 분석
- 사회적/기술적/문화적 맥락 포함
- 핵심 관점/평가 제시 ("biggest change", "most significant factor")
- 고급 어휘/표현 3개 이상
- 시제 80% 이상 정확
- 다양한 연결 장치 3종 이상

[severity 판정]
- severe: IH 수준의 기본 비교에 머무는 경우 (거시적 분석/관점 없음)
- moderate: 분석 시도는 있으나 피상적이거나, 구체적 사례가 없는 경우
- mild: 전반적으로 양호하나 관점/평가 제시가 약하거나, 어휘 폭이 제한적인 경우
```

---

## 10. ADVANCED_15 (사회적 이슈/여론)

> 과제: 사회적 이슈, 뉴스, 여론에 대해 의견 제시 및 논의
> 핵심: 추상적 사고 + 의견 + 근거
> 기출 예: "What concerns do people have about internet security?", "Tell me about a recent news story"
> 참고: 15번은 AL 변별 문항. IL~IM3에서는 이 문항을 만나지 않지만, 기준표 일관성을 위해 포함.

### IL + advanced_15
```
[과제 기대]
- 이슈 관련 단어/구 수준 언급 시도

[충족 기준]
- 이슈와 관련된 단어 1개 이상

[severity 판정]
- severe: 이슈 인식 자체가 없는 경우
- moderate: 관련 없는 내용만 말하는 경우
- mild: 이슈를 암시하지만 의견이 없는 경우
```

### IM1 + advanced_15
```
[과제 기대]
- 이슈를 1~2문장으로 언급
- 간단한 의견 시도 ("I think it's important")

[충족 기준]
- 이슈 언급 + 의견 시도

[severity 판정]
- severe: 이슈 언급이 없는 경우
- moderate: 이슈 언급은 있으나 의견이 없는 경우
- mild: 의견은 있으나 매우 피상적인 경우
```

### IM2 + advanced_15
```
[과제 기대]
- 이슈를 3~4문장으로 설명
- 개인 의견 + 이유 1개

[충족 기준]
- 이슈 설명 + 의견 + 이유

[severity 판정]
- severe: 이슈 설명 없이 의견만 하는 경우
- moderate: 이슈 설명은 있으나 의견/이유가 없는 경우
- mild: 기본 구조는 있으나 이유가 피상적인 경우
```

### IM3 + advanced_15
```
[과제 기대]
- 이슈를 연결된 문장으로 설명
- 의견 + 이유 2개 이상
- 사회적 영향 또는 사람들의 반응 언급
- 연결어 활용

[충족 기준]
- 이슈 설명 + 의견 + 이유 2개
- 사회적 영향/반응 언급
- 연결어 활용

[severity 판정]
- severe: 의견이 없거나 이유가 1개 이하인 경우
- moderate: 구조는 있으나 사회적 영향 언급이 없는 경우
- mild: 기본 구조는 좋으나 분석적 깊이가 부족한 경우
```

### IH + advanced_15
```
[과제 기대]
- 문단 구조로 이슈 분석
- 이슈의 배경/원인 설명
- 다양한 관점 또는 사람들의 의견 소개
- 자신의 의견 + 근거 제시
- 전환어로 논리 흐름 관리

[충족 기준]
- 문단 구조 확인
- 이슈 배경/원인 + 사회적 반응
- 자신의 의견 + 근거
- 전환어 활용

[severity 판정]
- severe: 문단 구조 없이 의견만 말하는 경우
- moderate: 구조는 있으나 근거가 부족하거나, 배경 설명이 없는 경우
- mild: 전반적으로 양호하나 관점 다양성이 부족한 경우
```

### AL + advanced_15
```
[과제 기대]
- 강화된 문단 구조로 심층 분석
- 이슈의 원인→결과→해결책 논리 구조
- 거시적 맥락: 경제, 기술, 사회 변화와 연결
- 고급 표현: "One thing that comes to mind is...", "This is partly caused by..."
- 추상적 사고: 가설 제시, 인과관계 분석
- 다양한 관점 소개 + 반론 가능성 인정
- 해결책/전망 제시 ("I think the government should...", "I hope this trend continues")
- 고급 어휘 + 다양한 연결 장치
- 문법 정확 (수일치, 전치사, 시제)

[충족 기준]
- 강화된 문단 구조 + 논리적 전개
- 원인→결과→해결책/전망 구조
- 거시적 맥락 연결
- 고급 어휘/표현 3개 이상
- 추상적 사고 (가설 또는 인과분석)
- 다양한 연결 장치 3종 이상
- 문법 정확

[severity 판정]
- severe: IH 수준의 기본 의견 제시에 머무는 경우 (분석/맥락 없음)
- moderate: 분석 시도는 있으나 피상적이거나, 해결책/전망이 없는 경우
- mild: 전반적으로 양호하나 추상적 사고 깊이가 부족하거나, 어휘 폭이 제한적인 경우
```

---

## 부록: severity 레벨 정의

| severity | 의미 | 목표 등급과의 관계 |
|----------|------|-------------------|
| **severe** | 해당 등급의 필수 요구에 도달하지 못함 | 목표 등급 달성 불가 — 핵심 병목 |
| **moderate** | 시도했으나 불안정하거나 일관성 부족 | 목표 등급 경계선 — 보완 시 달성 가능 |
| **mild** | 기본은 되나 등급 유지/상향에 걸림돌 | 목표 등급 달성 가능 — 품질 향상 포인트 |

---

*최종 작성: 2026-03-21*
*근거: ACTFL Guidelines 2024 + OPIc Familiarization Guide + 강지완 AL 강의 22강 + 기출문제 509개*
