-- 017_eval_engine_settings.sql
-- 모의고사 평가 엔진 파라미터를 관리자 UI에서 조정할 수 있도록 확장

-- ============================================================
-- 1. mock_test_eval_settings 확장 (25개 컬럼 추가)
-- ============================================================

-- 평가엔진 threshold 13개 (re_ 접두사)
ALTER TABLE mock_test_eval_settings
  ADD COLUMN IF NOT EXISTS re_checkbox_pass_threshold NUMERIC(4,2) DEFAULT 0.80,
  ADD COLUMN IF NOT EXISTS re_floor_nh NUMERIC(4,2) DEFAULT 0.45,
  ADD COLUMN IF NOT EXISTS re_floor_il NUMERIC(4,2) DEFAULT 0.65,
  ADD COLUMN IF NOT EXISTS re_floor_im1 NUMERIC(4,2) DEFAULT 0.75,
  ADD COLUMN IF NOT EXISTS re_floor_im2 NUMERIC(4,2) DEFAULT 0.95,
  ADD COLUMN IF NOT EXISTS re_ceiling_broke_down NUMERIC(4,2) DEFAULT 0.70,
  ADD COLUMN IF NOT EXISTS re_ceiling_respond NUMERIC(4,2) DEFAULT 0.90,
  ADD COLUMN IF NOT EXISTS re_sympathetic_low INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS re_sympathetic_mid INTEGER DEFAULT 70,
  ADD COLUMN IF NOT EXISTS re_sympathetic_at_times INTEGER DEFAULT 85,
  ADD COLUMN IF NOT EXISTS re_sympathetic_pron_weight NUMERIC(4,2) DEFAULT 0.60,
  ADD COLUMN IF NOT EXISTS re_al_pass_threshold NUMERIC(4,2) DEFAULT 0.70,
  ADD COLUMN IF NOT EXISTS re_q12_gatekeeper_threshold NUMERIC(4,2) DEFAULT 0.50;

-- GPT 모델 설정 12개 (judge/coach/report/growth 각 3개)
ALTER TABLE mock_test_eval_settings
  ADD COLUMN IF NOT EXISTS judge_model TEXT DEFAULT 'gpt-4.1-mini',
  ADD COLUMN IF NOT EXISTS judge_temperature NUMERIC(3,2) DEFAULT 0.20,
  ADD COLUMN IF NOT EXISTS judge_max_tokens INTEGER DEFAULT 6000,
  ADD COLUMN IF NOT EXISTS coach_model TEXT DEFAULT 'gpt-4.1',
  ADD COLUMN IF NOT EXISTS coach_temperature NUMERIC(3,2) DEFAULT 0.40,
  ADD COLUMN IF NOT EXISTS coach_max_tokens INTEGER DEFAULT 8000,
  ADD COLUMN IF NOT EXISTS report_model TEXT DEFAULT 'gpt-4.1',
  ADD COLUMN IF NOT EXISTS report_temperature NUMERIC(3,2) DEFAULT 0.40,
  ADD COLUMN IF NOT EXISTS report_max_tokens INTEGER DEFAULT 12000,
  ADD COLUMN IF NOT EXISTS growth_model TEXT DEFAULT 'gpt-4.1-mini',
  ADD COLUMN IF NOT EXISTS growth_temperature NUMERIC(3,2) DEFAULT 0.50,
  ADD COLUMN IF NOT EXISTS growth_max_tokens INTEGER DEFAULT 3000;

-- ============================================================
-- 2. task_fulfillment_checklists 테이블 생성
-- ============================================================

CREATE TABLE IF NOT EXISTS task_fulfillment_checklists (
  question_type TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  required JSONB NOT NULL DEFAULT '[]',
  advanced JSONB NOT NULL DEFAULT '[]',
  ideal_flow TEXT NOT NULL DEFAULT '',
  common_mistakes JSONB NOT NULL DEFAULT '[]',
  core_prescription TEXT NOT NULL DEFAULT '',
  feedback_tone TEXT NOT NULL DEFAULT '',
  start_template TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE task_fulfillment_checklists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "전체 읽기" ON task_fulfillment_checklists;
CREATE POLICY "전체 읽기" ON task_fulfillment_checklists FOR SELECT USING (true);

-- ============================================================
-- 3. 10개 question_type 초기 데이터 INSERT
-- ============================================================

INSERT INTO task_fulfillment_checklists (question_type, label, required, advanced, ideal_flow, common_mistakes, core_prescription, feedback_tone, start_template)
VALUES
  ('description', '묘사',
   '["묘사 대상이 분명함 (무엇/어디/누구)", "핵심 특징 2개 이상", "현재시제 중심으로 안정적"]'::jsonb,
   '["예시·감각·개인화 1개 이상 (단순 형용사 나열 아님)", "개인 반응/선호 이유 있음"]'::jsonb,
   '대상 소개 → 전체 인상 → 세부 특징 2~3개 → 예시/경험 1개 → 짧은 마무리',
   '["형용사만 나열 (big, nice, beautiful 반복)", "구체성 없음 (색, 분위기, 사용 방식 빠짐)", "묘사 중 이야기로 새거나 너무 단답"]'::jsonb,
   '"특징 1개 + 예시 1개" 묶음으로 선명하게',
   '격려형 코칭 (4~5문장)',
   'One place I can describe is…'),

  ('routine', '루틴/습관',
   '["어떤 루틴인지 분명함", "빈도 표현 있음 (usually, every day, on weekends)", "현재시제로 안정적"]'::jsonb,
   '["순서 연결어 사용 (first, then, after that)", "이유/느낌/예외 상황 짧게 있음"]'::jsonb,
   '루틴 소개 → 빈도 제시 → 순서대로 3단계 설명 → 보통/예외 구분 → 짧은 느낌',
   '["빈도 없이 행동만 나열", "순서가 흐려짐", "현재 습관인데 과거시제로 흔들림"]'::jsonb,
   '빈도 + 순서 연결어를 먼저 고정',
   '직설적 코칭 (4~5문장)',
   'I usually… First,…'),

  ('comparison', '비교/변화',
   '["비교의 두 축이 분명함 (예전 vs 지금)", "비교 포인트 최소 2개", "대비 표현 사용 (compared to, unlike, these days)"]'::jsonb,
   '["변화의 원인/배경이 있음", "변화에 대한 본인 의견 있음"]'::jsonb,
   '비교 기준 제시 → 과거 상태 → 현재 상태 → 왜 바뀌었는지 → 개인적 평가',
   '["한쪽만 말함 (지금만 길게, 과거 없음)", "원인 없이 차이만 말함", "비교 표현 없이 나열식 설명"]'::jsonb,
   '첫 문장에서 비교축 세우기 — "In the past…, but these days…"',
   '분석형 코칭 (5문장 전후)',
   'In the past…, but these days…'),

  ('past_childhood', '어릴 때 경험',
   '["\"어릴 때\"라는 시간 앵커 분명 (when I was a child)", "배경 정보 있음 (어디서, 누구와, 어떤 상황)", "실제 사건/행동이 과거시제로 나옴"]'::jsonb,
   '["감정/반응 있음", "지금 돌아보는 의미 또는 지금과 어떻게 연결되는지"]'::jsonb,
   '어린 시절 시점 → 배경 → 무슨 일이 있었는지 → 그때 반응 → 지금 돌아보는 의미',
   '["childhood 앵커 없이 그냥 과거 경험처럼 말함", "과거시제가 약함", "사건보다 배경 설명만 길어짐"]'::jsonb,
   '첫 문장에 childhood marker, 마지막에 지금 의미 붙이기',
   '스토리 코칭형 (5~6문장)',
   'When I was a child,…'),

  ('past_special', '기억에 남는 경험',
   '["어떤 경험이 기억에 남는지 명확", "배경 있음 (시간/장소/함께한 사람)", "핵심 사건이 분명함"]'::jsonb,
   '["감정이나 반응 있음", "왜 기억에 남는지 이유 분명"]'::jsonb,
   '기억에 남는 경험 소개 → 배경 → 핵심 사건 → 감정/반응 → 왜 기억나는지',
   '["\"재밌었다\"만 있고 사건이 없음", "시간순 전개가 불분명", "왜 memorable인지 설명이 약함"]'::jsonb,
   '사건 1개를 중심으로 서사화 — "무슨 일이 있었는지"가 핵심',
   '격려 + 구조 교정 (5~6문장)',
   'One memorable experience I had was…'),

  ('past_recent', '과거 습관',
   '["과거의 반복 습관/패턴이 분명함", "빈도 표현 있음 (every weekend, often, used to)", "과거 습관에 맞는 시제 안정적"]'::jsonb,
   '["전형적인 루틴/행동 순서 설명", "지금과의 차이 또는 중단 이유 있음"]'::jsonb,
   '과거 습관 소개 → 얼마나 자주 → 보통 어떻게 → 왜 했는지 → 지금은 어떤지',
   '["단발성 사건처럼 말함", "현재 루틴과 섞임", "지금과의 대비가 없음"]'::jsonb,
   'used to + frequency + now — 이 3점 세트',
   '직설형 교정 (4~5문장)',
   'I used to…'),

  ('rp_11', '정보 요청 롤플레이',
   '["목적/상황이 드러남", "질문 개수 3개 이상", "질문이 WH-질문 중심 (단순 yes/no 아님)"]'::jsonb,
   '["정중 표현 사용 (Could you~, Would you~)", "상대 답변을 지어내지 않음"]'::jsonb,
   '인사/상황 제시 → 질문 1 → 질문 2 → 질문 3 → 짧은 마무리',
   '["질문이 아니라 진술문으로 말함", "질문 수가 부족함", "혼자 질문하고 혼자 답까지 함"]'::jsonb,
   '문장 품질보다 질문 개수 확보가 먼저',
   '체크리스트형, 직설적 (3~4문장)',
   'Hi, I''d like some information. First,…'),

  ('rp_12', '상황 대응 롤플레이',
   '["사과 또는 상황 인정", "이유/원인 설명", "해결 옵션 2개 이상 제시"]'::jsonb,
   '["현재 상태 설명", "상대의 선택/확인 유도"]'::jsonb,
   '사과 → 이유 설명 → 현재 상황 → 옵션 A / 옵션 B → 어떤 게 괜찮은지 묻기',
   '["사과만 하고 끝남", "옵션이 1개뿐이거나 없음", "상대 선택 유도 없이 독백으로 끝남"]'::jsonb,
   '사과 + 이유 + 옵션 2개 — 이 3개가 필수',
   '문제 해결 코칭형 (4~5문장)',
   'I''m sorry, but… Would you prefer A or B?'),

  ('adv_14', '사회 비교/변화',
   '["사회적 주제가 분명함", "과거 vs 현재 또는 집단 간 비교 있음", "이유/배경 최소 2개"]'::jsonb,
   '["개인 경험만이 아닌 사회적 관점", "예시 또는 관찰 사례 있음"]'::jsonb,
   '주제 제시 → 사회적 비교/변화 → 원인 1 → 원인 2 → 예시/시사점',
   '["개인 이야기만 하고 사회적 관점 없음", "비교는 있는데 이유가 약함", "추상적 주장만 있고 예시가 없음"]'::jsonb,
   '개인 경험을 사회 현상으로 끌어올리기',
   '논리 코칭형 (5~6문장)',
   'Compared to the past, these days…'),

  ('adv_15', '의견 제시/주장',
   '["입장이 명확함", "이유 최소 2개", "논리 연결어 사용 (because, therefore, for example)"]'::jsonb,
   '["예시 1개 이상 (구체적)", "결론/재진술 있음"]'::jsonb,
   '입장 제시 → 이유 1 + 예시 → 이유 2 + 예시/설명 → 결론',
   '["입장이 모호함", "같은 이유를 반복", "예시 없이 추상적으로만 말함"]'::jsonb,
   '첫 문장에 입장 + 이유 2개 분리하여 말하기',
   '명확하고 코칭적 (5~6문장)',
   'I think … for two reasons.')
ON CONFLICT (question_type) DO NOTHING;
