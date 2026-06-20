"use client";

import { CrewPhoneShell } from "@/components/CrewPhoneShell";
import {
  acceptCrewCall,
  applianceName,
  fetchCrewCallDetail,
  formatRequestTime,
  pickupTypeLabel,
  type CrewCall,
} from "@/lib/crew-api";
import { ArrowLeft, Check, Home, MapPin, PackageCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type CrewLocationPayload = {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  capturedAt?: number;
};

export default function CrewCallDetailPage() {
  const router = useRouter();
  const params = useParams<{ pickupRequestId: string }>();
  const pickupRequestId = Number(params.pickupRequestId);
  const [call, setCall] = useState<CrewCall | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadFailed(false);

      try {
        const data = await fetchCrewCallDetail(pickupRequestId);
        setCall(data);
      } catch {
        setLoadFailed(true);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [pickupRequestId]);

  const status = call?.pickupRequest?.status ?? "";
  const hasAcceptedStatus = ["ASSIGNED", "IN_PROGRESS", "ARRIVED", "COMPLETED"].includes(status);
  const canAccept = Boolean(call) && !hasAcceptedStatus;

  const actionLabel = useMemo(() => {
    if (loading) return "콜 수락 처리 중...";
    if (status === "CONFIRMED") return "예약 콜 수락하기";
    return "콜 수락하기";
  }, [loading, status]);

  const getCurrentCrewLocation = () =>
    new Promise<CrewLocationPayload | undefined>((resolve) => {
      if (!("geolocation" in navigator) || !window.isSecureContext) {
        resolve(undefined);
        return;
      }

      let resolved = false;
      let bestPosition: GeolocationPosition | null = null;
      let watchId: number | null = null;

      const toPayload = (position: GeolocationPosition): CrewLocationPayload => ({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        heading: position.coords.heading ?? 0,
        speed: position.coords.speed ?? 0,
        accuracy: position.coords.accuracy,
        capturedAt: position.timestamp,
      });

      const finish = (position?: GeolocationPosition | null) => {
        if (resolved) return;
        resolved = true;
        if (watchId != null) {
          navigator.geolocation.clearWatch(watchId);
        }
        resolve(position ? toPayload(position) : undefined);
      };

      const timer = window.setTimeout(() => finish(bestPosition), 6000);

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
            bestPosition = position;
          }

          if (position.coords.accuracy <= 100) {
            window.clearTimeout(timer);
            finish(position);
          }
        },
        () => {
          window.clearTimeout(timer);
          finish(bestPosition);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 8000,
        },
      );
    });

  const acceptCall = async () => {
    setLoading(true);
    try {
      const crewLocation = await getCurrentCrewLocation();
      const data = await acceptCrewCall(pickupRequestId, crewLocation);
      setCall(data);
      router.replace(`/calls/${pickupRequestId}/active`);
    } catch {
      setLoading(false);
    }
  };

  return (
    <CrewPhoneShell>
      <div className="relative flex min-h-0 flex-1 flex-col bg-cloud">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-44 pt-4 phone-scroll">
          <header className="flex items-start justify-between">
            <button
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white bg-white text-ink shadow-sm"
              onClick={() => router.push("/calls")}
              type="button"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              className="flex h-11 items-center gap-2 rounded-full border border-white bg-white px-4 text-sm font-black text-slate-700 shadow-sm"
              onClick={() => router.push("/")}
              type="button"
            >
              <Home size={14} />
              홈
            </button>
          </header>

          <section className="mt-5 rounded-[22px] border border-slate-100 bg-white px-4 py-4 shadow-sm">
            <InfoLine
              icon={<MapPin size={18} />}
              title="수거 위치"
              description={call?.pickupRequest?.address ?? "수거 위치 정보가 없습니다."}
            />
            <InfoLine
              icon={<PackageCheck size={18} />}
              title="수거 대상"
              description={call ? applianceName(call) : "수거 품목 정보가 없습니다."}
            />
            <InfoLine
              icon={<ShieldCheck size={18} />}
              title="사전 동의"
              description={call?.userConsent?.agreedToCreditPolicy ? "보상 정책 및 규정 동의 완료" : "동의 정보가 없습니다."}
            />
          </section>

          <section className="mt-4 rounded-[22px] border border-slate-100 bg-white px-4 py-4 shadow-sm">
            <SimpleRow
              label="요청 시간"
              value={formatRequestTime(call?.pickupRequest?.requestedAt, call?.pickupRequest?.scheduledAt)}
            />
            <SimpleRow label="예약 방식" value={pickupTypeLabel(call?.pickupRequest?.pickupType)} />
            <SimpleRow label="현재 상태" value={statusLabel(status)} />
            <SimpleRow label="처리 허브" value={call?.tracking?.processingCenter?.label ?? "허브 정보가 없습니다."} />
          </section>

          {loadFailed ? (
            <div className="mt-4 rounded-[18px] bg-red-50 px-4 py-4 text-sm font-semibold leading-6 text-red-700">
              콜 상세 정보를 불러오지 못했습니다.
            </div>
          ) : null}
        </div>

        <div className="absolute bottom-0 left-0 right-0 rounded-t-[28px] border-t border-slate-200 bg-white/95 px-5 pb-5 pt-4 shadow-[0_-12px_32px_rgba(15,23,42,0.08)] backdrop-blur">
          {canAccept ? (
            <button
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-lgred text-sm font-black text-white shadow-[0_14px_26px_rgba(166,15,59,0.22)] disabled:bg-slate-300"
              disabled={loading || !call}
              onClick={() => void acceptCall()}
              type="button"
            >
              <Check size={16} />
              {actionLabel}
            </button>
          ) : null}

          <Link
            className={`${canAccept ? "mt-3" : ""} flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-slate-200 bg-white text-sm font-black text-slate-700`}
            href="/calls"
          >
            목록으로 돌아가기
          </Link>
        </div>
      </div>
      </CrewPhoneShell>
  );
}

function InfoLine({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-lgred/10 text-lgred">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black text-ink">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function SimpleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <p className="text-[12px] font-bold text-slate-400">{label}</p>
      <p className="text-sm font-black text-ink">{value}</p>
    </div>
  );
}

function statusLabel(status?: string) {
  switch (status) {
    case "CONFIRMED":
      return "예약 확정";
    case "ASSIGNED":
      return "수락 완료";
    case "IN_PROGRESS":
      return "이동 중";
    case "ARRIVED":
      return "도착";
    case "COMPLETED":
      return "처리 완료";
    default:
      return "수락 대기";
  }
}
