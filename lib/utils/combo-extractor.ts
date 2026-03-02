// 콤보 추출기 — 소리담 _shared/comboExtractor.ts 이식
// 변경사항: General 1개 → general_1/2/3 3분할, combo_type 영어 통일

import type { ComboType, QuestionItem } from "@/lib/types/reviews";

// 제외 주제 (A-4: 공원/카페/하이킹은 빈도 분석에서 제외)
const EXCLUDED_TOPICS = ["공원", "카페", "하이킹"];

export interface ExtractedCombo {
  combo_type: ComboType;
  topic: string;
  question_ids: string[];
}

interface ComboRange {
  comboType: ComboType;
  numbers: number[];
  excludeTopics: boolean;
}

const COMBO_RANGES: ComboRange[] = [
  { comboType: "general_1", numbers: [2, 3, 4], excludeTopics: true },
  { comboType: "general_2", numbers: [5, 6, 7], excludeTopics: true },
  { comboType: "general_3", numbers: [8, 9, 10], excludeTopics: true },
  { comboType: "roleplay", numbers: [11, 12, 13], excludeTopics: false },
  { comboType: "advance", numbers: [14, 15], excludeTopics: true },
];

// 유니크 주제를 쉼표로 연결
function extractTopics(questions: QuestionItem[]): string {
  const topics = [...new Set(questions.map((q) => q.topic).filter(Boolean))];
  return topics.join(",") || "일반";
}

// 콤보 유효성 검증: 모든 질문이 question_id 보유 + 기억함 + 커스텀 아님
function isValidForCombo(
  questions: QuestionItem[],
  excludeTopics: boolean
): boolean {
  return questions.every(
    (q) =>
      q.question_id &&
      !q.is_not_remembered &&
      !q.custom_question_text &&
      (!excludeTopics || !EXCLUDED_TOPICS.includes(q.topic))
  );
}

/**
 * submission_questions 14개에서 콤보를 추출한다.
 * 조건 미충족 콤보는 스킵 (에러 아님).
 * @returns 최대 5개의 ExtractedCombo 배열
 */
export function extractCombos(questions: QuestionItem[]): ExtractedCombo[] {
  const combos: ExtractedCombo[] = [];

  for (const range of COMBO_RANGES) {
    const rangeQuestions = questions.filter((q) =>
      range.numbers.includes(q.question_number)
    );

    // 질문 개수가 정확히 맞아야 함
    if (rangeQuestions.length !== range.numbers.length) continue;

    // 유효성 검증
    if (!isValidForCombo(rangeQuestions, range.excludeTopics)) continue;

    combos.push({
      combo_type: range.comboType,
      topic: extractTopics(rangeQuestions),
      question_ids: rangeQuestions
        .map((q) => q.question_id!)
        .filter(Boolean),
    });
  }

  return combos;
}
