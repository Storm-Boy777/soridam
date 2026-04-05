-- 031_api_usage_logs.sql
-- API 사용량 추적 테이블 (사용량 기반 과금 시스템)
-- 모든 유료 API 호출의 실제 비용을 기록하여 크레딧 차감에 활용

-- ============================================================
-- 1. api_usage_logs 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 연결 정보
  session_type TEXT NOT NULL,       -- 'mock_exam' | 'script' | 'tutoring' | 'shadowing'
  session_id TEXT,                  -- 관련 세션/스크립트 ID (범용 TEXT, nullable)
  feature TEXT NOT NULL,            -- 세부 기능 (아래 feature 목록 참조)

  -- API 정보
  service TEXT NOT NULL,            -- 'openai_chat' | 'openai_whisper' | 'gemini_tts' | 'azure_speech'
  model TEXT NOT NULL,              -- 'gpt-4.1' | 'gpt-4.1-mini' | 'whisper-1' | 'gemini-2.5-pro-preview-tts' | 'azure-pronunciation'
  ef_name TEXT NOT NULL,            -- Edge Function 이름

  -- 사용량 메트릭 (서비스별로 해당 필드만 기록)
  tokens_in INTEGER,                -- 입력 토큰 (OpenAI Chat, Gemini TTS)
  tokens_out INTEGER,               -- 출력 토큰 (OpenAI Chat, Gemini TTS)
  audio_duration_sec NUMERIC(10,2), -- 오디오 길이 초 (Whisper, Azure)
  text_length INTEGER,              -- 입력 텍스트 문자수 (Gemini TTS 참고용)

  -- 비용
  cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,  -- 계산된 USD 비용

  -- 메타데이터
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- 2. 인덱스
-- ============================================================
CREATE INDEX idx_api_usage_user_id ON api_usage_logs(user_id);
CREATE INDEX idx_api_usage_created_at ON api_usage_logs(created_at DESC);
CREATE INDEX idx_api_usage_session ON api_usage_logs(session_type, session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_api_usage_user_period ON api_usage_logs(user_id, created_at DESC);

-- ============================================================
-- 3. RLS
-- ============================================================
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- 사용자: 자신의 사용량만 조회
CREATE POLICY "Users can view own usage logs"
  ON api_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 관리자: 전체 조회
CREATE POLICY "Admin can view all usage logs"
  ON api_usage_logs FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- INSERT: service_role (Edge Functions)만 가능
-- RLS가 활성화되어 있어도 service_role은 bypass하므로 별도 정책 불필요

-- ============================================================
-- 4. 사용자별 비용 합계 조회 함���
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_usage_summary(
  p_user_id UUID,
  p_from TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_to TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  session_type TEXT,
  feature TEXT,
  call_count BIGINT,
  total_cost_usd NUMERIC,
  total_tokens_in BIGINT,
  total_tokens_out BIGINT,
  total_audio_sec NUMERIC
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    session_type,
    feature,
    COUNT(*) AS call_count,
    SUM(cost_usd) AS total_cost_usd,
    SUM(tokens_in) AS total_tokens_in,
    SUM(tokens_out) AS total_tokens_out,
    SUM(audio_duration_sec) AS total_audio_sec
  FROM api_usage_logs
  WHERE user_id = p_user_id
    AND created_at >= p_from
    AND created_at < p_to
  GROUP BY session_type, feature
  ORDER BY total_cost_usd DESC;
$$;

-- ============================================================
-- feature 목록 (참조용 주석)
-- ============================================================
-- script_generate_pass1    : 스크립트 생성 Pass 1
-- script_generate_pass2    : 스크립트 생성 Pass 2 (학습 분석)
-- script_correct_pass1     : 스크립트 교정 Pass 1
-- script_correct_pass2     : 스크립트 ��정 Pass 2 (��습 분석)
-- script_refine_pass1      : 스크립트 수정 Pass 1
-- script_refine_pass2      : 스크립트 수정 Pass 2 (학습 분석)
-- script_evaluate_stt      : 쉐도잉 평가 STT (Whisper)
-- script_evaluate_gpt      : 쉐도잉 평가 GPT
-- tts_generate             : TTS 음성 생성 (Gemini)
-- tts_timestamp            : TTS 타임스탬프 (Whisper)
-- mock_stt                 : 모의고사 STT (Whisper)
-- mock_pronunciation       : 모의고사 발음 평가 (Azure)
-- mock_eval                : 모의고사 체크박스 평가 (GPT)
-- mock_consult             : 모의고사 소견 생��� (GPT)
-- mock_report_overview     : ��의고사 종합 리포트 (GPT)
-- mock_report_growth       : 모의고사 성장 ���포트 (GPT)
-- tutoring_diagnose_c      : 튜터링 병목 분석 Prompt C (GPT)
-- tutoring_diagnose_d      : 튜��링 처방 생성 Prompt D (GPT)
-- tutoring_drills_e        : 튜터링 드릴 생성 Prompt E (GPT)
-- tutoring_evaluate_stt    : 튜터링 드릴 STT (Whisper)
-- tutoring_evaluate_f      : 튜터링 드릴 평가 Prompt F (GPT)
