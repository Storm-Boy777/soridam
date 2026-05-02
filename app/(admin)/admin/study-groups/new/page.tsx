/**
 * 관리자 — 새 오픽 스터디 그룹 생성
 */

import { NewStudyGroupForm } from "./_form";

export default function NewStudyGroupPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">새 스터디 그룹 만들기</h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          이름 · 등급 · 운영 기간 · 초기 멤버 등록
        </p>
      </div>

      <NewStudyGroupForm />
    </div>
  );
}
