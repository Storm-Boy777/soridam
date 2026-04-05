import Link from "next/link";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen justify-center bg-background px-4 pt-12 sm:pt-20">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <span className="text-[28px] font-extrabold tracking-tight text-foreground">
              소리<span className="text-primary-500">담</span>
            </span>
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
