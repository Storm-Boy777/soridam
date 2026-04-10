"use client";

import {
  STATUS_LABELS,
  STATUS_COLORS,
  CATEGORY_LABELS,
  CATEGORY_EMOJI,
  CATEGORY_COLORS,
  type SupportStatus,
  type SupportCategory,
} from "@/lib/types/support";

export function StatusBadge({ status }: { status: SupportStatus }) {
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold sm:text-xs ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function CategoryBadge({ category }: { category: SupportCategory }) {
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold sm:text-xs ${CATEGORY_COLORS[category]}`}
    >
      {CATEGORY_EMOJI[category]} {CATEGORY_LABELS[category]}
    </span>
  );
}
