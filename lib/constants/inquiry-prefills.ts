import type { SupportCategory } from "@/lib/types/support";

/**
 * 1:1 문의 폼 prefill 카탈로그
 *
 * 사용처:
 *   `/support?tab=inquiry&prefill=<key>` 로 진입하면 해당 케이스의 카테고리/제목/내용이
 *   문의 폼에 자동 채워지고 폼이 펼쳐진다.
 *
 * 추가하는 법:
 *   여기에 새 key를 추가하고, 트리거 페이지에서 그 key를 URL 파라미터로 넘기면 된다.
 */

export interface InquiryPrefill {
  category: SupportCategory;
  title: string;
  content: string;
}

export const INQUIRY_PREFILLS: Record<string, InquiryPrefill> = {
  "opic-study": {
    category: "other",
    title: "오픽 스터디 참여 문의",
    content:
      "안녕하세요. 오픽 스터디 참여에 관심이 있어 문의드립니다.\n\n" +
      "- 목표 등급:\n" +
      "- 시험 예정일(선택):\n" +
      "- 참여 가능 시간대(선택):\n" +
      "\n자유롭게 더 적어주세요.",
  },
};

export function getInquiryPrefill(key: string | null): InquiryPrefill | null {
  if (!key) return null;
  return INQUIRY_PREFILLS[key] ?? null;
}
