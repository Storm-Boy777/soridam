/**
 * 모듈별 1회 완전 플로우 예상 비용 (센트 단위)
 *
 * 각 모듈 시작 전에 잔액이 이 값 미만이면 경고를 표시한다.
 * 잔액이 0이면 기존처럼 완전 차단.
 *
 * TODO: api_usage_logs 데이터가 충분히 쌓이면 실측 평균으로 업데이트
 * 쿼리 예시:
 *   SELECT session_type, round(avg(session_cost)::numeric, 2)
 *   FROM (
 *     SELECT session_type, session_id, sum(cost_usd) * 100 AS session_cost
 *     FROM api_usage_logs
 *     WHERE session_id IS NOT NULL
 *     GROUP BY session_type, session_id
 *   ) t
 *   GROUP BY session_type;
 */
export const ESTIMATED_COST_CENTS = {
  /** 스크립트: 생성(GPT) + 패키지(TTS + 타임스탬프) */
  script: 5,
  /** 모의고사: 15문항 STT + 발음평가 + eval + consult + report */
  mock_exam: 30,
  /** 튜터링: 진단(2회 GPT) + 드릴 생성 + 평가 */
  tutoring: 10,
} as const;
