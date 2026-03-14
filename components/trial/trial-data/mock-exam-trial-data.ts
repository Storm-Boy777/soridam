// 모의고사 체험판 샘플 데이터
// 기출 풀에서 난이도 5-5 세트 1개를 선정하여 하드코딩

import type { MockTestSession, MockTestAnswer, MockTestEvaluation, MockTestReport } from "@/lib/types/mock-exam";

// 체험판 가상 세션
export const TRIAL_SESSION: MockTestSession = {
  id: "trial_mock_session",
  session_id: "trial_mock_session",
  user_id: "trial-user",
  submission_id: 0,
  mode: "training",
  status: "active",
  question_ids: [
    "SLF_SYS_SYS_UNK_01",
    "SUR_MUS_MUS_ROU_01",
    "SUR_MUS_MUS_DES_01",
    "SUR_MUS_MUS_PST_01",
    "SUR_JOG_JOG_ROU_01",
    "SUR_JOG_JOG_DES_01",
    "SUR_JOG_JOG_EXP_01",
    "SUR_MOV_MOV_ROU_01",
    "SUR_MOV_MOV_DES_01",
    "SUR_MOV_MOV_CMP_01",
    "RP_GEN_PHN_S01_01",
    "RP_GEN_PHN_S01_02",
    "RP_GEN_PHN_S01_03",
    "ADV_GEN_TEC_CMP_01",
    "ADV_GEN_TEC_SOC_01",
  ],
  current_question: 1,
  total_questions: 15,
  holistic_status: "pending",
  report_retry_count: 0,
  report_error: null,
  started_at: new Date().toISOString(),
  completed_at: null,
  expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
};

// 체험판 질문 15개 (고정 기출 — 난이도 5-5)
export const TRIAL_QUESTIONS: Array<{
  id: string;
  question_english: string;
  question_korean: string;
  question_type_eng: string;
  topic: string;
  category: string;
  audio_url: string | null;
}> = [
  {
    id: "SLF_SYS_SYS_UNK_01",
    question_english:
      "Let's start the interview now. Tell me a little bit about yourself.",
    question_korean: "인터뷰를 시작하겠습니다. 자기소개를 해주세요.",
    question_type_eng: "self_intro",
    topic: "자기소개",
    category: "일반",
    audio_url: null,
  },
  {
    id: "SUR_MUS_MUS_ROU_01",
    question_english:
      "You indicated in the survey that you like listening to music. What kind of music do you like? When and where do you usually listen to music?",
    question_korean:
      "설문에서 음악 감상을 좋아한다고 하셨는데요. 어떤 종류의 음악을 좋아하나요? 보통 언제, 어디서 음악을 듣나요?",
    question_type_eng: "routine",
    topic: "음악 감상",
    category: "일반",
    audio_url: null,
  },
  {
    id: "SUR_MUS_MUS_DES_01",
    question_english:
      "Describe your favorite singer or band. Why do you like them? What makes them special to you?",
    question_korean:
      "좋아하는 가수나 밴드를 묘사해 주세요. 왜 좋아하나요? 무엇이 그들을 특별하게 만드나요?",
    question_type_eng: "description",
    topic: "음악 감상",
    category: "일반",
    audio_url: null,
  },
  {
    id: "SUR_MUS_MUS_PST_01",
    question_english:
      "Tell me about a memorable concert or music event you went to. When was it and what happened? Why was it so special?",
    question_korean:
      "기억에 남는 콘서트나 음악 행사에 대해 말해 주세요. 언제였고 무슨 일이 있었나요? 왜 그렇게 특별했나요?",
    question_type_eng: "past_special",
    topic: "음악 감상",
    category: "일반",
    audio_url: null,
  },
  {
    id: "SUR_JOG_JOG_ROU_01",
    question_english:
      "You indicated in the survey that you like jogging. How often do you jog? Describe your typical jogging routine.",
    question_korean:
      "설문에서 조깅을 좋아한다고 하셨는데요. 얼마나 자주 조깅하나요? 평소 조깅 루틴을 설명해 주세요.",
    question_type_eng: "routine",
    topic: "조깅",
    category: "일반",
    audio_url: null,
  },
  {
    id: "SUR_JOG_JOG_DES_01",
    question_english:
      "Describe the place where you usually go jogging. What does it look like? What do you like about it?",
    question_korean:
      "보통 조깅하는 장소를 묘사해 주세요. 어떤 모습인가요? 어떤 점이 좋나요?",
    question_type_eng: "description",
    topic: "조깅",
    category: "일반",
    audio_url: null,
  },
  {
    id: "SUR_JOG_JOG_EXP_01",
    question_english:
      "Tell me about a memorable experience you had while jogging. What happened? How did you feel?",
    question_korean:
      "조깅하면서 겪은 기억에 남는 경험에 대해 말해 주세요. 무슨 일이 있었나요? 어떤 기분이었나요?",
    question_type_eng: "past_special",
    topic: "조깅",
    category: "일반",
    audio_url: null,
  },
  {
    id: "SUR_MOV_MOV_ROU_01",
    question_english:
      "You indicated in the survey that you like watching movies. How often do you watch movies? Where do you usually watch them?",
    question_korean:
      "설문에서 영화 보는 것을 좋아한다고 하셨는데요. 영화를 얼마나 자주 보나요? 보통 어디서 보나요?",
    question_type_eng: "routine",
    topic: "영화 보기",
    category: "일반",
    audio_url: null,
  },
  {
    id: "SUR_MOV_MOV_DES_01",
    question_english:
      "What is your favorite movie? Describe the movie and explain why you like it.",
    question_korean:
      "가장 좋아하는 영화는 무엇인가요? 그 영화를 묘사하고 왜 좋아하는지 설명해 주세요.",
    question_type_eng: "description",
    topic: "영화 보기",
    category: "일반",
    audio_url: null,
  },
  {
    id: "SUR_MOV_MOV_CMP_01",
    question_english:
      "How have your movie-watching habits changed compared to the past? Do you watch movies differently now?",
    question_korean:
      "과거와 비교해서 영화 보는 습관이 어떻게 변했나요? 지금은 다르게 영화를 보나요?",
    question_type_eng: "comparison_change",
    topic: "영화 보기",
    category: "일반",
    audio_url: null,
  },
  {
    id: "RP_GEN_PHN_S01_01",
    question_english:
      "I'd like to give you a situation to act out. You want to buy a new cell phone. Call the store and ask three or four questions about the phone you want to buy.",
    question_korean:
      "상황극을 드리겠습니다. 새 휴대폰을 사고 싶습니다. 매장에 전화해서 사고 싶은 휴대폰에 대해 3~4개 질문을 하세요.",
    question_type_eng: "ask_questions",
    topic: "전화하기",
    category: "롤플레이",
    audio_url: null,
  },
  {
    id: "RP_GEN_PHN_S01_02",
    question_english:
      "I'm sorry, but there is a problem I need you to resolve. You bought the phone but found out it has a defect. Call the store, explain the problem, and suggest two or three ways to resolve it.",
    question_korean:
      "죄송하지만 해결해야 할 문제가 있습니다. 휴대폰을 샀는데 결함이 있습니다. 매장에 전화해서 문제를 설명하고 2~3가지 해결 방법을 제안하세요.",
    question_type_eng: "suggest_alternatives",
    topic: "전화하기",
    category: "롤플레이",
    audio_url: null,
  },
  {
    id: "RP_GEN_PHN_S01_03",
    question_english:
      "That's the end of the situation. Have you ever had a problem with an electronic device you bought? What was the problem and how did you resolve it?",
    question_korean:
      "상황극이 끝났습니다. 구매한 전자기기에 문제가 생긴 적이 있나요? 무슨 문제였고 어떻게 해결했나요?",
    question_type_eng: "past_experience",
    topic: "전화하기",
    category: "롤플레이",
    audio_url: null,
  },
  {
    id: "ADV_GEN_TEC_CMP_01",
    question_english:
      "How has technology changed the way people communicate with each other? Compare communication today with communication in the past.",
    question_korean:
      "기술이 사람들의 소통 방식을 어떻게 바꿨나요? 오늘날의 소통 방식과 과거의 소통 방식을 비교해 주세요.",
    question_type_eng: "comparison_change",
    topic: "기술/인터넷",
    category: "어드밴스",
    audio_url: null,
  },
  {
    id: "ADV_GEN_TEC_SOC_01",
    question_english:
      "There are concerns about people spending too much time on their smartphones. What are the problems caused by excessive smartphone use? What can be done to address these issues?",
    question_korean:
      "사람들이 스마트폰에 너무 많은 시간을 보내는 것에 대한 우려가 있습니다. 과도한 스마트폰 사용으로 인한 문제점은 무엇인가요? 이 문제를 해결하려면 어떻게 해야 하나요?",
    question_type_eng: "social_issue",
    topic: "기술/인터넷",
    category: "어드밴스",
    audio_url: null,
  },
];

// 체험판 초기 데이터 (MockExamSession의 initialData 구조)
export const TRIAL_INITIAL_DATA = {
  session: TRIAL_SESSION,
  answers: [] as MockTestAnswer[],
  evaluations: [] as MockTestEvaluation[],
  report: null as MockTestReport | null,
  questions: TRIAL_QUESTIONS,
};
