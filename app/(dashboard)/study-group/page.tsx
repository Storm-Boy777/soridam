import { StudyGroupContent } from "@/components/study-group/study-group-content";

export const metadata = {
  title: "스터디 모임",
};

export default function StudyGroupPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">스터디 모임</h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          오프라인 영어 스터디 진행 도우미 — 월(팟캐스트) · 수(OPIc) · 금(프리토킹)
        </p>
      </div>
      <StudyGroupContent />
    </div>
  );
}
