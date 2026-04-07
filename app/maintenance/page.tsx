import { Headphones, Mail, ArrowRight } from "lucide-react";

export const metadata = {
  title: "소리담 | 새로운 모습으로 준비 중",
  description: "소리담이 더 나은 서비스로 업그레이드 중입니다.",
};

export default function MaintenancePage() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4">
      {/* 배경 장식 — 부드러운 그라디언트 원 */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-500/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-secondary-500/5 blur-3xl" />

      <div className="relative w-full max-w-lg text-center">
        {/* 아이콘 — 펄스 애니메이션 */}
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center">
          <div className="absolute h-24 w-24 animate-ping rounded-full bg-primary-500/10" style={{ animationDuration: "3s" }} />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-50 to-primary-100 shadow-lg shadow-primary-500/10">
            <Headphones className="h-10 w-10 text-primary-500" />
          </div>
        </div>

        {/* 브랜드 */}
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary-500">
          소리담
        </p>

        {/* 메인 메시지 */}
        <h1 className="mb-4 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
          새로운 모습으로
          <br />
          <span className="text-primary-500">준비 중입니다</span>
        </h1>

        <p className="mx-auto mb-10 max-w-sm text-base leading-relaxed text-foreground-secondary">
          더 나은 학습 경험을 위해 시스템을 업그레이드하고 있습니다.
          빠른 시일 내에 찾아뵙겠습니다.
        </p>

        {/* 진행 상태 바 */}
        <div className="mx-auto mb-10 max-w-xs">
          <div className="mb-2 flex items-center justify-between text-xs text-foreground-muted">
            <span>업그레이드 진행 중</span>
            <span className="font-medium text-primary-500">곧 완료</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400"
              style={{
                width: "75%",
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        {/* 안내 카드 */}
        <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          {/* 업그레이드 내용 미리보기 */}
          <div className="border-b border-border px-6 py-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              업그레이드 내용
            </p>
            <ul className="space-y-2.5 text-left text-sm text-foreground-secondary">
              {[
                "전체 UI/UX 최적화",
                "과금 체계 변경",
                "모든 학습 기능 업그레이드",
                "시스템 안정성 강화",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* 연락처 */}
          <div className="flex items-center gap-3 px-6 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50">
              <Mail className="h-4 w-4 text-primary-500" />
            </div>
            <div className="text-left">
              <p className="text-xs text-foreground-muted">문의사항</p>
              <a
                href="mailto:soridamhub@gmail.com"
                className="text-sm font-medium text-foreground-secondary transition-colors hover:text-primary-500"
              >
                soridamhub@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* 완료 예정일 */}
        <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground-secondary">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
          <span><strong className="text-foreground">4월 13일</strong> 이전 완료 예정</span>
        </div>

        <p className="mt-4 text-xs text-foreground-muted">
          불편을 드려 죄송합니다. 조금만 기다려 주세요.
        </p>
      </div>
    </div>
  );
}
