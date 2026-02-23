import type { Metadata } from "next";
import { Fraunces, Noto_Serif_KR } from "next/font/google";
import localFont from "next/font/local";
import { Providers } from "./providers";
import "./globals.css";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

const jua = localFont({
  src: "./fonts/Jua-Regular.ttf",
  weight: "400",
  display: "swap",
  variable: "--font-jua",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});

const notoSerifKR = Noto_Serif_KR({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-serif-kr",
});

export const metadata: Metadata = {
  title: {
    template: "%s | 오픽톡닥",
    default: "오픽톡닥 - AI 기반 OPIc 말하기 학습",
  },
  description:
    "AI와 함께하는 OPIc 영어 말하기 학습 플랫폼. 모의고사, AI 훈련소, 쉐도잉으로 목표 등급을 달성하세요.",
  openGraph: {
    title: "오픽톡닥 - AI 기반 OPIc 말하기 학습",
    description:
      "AI와 함께하는 OPIc 영어 말하기 학습 플랫폼. 모의고사, AI 훈련소, 쉐도잉으로 목표 등급을 달성하세요.",
    url: "https://opictalkdoc.com",
    siteName: "오픽톡닥",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${pretendard.variable} ${jua.variable} ${fraunces.variable} ${notoSerifKR.variable}`}>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
