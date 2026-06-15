// 만능 스토리 — 최소 가상 스토리로 최대 기출 질문을 커버하는 OPIc 훈련 콘텐츠
//   설계 근거: docs/만능스토리-전략분석.md + docs/강사method-AI만능적용.md
//   핵심: 토픽 47개는 흩어져도 답변모드 11개로 수렴 → 모드 단위 암기로 다수 질문 커버
//   AL 레이어: 강지완 AL method(골격단락+격상블록+슬롯)를 입혀 IH 통째대본 → AL 골격으로 업그레이드
//   시제 만능 아크(lib/data/tense-narratives.json)와 동일하게 정적 JSON으로 관리

// 스토리 종류 — 뷰어 안내 배지 분기
//   story    : 통째로 외워 그대로 쓰는 만능 드라마/틀
//   template : 골격 1개 + 토픽별 어휘카드가 필요 (묘사·rp_11)
//   frame    : 골격만 빌리고 내용은 토픽별로 따로 (adv_15 — 만능 저항)
//   engine   : 강사 대표 만능 — 어떤 주제든 이 골격에 꽂는 재사용 엔진 (🤖 AI 만능 등)
export type StoryKind = "story" | "template" | "frame" | "engine";

// 스토리 한 줄 (비트) — IH 기본 뼈대 (쉬운 버전)
export interface StoryBeat {
  n: number; // 순번
  en: string; // 영어 뼈대 문장
  ko: string; // 한국어 번역 (기본 숨김 토글)
  slot?: string; // 질문마다 교체하는 슬롯 안내 (예: "[my laptop / MP3 / bank card]")
  tenseLock?: string; // ⭐ 시제 락인 포인트 (예: "과거형 고정", "could + 동사원형")
}

// ── AL 레이어 (강사 method 적용) ──

// 햄버거 골격 (Topic×2 → Supporting×3 → Concluding → 종료신호)
//   각 문장 안의 [슬롯] = 즉흥(🎲), 나머지 = 외워(🔒)
export interface AlSkeleton {
  topic1: string; // 위 빵: 시작 토픽센텐스
  topic2?: string; // AL 강화: 강화 토픽센텐스 2개째
  supporting: string[]; // 패티: 보통 3덩어리 (구분자 포함)
  conclusion: string; // 아래 빵: 토론 결론
  ending: string; // 종료신호 (incomplete ending 방지)
}

// AL 무기 — 이 스토리에 박는 고급문법·격상·담화 장치 (배지로 강조)
export interface AlWeapon {
  type: "tense" | "grammar" | "vocab" | "connector" | "discourse"; // 분류
  label: string; // "추측 must have pp" 등
  chunk: string; // 외울 정형구 (영어)
}

// 즉흥 슬롯 — 외우지 말고 그날그날 갈아끼우는 변수 (🎲)
export interface StorySlot {
  key: string; // 슬롯 이름 (예: "고장 대상")
  examples: string[]; // 예시 후보
}

// 암기 정책 — 무엇을 외우고(🔒) 무엇을 즉흥(🎲)하나 (화해안 UI용)
export interface MemorizePolicy {
  memorize: string[]; // 외울 레이어 (예: ["alSkeleton", "alWeapons"])
  improvise: string[]; // 즉흥 레이어 (예: ["slots"])
}

// 꼬리질문 방어 디테일 — "tell me everything" 추궁 대비, 같이 외울 앵커
export interface StoryAnchor {
  label: string; // "동행" / "감정" / "해결 디테일"
  en: string; // 외울 디테일 문장
}

// 질문 매핑 — 이 스토리를 어느 기출에 어떻게 갖다 붙이는가
export interface StoryMapping {
  topic: string; // 토픽 라벨 (예: "국내여행")
  question: string; // 질문 요지 (예: "unforgettable trip")
  intro: string; // 도입 변형 한 문장 / 스왑 안내
}

// 만능 스토리 1편
export interface UniversalStory {
  id: string; // slug
  badge: string; // 원형 배지 라벨 ("0" / "A" / "B" / "🤖" ...)
  title: string; // "제주 인생여행"
  mode: string; // 답변모드 라벨 ("과거 · 긍정 에피소드")
  hook: string; // 한 줄 컨셉
  kind: StoryKind;
  leverage?: string; // 강조 배지 ("최대 레버", "최고빈도" 등) — 옵션
  covers: string[]; // 이 스토리 하나로 답할 수 있는 질문 요약
  beats: StoryBeat[]; // IH 기본 뼈대 (쉬운 버전, engine 카드는 빈 배열 가능)
  // ── AL 레이어 (옵션) ──
  alSkeleton?: AlSkeleton; // 햄버거 골격 (AL)
  alWeapons?: AlWeapon[]; // 박을 AL 무기
  slots?: StorySlot[]; // 즉흥 슬롯
  memorizePolicy?: MemorizePolicy; // 암기 정책
  // ── 공통 ──
  anchors?: StoryAnchor[]; // 방어 앵커 (옵션)
  mappings: StoryMapping[]; // 질문별 갖다 붙이는 법
  whitelist?: string[]; // 🟢 안전하게 끼울 수 있는 토픽
  avoid?: string; // 🔴 주의/금지 안내 (옵션)
  tips?: string[]; // 추가 팁 (시제 락인·전략) (옵션)
}

// 목록 카드 derive용
export interface StoryCard {
  id: string;
  badge: string;
  title: string;
  mode: string;
  hook: string;
  kind: StoryKind;
  leverage?: string;
  beatCount: number;
  mappingCount: number;
  hasAl: boolean;
}

// 표준 노출 순서 (ROI 학습 순서 = docs/강사method-AI만능적용.md §7-2)
export const STORY_ORDER = [
  "self-intro", // 0. 자기소개
  "broke-down", // B. 문제해결 ⭐ 최대 레버 (먼저 외움)
  "jeju-trip", // A. 긍정 에피소드
  "concert", // C. 음악/공연 (최고빈도)
  "rp-resolve", // E2. 롤플 문제해결
  "rp-ask", // E1. 롤플 질문하기 (관문)
  "change-arc", // F. 변화 서사 (AI 변화 만능 이식)
  "home-desc", // D. 묘사 허브
  "routine", // 일상틀
  "adv-news", // adv_15 (AI 이슈 만능 이식)
  "ai-change", // 🤖 AI 만능 — 모든 변화 (14번 엔진)
  "ai-issue", // 🤖 AI 만능 — 모든 이슈 (15번 엔진)
];
