import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI 코드리뷰 (OpenAI) - 클라우드 교육 예제",
  description: "코드 파일 업로드 또는 직접 입력 후 GPT 기반 AI 코드리뷰를 받을 수 있는 Next.js 앱 (Vercel 배포 대응)",
  openGraph: {
    title: "AI 코드리뷰 (OpenAI) - 클라우드 교육 예제",
    description: "코드 파일 업로드 또는 직접 입력 후 GPT 기반 AI 코드리뷰를 받을 수 있는 Next.js 앱",
    siteName: "AI Code Review Companion",
    images: [
      {
        url: "/vercel.svg", // public 하위의 대표 이미지 (필요시 별도 썸네일 추가 가능)
        width: 256,
        height: 256,
        alt: "서비스 대표 이미지",
      }
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "AI 코드리뷰 (OpenAI)",
    description: "코드 파일 업로드 또는 직접 입력 후 GPT 기반 AI 코드리뷰",
    images: ["/vercel.svg"]
  },
  metadataBase: new URL("https://your-vercel-project-url.vercel.app")
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
