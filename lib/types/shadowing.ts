// 쉐도잉(답변뱅크) — 타입 (현재 questions DB 기준 재구성)
//   구조: question_type_eng(10유형) → topic → question, 모범답안은 id로 join
//   데이터: questions DB(471) + answer-bank.json(508) + answer-bank-gap.json(9)

import type { QuestionType } from "@/lib/types/coaching";

// 유형 식별자 — DB 10유형 + 기타(DB에 없는 뱅크 답변 보존용)
export type ShadowType = QuestionType | "etc";

// 원본 답변 JSON 1행 (answer-bank.json / answer-bank-gap.json 공용)
//   answer-bank.json은 uid/type/domain 등 추가 필드가 있으나 여기선 미사용
export interface RawBankEntry {
  id: string;
  domain?: string | null; // 같은 종류 묶음 (묘사: place/person/thing/activity/society 등)
  topic: string;
  question: string;
  answer: string;
}

// 모범답안 슬롯 분해 1조각 (콘텐츠 슬롯 또는 필러 슬롯)
export interface SlotSeg {
  slot: string; // identity/atmosphere/... 또는 f_open/f_detail/f_personal/f_close
  text: string;
}

// 쉐도잉 질문 1건 (DB 질문 + 매칭 모범답안)
export interface ShadowQuestion {
  id: string;
  topic: string;
  domain: string | null; // 같은 종류 묶음 (묘사만 유의미: 장소/사람/사물/활동/사회)
  question_english: string;
  question_korean: string | null;
  audio_url: string | null; // DB 질문 음성 (기타 섹션은 null)
  answer: string | null; // 모범답안 (매칭 없으면 null)
  structure: SlotSeg[] | null; // 슬롯 분해 (있으면 구조 보기 가능)
  engineKey: string | null; // 슬롯 라벨/골격 조회용 (묘사=도메인, 그 외=유형)
}

// 도메인(같은 종류 묶음) 한글 라벨 + 표시 순서
export const DOMAIN_LABELS: Record<string, string> = {
  place: "장소",
  person: "사람",
  thing: "사물",
  activity: "활동",
  society: "사회",
  childhood: "어릴적",
  recent: "최근",
  memorable: "기억에 남는",
  change: "변화",
  advanced: "고급",
};

export const DOMAIN_ORDER = [
  "place",
  "person",
  "thing",
  "activity",
  "society",
  "childhood",
  "recent",
  "memorable",
  "change",
  "advanced",
];

// ── 슬롯 분해(구조 보기) 메타 ──

// 필러 슬롯 (담화 연결 — 머뭇거림 X). 모든 엔진 공통.
export const FILLER_SLOTS = new Set(["f_open", "f_detail", "f_personal", "f_close"]);
export const FILLER_LABEL: Record<string, string> = {
  f_open: "도입",
  f_detail: "전개",
  f_personal: "개인",
  f_close: "맺음",
};

export interface SlotMetaItem {
  key: string;
  label: string;
  star: number; // 0 / 1(★) / 2(★★)
}

// 엔진별 콘텐츠 슬롯 (표준 순서). 키=엔진(묘사는 도메인 place/person/thing/activity/society).
//   슬롯키가 겹쳐도 엔진마다 라벨/★가 달라서 엔진 단위로 관리. 필러(f_*)는 공통이라 미포함.
export const ENGINE_SLOTS: Record<string, SlotMetaItem[]> = {
  place: [
    { key: "identity", label: "소개", star: 0 },
    { key: "location", label: "위치", star: 0 },
    { key: "appearance", label: "생김새", star: 0 },
    { key: "atmosphere", label: "분위기", star: 1 },
    { key: "purpose", label: "사람들", star: 0 },
    { key: "service", label: "서비스", star: 0 },
    { key: "usage", label: "나의 이용", star: 1 },
    { key: "connection", label: "나와의 관계", star: 1 },
    { key: "frequency", label: "빈도", star: 0 },
    { key: "feature", label: "특징", star: 0 },
    { key: "reason", label: "이유", star: 0 },
    { key: "emotion", label: "마무리", star: 2 },
  ],
  person: [
    { key: "identity", label: "누구·관계", star: 0 },
    { key: "appearance", label: "생김새", star: 0 },
    { key: "personality", label: "성격·반응", star: 2 },
    { key: "what_we_do", label: "같이 하는 일", star: 1 },
    { key: "connection", label: "계기·일화", star: 1 },
    { key: "reason", label: "이유", star: 0 },
    { key: "emotion", label: "마무리", star: 2 },
  ],
  thing: [
    { key: "identity", label: "무슨 사물", star: 0 },
    { key: "appearance", label: "생김새", star: 0 },
    { key: "feature", label: "기능·특징", star: 1 },
    { key: "usage", label: "나의 사용", star: 1 },
    { key: "benefit", label: "도움·변화", star: 1 },
    { key: "emotion", label: "마무리", star: 2 },
  ],
  activity: [
    { key: "identity", label: "무슨 활동", star: 0 },
    { key: "what_kind", label: "종류·취향", star: 2 },
    { key: "how_when", label: "어떻게·언제", star: 0 },
    { key: "who_with", label: "누구와", star: 0 },
    { key: "connection", label: "나와의 사이", star: 1 },
    { key: "frequency", label: "빈도", star: 0 },
    { key: "reason", label: "이유", star: 1 },
    { key: "emotion", label: "마무리", star: 2 },
  ],
  society: [
    { key: "topic_intro", label: "주제 도입", star: 0 },
    { key: "types", label: "종류·예시", star: 1 },
    { key: "characteristics", label: "특징", star: 0 },
    { key: "how_people", label: "사람들·추세", star: 1 },
    { key: "my_view", label: "내 생각", star: 2 },
  ],
  // 경험 EVENT 엔진 (전부 과거시제, 8슬롯). past_childhood/recent/special 공통.
  event: [
    { key: "when", label: "언제", star: 0 },
    { key: "who", label: "누구와", star: 0 },
    { key: "where", label: "어디서", star: 0 },
    { key: "background", label: "계기", star: 0 },
    { key: "scene", label: "현장", star: 0 },
    { key: "activity", label: "무슨 일", star: 1 },
    { key: "feeling", label: "그때 기분", star: 1 },
    { key: "memorability", label: "여운", star: 2 },
  ],
  // 루틴 ROUTINE (전부 현재, 순서로 쪼개기)
  routine: [
    { key: "frequency", label: "빈도", star: 0 },
    { key: "big_action", label: "큰 행동", star: 0 },
    { key: "step1", label: "먼저", star: 1 },
    { key: "step2", label: "그다음", star: 1 },
    { key: "step3", label: "마지막", star: 0 },
    { key: "feeling", label: "느낌", star: 1 },
  ],
  // 비교 COMPARISON (두 시제: past=과거, 나머지=현재)
  comparison: [
    { key: "past", label: "옛날엔", star: 1 },
    { key: "present", label: "요즘은", star: 1 },
    { key: "difference", label: "핵심 차이", star: 1 },
    { key: "opinion", label: "내 의견", star: 2 },
  ],
  // 사회이슈 OPINION (현상→원인→영향→의견)
  opinion: [
    { key: "phenomenon", label: "현상", star: 1 },
    { key: "cause", label: "원인", star: 1 },
    { key: "effect", label: "영향", star: 1 },
    { key: "opinion", label: "내 생각", star: 2 },
  ],
  // 롤플레이 11 질문하기 (필러 없음, 질문 연속)
  rp_q: [
    { key: "opening", label: "도입", star: 0 },
    { key: "q_chain", label: "질문", star: 2 },
    { key: "closing", label: "마무리", star: 0 },
  ],
  // 롤플레이 12 문제해결 (필러 없음, 상황=과거/요청=현재)
  rp_p: [
    { key: "opening", label: "도입", star: 0 },
    { key: "situation", label: "상황 설명", star: 1 },
    { key: "panic", label: "당황", star: 0 },
    { key: "options", label: "대안 2~3", star: 2 },
    { key: "closing", label: "마무리", star: 0 },
  ],
};

// 엔진 키 → 한글 라벨 (골격 제목용)
export const ENGINE_LABELS: Record<string, string> = {
  place: "장소",
  person: "사람",
  thing: "사물",
  activity: "활동",
  society: "사회",
  event: "경험",
  routine: "루틴",
  comparison: "비교",
  opinion: "사회이슈",
  rp_q: "질문하기",
  rp_p: "문제해결",
};

// 질문 유형(question_type_eng) → 엔진 키. 묘사는 도메인을 별도로 사용.
//   경험 3종(past_childhood/recent/special)은 한 EVENT 엔진을 공유.
export const TYPE_TO_ENGINE: Record<string, string> = {
  past_childhood: "event",
  past_recent: "event",
  past_special: "event",
  routine: "routine",
  comparison: "comparison",
  adv_14: "comparison",
  adv_15: "opinion",
  rp_11: "rp_q",
  rp_12: "rp_p",
};

// 엔진에 없는 슬롯키 폴백 라벨 (팀원이 가끔 엔진 밖 키를 써도 영문 노출 방지)
export const GLOBAL_SLOT_LABEL: Record<string, string> = {
  identity: "소개",
  location: "위치",
  appearance: "생김새",
  atmosphere: "분위기",
  purpose: "사람들",
  service: "서비스",
  usage: "사용",
  connection: "관계",
  frequency: "빈도",
  feature: "특징",
  reason: "이유",
  emotion: "마무리",
  personality: "성격",
  what_we_do: "하는 일",
  benefit: "도움",
  what_kind: "종류·취향",
  how_when: "어떻게·언제",
  who_with: "누구와",
  topic_intro: "주제 도입",
  types: "종류·예시",
  characteristics: "특징",
  how_people: "사람들·추세",
  my_view: "내 생각",
  when: "언제",
  who: "누구와",
  where: "어디서",
  background: "계기",
  scene: "현장",
  activity: "무슨 일",
  feeling: "그때 기분",
  memorability: "여운",
  big_action: "큰 행동",
  step1: "먼저",
  step2: "그다음",
  step3: "마지막",
  past: "옛날엔",
  present: "요즘은",
  difference: "차이",
  opinion: "의견",
  phenomenon: "현상",
  cause: "원인",
  effect: "영향",
  q_chain: "질문",
  opening: "도입",
  situation: "상황",
  panic: "당황",
  options: "대안",
  closing: "마무리",
};

// 엔진 키로 슬롯 라벨/★ 조회 (필러는 공통, 엔진에 없으면 글로벌 폴백)
export function slotLabel(engineKey: string | null, slotKey: string): string {
  if (FILLER_SLOTS.has(slotKey)) return FILLER_LABEL[slotKey] ?? slotKey;
  const found = engineKey ? ENGINE_SLOTS[engineKey]?.find((s) => s.key === slotKey) : undefined;
  return found?.label ?? GLOBAL_SLOT_LABEL[slotKey] ?? slotKey;
}
export function slotStar(engineKey: string | null, slotKey: string): number {
  if (FILLER_SLOTS.has(slotKey)) return 0;
  const found = engineKey ? ENGINE_SLOTS[engineKey]?.find((s) => s.key === slotKey) : undefined;
  return found?.star ?? 0;
}

// IH 안정권 셀프체크 (녹음 후 자가평가)
export const IH_CHECKLIST = [
  "90초 동안 끊김 없이 말했나요?",
  "한 주제에서 안 샜나요?",
  "시제가 끝까지 일관됐나요? (현재면 현재)",
  "문단처럼 흘렀나요? (문장 나열 X)",
  "이유를 한 개 이상 말했나요?",
];

// 유형 카드
export interface ShadowTypeCard {
  type: ShadowType;
  label: string;
  desc: string;
  total: number; // 질문 수
  answered: number; // 모범답안 보유 수
}
