// 시제 만능 아크 — 경험 23 도메인별 "X와 나의 이야기" 시간축 내러티브
//   목적: 과거↔현재↔미래 시제를 '서사'로 자연 체화 (녹음/평가 없음, 읽기 학습)
//   각 아크는 그 도메인 기출이 요구하는 '사건 비트'를 한 칸 내장 → 만능 답변 겸용
//   설계 근거: 전문가 가이드(서사 우선 시간축, Core 7시제 + 자연스러울 때만 Advanced 4)

// 시간축 한 칸 (beat)
export interface TenseBeat {
  beat: string; // 시간축 라벨: 예전/계기/그 사건/변화/요즘/앞으로 ...
  tense: string; // 시제 라벨: "과거 (Past Simple)" "현재완료 (Present Perfect)" ...
  en: string; // 영어 본문
  ko: string; // 한국어 번역 (기본 숨김 토글)
  why: string; // 해설①: 왜 이 시제를 쓰는가
  role: string; // 해설②: 이야기 속 이 비트의 역할
  incident?: boolean; // ⭐ 사건 만능 비트 (기출 '문제/예상치 못한 일' 질문을 통째 커버)
}

// 도메인 1편 ("X와 나의 이야기")
export interface TenseNarrative {
  id: string; // 도메인 slug (dining/abroad/...)
  domain: string; // 도메인 라벨 ("외식·맛집")
  title: string; // "음식점과 나의 이야기"
  hook: string; // 한 줄 컨셉
  tenses: string[]; // 등장 시제 배지 (등장 순, 중복 제거)
  covers: string[]; // 재활용(해설③): 이 아크가 답하는 기출 (토픽 · 질문 요지)
  beats: TenseBeat[];
}

// 도메인 카드 (목록 derive용 — 클라이언트에서 내러티브로부터 계산)
export interface TenseDomainCard {
  id: string;
  domain: string;
  title: string;
  hook: string;
  beatCount: number;
  tenseCount: number;
  hasIncident: boolean;
}

// 23 도메인 표준 노출 순서
export const TENSE_DOMAIN_ORDER = [
  "dining", // 외식·맛집
  "abroad", // 해외여행
  "domestic", // 국내·자연여행
  "hotel", // 호텔·렌터카
  "movie", // 영화·TV
  "music", // 음악·공연
  "shopping", // 쇼핑·옷
  "internet", // 인터넷
  "device", // 휴대폰·기기
  "home", // 집·가구
  "family", // 가족·친구
  "party", // 모임·파티
  "holiday", // 명절·휴일
  "health", // 건강·운동
  "hospital", // 병원·치과
  "bank", // 은행
  "recycle", // 재활용
  "transport", // 교통·이동
  "appointment", // 약속·예약
  "salon", // 미용실
  "work", // 직장·취업
  "weather", // 날씨
  "leisure", // 여가·집콕휴가
];
