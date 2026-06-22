"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

type CrewTopBarProps = {
  subtitle: string;
  rightLabel?: string;
  backHref?: string | null;
  onRightClick?: () => void;
};

export function CrewTopBar({
  subtitle,
  rightLabel = "로그아웃",
  backHref = null,
  onRightClick,
}: CrewTopBarProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    if (backHref) {
      router.push(backHref);
      return;
    }

    router.push("/");
  };

  return (
    <header className="relative mb-3 flex items-center justify-between">
      <button
        aria-label="이전 화면으로 돌아가기"
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink"
        onClick={handleBack}
        type="button"
      >
        <ArrowLeft size={18} />
      </button>

      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <p className="text-xs font-semibold leading-none text-lgred">LG ThinQ</p>
        <p className="mt-1 text-[11px] font-semibold leading-none text-slate-500">{subtitle}</p>
      </div>

      <button
        className="h-9 rounded-full px-3 text-[11px] font-semibold text-slate-500"
        onClick={onRightClick}
        type="button"
      >
        {rightLabel}
      </button>
    </header>
  );
}
