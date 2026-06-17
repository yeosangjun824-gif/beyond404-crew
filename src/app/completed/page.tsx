"use client";

import { CheckCircle2 } from "lucide-react";
import { CrewCallsListPage } from "@/components/CrewCallsListPage";
import { fetchCompletedCrewCalls } from "@/lib/crew-api";

export default function CompletedCallsPage() {
  return (
    <CrewCallsListPage
      actionLabel="완료 내역 보기"
      emptyMessage="아직 처리 완료된 수거 건이 없습니다."
      fetchCalls={fetchCompletedCrewCalls}
      icon={CheckCircle2}
      subtitle="처리가 완료된 수거 이력을 최신순으로 확인할 수 있어요."
      title="처리 완료"
      toHref={(pickupRequestId) => `/calls/${pickupRequestId}`}
    />
  );
}
