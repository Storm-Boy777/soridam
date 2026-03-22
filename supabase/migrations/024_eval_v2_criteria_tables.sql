-- ============================================================
-- V2 평가 인프라 테이블 3종
-- evaluation_prompts_v2: 프롬프트 저장
-- evaluation_criteria_v2: 등급×유형 60행 기준표
-- wp_type_priority: 유형별 WP 3-Tier 체크 목록 10행
-- ============================================================

-- 1. evaluation_prompts_v2 (프롬프트 저장)
CREATE TABLE IF NOT EXISTS evaluation_prompts_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,           -- 'diagnose_v2', 'consult_v2', 'report_overview_v2', 'report_growth_v2'
  prompt_text TEXT NOT NULL,          -- 프롬프트 전문 (동적 변수 포함)
  description TEXT,                   -- 용도 설명
  model TEXT DEFAULT 'gpt-4.1',      -- 사용 모델
  prompt_version TEXT DEFAULT 'v1',   -- 버전 관리
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. evaluation_criteria_v2 (60행 = 6등급 × 10유형)
CREATE TABLE IF NOT EXISTS evaluation_criteria_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_level TEXT NOT NULL,          -- 'IL', 'IM1', 'IM2', 'IM3', 'IH', 'AL'
  question_type TEXT NOT NULL,         -- 'description', 'routine', 'comparison', ...
  criteria_text TEXT NOT NULL,         -- [과제 기대] + [충족 기준] + [severity 판정] 전문
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(target_level, question_type)
);

-- 3. wp_type_priority (10행 = 유형별)
CREATE TABLE IF NOT EXISTS wp_type_priority (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_type TEXT NOT NULL UNIQUE,  -- 'description', 'routine', ...
  wp_primary TEXT[] NOT NULL,          -- 1차 체크 코드 배열
  wp_secondary TEXT[] NOT NULL,        -- 2차 체크 코드 배열
  wp_low TEXT[] NOT NULL,              -- 낮은 우선순위 코드 배열
  gatekeeper TEXT[] NOT NULL,          -- 게이트키퍼 코드 배열
  critical_combo TEXT,                 -- 치명적 조합 설명 (nullable)
  anti_overtagging TEXT,               -- 과잉 체크 금지 규칙 (nullable)
  interpretation_notes TEXT,           -- 해석 포인트 (nullable)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: 인증된 사용자 읽기 전용 (프롬프트/기준표는 서버에서만 수정)
ALTER TABLE evaluation_prompts_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_criteria_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp_type_priority ENABLE ROW LEVEL SECURITY;

-- 모든 인증 사용자 SELECT 허용
CREATE POLICY "evaluation_prompts_v2_select" ON evaluation_prompts_v2
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "evaluation_criteria_v2_select" ON evaluation_criteria_v2
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "wp_type_priority_select" ON wp_type_priority
  FOR SELECT TO authenticated USING (true);

-- service_role은 전체 접근 (Edge Function에서 사용)
CREATE POLICY "evaluation_prompts_v2_service" ON evaluation_prompts_v2
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "evaluation_criteria_v2_service" ON evaluation_criteria_v2
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "wp_type_priority_service" ON wp_type_priority
  FOR ALL TO service_role USING (true) WITH CHECK (true);
