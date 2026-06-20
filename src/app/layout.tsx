import type { Metadata } from "next";
import { AppEntryHomeRedirect } from "@/components/FreshEntryHomeRedirect";
import "./globals.css";

export const metadata: Metadata = {
  title: "LG SwapIt Crew",
  description: "LG SwapIt 수거 크루 운영 앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body suppressHydrationWarning>
        <AppEntryHomeRedirect />
        {children}
      </body>
    </html>
  );
}
