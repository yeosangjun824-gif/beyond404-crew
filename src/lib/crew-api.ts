"use client";

export type NearbyCrew = {
  crewId: number | null;
  crewName: string;
  status: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  assigned: boolean;
};

export type CrewCall = {
  id: number;
  status: string;
  appliance?: {
    applianceType: string;
    brand: string;
    modelName?: string | null;
    sizeGrade?: string | null;
    sizeMetric?: string | null;
  } | null;
  userConsent?: {
    agreedToCreditPolicy: boolean;
    notice: string;
    agreedAt?: string | null;
  } | null;
  captureEvidence?: {
    pickupPhotoFileName?: string | null;
    hubPhotoFileName?: string | null;
    pickupInspectionMemo?: string | null;
    hubMemo?: string | null;
  } | null;
  selectedProduct?: {
    productName: string;
    productGrade: string;
    productPrice: number;
  } | null;
  preValuation?: {
    minEstimatedValue?: number | null;
    maxEstimatedValue?: number | null;
    currency?: string | null;
  } | null;
  rewardEstimate?: {
    scrapValue?: number | null;
    estimatedFinalCredit?: number | null;
  } | null;
  rewardOverview?: {
    currentCredit?: number | null;
    userTier?: string | null;
    exchangeCount?: number | null;
  } | null;
  pickupRequest?: {
    pickupRequestId: number;
    pickupType: string;
    status: string;
    crewId?: number | null;
    crewName: string | null;
    address: string | null;
    scheduledAt: string;
    requestedAt?: string | null;
    nearbyCrews?: NearbyCrew[];
  } | null;
  crewProfile?: {
    name: string;
    photoUrl: string;
    rating: number;
    reviewSummary: string[];
  } | null;
  booking?: {
    bookingDate?: string | null;
    bookingTime?: string | null;
    address?: string | null;
    detailAddress?: string | null;
    pickupLat?: number | null;
    pickupLng?: number | null;
  } | null;
  dispatchInfo?: {
    alertMessage: string;
    matchScore: number;
    priorityRank: number;
    penaltyCount: number;
    recommendedReason: string;
  } | null;
  tracking?: {
    message: string;
    phase?: string;
    processingCenter?: {
      label: string;
      lat: number;
      lng: number;
    } | null;
    metrics?: {
      crewToPickupMeters: number | null;
      crewToProcessingCenterMeters: number | null;
      locationLive: boolean;
    } | null;
    nearbyCrews?: NearbyCrew[];
    driverLocation?: {
      lat: number;
      lng: number;
      heading: number;
      speed: number;
      updatedAt?: string | null;
    } | null;
    route?: {
      mode: string;
      distanceMeters: number | null;
      durationSeconds: number | null;
      distanceLabel: string | null;
      durationLabel: string | null;
      encodedPolyline?: string | null;
      points: {
        lat: number;
        lng: number;
      }[];
      calculatedAt?: string | null;
    } | null;
    events?: {
      eventType: string;
      message: string;
      createdAt: string;
    }[];
    locationHistory?: {
      lat: number;
      lng: number;
      heading: number;
      speed: number;
      recordedAt: string;
    }[];
  } | null;
  settlement?: {
    baseFee: number | null;
    distanceFee: number | null;
    incentive: number | null;
    penalty: number | null;
    totalAmount: number | null;
    currency?: string | null;
    status: string;
  } | null;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function resolveApiBaseUrl() {
  if (typeof window !== "undefined") {
    return "";
  }

  const publicBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (publicBaseUrl) {
    return trimTrailingSlash(publicBaseUrl);
  }

  return "http://127.0.0.1:8080";
}

const API_BASE_URL = resolveApiBaseUrl();

async function crewRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || `Crew API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchCrewCalls() {
  return crewRequest<CrewCall[]>("/api/crew/calls");
}

export function fetchPendingCrewCalls() {
  return crewRequest<CrewCall[]>("/api/crew/calls/pending");
}

export function fetchActiveCrewCalls() {
  return crewRequest<CrewCall[]>("/api/crew/calls/active");
}

export function fetchCompletedCrewCalls() {
  return crewRequest<CrewCall[]>("/api/crew/calls/completed");
}

export function fetchCrewCallDetail(pickupRequestId: number) {
  return crewRequest<CrewCall>(`/api/crew/calls/${pickupRequestId}`);
}

export function fetchCrewLocationHistory(pickupRequestId: number) {
  return crewRequest<
    {
      lat: number;
      lng: number;
      heading: number;
      speed: number;
      recordedAt: string;
    }[]
  >(`/api/crew/pickups/${pickupRequestId}/location-history`);
}

export function acceptCrewCall(
  pickupRequestId: number,
  payload?: {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
    capturedAt?: number;
  },
) {
  return crewRequest<CrewCall>(`/api/crew/calls/${pickupRequestId}/accept`, {
    method: "POST",
    body: payload ? JSON.stringify(payload) : undefined,
  });
}

export function departCrewCall(pickupRequestId: number) {
  return crewRequest<CrewCall>(`/api/crew/pickups/${pickupRequestId}/depart`, { method: "POST" });
}

export function arriveCrewCall(pickupRequestId: number) {
  return crewRequest<CrewCall>(`/api/crew/pickups/${pickupRequestId}/arrive`, { method: "POST" });
}

export function completeCrewCall(
  pickupRequestId: number,
  payload: {
    pickupPhotoFileName: string;
    hubPhotoFileName: string;
    inspectionMemo: string;
    hubMemo: string;
  },
) {
  return crewRequest<CrewCall>(`/api/crew/pickups/${pickupRequestId}/complete`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCrewLocation(
  pickupRequestId: number,
  payload: {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
    capturedAt?: number;
  },
) {
  return crewRequest<CrewCall>(`/api/crew/pickups/${pickupRequestId}/location`, {
    method: "POST",
    body: JSON.stringify({
      lat: payload.lat,
      lng: payload.lng,
      heading: payload.heading ?? 0,
      speed: payload.speed ?? 0,
      accuracy: payload.accuracy,
      capturedAt: payload.capturedAt,
    }),
  });
}

export function sortCallsByLatest(calls: CrewCall[]) {
  return [...calls].sort((left, right) => {
    const rightId = right.pickupRequest?.pickupRequestId ?? right.id;
    const leftId = left.pickupRequest?.pickupRequestId ?? left.id;
    return rightId - leftId;
  });
}

export type CrewSettlementBreakdown = {
  baseAcceptFee: number;
  pickupWorkFee: number;
  pickupWorkFeeLabel: string;
  pickupDistanceFee: number;
  hubDistanceFee: number;
  longDistanceSurcharge: number;
  minimumAdjustment: number;
  totalAmount: number;
  pickupDistanceMeters: number | null;
  hubDistanceMeters: number | null;
  totalDistanceMeters: number | null;
};

const CREW_SETTLEMENT_POLICY = {
  baseAcceptFee: 2000,
  defaultPickupWorkFee: 8000,
  pickupDistanceRatePerKm: 800,
  hubDistanceRatePerKm: 500,
  longDistanceThresholdMeters: 10000,
  longDistanceSurcharge: 2000,
  minimumPayout: 6000,
} as const;

export function calculateCrewSettlement(call: CrewCall): CrewSettlementBreakdown {
  const pickupDistanceMeters = getCrewToPickupMeters(call);
  const hubDistanceMeters = getPickupToHubMeters(call);
  const totalDistanceMeters =
    pickupDistanceMeters == null && hubDistanceMeters == null
      ? null
      : (pickupDistanceMeters ?? 0) + (hubDistanceMeters ?? 0);

  const pickupDistanceFee = calculateDistanceFee(pickupDistanceMeters, CREW_SETTLEMENT_POLICY.pickupDistanceRatePerKm);
  const hubDistanceFee = calculateDistanceFee(hubDistanceMeters, CREW_SETTLEMENT_POLICY.hubDistanceRatePerKm);
  const pickupWorkFee = getPickupWorkFee(call);
  const longDistanceSurcharge =
    totalDistanceMeters != null && totalDistanceMeters > CREW_SETTLEMENT_POLICY.longDistanceThresholdMeters
      ? CREW_SETTLEMENT_POLICY.longDistanceSurcharge
      : 0;

  const subtotal =
    CREW_SETTLEMENT_POLICY.baseAcceptFee +
    pickupWorkFee.amount +
    pickupDistanceFee +
    hubDistanceFee +
    longDistanceSurcharge;
  const minimumAdjustment = Math.max(0, CREW_SETTLEMENT_POLICY.minimumPayout - subtotal);

  return {
    baseAcceptFee: CREW_SETTLEMENT_POLICY.baseAcceptFee,
    pickupWorkFee: pickupWorkFee.amount,
    pickupWorkFeeLabel: pickupWorkFee.label,
    pickupDistanceFee,
    hubDistanceFee,
    longDistanceSurcharge,
    minimumAdjustment,
    totalAmount: subtotal + minimumAdjustment,
    pickupDistanceMeters,
    hubDistanceMeters,
    totalDistanceMeters,
  };
}

export function formatKrwAmount(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "확인 중";
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function calculateDistanceFee(distanceMeters: number | null, ratePerKm: number) {
  if (distanceMeters == null || distanceMeters <= 0) return 0;
  return Math.round((distanceMeters / 1000) * ratePerKm);
}

function getPickupWorkFee(call: CrewCall) {
  const grade = call.appliance?.sizeGrade?.trim();
  if (grade?.includes("소형")) return { amount: 5000, label: "소형 가전 작업비" };
  if (grade?.includes("중형")) return { amount: 8000, label: "중형 가전 작업비" };
  if (grade?.includes("대형")) return { amount: 12000, label: "대형 가전 작업비" };

  return {
    amount: CREW_SETTLEMENT_POLICY.defaultPickupWorkFee,
    label: "기본 작업비",
  };
}

function getCrewToPickupMeters(call: CrewCall) {
  const assignedCrew = call.pickupRequest?.nearbyCrews?.find((crew) => crew.assigned);
  const nearestCrew = call.pickupRequest?.nearbyCrews?.[0];

  return (
    call.tracking?.metrics?.crewToPickupMeters ??
    call.tracking?.route?.distanceMeters ??
    assignedCrew?.distanceMeters ??
    nearestCrew?.distanceMeters ??
    null
  );
}

function getPickupToHubMeters(call: CrewCall) {
  const pickupLat = call.booking?.pickupLat;
  const pickupLng = call.booking?.pickupLng;
  const hub = call.tracking?.processingCenter;

  if (pickupLat != null && pickupLng != null && hub?.lat != null && hub?.lng != null) {
    return distanceBetweenMeters({ lat: pickupLat, lng: pickupLng }, { lat: hub.lat, lng: hub.lng });
  }

  return call.tracking?.metrics?.crewToProcessingCenterMeters ?? null;
}

function distanceBetweenMeters(left: { lat: number; lng: number }, right: { lat: number; lng: number }) {
  const earthRadiusMeters = 6371000;
  const leftLat = (left.lat * Math.PI) / 180;
  const rightLat = (right.lat * Math.PI) / 180;
  const deltaLat = ((right.lat - left.lat) * Math.PI) / 180;
  const deltaLng = ((right.lng - left.lng) * Math.PI) / 180;
  const halfChord =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(halfChord), Math.sqrt(1 - halfChord));
}

export function applianceName(call: CrewCall) {
  const model = call.appliance?.modelName ?? "LG demo model";
  const type = call.appliance?.applianceType ?? "washing_machine";

  const label =
    type === "refrigerator"
      ? "냉장고"
      : type === "air_conditioner"
        ? "에어컨"
        : type === "tv"
          ? "TV"
          : type === "microwave"
            ? "전자레인지"
            : "세탁기";

  return `${label} / ${model}`;
}

export function formatRequestTime(requestedAt?: string | null, scheduledAt?: string | null) {
  const source = requestedAt ?? scheduledAt;
  if (!source) return "-";

  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) return source;

  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hour = String(parsed.getHours()).padStart(2, "0");
  const minute = String(parsed.getMinutes()).padStart(2, "0");

  return `${month}.${day} ${hour}:${minute}`;
}

export function formatCallTime(call: CrewCall) {
  return formatRequestTime(call.pickupRequest?.requestedAt, call.pickupRequest?.scheduledAt);
}

export function pickupTypeLabel(value?: string | null) {
  if (value === "INSTANT_CALL") return "바로콜";
  if (value === "BOOKING") return "시간 예약";
  return "-";
}

export function formatDistance(distance: number | null | undefined) {
  if (distance == null) return "-";
  if (distance >= 1000) return `${(distance / 1000).toFixed(1)} km`;
  return `${Math.round(distance)} m`;
}

export function statusLabel(status?: string | null) {
  switch (status) {
    case "REQUESTED":
      return "수락 대기";
    case "CONFIRMED":
      return "예약 확정";
    case "ASSIGNED":
      return "수락 완료";
    case "IN_PROGRESS":
      return "이동 중";
    case "ARRIVED":
      return "수거 완료";
    case "COMPLETED":
      return "처리 완료";
    default:
      return status ?? "-";
  }
}
