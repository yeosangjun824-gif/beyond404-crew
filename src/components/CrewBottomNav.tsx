"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, ClipboardList, House, Truck } from "lucide-react";

const navItems = [
  {
    href: "/",
    icon: House,
    label: "홈",
    match: (pathname: string) => pathname === "/",
  },
  {
    href: "/calls",
    icon: ClipboardList,
    label: "요청",
    match: (pathname: string) => pathname === "/calls" || /^\/calls\/\d+$/.test(pathname),
  },
  {
    href: "/active",
    icon: Truck,
    label: "진행",
    match: (pathname: string) => pathname === "/active" || pathname.endsWith("/active"),
  },
  {
    href: "/completed",
    icon: CheckCircle2,
    label: "완료",
    match: (pathname: string) => pathname === "/completed",
  },
] as const;

export function CrewBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="-mx-4 grid h-[76px] shrink-0 grid-cols-4 bg-white px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_20px_rgba(15,23,42,0.06)]">
      {navItems.map((item) => (
        <NavItem
          key={item.href}
          active={item.match(pathname)}
          href={item.href}
          icon={item.icon}
          label={item.label}
        />
      ))}
    </nav>
  );
}

function NavItem({
  active,
  href,
  icon: Icon,
  label,
}: {
  active: boolean;
  href: string;
  icon: typeof House;
  label: string;
}) {
  return (
    <Link
      className={`flex flex-col items-center justify-center gap-1 ${active ? "text-lgred" : "text-slate-500"}`}
      href={href}
    >
      <Icon size={20} strokeWidth={2.2} />
      <span className="text-[10px] font-semibold">{label}</span>
    </Link>
  );
}
