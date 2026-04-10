"use client";

import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  type SupportCategory,
} from "@/lib/types/support";

export function CategoryBadge({ category }: { category: SupportCategory }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-[11px] ${CATEGORY_COLORS[category]}`}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}
