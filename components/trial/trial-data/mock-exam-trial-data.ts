// 모의고사 체험판 샘플 데이터
// 실제 기출 풀(submission 392)에서 난이도 5-5 세트 선정 + audio_url 포함
// Q1 자기소개 + 일반 3세트(음악/병원/해외여행) + 롤플레이 1세트(파티) + 어드밴스 1세트(집)

import type { MockTestSession, MockTestAnswer, MockTestEvaluation, MockTestReport } from "@/lib/types/mock-exam";

// 체험판 15문항 question_ids (기출 세트 순서)
const TRIAL_QUESTION_IDS = [
  "SLF_SYS_SYS_UNK_01",        // Q1: 자기소개
  "MUS_GEN_SEL_DESC_01",        // Q2: 음악 묘사
  "MUS_GEN_SEL_RTN_02",         // Q3: 음악 루틴
  "MUS_GEN_SEL_CHILD_03",       // Q4: 음악 어린시절
  "HSP_GEN_COM_DESC_01",        // Q5: 병원 묘사
  "HSP_GEN_COM_CHILD_03",       // Q6: 병원 어린시절
  "HSP_GEN_COM_SPC_05",         // Q7: 병원 특별경험
  "OTR_GEN_SEL_DESC_01",        // Q8: 해외여행 묘사
  "OTR_GEN_SEL_CHILD_05",       // Q9: 해외여행 어린시절
  "OTR_GEN_SEL_SPC_08",         // Q10: 해외여행 특별경험
  "PTY_RP_COM_Q11_01",          // Q11: 파티 롤플레이 질문하기
  "PTY_RP_COM_Q12_04",          // Q12: 파티 롤플레이 대안제시
  "PTY_RP_COM_SPC_09",          // Q13: 파티 롤플레이 경험
  "HSG_ADV_SEL_Q14_01",         // Q14: 집 어드밴스 비교
  "HSG_ADV_SEL_Q15_03",         // Q15: 집 어드밴스 사회이슈
];

// 체험판 가상 세션
export const TRIAL_SESSION: MockTestSession = {
  id: "trial_mock_session",
  session_id: "trial_mock_session",
  user_id: "trial-user",
  submission_id: 0,
  mode: "test",
  status: "active",
  question_ids: TRIAL_QUESTION_IDS,
  current_question: 1,
  total_questions: 15,
  holistic_status: "pending",
  report_retry_count: 0,
  report_error: null,
  started_at: "2026-03-14T22:00:00.000Z",
  completed_at: null,
  expires_at: "2026-03-17T22:00:00.000Z",
};

// 체험판 질문 15개 (실제 기출 세트 — audio_url 포함)
export const TRIAL_QUESTIONS: Array<{
  id: string;
  question_english: string;
  question_korean: string;
  question_type_eng: string;
  topic: string;
  category: string;
  audio_url: string | null;
}> = [
  // Q1: 자기소개
  {
    id: "SLF_SYS_SYS_UNK_01",
    question_english: "Let's start the interview now. Tell me something about yourself.",
    question_korean: "이제 인터뷰를 시작하겠습니다. 자기소개를 해주세요.",
    question_type_eng: "",
    topic: "자기소개",
    category: "Introduction",
    audio_url: "https://rwdsyqnrrpwkureqfxwb.supabase.co/storage/v1/object/public/audio-recordings/questions/SLF_SYS_SYS_UNK_01.wav",
  },
  // Q2~Q4: 음악
  {
    id: "MUS_GEN_SEL_DESC_01",
    question_english: "You indicated in the survey that you listen to music. What specific genres of music do you usually enjoy? Who are your favorite singers or bands, and what makes their songs so special to you?",
    question_korean: "설문에서 음악을 듣는다고 하셨습니다. 주로 즐겨 듣는 음악 장르에는 어떤 것이 있나요? 좋아하는 가수나 밴드는 누구이며, 그들의 노래가 특별하게 느껴지는 이유는 무엇인가요?",
    question_type_eng: "description",
    topic: "음악",
    category: "일반",
    audio_url: "https://rwdsyqnrrpwkureqfxwb.supabase.co/storage/v1/object/public/audio-recordings/questions/MUS_GEN_SEL_DESC_01.mp3",
  },
  {
    id: "MUS_GEN_SEL_RTN_02",
    question_english: "Tell me about the different ways you enjoy listening to music in your daily life. Where do you typically go to listen to it, and do you prefer listening to the radio or attending live concerts?",
    question_korean: "일상에서 음악을 즐기는 다양한 방법에 대해 말씀해주세요. 주로 어디에서 음악을 듣고, 라디오와 라이브 콘서트 중 어떤 것을 더 선호하나요?",
    question_type_eng: "routine",
    topic: "음악",
    category: "일반",
    audio_url: "https://rwdsyqnrrpwkureqfxwb.supabase.co/storage/v1/object/public/audio-recordings/questions/MUS_GEN_SEL_RTN_02.mp3",
  },
  {
    id: "MUS_GEN_SEL_CHILD_03",
    question_english: "When did you first develop an interest in music? What specific genres or artists did you listen to when you were young? Tell me how your musical taste has evolved from your childhood until today.",
    question_korean: "음악에 처음 관심을 갖게 된 시기는 언제였나요? 어릴 때 들었던 음악 장르나 아티스트는 무엇이었나요? 어린 시절부터 지금까지 음악 취향이 어떻게 변해왔는지 말씀해주세요.",
    question_type_eng: "past_childhood",
    topic: "음악",
    category: "일반",
    audio_url: "https://rwdsyqnrrpwkureqfxwb.supabase.co/storage/v1/object/public/audio-recordings/questions/MUS_GEN_SEL_CHILD_03.mp3",
  },
  // Q5~Q7: 병원
  {
    id: "HSP_GEN_COM_DESC_01",
    question_english: "What is the typical hospital environment like in your country? Describe the overall mood inside these medical centers and the kinds of facilities provided for patients.",
    question_korean: "한국의 일반적인 병원 환경은 어떤가요? 병원 내부의 분위기와 환자들을 위한 시설에 대해 설명해 주세요.",
    question_type_eng: "description",
    topic: "병원",
    category: "일반",
    audio_url: "https://rwdsyqnrrpwkureqfxwb.supabase.co/storage/v1/object/public/audio-recordings/questions/HSP_GEN_COM_DESC_01.mp3",
  },
  {
    id: "HSP_GEN_COM_CHILD_03",
    question_english: "Do you remember having to visit a hospital or clinic when you were a child? Describe the specific reason for your visit, any memorable things that happened, and exactly how you felt at the time.",
    question_korean: "어린 시절 병원이나 의원을 방문했던 기억이 있으신가요? 방문 이유와 기억에 남는 일, 그리고 그때 느꼈던 감정을 구체적으로 말씀해주세요.",
    question_type_eng: "past_childhood",
    topic: "병원",
    category: "일반",
    audio_url: "https://rwdsyqnrrpwkureqfxwb.supabase.co/storage/v1/object/public/audio-recordings/questions/HSP_GEN_COM_CHILD_03.mp3",
  },
  {
    id: "HSP_GEN_COM_SPC_05",
    question_english: "Have you ever had a highly memorable experience involving a trip to the hospital? Please explain what happened during the visit and why that specific medical event stands out so clearly in your memory.",
    question_korean: "병원에 방문했던 경험 중 특히 기억에 남는 일이 있나요? 그때 어떤 일이 있었고, 왜 그 의료 경험이 특별히 기억에 남는지 설명해주세요.",
    question_type_eng: "past_special",
    topic: "병원",
    category: "일반",
    audio_url: "https://rwdsyqnrrpwkureqfxwb.supabase.co/storage/v1/object/public/audio-recordings/questions/HSP_GEN_COM_SPC_05.mp3",
  },
  // Q8~Q10: 해외여행
  {
    id: "OTR_GEN_SEL_DESC_01",
    question_english: "You indicated in the survey that you take vacations internationally. Can you describe a specific overseas city or nation you have traveled to? What were the local scenery and the residents like?",
    question_korean: "설문에서 해외여행을 간다고 하셨는데요. 다녀온 해외 도시나 국가 중 한 곳을 구체적으로 소개해 주세요. 그곳의 풍경과 현지 사람들은 어땠나요?",
    question_type_eng: "description",
    topic: "해외여행",
    category: "일반",
    audio_url: "https://rwdsyqnrrpwkureqfxwb.supabase.co/storage/v1/object/public/audio-recordings/questions/OTR_GEN_SEL_DESC_01.mp3",
  },
  {
    id: "OTR_GEN_SEL_CHILD_05",
    question_english: "Describe your very first trip to another country. Do you remember when it was and where you went? Who did you travel with, what kind of local food did you try, and what made the experience so special? Please share as many details as possible.",
    question_korean: "처음 해외여행을 갔던 경험을 이야기해주세요. 언제, 어디로 갔는지 기억나시나요? 누구와 함께였고, 어떤 현지 음식을 먹어보았는지, 그 경험이 특별했던 이유를 최대한 자세히 말씀해주세요.",
    question_type_eng: "past_childhood",
    topic: "해외여행",
    category: "일반",
    audio_url: "https://rwdsyqnrrpwkureqfxwb.supabase.co/storage/v1/object/public/audio-recordings/questions/OTR_GEN_SEL_CHILD_05.mp3",
  },
  {
    id: "OTR_GEN_SEL_SPC_08",
    question_english: "Occasionally, something completely out of the ordinary happens when we travel abroad. Have you ever faced a surprising or unexpected situation during an international trip? Start by telling me the destination and the timing, and then provide all the details about what made the journey so unforgettable.",
    question_korean: "해외여행 중에는 가끔 전혀 예상치 못한 일이 일어나기도 합니다. 해외여행 중에 놀랍거나 예상치 못한 상황을 겪은 적이 있나요? 여행지와 시기를 먼저 말씀해주시고, 그 여행이 특별히 기억에 남는 이유를 자세히 설명해 주세요.",
    question_type_eng: "past_special",
    topic: "해외여행",
    category: "일반",
    audio_url: "https://rwdsyqnrrpwkureqfxwb.supabase.co/storage/v1/object/public/audio-recordings/questions/OTR_GEN_SEL_SPC_08.mp3",
  },
  // Q11~Q13: 파티 롤플레이
  {
    id: "PTY_RP_COM_Q11_01",
    question_english: "I'd like to give you a situation and ask you to act it out. An old friend just invited you to a get-together at their place. Call your friend and ask three or four questions to find out all the details, like when to arrive and what kind of food or drinks you should bring.",
    question_korean: "상황을 드릴 테니 역할극을 해주세요. 오랜 친구가 집에서 모임에 초대했습니다. 친구에게 전화해서 도착 시간, 준비해야 할 음식이나 음료 등 세 가지나 네 가지 질문을 해주세요.",
    question_type_eng: "rp_11",
    topic: "파티",
    category: "롤플레이",
    audio_url: "https://rwdsyqnrrpwkureqfxwb.supabase.co/storage/v1/object/public/audio-recordings/questions/PTY_RP_COM_Q11_01.mp3",
  },
  {
    id: "PTY_RP_COM_Q12_04",
    question_english: "I'm sorry, but there is a problem which I'll need you to resolve. You just realized you already have a conflicting commitment on the evening of your friend's party. Call your friend, explain the double-booking situation, and offer two or three alternatives to make up for missing the event.",
    question_korean: "죄송하지만 해결해야 할 문제가 있습니다. 친구의 파티가 있는 저녁에 이미 다른 약속이 있다는 것을 이제야 알게 되었습니다. 친구에게 전화해 일정이 겹친 상황을 설명하고, 파티에 참석하지 못하는 대신 보상할 수 있는 두세 가지 대안을 제시해주세요.",
    question_type_eng: "rp_12",
    topic: "파티",
    category: "롤플레이",
    audio_url: "https://rwdsyqnrrpwkureqfxwb.supabase.co/storage/v1/object/public/audio-recordings/questions/PTY_RP_COM_Q12_04.mp3",
  },
  {
    id: "PTY_RP_COM_SPC_09",
    question_english: "That's the end of the situation. Tell me about a time when you genuinely wanted to attend a party or a special celebration, but couldn't make it for some reason. What exactly happened? Share the complete story from beginning to end.",
    question_korean: "정말 참석하고 싶었던 파티나 특별한 행사에 어떤 이유로 가지 못했던 적이 있나요? 어떤 일이 있었는지 처음부터 끝까지 전체 이야기를 들려주세요.",
    question_type_eng: "past_special",
    topic: "파티",
    category: "롤플레이",
    audio_url: "https://rwdsyqnrrpwkureqfxwb.supabase.co/storage/v1/object/public/audio-recordings/questions/PTY_RP_COM_SPC_09.mp3",
  },
  // Q14~Q15: 집 어드밴스
  {
    id: "HSG_ADV_SEL_Q14_01",
    question_english: "I would now like to talk about where you live. Compare how you handle maintenance problems in your home now to how your parents or friends solve issues in their own houses. What are the main similarities and differences in your approaches?",
    question_korean: "이제 거주지에 대해 이야기해보고 싶습니다. 집에서 발생하는 유지보수 문제를 해결하는 방식이 지금과 부모님이나 친구들이 각자의 집에서 문제를 해결하는 방식과 어떻게 비슷하거나 다른지 비교해 주세요.",
    question_type_eng: "adv_14",
    topic: "집",
    category: "어드밴스",
    audio_url: "https://rwdsyqnrrpwkureqfxwb.supabase.co/storage/v1/object/public/audio-recordings/questions/HSG_ADV_SEL_Q14_01.mp3",
  },
  {
    id: "HSG_ADV_SEL_Q15_03",
    question_english: "What are some of the major problems most people face when renting a house or an apartment? How do tenants typically deal with these issues, and how do these housing concerns affect where or how people choose to live?",
    question_korean: "집이나 아파트를 임대할 때 대부분의 사람들이 겪는 주요 문제에는 어떤 것들이 있나요? 세입자들은 보통 이런 문제를 어떻게 해결하며, 이런 주거 문제가 사람들이 어디서, 어떻게 살지에 어떤 영향을 미치나요?",
    question_type_eng: "adv_15",
    topic: "집",
    category: "어드밴스",
    audio_url: "https://rwdsyqnrrpwkureqfxwb.supabase.co/storage/v1/object/public/audio-recordings/questions/HSG_ADV_SEL_Q15_03.mp3",
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
