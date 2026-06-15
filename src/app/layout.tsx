import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LG SwapIt Crew",
  description: "LG SwapIt 수거 크루용 운영 앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
