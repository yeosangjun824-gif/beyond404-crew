"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronRight, Clock3, MapPin, PackageCheck, Star, Truck, UserRound } from "lucide-react";
import { CrewPhoneShell } from "@/components/CrewPhoneShell";
import { CrewTopBar } from "@/components/CrewTopBar";
import {
  acceptCrewCall,
  applianceName,
  calculateCrewSettlement,
  fetchActiveCrewCalls,
  fetchCompletedCrewCalls,
  fetchPendingCrewCalls,
  formatCallTime,
  formatDistance,
  formatKrwAmount,
  pickupTypeLabel,
  sortCallsByLatest,
  statusLabel,
  type CrewCall,
} from "@/lib/crew-api";

type CrewProfileSummary = {
  name: string;
  photoUrl: string | null;
  rating: number;
};

type CrewLocationPayload = {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  capturedAt?: number;
};

const DEFAULT_CREW_NAME = "무함마드";

const DEFAULT_CREW_PROFILE: CrewProfileSummary = {
  name: DEFAULT_CREW_NAME,
  photoUrl: "/crew-muhammad.png",
  rating: 4.9,
};
const REFRESH_PULL_THRESHOLD = 64;

export default function CrewHomePage() {
  const router = useRouter();
  const [pendingCalls, setPendingCalls] = useState<CrewCall[]>([]);
  const [activeCalls, setActiveCalls] = useState<CrewCall[]>([]);
  const [completedCalls, setCompletedCalls] = useState<CrewCall[]>([]);
  const [dispatchEnabled, setDispatchEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const loadSummary = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true);
      setErrorMessage(null);
    }

    const [pendingResult, activeResult, completedResult] = await Promise.allSettled([
      fetchPendingCrewCalls(),
      fetchActiveCrewCalls(),
      fetchCompletedCrewCalls(),
    ]);

    if (pendingResult.status === "fulfilled") {
      setPendingCalls(sortCallsByLatest(pendingResult.value));
    }

    if (activeResult.status === "fulfilled") {
      setActiveCalls(sortCallsByLatest(activeResult.value));
    }

    if (completedResult.status === "fulfilled") {
      setCompletedCalls(sortCallsByLatest(completedResult.value));
    }

    const failedCount = [pendingResult, activeResult, completedResult].filter((result) => result.status === "rejected").length;
    if (!silent) {
      if (failedCount === 3) {
        setErrorMessage("수거 요청을 불러오지 못했어요. 백엔드 연결 상태를 확인해 주세요.");
      } else if (failedCount > 0) {
        setErrorMessage("일부 요청 정보가 늦게 들어오고 있어요. 아래로 당기면 다시 확인할 수 있어요.");
      }
    }

    if (!silent) {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadSummary({ silent: true });
    }, 8000);

    return () => window.clearInterval(timer);
  }, [loadSummary]);

  const profile = useMemo(
    () => resolveCrewProfile([...activeCalls, ...pendingCalls, ...completedCalls]),
    [activeCalls, completedCalls, pendingCalls],
  );

  const primaryActiveCall = activeCalls[0] ?? null;
  const primaryPendingCall = pendingCalls[0] ?? null;

  const acceptFromHome = async (call: CrewCall) => {
    if (primaryActiveCall) {
      setErrorMessage("진행 중인 수거를 먼저 완료한 뒤 새 요청을 수락할 수 있어요.");
      return;
    }

    const pickupRequestId = getPickupRequestId(call);
    if (!pickupRequestId) return;

    setAcceptingId(pickupRequestId);
    setErrorMessage(null);

    try {
      const crewLocation = await getCurrentCrewLocation();
      await acceptCrewCall(pickupRequestId, crewLocation);
      router.push(`/calls/${pickupRequestId}/active`);
    } catch {
      setErrorMessage("콜을 수락하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setAcceptingId(null);
    }
  };

  const refreshSummary = async () => {
    if (loading || isRefreshing) return;

    setIsRefreshing(true);
    setPullDistance(REFRESH_PULL_THRESHOLD);

    try {
      await loadSummary();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
      touchStartYRef.current = null;
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.currentTarget.scrollTop > 0 || loading || isRefreshing) {
      touchStartYRef.current = null;
      return;
    }

    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const startY = touchStartYRef.current;
    if (startY == null || event.currentTarget.scrollTop > 0) return;

    const currentY = event.touches[0]?.clientY ?? startY;
    const nextDistance = Math.max(0, currentY - startY);
    setPullDistance(Math.min(96, nextDistance));
  };

  const handleTouchEnd = () => {
    if (pullDistance >= REFRESH_PULL_THRESHOLD) {
      void refreshSummary();
      return;
    }

    setPullDistance(0);
    touchStartYRef.current = null;
  };

  return (
    <CrewPhoneShell>
      <div className="relative flex min-h-0 flex-1 flex-col bg-cloud px-4 pb-0">
        <CrewTopBar subtitle="Home" />

        <div
          className="phone-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pb-3"
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onTouchStart={handleTouchStart}
        >
          <PullRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} />

          <section className="px-1 pb-1 pt-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-lgred">LG SwapIt Crew</p>
                <h1 className="mt-1 text-[22px] font-bold leading-tight text-ink">오늘의 수거 요청</h1>
                <p className="mt-1 text-[13px] font-medium leading-5 text-slate-500">
                  새 요청을 확인하고 진행 중인 수거를 바로 이어가요.
                </p>
              </div>
              <ProfilePill profile={profile} />
            </div>
          </section>

          <section className="rounded-[20px] bg-white p-4 shadow-sm">
            <div className="flex w-full items-center justify-between gap-3">
              <span>
                <span className="block text-[12px] font-bold text-slate-400">배차 상태</span>
                <span className="mt-1 block text-[22px] font-bold leading-none text-ink">
                  {dispatchEnabled ? "수신 중" : "수신 중지"}
                </span>
              </span>

              <button
                aria-pressed={dispatchEnabled}
                className={`flex h-9 w-[82px] items-center rounded-full px-1 transition ${
                  dispatchEnabled ? "justify-end bg-lgred/10" : "justify-start bg-slate-100"
                }`}
                onClick={() => setDispatchEnabled((prev) => !prev)}
                type="button"
              >
                <span
                  className={`flex h-7 min-w-10 items-center justify-center rounded-full px-2 text-[11px] font-bold shadow-sm ${
                    dispatchEnabled ? "bg-lgred text-white" : "bg-white text-slate-500"
                  }`}
                >
                  {dispatchEnabled ? "ON" : "OFF"}
                </span>
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <StatusStat label="새 요청" value={`${dispatchEnabled ? pendingCalls.length : 0}건`} emphasis={activeCalls.length > 0} />
              <StatusStat label="진행 중" value={`${activeCalls.length}건`} emphasis={activeCalls.length > 0} />
              <StatusStat label="완료" value={`${completedCalls.length}건`} />
            </div>
          </section>

          {errorMessage ? (
            <div className="rounded-[18px] bg-red-50 px-4 py-4 text-sm font-semibold leading-6 text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {primaryActiveCall ? <ActiveCallCard call={primaryActiveCall} /> : !loading ? <NoActiveCallCard /> : null}

          {dispatchEnabled && !primaryPendingCall && !loading ? (
            <section className="rounded-[22px] border border-slate-100 bg-white px-5 py-8 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-lgred/10 text-lgred">
                <Truck size={24} />
              </div>
              <h2 className="mt-4 text-[18px] font-bold text-ink">대기 중인 수거 요청이 없어요</h2>
              <p className="mt-2 text-[13px] font-medium leading-5 text-slate-500">
                새 요청이 들어오면 이 화면에서 바로 수락할 수 있어요.
              </p>
            </section>
          ) : null}

          {loading ? (
            <div className="rounded-[18px] bg-white px-4 py-4 text-sm font-semibold leading-6 text-slate-500 shadow-sm">
              수거 요청을 불러오는 중이에요...
            </div>
          ) : null}

          {dispatchEnabled && pendingCalls.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-[16px] font-bold text-ink">새 요청</h2>
                <Link className="text-[12px] font-bold text-lgred" href="/calls">
                  전체 보기
                </Link>
              </div>

              {pendingCalls.slice(0, primaryActiveCall ? 3 : 4).map((call) => {
                const pickupRequestId = getPickupRequestId(call);
                if (!pickupRequestId) return null;

                return (
                  <CompactCallCard
                    accepting={acceptingId === pickupRequestId}
                    blocked={Boolean(primaryActiveCall)}
                    call={call}
                    key={`pending-${call.id}`}
                    onAccept={() => void acceptFromHome(call)}
                  />
                );
              })}
            </section>
          ) : null}
        </div>

      </div>
    </CrewPhoneShell>
  );
}

function ProfilePill({ profile }: { profile: CrewProfileSummary }) {
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-[14px] bg-white px-2.5 py-2 shadow-sm">
      {profile.photoUrl ? (
        <img alt={profile.name} className="h-8 w-8 rounded-full object-cover" src={profile.photoUrl} />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lgred/10 text-lgred">
          <UserRound size={16} />
        </span>
      )}
      <span className="min-w-0">
        <span className="block max-w-[72px] truncate text-[12px] font-bold leading-none text-ink">{profile.name}</span>
        <span className="mt-1 flex items-center gap-1 text-[11px] font-bold leading-none text-amber-600">
          <Star className="fill-current" size={11} />
          {profile.rating.toFixed(1)}
        </span>
      </span>
    </div>
  );
}

function StatusStat({ emphasis = false, label, value }: { emphasis?: boolean; label: string; value: string }) {
  return (
    <div className={`rounded-[16px] px-3 py-3 ${emphasis ? "bg-lgred/10" : "bg-cloud"}`}>
      <p className={`text-[20px] font-bold leading-none ${emphasis ? "text-lgred" : "text-ink"}`}>{value}</p>
      <p className="mt-1 text-[11px] font-bold text-slate-500">{label}</p>
    </div>
  );
}

function NoActiveCallCard() {
  return (
    <section className="rounded-[22px] border border-slate-100 bg-white p-5 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-slate-100 text-slate-500">
        <Truck size={24} />
      </div>
      <h2 className="mt-4 text-[18px] font-bold text-ink">진행 중인 수거가 없어요</h2>
      <p className="mt-2 text-[13px] font-medium leading-5 text-slate-500">
        새 요청에서 수락하면 이곳에 진행 중인 수거가 표시됩니다.
      </p>
    </section>
  );
}

function ActiveCallCard({ call }: { call: CrewCall }) {
  const pickupRequestId = getPickupRequestId(call);
  if (!pickupRequestId) return null;

  return (
    <section className="rounded-[22px] border border-lgred/20 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-lgred/10 px-3 py-1 text-[11px] font-bold text-lgred">
            {statusLabel(call.pickupRequest?.status)}
          </span>
          <h2 className="mt-3 text-[19px] font-bold leading-snug text-ink">진행 중인 수거가 있어요</h2>
          <p className="mt-1 line-clamp-2 text-[13px] font-medium leading-5 text-slate-500">
            {call.pickupRequest?.address ?? "수거 주소 정보가 없습니다."}
          </p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-lgred text-white">
          <Truck size={22} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <InfoTile label="예상 정산" value={getPayoutLabel(call)} highlight />
        <InfoTile label="예상 이동" value={getDurationLabel(call)} />
        <InfoTile label="총 이동" value={getTotalDistanceLabel(call)} />
        <InfoTile label="수거 + 허브" value={getLegDistanceLabel(call)} />
      </div>

      <Link
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-lgred text-sm font-bold text-white shadow-[0_12px_24px_rgba(166,15,59,0.22)]"
        href={`/calls/${pickupRequestId}/active`}
      >
        진행 화면 열기
        <ChevronRight size={16} />
      </Link>
    </section>
  );
}

function PriorityPendingCard({
  accepting,
  call,
  onAccept,
}: {
  accepting: boolean;
  call: CrewCall;
  onAccept: () => void;
}) {
  const pickupRequestId = getPickupRequestId(call);
  if (!pickupRequestId) return null;

  return (
    <section className="rounded-[22px] border border-lgred/20 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-lgred/10 px-3 py-1 text-[11px] font-bold text-lgred">
            새 수거 요청
          </span>
          <h2 className="mt-3 text-[19px] font-bold leading-snug text-ink">{applianceName(call)}</h2>
          <p className="mt-1 line-clamp-2 text-[13px] font-medium leading-5 text-slate-500">
            {call.pickupRequest?.address ?? "수거 주소 정보가 없습니다."}
          </p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-lgred/10 text-lgred">
          <PackageCheck size={22} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <InfoTile label="예상 정산" value={getPayoutLabel(call)} highlight />
        <InfoTile label="현재 거리" value={getDistanceLabel(call)} />
        <InfoTile label="요청 시간" value={formatCallTime(call)} />
        <InfoTile label="예약 방식" value={pickupTypeLabel(call.pickupRequest?.pickupType)} />
        <InfoTile label="수거 + 허브" value={getLegDistanceLabel(call)} />
      </div>

      {call.selectedProduct ? (
        <div className="mt-3 rounded-[16px] bg-slate-50 px-3 py-3">
          <p className="text-[10px] font-bold text-slate-400">선택 구매 제품</p>
          <p className="mt-1 truncate text-[13px] font-bold text-ink">{call.selectedProduct.productName}</p>
          <p className="mt-1 text-[12px] font-bold text-lgred">{formatWon(call.selectedProduct.productPrice)}</p>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <button
          className="flex h-12 items-center justify-center gap-2 rounded-[16px] bg-lgred text-sm font-bold text-white shadow-[0_12px_24px_rgba(166,15,59,0.22)] disabled:bg-slate-300 disabled:shadow-none"
          disabled={accepting}
          onClick={onAccept}
          type="button"
        >
          <Check size={16} />
          {accepting ? "수락 중..." : "수락하기"}
        </button>
        <Link
          className="flex h-12 items-center justify-center rounded-[16px] border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600"
          href={`/calls/${pickupRequestId}`}
        >
          상세
        </Link>
      </div>
    </section>
  );
}

function CompactCallCard({
  accepting,
  blocked = false,
  call,
  onAccept,
}: {
  accepting: boolean;
  blocked?: boolean;
  call: CrewCall;
  onAccept: () => void;
}) {
  const pickupRequestId = getPickupRequestId(call);
  if (!pickupRequestId) return null;

  return (
    <article className="rounded-[20px] bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-lgred/10 text-lgred">
          <MapPin size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{applianceName(call)}</p>
          <p className="mt-1 line-clamp-2 text-[12px] font-medium leading-5 text-slate-500">
            {call.pickupRequest?.address ?? "수거 주소 정보가 없습니다."}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 text-[12px] font-bold text-slate-500">
            <Clock3 size={14} />
            <span className="truncate">{formatCallTime(call)}</span>
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-2 text-[12px] font-bold text-lgred">
            <span className="truncate">{getPayoutLabel(call)}</span>
            <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" />
            <span className="truncate text-slate-500">{getDistanceLabel(call)}</span>
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-2 text-[12px] font-bold text-slate-500">
            <Truck size={14} />
            <span className="truncate">{pickupTypeLabel(call.pickupRequest?.pickupType)}</span>
          </div>
        </div>
        <button
          className="h-9 shrink-0 rounded-full bg-lgred px-4 text-[12px] font-bold text-white disabled:bg-slate-300"
          disabled={accepting || blocked}
          onClick={onAccept}
          type="button"
        >
          {blocked ? "진행 중" : accepting ? "수락 중" : "수락"}
        </button>
      </div>
      {blocked ? (
        <p className="mt-3 rounded-[12px] bg-slate-50 px-3 py-2 text-[11px] font-semibold leading-4 text-slate-500">
          현재 수거를 처리 완료하면 새 요청을 수락할 수 있어요.
        </p>
      ) : null}
    </article>
  );
}

function InfoTile({ highlight = false, label, value }: { highlight?: boolean; label: string; value: string }) {
  return (
    <div className={`min-w-0 rounded-[15px] px-3 py-3 ${highlight ? "bg-lgred/10" : "bg-cloud"}`}>
      <p className={`text-[10px] font-bold ${highlight ? "text-lgred/70" : "text-slate-400"}`}>{label}</p>
      <p className={`mt-1 truncate text-[13px] font-bold ${highlight ? "text-lgred" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function PullRefreshIndicator({
  isRefreshing,
  pullDistance,
}: {
  isRefreshing: boolean;
  pullDistance: number;
}) {
  const visible = isRefreshing || pullDistance > 0;
  const progress = isRefreshing ? 100 : Math.min(100, Math.round((pullDistance / REFRESH_PULL_THRESHOLD) * 100));

  return (
    <div
      className="overflow-hidden transition-[height,opacity] duration-200"
      style={{
        height: visible ? 42 : 0,
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="flex h-10 items-center justify-center">
        <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-lgred transition-all duration-150" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            {isRefreshing ? "새 요청 확인 중" : progress >= 100 ? "놓으면 새로고침" : "아래로 당겨 새로고침"}
          </span>
        </div>
      </div>
    </div>
  );
}

function getPickupRequestId(call: CrewCall) {
  return call.pickupRequest?.pickupRequestId ?? call.id;
}

function getDistanceMeters(call: CrewCall) {
  const assignedCrew = call.pickupRequest?.nearbyCrews?.find((crew) => crew.assigned);
  const nearestCrew = call.pickupRequest?.nearbyCrews?.[0];

  return (
    call.tracking?.route?.distanceMeters ??
    call.tracking?.metrics?.crewToPickupMeters ??
    assignedCrew?.distanceMeters ??
    nearestCrew?.distanceMeters ??
    null
  );
}

function getDistanceLabel(call: CrewCall) {
  return call.tracking?.route?.distanceLabel ?? formatDistance(getDistanceMeters(call));
}

function getLegDistanceLabel(call: CrewCall) {
  const settlement = calculateCrewSettlement(call);
  return `수거 ${formatDistance(settlement.pickupDistanceMeters)} · 허브 ${formatDistance(settlement.hubDistanceMeters)}`;
}

function getTotalDistanceLabel(call: CrewCall) {
  return formatDistance(calculateCrewSettlement(call).totalDistanceMeters);
}

function getDurationLabel(call: CrewCall) {
  if (call.tracking?.route?.durationLabel) {
    return call.tracking.route.durationLabel;
  }

  const distanceMeters = getDistanceMeters(call);
  if (distanceMeters == null) {
    return "확인 중";
  }

  const minutes = Math.max(5, Math.round(distanceMeters / 350));
  return `${minutes}분 예상`;
}

function getPayoutLabel(call: CrewCall) {
  return formatKrwAmount(calculateCrewSettlement(call).totalAmount);
}

function formatWon(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "확인 중";
  return `${Math.round(value * INR_TO_KRW_RATE).toLocaleString("ko-KR")}원`;
}

const INR_TO_KRW_RATE = 10156 / 625;

function getCurrentCrewLocation() {
  return new Promise<CrewLocationPayload | undefined>((resolve) => {
    if (!("geolocation" in navigator) || !window.isSecureContext) {
      resolve(undefined);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: position.coords.heading ?? 0,
          speed: position.coords.speed ?? 0,
          accuracy: position.coords.accuracy,
          capturedAt: position.timestamp,
        });
      },
      () => resolve(undefined),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      },
    );
  });
}

function resolveCrewProfile(calls: CrewCall[]): CrewProfileSummary {
  const ratings = calls
    .map((call) => call.crewProfile?.rating)
    .filter((rating): rating is number => typeof rating === "number" && Number.isFinite(rating) && rating > 0);

  if (ratings.length > 0) {
    const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;

    return {
      name: DEFAULT_CREW_NAME,
      photoUrl: DEFAULT_CREW_PROFILE.photoUrl,
      rating: Number(averageRating.toFixed(1)),
    };
  }

  return DEFAULT_CREW_PROFILE;
}
