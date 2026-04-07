import { Wrench } from "lucide-react";

export const metadata = {
  title: "소리담 | 업그레이드 진행 중",
};

export default function MaintenancePage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-50">
          <Wrench className="h-10 w-10 text-primary-500" />
        </div>

        <h1 className="mb-3 text-2xl font-bold text-foreground">
          시스템 업그레이드 중입니다
        </h1>

        <p className="mb-6 text-foreground-secondary leading-relaxed">
          더 나은 서비스를 위해 시스템을 업그레이드하고 있습니다.
          <br />
          빠른 시일 내에 새로운 모습으로 찾아뵙겠습니다.
        </p>

        <div className="rounded-xl border border-border bg-surface p-4 text-sm text-foreground-muted">
          <p>문의사항이 있으시면 아래로 연락해주세요.</p>
          <p className="mt-1 font-medium text-foreground-secondary">
            soridam.app@gmail.com
          </p>
        </div>
      </div>
    </div>
  );
}
