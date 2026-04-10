"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "소리담은 어떤 서비스인가요?",
    a: "소리담은 데이터 기반 OPIc AI 학습 플랫폼입니다. 기출 빈도 분석, AI 맞춤 스크립트 생성, 실전 모의고사 + AI 평가 리포트, 약점 튜터링, 쉐도잉 훈련까지 — OPIc 준비에 필요한 전 과정을 하나의 플랫폼에서 제공합니다.",
  },
  {
    q: "소리담은 무료인가요?",
    a: "네, 소리담 자체는 무료 플랫폼입니다. 다만 모의고사, 스크립트 생성, 튜터링 등 AI 기능은 OpenAI, Google, Azure 같은 외부 AI API를 사용하기 때문에, 그 원가를 처리하기 위한 크레딧 충전이 필요합니다. 소리담은 이 과정에서 수익을 취하지 않습니다.",
  },
  {
    q: "크레딧은 어떻게 사용되나요?",
    a: "크레딧은 AI 기능을 사용할 때 실제 발생한 외부 API 비용만큼 자동으로 차감됩니다. 예를 들어 스크립트 1개 생성에 약 $0.02, 모의고사 1회 평가에 약 $0.03 정도가 소요됩니다. 사용하지 않으면 차감되지 않으며, 유효기간도 없습니다.",
  },
  {
    q: "크레딧 없이 이용할 수 있는 기능이 있나요?",
    a: "네! 시험후기(기출 빈도 분석, 후기 공유)와 전략 가이드는 크레딧 없이 무료로 이용할 수 있습니다. 또한 모의고사와 스크립트는 체험판으로 1회씩 무료 체험이 가능합니다.",
  },
  {
    q: "모의고사는 어떻게 진행되나요?",
    a: "실제 OPIc 시험과 동일한 환경에서 15문항을 풀게 됩니다. 답변은 음성으로 녹음하면 AI가 자동으로 STT 변환, 발음 평가, 74개 체크박스 판정, 소견 작성, 종합 등급 산출까지 수행합니다. 결과는 종합진단, 세부진단, 문항별 분석, 성장 리포트 4개 탭으로 제공됩니다.",
  },
  {
    q: "스크립트 생성은 어떤 원리인가요?",
    a: "본인의 실제 경험을 입력하면, AI가 OPIc 질문 유형(묘사, 루틴, 경험 등)에 맞는 맞춤 영어 답변을 생성합니다. 원어민 음성 TTS 패키지까지 함께 만들어지므로, 생성된 스크립트로 바로 쉐도잉 훈련을 할 수 있습니다.",
  },
  {
    q: "튜터링은 어떻게 작동하나요?",
    a: "모의고사를 3회 이상 완료하면 튜터링이 활성화됩니다. AI가 최근 모의고사 결과를 분석하여 약점을 진단하고, 부족한 부분에 맞는 드릴 문항을 생성합니다. 드릴을 풀면 즉시 피드백을 받을 수 있어 약점을 집중적으로 훈련할 수 있습니다.",
  },
  {
    q: "환불은 가능한가요?",
    a: "충전 후 7일 이내에 크레딧을 사용하지 않았다면 전액 환불이 가능합니다. 일부 사용한 경우에는 충전 금액에서 사용된 크레딧(실비용)을 차감한 금액을 환불합니다. 자세한 내용은 환불 규정을 참고해주세요.",
  },
  {
    q: "내 음성 데이터는 안전한가요?",
    a: "모든 음성 녹음은 AI 평가 목적으로만 사용되며, 암호화된 스토리지에 안전하게 저장됩니다. 제3자에게 제공되지 않으며, 회원 탈퇴 시 모든 데이터가 삭제됩니다. 자세한 내용은 개인정보처리방침을 참고해주세요.",
  },
  {
    q: "후원은 어떤 의미인가요?",
    a: "소리담은 개발자가 서버 비용을 직접 부담하며 운영하는 프로젝트입니다. 후원금은 서버 유지비와 서비스 개선에 사용되며, 크레딧과는 별개입니다. 커피 한 잔의 후원이 소리담을 지속 가능하게 만드는 데 큰 힘이 됩니다.",
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-400">
        FAQ
      </p>
      <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
        자주 묻는 질문
      </h2>
      <p className="mt-3 text-sm text-gray-400">
        궁금한 점이 있으신가요?
      </p>

      <div className="mx-auto mt-10 max-w-2xl space-y-2 text-left">
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={i}
              className="rounded-xl border border-white/10 bg-white/[0.04] transition-colors hover:bg-white/[0.06]"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <span className="pr-4 text-sm font-medium text-white sm:text-[15px]">
                  {item.q}
                </span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-gray-400 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-4">
                  <p className="text-sm leading-relaxed text-gray-400">
                    {item.a}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
