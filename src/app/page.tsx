"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, ChevronRight, ClipboardList, RefreshCw, ShieldCheck, Truck } from "lucide-react";
import { CrewBottomNav } from "@/components/CrewBottomNav";
import { CrewPhoneShell } from "@/components/CrewPhoneShell";
import {
  applianceName,
  fetchActiveCrewCalls,
  fetchPendingCrewCalls,
  formatRequestTime,
  pickupTypeLabel,
  statusLabel,
  type CrewCall,
} from "@/lib/crew-api";

export default function CrewCallsPage() {
  const [pendingCalls, setPendingCalls] = useState<CrewCall[]>([]);
  const [activeCalls, setActiveCalls] = useState<CrewCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);

  const loadCalls = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [pending, active] = await Promise.all([fetchPendingCrewCalls(), fetchActiveCrewCalls()]);
      setPendingCalls(pending);
      setActiveCalls(active);
      setLastLoadedAt(formatLoadedTime(new Date()));
    } catch {
      setErrorMessage("수거 요청 목록을 불러오지 못했습니다. 백엔드 연결 상태를 확인해 주세요.");
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
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pb-28 pt-4">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-lgred">LG ThinQ Crew</p>
            <h1 className="mt-2 text-[30px] font-black leading-[1.15] text-ink">수거 요청 현황</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              새 요청은 수거 요청에서 확인하고, 수락한 건은 진행 중인 수거에서 이어서 처리할 수 있어요.
            </p>
          </div>
          <button
            className="flex h-11 shrink-0 items-center gap-2 rounded-[14px] border border-white bg-white px-4 text-sm font-black text-slate-700 shadow-sm"
            disabled={loading}
            onClick={() => void loadCalls()}
            type="button"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} size={15} />
            새로고침
          </button>
        </header>

        <section className="mt-5 overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#b6144b_0%,#7f1637_100%)] px-5 py-5 text-white shadow-[0_18px_40px_rgba(166,15,59,0.22)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Daily Dispatch</p>
              <p className="mt-2 text-2xl font-black">오늘 수거 흐름을 한 번에 확인하세요</p>
            </div>
            <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black text-white/80">
              {loading ? "갱신 중" : "준비 완료"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <MiniStat label="대기 콜" value={String(pendingCalls.length)} />
            <MiniStat label="진행 중" value={String(activeCalls.length)} />
            <MiniStat label="마지막 확인" value={lastLoadedAt ?? "--:--:--"} />
          </div>
        </section>

        <CrewNoticeCard loading={loading} />

        <section className="mt-4 rounded-[24px] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-ink">오늘의 처리 루틴</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                수거 요청 확인부터 허브 완료 등록까지 같은 흐름으로 정리했어요.
              </p>
            </div>
            <span className="rounded-full bg-lgred/10 px-3 py-1 text-[11px] font-black text-lgred">Crew Flow</span>
          </div>

          <div className="mt-4 grid gap-3">
            <RoutineStep index="1" title="수거 요청 확인" description="예약 콜과 바로콜을 확인하고 상세 페이지에서 수락 여부를 결정합니다." />
            <RoutineStep index="2" title="진행 중인 수거 이동" description="수락 완료 후에는 진행 중인 수거에서 이동 상태와 실시간 위치를 관리합니다." />
            <RoutineStep index="3" title="허브 전달 및 완료" description="문앞 도착, 처리 완료, 증빙 등록까지 한 흐름으로 마무리합니다." />
          </div>
        </section>

        <CallsSection
          calls={pendingCalls}
          emptyMessage="현재 수락 대기 중인 수거 요청이 없습니다."
          icon={<ClipboardList size={16} />}
          subtitle="새로 들어온 예약/바로콜을 확인하고 수락할 수 있어요."
          title="수거 요청"
          toHref={(pickupRequestId) => `/calls/${pickupRequestId}`}
        />

        <CallsSection
          calls={activeCalls}
          emptyMessage="현재 진행 중인 수거가 없습니다."
          icon={<Truck size={16} />}
          subtitle="수락한 콜은 이 영역에서 이동 상황과 처리 상태를 이어서 관리합니다."
          title="진행 중인 수거"
          toHref={(pickupRequestId) => `/calls/${pickupRequestId}/active`}
        />

        <div
          className={`mt-4 rounded-[18px] px-4 py-4 text-sm font-bold leading-6 ${
            errorMessage ? "bg-red-50 text-red-700" : "bg-white text-slate-600 shadow-sm"
          }`}
        >
          {loading
            ? "콜 목록을 최신 상태로 불러오고 있습니다..."
            : errorMessage ?? `백엔드 연결 정상${lastLoadedAt ? ` · 마지막 확인 ${lastLoadedAt}` : ""}`}
        </div>
      </div>
      <CrewBottomNav />
    </CrewPhoneShell>
  );
}

function CrewNoticeCard({ loading }: { loading: boolean }) {
  return (
    <section className="mt-4 rounded-[24px] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-black text-ink">
        <ShieldCheck size={16} className="text-lgred" />
        운영 안내
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <NoticeItem
          title="수거 요청"
          description="예약 콜과 바로콜이 도착하면 요청 상세를 확인한 뒤 수락할 수 있습니다."
        />
        <NoticeItem
          title="진행 중인 수거"
          description={
            loading
              ? "새 요청과 진행 중인 콜을 동기화하고 있어요."
              : "수락이 완료되면 진행 중인 수거로 이동해 출발, 도착, 처리 완료를 순서대로 등록합니다."
          }
        />
      </div>
    </section>
  );
}

function NoticeItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[18px] bg-cloud px-4 py-4">
      <p className="text-sm font-black text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function RoutineStep({
  index,
  title,
  description,
}: {
  index: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-[18px] bg-cloud px-4 py-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-lgred shadow-sm">
        {index}
      </span>
      <div>
        <p className="text-sm font-black text-ink">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function CallsSection({
  calls,
  emptyMessage,
  icon,
  subtitle,
  title,
  toHref,
}: {
  calls: CrewCall[];
  emptyMessage: string;
  icon: React.ReactNode;
  subtitle: string;
  title: string;
  toHref: (pickupRequestId: number) => string;
}) {
  return (
    <section className="mt-4 rounded-[24px] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-black text-ink">
        <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-lgred/10 text-lgred">{icon}</span>
        <div>
          <p>{title}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">{subtitle}</p>
        </div>
      </div>

      <div className="mt-4 max-h-[310px] space-y-3 overflow-y-auto pr-1 phone-scroll">
        {calls.length > 0 ? (
          calls.map((call) => {
            const pickupRequestId = call.pickupRequest?.pickupRequestId;
            if (!pickupRequestId) return null;

            return (
              <Link
                key={`${title}-${call.id}`}
                className="block rounded-[20px] border border-slate-200 bg-cloud px-4 py-4 transition hover:border-lgred/30 hover:bg-white"
                href={toHref(pickupRequestId)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-ink">{applianceName(call)}</p>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                      {call.pickupRequest?.address ?? "수거 주소 정보 없음"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600 shadow-sm">
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

                <div className="mt-4 flex items-center justify-between rounded-[16px] bg-white px-4 py-3 text-sm font-black text-lgred shadow-sm">
                  <span className="inline-flex items-center gap-2">
                    <Bell size={15} />
                    {title === "진행 중인 수거" ? "진행 화면 열기" : "콜 상세 보기"}
                  </span>
                  <ChevronRight size={16} />
                </div>
              </Link>
            );
          })
        ) : (
          <div className="rounded-[20px] bg-cloud px-4 py-10 text-center text-sm font-semibold text-slate-500">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-white/12 px-3 py-3 text-left backdrop-blur-sm">
      <p className="text-[11px] font-bold text-white/65">{label}</p>
      <p className="mt-2 truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-white px-3 py-3 shadow-sm">
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
