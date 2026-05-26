// 오픽 IH 안정화 4주 셀프 스터디 커리큘럼 데이터
// 기반: 강지완 일타강사 AL 강의 22편 + SAIL Proficiency Report 약점 맞춤
// 표시 페이지: /coaching/curriculum

export interface CurriculumDay {
  day: number;
  title: string;
  lecture?: string; // "강의 1·2·3편"
  sailTag?: string; // SAIL 약점 태그 (관사/복수/수일치/시제 등)
  concept: string; // 핵심 개념
  expressions?: { en: string; note?: string }[]; // 암기 표현 (영어 원문)
  actions: string[]; // 오늘의 액션
  star?: boolean; // 핵심 세션 강조
}

export interface CurriculumWeek {
  week: number;
  title: string;
  goal: string;
  days: CurriculumDay[];
}

export const CURRICULUM_META = {
  title: "오픽 IH 안정화 4주 커리큘럼",
  subtitle: "강지완 일타강사 AL 강의 22편 기반 · SAIL 약점 맞춤",
  goalLabel: "목표",
  goal: "매번 IH가 안정적으로 (AL은 그다음 단계)",
  periodLabel: "기간",
  period: "4주 · 주 5회+ · 1일 30~60분 · 총 20세션",
  routineLabel: "매일 루틴",
  routine: "INPUT(10분) 강의·표현 → DRILL(15분) 입으로 5회 → RECORD(10분) 녹음·자가진단",
  principleTitle: "문장 통암기 금지",
  principle:
    "외우는 건 틀(skeleton)과 신호어뿐. 내용은 매번 날것으로. 암기 티(짧고 징검다리식)는 채점관이 바로 간파한다.",
} as const;

// SAIL 리포트 약점 ↔ 강의 처방 매핑
export const WEAKNESS_MAP: {
  sail: string;
  sample: string;
  fix: string;
  where: string;
}[] = [
  {
    sail: "Articles (관사)",
    sample: "love my all rooms",
    fix: "all of the rooms / a piece of furniture",
    where: "1주 Day 2",
  },
  {
    sail: "Plural (복수형)",
    sample: "three bedroom / some question",
    fix: "three bedrooms / some questions",
    where: "1주 Day 3",
  },
  {
    sail: "SVA (수일치)",
    sample: "3인칭 단수 동사",
    fix: "goes / one of the issues",
    where: "1주 Day 4",
  },
  {
    sail: "Tense (시제 혼용)",
    sample: "because I already open",
    fix: "opened it / 과거↔현재 대조",
    where: "1주 Day 5 · 3주",
  },
  {
    sail: "단일 주제 문단",
    sample: "나열식(strings of sentences)",
    fix: "258룰 (서론-본론3-결론)",
    where: "2주",
  },
  {
    sail: "Time frame 일관성",
    sample: "시간 프레임 흔들림",
    fix: "used to / had PP / 4단 대조",
    where: "3주",
  },
];

// IH 안정화의 4개 기둥 (왜 이 순서인가)
export const IH_PILLARS: { title: string; desc: string; week: string }[] = [
  {
    title: "2·5·8번 문단(258룰)",
    desc: "skeleton paragraph가 있어야 IH/AL, 없으면 IM에 갇힘",
    week: "2주차",
  },
  {
    title: "11번 IM3 통과",
    desc: "IM3가 돼야 IH/AL 심사 진입 자격",
    week: "4주차",
  },
  {
    title: "시제 6문항 안정",
    desc: "전반 양호하면 IH, 완벽하면 AL",
    week: "3주차",
  },
  {
    title: "실수 영역 최소화",
    desc: "관사·복수·수일치 실수가 적어야 IH 안정",
    week: "1주차",
  },
];

export const CURRICULUM_WEEKS: CurriculumWeek[] = [
  {
    week: 1,
    title: "문법 4종 정밀 교정",
    goal: "SAIL이 콕 집은 관사·복수·수일치·시제 실수를 의식적으로 잡는다 (실수 영역 제거)",
    days: [
      {
        day: 1,
        title: "시험 세팅 + 베이스라인 녹음",
        lecture: "강의 1·2·3편",
        star: true,
        concept:
          "백그라운드 서베이로 시험 범위를 절반으로 줄이고, 난이도는 5-5 고정(IH 확률 최고 — 5-5 선택자 IH 41% = 전체 평균 2배).",
        actions: [
          "서베이 조합 확정: 일 경험 없음 / 홀로 거주 / 음악 감상 1개만 / '운동 전혀 안 함' 포함",
          "베이스라인 녹음 ⭐ — 'Describe your house...' 답변을 지금 녹음해 보관 (Day 20에 다시 들음)",
        ],
      },
      {
        day: 2,
        title: "관사 (Articles)",
        lecture: "강의 19편",
        sailTag: "관사",
        concept:
          "단수 가산명사 앞엔 반드시 a/an/the. 불가산(furniture·advice·music)은 a piece of로 센다. 전체는 all of the.",
        expressions: [
          { en: "There are many pieces of furniture in my house.", note: "← many furniture ❌" },
          { en: "I love all of the rooms.", note: "← my all rooms ❌" },
          { en: "I live in an apartment on the 10th floor." },
        ],
        actions: [
          "집 묘사를 하되 명사마다 '관사 멈춤'을 의식하며 천천히 → 녹음 후 관사 빠진 곳 표시",
          "ChatGPT 변환으로 관사 교정본 받아 비교",
        ],
      },
      {
        day: 3,
        title: "복수형 (Plural)",
        lecture: "강의 19·20편",
        sailTag: "복수",
        concept: "숫자·수량 표현 뒤엔 무조건 복수 s. 강사 표현: '숫자 나오면 바람소리(s)를 주세요.'",
        expressions: [
          { en: "I have three bedrooms and two bathrooms.", note: "← three bedroom ❌" },
          { en: "I have some questions about it.", note: "← some question ❌" },
          { en: "There are various kinds of restaurants." },
        ],
        actions: [
          "숫자/some/many 들어간 문장 10개 만들어 말하기 → 끝의 s 들리는지 녹음 체크",
          "첫 답변에서 s를 빠뜨리는지 확인 (강의 속 학생도 무의식 노출)",
        ],
      },
      {
        day: 4,
        title: "수일치 (Subject-Verb Agreement)",
        lecture: "강의 10편",
        sailTag: "수일치",
        concept:
          "3인칭 단수 현재 -s, one of the + 복수명사(가장 많이 틀림), 집합명사 단수 취급(population goes).",
        expressions: [
          { en: "He goes to the gym every day." },
          { en: "One of the biggest issues is the recession." },
          { en: "A large portion of the population enjoys skiing." },
          { en: "A large number of people go to the bank for various purposes." },
        ],
        actions: [
          "주어를 he/she/it 3인칭 단수로 바꿔 문장 10개 → 동사 -s 체크",
          "'one of the + ___s' 패턴 5문장 만들기",
        ],
      },
      {
        day: 5,
        title: "시제 기초 + 1주차 복습",
        lecture: "강의 20편",
        sailTag: "시제",
        star: true,
        concept:
          "완료된 과거 행동은 과거형 유지. 'I already open' ❌ → 'opened it' ✅ (타동사+목적어+과거). 과거 얘기는 끝까지 과거로.",
        expressions: [
          { en: "I already opened it." },
          { en: "I bought it yesterday and brought it home." },
          { en: "When I was a child, I used to live in a small house." },
        ],
        actions: [
          "1주차 복습 녹음 ⭐ — 집 묘사를 4종(관사·복수·수일치·시제) 전부 의식하며 → Day 1 베이스라인과 비교",
          "체크리스트로 4종 자가진단 → 가장 자주 틀리는 1개를 다음 주 집중 감시",
        ],
      },
    ],
  },
  {
    week: 2,
    title: "258룰: 문단으로 말하기",
    goal: "나열식(strings of sentences)을 버리고 skeleton paragraph로. IM2→IH를 가르는 결정적 채점 분기점.",
    days: [
      {
        day: 6,
        title: "258룰 개념 + 2번 묘사 템플릿",
        lecture: "강의 4·19편",
        sailTag: "문단",
        star: true,
        concept:
          "2·5·8번(각 주제 첫 문항=현재 묘사)에서 서론(Topic)→본론(Supporting 3개)→결론(Concluding) 구조로. 강사: '문단 구조가 없으면 IM3에 갇힌다.'",
        expressions: [
          { en: "To talk about my house, ...", note: "서론" },
          { en: "To get into more details, ...", note: "전환" },
          { en: "The first thing is that ... The second thing is that ... And the last thing is that ...", note: "본론 3" },
          { en: "Overall, my apartment perfectly suits my needs. That's about it.", note: "결론·마무리" },
        ],
        actions: [
          "위 골격에 집 묘사 살을 붙여 5회 말하기 → 서론·본론3·결론이 다 들어갔는지 체크",
          "⚠️ Thank you로 끝내지 말 것 (그건 15번용). 마무리는 That's about it.",
        ],
      },
      {
        day: 7,
        title: "5번 묘사 템플릿 (다른 신호어)",
        lecture: "강의 4편",
        sailTag: "문단",
        concept: "같은 묘사라도 문항마다 다른 시작어/전환어를 써야 '다양한 표현' 가점.",
        expressions: [
          { en: "Speaking of my house, ... Speaking of that, ...", note: "서론·전환" },
          { en: "One thing is that ... Another thing is that ... The last thing is that ...", note: "본론 3" },
          { en: "The conclusion is that ... That's pretty much about it.", note: "결론·마무리" },
        ],
        actions: ["5번 골격으로 '음악 감상' 주제 묘사 5회 → 녹음"],
      },
      {
        day: 8,
        title: "8번 묘사 + 시작어 3종 굳히기",
        lecture: "강의 4편",
        sailTag: "문단",
        concept: "시작어/전환/본론구분/결론 3종 세트를 안 보고 말할 수 있게. 이게 핵심 자산.",
        expressions: [
          { en: "When it comes to my house, ... Speaking of which, ...", note: "서론·전환" },
          { en: "The good thing is that ... Another good thing is that ... The best thing is that ...", note: "본론 3" },
          { en: "The bottom line is that ... That's all I can say.", note: "결론·마무리" },
        ],
        actions: ["3종 표를 안 보고 말하기 → 집/음악/여행 3주제에 각각 다른 골격 적용"],
      },
      {
        day: 9,
        title: "분사구문으로 살 붙이기 (~하면서)",
        lecture: "강의 19편",
        concept: "본론이 빈약하면 문장 뒤에 -ing/PP를 붙여 '~하면서'로 확장. 강사: '면서를 깨우친 사람이 언어를 지배한다.'",
        expressions: [
          { en: "my family consisting of three members, my husband, my daughter and me" },
          { en: "I watch YouTube, sometimes crying, sometimes laughing." },
          { en: "Having no distractions, I can focus on what I do." },
          { en: "Taste wise, it was wonderful. Presentation wise, it was not so good.", note: "wise = ~측면에서" },
        ],
        actions: ["2주차 골격의 각 본론 문장 뒤에 분사구문 1개씩 붙이기 → 풍성해지는지 녹음 비교"],
      },
      {
        day: 10,
        title: "258룰 통합 모의 + 녹음",
        star: true,
        concept: "집/음악/여행 3주제를 각각 2·5·8번 골격으로 연속 답변 (실전처럼).",
        actions: [
          "녹음 후 체크: 서론-본론3-결론 구조가 다 있는가?",
          "문항마다 다른 시작어를 썼는가? 1주차 문법 4종 실수가 줄었는가?",
          "ChatGPT 변환으로 어휘 격상본 받아 표현 1~2개 차용",
        ],
      },
    ],
  },
  {
    week: 3,
    title: "시제 자유자재",
    goal: "SAIL '시간 프레임 일관성 부족'의 정면 처방. 과거↔현재를 자유롭게 오가는 골격을 손에 익힌다.",
    days: [
      {
        day: 11,
        title: "어릴적 / 처음 (child / first)",
        lecture: "강의 7편",
        sailTag: "시제",
        concept: "4단 골격: ① When I was young, I used to ② Unlike now ③ As for now / nowadays ④ Overall + 향수.",
        expressions: [
          { en: "When I was young, I used to live in a small house with a garden." },
          { en: "Unlike now, we had a great view from the living room." },
          { en: "As for now, I live in an apartment, which is more convenient." },
          { en: "Overall, I still miss those days. I wish I could go back to those moments." },
        ],
        actions: ["집/음악으로 '어릴적 vs 지금' 대조 답변 5회 → 시제가 과거↔현재로 안 섞이는지 체크"],
      },
      {
        day: 12,
        title: "최근 활동 (recent / last)",
        lecture: "강의 8편",
        sailTag: "시제",
        concept: "과거완료(had+PP) 핵심: '그 이전까지 한 번도 그런 적 없었다.' 강사: '대과거를 쓴 사람이 반드시 좋은 점수.'",
        expressions: [
          { en: "It was not long ago when I last went to a concert." },
          { en: "My heart was pounding the whole time, especially when ..." },
          { en: "I had never had such a mind-blowing experience.", note: "과거완료" },
          { en: "It was held at a large venue.", note: "수동태" },
        ],
        actions: ["'최근 콘서트/영화/여행' 1개를 골격으로 → had never had, was held 정확히 들어갔는지 체크"],
      },
      {
        day: 13,
        title: "기억에 남는 경험 ① (만능 경험 비축)",
        lecture: "강의 9편",
        sailTag: "시제",
        concept: "장소만 바꾸면 술집·카페·공원·여행 어디든 대응. 추억형 + trouble형 2종.",
        expressions: [
          { en: "All of a sudden, a local band started performing right in front of my eyes.", note: "밴드(추억형)" },
          { en: "I couldn't find my wallet. I must have lost it somewhere.", note: "지갑(trouble형)" },
          { en: "I asked the staff, but no one had seen it.", note: "대과거" },
          { en: "I came to think that I should have been more careful.", note: "가정법" },
        ],
        actions: ["2종 경험을 본인 버전으로 각색 → must have lost / had seen / should have been 시제 체크"],
      },
      {
        day: 14,
        title: "기억에 남는 경험 ② + 가정법",
        lecture: "강의 9편",
        sailTag: "시제",
        concept: "만능 경험 2종 추가(석양 여행·비행기 놓침) + 가정법은 IH→AL 핵심 무기.",
        expressions: [
          { en: "As the sun set, it painted the sky with beautiful colors.", note: "석양 여행" },
          { en: "I missed an important flight due to a series of delays.", note: "비행기(교훈)" },
          { en: "I should have been more careful. / I wish I could go back. / If I had to choose, it would be ...", note: "가정법 3종" },
        ],
        actions: ["만능 경험 4종을 다 한 번씩 → 가장 자연스러운 2개를 '내 무기'로 확정"],
      },
      {
        day: 15,
        title: "시제 6문항 통합 모의 + 녹음",
        star: true,
        concept: "어릴적/최근/기억에 남는 경험을 연속 답변 (시제 6문항 시뮬레이션).",
        actions: [
          "녹음 후 체크: 과거 얘기가 끝까지 과거로 유지되는가? (현재로 안 튀는가)",
          "used to / had PP / 가정법을 한 번씩 썼는가? 과거↔현재 대조가 명확한가?",
        ],
      },
    ],
  },
  {
    week: 4,
    title: "롤플레이 + 실전 통합",
    goal: "11번으로 IM3를 확실히 통과(IH 심사 진입) + 12번 문제해결 + 실전 모의로 총정리. 돌발·14·15번은 맛보기.",
    days: [
      {
        day: 16,
        title: "롤플레이 11번 (질문하기)",
        lecture: "강의 5·20편",
        concept: "질문 3~4개로 끊으면 IM2. 꼬리 질문 8~10개 연속 + 복잡한 질문(수식절)이 IM3.",
        expressions: [
          { en: "Hello, I'm calling to ask you something.", note: "도입" },
          { en: "a movie that is newly released / a good one that suits me", note: "만능 수식" },
          { en: "Would it be possible to get a discount if I use a certain card?", note: "복잡 질문" },
          { en: "Is there anything that I need to prepare or make sure of? If so, please let me know.", note: "만능 마무리" },
        ],
        actions: ["영화관/친구 전화 상황으로 연속 질문 10개 → that/if 수식절이 붙는지 체크"],
      },
      {
        day: 17,
        title: "롤플레이 12번 (문제해결)",
        lecture: "강의 6·20편",
        star: true,
        concept: "가중치 12배 문항. ① 문제 상황 설명 + ② 해결책 제시 둘 다 있어야 IH/AL.",
        expressions: [
          { en: "Hello, I'm calling to let you know I have a problem. The problem is that ...", note: "도입" },
          { en: "Can I get a refund? I have a receipt here with me.", note: "해결-환불" },
          { en: "Can you change it to a new one? If not, can you refund this?", note: "해결-교환" },
          { en: "You should have double-checked that. / I should have been more careful.", note: "고급 문법" },
        ],
        actions: [
          "'산 물건에 문제 발생' 상황으로 도입→상황설명→해결책 2개→마무리 → 녹음",
          "⚠️ 전치사: problem with(about ❌) / go with your friend / go to the concert",
        ],
      },
      {
        day: 18,
        title: "돌발 맛보기 (가볍게)",
        lecture: "강의 10·21편",
        concept: "돌발 만능 흐름 1개만 입에 익히기: 어렵다→많다→필수지식→국뽕→결론.",
        expressions: [
          { en: "It's a tough question. I haven't thought about it, but I'll do my best.", note: "어렵다" },
          { en: "There are numerous banks out there in Korea.", note: "많다(어휘 격상)" },
          { en: "Foreigners are fascinated by our advanced banking services. I'm proud as a Korean.", note: "국뽕" },
        ],
        actions: ["은행/식당 중 1개로 위 흐름 1회 — IH 안정화엔 돌발이 결정적이지 않으니 가볍게"],
      },
      {
        day: 19,
        title: "14·15번 맛보기 (가볍게)",
        lecture: "강의 16·18편",
        concept: "14번 변화=스마트폰, 15번 이슈=돈/불황. IH 목표면 스킵해도 IH는 나옴.",
        expressions: [
          { en: "But now everything is possible with just one smartphone — one device, unlimited possibilities.", note: "14번 (비교급은 much easier, very ❌)" },
          { en: "The most significant issue is the recession caused by inflation.", note: "15번 (돈/불황)" },
        ],
        actions: ["14번·15번 1개씩 맛보기"],
      },
      {
        day: 20,
        title: "풀 실전 모의 + 4주 성장 확인",
        star: true,
        concept: "15문항 풀 모의(실전처럼 끊지 않고) + '못된 말투'로 자신감 있게.",
        expressions: [
          { en: "약간 화난 듯, 자신감 있게 강하게 쳐라.", note: "강사: 친절한 톤은 자신 없어 보여 불리" },
        ],
        actions: [
          "자기소개 → 2·5·8 묘사(258룰) → 시제 문항 → 11·12 롤플레이 → 돌발 → 14·15 연속 답변",
          "Day 1 베이스라인 녹음과 비교 → 4주간 성장 체감",
          "체크리스트 최종 자가진단",
        ],
      },
    ],
  },
];

// 부록 A — 만능 표현집
export const APPENDIX_EXPRESSIONS: { group: string; items: string[] }[] = [
  {
    group: "문단 신호어 (2·5·8번)",
    items: [
      "서론: To talk about / Speaking of / When it comes to",
      "전환: To get into more details / Speaking of that / Speaking of which",
      "본론: (first/second/last thing) (one/another/last thing) (good/another good/best thing)",
      "결론: Overall / The conclusion is that / The bottom line is that",
      "마무리: That's it / That's pretty much about it / That's all I can say",
    ],
  },
  {
    group: "시제 무기",
    items: [
      "과거 습관: used to + 동사원형",
      "대과거: had + PP (no one had seen it)",
      "가정법: should have PP / I wish I could ~ / If I had to choose, it would be ~",
    ],
  },
  {
    group: "롤플레이 만능",
    items: [
      "도입: I'm calling to ask you something / I'm calling to let you know I have a problem",
      "수식: that is newly released / that suits me / that I think you'll like",
      "마무리: Is there anything I need to prepare or make sure of?",
    ],
  },
  {
    group: "어휘 격상 매트릭스 (3개씩 돌려쓰기)",
    items: [
      "many → numerous / countless / a large number of",
      "see → spot / observe",
      "good → sophisticated / highly advanced",
      "famous → widely recognized / has gained worldwide fame",
      "use → take advantage of / make use of / utilize",
      "busy → incredibly / significantly busy",
    ],
  },
  {
    group: "분사구문 (~하면서)",
    items: ["consisting of / listening to music / having no distractions, I can ~"],
  },
];

// 부록 B — 매일 쓰는 학습 도구
export const APPENDIX_TOOLS: string[] = [
  "ChatGPT 어휘 변환: 'make corrections on the following:' + 내 답변 → 격상본에서 표현 1~3개만 차용",
  "ElevenLabs(Grace/Rachel voice): 격상본을 음성 제작 → 이동 중 청취",
  "모바일 대체: 카톡 AskUp + 구글 음성입력(키패드 마이크)",
  "억양 훈련: 힙합 듣기 (영어 베이스 리듬 — 문장 끝 명사에 강세, '도-도-솔도')",
];

// 부록 C — SAIL 약점 자가진단 체크리스트 (매주 녹음 후)
export const APPENDIX_CHECKLIST: { item: string; point: string }[] = [
  { item: "관사", point: "단수 가산명사 앞 a/an/the 있는가?" },
  { item: "복수형", point: "숫자·some·many 뒤 s 붙였는가?" },
  { item: "수일치", point: "3인칭 단수 동사 -s? one of the+복수?" },
  { item: "시제", point: "과거 얘기가 현재로 안 튀는가?" },
  { item: "문단", point: "서론-본론3-결론 구조가 있는가?" },
  { item: "시간프레임", point: "과거↔현재 대조가 명확한가?" },
  { item: "자신감", point: "친절한 톤 말고 강하게 쳤는가?" },
];
