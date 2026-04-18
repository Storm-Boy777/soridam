"use client";

import dynamic from "next/dynamic";

const CheckinClient = dynamic(() => import("./CheckinClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-400 font-bold">로딩 중...</div>
    </div>
  ),
});

export default function CheckinPage() {
  return <CheckinClient />;
}
