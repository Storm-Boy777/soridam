"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

export default function PhilosophySection() {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <section className="text-center">
      {/* ① 제목 */}
      <h2 className="text-3xl font-bold tracking-tight">
        AI 크레딧 충전
      </h2>
      <p className="mt-4 text-[15px] text-gray-400">
        사용한 만큼만, 원가 그대로.
      </p>

      {/* ② 크레딧 3개 카드 */}
      <div className="mx-auto mt-10 grid max-w-3xl gap-5 sm:grid-cols-3">
        {/* 크레딧 충전 (1회성) */}
        <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-center">
          <p className="text-sm font-bold text-primary-400">크레딧 충전</p>
          <p className="mt-1 text-[10px] text-gray-500">1회 결제</p>
          <div className="mt-3">
            <span className="text-3xl font-extrabold">$10</span>
          </div>
          <div className="mt-5 space-y-2 text-xs text-gray-300">
            <p><span className="text-primary-400">✓</span> 크레딧 $10 충전</p>
            <p><span className="text-primary-400">✓</span> 사용량에 따라 차감</p>
            <p><span className="text-primary-400">✓</span> 모의고사 · 스크립트 · 튜터링</p>
          </div>
          <Link
            href="/store"
            className="mt-6 w-full rounded-xl bg-primary-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-600"
          >
            충전하기
          </Link>
        </div>

        {/* 충전 + 후원 (1회성) */}
        <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-center">
          <p className="text-sm font-bold text-secondary-400">충전 + 후원</p>
          <p className="mt-1 text-[10px] text-gray-500">1회 결제</p>
          <div className="mt-3">
            <span className="text-3xl font-extrabold">$15</span>
          </div>
          <div className="mt-5 space-y-2 text-xs text-gray-300">
            <p><span className="text-secondary-400">✓</span> 크레딧 $10 충전</p>
            <p><span className="text-secondary-400">✓</span> 서버 후원 $5 포함</p>
            <p><span className="text-secondary-400">✓</span> 소리담을 지속가능하게</p>
          </div>
          <Link
            href="/store"
            className="mt-6 w-full rounded-xl bg-secondary-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-secondary-600"
          >
            충전 + 후원하기
          </Link>
        </div>

        {/* 정기 후원 (매월) */}
        <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-center">
          <p className="text-sm font-bold text-accent-400">정기 후원</p>
          <p className="mt-1 text-[10px] text-gray-500">매월 자동 결제</p>
          <div className="mt-3">
            <span className="text-3xl font-extrabold">$5</span>
            <span className="ml-1 text-sm text-gray-400">/월</span>
          </div>
          <div className="mt-5 space-y-2 text-xs text-gray-300">
            <p><span className="text-accent-400">✓</span> 크레딧 미포함</p>
            <p><span className="text-accent-400">✓</span> 언제든 해지 가능</p>
            <p><span className="text-accent-400">✓</span> 서버운영비 후원</p>
          </div>
          <Link
            href="/store"
            className="mt-6 w-full rounded-xl bg-accent-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-600"
          >
            후원하기
          </Link>
        </div>
      </div>

      {/* ③ OUR PHILOSOPHY */}
      <div className="mx-auto mt-16 max-w-3xl border-t border-white/10 pt-16">
        <p className="text-xs font-medium tracking-[0.2em] text-gray-500">OUR PHILOSOPHY</p>
        <h3 className="mt-3 text-lg font-bold leading-snug text-white sm:text-xl">
          소리담은 &ldquo;<span className="text-primary-400">무료 플랫폼</span>&rdquo; 입니다.
        </h3>

        {/* 질문 */}
        <p className="mt-8 text-sm text-gray-500">무료인데 왜 충전이 필요할까요?</p>

        {/* 스토리 */}
        <div className="mt-6 space-y-6 text-sm leading-[2] text-gray-400">
          <p>
            여러분의 답변을 분석하고, 맞춤 스크립트를 완성해 주는 건
            <br />
            <span className="text-primary-400">OpenAI, Google, Azure</span> 같은 첨단 AI 기술입니다.
            <br />
            이 친구들은 일을 참 잘하지만... <span className="text-white font-medium">공짜로 일하진 않습니다.</span> <span className="text-gray-600">:)</span>
          </p>

          <p>
            이전에는 이용자가 <span className="text-red-400">직접 복잡하게 API 키를 등록</span>하거나,
            <br />
            <span className="text-accent-400">&lsquo;월 5달러&rsquo; 후원으로 무제한 이용</span>할 수 있도록 열어두었습니다.
            <br />
            사실 상징적인 후원금만으로는 부족해,
            <br />
            개발자가 API 비용을 조금씩 더 안고 가야 하는 구조였습니다.
          </p>

          <p>
            하지만 괜찮았습니다.
            <br />
            <span className="text-white font-medium">&ldquo;소리담 덕분에 정말 큰 도움이 되었어요.&rdquo;</span>
            <br />
            이 한마디면 즐거움의 <span className="text-yellow-400">&ldquo;배움비용&rdquo;</span>이였습니다. <span className="text-gray-500">☕</span>
          </p>

          <p>
            그래서 이제는 복잡한 API 등록+개별충전 방식 대신,
            <br />
            <span className="text-primary-400 font-bold">&lsquo;크레딧 충전&rsquo;</span> 한 번에 모든 기능을 사용할 수 있게 하였습니다.
          </p>
        </div>

        {/* 결론 */}
        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4">
          <p className="text-sm leading-[1.9] text-gray-400">
            크레딧은 소리담 이용료가 아닙니다.
            <br />
            AI 기능을 사용할 때 발생하는 외부 API 원가를,
            <br />
            간편하게 처리할 수 있도록 만든
            {" "}<span className="text-primary-400 font-medium">이용 수단</span>입니다.
          </p>
        </div>
      </div>

      {/* ④ 토글: 사용하는 AI 상세 */}
      <div className="mx-auto mt-5 max-w-2xl">
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="mx-auto flex items-center gap-1.5 text-sm font-bold text-gray-500 transition-colors hover:text-gray-300"
        >
          사용하는 AI 상세 보기
          <ChevronDown className={`h-4 w-4 transition-transform ${showDetail ? "rotate-180" : ""}`} />
        </button>

        {showDetail && (
          <div className="mt-6 space-y-4">
            {/* 단가표 */}
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
              <div className="border-b border-white/10 px-4 py-3 sm:px-5">
                <p className="text-xs font-bold text-gray-400">AI 사용 모델 및 서비스 원가</p>
              </div>
              <div className="divide-y divide-white/5 text-xs">
                {[
                  { service: "GPT-4.1", cost: "$2.00 / $8.00 per 1M tokens" },
                  { service: "GPT-4.1 Mini", cost: "$0.40 / $1.60 per 1M tokens" },
                  { service: "Whisper", cost: "$0.006 / 분" },
                  { service: "Gemini TTS", cost: "$1.00 / $20.00 per 1M tokens" },
                  { service: "Azure Speech", cost: "$1.32 / 시간" },
                ].map((item) => (
                  <div key={item.service} className="flex items-center justify-between px-4 py-2.5 sm:px-5">
                    <span className="font-medium text-white">{item.service}</span>
                    <span className="text-right font-mono text-[10px] text-gray-400 sm:text-xs">{item.cost}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 호출 수 — 모바일 가로스크롤 */}
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
              <div className="border-b border-white/10 px-4 py-3 sm:px-5">
                <p className="text-xs font-bold text-gray-400">기능별 API 호출 수</p>
              </div>
              <div className="overflow-x-auto max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden">
                <div className="min-w-[480px]">
                  <div className="flex items-center border-b border-white/10 px-4 py-2 text-[10px] text-gray-500 sm:px-5">
                    <span className="w-28 shrink-0 sm:w-32" />
                    <div className="flex flex-1 justify-between">
                      <span className="w-12 text-center">GPT</span>
                      <span className="w-12 text-center">Whisper</span>
                      <span className="w-12 text-center">TTS</span>
                      <span className="w-12 text-center">Azure</span>
                    </div>
                    <span className="w-10 shrink-0 text-right">합계</span>
                  </div>
                  <div className="divide-y divide-white/5 text-xs">
                    {[
                      { feature: "스크립트 생성", gpt: "2회", whisper: "-", tts: "-", azure: "-", total: "2" },
                      { feature: "스크립트 교정", gpt: "2회", whisper: "-", tts: "-", azure: "-", total: "2" },
                      { feature: "TTS 패키지", gpt: "-", whisper: "1회", tts: "1회", azure: "-", total: "2" },
                      { feature: "쉐도잉 평가", gpt: "1회", whisper: "1회", tts: "-", azure: "-", total: "2" },
                      { feature: "모의고사 (15문항)", gpt: "~19회", whisper: "15회", tts: "-", azure: "15회", total: "~49" },
                      { feature: "튜터링 진단", gpt: "2회", whisper: "-", tts: "-", azure: "-", total: "2" },
                      { feature: "튜터링 드릴", gpt: "1~2회", whisper: "1회", tts: "-", azure: "-", total: "2~3" },
                    ].map((item) => (
                      <div key={item.feature} className="flex items-center px-4 py-2.5 sm:px-5">
                        <span className="w-28 shrink-0 font-medium text-white sm:w-32">{item.feature}</span>
                        <div className="flex flex-1 justify-between text-gray-500">
                          <span className="w-12 text-center">{item.gpt}</span>
                          <span className="w-12 text-center">{item.whisper}</span>
                          <span className="w-12 text-center">{item.tts}</span>
                          <span className="w-12 text-center">{item.azure}</span>
                        </div>
                        <span className="w-10 shrink-0 text-right font-mono font-bold text-primary-400">{item.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ⑤ 비교표 — 모바일 가로스크롤 */}
      <div className="mx-auto mt-10 max-w-3xl">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-xs font-bold text-gray-400">뭐가 달라졌나요?</p>
          </div>
          <div className="overflow-x-auto max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden">
            <div className="min-w-[420px]">
              <div className="grid grid-cols-3 text-xs">
                <div className="border-b border-r border-white/10 px-3 py-3" />
                <div className="border-b border-r border-white/10 px-3 py-3 text-center font-bold text-gray-500">이전</div>
                <div className="border-b border-white/10 px-3 py-3 text-center font-bold text-primary-400">지금</div>

                <div className="border-b border-r border-white/10 px-3 py-2.5 font-medium text-white">시작하려면</div>
                <div className="border-b border-r border-white/10 px-3 py-2.5 text-center text-gray-500">AI 서비스 3개 가입 + API 키 등록 + 충전</div>
                <div className="border-b border-white/10 px-3 py-2.5 text-center text-primary-400">크레딧 충전만 하면 끝</div>

                <div className="border-b border-r border-white/10 px-3 py-2.5 font-medium text-white">결과</div>
                <div className="border-b border-r border-white/10 px-3 py-2.5 text-center text-red-400">대부분 포기</div>
                <div className="border-b border-white/10 px-3 py-2.5 text-center text-emerald-400">누구나 바로 사용</div>

                <div className="border-b border-r border-white/10 px-3 py-2.5 font-medium text-white">유효기간</div>
                <div className="border-b border-r border-white/10 px-3 py-2.5 text-center text-gray-500">없음</div>
                <div className="border-b border-white/10 px-3 py-2.5 text-center text-gray-500">없음 (동일)</div>

                <div className="border-r border-white/10 px-3 py-2.5 font-medium text-white">소리담 수익</div>
                <div className="border-r border-white/10 px-3 py-2.5 text-center text-gray-500">없음</div>
                <div className="px-3 py-2.5 text-center text-gray-500">없음 (동일)</div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-sm leading-relaxed text-gray-400">
          크레딧은 복잡한 API 설정을 소리담이 대신 처리하여,
          누구나 쉽게 AI 서비스를 이용할 수 있도록 개선하였습니다.
          <br />
          <strong className="text-white">소리담은 이 과정에서 수익을 취하지 않습니다.</strong>
        </p>
      </div>

      {/* ⑥ 하단 */}
      <p className="mt-10 text-sm text-gray-500">
        <span className="text-white">서버 유지비는 <span className="text-accent-400">후원</span>과 <span className="text-yellow-400">개발자 자비</span>로 운영됩니다.</span>
        <br />
        <span className="mt-2 inline-block text-xs text-gray-500">☕ 커피 한 잔의 후원이 소리담을 유지하는 데 큰 힘이 됩니다.</span>
      </p>
    </section>
  );
}
