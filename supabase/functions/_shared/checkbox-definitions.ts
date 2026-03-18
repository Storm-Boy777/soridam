// 체크박스 정의 — OPIc 평가엔진
// INT(20), ADV(42), AL(12) 전체 74개
// question_type → 체크박스 세트 매핑
// FACT 점수 매핑 테이블
// 누적 로직 정의

// ============================================================
// 1. 체크박스 ID 목록
// ============================================================

// INT-1: 어휘 및 청해 (3개)
// INT-2: 담화 수준 (3개) — 누적 로직 적용
// INT-3: 질문 구성 (2개) — asking_questions 전용
// INT-4: 유창성/발음/문법/어순 (12개)

const INT_ALL_IDS = [
  // INT-1 (3)
  "INT-1-1", "INT-1-2", "INT-1-3",
  // INT-2 (3) — 누적
  "INT-2-1", "INT-2-2", "INT-2-3",
  // INT-3 (2) — asking_questions 전용
  "INT-3-1", "INT-3-2",
  // INT-4 (12)
  "INT-4-F1", "INT-4-F2", "INT-4-F3", "INT-4-F4", "INT-4-F5",
  "INT-4-P1", "INT-4-P2", "INT-4-P3", "INT-4-P4",
  "INT-4-G1", "INT-4-G2",
  "INT-4-S1",
];

// INT-3 제외 (18개) — description, routine용
export const INT_18_IDS = INT_ALL_IDS.filter(
  (id) => !id.startsWith("INT-3"),
);

// INT-3 포함 (20개) — asking_questions용
export const INT_20_IDS = [...INT_ALL_IDS];

// ADV-1: 시제별 묘사/서사 (11개)
// ADV-2: 문단 수준 담화 (11개) — SP 누적 로직 적용
// ADV-3: 다양한 주제 (3개)
// ADV-4: 돌발 상황 대처 (4개) — suggest_alternatives 전용
// ADV-5: 이해 용이성 (13개)

const ADV_ALL_IDS = [
  // ADV-1 (11)
  "ADV-1-D1", "ADV-1-D2", "ADV-1-D3",
  "ADV-1-N1", "ADV-1-N2", "ADV-1-N3",
  "ADV-1-PR1", "ADV-1-PR2", "ADV-1-PR3",
  "ADV-1-L1", "ADV-1-L2",
  // ADV-2 (11) — SP 누적
  "ADV-2-SP1", "ADV-2-SP2", "ADV-2-SP3", "ADV-2-SP4", "ADV-2-SP5",
  "ADV-2-WO1", "ADV-2-WO2", "ADV-2-WO3",
  "ADV-2-CD1", "ADV-2-CD2", "ADV-2-CD3",
  // ADV-3 (3)
  "ADV-3-V1", "ADV-3-V2", "ADV-3-V3",
  // ADV-4 (4) — suggest_alternatives 전용
  "ADV-4-CR1", "ADV-4-CR2", "ADV-4-CR3", "ADV-4-CD1",
  // ADV-5 (13)
  "ADV-5-F1", "ADV-5-F2", "ADV-5-F3",
  "ADV-5-G1", "ADV-5-G2", "ADV-5-G3", "ADV-5-G4", "ADV-5-G5",
  "ADV-5-PC1",
  "ADV-5-P1", "ADV-5-P2", "ADV-5-P3", "ADV-5-P4",
];

// ADV-4 제외 (38개) — comparison, experience_*, 기본 ADV
export const ADV_38_IDS = ADV_ALL_IDS.filter(
  (id) => !id.startsWith("ADV-4"),
);

// ADV-4 포함 (42개) — suggest_alternatives용
export const ADV_42_IDS = [...ADV_ALL_IDS];

// AL-14: 비교변화 (6개)
export const AL_14_IDS = [
  "AL-14-PS", "AL-14-LS", "AL-14-CS",
  "AL-14-CD", "AL-14-VB", "AL-14-GA",
];

// AL-15: 사회적이슈 (6개)
export const AL_15_IDS = [
  "AL-15-AS", "AL-15-MA", "AL-15-SI",
  "AL-15-CD", "AL-15-VB", "AL-15-GA",
];

// ============================================================
// 2. question_type → 체크박스 세트 매핑
// ============================================================

export function getCheckboxIdsForQuestionType(questionType: string): {
  ids: string[];
  type: "INT" | "ADV" | "AL";
} {
  switch (questionType) {
    // DB names
    case "description":
    case "routine":
      return { ids: INT_18_IDS, type: "INT" };
    case "rp_11":         // 정보 요청 롤플레이
    case "asking_questions": // v2 호환
      return { ids: INT_20_IDS, type: "INT" };
    case "comparison":
    case "past_childhood":  // 어릴 때 경험
    case "past_special":    // 기억에 남는 경험
    case "past_recent":     // 과거 습관
    case "experience_specific":  // v2 호환
    case "experience_habitual":  // v2 호환
    case "experience_past":      // v2 호환
      return { ids: ADV_38_IDS, type: "ADV" };
    case "rp_12":            // 상황 대응 롤플레이
    case "suggest_alternatives": // v2 호환
      return { ids: ADV_42_IDS, type: "ADV" };
    case "adv_14":           // 사회 비교/변화
    case "comparison_change": // v2 호환
      return { ids: AL_14_IDS, type: "AL" };
    case "adv_15":           // 의견 제시/주장
    case "social_issue":     // v2 호환
      return { ids: AL_15_IDS, type: "AL" };
    default:
      return { ids: ADV_38_IDS, type: "ADV" };
  }
}

// ============================================================
// 3. 누적 로직 (상위 pass → 하위 자동 pass)
// ============================================================

// INT-2: 담화 수준 누적
export const INT_2_CUMULATIVE: Record<string, string[]> = {
  "INT-2-3": ["INT-2-1", "INT-2-2"],
  "INT-2-2": ["INT-2-1"],
};

// ADV-2-SP: 발화 길이 수준 누적
export const ADV_2_SP_CUMULATIVE: Record<string, string[]> = {
  "ADV-2-SP5": ["ADV-2-SP1", "ADV-2-SP2", "ADV-2-SP3", "ADV-2-SP4"],
  "ADV-2-SP4": ["ADV-2-SP1", "ADV-2-SP2", "ADV-2-SP3"],
  "ADV-2-SP3": ["ADV-2-SP1", "ADV-2-SP2"],
  "ADV-2-SP2": ["ADV-2-SP1"],
};

// ============================================================
// 4. FACT 점수 매핑 테이블
// ============================================================

export const FACT_CHECKBOX_MAP = {
  // F — Functions & Tasks (16개)
  F: [
    "INT-1-1", "INT-1-2", "INT-1-3",
    "INT-3-1", "INT-3-2",
    "ADV-1-D1", "ADV-1-D2", "ADV-1-D3",
    "ADV-1-N1", "ADV-1-N2", "ADV-1-N3",
    "ADV-4-CR1", "ADV-4-CR2", "ADV-4-CR3", "ADV-4-CD1",
  ],

  // A — Accuracy (31개)
  A: [
    "INT-4-F1", "INT-4-F2", "INT-4-F3", "INT-4-F4", "INT-4-F5",
    "INT-4-P1", "INT-4-P2", "INT-4-P3", "INT-4-P4",
    "INT-4-G1", "INT-4-G2",
    "INT-4-S1",
    "ADV-1-PR1", "ADV-1-PR2", "ADV-1-PR3",
    "ADV-2-WO1", "ADV-2-WO2", "ADV-2-WO3",
    "ADV-5-F1", "ADV-5-F2", "ADV-5-F3",
    "ADV-5-G1", "ADV-5-G2", "ADV-5-G3", "ADV-5-G4", "ADV-5-G5",
    "ADV-5-PC1",
    "ADV-5-P1", "ADV-5-P2", "ADV-5-P3", "ADV-5-P4",
  ],

  // C — Context & Content (5개)
  C: [
    "ADV-3-V1", "ADV-3-V2", "ADV-3-V3",
    "ADV-1-L1", "ADV-1-L2",
  ],

  // T — Text Type (3그룹, 별도 계산)
  T_INT2: ["INT-2-1", "INT-2-2", "INT-2-3"],
  T_SP: ["ADV-2-SP1", "ADV-2-SP2", "ADV-2-SP3", "ADV-2-SP4", "ADV-2-SP5"],
  T_CD: ["ADV-2-CD1", "ADV-2-CD2", "ADV-2-CD3"],
};

// ADV-5 체크박스 (Sympathetic Listener 판정용)
export const ADV_5_IDS = [
  "ADV-5-F1", "ADV-5-F2", "ADV-5-F3",
  "ADV-5-G1", "ADV-5-G2", "ADV-5-G3", "ADV-5-G4", "ADV-5-G5",
  "ADV-5-PC1",
  "ADV-5-P1", "ADV-5-P2", "ADV-5-P3", "ADV-5-P4",
];

// ADV-4 체크박스 (Q12 게이트키퍼용)
export const ADV_4_IDS = [
  "ADV-4-CR1", "ADV-4-CR2", "ADV-4-CR3", "ADV-4-CD1",
];

// AL 게이트키퍼 필수 체크박스 (모두 pass 필요)
export const AL_GATEKEEPER_IDS = [
  "AL-14-PS", "AL-14-CD", "AL-15-AS", "AL-15-CD",
];

// ============================================================
// 5. 체크박스 설명 맵 (프롬프트 동적 주입용)
// ============================================================

export const CHECKBOX_DESCRIPTIONS: Record<
  string,
  { group: string; criterion: string; passIf: string }
> = {
  // INT-1: Language Creation (GATE) — 3
  "INT-1-1": { group: "INT-1: Language Creation (GATE)", criterion: "Vocabulary for personal information", passIf: "Can provide personal details with adequate vocabulary" },
  "INT-1-2": { group: "INT-1: Language Creation (GATE)", criterion: "Listening comprehension", passIf: "Understood the question correctly" },
  "INT-1-3": { group: "INT-1: Language Creation (GATE)", criterion: "Sentence level discourse", passIf: "Produced sentence-level (not just words/phrases)" },
  // INT-2: Speaking in Sentences (CORE) — Cumulative — 3
  "INT-2-1": { group: "INT-2: Speaking in Sentences (CORE) - Cumulative", criterion: "Words and memorized phrases", passIf: "Can produce words, word lists, or memorized phrases" },
  "INT-2-2": { group: "INT-2: Speaking in Sentences (CORE) - Cumulative", criterion: "Some sentences", passIf: "Can produce some sentences (not just words/phrases)" },
  "INT-2-3": { group: "INT-2: Speaking in Sentences (CORE) - Cumulative", criterion: "Mostly sentences", passIf: "Produces mostly sentences, occasionally word lists" },
  // INT-3: Asking Questions (CORE) — rp_11 전용 — 2
  "INT-3-1": { group: "INT-3: Asking Questions (CORE)", criterion: "Question quantity", passIf: "Asked at least 3 distinct questions" },
  "INT-3-2": { group: "INT-3: Asking Questions (CORE)", criterion: "Question quality", passIf: "Questions are clear, specific, and appropriate for the context" },
  // INT-4: Intelligibility (GATE) — 12
  "INT-4-F1": { group: "INT-4: Intelligibility - Fluency", criterion: "Rate of speech", passIf: "Speed doesn't hinder understanding" },
  "INT-4-F2": { group: "INT-4: Intelligibility - Fluency", criterion: "Fluidity (pauses)", passIf: "Pauses don't break communication" },
  "INT-4-F3": { group: "INT-4: Intelligibility - Fluency", criterion: "Dead-ending", passIf: "Completes thoughts without trailing off" },
  "INT-4-F4": { group: "INT-4: Intelligibility - Fluency", criterion: "False-starts", passIf: "Restarts don't disrupt meaning" },
  "INT-4-F5": { group: "INT-4: Intelligibility - Fluency", criterion: "Repetition", passIf: "Repetition doesn't hinder comprehension" },
  "INT-4-P1": { group: "INT-4: Intelligibility - Pronunciation", criterion: "Articulation", passIf: "Words are recognizable" },
  "INT-4-P2": { group: "INT-4: Intelligibility - Pronunciation", criterion: "Pitch", passIf: "Pitch doesn't obscure meaning" },
  "INT-4-P3": { group: "INT-4: Intelligibility - Pronunciation", criterion: "Stress", passIf: "Word stress is acceptable" },
  "INT-4-P4": { group: "INT-4: Intelligibility - Pronunciation", criterion: "Intonation", passIf: "Sentence intonation is understandable" },
  "INT-4-G1": { group: "INT-4: Intelligibility - Grammar", criterion: "Simple sentence grammar", passIf: "Basic grammar doesn't block meaning" },
  "INT-4-G2": { group: "INT-4: Intelligibility - Grammar", criterion: "Complete sentences", passIf: "Can form complete sentences" },
  "INT-4-S1": { group: "INT-4: Intelligibility - Syntax", criterion: "Word order", passIf: "Word order doesn't confuse meaning" },
  // ADV-1: Narrate and Describe in All Time Frames (CORE) — 11
  "ADV-1-D1": { group: "ADV-1: Time Frames - Description", criterion: "Description in present time", passIf: "Can describe current state/situation clearly" },
  "ADV-1-D2": { group: "ADV-1: Time Frames - Description", criterion: "Description in past time", passIf: "Can describe past state/situation clearly" },
  "ADV-1-D3": { group: "ADV-1: Time Frames - Description", criterion: "Description in future time", passIf: "Can describe future plans/predictions clearly" },
  "ADV-1-N1": { group: "ADV-1: Time Frames - Narration", criterion: "Narration in present time", passIf: "Can narrate current events/routines" },
  "ADV-1-N2": { group: "ADV-1: Time Frames - Narration", criterion: "Narration in past time", passIf: "Can narrate past events with proper sequencing" },
  "ADV-1-N3": { group: "ADV-1: Time Frames - Narration", criterion: "Narration in future time", passIf: "Can narrate future plans/expectations" },
  "ADV-1-PR1": { group: "ADV-1: Narration Problems", criterion: "Logical sequencing", passIf: "Events are presented in logical order" },
  "ADV-1-PR2": { group: "ADV-1: Narration Problems", criterion: "Verb forms", passIf: "Correct verb forms for each time frame" },
  "ADV-1-PR3": { group: "ADV-1: Narration Problems", criterion: "Person markers", passIf: "Consistent use of person markers (I, we, they)" },
  "ADV-1-L1": { group: "ADV-1: Description Quality", criterion: "Clarity", passIf: "Descriptions are clear and understandable" },
  "ADV-1-L2": { group: "ADV-1: Description Quality", criterion: "Detail", passIf: "Sufficient detail provided for understanding" },
  // ADV-2: Connected Discourse (CORE) — 11
  "ADV-2-SP1": { group: "ADV-2: Speaker Produces - Cumulative", criterion: "Words and phrases", passIf: "Can produce words and phrases" },
  "ADV-2-SP2": { group: "ADV-2: Speaker Produces - Cumulative", criterion: "Sentences", passIf: "Can produce complete sentences" },
  "ADV-2-SP3": { group: "ADV-2: Speaker Produces - Cumulative", criterion: "Strings of sentences", passIf: "Can produce multiple related sentences" },
  "ADV-2-SP4": { group: "ADV-2: Speaker Produces - Cumulative", criterion: "Connected sentences", passIf: "Sentences are logically connected" },
  "ADV-2-SP5": { group: "ADV-2: Speaker Produces - Cumulative", criterion: "Skeletal paragraphs", passIf: "Can form basic paragraph structure" },
  "ADV-2-WO1": { group: "ADV-2: Word Order Problems", criterion: "Phrase word order", passIf: "Word order within phrases is acceptable" },
  "ADV-2-WO2": { group: "ADV-2: Word Order Problems", criterion: "Sentence word order", passIf: "Sentence-level word order is acceptable" },
  "ADV-2-WO3": { group: "ADV-2: Word Order Problems", criterion: "Paragraph word order", passIf: "Ideas are organized logically in paragraphs" },
  "ADV-2-CD1": { group: "ADV-2: Cohesive Devices", criterion: "Cohesive devices used", passIf: "Uses connectors (however, in contrast, etc.)" },
  "ADV-2-CD2": { group: "ADV-2: Cohesive Devices", criterion: "Cohesive devices accurate", passIf: "Connectors used appropriately" },
  "ADV-2-CD3": { group: "ADV-2: Cohesive Devices", criterion: "Cohesive devices varied", passIf: "Uses variety of connectors (not repetitive)" },
  // ADV-3: Vocabulary Range (SUPPORT) — 3
  "ADV-3-V1": { group: "ADV-3: Vocabulary Range", criterion: "Breadth of vocabulary", passIf: "Has adequate vocabulary for the topic" },
  "ADV-3-V2": { group: "ADV-3: Vocabulary Range", criterion: "Language mixing", passIf: "Avoids inappropriate L1 words" },
  "ADV-3-V3": { group: "ADV-3: Vocabulary Range", criterion: "False cognates", passIf: "Avoids false cognates or uses them correctly" },
  // ADV-4: Complication Response (CORE) — rp_12 전용 — 4
  "ADV-4-CR1": { group: "ADV-4: Complication Response", criterion: "Struggles but succeeds", passIf: "Offers 2+ distinct alternatives despite difficulty (e.g., refund/exchange, reschedule/cancel). Count each concrete option separately." },
  "ADV-4-CR2": { group: "ADV-4: Complication Response", criterion: "Attempts to address", passIf: "Acknowledges the problem AND attempts to explain it AND proposes at least 1 solution. Mere apology without action = fail." },
  "ADV-4-CR3": { group: "ADV-4: Complication Response", criterion: "Linguistic ability", passIf: "Uses problem-solving language (I'm afraid..., Unfortunately..., What I can do is..., Would it be okay if...). Simple 'sorry' alone = fail." },
  "ADV-4-CD1": { group: "ADV-4: Complication Response", criterion: "Communicative devices", passIf: "Uses 3-part pattern: (1) situation opener — apology/acknowledgment/request as appropriate (2) reason/explanation (3) alternative options. Missing any part = fail." },
  // ADV-5: Intelligibility (GATE) — 13
  "ADV-5-F1": { group: "ADV-5: Intelligibility - Fluency", criterion: "Rate of speech", passIf: "Speed doesn't hinder understanding" },
  "ADV-5-F2": { group: "ADV-5: Intelligibility - Fluency", criterion: "Fluidity (halting)", passIf: "Speech flows without excessive halting" },
  "ADV-5-F3": { group: "ADV-5: Intelligibility - Fluency", criterion: "Connectedness", passIf: "Ideas flow logically and smoothly" },
  "ADV-5-G1": { group: "ADV-5: Intelligibility - Grammar", criterion: "Word Structure (Morphology)", passIf: "Correct word forms (e.g., -ed, -ing, -s)" },
  "ADV-5-G2": { group: "ADV-5: Intelligibility - Grammar", criterion: "Syntax", passIf: "Sentence structure is appropriate" },
  "ADV-5-G3": { group: "ADV-5: Intelligibility - Grammar", criterion: "Cases", passIf: "Correct case usage (subject/object pronouns)" },
  "ADV-5-G4": { group: "ADV-5: Intelligibility - Grammar", criterion: "Prepositions", passIf: "Preposition usage is acceptable" },
  "ADV-5-G5": { group: "ADV-5: Intelligibility - Grammar", criterion: "Agreement", passIf: "Subject-verb agreement is maintained" },
  "ADV-5-PC1": { group: "ADV-5: Pragmatic Competence", criterion: "Compensate for weaknesses", passIf: "Uses strategies to overcome language gaps" },
  "ADV-5-P1": { group: "ADV-5: Intelligibility - Pronunciation", criterion: "Articulation", passIf: "Words are recognizable and clear" },
  "ADV-5-P2": { group: "ADV-5: Intelligibility - Pronunciation", criterion: "Pitch", passIf: "Pitch doesn't obscure meaning" },
  "ADV-5-P3": { group: "ADV-5: Intelligibility - Pronunciation", criterion: "Stress", passIf: "Word and sentence stress is acceptable" },
  "ADV-5-P4": { group: "ADV-5: Intelligibility - Pronunciation", criterion: "Intonation", passIf: "Sentence intonation is understandable" },
  // AL-14: Comparison/Change — 6
  "AL-14-PS": { group: "AL-14: Comparison/Change", criterion: "Paragraph Structure", passIf: "Topic→Supporting→Concluding 구조. 도입-본론-결론 명확" },
  "AL-14-LS": { group: "AL-14: Comparison/Change", criterion: "Logical Sequence", passIf: "비교/대조가 논리적 (과거→현재→결론 또는 원인→결과)" },
  "AL-14-CS": { group: "AL-14: Comparison/Change", criterion: "Comparison Structure", passIf: "비교급/대조 표현 2개 이상 (more convenient, on the flip side 등)" },
  "AL-14-CD": { group: "AL-14: Comparison/Change", criterion: "Connector Diversity", passIf: "서로 다른 연결어 3종 이상 사용" },
  "AL-14-VB": { group: "AL-14: Comparison/Change", criterion: "Vocabulary Breadth", passIf: "고급 어휘 사용 (revolutionize, significant 등). 일상 단어만 시 fail" },
  "AL-14-GA": { group: "AL-14: Comparison/Change", criterion: "Grammar Accuracy", passIf: "수일치, 전치사, 복문에서 심각한 오류 없음" },
  // AL-15: Issue/News Discussion — 6
  "AL-15-AS": { group: "AL-15: Issue/News Discussion", criterion: "Argumentation Structure", passIf: "논리적 분석 구조 (배경→관점→근거→결론)" },
  "AL-15-MA": { group: "AL-15: Issue/News Discussion", criterion: "Multi-perspective Analysis", passIf: "2개 이상 서로 다른 관점 + 각 관점의 근거" },
  "AL-15-SI": { group: "AL-15: Issue/News Discussion", criterion: "Social/Institutional Depth", passIf: "개인 경험 넘어 사회적·제도적 차원에서 이슈 논의" },
  "AL-15-CD": { group: "AL-15: Issue/News Discussion", criterion: "Connector Diversity", passIf: "3종류 이상 서로 다른 연결어로 논리적 흐름 형성" },
  "AL-15-VB": { group: "AL-15: Issue/News Discussion", criterion: "Vocabulary Breadth", passIf: "이슈 토론 적합 어휘 3개 이상 (significant, controversial 등)" },
  "AL-15-GA": { group: "AL-15: Issue/News Discussion", criterion: "Grammar Accuracy", passIf: "종속절 포함 복문 사용, 주요 문법 오류 없이 의미 전달" },
};

// 체크박스 정의 텍스트 생성 (프롬프트 주입용)
export function buildCheckboxDefinitionsText(checkboxIds: string[]): string {
  // 그룹별로 묶기
  const groups = new Map<string, Array<{ id: string; criterion: string; passIf: string }>>();
  for (const id of checkboxIds) {
    const desc = CHECKBOX_DESCRIPTIONS[id];
    if (!desc) continue;
    if (!groups.has(desc.group)) groups.set(desc.group, []);
    groups.get(desc.group)!.push({ id, criterion: desc.criterion, passIf: desc.passIf });
  }

  const lines: string[] = [];
  for (const [group, items] of groups) {
    const isCumulative = group.includes("Cumulative");
    lines.push(`\n**${group}** (${items.length} items)${isCumulative ? " — Cumulative" : ""}`);
    lines.push("| Code | Criterion | Pass if... |");
    lines.push("|------|-----------|------------|");
    for (const item of items) {
      lines.push(`| ${item.id} | ${item.criterion} | ${item.passIf} |`);
    }
    if (isCumulative && group.includes("INT-2")) {
      lines.push("> **Rule**: If INT-2-3 passes, INT-2-1 and INT-2-2 also pass.");
    }
    if (isCumulative && group.includes("ADV-2")) {
      lines.push("> **Rule**: If ADV-2-SP5 passes, ADV-2-SP1~SP4 also pass.");
    }
  }

  return lines.join("\n");
}

// ============================================================
// 6. 체크박스 검증 (GPT 출력 → 정리)
// ============================================================

export interface CheckboxResult {
  pass: boolean;
  evidence?: string;
}

// GPT 출력 체크박스를 검증: 예상 ID만 유지, 누락은 fail 처리
export function validateCheckboxes(
  checkboxes: Record<string, CheckboxResult>,
  questionType: string,
): {
  validated: Record<string, CheckboxResult>;
  passCount: number;
  failCount: number;
  passRate: number;
} {
  const { ids: expectedIds } = getCheckboxIdsForQuestionType(questionType);
  const validated: Record<string, CheckboxResult> = {};

  for (const id of expectedIds) {
    if (checkboxes[id]) {
      validated[id] = checkboxes[id];
    } else {
      // 누락 → fail 처리
      validated[id] = { pass: false, evidence: "Not evaluated by model" };
    }
  }

  const passCount = Object.values(validated).filter((v) => v.pass).length;
  const failCount = expectedIds.length - passCount;
  const passRate = expectedIds.length > 0 ? passCount / expectedIds.length : 0;

  return { validated, passCount, failCount, passRate };
}
