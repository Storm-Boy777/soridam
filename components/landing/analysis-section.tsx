"use client";

export default function AnalysisSection() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
        <div className="rounded-2xl border-2 border-border bg-surface p-5 shadow-lg sm:rounded-[32px] sm:p-8 md:p-12">
          <div className="mb-8 text-center sm:mb-10">
            <h2 className="mb-3 text-2xl font-bold text-foreground sm:text-3xl">
              <span className="hidden sm:inline">소리담 </span><span className="text-primary-500">모의고사</span>에서 확인하세요.
            </h2>
            <p className="text-sm text-foreground-secondary sm:text-base">
              정확한 진단과 방향을 알려 드려요.
            </p>
          </div>

          <div className="grid items-stretch gap-8 md:grid-cols-2">
            {/* 왼쪽: 터미널 목업 */}
            <div className="flex flex-col rounded-2xl border border-gray-800 bg-gray-950 shadow-2xl">
              <div className="flex items-center gap-2 border-b border-gray-800 px-3.5 py-2.5 sm:px-5 sm:py-3">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 sm:h-3 sm:w-3" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500 sm:h-3 sm:w-3" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500 sm:h-3 sm:w-3" />
                <span className="ml-auto text-[10px] font-medium text-gray-500 sm:text-xs">Soridam Eval Engine</span>
              </div>

              {/* 평가 시작 */}
              <div className="border-b border-gray-800/50 px-3.5 py-3 sm:px-5 sm:py-4">
                <p className="font-mono text-[10px] text-gray-500 sm:text-xs">// Mock test complete</p>
                <p className="mt-1 font-mono text-xs text-white sm:text-sm">
                  &gt; 15 answers submitted
                </p>
                <p className="font-mono text-xs text-green-400 sm:text-sm">
                  &gt; Starting evaluation pipeline...
                </p>
              </div>

              {/* Stage A */}
              <div className="border-b border-gray-800/50 px-3.5 py-2.5 sm:px-5 sm:py-3">
                <p className="font-mono text-[10px] text-gray-500 sm:text-xs">Stage A — Speech Analysis</p>
                <div className="mt-1 space-y-0.5 font-mono text-xs sm:text-sm">
                  <p className="text-green-400">&gt; Whisper STT <span className="text-white">Transcribed</span></p>
                  <p className="text-green-400">&gt; Azure Speech <span className="text-blue-300">Pronunciation scored</span></p>
                  <p className="text-green-400">&gt; Skip detector <span className="text-white">3-layer check passed</span></p>
                </div>
              </div>

              {/* Stage B */}
              <div className="border-b border-gray-800/50 px-3.5 py-2.5 sm:px-5 sm:py-3">
                <p className="font-mono text-[10px] text-gray-500 sm:text-xs">Stage B — AI Evaluation</p>
                <div className="mt-1 space-y-0.5 font-mono text-xs sm:text-sm">
                  <p className="text-green-400">&gt; GPT-4.1 <span className="text-white">Checkbox evaluation</span></p>
                  <p className="text-green-400">&gt; GPT-4.1 <span className="text-white">Consult &amp; weakness generated</span></p>
                </div>
              </div>

              {/* Stage C */}
              <div className="border-b border-gray-800/50 px-3.5 py-2.5 sm:px-5 sm:py-3">
                <p className="font-mono text-[10px] text-gray-500 sm:text-xs">Stage C — Grade Calculation</p>
                <div className="mt-1 space-y-0.5 font-mono text-xs sm:text-sm">
                  <p className="text-green-400">&gt; 7-Step Rule Engine <span className="text-yellow-300">Grade determined</span></p>
                  <p className="text-green-400">&gt; F.A.C.T Score <span className="text-yellow-300">Complete</span></p>
                </div>
              </div>

              {/* 결과 */}
              <div className="px-3.5 py-3 sm:px-5 sm:py-4">
                <p className="font-mono text-[10px] text-gray-500 sm:text-xs">Result</p>
                <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
                  {["Overview", "Diagnosis", "Per Q", "Growth"].map((tab) => (
                    <span
                      key={tab}
                      className="rounded-md border border-gray-700 bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-300 sm:px-2.5 sm:py-1 sm:text-xs"
                    >
                      {tab}
                    </span>
                  ))}
                </div>
                <p className="mt-2 font-mono text-xs text-green-400 sm:text-sm">
                  &gt; Coaching report <span className="text-white">Done.</span>
                </p>
              </div>
            </div>

            {/* 오른쪽: 소리담 모의고사 소개 */}
            <div className="flex flex-col justify-between">
              <div className="text-center">
                <h3 className="text-lg font-bold text-foreground sm:text-xl">
                  실전과 동일한 모의고사 평가
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-foreground-secondary sm:text-sm">
                  실제 OPIc 채점관의 평가 방식을 그대로 적용했습니다.
                </p>
              </div>

              <div className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
                {/* 발화 분석 목업 */}
                <div className="rounded-xl border border-border bg-surface-secondary p-4">
                  <p className="text-xs font-bold text-foreground-muted">발화 분석 (Speech)</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-surface p-2">
                      <p className="text-lg font-extrabold text-foreground">105</p>
                      <p className="text-[10px] text-foreground-muted">WPM</p>
                    </div>
                    <div className="rounded-lg bg-surface p-2">
                      <p className="text-lg font-extrabold text-foreground">187</p>
                      <p className="text-[10px] text-foreground-muted">단어</p>
                    </div>
                    <div className="rounded-lg bg-surface p-2">
                      <p className="text-lg font-extrabold text-accent-500">8</p>
                      <p className="text-[10px] text-foreground-muted">필러</p>
                    </div>
                  </div>
                </div>

                {/* 발음 분석 목업 */}
                <div className="rounded-xl border border-border bg-surface-secondary p-4">
                  <p className="text-xs font-bold text-foreground-muted">발음 분석 (Pronunciation)</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-surface p-2">
                      <p className="text-lg font-extrabold text-primary-500">84</p>
                      <p className="text-[10px] text-foreground-muted">정확도</p>
                    </div>
                    <div className="rounded-lg bg-surface p-2">
                      <p className="text-lg font-extrabold text-primary-500">96</p>
                      <p className="text-[10px] text-foreground-muted">유창성</p>
                    </div>
                    <div className="rounded-lg bg-surface p-2">
                      <p className="text-lg font-extrabold text-primary-500">83</p>
                      <p className="text-[10px] text-foreground-muted">운율</p>
                    </div>
                  </div>
                </div>

                {/* 체크박스 평가 목업 */}
                <div className="rounded-xl border border-border bg-surface-secondary p-4">
                  <p className="text-xs font-bold text-foreground-muted">유형별 통과율</p>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-foreground-secondary">기초평가</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border sm:w-24">
                          <div className="h-full w-[89%] rounded-full bg-emerald-500" />
                        </div>
                        <span className="text-xs font-bold text-emerald-600">89%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-foreground-secondary">심화평가</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border sm:w-24">
                          <div className="h-full w-[63%] rounded-full bg-amber-500" />
                        </div>
                        <span className="text-xs font-bold text-amber-600">63%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-foreground-secondary">고급평가</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border sm:w-24">
                          <div className="h-full w-[50%] rounded-full bg-red-500" />
                        </div>
                        <span className="text-xs font-bold text-red-500">50%</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="mt-5 rounded-lg bg-primary-50 px-4 py-3 text-center">
                <p className="text-sm font-bold text-primary-700">
                  문제점을 진단하고, 개선점을 찾아 훈련하세요.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
