// Talklish · Editorial Studio 디자인 토큰
// data.js (Anthropic Design 핸드오프) 기준

export const TLK = {
  // 종이/배경
  bg:       "#F4EFE6",  // 밝은 크림 (무대 외곽)
  bg2:      "#EBE3D4",  // 좀 더 짙은 크림
  paper:    "#FBF7EE",  // 카드 배경
  paperHi:  "#FFFFFF",  // 강조 카드 배경

  // 잉크
  ink:      "#1F1B16",  // 본문/제목
  inkDim:   "#615847",  // 보조 텍스트
  inkFaint: "#9B917F",  // 흐린 텍스트 / 메타

  // 라인
  rule:     "#D6CDB9",
  ruleHi:   "#C0B59B",

  // 강조 컬러
  accent:   "#C9522D",  // 테라코타 — primary
  accent2:  "#3F5A4A",  // 딥그린 — secondary
  gold:     "#B58634",
} as const;

// 폰트 (next/font/google에서 변수로 받아 적용)
export const TLK_FONT = {
  serif: "var(--font-spectral), 'Spectral', Georgia, serif",
  sans:  "var(--font-manrope), 'Manrope', 'Pretendard', system-ui, sans-serif",
  ko:    "var(--font-pretendard), 'Pretendard', system-ui, sans-serif",
  mono:  "'IBM Plex Mono', ui-monospace, monospace",
} as const;
