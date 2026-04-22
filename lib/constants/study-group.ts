import type { StudyFlowStep, GameInfo } from "@/lib/types/study-group";

/* ══════════════════════════════════════════
   5-Phase 팟캐스트 스터디 진행 단계 (UI 메타)
   ══════════════════════════════════════════ */

export const STUDY_FLOW_STEPS: StudyFlowStep[] = [
  { phase: 1, name: "워밍업", nameEn: "Warm-up", duration: "5분", durationSeconds: 300, description: "에피소드 주제 관련 아이스브레이커 질문으로 분위기 풀기" },
  { phase: 2, name: "핵심 표현", nameEn: "Key Expressions", duration: "10분", durationSeconds: 600, description: "핵심 표현 5~7개를 리뷰하고 예문으로 연습" },
  { phase: 3, name: "함께 듣기", nameEn: "Listen Together", duration: "10~15분", durationSeconds: 900, description: "팟캐스트 에피소드를 함께 듣기" },
  { phase: 4, name: "이해도 체크", nameEn: "Comprehension Check", duration: "10분", durationSeconds: 600, description: "내용 이해 질문으로 들은 내용 확인" },
  { phase: 5, name: "토론", nameEn: "Discussion", duration: "20~25분", durationSeconds: 1500, description: "토론 질문으로 돌아가며 의견 나누기" },
];

/* ══════════════════════════════════════════
   프리토킹 카테고리 라벨 (UI 메타)
   ══════════════════════════════════════════ */

export const FREE_TALK_CATEGORY_LABELS: Record<string, string> = {
  daily: "일상생활",
  opinions: "의견 나누기",
  hypothetical: "만약에...",
  culture: "한국 문화",
  current: "시사/트렌드",
};

/* ══════════════════════════════════════════
   게임 메타 정보 (규칙, 아이콘, 타이머 — UI 전용)
   콘텐츠 데이터는 DB(study_game_cards)에서 조회
   ══════════════════════════════════════════ */

export const GAME_INFO: GameInfo[] = [
  {
    type: "taboo",
    name: "Taboo",
    nameKo: "금칙어",
    icon: "Ban",
    description: "금지 단어를 사용하지 않고 목표 단어를 설명하세요!",
    rules: [
      "설명하는 사람은 목표 단어(Target)를 말할 수 없어요",
      "빨간색 금지 단어(Forbidden)도 사용 금지!",
      "제스처, 소리 효과 사용 금지 — 오직 영어로만 설명",
      "60초 안에 팀원이 맞추면 성공!",
    ],
    timerSeconds: 60,
  },
  {
    type: "would-you-rather",
    name: "Would You Rather",
    nameKo: "이거 아니면 저거",
    icon: "ArrowLeftRight",
    description: "두 가지 선택지 중 하나를 고르고 이유를 설명하세요!",
    rules: [
      "두 선택지 중 반드시 하나를 골라야 해요",
      "'둘 다' 또는 '둘 다 싫어'는 금지!",
      "선택한 이유를 영어로 설명하세요",
      "다른 사람의 선택에 대해 질문하고 토론하세요",
    ],
    timerSeconds: 120,
  },
  {
    type: "debate",
    name: "Debate",
    nameKo: "찬반토론",
    icon: "Scale",
    description: "주제에 대해 찬성과 반대로 나뉘어 토론하세요!",
    rules: [
      "찬성팀과 반대팀으로 나뉘세요 (홀수면 심판 1명)",
      "각 팀 2분 준비 시간",
      "찬성팀 3분 발언 → 반대팀 3분 발언",
      "자유 토론 2분 → 심판/투표로 승패 결정",
    ],
    timerSeconds: 180,
  },
  {
    type: "two-truths",
    name: "Two Truths and a Lie",
    nameKo: "두 개의 진실, 한 개의 거짓",
    icon: "Eye",
    description: "3가지 문장 중 거짓을 찾아내세요!",
    rules: [
      "자기 차례에 영어로 3가지 문장을 말하세요",
      "2개는 진실, 1개는 거짓이어야 해요",
      "다른 사람들이 질문하고 거짓을 맞춰보세요",
      "거짓을 맞추면 1점! 가장 많이 속인 사람이 승리",
    ],
    timerSeconds: 120,
  },
  {
    type: "story-chain",
    name: "Story Chain",
    nameKo: "이어말하기",
    icon: "Link",
    description: "한 사람씩 이야기를 이어서 만들어 가세요!",
    rules: [
      "시작 문장이 주어지면 순서대로 이야기를 이어가세요",
      "각자 2~3문장을 추가하세요",
      "30초 안에 이어야 해요 — 멈추면 다음 사람!",
      "이야기가 자연스럽게 연결되도록 노력하세요",
    ],
    timerSeconds: 30,
  },
];
