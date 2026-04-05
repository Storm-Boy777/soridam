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
        {/* 크레딧 충전 */}
        <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-center">
          <p className="text-sm font-bold text-primary-400">크레딧 충전</p>
          <div className="mt-4">
            <span className="text-3xl font-extrabold">10,000</span>
            <span className="ml-1 text-sm text-gray-400">원</span>
          </div>
          <div className="mt-5 space-y-2 text-xs text-gray-300">
            <p><span className="text-primary-400">✓</span> 크레딧 10,000원분</p>
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

        {/* 충전 + 후원 */}
        <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-center">
          <p className="text-sm font-bold text-secondary-400">충전 + 후원</p>
          <div className="mt-4">
            <span className="text-3xl font-extrabold">15,000</span>
            <span className="ml-1 text-sm text-gray-400">원</span>
          </div>
          <div className="mt-5 space-y-2 text-xs text-gray-300">
            <p><span className="text-secondary-400">✓</span> 크레딧 10,000원분</p>
            <p><span className="text-secondary-400">✓</span> 서버 후원 5,000원 포함</p>
            <p><span className="text-secondary-400">✓</span> 소리담을 지속가능하게</p>
          </div>
          <Link
            href="/store"
            className="mt-6 w-full rounded-xl bg-secondary-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-secondary-600"
          >
            충전 + 후원하기
          </Link>
        </div>

        {/* 후원만 */}
        <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-center">
          <p className="text-sm font-bold text-accent-400">후원</p>
          <div className="mt-4">
            <span className="text-3xl font-extrabold">5,000</span>
            <span className="ml-1 text-sm text-gray-400">원</span>
          </div>
          <div className="mt-5 space-y-2 text-xs text-gray-300">
            <p><span className="text-accent-400">✓</span> 크레딧 미포함</p>
            <p><span className="text-accent-400">✓</span> 소리담을 지속가능하게</p>
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

      {/* ③ 왜 크레딧인가요? */}
      <div className="mx-auto mt-14 max-w-3xl">
        <h3 className="text-lg font-bold">왜 크레딧인가요?</h3>
        <p className="mt-3 text-sm text-gray-400">
          소리담은 <span className="text-primary-400">AI를 활용하여 분석·평가·생성을 수행</span>합니다.
          <br />
          이 과정에서 외부 AI 서비스 호출 비용이 발생하며, 크레딧은 여기에 사용이 됩니다.
        </p>
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
            <p className="text-xs font-bold text-gray-400">기존 방식 (~2026.04) vs 크레딧 방식</p>
          </div>
          <div className="overflow-x-auto max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden">
            <div className="min-w-[480px]">
              <div className="grid grid-cols-4 text-xs">
                <div className="border-b border-r border-white/10 px-3 py-3" />
                <div className="border-b border-r border-white/10 px-3 py-3 text-center font-bold text-gray-500">기존</div>
                <div className="border-b border-r border-white/10 px-3 py-3 text-center font-bold text-primary-400">크레딧</div>
                <div className="border-b border-white/10 px-3 py-3 text-center font-bold text-emerald-400">비고</div>

                <div className="flex items-center justify-center border-b border-r border-white/10 px-3 py-2.5 text-center font-medium text-white"><span>API 키 등록<br /><span className="text-[10px] text-gray-500">OpenAI · Gemini · Azure</span></span></div>
                <div className="flex items-center justify-center border-b border-r border-white/10 px-3 py-2.5 text-center text-gray-500">3개 직접 등록</div>
                <div className="flex items-center justify-center border-b border-r border-white/10 px-3 py-2.5 text-center text-primary-400">필요 없음</div>
                <div className="flex items-center justify-center border-b border-white/10 px-3 py-2.5 text-center text-emerald-400">설정 없이 바로 사용</div>

                <div className="border-b border-r border-white/10 px-3 py-2.5 font-medium text-white">충전</div>
                <div className="border-b border-r border-white/10 px-3 py-2.5 text-center text-gray-500">API별 개별 충전</div>
                <div className="border-b border-r border-white/10 px-3 py-2.5 text-center text-primary-400">1회 통합 충전</div>
                <div className="border-b border-white/10 px-3 py-2.5 text-center text-emerald-400">한 번에 끝</div>

                <div className="border-b border-r border-white/10 px-3 py-2.5 font-medium text-white">실사용률</div>
                <div className="border-b border-r border-white/10 px-3 py-2.5 text-center text-red-400">5% 미만</div>
                <div className="border-b border-r border-white/10 px-3 py-2.5 text-center text-primary-400">누구나</div>
                <div className="border-b border-white/10 px-3 py-2.5 text-center text-emerald-400">진입장벽 제거</div>

                <div className="border-b border-r border-white/10 px-3 py-2.5 font-medium text-white">기간만료</div>
                <div className="border-b border-r border-white/10 px-3 py-2.5 text-center text-gray-500">없음</div>
                <div className="border-b border-r border-white/10 px-3 py-2.5 text-center text-primary-400">← 동일</div>
                <div className="border-b border-white/10 px-3 py-2.5 text-center text-emerald-400">만료 없이 사용</div>

                <div className="border-r border-white/10 px-3 py-2.5 font-medium text-white">소리담 수익</div>
                <div className="border-r border-white/10 px-3 py-2.5 text-center text-gray-500">없음</div>
                <div className="border-r border-white/10 px-3 py-2.5 text-center text-primary-400">← 동일</div>
                <div className="px-3 py-2.5 text-center text-emerald-400">비영리 운영</div>
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
