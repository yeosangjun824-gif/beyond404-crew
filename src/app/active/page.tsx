"use client";

import { Truck } from "lucide-react";
import { CrewCallsListPage } from "@/components/CrewCallsListPage";
import { fetchActiveCrewCalls } from "@/lib/crew-api";

export default function ActiveCallsPage() {
  return (
    <CrewCallsListPage
      actionLabel="진행 화면 열기"
      emptyMessage="현재 진행 중인 수거가 없습니다."
      fetchCalls={fetchActiveCrewCalls}
      icon={Truck}
      subtitle="수락한 콜의 이동 상태와 처리 진행 상황을 이어서 관리할 수 있어요."
      title="진행 중"
      toHref={(pickupRequestId) => `/calls/${pickupRequestId}/active`}
    />
  );
}
