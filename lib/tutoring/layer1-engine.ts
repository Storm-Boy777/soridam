// Layer 1 규칙 기반 피드백 엔진
// LLM 호출 없이 transcript + speech meta로 즉시 PASS/RETRY/ESCALATE 판정
// 설계서: docs/설계/튜터링.md — "Layer 1 드릴 피드백 원칙"

import type { Layer1Result, PassCriteria, ChecklistItem } from "@/lib/types/tutoring";

// ── 마커 세트 (type_templates.layer1_markers와 동기화) ──

const MARKER_SETS: Record<string, Record<string, string[]>> = {
  comparison: {
    past: ["in the past", "before", "when i was younger", "back then", "used to", "years ago", "when i was a kid", "growing up"],
    present: ["these days", "now", "nowadays", "today", "currently", "recently", "at the moment"],
    difference: ["different", "the biggest difference", "more than", "less than", "compared to", "unlike", "whereas", "on the other hand", "changed", "not anymore"],
    reason: ["because", "since", "thats why", "the reason is", "so now", "due to", "i think this is because", "this happened because"],
  },
  routine: {
    sequence: ["first", "then", "next", "after that", "finally", "later", "before that", "second"],
    routine_anchor: ["usually", "normally", "every day", "every morning", "on weekdays", "when i", "my routine"],
    habit: ["i always", "i tend to", "i like to", "thats how"],
  },
  past_special: {
    sequence: ["first", "then", "next", "after that", "finally", "later", "suddenly", "at that moment"],
    event_anchor: ["one day", "last year", "a few months ago", "i remember", "there was a time", "the most memorable"],
    feeling: ["i felt", "it was amazing", "i was so", "that experience", "i learned", "since then"],
  },
  past_childhood: {
    past_anchor: ["when i was young", "when i was a kid", "growing up", "as a child", "i remember", "back when i was", "years ago"],
    event: ["one day", "one time", "there was", "i went", "we did", "it happened"],
    feeling: ["i felt", "it was", "i was so", "that was", "i still remember", "i loved", "it made me"],
  },
  past_recent: {
    recent_anchor: ["recently", "last week", "a few days ago", "just the other day", "not long ago", "the last time"],
    sequence: ["first", "then", "after that", "finally", "so", "and then"],
    outcome: ["in the end", "it turned out", "so now", "eventually", "i ended up"],
  },
  rp_12: {
    problem: ["there is a problem", "it doesnt work", "i cant", "something is wrong", "unfortunately", "im afraid", "the issue is", "the problem is", "it seems like", "i noticed that"],
    reason: ["because", "the reason is", "what happened was", "it turns out", "apparently"],
    alternative: ["instead", "another option", "alternatively", "or i can", "could you", "maybe i can", "would it be possible", "how about", "is there any way", "one option is", "another option is"],
    apology: ["im sorry", "i apologize", "excuse me", "i hate to say this"],
  },
  rp_11: {
    question_markers: ["how much", "how long", "when does", "where is", "what time", "do i need", "is there", "can i", "could you tell me", "i was wondering", "id like to know", "what kind of"],
    opening: ["hello", "hi", "excuse me", "im calling to", "i was wondering"],
    closing: ["thank you", "thanks", "i appreciate", "thats all"],
  },
  description: {
    topic_anchor: ["my favorite", "i really like", "the best thing", "let me tell you about", "i want to describe"],
    features: ["it has", "there is", "one thing", "another thing", "also", "and it", "the reason"],
    personal: ["i like it because", "thats why", "i think", "for me"],
  },
  adv_14: {
    change: ["has changed", "is different", "has evolved", "used to be", "not anymore", "these days", "over the years", "in recent years"],
    cause: ["because", "due to", "the main reason", "this is because", "thanks to", "as a result of"],
    impact: ["as a result", "this has led to", "because of this", "the impact is", "it affects", "this means that"],
  },
  adv_15: {
    issue: ["recently", "these days", "there has been", "one issue is", "a big concern is", "people are talking about"],
    reaction: ["many people think", "some people believe", "there are concerns", "people are worried", "the public reaction"],
    opinion: ["i think", "in my opinion", "personally", "i believe", "from my perspective", "as far as im concerned"],
  },
};

// ── PASS 기준 → flag 매핑 ──

const FLAG_TO_MARKER_GROUP: Record<string, Record<string, string>> = {
  comparison: {
    past_mention: "past",
    present_mention: "present",
    difference_statement: "difference",
    reason_statement: "reason",
  },
  routine: {
    routine_anchor_present: "routine_anchor",
    sequence_progression: "sequence",
    minimum_two_steps: "sequence",
  },
  past_special: {
    event_anchor_present: "event_anchor",
    sequence_progression: "sequence",
    result_or_feeling_present: "feeling",
  },
  past_childhood: {
    past_anchor_present: "past_anchor",
    main_event_present: "event",
    result_or_feeling_present: "feeling",
  },
  past_recent: {
    recent_anchor_present: "recent_anchor",
    sequence_progression: "sequence",
    outcome_present: "outcome",
  },
  rp_12: {
    problem_statement: "problem",
    reason_or_detail: "reason",
    alternative_request: "alternative",
  },
  rp_11: {
    minimum_three_questions: "question_markers",
    category_diversity_min_2: "question_markers",
  },
  description: {
    topic_anchor_present: "topic_anchor",
    feature_count_min_2: "features",
  },
  adv_14: {
    change_statement: "change",
    cause_statement: "cause",
    impact_statement: "impact",
  },
  adv_15: {
    issue_background: "issue",
    public_reaction: "reaction",
    personal_opinion: "opinion",
  },
};

// ── 한국어 flag 라벨 ──

const FLAG_LABELS: Record<string, string> = {
  past_mention: "과거 언급",
  present_mention: "현재 언급",
  difference_statement: "핵심 차이",
  reason_statement: "이유 1문장",
  routine_anchor_present: "루틴 소개",
  sequence_progression: "순서 전개",
  minimum_two_steps: "2단계 이상",
  minimum_three_steps: "3단계 이상",
  event_anchor_present: "사건 배경",
  result_or_feeling_present: "결과/느낌",
  past_anchor_present: "과거 시점",
  main_event_present: "핵심 사건",
  recent_anchor_present: "최근 배경",
  outcome_present: "결과",
  problem_statement: "문제 설명",
  reason_or_detail: "이유/세부",
  alternative_request: "대안 제시",
  topic_anchor_present: "대상 소개",
  feature_count_min_2: "특징 2개+",
  minimum_three_questions: "질문 3개+",
  category_diversity_min_2: "정보 범주 2+",
  change_statement: "변화 설명",
  cause_statement: "원인 분석",
  impact_statement: "영향/결과",
  issue_background: "이슈 배경",
  public_reaction: "대중 반응",
  personal_opinion: "개인 의견",
};

// ── 피드백 템플릿 ──

const PRAISE_TEMPLATES = {
  all_pass: "좋아요. 구조가 잘 잡혔어요.",
  one_missing: "좋아요. 뼈대는 잘 잡혔어요.",
  two_missing: "기본 시작은 괜찮아요.",
  most_missing: "시작은 했어요.",
  too_short: "답변이 너무 짧아요.",
};

function getRetryInstruction(failedFlags: string[], questionType: string): string {
  if (failedFlags.length === 0) return "";
  if (failedFlags.length === 1) {
    const label = FLAG_LABELS[failedFlags[0]] ?? failedFlags[0];
    return `이번엔 ${label}만 넣어서 다시 말해보세요.`;
  }
  const labels = failedFlags.slice(0, 2).map((f) => FLAG_LABELS[f] ?? f);
  return `이번엔 ${labels.join("과(와) ")}가 들리게 다시 말해보세요.`;
}

// ── 메인 판정 함수 ──

export interface Layer1Input {
  transcript: string;
  questionType: string;
  passCriteria: PassCriteria;
  speechMeta: {
    audioDuration: number;
    wordCount: number;
    wpm: number;
    fillerRatio: number;
    longPauseCount: number;
    unfinishedEnd: boolean;
  };
  retryCount: number;
}

export function evaluateLayer1(input: Layer1Input): Layer1Result {
  const { transcript, questionType, passCriteria, speechMeta, retryCount } = input;

  // 전처리
  const normalized = transcript.toLowerCase().replace(/['']/g, "").replace(/[.,!?;:]/g, " ");

  // Step 1: 기본 유효성 검사
  if (!transcript || transcript.trim().length < 5) {
    return buildResult("retry", [], passCriteria.required_flags, [], "답변이 거의 없어요.", "한두 문장이라도 말해보세요.", {}, {});
  }

  const minWords = (passCriteria.min_word_count ?? 10) * 0.4;
  if (speechMeta.wordCount < minWords) {
    return buildResult("retry", [], passCriteria.required_flags, ["too_short"], PRAISE_TEMPLATES.too_short, "한두 문장만 더 붙여서 답변을 완성해보세요.", {}, {
      min_word_count_pass: false,
    });
  }

  // Step 2: 마커 기반 flag 체크
  const markers = MARKER_SETS[questionType] ?? {};
  const flagMapping = FLAG_TO_MARKER_GROUP[questionType] ?? {};
  const ruleHits: Record<string, string[]> = {};
  const passedFlags: string[] = [];
  const failedFlags: string[] = [];

  for (const flag of passCriteria.required_flags) {
    const markerGroup = flagMapping[flag];
    if (!markerGroup || !markers[markerGroup]) {
      // 매핑이 없는 flag는 일단 pass로 처리 (보수적이지 않지만 규칙 미정의)
      passedFlags.push(flag);
      continue;
    }

    const markerList = markers[markerGroup];
    const hits = markerList.filter((m) => normalized.includes(m));
    ruleHits[flag] = hits;

    // 특수 처리: rp_11의 질문 3개 이상
    if (flag === "minimum_three_questions") {
      const questionCount = countQuestions(normalized);
      if (questionCount >= 3) {
        passedFlags.push(flag);
      } else {
        failedFlags.push(flag);
      }
      continue;
    }

    // 특수 처리: description의 특징 2개 이상
    if (flag === "feature_count_min_2") {
      if (hits.length >= 2) {
        passedFlags.push(flag);
      } else {
        failedFlags.push(flag);
      }
      continue;
    }

    // 특수 처리: sequence 2단계 이상
    if (flag === "minimum_two_steps") {
      if (hits.length >= 2) {
        passedFlags.push(flag);
      } else {
        failedFlags.push(flag);
      }
      continue;
    }

    // 일반: 1개 이상 hit이면 pass
    if (hits.length > 0) {
      passedFlags.push(flag);
    } else {
      failedFlags.push(flag);
    }
  }

  // Step 3: 메타 체크
  const metaChecks: Record<string, boolean> = {};
  metaChecks.min_word_count_pass = speechMeta.wordCount >= (passCriteria.min_word_count ?? 10);
  metaChecks.min_duration_pass = speechMeta.audioDuration >= (passCriteria.min_duration_sec ?? 8);
  metaChecks.pause_pass = speechMeta.longPauseCount <= (passCriteria.max_long_pause_count ?? 5);

  // soft warnings
  const softWarnings: string[] = [];
  if (speechMeta.fillerRatio > (passCriteria.max_filler_ratio ?? 0.15)) {
    softWarnings.push("high_filler");
  }
  if (speechMeta.unfinishedEnd) {
    softWarnings.push("unfinished_end");
  }

  // Step 4: PASS / RETRY / ESCALATE 결정
  const allFlagsPassed = failedFlags.length === 0;
  const metaHardPass = metaChecks.min_word_count_pass && metaChecks.min_duration_pass;

  // Escalation 조건
  if (retryCount >= 2 && failedFlags.length > 0) {
    const praise = failedFlags.length <= 1 ? PRAISE_TEMPLATES.one_missing : PRAISE_TEMPLATES.two_missing;
    return buildResult(
      "escalate_l2",
      passedFlags,
      failedFlags,
      softWarnings,
      praise,
      "이번에는 더 구체적으로 짚어드릴게요.",
      ruleHits,
      metaChecks
    );
  }

  if (allFlagsPassed && metaHardPass) {
    return buildResult("pass", passedFlags, failedFlags, softWarnings, PRAISE_TEMPLATES.all_pass, "", ruleHits, metaChecks);
  }

  // RETRY
  const praise =
    failedFlags.length === 1
      ? PRAISE_TEMPLATES.one_missing
      : failedFlags.length === 2
        ? PRAISE_TEMPLATES.two_missing
        : PRAISE_TEMPLATES.most_missing;

  const retryInstruction = getRetryInstruction(failedFlags, questionType);

  return buildResult("retry", passedFlags, failedFlags, softWarnings, praise, retryInstruction, ruleHits, metaChecks);
}

// ── 결과 빌더 ──

function buildResult(
  result: "pass" | "retry" | "escalate_l2",
  passedFlags: string[],
  failedFlags: string[],
  softWarnings: string[],
  praise: string,
  retryInstruction: string,
  ruleHits: Record<string, string[]>,
  metaChecks: Record<string, boolean>
): Layer1Result {
  const checklist: ChecklistItem[] = [
    ...passedFlags.map((f) => ({ label: FLAG_LABELS[f] ?? f, status: "pass" as const })),
    ...failedFlags.map((f) => ({ label: FLAG_LABELS[f] ?? f, status: "fail" as const })),
  ];

  const confidence = passedFlags.length / Math.max(1, passedFlags.length + failedFlags.length);

  return {
    layer: "L1",
    result,
    confidence: Math.round(confidence * 100) / 100,
    passed_flags: passedFlags,
    failed_flags: failedFlags,
    soft_warnings: softWarnings,
    student_feedback: {
      status_label: result === "pass" ? "PASS" : "RETRY",
      checklist,
      praise,
      retry_instruction: retryInstruction,
    },
    internal_trace: {
      rule_hits: ruleHits,
      meta_checks: metaChecks,
    },
    next_action:
      result === "pass"
        ? "pass_next_question"
        : result === "escalate_l2"
          ? "escalate_to_layer2"
          : "retry_same_question",
  };
}

// ── 헬퍼: 질문 개수 세기 (rp_11용) ──

function countQuestions(text: string): number {
  // ? 기준 + 의문문 패턴 매칭
  const questionMarks = (text.match(/\?/g) || []).length;
  const questionPatterns = [
    /\b(how|what|when|where|which|who|why|is there|do i|can i|could you|would it)\b/gi,
  ];
  const patternHits = questionPatterns.reduce(
    (count, pattern) => count + (text.match(pattern) || []).length,
    0
  );
  return Math.max(questionMarks, Math.floor(patternHits / 1));
}
