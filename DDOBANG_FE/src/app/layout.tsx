import { ClientLayout } from "@/app/ClientLayout";
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
  title: "또방: 방탈출 커뮤니티",
  description: "방탈출 테마 리뷰와 모임을 만들 수 있는 커뮤니티입니다.",
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  other: {
    "Content-Security-Policy":
      "img-src 'self' data: https: http:; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://dapi.kakao.com; script-src-elem 'self' 'unsafe-inline' https://dapi.kakao.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.ddobang.site http://localhost:8080 https://dapi.kakao.com;",
    "Referrer-Policy": "no-referrer",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <meta name="referrer" content="no-referrer" />
        <meta
          httpEquiv="Cache-Control"
          content="no-cache, no-store, must-revalidate"
        />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}