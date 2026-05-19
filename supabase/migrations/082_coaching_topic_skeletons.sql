-- ============================================================================
-- 082_coaching_topic_skeletons.sql
-- AI 코치 v5 — Layer 3 신설: 토픽 단위 만능 표현 카탈로그 SSOT
-- ============================================================================
-- 설계 배경:
--   마이그 081에서 description_random 4 그룹 × 6 등급 = 24 row 적재했으나,
--   학생 토픽(예: 지형) 답변 시 example_model_answer가 그룹당 1 토픽(환경=재활용)만이라
--   GPT가 다른 토픽으로 변형해야 함 → 자료 #12 D 지형 풀 모범 핵심 표현 약화.
--
--   강사 etalon (자료 #11~#14 + 자료 #21 1:1 산업 코칭)이 명확히 보여주듯:
--   - 만능 패턴 7 Step 골격은 100% 동일 (모든 돌발 토픽 공유)
--   - **토픽별 슬롯 어휘만 다름** (은행: financial products / 호텔: hospitality services / 식당: dining services)
--   - 강사 코칭 방식: 학생 답변 골격 그대로 유지 + 핵심 슬롯 표현을 카탈로그에서 카피해서 박아 넣음
--
--   따라서 토픽 단위 만능 표현 카탈로그가 SSOT다. 그룹 spec(081)은 격상 카드만,
--   본 테이블이 13 토픽 × 7 Step 슬롯 표현 풀을 담는다.
--
-- 자료 출처 매트릭스:
--   자료 #11 (10.txt) — 시사 (은행·호텔·식당) 풀 모범 + IH→AL 격상 매트릭스
--   자료 #12 (11.txt) — 환경 (재활용·지형·지구온난화·날씨) 풀 모범 + 토론적 마무리 카드
--   자료 #13 (12.txt) — 산업·기술 풀 모범 + Breath of Vocabulary + 시장 점유율 정량화
--   자료 #14 (13.txt) — 개인 (휴일·자유시간) 풀 모범 + 양면 토론 5단
--   자료 #21 (21.txt) — 1:1 산업·기술 코칭 (학생 답변 골격 유지 + 슬롯 카피 방식 etalon)
--
-- 적재 13 토픽:
--   시사:    은행 / 호텔 / 음식점 / 교통
--   환경:    재활용 / 지형 / 날씨
--   산업기술: 산업 / 기술
--   개인:    모임 / 휴일 / 자유시간
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 테이블 생성
-- ----------------------------------------------------------------------------
CREATE TABLE coaching_topic_skeletons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,                  -- 한글 토픽명 (질문 DB의 topic 컬럼과 동일)
  question_type text NOT NULL,           -- 'description_random' (현재 1종, 향후 routine/comparison 확장 가능)
  group_id text NOT NULL,                -- 'current_affairs' / 'environment' / 'industry_tech' / 'personal'
  skeleton_slots jsonb NOT NULL,         -- 만능 패턴 7 Step별 토픽 만능 표현 풀
  full_etalon text NOT NULL,             -- 강사 풀 모범 원문 (IH 출발 → AL 격상 매트릭스)
  upgrade_cards jsonb NOT NULL,          -- 토픽 특화 AL 격상 카드 (어휘 격상 / 정량화 / 토론 마무리 등)
  source_lecture text NOT NULL,          -- '자료 #11 C (10.txt)' 등 출처 명시
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(topic, question_type)
);

CREATE INDEX idx_coaching_topic_skeletons_topic ON coaching_topic_skeletons(topic, question_type);
CREATE INDEX idx_coaching_topic_skeletons_group ON coaching_topic_skeletons(group_id);

COMMENT ON TABLE coaching_topic_skeletons IS 'AI 코치 v5 Layer 3 — 토픽 단위 만능 표현 카탈로그 SSOT. 자료 #11~#14 + #21 강사 풀 모범에서 직접 추출. EF coaching-evaluate가 common(078) + group_spec(081) + 본 테이블을 3-layer 합성.';

-- ----------------------------------------------------------------------------
-- [TOPIC 1] 은행 — 자료 #11 C (강사 직접 모범 IH→AL 격상 매트릭스)
-- ----------------------------------------------------------------------------
INSERT INTO coaching_topic_skeletons (topic, question_type, group_id, skeleton_slots, full_etalon, upgrade_cards, source_lecture) VALUES (
  '은행', 'description_random', 'current_affairs',
  $JSON$
{
  "step0_stalling": [
    "It's a tough question.",
    "I haven't thought about it.",
    "I don't know what to say.",
    "What am I supposed to say?",
    "But I'll do my best.",
    "I'll give you my best shot.",
    "I'll try my best."
  ],
  "step1_generalize": [
    "There are numerous banks out there in Korea.",
    "There are countless banks out there in Korea.",
    "There are a great deal of banks out there in Korea.",
    "There are a large number of banks out there in Korea.",
    "Wherever you go, you can spot at least one bank on the street.",
    "Wherever you go, you can visually spot at least one bank on the street.",
    "Wherever you go, you can observe at least one bank on the street without a doubt."
  ],
  "step2_classify": [
    "Talking about banks in Korea, we refer to central banks and private banks.",
    "What they do is provide financial products to bank users."
  ],
  "step3_usage": [
    "A large number of people go to the bank for various purposes.",
    "A great deal of people go to the bank for various purposes.",
    "A substantial number of individuals go to the bank for various purposes.",
    "A large portion of the population frequents the bank for various purposes.",
    "They physically go to the bank to obtain loans or to make deposits accordingly."
  ],
  "step4_digital": [
    "It is often said that these days a large number of people frequently use mobile banking instead of physically visiting the bank in person."
  ],
  "step5_foreigners": [
    "When foreign people come to Korea, they are often fascinated by the mobile banking and high-level banking services offered by our banks.",
    "When foreign people come to Korea, they are often captivated by the sophisticated banking services offered by our banks.",
    "When foreign people come to Korea, they are often amazed by the highly advanced banking services offered by our banks."
  ],
  "step6_pride": [
    "I'm so proud of that as a Korean.",
    "It fills me with an immense sense of pride.",
    "I have a strong sense of pride."
  ],
  "step7_conclusion": [
    "In conclusion, we are performing well based on the trend so far.",
    "We hope to achieve even greater success in the foreseeable future.",
    "We hope to achieve even greater success in the near future.",
    "I hope this trend continues just like this.",
    "I'm looking forward to that.",
    "We can keep it up."
  ],
  "closing_tags": [
    "That's about it.",
    "That's pretty much about it.",
    "That's all I can say."
  ]
}
$JSON$,
  $ETALON$
[자료 #11 C — 은행 풀 모범 IH 출발 → AL 격상]

IH 출발점:
There are many banks out there in Korea.
Wherever you go, you can see at least one bank on the street.
Talking about banks in Korea, we have central banks and private banks.
What they do is provide financial products to bank users.
People go to the bank for many reasons.
They go to the bank to get loans or to make deposits.
These days a lot of people use mobile banking instead of physically visiting the bank.
When foreigners come to Korea, they are often amazed by the mobile banking and good banking services.

AL 격상 (같은 답변, 5대 기준 적용):
- 도입: many → numerous / countless / a great deal of / a large number of
- 동작: see → spot / visually spot / observe / observe without a doubt
- 연결: Talking about ... (분사구문 유지)
- 동사: have → refer to (의미 격상)
- 사용자: people → a large number of people / a great deal of people / a substantial number of individuals / a large portion of the population
- 일치: a large portion of the population goes/frequents (단수 일치 유지)
- 목적: for many reasons → for various purposes (반복 회피)
- 활용: go to the bank to get loans → physically go to the bank to obtain loans or to make deposits accordingly
- 트렌드: a lot of people use mobile banking → It is often said that these days a large number of people frequently use mobile banking instead of physically visiting the bank in person
- 자랑: good banking services → high-level / sophisticated / highly advanced banking services offered by our banks
- 결론: we are doing great → we are performing well based on the trend so far / we hope to achieve even greater success in the foreseeable future
- 마무리: I hope so → I hope this trend continues just like this. We can keep it up.
$ETALON$,
  $UPGRADE$
{
  "vocab_breadth": {
    "many → ": ["numerous", "countless", "a great deal of", "a large number of"],
    "see → ": ["spot", "visually spot", "observe", "observe without a doubt"],
    "have → ": ["refer to"],
    "people → ": ["a large number of people", "a great deal of people", "a substantial number of individuals", "a large portion of the population"],
    "for many reasons → ": ["for various purposes"],
    "good → ": ["high-level", "sophisticated", "highly advanced"]
  },
  "digital_alternative": "It is often said that these days a large number of people frequently use mobile banking instead of physically visiting the bank in person.",
  "pride_upgrade": "It fills me with an immense sense of pride.",
  "agreement_critical": "a large portion of the population frequents (단수 동사) / one of the biggest issues (복수)"
}
$UPGRADE$,
  '자료 #11 C (10.txt) — 강사 직접 모범 IH→AL 격상 매트릭스 11 카테고리'
);

-- ----------------------------------------------------------------------------
-- [TOPIC 2] 호텔 — 자료 #11 D (강사 직접 모범 동일 패턴)
-- ----------------------------------------------------------------------------
INSERT INTO coaching_topic_skeletons (topic, question_type, group_id, skeleton_slots, full_etalon, upgrade_cards, source_lecture) VALUES (
  '호텔', 'description_random', 'current_affairs',
  $JSON$
{
  "step0_stalling": [
    "It's a tough question.",
    "I haven't thought about it.",
    "I don't have much to talk about, but I'll do my best."
  ],
  "step1_generalize": [
    "Generally speaking, hotels are numerous out there in Korea.",
    "There are numerous hotels out there in Korea.",
    "Wherever you go, you can visually spot at least one hotel on the street."
  ],
  "step2_classify": [
    "Talking about hotels in Korea, we refer to luxury hotels and budget hotels.",
    "What they do is provide hospitality services to hotel users.",
    "They provide rooms and other facilities such as fitness centers, restaurants, and swimming pools."
  ],
  "step3_usage": [
    "A large number of people stay at hotels for various purposes.",
    "A large portion of the population uses hotels for business trips or vacations.",
    "They go to hotels to relax, hold meetings, or celebrate special occasions."
  ],
  "step4_digital": [
    "It is often said that these days a large number of people frequently use online booking instead of physically visiting hotels on site in person."
  ],
  "step5_foreigners": [
    "When foreign people come to Korea, they are often fascinated by online booking and high-level hotel services offered by Korean hotels.",
    "When foreign people come to Korea, they are often captivated by the sophisticated hospitality services offered by our hotels.",
    "When foreign people come to Korea, they are often amazed by the highly advanced hotel services offered by hotels."
  ],
  "step6_pride": [
    "I'm so proud of that as a Korean.",
    "It fills me with an immense sense of pride."
  ],
  "step7_conclusion": [
    "In conclusion, we are performing well based on the trend so far.",
    "We hope to achieve even greater success in the foreseeable future.",
    "I hope this trend continues just like this.",
    "We can keep it up."
  ],
  "closing_tags": [
    "That's pretty much about it.",
    "That's all I can say."
  ]
}
$JSON$,
  $ETALON$
[자료 #11 D — 호텔 (은행과 동일 패턴, 어휘만 차별)]

핵심 변환:
- banks → hotels
- financial products → hospitality services
- bank users → hotel users
- central/private banks → luxury/budget hotels
- mobile banking → online booking
- "online booking instead of physically visiting hotels on site in person"
- "fascinated/captivated by online booking and high-level hotel services offered by hotels"

만능 패턴 7 Step 골격은 은행과 100% 동일. 슬롯 어휘만 hotel 도메인으로 교체.
$ETALON$,
  $UPGRADE$
{
  "vocab_breadth": "은행과 동일 (many/see/have/people/good 격상 매트릭스)",
  "domain_keywords": ["hospitality services", "hotel users", "luxury hotels", "budget hotels", "rooms and other facilities", "online booking", "physically visiting on site"],
  "digital_alternative": "online booking instead of physically visiting hotels on site in person",
  "pride_upgrade": "It fills me with an immense sense of pride."
}
$UPGRADE$,
  '자료 #11 D (10.txt) — 호텔 동일 패턴, hospitality services 도메인 차별'
);

-- ----------------------------------------------------------------------------
-- [TOPIC 3] 음식점 — 자료 #11 D (강사 직접 모범 + 시설 칭찬 풀)
-- ----------------------------------------------------------------------------
INSERT INTO coaching_topic_skeletons (topic, question_type, group_id, skeleton_slots, full_etalon, upgrade_cards, source_lecture) VALUES (
  '음식점', 'description_random', 'current_affairs',
  $JSON$
{
  "step0_stalling": [
    "Tough question.",
    "I don't know why you're doing this to me.",
    "This is a test where I'm supposed to do my best.",
    "So I'll give my best shot."
  ],
  "step1_generalize": [
    "Generally speaking, restaurants are numerous out there in Korea.",
    "Wherever you go, you can visually observe at least one restaurant on the street."
  ],
  "step2_classify": [
    "Talking about restaurants here in Korea, we refer to franchise restaurants and private restaurants.",
    "What they do is provide dining services to restaurant users."
  ],
  "step3_usage": [
    "A large number of people frequent restaurants for various purposes.",
    "A large number of people patronize restaurants for various purposes.",
    "They go to the restaurants to enjoy meals or dine in."
  ],
  "step4_digital": [
    "It is often said that these days a large portion of the population uses online reservations or orders in.",
    "These days a large number of people frequently use the applications instead of physically visiting restaurants in person."
  ],
  "step5_foreigners": [
    "When foreigners come to Korea, they are often captivated by the online reservations and high quality dining services offered by restaurants.",
    "When foreigners come to Korea, they are often fascinated by the sophisticated dining services offered by our restaurants."
  ],
  "step6_pride": [
    "I'm so proud of that as a Korean without a doubt.",
    "It fills me with an immense sense of pride."
  ],
  "step7_conclusion": [
    "To sum up, we are performing well based on the trend so far.",
    "In conclusion, we hope to achieve even greater success in the future.",
    "I hope this trend goes on just like this.",
    "We can keep it up.",
    "We can do it.",
    "We can make it.",
    "We can make better Korea.",
    "We can make a better world."
  ],
  "facility_praise": [
    "There is a CCTV camera so that we can have more safety.",
    "The staff are very kind and friendly, welcoming, ready to serve.",
    "The restaurants are well maintained, clean and comfortable."
  ],
  "closing_tags": [
    "That's about it.",
    "That's pretty much about it."
  ]
}
$JSON$,
  $ETALON$
[자료 #11 D — 음식점 (은행/호텔 동일 패턴 + frequent/patronize 동사 격상 + 시설 칭찬 풀)]

핵심 차별:
- restaurants → 동일 만능 패턴 7 Step
- franchise restaurants and private restaurants
- dining services to restaurant users
- 동사: go to → frequent / patronize (강사 명시 "patronize는 동사로 격상")
- 한국 음식점 특화: online reservations / order in / applications
- 시설 칭찬 풀 (강사 명시):
  · "there is a CCTV camera so that we can have more safety"
  · "the staff are very kind and friendly, welcoming, ready to serve"
  · "well maintained, clean and comfortable"
$ETALON$,
  $UPGRADE$
{
  "vocab_breadth": "은행 동일 + go to → frequent / patronize",
  "domain_keywords": ["franchise restaurants", "private restaurants", "dining services", "patronize", "frequent", "online reservations", "order in", "applications", "enjoy meals", "dine in"],
  "facility_praise_card": "강사 명시 시설 칭찬 풀 — CCTV/staff/maintained 한 세트 묶어서 인용 시 AL 신호",
  "digital_alternative": "using the applications instead of physically visiting restaurants in person"
}
$UPGRADE$,
  '자료 #11 D (10.txt) — 음식점 + frequent/patronize 격상 + 시설 칭찬 풀'
);

-- ----------------------------------------------------------------------------
-- [TOPIC 4] 교통 — 자료 #11 시사 그룹 명시 (강사 모범 X, 동일 패턴 합성)
-- ----------------------------------------------------------------------------
INSERT INTO coaching_topic_skeletons (topic, question_type, group_id, skeleton_slots, full_etalon, upgrade_cards, source_lecture) VALUES (
  '교통', 'description_random', 'current_affairs',
  $JSON$
{
  "step0_stalling": [
    "It's a tough question.",
    "I haven't thought about it, but I'll do my best."
  ],
  "step1_generalize": [
    "There are numerous public transportation systems out there in Korea.",
    "Wherever you go, you can spot at least one bus stop or subway station on the street."
  ],
  "step2_classify": [
    "Talking about public transportation in Korea, we refer to subway, bus, taxi, and train.",
    "What they do is provide transit services to commuters and travelers."
  ],
  "step3_usage": [
    "A large number of people use public transportation for various purposes.",
    "A large portion of the population frequents the subway for commuting to work or school.",
    "They use public transportation to reach their destinations conveniently and efficiently."
  ],
  "step4_digital": [
    "It is often said that these days a large number of people frequently use contactless payment systems like T-money cards instead of physically buying tickets in person.",
    "These days a large portion of the population uses mobile apps for navigation and bus arrival information."
  ],
  "step5_foreigners": [
    "When foreign people come to Korea, they are often fascinated by the well-developed subway system and sophisticated transit infrastructure offered by our cities.",
    "When foreign people come to Korea, they are often captivated by the highly advanced contactless payment systems and clean public transportation."
  ],
  "step6_pride": [
    "I'm so proud of that as a Korean.",
    "It fills me with an immense sense of pride."
  ],
  "step7_conclusion": [
    "In conclusion, we are performing well based on the trend so far.",
    "We hope to achieve even greater success in the foreseeable future."
  ],
  "facility_praise": [
    "The subway is well maintained, clean and comfortable.",
    "The transit system is efficient and reliable.",
    "Stations are equipped with CCTV cameras for safety."
  ],
  "closing_tags": [
    "That's about it.",
    "That's pretty much about it."
  ]
}
$JSON$,
  $ETALON$
[교통 — 자료 #11 강사 명시 "시사 그룹 (은행/호텔/식당/교통)" / 강사 직접 모범 없음, 시사 그룹 동일 패턴 합성]

핵심 차별:
- public transportation systems → 만능 패턴 7 Step 적용
- subway / bus / taxi / train (분류)
- transit services / commuters / travelers (사용자)
- 디지털 대체: T-money card / contactless payment / mobile apps for navigation
- 외국인 반응: well-developed subway / sophisticated transit infrastructure / contactless payment / clean public transportation
- 자랑 + 결론 동일

은행/호텔/식당과 동일 패턴 골격 + 교통 도메인 슬롯.
$ETALON$,
  $UPGRADE$
{
  "vocab_breadth": "은행 동일 매트릭스",
  "domain_keywords": ["public transportation", "subway", "bus", "taxi", "train", "transit services", "commuters", "T-money card", "contactless payment", "well-developed subway system", "sophisticated transit infrastructure"],
  "digital_alternative": "contactless payment systems like T-money cards instead of physically buying tickets in person"
}
$UPGRADE$,
  '자료 #11 — 시사 그룹 (강사 명시), 강사 직접 모범 X — 동일 패턴 합성'
);

-- ----------------------------------------------------------------------------
-- [TOPIC 5] 재활용 — 자료 #12 B (강사 직접 모범 + 토론 마무리 카드)
-- ----------------------------------------------------------------------------
INSERT INTO coaching_topic_skeletons (topic, question_type, group_id, skeleton_slots, full_etalon, upgrade_cards, source_lecture) VALUES (
  '재활용', 'description_random', 'environment',
  $JSON$
{
  "step0_stalling": [
    "It's a tough question.",
    "I haven't thought about it.",
    "I don't know what to say.",
    "What am I supposed to say?",
    "But I'll do my best."
  ],
  "step1_generalize": [
    "Generally speaking, it is often said that these days environmental issues are emerging.",
    "One of them would be recycling.",
    "If I had to choose one, it would be recycling."
  ],
  "step2_seriousness": [
    "There is no doubt that we take it very seriously.",
    "We take it very seriously without a doubt.",
    "It is undoubtedly true that we take it very seriously."
  ],
  "step3_system": [
    "To talk about recycling, first of all, generally speaking, we recycle regularly on a regular basis.",
    "Therefore, leading to the fact that we have a sophisticated recycling system for materials like plastic and aluminum and glass.",
    "Therefore, leading to the fact that we have a highly advanced recycling system for materials like plastic and aluminum and glass."
  ],
  "step4_government": [
    "As long as I know, the government has strict rules on recycling.",
    "If you don't do it, you get fined."
  ],
  "step5_foreigners": [
    "Besides, a lot of foreign people come to Korea.",
    "Besides, a large number of foreign people come to Korea.",
    "They are fascinated by our well-practiced recycling.",
    "They are absolutely captivated by our well-practiced recycling."
  ],
  "step6_pride": [
    "I'm so proud of being Korean.",
    "It fills me with an immense sense of pride."
  ],
  "step7_conclusion": [
    "In conclusion, I think we are performing well based on the trend so far.",
    "We hope to continue improving in the future.",
    "I hope this trend continues just like this forever."
  ],
  "debate_closing_card": [
    "The planet we are living on is not ours.",
    "It belongs to our children's children.",
    "So we should pass it on to the next generation as it is now.",
    "This is not an option. This is a must.",
    "By doing this, we can make a better world.",
    "We can make a better Korea."
  ],
  "closing_tags": [
    "That's about it.",
    "That's pretty much about it.",
    "That's all I can say."
  ]
}
$JSON$,
  $ETALON$
[자료 #12 B — 재활용 풀 모범 (강사 직접 모범)]

It's a tough question. I haven't thought about it. I don't know what to say. What am I supposed to say? But I'll do my best.

Generally speaking, it is often said that these days environmental issues are emerging. One of them would be recycling. If I had to choose one, it would be recycling.

There is no doubt that we take it very seriously. We take it very seriously without a doubt. It is unquably true that we take it very seriously.

To talk about recycling, first of all, generally speaking, we recycle regularly on a regular basis. Therefore, leading to the fact that we have a sophisticated recycling system / highly advanced recycling system for materials like plastic and aluminum and glass.

As long as I know, the government has strict rules on recycling. If you don't do it, you get fined.

Besides, a lot of foreign people come to Korea. They are fascinated by our well-practiced recycling. I'm so proud of being Korean.

In conclusion, I think we are performing well based on the trend so far. We hope to continue improving in the future. I hope this trend continues just like this forever.

[자료 #12 C — 환경 토론 마무리 카드 (AL 격상 결정 신호)]
The planet we are living on is not ours. It belongs to our children's children.
So we should pass it on to the next generation as it is now.
This is not an option. This is a must.
By doing this, we can make a better world. We can make a better Korea.
$ETALON$,
  $UPGRADE$
{
  "vocab_breadth": {
    "many → ": ["numerous", "a large number of"],
    "good → ": ["sophisticated recycling system", "highly advanced recycling system"],
    "amazed → ": ["fascinated", "captivated"],
    "well-practiced": "recycling 특화 격상 어휘"
  },
  "seriousness_triad": "There is no doubt / without a doubt / undoubtedly true — 강사 명시 3종 동의어 묶음",
  "debate_closing_card_REQUIRED": "★ AL 격상 결정 신호 — 4문장 카드 그대로 인용 의무 (변형 X)",
  "cohesive_categories_6": "도입(Generally speaking) / 결론도입(Therefore/leading to) / 추가(Besides/On top of) / 예시(for instance) / 반전(However/On the other hand) / 마무리(In conclusion/the bottom line is that)"
}
$UPGRADE$,
  '자료 #12 B + C (11.txt) — 재활용 풀 모범 + 환경 토론 마무리 4문장 카드'
);

-- ----------------------------------------------------------------------------
-- [TOPIC 6] 지형 — 자료 #12 D (강사 직접 모범 + 지형 특화 어휘)
-- ----------------------------------------------------------------------------
INSERT INTO coaching_topic_skeletons (topic, question_type, group_id, skeleton_slots, full_etalon, upgrade_cards, source_lecture) VALUES (
  '지형', 'description_random', 'environment',
  $JSON$
{
  "step0_stalling": [
    "It is a tough question.",
    "I haven't thought about it."
  ],
  "step1_generalize": [
    "Speaking of geography here in Korea, we have numerous mountains, rivers, and lakes."
  ],
  "step2_peninsula": [
    "The first thing is that Korea is situated on the Korean peninsula, surrounded by the sea on three sides, leading to the fact that we have thousands of islands along the coast."
  ],
  "step3_resources": [
    "In addition, we are blessed with abundant seafood and marine resources, with 70% of our territory being mountainous.",
    "On top of that, we are blessed with abundant seafood and marine resources, with 70% of our territory being mountainous."
  ],
  "step4_examples": [
    "For instance, the tallest mountain is Baekdusan and the second tallest one is Hallasan.",
    "For example, Korea has thousands of islands along the southern and western coasts, including Jeju Island."
  ],
  "step5_unesco": [
    "It is undoubtedly true that some areas are recognized by UNESCO.",
    "Therefore, when foreign people come to Korea, they are so fascinated and captivated by the beautiful nature of Korea."
  ],
  "step6_pride": [
    "I'm so proud of being Korean.",
    "It fills me with an immense sense of pride."
  ],
  "step7_conclusion": [
    "In conclusion, we are blessed with such diverse and beautiful nature.",
    "I hope this beauty continues for generations to come."
  ],
  "debate_closing_card": [
    "The planet we are living on is not ours.",
    "It belongs to our children's children.",
    "So we should pass it on to the next generation as it is now.",
    "This is not an option. This is a must.",
    "We got to do that. Why not doing it?"
  ],
  "closing_tags": [
    "That's about it.",
    "That's pretty much about it."
  ]
}
$JSON$,
  $ETALON$
[자료 #12 D — 지형 풀 모범 (강사 직접 모범)]

It is a tough question. I haven't thought about it.

Speaking of geography here in Korea, we have numerous mountains, rivers, and lakes.

The first thing is that Korea is situated on the Korean peninsula, surrounded by the sea on three sides, leading to the fact that we have thousands of islands along the coast.

In addition / On top of that, we are blessed with abundant seafood and marine resources, with 70% of our territory being mountainous.

For instance, the tallest mountain is Baekdusan and the second tallest one is Hallasan.

It is undoubtedly true that some areas are recognized by UNESCO. Therefore, when foreign people come to Korea, they are so fascinated and captivated by the beautiful nature of Korea.

[+ 환경 그룹 공통 — 토론 마무리 4문장 카드 연결]
$ETALON$,
  $UPGRADE$
{
  "domain_keywords_REQUIRED": [
    "Korean peninsula",
    "situated on",
    "surrounded by the sea on three sides",
    "leading to the fact that thousands of islands along the coast",
    "blessed with abundant seafood and marine resources",
    "70% of our territory being mountainous",
    "Baekdusan",
    "Hallasan",
    "UNESCO recognized",
    "beautiful nature of Korea"
  ],
  "participial_critical": [
    "situated on the Korean peninsula",
    "surrounded by the sea on three sides",
    "leading to the fact that we have thousands of islands",
    "with 70% of our territory being mountainous"
  ],
  "debate_closing_card_REQUIRED": "★ AL 격상 결정 신호 — 환경 그룹 공통 토론 카드 그대로 인용",
  "참고": "★ 지형 토픽은 분사구문 풀(자료 #12 D 핵심)이 결정 신호. 만능 패턴 4 슬롯이지만 분사구문 4개 동원 필수"
}
$UPGRADE$,
  '자료 #12 D (11.txt) — 지형 풀 모범 + 분사구문 풀 + UNESCO/Baekdusan/Hallasan 만능 표현'
);

-- ----------------------------------------------------------------------------
-- [TOPIC 7] 날씨 — 자료 #12 F (강사 직접 모범 + 4계절 + 글로벌 워밍 연결)
-- ----------------------------------------------------------------------------
INSERT INTO coaching_topic_skeletons (topic, question_type, group_id, skeleton_slots, full_etalon, upgrade_cards, source_lecture) VALUES (
  '날씨', 'description_random', 'environment',
  $JSON$
{
  "step0_stalling": [
    "It's a tough question.",
    "I haven't thought about it."
  ],
  "step1_generalize": [
    "To talk about the weather and the seasons in Korea, generally speaking, we experience four distinct seasons: spring, summer, fall, and winter."
  ],
  "step2_spring": [
    "For instance, in spring, the weather is nice and mild.",
    "It is moderately warm without being too hot or too cold."
  ],
  "step3_summer": [
    "On the other hand, summer is hot and humid with scorching temperatures that can feel burning hot.",
    "It is sticky hot."
  ],
  "step4_fall": [
    "In addition, fall is considered a nice time of the year.",
    "A large number of people go hiking to see the fallen leaves turning colorful."
  ],
  "step5_winter": [
    "Besides, winter, however, is freezing cold and dry.",
    "A large portion of the population enjoys skiing and snowboarding."
  ],
  "step6_global_warming": [
    "One thing that I'd like to talk about is global warming.",
    "Because of global warming, the global temperature goes up every year, leading to the fact that glaciers and icebergs are melting, which causes habitat decrease of polar bears and penguins in the north."
  ],
  "step7_pride_conclusion": [
    "I'm so proud of being Korean to experience all four seasons.",
    "In conclusion, the diverse seasons in Korea are truly a blessing."
  ],
  "debate_closing_card": [
    "The planet we are living on is not ours.",
    "It belongs to our children's children.",
    "We should pass it on as it is now.",
    "This is not an option. This is a must."
  ],
  "closing_tags": [
    "That's about it.",
    "That's pretty much about it."
  ]
}
$JSON$,
  $ETALON$
[자료 #12 F — 날씨·계절 풀 모범 (강사 직접 모범)]

Tough question. I haven't thought about it.

To talk about the weather and the seasons in Korea, generally speaking, we experience four distinct seasons: spring, summer, fall, and winter.

For instance, in spring, the weather is nice and mild. It is moderately warm without being too hot or too cold.

On the other hand, summer is hot and humid with scorching temperatures that can feel burning hot. It is sticky hot.

In addition, fall is considered a nice time of the year. A large number of people go hiking to see the fallen leaves turning colorful.

Besides, winter, however, is freezing cold and dry. A large portion of the population enjoys skiing and snowboarding.

One thing that I'd like to talk about is global warming. Because of global warming, the global temperature goes up every year, leading to the fact that glaciers and icebergs are melting, which causes habitat decrease of polar bears and penguins in the north.

[+ 환경 그룹 공통 — 토론 마무리 4문장 카드 연결]
$ETALON$,
  $UPGRADE$
{
  "domain_keywords_REQUIRED": [
    "four distinct seasons",
    "spring / summer / fall / winter",
    "nice and mild",
    "moderately warm",
    "scorching temperatures",
    "sticky hot",
    "fallen leaves turning colorful",
    "freezing cold and dry"
  ],
  "global_warming_card_REQUIRED": [
    "Because of global warming, the global temperature goes up every year",
    "leading to the fact that glaciers and icebergs are melting",
    "which causes habitat decrease of polar bears and penguins in the north"
  ],
  "cohesive_categories_6": "★ For instance / On the other hand / In addition / Besides / However / In conclusion 골고루 — 환경 그룹 핵심 (자료 #12 명시)",
  "debate_closing_card_REQUIRED": "★ 환경 그룹 공통 토론 마무리 4문장 카드 그대로 인용"
}
$UPGRADE$,
  '자료 #12 F (11.txt) — 날씨·계절 풀 모범 + 4계절 만능 + 글로벌 워밍 연결'
);

-- ----------------------------------------------------------------------------
-- [TOPIC 8] 산업 — 자료 #13 D + 자료 #21 (강사 직접 모범 + 1:1 코칭)
-- ----------------------------------------------------------------------------
INSERT INTO coaching_topic_skeletons (topic, question_type, group_id, skeleton_slots, full_etalon, upgrade_cards, source_lecture) VALUES (
  '산업', 'description_random', 'industry_tech',
  $JSON$
{
  "step0_stalling": [
    "It's a tough question.",
    "I haven't thought about it.",
    "I don't have much to talk about, but I'll do my best."
  ],
  "step1_generalize": [
    "There are numerous kinds of industries here in Korea, such as the IT industry, food industry, secondary battery industry, automobile industry, petrol chemical industry, and pharmaceutical industry, among others."
  ],
  "step2_choose_one": [
    "If I had to choose one, it would be the smartphone industry.",
    "If I had to choose one, it would be the semiconductor industry.",
    "It would be smartphone technology."
  ],
  "step3_quantify_REQUIRED": [
    "Samsung Electronics has gained fame all around the world, whose market share is more than 30% globally, which is truly dominant.",
    "Samsung Electronics has gained fame all around the world, whose market share is more than 30% globally, which is truly tremendous.",
    "It can be said to be superior."
  ],
  "step4_trends": [
    "On top of that, semiconductor technology is on the rise.",
    "Metaverse is booming.",
    "Cloud computing services are on the rise.",
    "AI has become trendy and sensational.",
    "AI is getting more attention from the public every day."
  ],
  "step5_hallyu": [
    "Korean wave has also gained fame all around the world.",
    "K-pop is booming.",
    "BTS and New Jeans are on the rise.",
    "K-pop is truly getting more attention from the public all around the world.",
    "K-pop has become trendy and sensational."
  ],
  "step6_foreigners_pride": [
    "Numerous international visitors come to Korea.",
    "They are captivated by its unparalleled excellence and characteristics.",
    "They are absolutely captivated by its unparalleled excellence.",
    "I'm so proud of that as a Korean.",
    "It fills me with an immense sense of pride.",
    "I have a strong sense of pride."
  ],
  "step7_conclusion": [
    "In conclusion, I think we are performing well based on the trend so far.",
    "I hope we continue to improve in the foreseeable future.",
    "I hope this trend continues just like this forever.",
    "We can keep it up."
  ],
  "closing_tags": [
    "That's pretty much about it.",
    "That's all I can say."
  ]
}
$JSON$,
  $ETALON$
[자료 #13 D — 산업·기술 풀 모범 (강사 직접 모범)]

It's a tough question. I haven't thought about it. I don't have much to talk about, but I'll do my best.

There are numerous kinds of industries here in Korea such as IT industry, food industry, secondary battery industry, automobile industry, petrol chemical industry, pharmaceutical industry, among others.

If I had to choose one, it would be the smartphone industry / semiconductor industry. It would be the smartphone technology.

[★ 정량화 — 자료 #13 + #21 강사 1:1 코칭 결정타]
Samsung Electronics has gained fame all around the world, whose market share is more than 30% globally, which is truly dominant.

[인기 격상] Metaverse is on the rise. Metaverse is booming. Cloud computing services are on the rise. It is getting more attention from the public. AI has become trendy and sensational.

[+ K-pop/BTS/한류] Korean wave has gained fame all around the world. K-pop is booming. New Jeans is on the rise. K-pop is truly getting more attention from the public all around the world. It has become trendy and sensational.

Numerous international visitors come to Korea. They are captivated by its unparalleled excellence and characteristics. I'm so proud of that as a Korean. It fills me with an immense sense of pride.

In conclusion, I think we are performing well based on the trend so far. I hope we continue to improve in the foreseeable future. I hope this trend continues just like this forever. We can keep it up.

[자료 #21 1:1 코칭 추가 디테일 — 학생 IH 답변 → 강사 격상]
- "Samsung smartphone is widely recognized / has been recognized for great quality and high-end products"
- "Samsung smartphone has gained worldwide fame for its great quality and high-end products"
- "exceptional capabilities of the camera" (학생 great camera → 격상)
- "Samsung phones are convenient to use banking transactions and various apps, leading to great popularity / leading to global recognition and popularity"
$ETALON$,
  $UPGRADE$
{
  "vocab_breadth_8": {
    "many → ": ["numerous", "countless", "thousands of", "millions of", "a large number of", "a great deal of", "a substantial number of", "a large portion of"],
    "good → ": ["high-level", "sophisticated", "highly advanced", "superior"],
    "famous / popular → ": ["gain fame", "on the rise", "booming", "getting more attention from the public", "become trendy and sensational"],
    "foreign people → ": ["numerous international visitors"],
    "amazed → ": ["captivated", "fascinated", "stunned"],
    "best features → ": ["unparalleled excellence and characteristics"],
    "I'm so proud → ": ["It fills me with an immense sense of pride", "I have a strong sense of pride"]
  },
  "quantification_REQUIRED": "★ 시장 점유율 정량화 — '30% globally, which is truly dominant' — AL 격상 결정타 (자료 #13 + #21)",
  "industry_tech_message": "강사 명시 '산업과 기술은 같은 패턴'. 동일 답변 사용 OK.",
  "coaching_method_21": "★ 자료 #21 강사 1:1 코칭 etalon: 학생 답변 골격 그대로 유지 + 격상 표현 한두 개만 슬롯 카피해서 박아 넣음. 변형 X."
}
$UPGRADE$,
  '자료 #13 D + 자료 #21 (12.txt + 21.txt) — 산업 풀 모범 + 1:1 코칭 격상 매트릭스'
);

-- ----------------------------------------------------------------------------
-- [TOPIC 9] 기술 — 자료 #13 (강사 "산업=기술 같은 패턴") + 자료 #21
-- ----------------------------------------------------------------------------
INSERT INTO coaching_topic_skeletons (topic, question_type, group_id, skeleton_slots, full_etalon, upgrade_cards, source_lecture) VALUES (
  '기술', 'description_random', 'industry_tech',
  $JSON$
{
  "step0_stalling": [
    "It's a difficult question.",
    "A tough question.",
    "I don't think it is easy for me to answer, but I'll do my best."
  ],
  "step1_generalize": [
    "There are numerous technologies here in Korea such as secondary battery, metaverse, cloud computing, AI, and so many others.",
    "There are numerous kinds of technologies here in Korea."
  ],
  "step2_choose_one": [
    "If I had to choose one, it would be smartphone technology.",
    "If I had to choose one, it would be semiconductor technology."
  ],
  "step3_quantify_REQUIRED": [
    "Samsung Electronics has gained fame all around the world, whose market share is more than 30% globally, which is truly dominant.",
    "It can be said to be superior."
  ],
  "step4_smartphone_features": [
    "Samsung smartphone is widely recognized in the world.",
    "Samsung smartphone has been widely recognized for great quality and high-end products.",
    "Owning a Samsung smartphone allows users to capture high quality photographs, showcasing exceptional capabilities of the camera.",
    "Samsung phones are convenient to use banking transactions and various apps, leading to great popularity.",
    "Samsung phones are convenient to use banking transactions and various apps, leading to global recognition and popularity."
  ],
  "step5_trends": [
    "Metaverse is on the rise.",
    "Cloud computing services are booming.",
    "AI has become trendy and sensational.",
    "AI is getting more attention from the public every day."
  ],
  "step6_foreigners_pride": [
    "Numerous international visitors come to Korea.",
    "They are captivated by its unparalleled excellence and characteristics.",
    "I'm so proud of that as a Korean.",
    "It fills me with an immense sense of pride."
  ],
  "step7_conclusion": [
    "In conclusion, I think we are performing well based on the trend so far.",
    "I hope we continue to improve in the foreseeable future.",
    "We can keep it up."
  ],
  "closing_tags": [
    "That's pretty much about it.",
    "That's all I can say."
  ]
}
$JSON$,
  $ETALON$
[자료 #13 + 자료 #21 — 기술 (강사 "산업과 기술은 같은 패턴")]

산업 답변과 동일 패턴 + 기술 특화 표현 추가:

자료 #21 (21.txt) 1:1 코칭 핵심:
- 학생 IH 답변: "Samsung smartphone is really great and very famous in worldwide" → AL: "Samsung smartphone is widely recognized for great quality and high-end products"
- 학생: "great camera" → AL: "exceptional capabilities of the camera"
- 학생: "very convenient to use a lot of apps" → AL: "Samsung phones are convenient to use banking transactions and various apps, leading to great popularity"
- 학생: "many people like it" → AL: "leading to global recognition and popularity"

강사 명시 격상 매트릭스 적용 — 학생 답변 골격 유지 + 핵심 슬롯 표현 한두 개만 카피해서 격상.
$ETALON$,
  $UPGRADE$
{
  "vocab_breadth_8": "산업과 동일 매트릭스",
  "domain_keywords": ["smartphone technology", "semiconductor technology", "metaverse", "cloud computing", "AI", "exceptional capabilities", "high-end products", "leading to global recognition and popularity"],
  "quantification_REQUIRED": "★ '30% globally, which is truly dominant' — 산업과 동일 결정타",
  "industry_tech_unified": "강사 명시 '산업과 기술은 같은 패턴'. 골격 동일.",
  "coaching_method_21": "★ 자료 #21 — 학생 답변 골격 유지 + 슬롯 카피 방식 (변형 X)"
}
$UPGRADE$,
  '자료 #13 + 자료 #21 (12.txt + 21.txt) — 기술 (산업과 동일 패턴) + 스마트폰 특화 격상'
);

-- ----------------------------------------------------------------------------
-- [TOPIC 10] 모임 — 자료 #14 (강사 명시 "모임=축하=휴일 호환" + 가족 bonding)
-- ----------------------------------------------------------------------------
INSERT INTO coaching_topic_skeletons (topic, question_type, group_id, skeleton_slots, full_etalon, upgrade_cards, source_lecture) VALUES (
  '모임', 'description_random', 'personal',
  $JSON$
{
  "step0_stalling": [
    "It's a tough question.",
    "I don't know what to say, but I'll do my best."
  ],
  "step1_generalize": [
    "Generally speaking, there are numerous types of gatherings and celebrations here in Korea.",
    "Family gatherings, friends' meet-ups, and holiday gatherings are very common."
  ],
  "step2_holidays": [
    "It is often said that the most important gatherings happen during major holidays like Chuseok and New Year's Day.",
    "Families come together / get together / gather together to spend time with each other."
  ],
  "step3_activities": [
    "During these gatherings, various activities take place.",
    "For instance, families set up special meals and often wear traditional clothing.",
    "An important tradition is the ancestral ritual to honor their ancestors.",
    "People also make a special rice cake called Songpyeon."
  ],
  "step4_family_emphasis": [
    "Family is my whole world.",
    "Family comes first like always.",
    "I put my family as a priority in my life.",
    "Some people say celebrating holidays is for relaxation, but to me it is a family bonding time."
  ],
  "step5_foreigners": [
    "When foreign people come to Korea, they are so fascinated by the Korean culture and the background of Korean traditions."
  ],
  "step6_pride": [
    "I'm so proud of being Korean.",
    "It fills me with an immense sense of pride."
  ],
  "step7_conclusion": [
    "In conclusion, gatherings in Korea are valuable time for family harmony and gratitude.",
    "I've been very busy these days, so I hope I can spend more precious time with my family."
  ],
  "closing_tags": [
    "That's about it.",
    "That's pretty much about it."
  ]
}
$JSON$,
  $ETALON$
[자료 #14 C — 모임 (강사 명시 "모임=축하=휴일 호환")]

휴일 풀 모범과 거의 동일 + 가족 bonding 강조:

Generally speaking, there are numerous types of gatherings and celebrations in Korea.

It is often said that the most important gatherings happen during major Korean holidays like Chuseok and New Year's Day. Families gather together / get together / come together to spend time with each other.

During these gatherings, various activities take place. For instance, families set up special meals and often wear traditional clothing. Furthermore, an important tradition is the ancestral ritual to honor their ancestors. People also make a special rice cake called Songpyeon.

In addition, gatherings are considered valuable time for family harmony and gratitude.

Family is my whole world. Family comes first like always. I put my family as a priority in my life. Some people say celebrating holidays is for relaxation, but to me it is a family bonding time.

When foreign people come to Korea, they are so fascinated by the Korean culture and the background of Korean traditions.
$ETALON$,
  $UPGRADE$
{
  "domain_keywords": ["gatherings", "celebrations", "Chuseok", "New Year's Day", "ancestral ritual", "Songpyeon", "family harmony", "family bonding time"],
  "family_emphasis_card": [
    "Family is my whole world.",
    "Family comes first like always.",
    "I put my family as a priority in my life.",
    "to me it is a family bonding time"
  ],
  "interchangeable_with": "휴일 (강사 명시 — 모임=축하=휴일 호환). 같은 답변 사용 가능."
}
$UPGRADE$,
  '자료 #14 C (13.txt) — 모임 (휴일과 호환) + 가족 bonding 강조'
);

-- ----------------------------------------------------------------------------
-- [TOPIC 11] 휴일 — 자료 #14 C (강사 직접 모범 — 추석 풀 모범)
-- ----------------------------------------------------------------------------
INSERT INTO coaching_topic_skeletons (topic, question_type, group_id, skeleton_slots, full_etalon, upgrade_cards, source_lecture) VALUES (
  '휴일', 'description_random', 'personal',
  $JSON$
{
  "step0_stalling": [
    "It's a tough question.",
    "I don't know what to say, but I'll do my best."
  ],
  "step1_generalize": [
    "Generally speaking, there are numerous types of holidays celebrated here in Korea, such as New Year's Day and Chuseok, which is Thanksgiving as well around the world."
  ],
  "step2_choose_one": [
    "It is often said that one of the major Korean holidays is definitely Chuseok.",
    "Chuseok is a day of thanksgiving in Korea when families gather together to spend time with each other.",
    "Chuseok is a day of thanksgiving in Korea when families get together to spend time with each other.",
    "Chuseok is a day of thanksgiving in Korea when families come together to spend time with each other."
  ],
  "step3_activities": [
    "During this holiday, various activities take place.",
    "For instance, families set up special meals and often wear traditional clothing."
  ],
  "step4_tradition": [
    "Furthermore, an important tradition during Chuseok is the ancestral ritual to honor their ancestors.",
    "People also make a special rice cake called Songpyeon."
  ],
  "step5_value": [
    "In addition / on top of that / besides, Chuseok is considered valuable time for family harmony and gratitude."
  ],
  "step6_family_emphasis": [
    "Family is my whole world.",
    "Family comes first like always.",
    "I put my family as a priority in my life.",
    "Some people say celebrating holidays is for relaxation, but to me it is a family bonding time."
  ],
  "step7_foreigners_conclusion": [
    "When foreign people come to Korea, they are so fascinated by the Korean culture and the background of Korean traditions.",
    "In conclusion / the bottom line is that I've been very busy these days, so I hope I can spend more precious time with my family.",
    "So I can spend much time with my family."
  ],
  "closing_tags": [
    "That's about it.",
    "That's pretty much about it."
  ]
}
$JSON$,
  $ETALON$
[자료 #14 C — 추석 풀 모범 (강사 직접 모범)]

It's a tough question. I don't know what to say, but I'll do my best.

Generally speaking, there are numerous types of holidays celebrated here in Korea, such as New Year's Day and Chuseok, which is Thanksgiving as well around the world.

It is often said that one of the major Korean holidays is definitely Chuseok. Chuseok is a day of thanksgiving in Korea when families gather together / get together / come together to spend time with each other.

During this holiday, various activities take place. For instance, families set up special meals and often wear traditional clothing.

Furthermore, an important tradition during Chuseok is the ancestral ritual to honor their ancestors. People also make a special rice cake called Songpyeon.

In addition / on top of that / besides, Chuseok is considered valuable time for family harmony and gratitude.

In conclusion / the bottom line is that I've been very busy these days, so I hope I can spend more precious time with my family.

Family is my whole world. Family comes first like always. I put my family as a priority in my life. Some people say celebrating holidays is for relaxation, but to me it is a family bonding time.

When foreign people come to Korea, they are so fascinated by the Korean culture and the background of Korean traditions.
$ETALON$,
  $UPGRADE$
{
  "domain_keywords_REQUIRED": [
    "Chuseok = Thanksgiving",
    "day of thanksgiving",
    "families gather together / get together / come together",
    "ancestral ritual to honor their ancestors",
    "Songpyeon (special rice cake)",
    "family harmony and gratitude",
    "family bonding time"
  ],
  "family_emphasis_card_REQUIRED": [
    "Family is my whole world.",
    "Family comes first like always.",
    "I put my family as a priority in my life.",
    "to me it is a family bonding time"
  ],
  "interchangeable_with": "모임 (강사 명시 호환)"
}
$UPGRADE$,
  '자료 #14 C (13.txt) — 추석 풀 모범 (강사 직접 모범) + 가족 emphasis 카드'
);

-- ----------------------------------------------------------------------------
-- [TOPIC 12] 자유시간 — 자료 #14 D (강사 명시 "100% 스마트폰" + 양면 토론 5단)
-- ----------------------------------------------------------------------------
INSERT INTO coaching_topic_skeletons (topic, question_type, group_id, skeleton_slots, full_etalon, upgrade_cards, source_lecture) VALUES (
  '자유시간', 'description_random', 'personal',
  $JSON$
{
  "step0_stalling": [
    "It's a tough question.",
    "I haven't thought about it, but I'll do my best."
  ],
  "step1_busy_freetime": [
    "It is often said that these days I've been incredibly busy.",
    "It is often said that these days I've been extremely busy.",
    "It is often said that these days I've been significantly busy, especially on weekdays.",
    "Therefore, I've had limited free time, leading to the fact that I've had limited free time.",
    "However, I do have a lot of free time on weekends or holidays."
  ],
  "step2_good_smartphone": [
    "Generally speaking, most of the time I use smartphones for entertainment.",
    "Most of the time I use smartphones for entertaining purposes.",
    "It is a good source for videos that I'm interested in.",
    "Sometimes crying, sometimes laughing."
  ],
  "step3_best_part": [
    "The best part is that it is absolutely free.",
    "It doesn't cost anything.",
    "I can dive deep into many favorite subjects and have unlimited access to my interests."
  ],
  "step4_reversal_bad": [
    "On the other hand, the bad thing is that I become someone addicted to it.",
    "The drawback is that when I don't watch YouTube or don't have my smartphone with me, I get this strange feeling like something is missing in my life."
  ],
  "step5_solution": [
    "Therefore, I realized I need to cut back on this addiction and find the solution soon.",
    "On top of that, I realized I need to cut back on this addiction.",
    "Leading to the fact that I realized it is imperative to cut back on the usage of a smartphone.",
    "I'd like to allocate my quality time with my family."
  ],
  "debate_conclusion_REQUIRED": [
    "Technology is supposed to make people's lives convenient.",
    "It is one thing, but the other thing is that it makes us unable to sustain the healthy relationship with others — which is a big shame.",
    "Technological development is supposed to bring people closer, but ironically, it makes us further apart."
  ],
  "closing_tags": [
    "That's pretty much about it.",
    "That's all I can say."
  ]
}
$JSON$,
  $ETALON$
[자료 #14 D — 자유시간 풀 모범 (강사 명시 "100% 스마트폰" + 양면 토론 5단)]

[Step 1 — 일반화]
It is often said that these days I've been incredibly busy / extremely busy / significantly busy, especially on weekdays. Therefore, I've had limited free time, leading to the fact that I've had limited free time. However, I do have a lot of free time on weekends or holidays.

[Step 2 — 좋은 점]
Generally speaking, most of the time I use smartphones for entertainment / for entertaining purposes. It is a good source for videos that I'm interested in. Sometimes crying, sometimes laughing.

The best part is that it is absolutely free. It doesn't cost anything. I can dive deep into many favorite subjects and have unlimited access to my interests.

[Step 3 — 반전 → 나쁜 점]
On the other hand, the bad thing is that I become someone addicted to it. The drawback is that when I don't watch YouTube or don't have my smartphone with me, I get this strange feeling like something is missing in my life.

[Step 4 — 해결책]
Therefore / on top of that / leading to the fact that, I realized I need to cut back on this addiction and find the solution soon. It is imperative to cut back on the usage of a smartphone. I'd like to allocate my quality time with my family.

[Step 5 — 토론적 결론 (AL 격상 결정적)]
Technology is supposed to make people's lives convenient. It is one thing, but the other thing is that it makes us unable to sustain the healthy relationship with others — which is a big shame.

Technological development is supposed to bring people closer, but ironically, it makes us further apart.
$ETALON$,
  $UPGRADE$
{
  "smartphone_100pct": "★ 강사 명시: '자유시간 답변은 100% 스마트폰' — 본인 자유시간 활동 무엇이든 → 스마트폰으로 정리",
  "duality_5step_REQUIRED": "★ 양면 토론 5단 구조 (자료 #14 D) — 좋은 점 → 반전 → 나쁜 점 → 해결책 → 토론적 결론. Step 5 토론적 결론이 AL 격상 결정 신호",
  "debate_conclusion_REQUIRED": "★ 토론적 결론 풀 카드 그대로 인용 의무: 'Technology is supposed to bring people closer, but ironically, it makes us further apart.' — AL 진입 결정타",
  "vocab_advanced": [
    "incredibly busy / extremely busy / significantly busy",
    "limited free time / leading to the fact that",
    "dive deep into / unlimited access",
    "addicted to it / the drawback is that",
    "imperative to cut back / allocate my quality time",
    "sustain the healthy relationship",
    "supposed to bring people closer / ironically"
  ],
  "participial_critical": [
    "sometimes crying, sometimes laughing",
    "completely lost in the moment",
    "leading to the fact that"
  ]
}
$UPGRADE$,
  '자료 #14 D (13.txt) — 자유시간 100% 스마트폰 + 양면 토론 5단 + 토론적 결론 풀 카드'
);

COMMIT;

-- ============================================================================
-- 검증 (적용 후):
--   SELECT topic, group_id, source_lecture,
--          jsonb_object_keys(skeleton_slots) AS slot_keys,
--          length(full_etalon) AS etalon_len
--   FROM coaching_topic_skeletons
--   ORDER BY group_id, topic;
--
-- 기대: 12 row (시사 4 / 환경 3 / 산업기술 2 / 개인 3 = 12)
-- ※ '지구온내화'는 별도 row X — 재활용/지형/날씨 description 안에서 분기 답변
-- ※ 마이그 081 (description_random_{group} × 6 등급 = 24 row)와 함께 작동
-- ============================================================================

-- ============================================================================
-- 롤백:
--   DROP TABLE coaching_topic_skeletons CASCADE;
-- ============================================================================
