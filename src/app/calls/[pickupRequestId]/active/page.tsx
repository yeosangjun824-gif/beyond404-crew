"use client";

import { CrewPhoneShell } from "@/components/CrewPhoneShell";
import { KakaoCanvasMap } from "@/components/maps/KakaoCanvasMap";
import {
  applianceName,
  arriveCrewCall,
  calculateCrewSettlement,
  completeCrewCall,
  fetchCrewCallDetail,
  fetchCompletedCrewCalls,
  formatDistance,
  formatKrwAmount,
  updateCrewLocation,
  type CrewSettlementBreakdown,
  type CrewCall,
} from "@/lib/crew-api";
import { ArrowLeft, Check, Navigation, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Coordinate = {
  lat: number;
  lng: number;
};

type LocationPayload = {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  capturedAt?: number;
};

type PickupMapMarker = {
  key: string;
  label?: string;
  position: Coordinate;
  title: string;
  variant: "pickup" | "crew" | "hub";
};

type LockedRoute = {
  points: Coordinate[];
  distanceMeters?: number | null;
  durationSeconds?: number | null;
  distanceLabel?: string | null;
  durationLabel?: string | null;
};

type CompletionSummary = {
  earnedAmount: number;
  settlement: CrewSettlementBreakdown;
  todayCount: number;
  todayEarnings: number;
};

const kakaoMapAppKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY?.trim() ?? "";
const DEFAULT_PICKUP_PHOTO = "crew-pickup-proof-demo.jpg";
const DEFAULT_HUB_PHOTO = "crew-hub-proof-demo.jpg";
const DEFAULT_PICKUP_MEMO = "소비자 수거 완료 및 상태 확인";
const DEFAULT_HUB_MEMO = "e-waste 허브 전달 및 처리 완료 등록";
const FIXED_PROCESSING_CENTERS = [
  { label: "LG사이언스파크 마곡", lat: 37.562475, lng: 126.831166 },
  { label: "LG전자 창원 성산 허브", lat: 35.202531, lng: 128.677344 },
] as const;

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hour = String(parsed.getHours()).padStart(2, "0");
  const minute = String(parsed.getMinutes()).padStart(2, "0");

  return `${month}.${day} ${hour}:${minute}`;
}

function pickupStatusLabel(status?: string | null) {
  switch (status) {
    case "ASSIGNED":
      return "콜 수락 완료";
    case "IN_PROGRESS":
      return "수거지 이동 중";
    case "ARRIVED":
      return "수거 완료";
    case "COMPLETED":
      return "처리 완료";
    default:
      return "상태 확인 중";
  }
}

function kakaoWalkRouteUrl(origin: Coordinate, destination: Coordinate) {
  return `https://map.kakao.com/link/by/walk/crew,${origin.lat},${origin.lng}/pickup,${destination.lat},${destination.lng}`;
}

function formatWalkDuration(distanceMeters?: number | null) {
  if (distanceMeters == null) return "-";
  const minutes = Math.max(1, Math.round(distanceMeters / 80));
  return `${minutes}분`;
}

function formatKoreanDisplayName(value?: string | null) {
  if (!value) return "";

  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized.includes(",")) {
    return normalized;
  }

  const parts = normalized
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && part !== "대한민국" && part !== "South Korea" && !/^\d{5}$/.test(part));

  return parts.reverse().join(" ").replace(/\s+/g, " ").trim();
}

function formatKoreanDurationLabel(value?: string | null) {
  if (!value || value === "-") return "-";
  const normalized = value.trim();
  const hourMinuteMatch = normalized.match(/^(\d+)\s*h(?:ou)?rs?\s*(\d+)?\s*mins?$/i);
  if (hourMinuteMatch) {
    const hours = Number(hourMinuteMatch[1]);
    const minutes = Number(hourMinuteMatch[2] ?? 0);
    return `${hours}시간${minutes > 0 ? ` ${minutes}분` : ""}`;
  }

  const hourMatch = normalized.match(/^(\d+)\s*h(?:ou)?rs?$/i);
  if (hourMatch) {
    return `${hourMatch[1]}시간`;
  }

  const minuteMatch = normalized.match(/^(\d+)\s*mins?$/i);
  if (minuteMatch) {
    return `${minuteMatch[1]}분`;
  }
  return normalized.replace(/\bh(?:ou)?rs?\b/gi, "시간").replace(/\bmins?\b/gi, "분");
}

export default function CrewActiveCallPage() {
  const router = useRouter();
  const params = useParams<{ pickupRequestId: string }>();
  const pickupRequestId = Number(params.pickupRequestId);

  const [call, setCall] = useState<CrewCall | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedPickupOpen, setSelectedPickupOpen] = useState(false);
  const [selectedMapCenter, setSelectedMapCenter] = useState<Coordinate | null>(null);
  const [selectedMapZoom, setSelectedMapZoom] = useState<number | null>(null);
  const [lockedCarRoute, setLockedCarRoute] = useState<LockedRoute | null>(null);
  const [completionSummary, setCompletionSummary] = useState<CompletionSummary | null>(null);

  const loadCall = async () => {
    setLoading(true);
    try {
      const data = await fetchCrewCallDetail(pickupRequestId);
      setCall(data);
    } catch {
      setMessage("진행 중인 수거 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCall();
    const timer = window.setInterval(() => {
      void loadCall();
    }, 8000);

    return () => window.clearInterval(timer);
  }, [pickupRequestId]);

  const status = call?.pickupRequest?.status ?? "";
  const locationTrackingEnabled = ["ASSIGNED", "IN_PROGRESS", "ARRIVED"].includes(status);

  useEffect(() => {
    if (!locationTrackingEnabled) return undefined;

    let stopped = false;
    let fallbackCleanup: (() => void) | undefined;
    let lastSentAt = 0;

    const sendLocation = async (payload: LocationPayload) => {
      try {
        const updated = await updateCrewLocation(pickupRequestId, payload);
        if (!stopped) {
          setCall(updated);
        }
      } catch {
        if (!stopped) {
          setMessage("크루 위치 전송 중 문제가 발생했습니다.");
        }
      }
    };

    const startFallbackSimulation = () => {
      if (call?.booking?.pickupLat == null || call?.booking?.pickupLng == null) {
        setMessage("수거지 좌표가 없어 위치 시뮬레이션을 시작할 수 없습니다.");
        return () => undefined;
      }

      const pickupLat = call.booking.pickupLat;
      const pickupLng = call.booking.pickupLng;
      const hubLat = call?.tracking?.processingCenter?.lat ?? pickupLat + 0.014;
      const hubLng = call?.tracking?.processingCenter?.lng ?? pickupLng - 0.012;
      const headingToHub = status === "ARRIVED";
      const targetLat = headingToHub ? hubLat : pickupLat;
      const targetLng = headingToHub ? hubLng : pickupLng;
      const startLat = call?.tracking?.driverLocation?.lat ?? targetLat - 0.01;
      const startLng = call?.tracking?.driverLocation?.lng ?? targetLng + 0.01;
      let step = 0;

      const tick = async () => {
        step += 1;
        const ratio = Math.min(step / 10, 1);
        const lat = startLat + (targetLat - startLat) * ratio;
        const lng = startLng + (targetLng - startLng) * ratio;

        await sendLocation({
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          heading: headingToHub ? 135 : 90,
          speed: Math.max(4, 18 - step),
          accuracy: 15,
          capturedAt: Date.now(),
        });
      };

      void tick();
      const timer = window.setInterval(() => {
        void tick();
      }, 3000);

      return () => window.clearInterval(timer);
    };

    if ("geolocation" in navigator && window.isSecureContext) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (position.coords.accuracy > 150) {
            if (!stopped) {
              setMessage("크루 위치 정확도를 높이는 중입니다. GPS 신호가 안정되면 위치를 전송합니다.");
            }
            return;
          }

          const now = Date.now();
          if (now - lastSentAt < 3000) return;
          lastSentAt = now;

          void sendLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            heading: position.coords.heading ?? 0,
            speed: position.coords.speed ?? 0,
            accuracy: position.coords.accuracy,
            capturedAt: position.timestamp,
          });
        },
        () => {
          if (!fallbackCleanup) {
            fallbackCleanup = startFallbackSimulation();
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000,
        },
      );

      return () => {
        stopped = true;
        navigator.geolocation.clearWatch(watchId);
        fallbackCleanup?.();
      };
    }

    fallbackCleanup = startFallbackSimulation();

    return () => {
      stopped = true;
      fallbackCleanup?.();
    };
  }, [
    call?.booking?.pickupLat,
    call?.booking?.pickupLng,
    call?.tracking?.driverLocation?.lat,
    call?.tracking?.driverLocation?.lng,
    call?.tracking?.processingCenter?.lat,
    call?.tracking?.processingCenter?.lng,
    locationTrackingEnabled,
    pickupRequestId,
    status,
  ]);

  const completeCustomerPickupFromButton = async () => {
    setLoading(true);

    try {
      const updated = await arriveCrewCall(pickupRequestId);
      setCall(updated);
      setMessage("소비자 수거 완료가 기록됐어요. 허브 전달 후 처리 완료를 눌러주세요.");
    } catch {
      setMessage("수거 완료 처리 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const completeHubProcessingFromButton = async () => {
    setLoading(true);

    try {
      const updated = await completeCrewCall(pickupRequestId, {
        pickupPhotoFileName: DEFAULT_PICKUP_PHOTO,
        hubPhotoFileName: DEFAULT_HUB_PHOTO,
        inspectionMemo: DEFAULT_PICKUP_MEMO,
        hubMemo: DEFAULT_HUB_MEMO,
      });

      setCall(updated);
      setMessage(null);

      try {
        const completedCalls = await fetchCompletedCrewCalls();
        const nextCompletedCalls = upsertCompletedCall(completedCalls, updated);
        const todayCalls = nextCompletedCalls.filter(isCompletedToday);
        const settlement = calculateCrewSettlement(updated);
        setCompletionSummary({
          earnedAmount: settlement.totalAmount,
          settlement,
          todayCount: todayCalls.length,
          todayEarnings: todayCalls.reduce((sum, completedCall) => sum + getSettlementAmount(completedCall), 0),
        });
      } catch {
        const settlement = calculateCrewSettlement(updated);
        setCompletionSummary({
          earnedAmount: settlement.totalAmount,
          settlement,
          todayCount: 1,
          todayEarnings: settlement.totalAmount,
        });
      }
    } catch {
      setMessage("처리 완료 등록 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const crewLocation = call?.tracking?.driverLocation
    ? { lat: call.tracking.driverLocation.lat, lng: call.tracking.driverLocation.lng }
    : null;
  const pickupLocation =
    call?.booking?.pickupLat != null && call?.booking?.pickupLng != null
      ? { lat: call.booking.pickupLat, lng: call.booking.pickupLng }
      : null;
  const hubLocation = call?.tracking?.processingCenter
    ? { lat: call.tracking.processingCenter.lat, lng: call.tracking.processingCenter.lng }
    : null;

  const pickupAddress = formatKoreanDisplayName(call?.pickupRequest?.address) || "수거지 주소 정보가 없습니다.";
  const routeTarget = status === "ARRIVED" || status === "COMPLETED" ? hubLocation ?? pickupLocation : pickupLocation;
  const mapCenter = selectedMapCenter ?? crewLocation ?? pickupLocation ?? hubLocation;
  const mapZoom = selectedMapZoom ?? 17;
  const mapMarkers: PickupMapMarker[] = [
    ...(pickupLocation
      ? [{ key: "pickup" as const, label: "home", position: pickupLocation, title: "수거지", variant: "pickup" as const }]
      : []),
    ...(crewLocation
      ? [{ key: "crew" as const, label: "C", position: crewLocation, title: "크루 현재 위치", variant: "crew" as const }]
      : []),
    ...FIXED_PROCESSING_CENTERS.map((center, index) => ({
      key: `hub-${index}`,
      label: "H",
      position: { lat: center.lat, lng: center.lng },
      title: center.label,
      variant: "hub" as const,
    })),
  ];

  const incomingRoadRoute = call?.tracking?.route;
  const incomingRoadRoutePoints =
    incomingRoadRoute?.points?.map((point) => ({
      lat: point.lat,
      lng: point.lng,
    })) ?? [];
  const routePhase = status === "ARRIVED" || status === "COMPLETED" ? "hub" : "pickup";

  useEffect(() => {
    setLockedCarRoute(null);
  }, [pickupRequestId, routePhase]);

  useEffect(() => {
    if (incomingRoadRoutePoints.length <= 1) return;

    setLockedCarRoute((previous) =>
      previous ?? {
        points: incomingRoadRoutePoints,
        distanceMeters: incomingRoadRoute?.distanceMeters,
        durationSeconds: incomingRoadRoute?.durationSeconds,
        distanceLabel: incomingRoadRoute?.distanceLabel,
        durationLabel: incomingRoadRoute?.durationLabel,
      },
    );
  }, [
    incomingRoadRoute?.distanceLabel,
    incomingRoadRoute?.distanceMeters,
    incomingRoadRoute?.durationLabel,
    incomingRoadRoute?.durationSeconds,
    incomingRoadRoutePoints,
  ]);

  const roadRoutePoints = lockedCarRoute?.points ?? [];
  const routeDistanceMeters =
    lockedCarRoute?.distanceMeters ?? incomingRoadRoute?.distanceMeters ?? call?.tracking?.metrics?.crewToPickupMeters;
  const mapPath = roadRoutePoints;
  const boundsPoints = mapPath.length > 1 ? mapPath : [crewLocation, routeTarget].filter(Boolean) as Coordinate[];
  const hasRoadRoute = roadRoutePoints.length > 1;

  const statusText = pickupStatusLabel(status);
  const crewDistance =
    lockedCarRoute?.distanceLabel ?? incomingRoadRoute?.distanceLabel ?? formatDistance(call?.tracking?.metrics?.crewToPickupMeters);
  const durationLabel = formatKoreanDurationLabel(lockedCarRoute?.durationLabel ?? incomingRoadRoute?.durationLabel);
  const settlement = call ? calculateCrewSettlement(call) : null;
  const hubAddress = formatKoreanDisplayName(call?.tracking?.processingCenter?.label) || "처리 허브 정보가 없습니다.";
  const hubDistance = formatDistance(call?.tracking?.metrics?.crewToProcessingCenterMeters);
  const liveStatusBase = call?.tracking?.metrics?.locationLive ? "실시간 GPS 반영 중" : "위치 확인 중";
  const liveStatusMetrics = [crewDistance, durationLabel].filter((value) => value && value !== "-").join(" · ");
  const liveStatus = liveStatusMetrics ? `${liveStatusBase} · ${liveStatusMetrics}` : liveStatusBase;
  const detailAddress = call?.booking?.detailAddress?.trim() || "상세 위치 정보 없음";
  const canCompleteCustomerPickup = ["ASSIGNED", "IN_PROGRESS"].includes(status);
  const canCompleteHubProcessing = status === "ARRIVED";
  const processingCompleted = status === "COMPLETED";
  const primaryActionLabel = canCompleteHubProcessing ? "처리 완료" : "수거 완료";
  const primaryActionDisabled = loading || (!canCompleteCustomerPickup && !canCompleteHubProcessing);
  const handlePrimaryAction = canCompleteHubProcessing ? completeHubProcessingFromButton : completeCustomerPickupFromButton;

  const handleMarkerClick = (marker: { key: string; position: Coordinate }) => {
    if (marker.key !== "pickup") return;
    setSelectedPickupOpen(true);
    setSelectedMapCenter(marker.position);
    setSelectedMapZoom(19);
  };

  const closePickupCard = () => {
    setSelectedPickupOpen(false);
    setSelectedMapCenter(null);
    setSelectedMapZoom(null);
  };
  return (
    <CrewPhoneShell>
      <div className="relative flex min-h-0 flex-1 flex-col bg-cloud">
        <div className="phone-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-32 pt-4">
          <header className="flex items-start">
            <button
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white bg-white text-ink shadow-sm"
              onClick={() => router.push(`/calls/${pickupRequestId}`)}
              type="button"
            >
              <ArrowLeft size={18} />
            </button>
          </header>

          <section className="mt-5 rounded-[24px] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black text-ink">
              <Navigation size={16} className="text-lgred" />
              이동 지도
            </div>

            <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-cloud">
              {mapCenter ? (
                kakaoMapAppKey ? (
                  <div className="relative isolate overflow-hidden">
                    <KakaoCanvasMap
                      appKey={kakaoMapAppKey}
                      boundsPoints={boundsPoints}
                      center={mapCenter}
                      className="relative z-0 h-[430px] w-full"
                      fitBounds
                      markers={mapMarkers}
                      onMarkerClick={handleMarkerClick}
                      path={mapPath}
                      routeColor={hasRoadRoute ? "#d33126" : "#64748b"}
                      routeOpacity={hasRoadRoute ? 0.94 : 0.58}
                      routeWeight={hasRoadRoute ? 10 : 5}
                      zoom={mapZoom}
                    />

                  </div>
                ) : (
                  <div className="flex h-[430px] w-full items-center justify-center px-6 text-center">
                    <div>
                      <p className="text-sm font-black text-ink">Kakao Maps 연결이 필요합니다</p>
                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                        `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` 값을 확인한 뒤 앱을 다시 실행해 주세요.
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex h-[430px] w-full items-center justify-center px-6 text-center">
                  <div>
                    <p className="text-sm font-black text-ink">이동 지도를 표시할 수 없습니다</p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                      수거지 좌표 또는 크루 위치가 확인되면 경로가 표시됩니다.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {selectedPickupOpen ? (
              <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
                  <div>
                    <p className="text-[28px] font-black leading-none text-ink">
                      {call ? applianceName(call) : "수거지 정보"}
                    </p>
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">{pickupAddress}</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">{detailAddress}</p>
                  </div>
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-cloud text-slate-500"
                    onClick={closePickupCard}
                    type="button"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 px-5 pb-5 pt-3">
                  <InfoTile label="현재 상태" value={statusText} />
                  <InfoTile label="수거지까지" value={crewDistance} />
                  <InfoTile label="예상 시간" value={durationLabel} />
                  <InfoTile label="허브" value={`${hubAddress} · ${hubDistance}`} />
                </div>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3">
                <InfoTile label="수거지 주소" value={pickupAddress} />
                <InfoTile label="실시간 상태" value={liveStatus} />
                {canCompleteHubProcessing && settlement ? (
                  <InfoTile
                    label="허브 이동 정산"
                    value={`${formatKrwAmount(settlement.hubDistanceFee)} · ${formatDistance(settlement.hubDistanceMeters)}`}
                  />
                ) : null}
                <InfoTile label="위치 갱신 시각" value={formatDateTime(call?.tracking?.driverLocation?.updatedAt)} />
              </div>
            )}
          </section>

        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 px-5 pb-5 pt-4 shadow-[0_-12px_32px_rgba(15,23,42,0.08)] backdrop-blur">
          {message ? (
            <div className="mb-3 rounded-[16px] bg-slate-50 px-4 py-3 text-[12px] font-bold leading-5 text-slate-600">
              {message}
            </div>
          ) : null}

          {processingCompleted ? (
            <button
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-slate-100 text-sm font-black text-slate-500"
              disabled
              type="button"
            >
              <Check size={16} />
              처리 완료됨
            </button>
          ) : (
            <button
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-lgred text-sm font-black text-white shadow-[0_12px_24px_rgba(166,15,59,0.22)] disabled:bg-slate-300 disabled:shadow-none"
              disabled={primaryActionDisabled}
              onClick={() => void handlePrimaryAction()}
              type="button"
            >
              <Check size={16} />
              {loading ? "처리 중..." : primaryActionLabel}
            </button>
          )}

        </div>

        {completionSummary ? (
          <CompletionDialog
            summary={completionSummary}
            onConfirm={() => {
              setCompletionSummary(null);
              router.push("/");
            }}
          />
        ) : null}
      </div>
      </CrewPhoneShell>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-cloud px-4 py-4">
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-black leading-6 text-ink">{value}</p>
    </div>
  );
}

function CompletionDialog({
  onConfirm,
  summary,
}: {
  onConfirm: () => void;
  summary: CompletionSummary;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-end bg-black/55 px-4 pb-5 backdrop-blur-[2px]">
      <section className="w-full rounded-[24px] bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-lgred/10 text-lgred">
          <Check size={26} />
        </div>

        <div className="mt-4 text-center">
          <p className="text-[13px] font-bold text-lgred">처리 완료</p>
          <h2 className="mt-1 text-[22px] font-black leading-tight text-ink">정산이 반영됐어요</h2>
          <p className="mt-2 text-[13px] font-semibold leading-5 text-slate-500">
            허브 전달 실적과 정산 금액을 확인해 주세요.
          </p>
        </div>

        <div className="mt-5 rounded-[20px] bg-lgred px-4 py-5 text-white">
          <p className="text-[12px] font-bold opacity-80">이번 수거 정산</p>
          <p className="mt-1 text-[30px] font-black leading-none">{formatKrwAmount(summary.earnedAmount)}</p>
          <p className="mt-2 text-[12px] font-semibold opacity-80">
            총 이동 {formatDistance(summary.settlement.totalDistanceMeters)} 기준
          </p>
        </div>

        <div className="mt-3 rounded-[18px] bg-cloud px-4 py-3">
          <SettlementRow label="콜 수락 기본금" value={formatKrwAmount(summary.settlement.baseAcceptFee)} />
          <SettlementRow label={summary.settlement.pickupWorkFeeLabel} value={formatKrwAmount(summary.settlement.pickupWorkFee)} />
          <SettlementRow
            label={`수거지 이동 ${formatDistance(summary.settlement.pickupDistanceMeters)}`}
            value={formatKrwAmount(summary.settlement.pickupDistanceFee)}
          />
          <SettlementRow
            label={`허브 이동 ${formatDistance(summary.settlement.hubDistanceMeters)}`}
            value={formatKrwAmount(summary.settlement.hubDistanceFee)}
          />
          {summary.settlement.longDistanceSurcharge > 0 ? (
            <SettlementRow label="장거리 추가" value={formatKrwAmount(summary.settlement.longDistanceSurcharge)} />
          ) : null}
          {summary.settlement.minimumAdjustment > 0 ? (
            <SettlementRow label="최소 정산 보정" value={formatKrwAmount(summary.settlement.minimumAdjustment)} />
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <SummaryTile label="오늘 처리" value={`${summary.todayCount}건`} />
          <SummaryTile label="오늘 수익" value={formatKrwAmount(summary.todayEarnings)} />
        </div>

        <button
          className="mt-5 flex h-12 w-full items-center justify-center rounded-[16px] bg-lgred text-sm font-black text-white shadow-[0_12px_24px_rgba(166,15,59,0.22)]"
          onClick={onConfirm}
          type="button"
        >
          확인
        </button>
      </section>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-cloud px-4 py-4">
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="mt-2 text-[18px] font-black leading-none text-ink">{value}</p>
    </div>
  );
}

function SettlementRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white py-2 last:border-b-0">
      <p className="text-[12px] font-bold text-slate-500">{label}</p>
      <p className="shrink-0 text-[12px] font-black text-ink">{value}</p>
    </div>
  );
}

function upsertCompletedCall(calls: CrewCall[], completedCall: CrewCall) {
  const completedId = completedCall.pickupRequest?.pickupRequestId ?? completedCall.id;
  const exists = calls.some((call) => (call.pickupRequest?.pickupRequestId ?? call.id) === completedId);
  return exists ? calls : [completedCall, ...calls];
}

function getSettlementAmount(call: CrewCall) {
  return calculateCrewSettlement(call).totalAmount;
}

function isCompletedToday(call: CrewCall) {
  const completedAt = getCompletedAt(call);
  if (!completedAt) return false;

  const today = new Date();
  return (
    completedAt.getFullYear() === today.getFullYear() &&
    completedAt.getMonth() === today.getMonth() &&
    completedAt.getDate() === today.getDate()
  );
}

function getCompletedAt(call: CrewCall) {
  const completedEvent = call.tracking?.events?.find((event) => event.eventType === "EWASTE_HUB_DELIVERED");
  const source = completedEvent?.createdAt ?? call.tracking?.driverLocation?.updatedAt ?? call.pickupRequest?.scheduledAt;
  if (!source) return null;

  const parsed = new Date(source);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatWon(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "0원";
  return `${Math.round(value * INR_TO_KRW_RATE).toLocaleString("ko-KR")}원`;
}

const INR_TO_KRW_RATE = 10156 / 625;
