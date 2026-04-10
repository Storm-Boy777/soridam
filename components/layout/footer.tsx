import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer-dark">
      <div className="border-t border-white/10" />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between md:items-start">
          {/* 브랜드 */}
          <div className="flex flex-col gap-2">
            <span className="text-[22px] font-extrabold tracking-tight text-white">
              소리<span className="text-primary-400">담</span>
            </span>
          </div>

          {/* 링크 */}
          <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs sm:gap-x-8 sm:text-sm">
            <Link href="/strategy">전략 가이드</Link>
            <Link href="/terms">이용약관</Link>
            <Link href="/privacy">개인정보처리방침</Link>
            <Link href="/refund">환불 규정</Link>
            <Link href="/support">소통함</Link>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <p className="text-sm">
            당신의 하루를 응원합니다. 오늘도, 내일도.
          </p>
          <p className="text-[13px] text-[#6B6B7B]">
            &copy; {new Date().getFullYear()} 소리담. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
