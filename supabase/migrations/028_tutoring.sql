-- ============================================================
-- 028_tutoring.sql
-- 튜터링 V1 신규 테이블 (기존 V2 테이블은 이미 삭제됨)
-- 설계서: docs/설계/튜터링.md
-- ============================================================

-- ============================================================
-- 1. tutoring_sessions — 세션 마스터 + Prompt C/D 결과
-- ============================================================
CREATE TABLE tutoring_sessions (
  id TEXT PRIMARY KEY,                                      -- ts_xxxxxxxx
  user_id UUID NOT NULL REFERENCES auth.users(id),
  analyzed_session_ids TEXT[] NOT NULL,                      -- 분석에 사용된 mock_test_sessions.session_id 배열 (3~5개)

  -- Prompt C 진단 결과
  current_stable_level TEXT NOT NULL,
  ceiling_candidate_level TEXT,
  next_step_level TEXT NOT NULL,
  final_target_level TEXT NOT NULL,                          -- = target_grade
  stable_confidence NUMERIC(3,2),
  floor_status JSONB,                                       -- { intermediate_floor_met, ih_floor_met, al_floor_met }
  target_gap_summary JSONB,                                 -- { current_to_next, next_to_final }
  diagnosis_internal JSONB,                                 -- type_mastery, topic_mastery, level_rationale
  top_bottlenecks JSONB,                                    -- 내부 최대 5개
  student_top_focuses JSONB,                                -- 학생 노출 최대 3개
  student_summary JSONB,                                    -- current_level_message, next_step_message, why_now_message

  -- Prompt D 처방 결과
  prescription_json JSONB,                                  -- Prompt D 전체 출력 (coach_message + weekly_focuses)

  -- 메타
  status TEXT NOT NULL DEFAULT 'diagnosing'
    CHECK (status IN ('diagnosing', 'diagnosed', 'active', 'completed')),
  model TEXT,                                               -- 사용된 GPT 모델
  tokens_used INTEGER,
  prompt_version TEXT,                                      -- 프롬프트 버전 추적
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_tutoring_sessions_user ON tutoring_sessions(user_id);
CREATE INDEX idx_tutoring_sessions_status ON tutoring_sessions(status);

-- ============================================================
-- 2. tutoring_focuses — focus별 처방 (세션당 1~3개)
-- ============================================================
CREATE TABLE tutoring_focuses (
  id TEXT PRIMARY KEY,                                      -- tf_xxxxxxxx
  session_id TEXT NOT NULL REFERENCES tutoring_sessions(id) ON DELETE CASCADE,
  priority_rank INTEGER NOT NULL,                           -- 1, 2, 3
  focus_code TEXT NOT NULL,                                 -- BT_COMPARISON_REASON 등
  label TEXT NOT NULL,                                      -- 학생에게 보여줄 한국어 라벨
  reason TEXT,                                              -- 왜 이 focus인지
  why_now_for_target TEXT,                                  -- 목표 등급과의 연결

  -- QSE 관련
  selection_policy JSONB,                                   -- Prompt D가 생성한 질문 선택 정책
  question_pool JSONB,                                      -- QSE 출력 (q1_candidates, q2_candidates, q3_candidates)

  -- Prompt E 결과
  drill_session_plan JSONB,                                 -- Q1/Q2/Q3 세션 계획

  -- 졸업 추적
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'improving', 'graduated', 'hold')),
  drill_pass_count INTEGER NOT NULL DEFAULT 0,              -- 졸업 조건: 2회
  transfer_pass_count INTEGER NOT NULL DEFAULT 0,           -- 졸업 조건: 1회
  retest_pass_count INTEGER NOT NULL DEFAULT 0,             -- 졸업 조건: 1회

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tutoring_focuses_session ON tutoring_focuses(session_id);

-- ============================================================
-- 3. tutoring_drills — 드릴 문항 (focus당 Q1/Q2/Q3)
-- ============================================================
CREATE TABLE tutoring_drills (
  id TEXT PRIMARY KEY,                                      -- td_xxxxxxxx
  focus_id TEXT NOT NULL REFERENCES tutoring_focuses(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL CHECK (question_number BETWEEN 1 AND 3),
  question_id TEXT NOT NULL,                                -- questions.id
  question_english TEXT NOT NULL,
  topic TEXT,                                               -- questions.topic
  goal TEXT,                                                -- Q1:학습, Q2:적용, Q3:독립
  hint_level TEXT NOT NULL                                  -- full, reduced, minimal
    CHECK (hint_level IN ('full', 'reduced', 'minimal')),
  frame_slots JSONB,                                        -- [{slot, frame_en, label_ko}]
  sample_answer TEXT,
  pass_criteria JSONB,                                      -- {required_flags[], min_word_count, min_duration_sec, ...}
  rule_only_hint TEXT,                                      -- Q3용 규칙 1줄

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'passed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tutoring_drills_focus ON tutoring_drills(focus_id);

-- ============================================================
-- 4. tutoring_attempts — 드릴 시도 기록 (drill당 다수)
-- ============================================================
CREATE TABLE tutoring_attempts (
  id TEXT PRIMARY KEY,                                      -- ta_xxxxxxxx
  drill_id TEXT NOT NULL REFERENCES tutoring_drills(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,

  -- 녹음/STT 결과
  transcript TEXT,
  audio_url TEXT,
  audio_duration NUMERIC(6,1),
  word_count INTEGER,
  wpm NUMERIC(5,1),
  filler_word_count INTEGER,
  filler_ratio NUMERIC(4,3),
  long_pause_count INTEGER,
  pronunciation_assessment JSONB,

  -- 피드백 결과
  layer1_result JSONB,                                      -- Layer 1 규칙 엔진 출력
  layer2_result JSONB,                                      -- Prompt F 출력 (escalation 시)
  result TEXT NOT NULL DEFAULT 'pending'
    CHECK (result IN ('pending', 'pass', 'retry', 'escalate_l2')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tutoring_attempts_drill ON tutoring_attempts(drill_id);

-- ============================================================
-- 5. tutoring_retests — 미니 재평가
-- ============================================================
CREATE TABLE tutoring_retests (
  id TEXT PRIMARY KEY,                                      -- tr_xxxxxxxx
  focus_id TEXT NOT NULL REFERENCES tutoring_focuses(id) ON DELETE CASCADE,
  retest_mode TEXT NOT NULL
    CHECK (retest_mode IN ('bottleneck', 'type', 'topic')),
  questions JSONB NOT NULL,                                 -- [{question_id, question_english, topic}]
  results JSONB,                                            -- [{question_id, transcript, audio_url, passed}]
  overall_result TEXT
    CHECK (overall_result IN ('graduated', 'improving', 'hold')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tutoring_retests_focus ON tutoring_retests(focus_id);

-- ============================================================
-- 6. type_templates — 참조 데이터 (seed)
-- ============================================================
CREATE TABLE type_templates (
  type_code TEXT PRIMARY KEY,
  type_label_ko TEXT NOT NULL,
  db_question_types TEXT[] NOT NULL,
  purpose TEXT,
  core_skill_targets TEXT[],
  default_slot_order TEXT[],
  slot_definitions JSONB,
  default_pass_criteria TEXT[],
  default_retest_criteria TEXT[],
  layer1_markers JSONB,                                     -- marker sets for Layer 1 규칙 엔진
  graduation_relevance TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. level_modifiers — 등급별 수행 요구 (seed)
-- ============================================================
CREATE TABLE level_modifiers (
  level_code TEXT PRIMARY KEY,
  level_label TEXT NOT NULL,
  target_text_type TEXT,
  sentence_target JSONB,                                    -- {min, recommended}
  word_count_target JSONB,                                  -- {min, recommended}
  duration_target_sec JSONB,                                -- {min, recommended}
  required_discourse_features TEXT[],
  feedback_policy JSONB,                                    -- frame_strength, slot_rescue 허용 등
  pass_adjustments JSONB,                                   -- strictness 등
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Seed: type_templates (Phase 1 우선 4종 + 나머지 5종)
-- ============================================================
INSERT INTO type_templates (type_code, type_label_ko, db_question_types, purpose, core_skill_targets, default_slot_order, slot_definitions, default_pass_criteria, default_retest_criteria, layer1_markers, graduation_relevance) VALUES

-- 1. description (묘사)
('description', '묘사', ARRAY['description'],
 '대상/장소/사물의 특징을 구조적으로 설명하게 한다.',
 ARRAY['description', 'detail_expansion', 'sentence_stability'],
 ARRAY['topic_anchor', 'main_features', 'personal_comment'],
 '{"topic_anchor": {"label_ko": "대상 소개", "required": true}, "main_features": {"label_ko": "핵심 특징 2~3개", "required": true}, "personal_comment": {"label_ko": "개인적 느낌/이유", "required": false}}'::jsonb,
 ARRAY['topic_anchor_present', 'feature_count_min_2'],
 ARRAY['topic_anchor_present', 'feature_count_min_2', 'no_major_collapse'],
 '{"topic_anchor": ["my favorite", "i really like", "the best thing", "let me tell you about", "i want to describe"], "features": ["it has", "there is", "one thing", "another thing", "also", "and it", "the reason"], "personal": ["i like it because", "thats why", "i think", "for me"]}'::jsonb,
 'medium'),

-- 2. routine (루틴)
('routine', '루틴', ARRAY['routine'],
 '평소 습관이나 반복 행동을 순서와 빈도로 설명하게 한다.',
 ARRAY['sequence', 'habit_description', 'connector_usage'],
 ARRAY['routine_anchor', 'step_1', 'step_2', 'step_3_optional', 'habit_or_reason'],
 '{"routine_anchor": {"label_ko": "상황 열기", "required": true}, "step_1": {"label_ko": "첫 단계", "required": true}, "step_2": {"label_ko": "다음 단계", "required": true}, "step_3_optional": {"label_ko": "후속 단계", "required": false}, "habit_or_reason": {"label_ko": "마무리/이유", "required": false}}'::jsonb,
 ARRAY['routine_anchor_present', 'sequence_progression', 'minimum_two_steps'],
 ARRAY['sequence_progression', 'minimum_three_steps', 'no_major_collapse'],
 '{"sequence": ["first", "then", "next", "after that", "finally", "later", "before that", "second"], "routine_anchor": ["usually", "normally", "every day", "every morning", "on weekdays", "when i", "my routine"], "habit": ["i always", "i tend to", "i like to", "thats how"]}'::jsonb,
 'medium'),

-- 3. comparison (비교) — Phase 1 핵심
('comparison', '비교/변화', ARRAY['comparison'],
 '두 시점 또는 두 대상을 비교하고 차이와 이유를 말하게 한다.',
 ARRAY['contrast', 'reasoning', 'comparison_structure'],
 ARRAY['past_state', 'present_state', 'difference_statement', 'reason_statement'],
 '{"past_state": {"label_ko": "과거 상태", "required": true}, "present_state": {"label_ko": "현재 상태", "required": true}, "difference_statement": {"label_ko": "핵심 차이", "required": true}, "reason_statement": {"label_ko": "이유", "required": true}}'::jsonb,
 ARRAY['past_mention', 'present_mention', 'difference_statement', 'reason_statement'],
 ARRAY['past_mention', 'present_mention', 'difference_statement', 'reason_statement', 'no_major_collapse'],
 '{"past": ["in the past", "before", "when i was younger", "back then", "used to", "years ago", "when i was a kid", "growing up"], "present": ["these days", "now", "nowadays", "today", "currently", "recently", "at the moment"], "difference": ["different", "the biggest difference", "more than", "less than", "compared to", "unlike", "whereas", "on the other hand", "changed"], "reason": ["because", "since", "thats why", "the reason is", "so now", "due to", "i think this is because", "this happened because"]}'::jsonb,
 'high'),

-- 4. rp_12 (롤플레이 문제해결) — Phase 1 핵심
('rp_12', '롤플레이 12 (문제 해결)', ARRAY['rp_12'],
 '문제를 설명하고 이유와 대안을 요청하게 한다.',
 ARRAY['problem_explanation', 'repair_strategy', 'alternative_request'],
 ARRAY['opening_optional', 'problem_statement', 'reason_or_detail', 'alternative_request', 'confirmation_optional'],
 '{"opening_optional": {"label_ko": "도입/사과", "required": false}, "problem_statement": {"label_ko": "문제 설명", "required": true}, "reason_or_detail": {"label_ko": "세부 설명/이유", "required": true}, "alternative_request": {"label_ko": "대안 제시", "required": true}, "confirmation_optional": {"label_ko": "확인/마무리", "required": false}}'::jsonb,
 ARRAY['problem_statement', 'reason_or_detail', 'alternative_request'],
 ARRAY['problem_statement', 'reason_or_detail', 'alternative_request', 'no_major_collapse'],
 '{"problem": ["there is a problem", "it doesnt work", "i cant", "something is wrong", "unfortunately", "im afraid", "the issue is", "the problem is", "it seems like", "i noticed that"], "reason": ["because", "the reason is", "what happened was", "it turns out", "apparently"], "alternative": ["instead", "another option", "alternatively", "or i can", "could you", "maybe i can", "would it be possible", "how about", "is there any way", "one option is", "another option is"], "apology": ["im sorry", "i apologize", "excuse me", "i hate to say this"]}'::jsonb,
 'high'),

-- 5. past_childhood (과거경험 어린시절)
('past_childhood', '과거 경험(어린 시절)', ARRAY['past_childhood'],
 '어린 시절 경험을 과거 시점과 배경을 포함해 말하게 한다.',
 ARRAY['past_narration', 'time_anchor', 'detail_expansion'],
 ARRAY['time_anchor', 'background', 'main_event', 'result_or_feeling'],
 '{"time_anchor": {"label_ko": "시간 배경", "required": true}, "background": {"label_ko": "상황 배경", "required": true}, "main_event": {"label_ko": "핵심 사건", "required": true}, "result_or_feeling": {"label_ko": "결과/느낌", "required": false}}'::jsonb,
 ARRAY['past_anchor_present', 'main_event_present'],
 ARRAY['past_anchor_present', 'main_event_present', 'result_or_feeling_present'],
 '{"past_anchor": ["when i was young", "when i was a kid", "growing up", "as a child", "i remember", "back when i was", "years ago"], "event": ["one day", "one time", "there was", "i went", "we did", "it happened"], "feeling": ["i felt", "it was", "i was so", "that was", "i still remember", "i loved", "it made me"]}'::jsonb,
 'high'),

-- 6. past_special (과거경험 특별한 경험)
('past_special', '과거 경험(특별한 경험)', ARRAY['past_special'],
 '기억에 남는 사건을 시간 흐름과 결과 중심으로 서술하게 한다.',
 ARRAY['timeline_flow', 'event_narration', 'connected_discourse'],
 ARRAY['event_anchor', 'before_or_setup', 'main_event', 'after_or_result', 'feeling_or_significance'],
 '{"event_anchor": {"label_ko": "사건 배경", "required": true}, "before_or_setup": {"label_ko": "상황 설정", "required": false}, "main_event": {"label_ko": "핵심 사건", "required": true}, "after_or_result": {"label_ko": "결과", "required": false}, "feeling_or_significance": {"label_ko": "느낌/의미", "required": false}}'::jsonb,
 ARRAY['event_anchor_present', 'sequence_progression', 'result_or_feeling_present'],
 ARRAY['event_anchor_present', 'sequence_progression', 'result_or_feeling_present', 'no_major_collapse'],
 '{"sequence": ["first", "then", "next", "after that", "finally", "later", "suddenly", "at that moment"], "event_anchor": ["one day", "last year", "a few months ago", "i remember", "there was a time", "the most memorable"], "feeling": ["i felt", "it was amazing", "i was so", "that experience", "i learned", "since then"]}'::jsonb,
 'high'),

-- 7. past_recent (과거경험 최근)
('past_recent', '과거 경험(최근)', ARRAY['past_recent'],
 '최근 경험을 시간 순서로 자연스럽게 설명하게 한다.',
 ARRAY['recent_time_frame', 'sequence', 'fluency', 'detail'],
 ARRAY['recent_context', 'what_happened_first', 'what_happened_next', 'outcome', 'comment_or_feeling'],
 '{"recent_context": {"label_ko": "최근 배경", "required": true}, "what_happened_first": {"label_ko": "처음 일", "required": true}, "what_happened_next": {"label_ko": "다음 일", "required": true}, "outcome": {"label_ko": "결과", "required": false}, "comment_or_feeling": {"label_ko": "코멘트/느낌", "required": false}}'::jsonb,
 ARRAY['recent_anchor_present', 'sequence_progression', 'outcome_present'],
 ARRAY['recent_anchor_present', 'sequence_progression', 'outcome_present', 'no_major_collapse'],
 '{"recent_anchor": ["recently", "last week", "a few days ago", "just the other day", "not long ago", "the last time"], "sequence": ["first", "then", "after that", "finally", "so", "and then"], "outcome": ["in the end", "it turned out", "so now", "eventually", "i ended up"]}'::jsonb,
 'high'),

-- 8. rp_11 (롤플레이 질문하기)
('rp_11', '롤플레이 11 (정보 질문)', ARRAY['rp_11'],
 '정보를 얻기 위해 질문을 구조적으로 구성하게 한다.',
 ARRAY['questioning', 'information_category_coverage', 'conversation_opening'],
 ARRAY['opening', 'question_1', 'question_2', 'question_3', 'closing_optional'],
 '{"opening": {"label_ko": "도입", "required": false}, "question_1": {"label_ko": "질문 1", "required": true}, "question_2": {"label_ko": "질문 2", "required": true}, "question_3": {"label_ko": "질문 3", "required": true}, "closing_optional": {"label_ko": "마무리", "required": false}}'::jsonb,
 ARRAY['minimum_three_questions', 'category_diversity_min_2'],
 ARRAY['minimum_three_questions', 'category_diversity_min_2', 'no_major_collapse'],
 '{"question_markers": ["how much", "how long", "when does", "where is", "what time", "do i need", "is there", "can i", "could you tell me", "i was wondering", "id like to know", "what kind of"], "opening": ["hello", "hi", "excuse me", "im calling to", "i was wondering"], "closing": ["thank you", "thanks", "i appreciate", "thats all"]}'::jsonb,
 'high'),

-- 9. adv_14 (고급 변화/비교)
('adv_14', '고급 14 (변화/비교)', ARRAY['adv_14'],
 '사회적/일반적 변화와 원인, 영향을 설명하게 한다.',
 ARRAY['trend_explanation', 'cause_analysis', 'impact_statement'],
 ARRAY['change_statement', 'comparison_or_trend', 'cause', 'impact'],
 '{"change_statement": {"label_ko": "변화 설명", "required": true}, "comparison_or_trend": {"label_ko": "비교/추세", "required": true}, "cause": {"label_ko": "원인", "required": false}, "impact": {"label_ko": "영향/결과", "required": false}}'::jsonb,
 ARRAY['change_statement', 'cause_statement'],
 ARRAY['change_statement', 'cause_statement', 'impact_statement'],
 '{"change": ["has changed", "is different", "has evolved", "used to be", "not anymore", "these days", "over the years", "in recent years"], "cause": ["because", "due to", "the main reason", "this is because", "thanks to", "as a result of"], "impact": ["as a result", "this has led to", "because of this", "the impact is", "it affects", "this means that"]}'::jsonb,
 'high'),

-- 10. adv_15 (고급 이슈/의견)
('adv_15', '고급 15 (이슈/의견)', ARRAY['adv_15'],
 '이슈 배경, 반응, 중요성, 개인 의견을 구조적으로 제시하게 한다.',
 ARRAY['issue_framing', 'public_reaction', 'opinion_support'],
 ARRAY['issue_background', 'public_reaction', 'why_it_matters', 'personal_opinion'],
 '{"issue_background": {"label_ko": "이슈 배경", "required": true}, "public_reaction": {"label_ko": "대중 반응", "required": false}, "why_it_matters": {"label_ko": "중요성", "required": false}, "personal_opinion": {"label_ko": "개인 의견", "required": true}}'::jsonb,
 ARRAY['issue_background', 'personal_opinion'],
 ARRAY['issue_background', 'public_reaction', 'personal_opinion'],
 '{"issue": ["recently", "these days", "there has been", "one issue is", "a big concern is", "people are talking about"], "reaction": ["many people think", "some people believe", "there are concerns", "people are worried", "the public reaction"], "opinion": ["i think", "in my opinion", "personally", "i believe", "from my perspective", "as far as im concerned"]}'::jsonb,
 'high');

-- ============================================================
-- Seed: level_modifiers (6개 등급)
-- ============================================================
INSERT INTO level_modifiers (level_code, level_label, target_text_type, sentence_target, word_count_target, duration_target_sec, required_discourse_features, feedback_policy, pass_adjustments) VALUES

('IL', 'Intermediate Low', 'sentence_level',
 '{"min": 2, "recommended": 3}'::jsonb,
 '{"min": 10, "recommended": 16}'::jsonb,
 '{"min": 8, "recommended": 12}'::jsonb,
 ARRAY[]::text[],
 '{"frame_strength": "strong", "allow_slot_rescue_on_q1": true, "allow_slot_rescue_on_q2": true, "q3_hint_level": "medium"}'::jsonb,
 '{"strictness": "low"}'::jsonb),

('IM1', 'Intermediate Mid 1', 'sentence_chain_entry',
 '{"min": 3, "recommended": 4}'::jsonb,
 '{"min": 14, "recommended": 22}'::jsonb,
 '{"min": 10, "recommended": 16}'::jsonb,
 ARRAY['basic_connector'],
 '{"frame_strength": "strong", "allow_slot_rescue_on_q1": true, "allow_slot_rescue_on_q2": true, "q3_hint_level": "medium"}'::jsonb,
 '{"strictness": "low"}'::jsonb),

('IM2', 'Intermediate Mid 2', 'sentence_chain',
 '{"min": 4, "recommended": 5}'::jsonb,
 '{"min": 20, "recommended": 30}'::jsonb,
 '{"min": 12, "recommended": 18}'::jsonb,
 ARRAY['basic_detail', 'simple_reason_optional'],
 '{"frame_strength": "medium", "allow_slot_rescue_on_q1": true, "allow_slot_rescue_on_q2": false, "q3_hint_level": "minimal"}'::jsonb,
 '{"strictness": "medium"}'::jsonb),

('IM3', 'Intermediate Mid 3', 'connected_discourse_entry',
 '{"min": 5, "recommended": 6}'::jsonb,
 '{"min": 28, "recommended": 40}'::jsonb,
 '{"min": 16, "recommended": 22}'::jsonb,
 ARRAY['basic_reasoning', 'clear_transition'],
 '{"frame_strength": "medium", "allow_slot_rescue_on_q1": true, "allow_slot_rescue_on_q2": false, "q3_hint_level": "minimal"}'::jsonb,
 '{"strictness": "medium"}'::jsonb),

('IH', 'Intermediate High', 'connected_discourse_stable',
 '{"min": 6, "recommended": 8}'::jsonb,
 '{"min": 38, "recommended": 55}'::jsonb,
 '{"min": 22, "recommended": 30}'::jsonb,
 ARRAY['example_support', 'multi_sentence_development'],
 '{"frame_strength": "weak", "allow_slot_rescue_on_q1": false, "allow_slot_rescue_on_q2": false, "q3_hint_level": "none"}'::jsonb,
 '{"strictness": "high"}'::jsonb),

('AL', 'Advanced Low', 'paragraph_discourse',
 '{"min": 8, "recommended": 10}'::jsonb,
 '{"min": 50, "recommended": 75}'::jsonb,
 '{"min": 28, "recommended": 40}'::jsonb,
 ARRAY['cause_impact_reasoning', 'structured_opinion'],
 '{"frame_strength": "minimal", "allow_slot_rescue_on_q1": false, "allow_slot_rescue_on_q2": false, "q3_hint_level": "none"}'::jsonb,
 '{"strictness": "high"}'::jsonb);

-- ============================================================
-- RLS 정책
-- ============================================================

-- tutoring_sessions: 본인 CRUD
ALTER TABLE tutoring_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tutoring_sessions_user_all" ON tutoring_sessions
  FOR ALL USING (auth.uid() = user_id);

-- tutoring_focuses: 본인 세션 기반
ALTER TABLE tutoring_focuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tutoring_focuses_user_all" ON tutoring_focuses
  FOR ALL USING (
    session_id IN (SELECT id FROM tutoring_sessions WHERE user_id = auth.uid())
  );

-- tutoring_drills: 본인 focus 기반
ALTER TABLE tutoring_drills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tutoring_drills_user_all" ON tutoring_drills
  FOR ALL USING (
    focus_id IN (
      SELECT f.id FROM tutoring_focuses f
      JOIN tutoring_sessions s ON s.id = f.session_id
      WHERE s.user_id = auth.uid()
    )
  );

-- tutoring_attempts: 본인 drill 기반
ALTER TABLE tutoring_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tutoring_attempts_user_all" ON tutoring_attempts
  FOR ALL USING (
    drill_id IN (
      SELECT d.id FROM tutoring_drills d
      JOIN tutoring_focuses f ON f.id = d.focus_id
      JOIN tutoring_sessions s ON s.id = f.session_id
      WHERE s.user_id = auth.uid()
    )
  );

-- tutoring_retests: 본인 focus 기반
ALTER TABLE tutoring_retests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tutoring_retests_user_all" ON tutoring_retests
  FOR ALL USING (
    focus_id IN (
      SELECT f.id FROM tutoring_focuses f
      JOIN tutoring_sessions s ON s.id = f.session_id
      WHERE s.user_id = auth.uid()
    )
  );

-- type_templates: 전체 읽기
ALTER TABLE type_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "type_templates_read_all" ON type_templates
  FOR SELECT USING (true);

-- level_modifiers: 전체 읽기
ALTER TABLE level_modifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "level_modifiers_read_all" ON level_modifiers
  FOR SELECT USING (true);

-- Storage: 튜터링 녹음 버킷 (기존에 삭제됐을 수 있으므로 재생성 불필요 — 코드에서 처리)
