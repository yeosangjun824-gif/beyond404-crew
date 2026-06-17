"use client";

import { ClipboardList } from "lucide-react";
import { CrewCallsListPage } from "@/components/CrewCallsListPage";
import { fetchPendingCrewCalls } from "@/lib/crew-api";

export default function PendingCallsPage() {
  return (
    <CrewCallsListPage
      actionLabel="콜 상세 보기"
      emptyMessage="현재 수락 대기 중인 수거 요청이 없습니다."
      fetchCalls={fetchPendingCrewCalls}
      icon={ClipboardList}
      subtitle="새로 들어온 예약과 바로콜을 확인하고 수락할 수 있어요."
      title="수거 요청"
      toHref={(pickupRequestId) => `/calls/${pickupRequestId}`}
    />
  );
}
