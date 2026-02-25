-- ============================================================
-- 004_scripts.sql
-- 하루오픽 Step 2: 스크립트 + 쉐도잉 모듈 (6테이블 + RLS + Storage)
-- 생성일: 2026-02-25
-- ============================================================

-- ============================================================
-- ai_prompt_templates (System Prompt 저장 — 스크립트 + 튜터링 공유)
-- ============================================================

CREATE TABLE ai_prompt_templates (
  id              SERIAL PRIMARY KEY,
  template_id     TEXT UNIQUE NOT NULL,     -- 'script_system', 'evaluate_level', 'evaluate_realtest', 'evaluate_shadowing'
  prompt_name     TEXT,                     -- 사람이 읽을 수 있는 이름
  system_prompt   TEXT NOT NULL,            -- System Prompt (고정 원칙 — API 캐싱 대상)
  user_template   TEXT,                     -- User Prompt 템플릿 (변수 치환용 골격)
  model           TEXT DEFAULT 'gpt-4.1',
  temperature     NUMERIC(2,1) DEFAULT 0.8,
  max_tokens      INTEGER DEFAULT 4000,
  response_format TEXT DEFAULT 'json_schema',
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- updated_at 트리거
CREATE TRIGGER trigger_ai_prompt_templates_updated_at
  BEFORE UPDATE ON ai_prompt_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS: 서비스 키로만 관리, 클라이언트는 읽기 전용
ALTER TABLE ai_prompt_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_prompt_templates_read"
  ON ai_prompt_templates FOR SELECT
  USING (true);

-- ============================================================
-- script_specs (등급별 스크립트 규격서 — 60행, 4개 섹션 분리)
-- ============================================================

CREATE TABLE script_specs (
  id                SERIAL PRIMARY KEY,
  guide_id          TEXT UNIQUE NOT NULL,     -- 'description_IL', 'routine_IM2', 'advanced_14_AL' 등
  answer_type       TEXT NOT NULL,            -- 10가지 답변 유형
  target_level      TEXT NOT NULL,            -- IL, IM1, IM2, IM3, IH, AL
  total_slots       SMALLINT NOT NULL,        -- 등급별 슬롯 개수
  level_constraints TEXT NOT NULL,            -- 언어 기준 + 금지 사항 → User ① LEVEL GATE
  slot_structure    TEXT NOT NULL,            -- 분량 기준 + 담화 패턴 + 슬롯 구조 → User ② STRUCTURE
  example_output    JSONB NOT NULL,           -- 완성된 JSON 출력 예시 → User ③ EXAMPLE
  eval_criteria     TEXT NOT NULL,            -- 평가 기준 → System 자가 검증
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_script_specs_answer_type ON script_specs(answer_type);
CREATE INDEX idx_script_specs_target_level ON script_specs(target_level);

-- updated_at 트리거
CREATE TRIGGER trigger_script_specs_updated_at
  BEFORE UPDATE ON script_specs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS: 서비스 키로만 관리, 클라이언트는 읽기 전용
ALTER TABLE script_specs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "script_specs_read"
  ON script_specs FOR SELECT
  USING (true);

-- ============================================================
-- scripts (통합 스크립트 — 스크립트 생성 + 튜터링 교정 공유)
-- ============================================================

CREATE TABLE scripts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id     TEXT NOT NULL REFERENCES master_questions(question_id),
  source          TEXT NOT NULL DEFAULT 'generate' CHECK (source IN ('generate','correct')),
  title           TEXT,
  english_text    TEXT NOT NULL,                -- full_text.english (검색/목록 미리보기)
  korean_translation TEXT,                      -- full_text.korean
  paragraphs      JSONB,                        -- 4계층: paragraphs > slots > sentences > parts(T/E/F) (S-1)
  total_slots     SMALLINT,
  category        TEXT,                         -- topic_category 값
  topic           TEXT,
  question_korean TEXT,
  question_english TEXT,
  user_story      TEXT,                         -- 생성 시 한국어 스토리
  user_original_answer TEXT,                    -- 교정 시 학습자 원본 답변
  target_level    TEXT,
  answer_type     TEXT,
  ai_model        TEXT DEFAULT 'gpt-4.1',
  word_count      INTEGER,
  generation_time INTEGER,                      -- 초 단위
  key_expressions JSONB DEFAULT '[]',
  highlighted_script TEXT,
  -- 수정/재생성 관리 (S-3, S-6)
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed')),
  refine_count    SMALLINT NOT NULL DEFAULT 0,  -- 수정 횟수 (최대 3)
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)                  -- 사용자당 질문당 1개 (UPSERT)
);

-- 인덱스
CREATE INDEX idx_scripts_user_id ON scripts(user_id);
CREATE INDEX idx_scripts_question_id ON scripts(question_id);
CREATE INDEX idx_scripts_category ON scripts(category);
CREATE INDEX idx_scripts_source ON scripts(source);
CREATE INDEX idx_scripts_status ON scripts(status);

-- updated_at 트리거
CREATE TRIGGER trigger_scripts_updated_at
  BEFORE UPDATE ON scripts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;

-- 본인 INSERT
CREATE POLICY "scripts_insert_own"
  ON scripts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 본인 SELECT
CREATE POLICY "scripts_select_own"
  ON scripts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 본인 UPDATE
CREATE POLICY "scripts_update_own"
  ON scripts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 본인 DELETE
CREATE POLICY "scripts_delete_own"
  ON scripts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- script_packages (TTS 음성 + 쉐도잉 타임스탬프)
-- ============================================================

CREATE TABLE script_packages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  script_id       UUID NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  status          TEXT DEFAULT 'processing' CHECK (status IN ('processing','completed','partial','failed')),
  progress        SMALLINT DEFAULT 0,
  wav_file_path   TEXT,                         -- Storage URL (TTS 음성)
  json_file_path  TEXT,                         -- Storage URL (타임스탬프 JSON)
  timestamp_data  JSONB,                        -- [{index, english, korean, start, end, duration}]
  wav_file_size   INTEGER,
  tts_voice       TEXT DEFAULT 'Mark',          -- ElevenLabs 음성 (Mark/Alexandra)
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX idx_script_packages_user_id ON script_packages(user_id);
CREATE INDEX idx_script_packages_script_id ON script_packages(script_id);
CREATE INDEX idx_script_packages_status ON script_packages(status);

-- RLS
ALTER TABLE script_packages ENABLE ROW LEVEL SECURITY;

-- 본인 INSERT
CREATE POLICY "script_packages_insert_own"
  ON script_packages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 본인 SELECT
CREATE POLICY "script_packages_select_own"
  ON script_packages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 본인 UPDATE
CREATE POLICY "script_packages_update_own"
  ON script_packages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 본인 DELETE
CREATE POLICY "script_packages_delete_own"
  ON script_packages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- shadowing_sessions (실전 평가 세션 — Step 5 전용)
-- ============================================================

CREATE TABLE shadowing_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id      UUID NOT NULL REFERENCES script_packages(id) ON DELETE CASCADE,
  script_id       UUID NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  question_text   TEXT,                         -- 영문 질문
  question_korean TEXT,                         -- 한글 질문
  topic           TEXT,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','completed')),
  audio_duration  NUMERIC(8,2),                 -- 녹음 길이 (초)
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX idx_shadowing_sessions_user ON shadowing_sessions(user_id);
CREATE INDEX idx_shadowing_sessions_script ON shadowing_sessions(script_id);

-- RLS
ALTER TABLE shadowing_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shadowing_sessions_all_own"
  ON shadowing_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- shadowing_evaluations (AI 평가 결과)
-- ============================================================

CREATE TABLE shadowing_evaluations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID NOT NULL REFERENCES shadowing_sessions(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transcript          TEXT NOT NULL,             -- Whisper STT 결과
  word_count          INTEGER,

  -- 5영역 점수 (5점 만점)
  pronunciation       NUMERIC(3,1),
  fluency             NUMERIC(3,1),
  grammar             NUMERIC(3,1),
  vocabulary          NUMERIC(3,1),
  content_score       NUMERIC(3,1),              -- content는 예약어 회피
  overall_score       NUMERIC(5,1),              -- 총점 (0-100)
  estimated_level     TEXT,                      -- OPIc 등급 추정 (IL~AL)
  script_utilization  NUMERIC(5,1),              -- 스크립트 활용도 (0-100)

  -- AI 피드백
  strengths           TEXT[],
  weaknesses          TEXT[],
  suggestions         TEXT[],
  script_analysis     JSONB,                     -- {key_sentences_used, key_vocabulary_used, missing_elements}

  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_shadowing_evaluations_session ON shadowing_evaluations(session_id);
CREATE INDEX idx_shadowing_evaluations_user ON shadowing_evaluations(user_id);

-- RLS
ALTER TABLE shadowing_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shadowing_evaluations_select_own"
  ON shadowing_evaluations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "shadowing_evaluations_insert_own"
  ON shadowing_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Storage 버킷: script-packages
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('script-packages', 'script-packages', true)
ON CONFLICT (id) DO NOTHING;

-- 공개 읽기
CREATE POLICY "script_packages_storage_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'script-packages');

-- 인증 사용자 업로드
CREATE POLICY "script_packages_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'script-packages');

-- 인증 사용자 삭제
CREATE POLICY "script_packages_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'script-packages');

-- ============================================================
-- RPC: 스크립트 크레딧 차감 (플랜 → 횟수권 순서)
-- ============================================================

CREATE OR REPLACE FUNCTION consume_script_credit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan_credits INTEGER;
  v_credits INTEGER;
BEGIN
  -- 현재 크레딧 조회
  SELECT plan_script_credits, script_credits
  INTO v_plan_credits, v_credits
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- 플랜 크레딧 먼저 차감
  IF v_plan_credits > 0 THEN
    UPDATE user_credits
    SET plan_script_credits = plan_script_credits - 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;

  -- 횟수권 크레딧 차감
  IF v_credits > 0 THEN
    UPDATE user_credits
    SET script_credits = script_credits - 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;

  -- 잔여 크레딧 없음
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC: 스크립트 크레딧 환불 (API 에러 시)
-- ============================================================

CREATE OR REPLACE FUNCTION refund_script_credit(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- 횟수권 크레딧으로 환불 (영구)
  UPDATE user_credits
  SET script_credits = script_credits + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ai_prompt_templates 시드 데이터: script_system
-- ============================================================

INSERT INTO ai_prompt_templates (template_id, prompt_name, system_prompt, user_template, model, temperature, max_tokens, response_format)
VALUES (
  'script_system',
  '스크립트 생성/교정 System Prompt',
  E'## ROLE\n\nYou are a certified ACTFL OPIc script coach (10+ years).\nYou transform learner input into natural spoken English scripts\nthat precisely match the target proficiency level.\n\nCore principles:\n1. LEVEL HONESTY — Never exceed the target level. A perfect IM2 script\n   is better than an accidentally IH script.\n2. SPOKEN ENGLISH — This is for a speaking test, not an essay.\n   Use contractions, fillers, and conversational rhythm.\n3. STORY PRESERVATION — Keep the learner''s topics, details, and personality.\n   Expand naturally, never replace.\n4. SLOT FIDELITY — Each slot must fulfill its discourse function.\n\n## CRITICAL RULE — LEVEL COMPLIANCE\n\nYou MUST strictly follow the LEVEL GATE in the user message.\nThe level constraints are absolute.\nNever use grammar, vocabulary, or discourse markers from levels above the target.\nA perfect script that stays within level boundaries is always better than\na script that accidentally uses higher-level expressions.\n\n## T/E/F SEPARATION RULES\n\nEvery sentence is split into parts: template (T), expression (E), filler (F).\n\nDefinitions:\n- template: Topic-independent sentence structure\n  (works if you substitute any topic)\n- expression: Topic-specific content\n  (the learner needs to memorize this)\n- filler: Discourse markers (Well, You know, I mean, Actually...)\n\nRules:\n- T and E must alternate (T-E-T, E-T-E, T-E-T-E-T...)\n- F is always a separate part, does not participate in T/E alternation\n- Removing all F parts must leave valid T/E alternation\n- Template must be ≥3 words of meaningful structure\n- Expression must be a meaningful phrase (not a single common word)\n- Punctuation attaches to the last part\n\nQuality test: \"Can I replace the topic in this template and it still works?\"\n✅ \"I often go to ___\" → park, gym, library all work\n❌ \"I go to the place with ATM machines near ___\" → bank-specific\n\n5 forbidden patterns:\n1. Over-split template: ❌ [T \"The \"] [E \"park\"]\n2. Weak expression: ❌ [E \"visit\"] (single common verb)\n3. Topic info in template: ❌ [T \"there on weekends\"] (weekends = topic-specific)\n4. Filler merged into template: ❌ [T \"Well, I often go\"]\n5. Punctuation-only part: ❌ [T \".\"]\n\n## CONTENT EXPANSION POLICY\n\nBased on how much the learner provides:\n- Level 1 (sufficient input): Restructure into slots, add natural details within their topic scope.\n- Level 2 (partial input — keywords/fragments): Use their keywords as anchors, build slot content around them.\n- Level 3 (no input): Generate a natural, relatable example using the question''s topic.\nIn all cases: Follow level constraints and slot structure.\n\n## KOREAN TRANSLATION\n\n- Natural 의역, not 직역. Use 해요체.\n- 3-layer consistency:\n  sentences[].korean → slot.translation_ko → full_text.korean\n  Concatenating all sentence.korean in a slot must equal slot.translation_ko.\n\n## SELF-VALIDATION (before output)\n\n1. Level check: Any forbidden grammar/vocabulary for this level?\n2. T/E/F check: Any topic-specific words in template parts?\n3. Filler check: Filler count within level-allowed range?\n4. Korean check: sentence.korean concatenation = slot.translation_ko?\n5. Text check: sentence parts concatenation = sentence.english?',

  E'## ① LEVEL GATE — {target_level}\n\n⛔ CRITICAL: Target level is {target_level}. NEVER use expressions from higher levels.\n\n{level_constraints}\n\n---\n\n## ② STRUCTURE — {answer_type} × {target_level}\n\n{slot_structure}\n\n---\n\n## ③ EXAMPLE\n\n{example_output}\n\n---\n\n## ④ INPUT\n\nQuestion: {question_english}\nQuestion (Korean): {question_korean}\nLearner input: {user_story}\nAnswer type: {answer_type}\nTotal slots: {total_slots}\n\n---\n\n## ⑤ GENERATE\n\nGenerate a natural {target_level}-level spoken English script\nfollowing all constraints above. Return JSON only.',

  'gpt-4.1',
  0.8,
  4000,
  'json_schema'
);

-- 쉐도잉 평가 프롬프트 (추후 내용 채움)
INSERT INTO ai_prompt_templates (template_id, prompt_name, system_prompt, model, temperature, max_tokens, response_format)
VALUES (
  'evaluate_shadowing',
  '쉐도잉 실전 평가',
  'You are an ACTFL-certified OPIc speaking evaluator. Evaluate the learner''s spoken answer.',
  'gpt-4.1',
  0.3,
  2000,
  'json_object'
);
