"use client";

export default function HeroSection() {
  return (
    <header className="mb-10 text-center sm:mb-12 md:mb-16">
      <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
        OPIc! 또, <span className="text-red-500">시험만</span> 치실 건가요?
        <br />
        <span className="text-[1.4rem] text-gray-400 sm:text-3xl md:text-4xl">
          뭐가 부족한지도 모른 채.
        </span>
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-relaxed text-gray-400 sm:mt-6 sm:text-xl">
        이번엔 되겠지, 한 번만 더... 그렇게 몇 번째인가요?
        <br />
        당신의 실력이 부족한 게 아닙니다.
        <br />
        <strong className="text-white">전략이 없었을 뿐입니다.</strong>
      </p>
    </header>
  );
}
