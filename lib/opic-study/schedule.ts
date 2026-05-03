/**
 * 오픽 스터디 일정 — 타입 + 상태 계산 헬퍼
 *
 * 사용처: 멤버 홈 화면의 "지금 무엇을 할 수 있는가" 분기.
 *
 * 정책 (시작 시점):
 *   - 모든 그룹 공통 일정 (system_settings.opic_study_schedule)
 *   - 매주 정해진 요일/시간에 진행
 *   - KST(Asia/Seoul) 기준
 */

// ============================================================
// 상수
// ============================================================

/**
 * 운영 종료 시각 이후 활성 세션을 자동 정리하기까지의 grace 시간.
 * 운영 종료 (예: 08:30) + 60분 = 09:30 이후엔 active 세션이 abandoned 처리됨.
 */
export const SESSION_GRACE_MINUTES = 60;

/**
 * 운영 시작 시각 N분 전부터 입장 가능 (멤버들이 일찍 모일 수 있게).
 * 그 이전엔 카드는 보이되 입장 버튼은 비활성.
 */
export const ENTRY_OPEN_MINUTES_BEFORE = 30;

// ============================================================
// 타입
// ============================================================

export type MeetingMode = "online" | "offline";

export interface OpicStudySchedule {
  /** 요일 배열 (0=일, 1=월, …, 6=토) */
  days: number[];
  /** "HH:MM" KST */
  start_time: string;
  /** "HH:MM" KST */
  end_time: string;
  /** "YYYY-MM-DD" — 이 날짜 이전엔 "첫 스터디 전" 상태 */
  first_session_date: string;
  /** 그룹 기본 모임 방식 */
  default_mode: MeetingMode;
  /** 요일별 모드 override — key는 dayOfWeek 문자열 ("0"~"6"). 없으면 default_mode */
  day_modes?: Record<string, MeetingMode>;
  /** 시간대. 미지정 시 'Asia/Seoul'. 그룹별 schedule에서는 생략. */
  timezone?: string;
}

export type SessionStateKind =
  | "live" //          활성 세션 있음 + 운영 시간 안
  | "live_overtime" // 활성 세션 있음 + 운영 시간 후 + grace 이내 (마무리 중)
  | "ready" //         활성 세션 X + 운영 시간 안 (시작 가능)
  | "today_soon" //    시작 30분 전 ~ 시작 시점 (입장 가능)
  | "today_before" //  시작 30분 이상 전 (오늘 운영일)
  | "today_after" //   운영 종료 + grace 지남 (활성 세션 X)
  | "weekend" //       운영 요일 아닌 날
  | "before_first"; // 첫 스터디 시작일 이전

export interface SessionState {
  kind: SessionStateKind;
  /** 다음 세션 시작 시각 (live/before_first 외에는 카운트다운 기준) */
  nextSessionStart: Date | null;
  /** 다음 세션 종료 시각 */
  nextSessionEnd: Date | null;
  /** "오늘 진행 중" 시 종료까지 남은 ms */
  liveRemainingMs: number | null;
  /** 다음 세션까지 남은 ms (live가 아닐 때) */
  nextRemainingMs: number | null;
  /** 이번 주(월~일) 각 운영 요일별 진행 상태 */
  thisWeek: WeekDayStatus[];
}

export interface WeekDayStatus {
  /** 0=일, …, 6=토 */
  dayOfWeek: number;
  /** "YYYY-MM-DD" KST */
  dateKst: string;
  /** 운영 요일인가 */
  isOperationalDay: boolean;
  /** "done" | "live" | "today" | "upcoming" | "off" */
  status: "done" | "live" | "today" | "upcoming" | "off";
}

// ============================================================
// 헬퍼 — KST 변환
// ============================================================

const KST_OFFSET_MINUTES = 9 * 60; // UTC+9

/**
 * 임의 Date(서버 UTC)를 KST 기준의 "Y/M/D HH:MM"로 분해
 */
export function toKstParts(date: Date): {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  dayOfWeek: number; // 0=일, …, 6=토
  dateStr: string; // YYYY-MM-DD
} {
  // UTC ms + KST offset → KST의 "벽시계" 시각으로 변환
  const kst = new Date(date.getTime() + KST_OFFSET_MINUTES * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  const hour = kst.getUTCHours();
  const minute = kst.getUTCMinutes();
  const dayOfWeek = kst.getUTCDay();
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { year, month, day, hour, minute, dayOfWeek, dateStr };
}

/**
 * KST 기준 "YYYY-MM-DD" + "HH:MM" → 그 시각의 UTC Date 객체
 */
export function kstToDate(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  // KST 시각 → UTC ms = Date.UTC(y,m-1,d,hh,mm) - KST_OFFSET_MINUTES*60000
  const utcMs =
    Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0) -
    KST_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMs);
}

/**
 * KST 기준 dateStr에서 N일 더한 dateStr 반환
 */
export function addDaysKst(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  // 정오 기준으로 더해서 DST 등 영향 회피 (KST는 DST 없지만 안전하게)
  const ms = Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12) + days * 86400_000;
  const next = new Date(ms);
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

// ============================================================
// 핵심 — 현재 세션 상태 계산
// ============================================================

/**
 * 현재 시각(서버 now) + 일정 → 7가지 상태 + 이번 주 일정.
 *
 * 분기 로직:
 *   - 활성 세션 유무까지 반영해서 정확한 상태로 분기.
 *   - 운영 시간 안 + 활성 X = "ready" (시작 가능)
 *   - 운영 시간 후 + 활성 O + grace 이내 = "live_overtime" (마무리 중)
 *
 * @param schedule  스터디 일정
 * @param now       기준 시각 (테스트 주입 가능). 미지정 시 new Date()
 * @param opts      활성 세션 유무 (기본 false)
 */
export function getCurrentSessionState(
  schedule: OpicStudySchedule,
  now: Date = new Date(),
  opts: { hasActiveSession?: boolean } = {}
): SessionState {
  const hasActive = opts.hasActiveSession ?? false;
  const nowParts = toKstParts(now);
  const nowMs = now.getTime();

  // 첫 스터디 시작일
  const firstStart = kstToDate(schedule.first_session_date, schedule.start_time);

  // ── 첫 스터디 이전
  if (nowMs < firstStart.getTime()) {
    return {
      kind: "before_first",
      nextSessionStart: firstStart,
      nextSessionEnd: kstToDate(schedule.first_session_date, schedule.end_time),
      liveRemainingMs: null,
      nextRemainingMs: firstStart.getTime() - nowMs,
      thisWeek: buildWeekStatus(schedule, nowParts.dateStr, nowMs),
    };
  }

  const week = buildWeekStatus(schedule, nowParts.dateStr, nowMs);
  const isToday = schedule.days.includes(nowParts.dayOfWeek);

  if (isToday) {
    const todayStart = kstToDate(nowParts.dateStr, schedule.start_time);
    const todayEnd = kstToDate(nowParts.dateStr, schedule.end_time);
    const todayEndPlusGrace =
      todayEnd.getTime() + SESSION_GRACE_MINUTES * 60_000;

    // 시간 전 — 30분 전부터는 today_soon (입장 가능), 그 이전은 today_before
    if (nowMs < todayStart.getTime()) {
      const entryOpenMs =
        todayStart.getTime() - ENTRY_OPEN_MINUTES_BEFORE * 60_000;
      return {
        kind: nowMs >= entryOpenMs ? "today_soon" : "today_before",
        nextSessionStart: todayStart,
        nextSessionEnd: todayEnd,
        liveRemainingMs: null,
        nextRemainingMs: todayStart.getTime() - nowMs,
        thisWeek: week,
      };
    }

    // 시간 안 — 활성 세션 유무로 분기
    if (nowMs < todayEnd.getTime()) {
      return {
        kind: hasActive ? "live" : "ready",
        nextSessionStart: todayStart,
        nextSessionEnd: todayEnd,
        liveRemainingMs: todayEnd.getTime() - nowMs,
        nextRemainingMs: null,
        thisWeek: week,
      };
    }

    // 시간 후 + grace 이내 + 활성 세션 있음 → 마무리 중
    if (hasActive && nowMs < todayEndPlusGrace) {
      return {
        kind: "live_overtime",
        nextSessionStart: todayStart,
        nextSessionEnd: todayEnd,
        liveRemainingMs: todayEndPlusGrace - nowMs, // grace 종료까지
        nextRemainingMs: null,
        thisWeek: week,
      };
    }

    // 그 외 (운영 종료 + grace 지남, 또는 활성 세션 X)
    const next = findNextOperationalDay(schedule, nowParts.dateStr, 1);
    return {
      kind: "today_after",
      nextSessionStart: next.start,
      nextSessionEnd: next.end,
      liveRemainingMs: null,
      nextRemainingMs: next.start.getTime() - nowMs,
      thisWeek: week,
    };
  }

  // 운영 요일 아님 (보통 토·일)
  const next = findNextOperationalDay(schedule, nowParts.dateStr, 1);
  return {
    kind: "weekend",
    nextSessionStart: next.start,
    nextSessionEnd: next.end,
    liveRemainingMs: null,
    nextRemainingMs: next.start.getTime() - nowMs,
    thisWeek: week,
  };
}

/**
 * fromDateKst부터 N일씩 더해가며 다음 운영 요일을 찾는다.
 * 최대 14일 검색.
 */
function findNextOperationalDay(
  schedule: OpicStudySchedule,
  fromDateKst: string,
  startOffset: number
): { start: Date; end: Date; dateKst: string } {
  for (let i = startOffset; i < startOffset + 14; i++) {
    const candidate = addDaysKst(fromDateKst, i);
    const parts = toKstParts(kstToDate(candidate, "00:00"));
    if (schedule.days.includes(parts.dayOfWeek)) {
      return {
        start: kstToDate(candidate, schedule.start_time),
        end: kstToDate(candidate, schedule.end_time),
        dateKst: candidate,
      };
    }
  }
  // fallback (14일 안에 운영일이 없을 일은 없지만 타입 안전용)
  return {
    start: kstToDate(fromDateKst, schedule.start_time),
    end: kstToDate(fromDateKst, schedule.end_time),
    dateKst: fromDateKst,
  };
}

/**
 * 이번 주(월~일) 각 운영 요일의 진행 상태.
 *
 * 표시 정책:
 *   - 운영 요일 X: status="off"
 *   - 오늘 + 운영 시간 안: "live"
 *   - 오늘 + 운영 시간 전: "today"
 *   - 오늘 + 운영 시간 후: "done"
 *   - 과거 운영일: "done"
 *   - 미래 운영일: "upcoming"
 */
function buildWeekStatus(
  schedule: OpicStudySchedule,
  todayDateKst: string,
  nowMs: number
): WeekDayStatus[] {
  // 이번 주 월요일 dateKst 계산 (월=1)
  const todayParts = toKstParts(kstToDate(todayDateKst, "00:00"));
  const offsetToMon = todayParts.dayOfWeek === 0 ? -6 : 1 - todayParts.dayOfWeek;
  const mondayDateKst = addDaysKst(todayDateKst, offsetToMon);

  const result: WeekDayStatus[] = [];
  for (let i = 0; i < 7; i++) {
    const dateKst = addDaysKst(mondayDateKst, i);
    const parts = toKstParts(kstToDate(dateKst, "00:00"));
    const isOperationalDay = schedule.days.includes(parts.dayOfWeek);

    let status: WeekDayStatus["status"] = "off";
    if (isOperationalDay) {
      const dayStartMs = kstToDate(dateKst, schedule.start_time).getTime();
      const dayEndMs = kstToDate(dateKst, schedule.end_time).getTime();
      if (dateKst < todayDateKst) status = "done";
      else if (dateKst > todayDateKst) status = "upcoming";
      else if (nowMs >= dayStartMs && nowMs < dayEndMs) status = "live";
      else if (nowMs < dayStartMs) status = "today";
      else status = "done";
    }

    result.push({
      dayOfWeek: parts.dayOfWeek,
      dateKst,
      isOperationalDay,
      status,
    });
  }
  return result;
}

// ============================================================
// 표시용 포맷터
// ============================================================

/** ms → "Hh Mm Ss" 또는 "Mm Ss" */
export function formatRemaining(ms: number): string {
  if (ms < 0) return "0초";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (days > 0) return `${days}일 ${hours}시간`;
  if (hours > 0) return `${hours}시간 ${mins}분`;
  if (mins > 0) return `${mins}분 ${secs}초`;
  return `${secs}초`;
}

/** D-N 형태 ("D-day", "D-3", "D+1") */
export function formatDday(targetMs: number, nowMs: number): string {
  const diffDays = Math.ceil((targetMs - nowMs) / 86400_000);
  if (diffDays === 0) return "D-day";
  if (diffDays > 0) return `D-${diffDays}`;
  return `D+${-diffDays}`;
}

/** "5월 6일 (월)" KST */
export function formatKstDateLabel(date: Date): string {
  const parts = toKstParts(date);
  const dayLabel = ["일", "월", "화", "수", "목", "금", "토"][parts.dayOfWeek];
  return `${parts.month}월 ${parts.day}일 (${dayLabel})`;
}

/** "07:40" KST */
export function formatKstTime(date: Date): string {
  const parts = toKstParts(date);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

// ============================================================
// 모임 방식 (그룹별, 요일별 override 지원)
// ============================================================

/**
 * 특정 날짜의 모임 방식을 schedule 기반으로 결정.
 *
 * 우선순위:
 *   1. day_modes[dayOfWeek] (있으면)
 *   2. default_mode
 *
 * default_mode가 누락된 옛 데이터를 위해 폴백 'online'.
 */
export function getModeForDate(
  schedule: OpicStudySchedule,
  date: Date = new Date()
): MeetingMode {
  const parts = toKstParts(date);
  const dayKey = String(parts.dayOfWeek);
  return schedule.day_modes?.[dayKey] ?? schedule.default_mode ?? "online";
}

// ============================================================
// 세션 만료 판정 — lazy 정리용
// ============================================================

/**
 * 활성 세션이 운영 시간 + grace를 넘겨 만료되었는지 판정.
 *
 * 판정 기준:
 *   세션 시작일(KST) + 그날의 schedule.end_time + SESSION_GRACE_MINUTES < 지금
 *
 * 사용처: getActiveSession SA 등에서 lazy 정리에 활용.
 */
export function isSessionExpired(
  startedAtIso: string,
  schedule: OpicStudySchedule,
  now: Date = new Date()
): boolean {
  const startedAt = new Date(startedAtIso);
  const startedKst = toKstParts(startedAt);
  // 세션이 시작된 날의 운영 종료 시각
  const endOfDay = kstToDate(startedKst.dateStr, schedule.end_time);
  const expireAt = new Date(endOfDay.getTime() + SESSION_GRACE_MINUTES * 60_000);
  return now.getTime() >= expireAt.getTime();
}
