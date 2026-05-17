-- 072_coaching_prompt_v4_graduation.sql
-- AI 코치 — 졸업 판정을 구조화 출력 필드로 통일 (v4)
-- 기존: 졸업 신호는 시스템 프롬프트에만 있고, 화면(ProgressStrip)은 흠 개수만 보고
--       따로 판정 → 프롬프트와 화면이 다른 기준으로 엇갈림
-- 변경: AI가 졸업 신호를 종합 판단해 coaching.graduation 필드로 출력
--       → 화면은 그 값만 사용 (단일 판정 소스)

update ai_prompt_templates
set system_prompt = system_prompt || $append$

---

## ⚠️ 출력 형식 오버라이드 (v4 — 졸업 판정 필드)

위 토픽 졸업 신호(흠 개수·구조·분사구문·어휘 반복·filler 등)를 종합 판단해
`coaching.graduation` 필드로 명시 출력한다 (정확한 스키마는 user 메시지 "# 출력 형식" 참조).
- `graduation.ready`: 졸업 신호를 충분히 충족하면 true, 아니면 false
- `graduation.reason`: 판단 근거 1~2문장 (한국어, 학생에게 보여줄 안내 톤)
화면의 졸업 안내는 이 필드 하나만 보고 표시되므로,
본문(intro/closing)의 졸업 언급과 어긋나지 않게 일관되게 판단한다.
$append$
where template_id in ('coaching_common_library', 'coaching_module_description')
  and system_prompt not like '%v4 — 졸업 판정 필드%';
