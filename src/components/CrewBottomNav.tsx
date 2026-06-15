"use client";

import { ClipboardList, House, Menu, Truck } from "lucide-react";

export function CrewBottomNav() {
  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 flex justify-center px-4 pb-[max(16px,env(safe-area-inset-bottom))] md:absolute md:bottom-4 md:px-5 md:pb-0">
      <nav className="pointer-events-auto flex w-full max-w-[392px] items-center justify-between rounded-[26px] border border-white/80 bg-white/95 px-5 py-3 shadow-[0_18px_36px_rgba(15,23,42,0.12)] backdrop-blur">
        <NavItem active icon={<House size={18} />} label="홈" />
        <NavItem icon={<ClipboardList size={18} />} label="요청" />
        <NavItem icon={<Truck size={18} />} label="진행" />
        <NavItem icon={<Menu size={18} />} label="메뉴" />
      </nav>
    </div>
  );
}

function NavItem({
  active = false,
  icon,
  label,
}: {
  active?: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      className={`flex min-w-[62px] flex-col items-center gap-1 rounded-[14px] px-3 py-2 text-[11px] font-black transition ${
        active ? "bg-lgred/10 text-lgred" : "text-slate-400"
      }`}
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
