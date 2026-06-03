-- ============================================================
-- 오픽 스터디 피드백 v5.2 — 등급 루브릭을 "담화 구조 사다리"로 교체
-- ============================================================
--
-- 배경: 모의고사 평가 BM (docs/오픽스터디_코칭노트_개선안.md §평가BM)
--   소리담 모의고사 등급 기준(evaluation_criteria)의 진짜 변별 축은
--   단어 수가 아니라 "담화 구조 사다리"(단어→단문→연속문장→종속절 연결
--   →문단→강화문단)임을 확인. 코칭 노트 v5 루브릭은 단어 수 중심이라
--   모의고사(gold standard)와 척도가 어긋나고 IM3 클러스터링을 유발.
--
-- 변경: estimated_level "등급 판단 기준 (정량 신호)" 블록을
--   모의고사 기준과 동일한 담화 구조 사다리로 교체.
--   단어 수는 보조 신호로 격하. 게이트키퍼(detail_shallow/frame_absent) 추가.
--   앵커링 금지 원칙(P1-a)·목표등급 캘리브레이션(P1-b)은 유지.
--
-- 전체 재작성 대신 v5(마이그 102) 블록만 REPLACE. EF 재배포 불필요.
-- ============================================================

UPDATE evaluation_prompts
SET prompt_text = replace(
  prompt_text,
$old$### 등급 판단 기준 (정량 신호)

**AL (Advanced Low)**
- 다양한 토픽에 일관된 패러그래프, 복문/부사절(because, although, while, if) 자유롭게
- 추상적 표현 + 비교/대조 + 가설, 안정적 발음·억양
- transcript: 200단어+

**IH (Intermediate High)**
- 대부분의 일상 토픽에서 안정적 패러그래프
- **복문/부사절을 3회 이상 + 추상 표현이 보이면 IH 이상을 적극 고려**
- 구체적 예시 + 개인 경험 묘사, 발음 명확(가끔 불안정)
- transcript: 150~200단어

**IM3 (Intermediate Mid 3)**
- 능숙한 문장 단위, 토픽 전개 자연스러움
- 기본 문장 + 가끔 복문, 어휘 풍부하나 일부 반복
- transcript: 100~150단어

**IM2 (Intermediate Mid 2)**
- 안정적 기본 문장, 토픽 유지 가능
- **단문 위주 + 복문 1~2회 시도면 IM2~IM3**, 일상 어휘 풍부·반복 빈번
- transcript: 70~100단어

**IM1 (Intermediate Mid 1)**
- 기본 문장, 망설임/오류 빈번, 단편적·짧은 문장
- transcript: 40~70단어

**IL (Intermediate Low)**
- 단편적, 단어/구 수준, 문장 완성 어려움
- transcript: 40단어 미만 또는 비어있음$old$,
$new$### 등급 판단 기준 — 1순위는 "담화 구조", 단어 수는 보조 신호일 뿐

답변이 문장을 어떻게 엮는지(담화 구조)를 먼저 보고 등급을 정하세요. 단어 수로 등급을 직접 정하지 말 것 — 말 빠른 IM2도 200단어가 나올 수 있어요. (소리담 모의고사 채점과 동일한 척도)

**AL (Advanced Low)**
- 강화된 문단 구조 (정교한 도입 + 풍부한 뒷받침 + 마무리)
- 고급 어휘 3개 이상 + 다양한 연결 장치 3종 이상 (moreover, furthermore, on top of that — 반복 없이)
- 분사구문·관계절·복문 등 문장 구조 다양성 + 추상 표현·비유, 문법 오류 최소

**IH (Intermediate High)**
- 문단 구조 (주제문 → 뒷받침 여러 개 → 마무리)가 형성됨
- 다양한 전환어 (another thing is..., the best thing is...) + 묘사 깊이 (용도/분위기/비교 중 1개 이상)
- 구체적 예시·개인 경험, 현재시제 안정

**IM3 (Intermediate Mid 3)**
- 종속절(when, where, because, which)로 문장 연결 2회 이상 + 구체적 디테일 (단순 "big" → "spacious with high ceilings")
- 토픽 전개 자연스러움, 시제 일관

**IM2 (Intermediate Mid 2)**
- 연속된 문장(strings of sentences)으로 특징 2개 이상 + 개인화 (I like it because...)
- 연결어 and/but/so 중심, 일상 어휘 풍부하나 반복 빈번

**IM1 (Intermediate Mid 1)**
- 단문(It is.../There is...) 위주, 기본 형용사로 특징 1~2개
- 망설임/오류 빈번, 문장 간 연결 약함

**IL (Intermediate Low)**
- 단어·짧은 구 수준 나열, 완전한 문장 거의 없음

**게이트키퍼**: 디테일이 표면적이거나(detail_shallow), 답변 틀 없이 나열식으로 흩어지면(frame_absent) 위 판단에서 한 단계 낮춰 잡으세요. 이 둘이 등급을 가장 자주 끌어내립니다.$new$
)
WHERE key = 'opic_study_feedback';
