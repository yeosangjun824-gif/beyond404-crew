"use client";

import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronRight,
  Clock,
  LogOut,
  MapPin,
  PackageCheck,
  Phone,
  RefreshCw,
  ShieldCheck,
  Truck,
  UserCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Screen = "login" | "join" | "ready" | "dashboard";

type CrewCall = {
  id: number;
  status: string;
  appliance?: {
    applianceType: string;
    brand: string;
    modelName?: string;
  };
  pickupRequest?: {
    pickupRequestId: number;
    pickupType: string;
    status: string;
    crewName: string | null;
    address: string | null;
    scheduledAt: string;
  } | null;
  tracking?: {
    message: string;
  };
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (typeof window === "undefined"
    ? "http://127.0.0.1:8080"
    : `${window.location.protocol}//${window.location.hostname}:8080`);

async function crewRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Crew API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export default function CrewAppPage() {
  const [screen, setScreen] = useState<Screen>("login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#202124] px-3 py-8">
      <section className="relative w-[min(100%,424px)] rounded-[52px] border-[8px] border-[#090a0f] bg-[#090a0f] p-[3px] shadow-phone">
        <div className="aspect-[402/874] overflow-hidden rounded-[43px] bg-white">
          <div className="flex h-full flex-col">
            <PhoneStatusBar />
            {screen === "login" ? (
              <LoginScreen onJoin={() => setScreen("join")} onLogin={() => setScreen("ready")} />
            ) : null}
            {screen === "join" ? (
              <JoinScreen onBack={() => setScreen("login")} onComplete={() => setScreen("ready")} />
            ) : null}
            {screen === "ready" ? <ReadyScreen onStart={() => setScreen("dashboard")} /> : null}
            {screen === "dashboard" ? <CrewDashboard onLogout={() => setScreen("login")} /> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function PhoneStatusBar() {
  return (
    <div className="flex h-[62px] shrink-0 items-start justify-between px-8 pt-4 text-[14px] font-black text-black">
      <span>11:07</span>
      <div className="flex items-center gap-1.5">
        <span className="flex items-end gap-0.5">
          <span className="h-2 w-1 rounded-sm bg-black" />
          <span className="h-3 w-1 rounded-sm bg-black" />
          <span className="h-4 w-1 rounded-sm bg-black" />
        </span>
        <span className="h-3 w-4 rounded-t-full border-2 border-b-0 border-black" />
        <span className="relative h-4 w-7 rounded-md bg-slate-200">
          <span className="absolute left-0 top-0 h-full w-2 rounded-l-md bg-[#ffd52e]" />
          <span className="absolute right-1 top-1 text-[10px] leading-none">20</span>
        </span>
      </div>
    </div>
  );
}

function LoginScreen({ onJoin, onLogin }: { onJoin: () => void; onLogin: () => void }) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [saveId, setSaveId] = useState(true);
  const canLogin = loginId.trim().length > 0 && password.trim().length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6 pb-8 pt-20">
      <div>
        <p className="text-[42px] font-black leading-none text-black">LG SwapIt Crew</p>
        <h1 className="mt-3 text-[31px] leading-tight text-black">수거를 시작해볼까요?</h1>
      </div>

      <div className="mt-16 space-y-3">
        <TextInput placeholder="아이디" value={loginId} onChange={setLoginId} />
        <TextInput placeholder="비밀번호" type="password" value={password} onChange={setPassword} />
      </div>

      <button className="mt-6 flex items-center gap-3 text-left" onClick={() => setSaveId((value) => !value)} type="button">
        <CheckBox checked={saveId} />
        <span className="text-xl font-bold text-black">아이디 저장</span>
      </button>

      <button
        className={`mt-14 h-14 w-full rounded-[8px] text-2xl font-black text-white ${
          canLogin ? "bg-lgred" : "bg-[#d9d9d9]"
        }`}
        disabled={!canLogin}
        onClick={onLogin}
        type="button"
      >
        로그인
      </button>

      <div className="mt-8 text-center text-lg font-semibold text-slate-400">
        아이디 찾기 <span className="mx-3 text-slate-300">|</span> 비밀번호 찾기
      </div>

      <button className="mt-auto text-center text-xl font-bold text-black" onClick={onJoin} type="button">
        처음이라면? <span className="font-black text-lgred">크루 가입하기</span>
        <ChevronRight className="inline align-[-3px]" size={23} />
      </button>
    </div>
  );
}

function JoinScreen({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [crewId, setCrewId] = useState("");
  const [region, setRegion] = useState("New Delhi");
  const [vehicle, setVehicle] = useState("LG Pickup Van");
  const [terms, setTerms] = useState(false);
  const canNext = step === 1 ? crewId.length >= 4 : step === 2 ? Boolean(region && vehicle) : terms;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col px-6 pb-8">
      <div className="flex items-center gap-3">
        <button className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200" onClick={step === 1 ? onBack : () => setStep((value) => value - 1)} type="button">
          <ArrowLeft size={18} />
        </button>
        <StepDots current={step} total={3} />
      </div>

      {step === 1 ? (
        <section className="pt-14">
          <Title>크루 계정을 등록해주세요</Title>
          <div className="mt-12">
            <Label>아이디</Label>
            <TextInput placeholder="사용하실 아이디" value={crewId} onChange={setCrewId} />
          </div>
          <InfoBox title="가입 안내" items={["MVP에서는 휴대폰 본인인증을 생략합니다.", "실서비스에서는 신원 확인과 서류 심사를 연결합니다."]} />
        </section>
      ) : null}

      {step === 2 ? (
        <section className="pt-14">
          <Title>활동 정보를 입력해주세요</Title>
          <div className="mt-12 space-y-7">
            <SelectField label="수거 가능 지역" value={region} options={["New Delhi", "Gurugram", "Noida", "Bengaluru"]} onChange={setRegion} />
            <SelectField label="수거 수단" value={vehicle} options={["LG Pickup Van", "Small Truck", "Partner Vehicle"]} onChange={setVehicle} />
            <InfoBox title="처리 가능 품목" items={["세탁기, 냉장고, 에어컨, TV를 우선 지원합니다.", "수거 완료 후 사진과 메모를 등록해야 합니다."]} />
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="pt-14">
          <Title>약관 동의가 필요해요</Title>
          <button className="mt-12 flex items-center gap-4 text-left" onClick={() => setTerms((value) => !value)} type="button">
            <CheckBox checked={terms} />
            <span className="text-2xl font-black text-black">필수 약관 전체 동의</span>
          </button>
          <InfoBox title="포함 약관" items={["위치 기반 서비스 이용", "개인정보 수집 이용", "수거 안전 수칙", "수거품 사진 등록 동의"]} />
        </section>
      ) : null}

      <button
        className={`mt-auto h-14 w-full rounded-[8px] text-2xl font-black text-white ${
          canNext ? "bg-lgred" : "bg-[#d9d9d9]"
        }`}
        disabled={!canNext}
        onClick={() => (step < 3 ? setStep((value) => value + 1) : onComplete())}
        type="button"
      >
        {step < 3 ? "다음으로" : "가입 완료"}
      </button>
    </div>
  );
}

function ReadyScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-6 pb-8 pt-24">
      <h1 className="text-[42px] font-medium leading-tight text-black">
        첫 수거를 위해
        <br />
        준비해볼까요?
      </h1>
      <div className="mt-16 space-y-8">
        {["수거 요청 조회", "출발/도착 처리", "수거 완료 사진 등록"].map((item, index) => (
          <div key={item} className="flex items-center gap-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-2xl font-black text-slate-500">
              {index + 1}
            </span>
            <span className="text-2xl font-bold text-slate-500">{item}</span>
          </div>
        ))}
      </div>
      <button className="mt-auto h-14 w-full rounded-[8px] bg-lgred text-2xl font-black text-white" onClick={onStart} type="button">
        시작하기
      </button>
    </div>
  );
}

function CrewDashboard({ onLogout }: { onLogout: () => void }) {
  const [calls, setCalls] = useState<CrewCall[]>([]);
  const [activeCall, setActiveCall] = useState<CrewCall | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("받을 수 있는 콜을 확인해주세요.");

  const selectedCall = activeCall ?? calls[0] ?? null;
  const pickupRequestId = selectedCall?.pickupRequest?.pickupRequestId;

  const loadCalls = async () => {
    setLoading(true);
    try {
      const data = await crewRequest<CrewCall[]>("/api/crew/calls");
      setCalls(data);
      setMessage(data.length > 0 ? "새 수거 요청이 있어요." : "현재 받을 수 있는 콜이 없어요.");
    } catch {
      setMessage("백엔드 연결을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCalls();
  }, []);

  const runPickupAction = async (action: "accept" | "depart" | "arrive" | "complete") => {
    if (!pickupRequestId) {
      setMessage("먼저 받을 수 있는 콜이 필요해요.");
      return;
    }

    setLoading(true);
    try {
      const path =
        action === "accept"
          ? `/api/crew/calls/${pickupRequestId}/accept`
          : action === "depart"
            ? `/api/crew/pickups/${pickupRequestId}/depart`
            : action === "arrive"
              ? `/api/crew/pickups/${pickupRequestId}/arrive`
              : `/api/crew/pickups/${pickupRequestId}/complete`;
      const data = await crewRequest<CrewCall>(path, {
        method: "POST",
        body:
          action === "complete"
            ? JSON.stringify({
                pickupPhotoFileName: "crew-pickup-proof-demo.jpg",
                inspectionMemo: "현장 수거 완료. 추가 검수 필요.",
              })
            : undefined,
      });
      setActiveCall(data);
      setMessage(actionMessage(action));
    } catch {
      setMessage("처리 중 문제가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="phone-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-lgred">AVAILABLE</p>
          <h1 className="mt-1 text-3xl font-black text-black">오늘의 수거 대기</h1>
        </div>
        <button className="rounded-[8px] bg-slate-100 px-3 py-2 text-xs font-black text-slate-500" onClick={onLogout} type="button">
          <LogOut size={14} className="inline" /> 로그아웃
        </button>
      </header>

      <section className="mt-5 rounded-[8px] bg-lgred p-4 text-white">
        <div className="flex items-center gap-3">
          <Truck size={28} />
          <div>
            <p className="text-xs font-bold text-white/70">수거 요청 조회/수락</p>
            <p className="mt-1 text-xl font-black">{selectedCall ? applianceName(selectedCall) : "대기 중"}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <MiniStat label="요청" value={`${calls.length}건`} />
          <MiniStat label="상태" value={selectedCall?.pickupRequest?.status ?? "-"} />
          <MiniStat label="유형" value={selectedCall?.pickupRequest?.pickupType ?? "-"} />
        </div>
      </section>

      <section className="mt-4 rounded-[8px] border border-slate-200 bg-white p-4">
        <InfoLine icon={<MapPin size={18} />} title="수거 위치" description={selectedCall?.pickupRequest?.address ?? "수거 요청이 없습니다."} />
        <InfoLine icon={<PackageCheck size={18} />} title="수거 품목" description={selectedCall ? applianceName(selectedCall) : "콜을 새로고침해주세요."} />
        <InfoLine icon={<ShieldCheck size={18} />} title="진행 상태" description={selectedCall?.tracking?.message ?? message} />
      </section>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <ActionButton disabled={loading} icon={<RefreshCw size={16} />} label="콜 새로고침" onClick={loadCalls} />
        <ActionButton disabled={loading || !pickupRequestId} icon={<Check size={16} />} label="수거 콜 수락" onClick={() => runPickupAction("accept")} />
        <ActionButton disabled={loading || !pickupRequestId} icon={<Truck size={16} />} label="출발 처리" onClick={() => runPickupAction("depart")} />
        <ActionButton disabled={loading || !pickupRequestId} icon={<MapPin size={16} />} label="도착 처리" onClick={() => runPickupAction("arrive")} />
      </div>

      <button
        className="mt-3 h-14 w-full rounded-[8px] bg-lgred text-xl font-black text-white disabled:bg-slate-300"
        disabled={loading || !pickupRequestId}
        onClick={() => runPickupAction("complete")}
        type="button"
      >
        수거 완료 처리
      </button>

      <div className="mt-3 rounded-[8px] bg-slate-50 p-3 text-sm font-bold leading-6 text-slate-600">
        {loading ? "처리 중..." : message}
      </div>
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <input
      className="h-14 w-full rounded-[8px] border border-slate-200 bg-white px-5 text-xl font-semibold text-black outline-none placeholder:text-slate-400 focus:border-lgred"
      placeholder={placeholder}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        className="h-14 w-full rounded-[8px] border border-slate-200 bg-white px-5 text-xl font-semibold text-black outline-none focus:border-lgred"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function Title({ children }: { children: string }) {
  return <h1 className="whitespace-pre-line text-[42px] font-medium leading-tight text-black">{children}</h1>;
}

function Label({ children }: { children: string }) {
  return <p className="mb-2 text-xl font-bold text-black">{children}</p>;
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] ${checked ? "bg-lgred" : "bg-[#d9d9d9]"}`}>
      <Check className="text-white" size={22} strokeWidth={4} />
    </span>
  );
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: total }, (_, index) => {
        const value = index + 1;
        const active = value === current;
        return (
          <span
            key={value}
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-lg font-bold ${
              active ? "border-lgred bg-lgred text-white" : "border-slate-200 text-slate-400"
            }`}
          >
            {value}
          </span>
        );
      })}
    </div>
  );
}

function InfoBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-8 rounded-[8px] bg-slate-50 p-5">
      <p className="text-xl font-black text-slate-600">{title}</p>
      <ul className="mt-3 space-y-2 text-lg leading-7 text-slate-500">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-white/12 p-2">
      <p className="text-[11px] font-bold text-white/60">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

function InfoLine({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-lgred/10 text-lgred">
        {icon}
      </span>
      <div>
        <p className="text-sm font-black text-black">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function ActionButton({
  disabled,
  icon,
  label,
  onClick,
}: {
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex h-12 items-center justify-center gap-2 rounded-[8px] bg-slate-100 text-sm font-black text-slate-700 disabled:text-slate-300"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function applianceName(call: CrewCall) {
  const model = call.appliance?.modelName ?? "LG 가전";
  const type = call.appliance?.applianceType ?? "appliance";
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

function actionMessage(action: "accept" | "depart" | "arrive" | "complete") {
  switch (action) {
    case "accept":
      return "수거 콜을 수락했어요. 고객 앱에 크루 배정 상태가 반영됩니다.";
    case "depart":
      return "출발 처리했어요. 고객 앱에서 수거 진행 상태를 확인할 수 있습니다.";
    case "arrive":
      return "도착 처리했어요. 고객에게 도착 알림이 전달됩니다.";
    case "complete":
      return "수거 완료 처리했어요. 고객 앱은 최종 검수 중 상태로 전환됩니다.";
  }
}
