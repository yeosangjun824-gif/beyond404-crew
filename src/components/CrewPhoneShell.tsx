"use client";

import type { ReactNode } from "react";

export function CrewPhoneShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-[100dvh] justify-center bg-[#eef2f7] px-0 py-0 md:px-4 md:py-8">
      <section className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[linear-gradient(180deg,#f7f9fc_0%,#eef2f7_100%)] md:min-h-[874px] md:w-[min(100%,424px)] md:rounded-[32px] md:border md:border-white/70 md:shadow-phone">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_right,rgba(182,20,75,0.08),transparent_40%),radial-gradient(circle_at_top_left,rgba(214,90,130,0.08),transparent_38%)]" />
        <div className="pointer-events-none relative z-10 px-6 pb-3 pt-[max(16px,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between text-[13px] font-black text-ink">
            <span>11:07</span>
            <div className="h-8 w-36 rounded-full bg-black/95" />
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ffc400]" />
              <span>CREW</span>
            </div>
          </div>
        </div>
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
      </section>
    </main>
  );
}
