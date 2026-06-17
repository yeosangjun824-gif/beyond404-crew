"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, ChevronRight, RefreshCw, type LucideIcon } from "lucide-react";
import { CrewBottomNav } from "@/components/CrewBottomNav";
import { CrewPhoneShell } from "@/components/CrewPhoneShell";
import {
  applianceName,
  formatRequestTime,
  pickupTypeLabel,
  sortCallsByLatest,
  statusLabel,
  type CrewCall,
} from "@/lib/crew-api";

export function CrewCallsListPage({
  actionLabel,
  emptyMessage,
  fetchCalls,
  icon: Icon,
  subtitle,
  title,
  toHref,
}: {
  actionLabel: string;
  emptyMessage: string;
  fetchCalls: () => Promise<CrewCall[]>;
  icon: LucideIcon;
  subtitle: string;
  title: string;
  toHref: (pickupRequestId: number) => string;
}) {
  const [calls, setCalls] = useState<CrewCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);

  const loadCalls = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const nextCalls = await fetchCalls();
      setCalls(sortCallsByLatest(nextCalls));
      setLastLoadedAt(formatLoadedTime(new Date()));
    } catch {
      setErrorMessage("목록을 불러오지 못했습니다. 백엔드 연결 상태를 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCalls();
    const timer = window.setInterval(() => {
      void loadCalls();
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <CrewPhoneShell>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-4">
        <div className="shrink-0">
          <header className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-lgred">LG ThinQ Crew</p>
              <h1 className="mt-2 text-[30px] font-black leading-[1.15] text-ink">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
            </div>
            <button
              aria-label="새로고침"
              className="flex h-11 shrink-0 items-center justify-center rounded-[14px] border border-white bg-white px-4 text-slate-700 shadow-sm disabled:opacity-60"
              disabled={loading}
              onClick={() => void loadCalls()}
              type="button"
            >
              <RefreshCw className={loading ? "animate-spin" : ""} size={17} />
            </button>
          </header>

          <section className="mt-5 flex items-center justify-between rounded-[24px] bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-lgred/10 text-lgred">
                <Icon size={20} />
              </span>
              <div>
                <p className="text-sm font-black text-ink">현재 목록</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  {lastLoadedAt ? `마지막 확인 ${lastLoadedAt}` : "목록을 불러오는 중"}
                </p>
              </div>
            </div>
            <p className="text-3xl font-black text-lgred">{calls.length}</p>
          </section>

          {errorMessage ? (
            <div className="mt-4 rounded-[18px] bg-red-50 px-4 py-4 text-sm font-bold leading-6 text-red-700">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <section className="mt-4 min-h-0 flex-1 overflow-y-auto pb-28 pr-1 phone-scroll">
          <div className="space-y-3">
            {calls.length > 0 ? (
              calls.map((call) => {
                const pickupRequestId = call.pickupRequest?.pickupRequestId;
                if (!pickupRequestId) return null;

                return (
                  <Link
                    key={`${title}-${call.id}`}
                    className="block rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:border-lgred/30"
                    href={toHref(pickupRequestId)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-black text-ink">{applianceName(call)}</p>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                          {call.pickupRequest?.address ?? "수거 주소 정보 없음"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-cloud px-3 py-1 text-[11px] font-black text-slate-600">
                        {statusLabel(call.pickupRequest?.status)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <InfoTile
                        label="요청 시간"
                        value={formatRequestTime(call.pickupRequest?.requestedAt, call.pickupRequest?.scheduledAt)}
                      />
                      <InfoTile label="예약 방식" value={pickupTypeLabel(call.pickupRequest?.pickupType)} />
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-[16px] bg-cloud px-4 py-3 text-sm font-black text-lgred">
                      <span className="inline-flex items-center gap-2">
                        <Bell size={15} />
                        {actionLabel}
                      </span>
                      <ChevronRight size={16} />
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-[22px] bg-white px-4 py-12 text-center text-sm font-semibold leading-6 text-slate-500 shadow-sm">
                {loading ? "목록을 불러오고 있습니다..." : emptyMessage}
              </div>
            )}
          </div>
        </section>
      </div>
      <CrewBottomNav />
    </CrewPhoneShell>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-cloud px-3 py-3">
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-ink">{value}</p>
    </div>
  );
}

function formatLoadedTime(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}
