import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer-dark">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between md:items-start">
          {/* 브랜드 */}
          <div className="flex flex-col gap-2">
            <Image
              src="/images/logo-sunrise-dark.png"
              alt="하루오픽"
              width={120}
              height={22}
            />
            <p className="text-sm">
              당신의 하루를 응원합니다. 오늘도, 내일도.
            </p>
          </div>

          {/* 링크 */}
          <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs sm:gap-x-8 sm:text-sm">
            <Link href="/strategy">전략 가이드</Link>
            <Link href="/pricing">요금제</Link>
            <Link href="/terms">이용약관</Link>
            <Link href="/privacy">개인정보처리방침</Link>
            <Link href="/refund">환불 규정</Link>
          </div>
        </div>

        {/* 사업자 정보 */}
        <div className="mt-8 border-t border-white/10 pt-6 text-[13px] leading-relaxed text-[#8B7E72]">
          <div className="flex flex-col gap-0.5 sm:gap-0">
            <p>상호: 스투스 OPIc</p>
            <p>대표자: 전다영</p>
            <p>사업자등록번호: 757-18-02318</p>
            <p>소재지: 경상북도 구미시 해마루공원로 80, 104동 1903호</p>
            <p>
              대표전화: 010-4715-8846 | 이메일:{" "}
              <a href="mailto:haruopic@gmail.com">
                haruopic@gmail.com
              </a>
            </p>
            <p>통신판매업 신고번호: 제 2026-경북구미-0236 호</p>
          </div>
          <p className="mt-4 text-[#6E6358]">
            &copy; {new Date().getFullYear()} 하루오픽. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
