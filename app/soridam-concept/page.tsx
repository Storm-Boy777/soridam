import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  BookOpenText,
  Brain,
  Headphones,
  Mic2,
  NotebookPen,
  Radio,
  Sparkles,
} from "lucide-react";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: { absolute: "새 소리담 컨셉 | 소리담" },
  description:
    "소리담 기능을 유지하면서 새로운 브랜드 무드로 재구성한 소리담 컨셉 시안입니다.",
};

const pillars = [
  {
    label: "브랜드 태도",
    title: "과하게 응원하지 않는 친절함",
    description:
      "억지 동기부여 대신, 내 말 습관을 조용히 읽어주고 다음 문장을 정리해 주는 태도를 핵심으로 둡니다.",
  },
  {
    label: "화면 인상",
    title: "시험 앱보다 목소리 스튜디오",
    description:
      "녹음 콘솔, 에디토리얼 노트, 아카이브 보드를 섞어서 보기만 해도 브랜드 감도가 보이게 만듭니다.",
  },
  {
    label: "기능 연결",
    title: "소리담 엔진 그대로 사용",
    description:
      "후기, 스크립트, 모의고사, 튜터링 기능은 유지하고, 프론트 경험만 새 소리담의 언어로 완전히 바꿉니다.",
  },
];

const modules = [
  {
    kicker: "Archive Room",
    title: "후기 아카이브",
    description:
      "기출 후기와 빈도 데이터를 게시판이 아니라 리서치 월처럼 보여줍니다. 정보가 많아도 정리된 인상을 유지합니다.",
    icon: BookOpenText,
  },
  {
    kicker: "Script Atelier",
    title: "스크립트 아틀리에",
    description:
      "스크립트 생성 결과를 메모, 첨삭 흔적, 강조 문장 중심으로 배치해 진짜 작업물을 다듬는 느낌을 살립니다.",
    icon: NotebookPen,
  },
  {
    kicker: "Mock Room",
    title: "모의고사 룸",
    description:
      "타이머와 결과 요약을 시험장보다 녹음실 콘솔에 가깝게 재배치해 집중감을 만들고 긴장감은 줄입니다.",
    icon: Mic2,
  },
  {
    kicker: "Coaching Lab",
    title: "튜터링 랩",
    description:
      "처방과 드릴을 의학적 진단보다 부드러운 프로토콜 카드로 표현해 부담 없는 교정 경험을 만듭니다.",
    icon: Brain,
  },
];

const signalHeights = [20, 34, 18, 46, 30, 58, 28, 48, 22, 54, 26, 40, 18];
const archiveBars = [78, 62, 90, 54, 72, 48, 84];
const palette = [
  { name: "Ink Navy", hex: "#101b24" },
  { name: "Paper Sand", hex: "#f7eee6" },
  { name: "Coral Mark", hex: "#e0774f" },
  { name: "Signal Gold", hex: "#f1cf9c" },
  { name: "Teal Echo", hex: "#73afa9" },
  { name: "Graphite", hex: "#23323c" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#c6baab]">
      <span className={styles.labelLine} />
      {children}
    </div>
  );
}

export default function SoridamConceptPage() {
  return (
    <main className={`${styles.shell} text-[#f7eee5]`}>
      <div className="relative mx-auto max-w-[1520px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[160px_minmax(0,1fr)]">
          <aside className={`${styles.rail} hidden xl:flex`}>
            <div className="space-y-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/6 text-[#f1cf9c]">
                <AudioLines className="h-6 w-6" />
              </div>
              <div>
                <p className="font-serif text-[1.85rem] tracking-[0.04em] text-[#fff7ee]">
                  soridam
                </p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-[#94a7ac]">
                  voice studio
                </p>
              </div>
            </div>

            <div className="space-y-5 text-xs text-[#a8b2b4]">
              <p className="[writing-mode:vertical-rl] tracking-[0.28em]">
                new concept board
              </p>
              <div className="space-y-2">
                <p>소리담 기능 유지</p>
                <p>새 브랜드 무드 구축</p>
                <p>프론트 경험 전면 재해석</p>
              </div>
            </div>
          </aside>

          <div className="relative py-5 sm:py-7 lg:py-8">
            <header className={`mb-8 rounded-full px-5 py-4 sm:px-6 ${styles.glass}`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[#96a8ac]">
                    soridam concept
                  </p>
                  <p className="mt-1 text-sm text-[#d9d0c4]">
                    소리담의 기능은 그대로, 새 소리담의 인상만 다시 설계
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs text-[#e9dfd2]">
                    에디토리얼
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs text-[#e9dfd2]">
                    오디오 모티프
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs text-[#e9dfd2]">
                    아날로그 기록물
                  </span>
                </div>
              </div>
            </header>

            <section className="grid gap-6 lg:grid-cols-[0.94fr_1.06fr] lg:items-center">
              <div className="max-w-[720px] pt-2">
                <SectionLabel>new brand direction</SectionLabel>
                <h1 className="max-w-[12ch] font-serif text-[3.1rem] leading-[0.92] tracking-[-0.05em] text-[#fff7ee] sm:text-[4.4rem] lg:text-[5.8rem]">
                  말을 밀어붙이는 앱이 아니라
                  <br />
                  목소리를 정리하는
                  <br />
                  새 소리담
                </h1>

                <p className="mt-6 max-w-[58ch] text-[1.02rem] leading-8 text-[#cfc5b8] sm:text-[1.08rem]">
                  이번 시안은 대시보드처럼 보이는 화면을 만드는 게 아니라, 새
                  브랜드가 어떤 감도로 사용자 앞에 나타나야 하는지 먼저 잡는
                  컨셉 보드입니다. 시험 준비 서비스보다 기록실, 작업대, 녹음실에
                  가까운 인상을 목표로 했습니다.
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <Link
                    href="#scene-board"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f3e5d3] px-6 py-3.5 text-sm font-semibold text-[#14232d] transition hover:bg-[#fff6ec]"
                  >
                    대표 장면 보기
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="#module-scenes"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/6 px-6 py-3.5 text-sm font-medium text-[#efe4d7] transition hover:bg-white/10"
                  >
                    모듈 톤 보기
                    <Sparkles className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-10 grid gap-3 sm:grid-cols-3">
                  {[
                    ["인상", "차분하지만 선명하게"],
                    ["비유", "시험 앱보다 목소리 스튜디오"],
                    ["원칙", "기능은 유지하고 감도만 교체"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className={`rounded-[1.4rem] px-4 py-4 ${styles.glass}`}
                    >
                      <p className="text-xs uppercase tracking-[0.18em] text-[#95a7ac]">
                        {label}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-[#f4eadf]">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className={`${styles.heroStage} ${styles.glass} p-4 sm:p-5`}>
                <div className={`${styles.heroOrb} mx-auto mt-16`}>
                  <div className={styles.heroOrbInner}>
                    <p className="text-[11px] uppercase tracking-[0.34em] text-[#8ca3a8]">
                      voice, not score
                    </p>
                    <p className="font-serif text-[3.15rem] leading-none tracking-[-0.06em] text-[#fff7ee] sm:text-[3.8rem]">
                      soridam
                    </p>
                    <p className="max-w-[24ch] text-sm leading-7 text-[#c5bbaf]">
                      말문을 억지로 밀지 않고, 내 목소리의 결을 정리해 주는
                      공부 경험
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[#f0d7b1]">
                      <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5">
                        archive
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5">
                        studio
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5">
                        console
                      </span>
                    </div>
                  </div>
                </div>

                <div className={`${styles.floatNote} rounded-[1.6rem] p-4 text-[#1d2b34] ${styles.paper}`}>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-[#8a6f58]">
                    concept note
                  </p>
                  <p className="mt-3 font-serif text-[1.8rem] leading-tight tracking-[-0.05em]">
                    합격 광고보다
                    <br />
                    기록물 같은 신뢰감
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[#53616a]">
                    종이, 잉크, 파형, 코럴 마킹 같은 디테일을 계속 반복해서
                    브랜드 인상을 만들어요.
                  </p>
                </div>

                <div className={`${styles.consoleCard} rounded-[1.6rem] p-4 ${styles.ink}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.28em] text-[#8ca3a8]">
                        live console
                      </p>
                      <p className="mt-2 font-serif text-[1.7rem] tracking-[-0.05em] text-[#fff7ee]">
                        steady flow
                      </p>
                    </div>
                    <Radio className="h-5 w-5 text-[#73afa9]" />
                  </div>
                  <div className="mt-5 space-y-3">
                    {[
                      ["발화 개방도", "78%"],
                      ["질문 청취 안정감", "High"],
                      ["후속 문장 확장", "+1 needed"],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3"
                      >
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[#8ca3a8]">
                          {label}
                        </p>
                        <p className="mt-2 text-sm text-[#f4eadf]">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className={`${styles.cornerChip} rounded-full border border-white/10 bg-[#f1cf9c]/14 px-4 py-2 text-xs uppercase tracking-[0.26em] text-[#f3dfbe]`}
                >
                  ih flow
                </div>

                <div className={styles.signalTape}>
                  <div className="relative z-[1]">
                    <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-[#89a0a6]">
                      <span>voice signal</span>
                      <span>today</span>
                    </div>
                    <div className={styles.signalBars}>
                      {signalHeights.map((height, index) => (
                        <span
                          key={`${height}-${index}`}
                          style={{
                            height: `${height}px`,
                            background:
                              index % 3 === 0
                                ? "#e0774f"
                                : index % 3 === 1
                                  ? "#f1cf9c"
                                  : "#73afa9",
                            opacity: 0.78 + index * 0.01,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-18 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
              <article className={`rounded-[2rem] p-6 text-[#1d2b34] sm:p-7 ${styles.paper}`}>
                <SectionLabel>design dna</SectionLabel>
                <h2 className="font-serif text-[2.45rem] leading-tight tracking-[-0.05em] text-[#16252f]">
                  새 소리담은
                  <br />
                  기능 설명보다
                  <br />
                  공기의 밀도를 먼저 만듭니다.
                </h2>
                <p className="mt-5 max-w-[55ch] text-sm leading-7 text-[#55626b]">
                  첫 화면에서 바로 느껴져야 하는 건 “열심히 하세요”가 아니라
                  “여기서는 내 말 습관을 잘 읽어주겠구나”라는 감정입니다. 그래서
                  UI를 카드 모음이 아니라 촬영 세트처럼 구성했습니다.
                </p>

                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {palette.map((item) => (
                    <div key={item.name} className="rounded-[1.2rem] border border-black/5 bg-white/50 p-3">
                      <div
                        className={`${styles.swatch} h-20 w-full`}
                        style={{ backgroundColor: item.hex }}
                      />
                      <p className="mt-3 text-sm font-medium text-[#24333d]">{item.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#7f8c92]">
                        {item.hex}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <div className="grid gap-4">
                {pillars.map((pillar, index) => (
                  <article
                    key={pillar.label}
                    className={`${styles.glass} rounded-[1.75rem] px-5 py-5 sm:px-6 ${
                      index === 1 ? styles.boardGlow : ""
                    }`}
                  >
                    <p className="text-[11px] uppercase tracking-[0.28em] text-[#95a7ac]">
                      {pillar.label}
                    </p>
                    <h3 className="mt-3 font-serif text-[2rem] leading-tight tracking-[-0.05em] text-[#fff7ee]">
                      {pillar.title}
                    </h3>
                    <p className="mt-4 max-w-[56ch] text-sm leading-7 text-[#c8beb2]">
                      {pillar.description}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section id="scene-board" className="mt-18">
              <article className={`rounded-[2.1rem] p-5 sm:p-6 ${styles.glass}`}>
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <SectionLabel>hero scene board</SectionLabel>
                    <h2 className="font-serif text-[2.3rem] tracking-[-0.05em] text-[#fff7ee] sm:text-[2.9rem]">
                      대표 장면은
                      <br />
                      “아카이브 + 작업대 + 콘솔”의 혼합입니다.
                    </h2>
                  </div>
                  <p className="max-w-[40ch] text-sm leading-7 text-[#c8beb2]">
                    한 화면 안에 후기 리서치, 스크립트 작업, 모의고사 결과, 튜터링
                    연결이 동시에 보이되 조잡하지 않게 정리된 밀도를 목표로 했어요.
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-[0.96fr_1.04fr]">
                  <div className={`rounded-[1.8rem] p-5 ${styles.sceneCard} ${styles.sceneCardDark}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.28em] text-[#8fa3a8]">
                          archive board
                        </p>
                        <p className="mt-2 font-serif text-[2rem] tracking-[-0.05em] text-[#fff7ee]">
                          후기 아카이브 룸
                        </p>
                      </div>
                      <BookOpenText className="h-5 w-5 text-[#f1cf9c]" />
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_0.92fr]">
                      <div className="space-y-3">
                        {[
                          "자기소개 - 집 - 롤플레이 조합이 이번 주 최다 등장",
                          "경험형 후속 질문이 IH 구간에서 가장 큰 분기점",
                          "최근 25일 데이터 기준 반복 빈도 상승",
                        ].map((item, index) => (
                          <div
                            key={item}
                            className="rounded-[1.2rem] border border-white/8 bg-white/5 px-4 py-3"
                          >
                            <p className="text-[11px] uppercase tracking-[0.2em] text-[#8ca3a8]">
                              note {index + 1}
                            </p>
                            <p className="mt-2 text-sm leading-7 text-[#f1e7da]">{item}</p>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-[1.45rem] border border-white/8 bg-white/5 p-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-[#8ca3a8]">
                          frequency wall
                        </p>
                        <div className="mt-5 flex h-[180px] items-end gap-2">
                          {archiveBars.map((value, index) => (
                            <span
                              key={`${value}-${index}`}
                              className="flex-1 rounded-t-[16px]"
                              style={{
                                height: `${value}%`,
                                background:
                                  index % 2 === 0
                                    ? "linear-gradient(180deg, #e0774f, #8a3f22)"
                                    : "linear-gradient(180deg, #73afa9, #335c59)",
                              }}
                            />
                          ))}
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-[#b7afa4]">
                          <span>경험형</span>
                          <span>루틴형</span>
                          <span>롤플레이</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className={`rounded-[1.8rem] p-5 text-[#1b2933] ${styles.sceneCard} ${styles.sceneCardPaper}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.28em] text-[#866d58]">
                            script atelier
                          </p>
                          <p className="mt-2 font-serif text-[2rem] tracking-[-0.05em] text-[#16252f]">
                            스크립트는 문장이 아니라 재료처럼
                          </p>
                        </div>
                        <NotebookPen className="h-5 w-5 text-[#e0774f]" />
                      </div>

                      <div className={`mt-5 rounded-[1.45rem] border border-black/6 px-4 py-4 ${styles.paperLines}`}>
                        <p className="text-sm leading-8 text-[#31404a]">
                          “쉬는 날에는 집에서 커피를 내려 마시고, 천천히 정리를 해요.”
                          <span className="rounded-full bg-[#e0774f]/12 px-2 py-0.5 text-[#bd6038]">
                            감정 연결 좋음
                          </span>
                        </p>
                        <p className="mt-6 text-sm leading-8 text-[#31404a]">
                          “그래서 요즘은 집이 가장 편한 장소가 됐어요.”
                          <span className="rounded-full bg-[#73afa9]/14 px-2 py-0.5 text-[#3d746f]">
                            전환 문장 추천
                          </span>
                        </p>
                        <p className="mt-6 text-sm leading-8 text-[#31404a]">
                          “주말에는 음악을 틀어두고 시간을 보내는 편이에요.”
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
                      <div className={`rounded-[1.8rem] p-5 ${styles.sceneCard} ${styles.sceneCardDark}`}>
                        <p className="text-[11px] uppercase tracking-[0.28em] text-[#8fa3a8]">
                          mock room
                        </p>
                        <div className="mt-4 flex items-center justify-center">
                          <div className={styles.meter}>
                            <div className={styles.meterInner}>
                              <div>
                                <p className="font-serif text-[2.4rem] tracking-[-0.06em] text-[#fff7ee]">
                                  82
                                </p>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-[#8fa3a8]">
                                  fact score
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="mt-5 text-center text-sm leading-7 text-[#c7bdb1]">
                          점수만 크게 보여주지 않고, 다음 처방과 함께 읽히는 결과 UI
                        </p>
                      </div>

                      <div className={`rounded-[1.8rem] p-5 text-[#1d2b34] ${styles.sceneCard} ${styles.sceneCardPaper}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.28em] text-[#866d58]">
                              coaching lab
                            </p>
                            <p className="mt-2 font-serif text-[1.8rem] tracking-[-0.05em] text-[#16252f]">
                              튜터링은 처방 카드처럼
                            </p>
                          </div>
                          <Headphones className="h-5 w-5 text-[#e0774f]" />
                        </div>
                        <div className="mt-5 space-y-3">
                          {[
                            "Screen 0. 오늘의 발화 상태 확인",
                            "Screen 1. 30초 워밍업 질문",
                            "Screen 2. 확장 문장 훈련",
                          ].map((item) => (
                            <div
                              key={item}
                              className="rounded-[1.1rem] border border-black/6 bg-white/65 px-4 py-3 text-sm text-[#31404a]"
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </section>

            <section id="module-scenes" className="mt-18">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <SectionLabel>module tone</SectionLabel>
                  <h2 className="font-serif text-[2.3rem] tracking-[-0.05em] text-[#fff7ee] sm:text-[2.9rem]">
                    모듈은 전부 다른 방처럼 보여야 합니다.
                  </h2>
                </div>
                <p className="max-w-[42ch] text-sm leading-7 text-[#c8beb2]">
                  기능은 유지하되, 각 모듈이 조금씩 다른 밀도와 오브제를 가져야 새
                  브랜드가 살아납니다.
                </p>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                {modules.map(({ kicker, title, description, icon: Icon }, index) => (
                  <article
                    key={title}
                    className={`rounded-[1.9rem] p-5 sm:p-6 ${
                      index % 2 === 0 ? `${styles.sceneCardDark} text-[#f7eee5]` : `${styles.sceneCardPaper} text-[#1b2933]`
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p
                          className={`text-[11px] uppercase tracking-[0.28em] ${
                            index % 2 === 0 ? "text-[#8fa3a8]" : "text-[#866d58]"
                          }`}
                        >
                          {kicker}
                        </p>
                        <h3
                          className={`mt-3 font-serif text-[2rem] leading-tight tracking-[-0.05em] ${
                            index % 2 === 0 ? "text-[#fff7ee]" : "text-[#16252f]"
                          }`}
                        >
                          {title}
                        </h3>
                        <p
                          className={`mt-4 max-w-[54ch] text-sm leading-7 ${
                            index % 2 === 0 ? "text-[#c7bdb1]" : "text-[#58656d]"
                          }`}
                        >
                          {description}
                        </p>
                      </div>
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                          index % 2 === 0
                            ? "border border-white/10 bg-white/6 text-[#f1cf9c]"
                            : "border border-black/6 bg-white/70 text-[#e0774f]"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      {[
                        index === 0 ? "리서치 월" : index === 1 ? "첨삭 흔적" : index === 2 ? "콘솔 타이머" : "처방 카드",
                        index === 0 ? "빈도 히트맵" : index === 1 ? "핵심 문장 마킹" : index === 2 ? "결과 다이얼" : "훈련 프로토콜",
                        index === 0 ? "조합 아카이브" : index === 1 ? "메모 보드" : index === 2 ? "파형 인터랙션" : "말문 워밍업",
                      ].map((item) => (
                        <div
                          key={item}
                          className={`rounded-[1.1rem] px-4 py-4 text-sm ${
                            index % 2 === 0
                              ? "border border-white/8 bg-white/5 text-[#efe3d5]"
                              : "border border-black/6 bg-white/65 text-[#31404a]"
                          }`}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="mt-18 pb-16">
              <div className={`rounded-[2rem] p-6 sm:p-8 ${styles.glass}`}>
                <div className="grid gap-8 xl:grid-cols-[1.02fr_0.98fr] xl:items-end">
                  <div>
                    <SectionLabel>next move</SectionLabel>
                    <h2 className="font-serif text-[2.45rem] tracking-[-0.05em] text-[#fff7ee] sm:text-[3.15rem]">
                      이 방향이 맞으면
                      <br />
                      다음은 실제 화면 구현으로 넘어가면 됩니다.
                    </h2>
                    <p className="mt-5 max-w-[56ch] text-sm leading-7 text-[#c8beb2]">
                      이 컨셉 보드를 기준으로 랜딩, 대시보드, 스크립트 생성,
                      모의고사 세션, 튜터링 세션 5개 화면을 실제 서비스 수준으로
                      하나씩 풀어내면 됩니다.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {[
                      "1. 새 소리담 전용 토큰과 공통 레이아웃 분리",
                      "2. 랜딩과 대시보드부터 먼저 구현",
                      "3. 모듈별 톤 차이를 유지한 채 컴포넌트화",
                      "4. 기존 소리담 기능에 순차 연결",
                    ].map((step) => (
                      <div
                        key={step}
                        className="flex items-center justify-between rounded-[1.3rem] border border-white/10 bg-white/6 px-4 py-4 text-sm text-[#efe4d7]"
                      >
                        <span>{step}</span>
                        <ArrowRight className="h-4 w-4 text-[#f1cf9c]" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
