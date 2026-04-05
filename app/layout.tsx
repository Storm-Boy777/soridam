import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "./providers";
import "./globals.css";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

export const metadata: Metadata = {
  title: {
    template: "%s | 소리담",
    default: "소리담 - OPIc 말하기 학습 플랫폼",
  },
  description:
    "나의 목소리에 나의 이야기를 담다. AI 기반 OPIc 말하기 학습 플랫폼. 기출 분석, 맞춤 스크립트, 실전 모의고사, 약점 튜터링까지.",
  openGraph: {
    title: "소리담 - 말하다, 나답게.",
    description:
      "나의 목소리에 나의 이야기를 담다. AI 기반 OPIc 말하기 학습 플랫폼. 기출 분석, 맞춤 스크립트, 실전 모의고사, 약점 튜터링까지.",
    url: "https://soridamhub.com",
    siteName: "소리담",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "소리담 - 나의 목소리에 나의 이야기를 담다",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "소리담 - 말하다, 나답게.",
    description:
      "나의 목소리에 나의 이야기를 담다. AI 기반 OPIc 말하기 학습 플랫폼.",
    images: ["/images/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
