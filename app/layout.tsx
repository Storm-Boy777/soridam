import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "./providers";
import { getSiteSettings } from "@/lib/settings";
import "./globals.css";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  const siteName = (s.site_name as string) || "소리담";
  const description = (s.site_description as string) || "AI 기반 OPIc 영어 말하기 학습 플랫폼";
  const ogImage = (s.og_image_url as string) || "/images/og-image.png";

  return {
    title: {
      template: `%s | ${siteName}`,
      default: `${siteName} - OPIc 말하기 학습 플랫폼`,
    },
    description: `나의 목소리에 나의 이야기를 담다. ${description}. 기출 분석, 맞춤 스크립트, 실전 모의고사, 약점 튜터링까지.`,
    openGraph: {
      title: `${siteName} - 말하다, 나답게.`,
      description: `나의 목소리에 나의 이야기를 담다. ${description}.`,
      url: "https://soridamhub.com",
      siteName,
      locale: "ko_KR",
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${siteName} - 나의 목소리에 나의 이야기를 담다`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteName} - 말하다, 나답게.`,
      description: `나의 목소리에 나의 이야기를 담다. ${description}.`,
      images: [ogImage],
    },
  };
}

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
