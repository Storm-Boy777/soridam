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
    template: "%s | 하루오픽",
    default: "하루오픽 - OPIc 학습 플랫폼",
  },
  description:
    "나의 일상이 영어 답변이 되는 OPIc 말하기 학습 플랫폼. 기출 분석, 맞춤 스크립트, 실전 모의고사, 약점 튜터링까지.",
  openGraph: {
    title: "하루오픽 - 나의 경험으로 준비하는 OPIc",
    description:
      "나의 일상이 영어 답변이 되는 OPIc 말하기 학습 플랫폼. 기출 분석, 맞춤 스크립트, 실전 모의고사, 약점 튜터링까지.",
    url: "https://haruopic.com",
    siteName: "하루오픽",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "하루오픽 - 당신의 평범한 하루가 가장 완벽한 스토리입니다",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "하루오픽 - 나의 경험으로 준비하는 OPIc",
    description:
      "나의 일상이 영어 답변이 되는 OPIc 말하기 학습 플랫폼.",
    images: ["/images/og-image.png"],
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
