"use client";

import { CrewPhoneShell } from "@/components/CrewPhoneShell";
import {
  acceptCrewCall,
  applianceName,
  fetchCrewCallDetail,
  formatDistance,
  formatRequestTime,
  pickupTypeLabel,
  statusLabel,
  type CrewCall,
} from "@/lib/crew-api";
import { ArrowLeft, Check, Home, MapPin, PackageCheck, ShieldCheck, Truck, Users, Warehouse } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

export default function CrewCallDetailPage() {
  const router = useRouter();
  const params = useParams<{ pickupRequestId: string }>();
  const pickupRequestId = Number(params.pickupRequestId);
  const [call, setCall] = useState<CrewCall | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("콜 상세 정보를 불러오는 중입니다.");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchCrewCallDetail(pickupRequestId);
        setCall(data);
        setMessage("콜 상세 정보를 확인했습니다.");
      } catch {
        setMessage("콜 상세 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [pickupRequestId]);

  const status = call?.pickupRequest?.status ?? "";
  const hasAcceptedStatus = ["ASSIGNED", "IN_PROGRESS", "ARRIVED", "COMPLETED"].includes(status);
  const canAccept = Boolean(call) && !hasAcceptedStatus;
  const canOpenActive = hasAcceptedStatus;

  const actionLabel = useMemo(() => {
    if (loading) return "콜 수락 처리 중...";
    if (status === "CONFIRMED") return "예약 콜 수락하기";
    return "콜 수락하기";
  }, [loading, status]);

  const acceptCall = async () => {
    setLoading(true);
    try {
      const data = await acceptCrewCall(pickupRequestId);
      setCall(data);
      setMessage("콜을 수락했습니다. 진행 화면으로 이동합니다.");
      router.push(`/calls/${pickupRequestId}/active`);
    } catch {
      setMessage("콜 수락 처리 중 문제가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <CrewPhoneShell>
      <div className="relative flex min-h-0 flex-1 flex-col bg-cloud">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-32 pt-4 phone-scroll">
          <header className="flex items-start justify-between">
            <button
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white bg-white text-ink shadow-sm"
              onClick={() => router.push("/")}
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

          <section className="mt-5 overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#b6144b_0%,#7f1637_100%)] px-5 py-5 text-white shadow-[0_18px_40px_rgba(166,15,59,0.22)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">Call Detail</p>
            <h1 className="mt-3 text-[28px] font-black leading-[1.18]">{call ? applianceName(call) : "수거 요청"}</h1>
            <p className="mt-3 text-sm leading-6 text-white/82">
              요청 위치와 시간, 배차 정보를 확인한 뒤 콜을 수락하거나 진행 화면으로 이동할 수 있어요.
            </p>
          </section>

          <section className="mt-4 rounded-[24px] bg-white p-4 shadow-sm">
            <InfoLine
              icon={<MapPin size={18} />}
              title="수거 위치"
              description={call?.pickupRequest?.address ?? "수거 위치 정보 없음"}
            />
            <InfoLine
              icon={<PackageCheck size={18} />}
              title="수거 대상"
              description={call ? applianceName(call) : "수거 품목 정보 없음"}
            />
            <InfoLine
              icon={<ShieldCheck size={18} />}
              title="사전 동의"
              description={call?.userConsent?.agreedToCreditPolicy ? "보상 정책 및 규정 동의 완료" : "동의 정보 없음"}
            />
          </section>

          <section className="mt-4 grid grid-cols-2 gap-3">
            <InfoTile
              label="요청 시간"
              value={formatRequestTime(call?.pickupRequest?.requestedAt, call?.pickupRequest?.scheduledAt)}
            />
            <InfoTile label="예약 방식" value={pickupTypeLabel(call?.pickupRequest?.pickupType)} />
            <InfoTile label="매칭 점수" value={`${call?.dispatchInfo?.matchScore ?? 0}점`} />
            <InfoTile label="우선 순위" value={`${call?.dispatchInfo?.priorityRank ?? 0}순위`} />
          </section>

          <section className="mt-4 rounded-[24px] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black text-ink">
              <Users size={16} className="text-lgred" />
              배차 및 주문 정보
            </div>

            <div className="mt-4 space-y-3">
              <InfoTileBlock
                label="우선 배차 사유"
                value={call?.dispatchInfo?.recommendedReason ?? "배차 기준 정보 없음"}
              />
              <InfoTileBlock label="처리 허브" value={call?.tracking?.processingCenter?.label ?? "허브 정보 없음"} />
              <InfoTileBlock
                label="수거지까지"
                value={call?.tracking?.route?.distanceLabel ?? formatDistance(call?.tracking?.metrics?.crewToPickupMeters)}
              />
            </div>
          </section>

          {call?.crewProfile ? (
            <section className="mt-4 rounded-[24px] bg-white p-4 shadow-sm">
              <p className="text-sm font-black text-ink">예정 크루 정보</p>
              <div className="mt-3 rounded-[18px] bg-cloud px-4 py-4">
                <p className="text-base font-black text-ink">{call.crewProfile.name}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">평점 {call.crewProfile.rating.toFixed(1)}</p>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {call.crewProfile.reviewSummary?.slice(0, 2).join(" · ") || "리뷰 요약 정보 없음"}
                </p>
              </div>
            </section>
          ) : null}
        </div>

        <div className="absolute bottom-0 left-0 right-0 rounded-t-[28px] border-t border-slate-200 bg-white/95 px-5 pb-5 pt-4 shadow-[0_-12px_32px_rgba(15,23,42,0.08)] backdrop-blur">
          {canAccept ? (
            <button
              className="flex h-13 w-full items-center justify-center gap-2 rounded-[16px] bg-lgred text-sm font-black text-white shadow-[0_14px_26px_rgba(166,15,59,0.22)] disabled:bg-slate-300"
              disabled={loading || !call}
              onClick={() => void acceptCall()}
              type="button"
            >
              <Check size={16} />
              {actionLabel}
            </button>
          ) : null}

          {canOpenActive ? (
            <Link
              className="flex h-13 w-full items-center justify-center gap-2 rounded-[16px] bg-[#202632] text-sm font-black text-white"
              href={`/calls/${pickupRequestId}/active`}
            >
              {status === "COMPLETED" ? <Warehouse size={16} /> : <Truck size={16} />}
              {status === "COMPLETED" ? "처리 완료 화면" : "진행 중인 콜 보기"}
            </Link>
          ) : null}

          <Link
            className="mt-3 flex h-12 items-center justify-center gap-2 rounded-[16px] border border-slate-200 bg-white text-sm font-black text-slate-700"
            href="/"
          >
            목록으로 돌아가기
          </Link>

          <div className="mt-3 rounded-[16px] bg-cloud px-4 py-3 text-sm font-bold leading-6 text-slate-600">{message}</div>
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

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-white px-4 py-4 shadow-sm">
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-black text-ink">{value}</p>
    </div>
  );
}

function InfoTileBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-cloud px-4 py-4">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-ink">{value}</p>
    </div>
  );
}
