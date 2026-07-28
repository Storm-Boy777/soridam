import { ExportContent } from "@/components/export/export-content";

export const metadata = {
  title: "내 자료 내려받기",
  description: "작성하신 스크립트와 음성 파일을 내려받습니다",
};

export default function MyDataPage() {
  return (
    <div className="pb-6 pt-1 sm:pb-8 sm:pt-2 lg:pt-0">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">내 자료 내려받기</h1>
        <p className="mt-0.5 text-sm text-foreground-secondary sm:mt-1 sm:text-base">
          그동안 만드신 스크립트와 음성을 내려받아 계속 학습하실 수 있어요.
        </p>
      </div>

      {/* 종료 안내 */}
      <div className="mb-6 rounded-2xl bg-[#1A1A2E] px-5 py-5 sm:px-6">
        <p className="text-sm font-bold text-white">
          AI 기능 종료 안내 · 2026년 8월 31일
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-white/55">
          크레딧 기반 AI 기능이 2026년 8월 31일 종료됩니다. 그동안 만드신 스크립트와 음성은{" "}
          <span className="font-medium text-primary-300">8월 31일까지</span> 내려받으실 수
          있으며, 이후에는 순차적으로 삭제됩니다. 내려받으시면 인터넷 없이도 계속 학습하실 수
          있는 프로그램 형태로 제공되니, 미리 받아 두시길 부탁드립니다.
        </p>
      </div>

      <ExportContent />
    </div>
  );
}
