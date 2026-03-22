// 스크립트 체험판 샘플 데이터
// 실제 API(gpt-4.1)로 생성한 결과물을 하드코딩
// 질문: 음악 > past_childhood / 목표 등급: IH / 197 words
import type { ScriptDetail, ScriptOutput, ScriptPackage, TimestampItem } from "@/lib/types/scripts";

// 체험판용 질문 (일반 > 음악 > 어린 시절 취향 변화)
export const TRIAL_QUESTION = {
  question_id: "MUS_GEN_SEL_CHILD_03",
  question_english:
    "When did you first develop an interest in music? What specific genres or artists did you listen to when you were young? Tell me how your musical taste has evolved from your childhood until today.",
  question_korean:
    "음악에 처음 관심을 갖게 된 시기는 언제였나요? 어릴 때 들었던 음악 장르나 아티스트는 무엇이었나요? 어린 시절부터 지금까지 음악 취향이 어떻게 변해왔는지 말씀해주세요.",
  topic: "음악",
  topic_category: "일반",
  question_type: "past_childhood",
};

// 체험판용 사용자 스토리
export const TRIAL_USER_STORY =
  "어릴때 TV에서 나오는 동요나 만화 주제가 따라부름. 중학교때 아이돌 좋아해서 EXO 앨범 모았음. 고등학교때는 시험기간에 발라드 많이 들었고 요즘은 출퇴근할때 K-pop 듣고 운동할때 팝송 들음";

// 실제 EF(gpt-4.1)가 생성한 paragraphs JSON
const TRIAL_PARAGRAPHS: ScriptOutput = {
  full_text: {
    korean: "어렸을 때 TV에 나오는 노래들 때문에 음악에 처음 관심을 가지게 되었던 게 기억나요. 그때는 만화 주제가나 동요를 따라 부르곤 했어요. 그런 노래가 나오면 집안 분위기가 정말 활기찼고, 듣기만 해도 기분이 좋았어요. 제 방은 항상 TV나 라디오에서 나오는 음악으로 가득했죠. 중학교 때는 케이팝 아이돌 그룹을 정말 좋아했던 게 기억나요. 사실, 그때는 EXO 앨범을 모으곤 했는데, 그만큼 팬이었어요. 새 앨범이 나올 때마다 정말 신났고, 화려한 포스터를 보고 신나는 노래를 듣는 게 너무 특별했어요. 제 책상은 그 앨범에서 받은 포스터로 가득했죠. 고등학교 때는 취향이 좀 변해서, 시험 기간에는 발라드를 많이 듣곤 했어요. 차분하고 부드러운 음악이 집중하는 데 도움이 돼서, 공부할 때 거의 매일 밤 들었죠. 친구들이랑 항상 플레이리스트를 공유하고 신곡에 대해 얘기하곤 했어요. 가끔은 방과 후에 같이 노래를 부르기도 했는데, 정말 재밌었죠. 지금은 취향이 조금 달라졌지만, 아직도 출근길엔 케이팝을 듣고, 운동할 때는 팝송을 틀어요. 이렇게 어린 시절 음악을 떠올리면 좀 그립기도 하고, 그 추억이 저한테 정말 소중해요.",
    english: "I remember when I was a little kid, I first got interested in music because of the songs that played on TV. At that time, I used to sing along to cartoon theme songs and children's songs. The atmosphere at home was really lively whenever those songs came on, and I felt happy just listening to them. My room was always filled with music from the TV or radio. I recall when I was in middle school, I started to really like K-pop idol groups. Actually, I used to collect EXO albums because I was such a big fan back then. The feeling was exciting whenever a new album was released, and seeing all the colorful posters and hearing upbeat songs made everything feel special. My desk was covered with posters that I got from those albums. In high school, my taste changed a bit, and I used to listen to a lot of ballads, especially during exam periods. The calm and soft music helped me focus, so I listened to it almost every night when I was studying. My friends and I used to share our playlists and talk about new songs all the time. Sometimes, we even sang together after school, which was really fun. Although my taste is a bit different now, I still listen to K-pop on my way to work, and I usually play pop songs when I exercise. Yeah, thinking about my childhood music makes me kind of nostalgic because those memories are really precious to me.",
  },
  paragraphs: [
    {
      type: "introduction",
      label: "Introduction",
      slots: [
        {
          slot_index: 1,
          slot_function: "시간/나이 설정",
          text: "I remember when I was a little kid, I first got interested in music because of the songs that played on TV. At that time, I used to sing along to cartoon theme songs and children's songs.",
          translation_ko: "어렸을 때 TV에 나오는 노래들 때문에 음악에 처음 관심을 가지게 되었던 게 기억나요. 그때는 만화 주제가나 동요를 따라 부르곤 했어요.",
          sentences: [
            { index: 1, english: "I remember when I was a little kid, I first got interested in music because of the songs that played on TV.", korean: "어렸을 때 TV에 나오는 노래들 때문에 음악에 처음 관심을 가지게 되었던 게 기억나요." },
            { index: 2, english: "At that time, I used to sing along to cartoon theme songs and children's songs.", korean: "그때는 만화 주제가나 동요를 따라 부르곤 했어요." },
          ],
          keywords: ["childhood", "TV", "children's songs", "cartoon theme songs"],
        },
        {
          slot_index: 2,
          slot_function: "장소/환경 배경",
          text: "The atmosphere at home was really lively whenever those songs came on, and I felt happy just listening to them. My room was always filled with music from the TV or radio.",
          translation_ko: "그런 노래가 나오면 집안 분위기가 정말 활기찼고, 듣기만 해도 기분이 좋았어요. 제 방은 항상 TV나 라디오에서 나오는 음악으로 가득했죠.",
          sentences: [
            { index: 3, english: "The atmosphere at home was really lively whenever those songs came on, and I felt happy just listening to them.", korean: "그런 노래가 나오면 집안 분위기가 정말 활기찼고, 듣기만 해도 기분이 좋았어요." },
            { index: 4, english: "My room was always filled with music from the TV or radio.", korean: "제 방은 항상 TV나 라디오에서 나오는 음악으로 가득했죠." },
          ],
          keywords: ["lively", "atmosphere", "home", "music", "radio"],
        },
      ],
    },
    {
      type: "body",
      label: "Body",
      slots: [
        {
          slot_index: 3,
          slot_function: "구체적 기억/장면",
          text: "I recall when I was in middle school, I started to really like K-pop idol groups. Actually, I used to collect EXO albums because I was such a big fan back then.",
          translation_ko: "중학교 때는 케이팝 아이돌 그룹을 정말 좋아했던 게 기억나요. 사실, 그때는 EXO 앨범을 모으곤 했는데, 그만큼 팬이었어요.",
          sentences: [
            { index: 5, english: "I recall when I was in middle school, I started to really like K-pop idol groups.", korean: "중학교 때는 케이팝 아이돌 그룹을 정말 좋아했던 게 기억나요." },
            { index: 6, english: "Actually, I used to collect EXO albums because I was such a big fan back then.", korean: "사실, 그때는 EXO 앨범을 모으곤 했는데, 그만큼 팬이었어요." },
          ],
          keywords: ["middle school", "K-pop", "idol", "EXO", "albums"],
        },
        {
          slot_index: 4,
          slot_function: "감각적 묘사",
          text: "The feeling was exciting whenever a new album was released, and seeing all the colorful posters and hearing upbeat songs made everything feel special. My desk was covered with posters that I got from those albums.",
          translation_ko: "새 앨범이 나올 때마다 정말 신났고, 화려한 포스터를 보고 신나는 노래를 듣는 게 너무 특별했어요. 제 책상은 그 앨범에서 받은 포스터로 가득했죠.",
          sentences: [
            { index: 7, english: "The feeling was exciting whenever a new album was released, and seeing all the colorful posters and hearing upbeat songs made everything feel special.", korean: "새 앨범이 나올 때마다 정말 신났고, 화려한 포스터를 보고 신나는 노래를 듣는 게 너무 특별했어요." },
            { index: 8, english: "My desk was covered with posters that I got from those albums.", korean: "제 책상은 그 앨범에서 받은 포스터로 가득했죠." },
          ],
          keywords: ["exciting", "colorful posters", "upbeat songs", "special", "desk"],
        },
        {
          slot_index: 5,
          slot_function: "활동/경험",
          text: "In high school, my taste changed a bit, and I used to listen to a lot of ballads, especially during exam periods. The calm and soft music helped me focus, so I listened to it almost every night when I was studying.",
          translation_ko: "고등학교 때는 취향이 좀 변해서, 시험 기간에는 발라드를 많이 듣곤 했어요. 차분하고 부드러운 음악이 집중하는 데 도움이 돼서, 공부할 때 거의 매일 밤 들었죠.",
          sentences: [
            { index: 9, english: "In high school, my taste changed a bit, and I used to listen to a lot of ballads, especially during exam periods.", korean: "고등학교 때는 취향이 좀 변해서, 시험 기간에는 발라드를 많이 듣곤 했어요." },
            { index: 10, english: "The calm and soft music helped me focus, so I listened to it almost every night when I was studying.", korean: "차분하고 부드러운 음악이 집중하는 데 도움이 돼서, 공부할 때 거의 매일 밤 들었죠." },
          ],
          keywords: ["high school", "ballads", "exam", "study", "calm music"],
        },
        {
          slot_index: 6,
          slot_function: "함께한 사람들",
          text: "My friends and I used to share our playlists and talk about new songs all the time. Sometimes, we even sang together after school, which was really fun.",
          translation_ko: "친구들이랑 항상 플레이리스트를 공유하고 신곡에 대해 얘기하곤 했어요. 가끔은 방과 후에 같이 노래를 부르기도 했는데, 정말 재밌었죠.",
          sentences: [
            { index: 11, english: "My friends and I used to share our playlists and talk about new songs all the time.", korean: "친구들이랑 항상 플레이리스트를 공유하고 신곡에 대해 얘기하곤 했어요." },
            { index: 12, english: "Sometimes, we even sang together after school, which was really fun.", korean: "가끔은 방과 후에 같이 노래를 부르기도 했는데, 정말 재밌었죠." },
          ],
          keywords: ["friends", "share", "playlists", "sing together"],
        },
      ],
    },
    {
      type: "conclusion",
      label: "Conclusion",
      slots: [
        {
          slot_index: 7,
          slot_function: "현재 관점/노스탤지어",
          text: "Although my taste is a bit different now, I still listen to K-pop on my way to work, and I usually play pop songs when I exercise. Yeah, thinking about my childhood music makes me kind of nostalgic because those memories are really precious to me.",
          translation_ko: "지금은 취향이 조금 달라졌지만, 아직도 출근길엔 케이팝을 듣고, 운동할 때는 팝송을 틀어요. 이렇게 어린 시절 음악을 떠올리면 좀 그립기도 하고, 그 추억이 저한테 정말 소중해요.",
          sentences: [
            { index: 13, english: "Although my taste is a bit different now, I still listen to K-pop on my way to work, and I usually play pop songs when I exercise.", korean: "지금은 취향이 조금 달라졌지만, 아직도 출근길엔 케이팝을 듣고, 운동할 때는 팝송을 틀어요." },
            { index: 14, english: "Yeah, thinking about my childhood music makes me kind of nostalgic because those memories are really precious to me.", korean: "이렇게 어린 시절 음악을 떠올리면 좀 그립기도 하고, 그 추억이 저한테 정말 소중해요." },
          ],
          keywords: ["now", "K-pop", "pop songs", "work", "exercise", "nostalgic"],
        },
      ],
    },
  ],
  word_count: 197,
  structure_summary: [
    { tag: "Opening", description: "어린 시절 음악에 관심을 갖게 된 계기 소개" },
    { tag: "Detail", description: "어린 시절(어릴 때, 중학교, 고등학교) 음악 취향 변화 구체적으로 설명" },
    { tag: "Main Point", description: "음악 취향이 어떻게 발전했는지 요약" },
    { tag: "Closing", description: "음악과 관련된 추억에 대한 감정 표현 및 마무리" },
  ],
  key_sentences: [
    { english: "I remember when I was a little kid, I first got interested in music because of the songs that played on TV.", reason: "음악에 관심을 갖게 된 최초의 계기를 명확하게 설명하는 문장" },
    { english: "I recall when I was in middle school, I started to really like K-pop idol groups.", reason: "음악 취향의 변화와 구체적인 시기를 연결하는 중요한 문장" },
    { english: "Although my taste is a bit different now, I still listen to K-pop on my way to work, and I usually play pop songs when I exercise.", reason: "현재의 음악 취향과 과거의 연결을 보여주는 핵심 문장" },
    { english: "Yeah, thinking about my childhood music makes me kind of nostalgic because those memories are really precious to me.", reason: "답변을 감정적으로 마무리하는 인상적인 결론 문장" },
  ],
  key_expressions: [
    { en: "got interested in", ko: "~에 관심을 갖게 되다", tip: "관심이 생긴 계기를 말할 때 자주 쓰는 표현입니다." },
    { en: "sing along to", ko: "~에 맞춰 따라 부르다", tip: "노래나 음악을 들으며 함께 부를 때 활용하세요." },
    { en: "collect albums", ko: "앨범을 모으다", tip: "취미나 수집 활동을 설명할 때 쓸 수 있습니다." },
    { en: "my taste changed", ko: "내 취향이 변했다", tip: "취향 변화 설명에 유용한 표현입니다." },
    { en: "helped me focus", ko: "집중하는 데 도움이 되었다", tip: "음악의 효과나 기능을 말할 때 활용하세요." },
    { en: "share our playlists", ko: "플레이리스트를 공유하다", tip: "친구와 음악을 나누는 상황에 쓸 수 있습니다." },
    { en: "makes me kind of nostalgic", ko: "약간 향수를 느끼게 한다", tip: "과거를 떠올릴 때 감정 표현으로 사용하세요." },
  ],
  discourse_markers: [
    { en: "I remember", ko: "나는 기억한다", function: "hesitation", usage: "과거 경험을 떠올리며 말문을 열 때 사용" },
    { en: "At that time,", ko: "그 당시에는", function: "sequencing", usage: "시간 순서로 이야기를 전개할 때 사용" },
    { en: "Actually,", ko: "사실은", function: "engagement", usage: "정보를 강조하거나 추가 설명할 때 사용" },
    { en: "Although", ko: "비록 ~이지만", function: "contrast", usage: "대조되는 내용을 연결할 때 사용" },
    { en: "Yeah,", ko: "그래,", function: "hesitation", usage: "생각을 정리하거나 감정을 강조할 때 사용" },
  ],
  reusable_patterns: [
    { template: "I remember when I ___,", description_ko: "과거의 특정 시점이나 경험을 떠올릴 때 시작하는 패턴", example: "I remember when I traveled abroad for the first time," },
    { template: "At that time, I used to ___", description_ko: "과거의 습관이나 반복 행동을 설명할 때 쓰는 패턴", example: "At that time, I used to play soccer every weekend" },
    { template: "My taste changed and I started to ___", description_ko: "취향이나 선호가 변했음을 설명할 때 활용하는 패턴", example: "My taste changed and I started to enjoy documentaries" },
  ],
  similar_questions: [
    { question: "Tell me about how your hobbies have changed since you were a child.", reuse_hint: "취미 변화에 대해 같은 구조로 답변 가능" },
    { question: "Describe how your favorite food has changed from childhood to now.", reuse_hint: "음식 취향 변화도 같은 방식으로 설명할 수 있음" },
  ],
  expansion_ideas: [
    "가족이나 친구와 음악을 즐겼던 특별한 추억 추가",
    "음악이 학업이나 감정에 미친 영향 구체적으로 설명",
  ],
};

// ── 패키지 데이터 (실제 EF로 생성한 TTS + 타임스탬프) ──

export const TRIAL_PACKAGE_WAV_URL =
  "https://rwdsyqnrrpwkureqfxwb.supabase.co/storage/v1/object/public/script-packages/audio/1320fb1b-8093-4986-8816-d717fe7b1df6.wav";

export const TRIAL_TIMESTAMPS: TimestampItem[] = [
  { index: 1, start: 0, end: 6.78, duration: 6.78, english: "I remember when I was a little kid, I first got interested in music because I used to watch a lot of TV shows.", korean: "어릴 때 TV를 많이 봤던 게 음악에 처음 관심을 갖게 된 계기였어요." },
  { index: 2, start: 7.28, end: 13.28, duration: 6, english: "There were always catchy songs from cartoons or kids' programs, and I really liked singing along with them.", korean: "만화나 어린이 프로그램에서 나오는 신나는 노래들이 항상 나왔고, 저는 그걸 따라 부르는 걸 정말 좋아했거든요." },
  { index: 3, start: 13.76, end: 20.16, duration: 6.4, english: "You know, back then, the atmosphere at home was pretty cheerful because my parents sometimes played old songs, too.", korean: "그때는 집 분위기도 꽤 밝았어요. 부모님도 가끔 옛날 노래를 틀어주셨거든요." },
  { index: 4, start: 20.5, end: 24.2, duration: 3.7, english: "But I mostly listened to whatever was on TV or the radio.", korean: "하지만 저는 주로 TV나 라디오에서 나오는 노래를 많이 들었어요." },
  { index: 5, start: 24.2, end: 29.16, duration: 4.96, english: "I recall in middle school, I got really into idols, especially EXO.", korean: "중학교 때는 아이돌에 정말 빠졌었어요, 특히 EXO요." },
  { index: 6, start: 29.16, end: 36.75, duration: 7.59, english: "I mean, I used to collect their albums and watched a lot of their performances online, which was super exciting for me.", korean: "EXO 앨범을 모으기도 했고, 온라인으로 무대 영상도 진짜 많이 봤거든요. 그게 너무 신나고 재미있었어요." },
  { index: 7, start: 36.75, end: 43.35, duration: 6.6, english: "The thing is, music always made everything feel more fun, especially when I was with my friends.", korean: "음악이 있으면 항상 뭔가 더 재미있어진 느낌이었어요, 특히 친구들이랑 있을 때요." },
  { index: 8, start: 43.35, end: 50.17, duration: 6.82, english: "We used to share songs and talk about the latest hits at school, so the atmosphere was really energetic.", korean: "서로 노래를 공유하고 학교에서 최신곡 얘기를 많이 했거든요. 그래서 분위기도 항상 활기찼어요." },
  { index: 9, start: 50.17, end: 56.58, duration: 6.41, english: "Later, when I was in high school, I used to listen to ballads a lot, especially during exam periods.", korean: "그리고 고등학교 때는 시험기간에 발라드를 많이 들었어요." },
  { index: 10, start: 56.96, end: 62.95, duration: 5.99, english: "I guess the calm music helped me focus, and sometimes it made me relax a bit when I was stressed.", korean: "조용한 음악이 집중하는 데 도움이 됐고, 스트레스 받을 때는 좀 편안해지기도 했어요." },
  { index: 11, start: 62.95, end: 69.69, duration: 6.74, english: "Actually, my friends from high school had different tastes, so we used to introduce new songs to each other.", korean: "사실 고등학교 친구들은 취향이 달라서 서로 새로운 노래를 많이 추천해줬어요." },
  { index: 12, start: 69.69, end: 74.54, duration: 4.85, english: "One friend really liked indie music, so I sometimes listened to that, too.", korean: "한 친구는 인디 음악을 좋아해서 저도 가끔 같이 들었죠." },
  { index: 13, start: 74.54, end: 81.48, duration: 6.94, english: "Although my taste has changed a lot, I still enjoy K-pop these days, especially during my commute.", korean: "취향이 많이 변하긴 했지만, 요즘도 출퇴근할 때는 케이팝을 즐겨 들어요." },
  { index: 14, start: 81.48, end: 88.4, duration: 6.92, english: "But when I work out, I listen to pop songs, and honestly, music still feels really important to me.", korean: "그리고 운동할 때는 팝송을 듣고요. 솔직히 지금도 음악이 정말 소중하게 느껴져요." },
];

const TRIAL_PACKAGE: ScriptPackage = {
  id: "trial-package-001",
  user_id: "trial-user",
  script_id: "trial-script-001",
  status: "completed",
  progress: 100,
  wav_file_path: "audio/1320fb1b-8093-4986-8816-d717fe7b1df6.wav",
  json_file_path: "json/1320fb1b-8093-4986-8816-d717fe7b1df6.json",
  timestamp_data: TRIAL_TIMESTAMPS,
  wav_file_size: 7829642,
  tts_voice: "Zephyr",
  error_message: null,
  created_at: "2026-03-14T22:59:02.768Z",
  completed_at: "2026-03-14T23:00:53.221Z",
};

// 체험판 스크립트 결과 (ScriptDetail 타입)
export const TRIAL_SCRIPT_RESULT: ScriptDetail = {
  id: "trial-script-001",
  user_id: "trial-user",
  question_id: TRIAL_QUESTION.question_id,
  source: "generate",
  title: null,
  english_text: TRIAL_PARAGRAPHS.full_text.english,
  korean_translation: TRIAL_PARAGRAPHS.full_text.korean,
  paragraphs: TRIAL_PARAGRAPHS,
  total_slots: 7,
  category: TRIAL_QUESTION.topic_category,
  topic: TRIAL_QUESTION.topic,
  question_korean: TRIAL_QUESTION.question_korean,
  question_english: TRIAL_QUESTION.question_english,
  user_story: TRIAL_USER_STORY,
  user_original_answer: null,
  target_grade: "IH",
  question_type: TRIAL_QUESTION.question_type,
  ai_model: "gpt-4.1",
  word_count: 197,
  generation_time: 31,
  key_expressions: [
    "got interested in",
    "sing along to",
    "collect albums",
    "my taste changed",
    "helped me focus",
    "share our playlists",
    "makes me kind of nostalgic",
  ],
  highlighted_script: null,
  status: "draft",
  refine_count: 0,
  created_at: "2026-03-14T22:15:25.557Z",
  updated_at: "2026-03-14T22:22:58.830Z",
  package: TRIAL_PACKAGE,
  question_detail: {
    id: TRIAL_QUESTION.question_id,
    question_english: TRIAL_QUESTION.question_english,
    question_korean: TRIAL_QUESTION.question_korean,
    topic: TRIAL_QUESTION.topic,
    category: TRIAL_QUESTION.topic_category,
    question_type_eng: TRIAL_QUESTION.question_type,
  },
};
