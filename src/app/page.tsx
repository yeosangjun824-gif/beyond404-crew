"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardList, Star, Truck, UserRound } from "lucide-react";
import { CrewBottomNav } from "@/components/CrewBottomNav";
import { CrewPhoneShell } from "@/components/CrewPhoneShell";
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
  reviewSummary: string[];
};

const DEFAULT_CREW_PROFILE: CrewProfileSummary = {
  name: "LG 수거 크루",
  photoUrl: null,
  rating: 4.9,
  reviewSummary: ["친절하고 신속한 수거 진행", "약속 시간 준수 및 안전 처리"],
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

    void loadSummary();
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

  const toggleDispatch = () => {
    setDispatchEnabled((enabled) => {
      const next = !enabled;
      if (next) {
        void loadSummary();
      }
      return next;
    });
  };

  return (
    <CrewPhoneShell>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-28 pt-4 phone-scroll">
        <header className="grid grid-cols-[40px_1fr_64px] items-center">
          <button
            aria-label="이전"
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-white"
            type="button"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <p className="text-[13px] font-extrabold leading-none text-lgred">LG ThinQ</p>
            <p className="mt-1 text-[12px] font-semibold text-slate-600">Crew Home</p>
          </div>
          <button className="text-right text-[12px] font-bold text-slate-600" type="button">
            로그아웃
          </button>
        </header>

        <section className="mt-7">
          <p className="text-[15px] font-bold text-slate-600">{profile.name}님, 안녕하세요</p>
          <h1 className="mt-2 text-[22px] font-extrabold leading-snug text-ink">
            오늘 배차 상태와 내 정보를 한눈에 확인해 보세요
          </h1>
        </section>

        <section className="mt-5 rounded-[22px] bg-white px-5 py-5 shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-bold text-slate-500">오늘 배차 상태</p>
              <p className="mt-1 text-[28px] font-extrabold leading-none text-ink">
                {dispatchEnabled ? "수신 중" : "수신 중지"}
              </p>
              <p className="mt-3 text-[12px] font-medium text-slate-500">
                {dispatchEnabled ? "새 수거 요청을 받을 수 있어요" : "요청 수신이 잠시 멈춘 상태예요"}
              </p>
            </div>
            <button
              aria-pressed={dispatchEnabled}
              className={`flex h-9 w-[82px] items-center rounded-full px-1 transition ${
                dispatchEnabled ? "justify-end bg-lgred/10" : "justify-start bg-slate-100"
              }`}
              onClick={toggleDispatch}
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

          <div className="mt-5 h-px bg-slate-100" />

          <div className="mt-4 grid grid-cols-4 divide-x divide-slate-100">
            <StatusStat label="전체" value={`${totalCalls}건`} />
            <StatusStat label="수거 요청" value={`${pendingCalls.length}건`} />
            <StatusStat label="진행 중" value={`${activeCalls.length}건`} />
            <StatusStat label="처리 완료" value={`${completedCalls.length}건`} />
          </div>
        </section>

        <section className="mt-4 rounded-[22px] bg-white px-5 py-5 shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
          <div className="flex items-start gap-4">
            {profile.photoUrl ? (
              <img
                alt={profile.name}
                className="h-16 w-16 rounded-[22px] object-cover"
                src={profile.photoUrl}
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-lgred/10 text-lgred">
                <UserRound size={28} />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[20px] font-extrabold text-ink">{profile.name}</h2>
                <span className="rounded-full bg-cloud px-3 py-1 text-[11px] font-bold text-slate-600">
                  {dispatchEnabled ? "배차 수신 중" : "배차 중지"}
                </span>
              </div>

              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[12px] font-bold text-amber-700">
                <Star size={14} className="fill-current" />
                평점 {profile.rating.toFixed(1)}
              </div>

              <p className="mt-3 text-[13px] font-semibold text-slate-500">
                고객에게 노출되는 기본 프로필과 최근 후기 요약을 확인할 수 있어요.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[18px] bg-cloud px-4 py-4">
            <p className="text-[12px] font-extrabold text-slate-500">최근 후기 요약</p>
            <div className="mt-3 space-y-2">
              {profile.reviewSummary.map((summary, index) => (
                <p key={`${summary}-${index}`} className="text-[13px] font-semibold leading-6 text-ink">
                  • {summary}
                </p>
              ))}
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="mt-4 rounded-[18px] bg-red-50 px-4 py-4 text-sm font-semibold leading-6 text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-4 rounded-[18px] bg-white px-4 py-4 text-sm font-semibold leading-6 text-slate-500 shadow-sm">
            배차 현황을 불러오는 중입니다...
          </div>
        ) : null}
      </div>
      <CrewBottomNav />
    </CrewPhoneShell>
  );
}

function StatusStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 first:pl-0 last:pr-0">
      <p className="text-center text-[20px] font-extrabold leading-none text-ink">{value}</p>
      <p className="mt-2 text-center text-[12px] font-medium text-slate-500">{label}</p>
    </div>
  );
}

function resolveCrewProfile(calls: CrewCall[]): CrewProfileSummary {
  for (const call of calls) {
    if (call.crewProfile?.name?.trim()) {
      return {
        name: call.crewProfile.name.trim(),
        photoUrl: call.crewProfile.photoUrl?.trim() || null,
        rating: call.crewProfile.rating || DEFAULT_CREW_PROFILE.rating,
        reviewSummary:
          call.crewProfile.reviewSummary?.filter((value) => value.trim().length > 0) || DEFAULT_CREW_PROFILE.reviewSummary,
      };
    }
  }

  return DEFAULT_CREW_PROFILE;
}
