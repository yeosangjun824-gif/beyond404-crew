"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { CrewBottomNav } from "@/components/CrewBottomNav";
import { CrewPhoneShell } from "@/components/CrewPhoneShell";
import { CrewTopBar } from "@/components/CrewTopBar";
import {
  applianceName,
  formatCallTime,
  pickupTypeLabel,
  sortCallsByLatest,
  statusLabel,
  type CrewCall,
} from "@/lib/crew-api";

export function CrewCallsListPage({
  actionLabel,
  emptyMessage,
  fetchCalls,
  title,
  topSubtitle,
  toHref,
}: {
  actionLabel: string;
  emptyMessage: string;
  fetchCalls: () => Promise<CrewCall[]>;
  icon: LucideIcon;
  subtitle: string;
  title: string;
  topSubtitle: string;
  toHref: (pickupRequestId: number) => string;
}) {
  const [calls, setCalls] = useState<CrewCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCalls = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const nextCalls = await fetchCalls();
      setCalls(sortCallsByLatest(nextCalls));
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
      <div className="relative flex min-h-0 flex-1 flex-col bg-cloud px-4 pb-0">
        <div className="shrink-0">
          <CrewTopBar backHref="/" subtitle={topSubtitle} />

          <section className="px-1 pb-1 pt-2">
            <h1 className="text-[22px] font-bold leading-tight text-ink">{title}</h1>
          </section>

          {errorMessage ? (
            <div className="mt-3 rounded-[18px] bg-red-50 px-4 py-4 text-sm font-semibold leading-6 text-red-700">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <section className="phone-scroll mt-3 min-h-0 flex-1 overflow-y-auto pb-3">
          <div className="space-y-3">
            {calls.length > 0 ? (
              calls.map((call) => {
                const pickupRequestId = call.pickupRequest?.pickupRequestId;
                if (!pickupRequestId) return null;

                return (
                  <Link
                    key={`${title}-${call.id}`}
                    className="block rounded-[20px] bg-white p-4 shadow-sm"
                    href={toHref(pickupRequestId)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink">{applianceName(call)}</p>
                        <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-slate-500">
                          {call.pickupRequest?.address ?? "수거 주소 정보가 없습니다."}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-cloud px-3 py-1 text-[11px] font-semibold text-slate-600">
                        {statusLabel(call.pickupRequest?.status)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <InfoTile label="요청 시간" value={formatCallTime(call)} />
                      <InfoTile label="예약 방식" value={pickupTypeLabel(call.pickupRequest?.pickupType)} />
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm font-bold text-lgred">
                      <span>{actionLabel}</span>
                      <ChevronRight size={16} />
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-[20px] bg-white px-4 py-12 text-center text-sm font-semibold leading-6 text-slate-500 shadow-sm">
                {loading ? "목록을 불러오는 중입니다..." : emptyMessage}
              </div>
            )}
          </div>
        </section>

        <CrewBottomNav />
      </div>
    </CrewPhoneShell>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-cloud px-3 py-3">
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-ink">{value}</p>
    </div>
  );
}
