"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getUnansweredInquiryCount } from "@/lib/actions/admin/support";
import { MessageCircle, X } from "lucide-react";

const MODAL_KEY = "admin-inquiry-modal-shown";

export function AdminInquiryToast() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const { data: count } = useQuery({
    queryKey: ["admin-unanswered-inquiry"],
    queryFn: () => getUnansweredInquiryCount(),
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!count || count === 0) return;
    if (sessionStorage.getItem(MODAL_KEY)) return;
    sessionStorage.setItem(MODAL_KEY, "1");
    setOpen(true);
  }, [count]);

  if (!open || !count) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="relative mx-4 w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
        {/* 닫기 */}
        <button
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 rounded-lg p-1 text-foreground-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
        >
          <X size={18} />
        </button>

        {/* 아이콘 */}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-50">
          <MessageCircle size={24} className="text-primary-500" />
        </div>

        {/* 내용 */}
        <h3 className="mt-4 text-center text-base font-bold text-foreground">
          새 1:1 문의 {count}건
        </h3>
        <p className="mt-1.5 text-center text-sm text-foreground-secondary">
          미답변 문의가 있습니다. 소통함에서 확인해 주세요.
        </p>

        {/* 버튼 */}
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => setOpen(false)}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-secondary"
          >
            나중에
          </button>
          <button
            onClick={() => {
              setOpen(false);
              router.push("/admin/support");
            }}
            className="flex-1 rounded-xl bg-primary-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-600"
          >
            확인하기
          </button>
        </div>
      </div>
    </div>
  );
}
