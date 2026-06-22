"use client";

import { useEffect, useMemo, useState } from "react";
import { Star, UserRound } from "lucide-react";
import { CrewBottomNav } from "@/components/CrewBottomNav";
import { CrewPhoneShell } from "@/components/CrewPhoneShell";
import { CrewTopBar } from "@/components/CrewTopBar";
import {
  fetchActiveCrewCalls,
  fetchCompletedCrewCalls,
  fetchPendingCrewCalls,
  type CrewCall,
} from "@/lib/crew-api";

type CrewProfileSummary = {
  name: string;
  photoUrl: string | null;
  rating: number;
};

const DEFAULT_CREW_NAME = "무함마드";

const DEFAULT_CREW_PROFILE: CrewProfileSummary = {
  name: DEFAULT_CREW_NAME,
  photoUrl: "/crew-muhammad.png",
  rating: 4.9,
};

export default function CrewHomePage() {
  const [pendingCalls, setPendingCalls] = useState<CrewCall[]>([]);
  const [activeCalls, setActiveCalls] = useState<CrewCall[]>([]);
  const [completedCalls, setCompletedCalls] = useState<CrewCall[]>([]);
  const [dispatchEnabled, setDispatchEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSummary = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [pending, active, completed] = await Promise.all([
        fetchPendingCrewCalls(),
        fetchActiveCrewCalls(),
        fetchCompletedCrewCalls(),
      ]);

      setPendingCalls(pending);
      setActiveCalls(active);
      setCompletedCalls(completed);
    } catch {
      setErrorMessage("배차 현황을 불러오지 못했습니다. 백엔드 연결 상태를 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  useEffect(() => {
    if (!dispatchEnabled) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      void loadSummary();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [dispatchEnabled]);

  const profile = useMemo(
    () => resolveCrewProfile([...activeCalls, ...pendingCalls, ...completedCalls]),
    [activeCalls, completedCalls, pendingCalls],
  );

  const totalCalls = pendingCalls.length + activeCalls.length + completedCalls.length;

  return (
    <CrewPhoneShell>
      <div className="relative flex min-h-0 flex-1 flex-col bg-cloud px-4 pb-0">
        <CrewTopBar subtitle="Home" />

        <div className="phone-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pb-3">
          <section className="px-1 pb-1 pt-2">
            <p className="text-[15px] font-bold text-slate-500">LG 수거 크루님, 안녕하세요</p>
            <h1 className="mt-1 text-[18px] font-bold leading-tight text-ink">
              오늘 배차 상태와 내 정보를 한눈에 확인해 보세요
            </h1>
          </section>

          <section className="rounded-[20px] bg-white p-4 shadow-sm">
            <div className="flex w-full items-start justify-between gap-3">
              <span>
                <span className="block text-[13px] font-bold text-slate-500">오늘 배차 상태</span>
                <span className="mt-1 block text-[24px] font-bold leading-none text-ink">
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
                  className={`flex h-7 min-w-10 items-center justify-center rounded-full px-2 text-[11px] font-extrabold shadow-sm ${
                    dispatchEnabled ? "bg-lgred text-white" : "bg-white text-slate-500"
                  }`}
                >
                  {dispatchEnabled ? "ON" : "OFF"}
                </span>
              </button>
            </div>

            <div className="mt-4 grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100 pt-4">
              <StatusStat label="전체" value={`${totalCalls}건`} />
              <StatusStat label="수거 요청" value={`${pendingCalls.length}건`} />
              <StatusStat label="진행 중" value={`${activeCalls.length}건`} />
              <StatusStat label="처리 완료" value={`${completedCalls.length}건`} />
            </div>
          </section>

          <section className="rounded-[20px] bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              {profile.photoUrl ? (
                <img alt={profile.name} className="h-14 w-14 rounded-[18px] object-cover" src={profile.photoUrl} />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-lgred/10 text-lgred">
                  <UserRound size={26} />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[18px] font-bold text-ink">{profile.name}</h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                    {dispatchEnabled ? "배차 수신 중" : "배차 중지"}
                  </span>
                </div>

                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[12px] font-bold text-amber-700">
                  <Star className="fill-current" size={14} />
                  평점 {profile.rating.toFixed(1)}
                </div>
              </div>
            </div>
          </section>

          {errorMessage ? (
            <div className="rounded-[18px] bg-red-50 px-4 py-4 text-sm font-semibold leading-6 text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-[18px] bg-white px-4 py-4 text-sm font-semibold leading-6 text-slate-500 shadow-sm">
              배차 현황을 불러오는 중입니다...
            </div>
          ) : null}
        </div>

        <CrewBottomNav />
      </div>
    </CrewPhoneShell>
  );
}

function StatusStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 first:pl-0 last:pr-0">
      <p className="text-center text-[20px] font-bold leading-none text-ink">{value}</p>
      <p className="mt-1 text-center text-[11px] font-bold text-slate-500">{label}</p>
    </div>
  );
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
