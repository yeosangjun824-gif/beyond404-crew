"use client";

import type { ReactNode } from "react";

export function CrewPhoneShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-[100dvh] justify-center bg-cloud md:items-center md:bg-[#0b0b0d] md:py-8">
      <div className="relative w-full max-w-[430px] md:w-auto md:max-w-none md:rounded-[58px] md:border-[14px] md:border-[#0f0f11] md:bg-[#0f0f11] md:shadow-[0_40px_90px_rgba(0,0,0,0.55)]">
        <div className="pointer-events-none absolute left-1/2 top-[10px] z-50 hidden h-[26px] w-[112px] -translate-x-1/2 rounded-full bg-black md:block" />
        <section className="relative min-h-[100dvh] w-full overflow-hidden bg-cloud md:min-h-0 md:h-[min(844px,calc(100dvh-64px))] md:aspect-[390/844] md:rounded-[44px]">
          <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden md:h-full">
            <div
              aria-hidden="true"
              className="relative z-30 block h-[max(45px,env(safe-area-inset-top))] bg-cloud"
            />
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
