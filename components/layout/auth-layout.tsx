import Image from "next/image";
import Link from "next/link";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen justify-center bg-background px-4 pt-12 sm:pt-20">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <Image
              src="/images/logo-sunrise-terracotta.png"
              alt="하루오픽"
              width={140}
              height={26}
              priority
            />
          </Link>
        </div>

        {/* 카드 */}
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-md sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
