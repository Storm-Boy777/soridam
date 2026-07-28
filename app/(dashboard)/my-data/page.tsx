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
          AI 기능이 2026년 8월 31일에 종료됩니다
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-white/55">
          소리담을 더 오래, 건강하게 이어가기 위해 서비스를 개편하면서 크레딧 기반 AI
          기능을 정리하게 되었습니다. 그동안 만드신 자료는{" "}
          <span className="font-medium text-primary-300">8월 31일까지</span> 내려받으실 수
          있으며, 이후 순차적으로 삭제됩니다. 잊지 마시고 미리 저장해 두세요.
        </p>
      </div>

      <ExportContent />
    </div>
  );
}
