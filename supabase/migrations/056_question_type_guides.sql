-- 056_question_type_guides.sql
-- 질문 유형별 한글 가이드 테이블 — 오픽 스터디 가이드 EF 프롬프트 주입용 SSOT
--
-- 목적:
--   - 등급 비특정, 한글 전용 유형별 답변 가이드를 별도 테이블로 관리
--   - opic-study-guide EF가 콤보 질문들의 question_type 별 prompt_reference 참조
--   - 60행 script_specs(영어 + 등급별)와 분리 — 가이드용 한글 메타 자산 (10 row)
--
-- 변경 사항:
--   1. question_type_guides 테이블 신규 (10 row 시드)
--   2. opic_study_sessions 컬럼 정리:
--      - DROP: ai_guide_text, ai_guide_key_points (등급 분기/영어 표현 포함 폐기)
--      - ADD: ai_guide_intro (한 줄 인사), ai_guide_approaches (질문별 한글 가이드 jsonb)

-- ============================================================
-- 1. question_type_guides 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS question_type_guides (
  type_id text PRIMARY KEY,                    -- 'description', 'routine', 'comparison' 등 (questions.question_type_eng와 매칭)
  type_label_kor text NOT NULL,                -- 한글 정식 라벨 ('묘사', '비교 (시간 변화)')
  type_short_kor text NOT NULL,                -- 카드 헤더용 짧은 라벨 ('묘사', '비교')

  essence_kor text NOT NULL,                   -- 본질 1-2문장
  answer_flow text[] NOT NULL,                 -- 답변 단계별 흐름
  key_points text[] NOT NULL,                  -- 놓치면 안 되는 핵심 포인트

  recommended_word_min integer NOT NULL DEFAULT 80,
  recommended_word_max integer NOT NULL DEFAULT 200,

  prompt_reference text NOT NULL,              -- AI 프롬프트 주입용 종합 한글 가이드 (한 단락)

  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE question_type_guides IS '질문 유형별 한글 답변 가이드 — 오픽 스터디 가이드 EF 프롬프트 SSOT';
COMMENT ON COLUMN question_type_guides.type_id IS 'questions.question_type_eng 와 매칭';
COMMENT ON COLUMN question_type_guides.prompt_reference IS 'AI 프롬프트 주입용 종합 가이드 (한 단락, 한글 전용)';

CREATE INDEX IF NOT EXISTS idx_qtg_active ON question_type_guides(is_active, display_order);

-- ── RLS ──
ALTER TABLE question_type_guides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qtg_select_all ON question_type_guides;
CREATE POLICY qtg_select_all ON question_type_guides
  FOR SELECT USING (true);

DROP POLICY IF EXISTS qtg_admin_modify ON question_type_guides;
CREATE POLICY qtg_admin_modify ON question_type_guides
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- ============================================================
-- 2. 10 row 시드 (질문 유형별 가이드)
-- ============================================================

INSERT INTO question_type_guides (
  type_id, type_label_kor, type_short_kor,
  essence_kor, answer_flow, key_points,
  recommended_word_min, recommended_word_max,
  prompt_reference, display_order
) VALUES

-- 1. description (묘사)
(
  'description',
  '묘사',
  '묘사',
  '대상의 모습·특징·분위기를 자세히 그려내는 유형이에요. 정적 묘사 위주로 현재형 시제를 주로 사용해요.',
  ARRAY['묘사 대상 명시', '외관·위치·크기', '분위기·시설 디테일', '개인 감정/이유'],
  ARRAY['대상이 무엇인지 명확히 밝히기', '시각적·감각적 디테일 풍부하게', '왜 좋아하는지 한 줄 마무리'],
  80, 150,
  '이 유형은 대상의 모습과 특징을 자세히 묘사하는 유형이에요. 먼저 묘사할 대상을 명확히 밝히고, 외관·위치·분위기 등 시각적·감각적 디테일을 풍부하게 풀어내세요. 마지막에는 그 대상에 대한 본인의 감정이나 좋아하는 이유를 한 줄로 마무리하면 답변이 자연스러워져요.',
  1
),

-- 2. routine (루틴)
(
  'routine',
  '루틴',
  '루틴',
  '반복적 일상 행동을 시간 순서로 풀어내는 유형이에요. 빈도·시간·장소가 명확해야 해요.',
  ARRAY['빈도/시간', '시작·준비', '본 활동 (단계별)', '마무리·이후'],
  ARRAY['보통 얼마나 자주/언제 하는지', '단계별 시간 순서로', '현재형 시제 위주', '빈도 표현 자연스럽게'],
  80, 150,
  '이 유형은 평소 반복하는 일상 행동을 시간 순서로 풀어내는 유형이에요. 보통 얼마나 자주, 언제 하는지부터 시작해서 시작·준비 → 본 활동 단계 → 마무리 순으로 흐름을 잡으세요. 현재형 시제를 주로 사용하고, "보통은", "주로"처럼 빈도 표현을 자연스럽게 곁들이면 좋아요.',
  2
),

-- 3. comparison (비교 - 시간 변화)
(
  'comparison',
  '비교 (시간 변화)',
  '비교',
  '과거와 현재의 시간 변화를 개인 경험 기반으로 비교하는 유형이에요.',
  ARRAY['과거 모습', '변화 시점/계기', '현재 모습', '변화의 의미/감정'],
  ARRAY['시간 흐름 명확히', '구체적 디테일 (과거 vs 현재)', '변화 강조', '시제 안정 (과거 + 현재)'],
  100, 180,
  '이 유형은 과거와 현재가 어떻게 달라졌는지 개인 경험 기반으로 비교하는 유형이에요. 어렸을 때 또는 예전에는 어땠는지부터 시작해서, 어떤 계기로 변화가 있었는지, 지금은 어떤 모습인지 시간 흐름으로 풀어가세요. 과거형과 현재형 시제를 안정적으로 오가는 게 핵심이고, 마지막에는 그 변화에 대한 본인의 감정이나 의미를 한 줄로 남기면 좋아요.',
  3
),

-- 4. past_recent (경험·최근)
(
  'past_recent',
  '경험·최근',
  '최근 경험',
  '지난번 한 번의 사건을 시간 순서로 풀어내는 유형이에요. 과거형 시제로 일관해요.',
  ARRAY['언제·어디·누구', '사건 시작', '진행', '결과·감정'],
  ARRAY['시간 순서 명확하게', '구체적 디테일', '과거형 시제 일관', '마무리 느낌 한 줄'],
  100, 180,
  '이 유형은 지난번에 있었던 한 번의 사건을 시간 순서로 풀어내는 유형이에요. 언제·어디서·누구와 함께였는지부터 시작해서, 무슨 일이 있었는지 시작 → 진행 → 결과 순으로 풀어가세요. 과거형 시제를 일관되게 유지하는 게 중요하고, 마지막에는 그 일에 대한 감정이나 결과를 한 줄로 남기면 자연스러워요.',
  4
),

-- 5. past_special (경험·기억)
(
  'past_special',
  '경험·기억',
  '특별 경험',
  '인상 깊었던 한 번의 사건을 생생하게, 왜 기억에 남는지까지 풀어내는 유형이에요.',
  ARRAY['배경 (언제·어디·누구)', '사건 발생', '대응/해결 과정', '왜 기억에 남는지'],
  ARRAY['시간 순서 명확하게', '구체적 디테일로 생생하게', '문제 발생 + 해결 (해당 시)', '마지막에 의미 부여 필수'],
  130, 220,
  '이 유형은 특별히 기억에 남는 한 번의 사건을 한 편의 이야기처럼 풀어내는 유형이에요. 언제·어디서·누구와 함께였는지 배경을 먼저 잡고, 무슨 일이 있었는지 시간 순서로 풀어가세요. 특히 그 일이 왜 기억에 남는지 — 재미있어서, 어려웠어서, 의미 있어서 — 감정의 이유까지 마지막에 남기는 게 핵심이에요. 문제가 있던 사건이라면 어떻게 대응했는지까지 곁들이면 답변이 풍성해져요.',
  5
),

-- 6. past_childhood (경험·어린시절)
(
  'past_childhood',
  '경험·어린시절',
  '어린시절 경험',
  '어렸을 때의 한 사건이나 추억을 회상 톤으로 풀어내는 유형이에요.',
  ARRAY['어린 시절 시점', '장소·상황', '무슨 일', '인상·기억'],
  ARRAY['몇 살 때/어느 시기 명시', '회상 표현 (used to, 예전에는)', '구체적 디테일', '왜 기억에 남는지'],
  100, 180,
  '이 유형은 어렸을 때의 한 사건이나 추억을 회상하듯 풀어내는 유형이에요. 몇 살 때, 어느 시기였는지를 먼저 잡고, 어디서 누구와 무슨 일이 있었는지 풀어가세요. "used to", "예전에는" 같은 회상 표현을 자연스럽게 활용하고, 마지막에는 그 기억이 본인에게 어떤 의미인지 한 줄로 남기면 좋아요.',
  6
),

-- 7. rp_11 (롤플레이·정보요청)
(
  'rp_11',
  '롤플레이·정보요청',
  '롤플레이·질문',
  '주어진 가상 상황에서 상대방에게 3-4개의 질문을 자연스럽게 던지는 유형이에요.',
  ARRAY['인사·상황 인지', '첫 번째 질문', '추가 질문 2-3개', '마무리 인사'],
  ARRAY['질문 형식 다양하게 (Wh-/Yes-No 섞기)', '상황 맞는 정중한 어투', '단조롭지 않은 자연스러운 흐름', '마지막에 감사 표현'],
  80, 140,
  '이 유형은 주어진 가상 상황에서 상대방에게 자연스럽게 3-4개 질문을 던지는 유형이에요. 먼저 상황에 맞는 인사로 시작하고, 본인이 무엇을 알고 싶은지 첫 질문을 자연스럽게 꺼내세요. 이어서 관련된 추가 질문 2-3개를 자연스럽게 이어가고, 마지막에는 감사 인사로 마무리하면 좋아요. Wh-questions와 Yes/No 질문을 섞어서 단조롭지 않게 풀어가는 게 핵심이에요.',
  7
),

-- 8. rp_12 (롤플레이·문제해결)
(
  'rp_12',
  '롤플레이·문제해결',
  '롤플레이·해결',
  '주어진 가상 상황에서 문제를 설명하고 2-3개의 대안을 제시하는 유형이에요.',
  ARRAY['인사·자기소개', '문제 설명', '대안 1', '대안 2 (3)', '마무리'],
  ARRAY['문제를 명확하게 설명', '대안은 구체적으로', '상대 입장 배려한 어투', '단순 나열 X — 한 문장씩 풀어내기'],
  100, 180,
  '이 유형은 주어진 가상 상황에서 문제를 설명하고 그에 대한 대안 2-3개를 제시하는 유형이에요. 먼저 인사와 함께 본인이 누구이고 어떤 상황인지 간단히 알리고, 무슨 문제가 생겼는지 명확하게 설명하세요. 이어서 가능한 대안을 2-3개 구체적으로 제시하고, 마지막에는 상대방에게 어떤 옵션이 가장 좋을지 묻거나 감사로 마무리하면 좋아요. 단순히 "A 아니면 B" 식의 나열보다는 각 대안을 한 문장씩 풀어내는 게 핵심이에요.',
  8
),

-- 9. adv_14 (사회 변화 분석)
(
  'adv_14',
  '사회 변화 분석',
  '사회 변화',
  '사회·문화·기술의 변화를 원인·영향까지 분석적으로 서술하는 유형이에요. 개인 경험이 아닌 사회 차원.',
  ARRAY['사회 변화 도입', '과거 사회 모습', '변화 원인', '현재 모습', '영향·결과', '종합 평가'],
  ARRAY['개인 경험이 아닌 사회 차원', '원인·영향까지 분석적으로', '구체적 사례 1개 곁들이기', '시간 흐름 명확'],
  150, 220,
  '이 유형은 사회·문화·기술의 변화를 원인과 영향까지 분석적으로 서술하는 유형이에요. comparison과 비슷해 보이지만, 개인 경험이 아닌 사회 차원의 변화를 다루는 게 핵심이에요. 우리 사회나 우리나라가 과거에는 어땠는지 → 어떤 계기로 변화가 일어났는지 → 지금은 어떤 모습이고 → 그것이 어떤 영향을 미쳤는지 분석적 흐름으로 풀어가세요. 마지막에는 변화에 대한 본인의 종합적 판단으로 마무리하고, 중간에 구체적 사례 하나 정도 곁들이면 답변이 깊어져요.',
  9
),

-- 10. adv_15 (사회 이슈 토론)
(
  'adv_15',
  '사회 이슈 토론',
  '사회 이슈',
  '사회 이슈나 여론에 대해 다양한 관점을 제시하고 본인 의견까지 풀어내는 유형이에요.',
  ARRAY['이슈 도입', '배경/현황', '관점 1 (찬성/긍정)', '관점 2 (반대/우려)', '영향·전망', '개인 의견'],
  ARRAY['다양한 관점 (찬성·반대 또는 여러 시각)', '본인 의견 명확히', '구체적 사례나 뉴스 곁들이기', '균형 잡힌 톤'],
  150, 220,
  '이 유형은 사회 이슈나 여론에 대한 다양한 관점을 제시하고 본인 의견까지 풀어내는 유형이에요. 어떤 이슈인지 도입하고 → 현재 상황이 어떤지 배경을 설명한 뒤 → 그 이슈에 대한 한 가지 시각(찬성/긍정)과 다른 시각(반대/우려)을 제시하세요. 가능하면 구체적 사례나 뉴스를 한 개 곁들이고, 마지막에는 본인이 어떻게 생각하는지 — 우려·기대·예측 중 하나를 명확히 — 본인 의견으로 마무리하는 게 핵심이에요.',
  10
)

ON CONFLICT (type_id) DO UPDATE SET
  type_label_kor = EXCLUDED.type_label_kor,
  type_short_kor = EXCLUDED.type_short_kor,
  essence_kor = EXCLUDED.essence_kor,
  answer_flow = EXCLUDED.answer_flow,
  key_points = EXCLUDED.key_points,
  recommended_word_min = EXCLUDED.recommended_word_min,
  recommended_word_max = EXCLUDED.recommended_word_max,
  prompt_reference = EXCLUDED.prompt_reference,
  display_order = EXCLUDED.display_order,
  updated_at = now();

-- ============================================================
-- 3. opic_study_sessions 컬럼 정리
-- ============================================================

-- 기존 컬럼 폐기 (등급 분기 + 영어 표현 포함 가이드 폐기)
ALTER TABLE opic_study_sessions
  DROP COLUMN IF EXISTS ai_guide_text,
  DROP COLUMN IF EXISTS ai_guide_key_points;

-- 새 컬럼 (한 줄 인사 + 질문별 한글 approaches)
ALTER TABLE opic_study_sessions
  ADD COLUMN IF NOT EXISTS ai_guide_intro text,
  ADD COLUMN IF NOT EXISTS ai_guide_approaches jsonb;

COMMENT ON COLUMN opic_study_sessions.ai_guide_intro IS 'AI 코치 한 줄 인사 (등급 비특정, 한글)';
COMMENT ON COLUMN opic_study_sessions.ai_guide_approaches IS '질문별 한글 가이드 — [{question_index, type_label, approach}]';
