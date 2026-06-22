"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AppEntryHomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (window.location.pathname !== "/") {
      router.replace("/");
    }
  }, [router]);

  return null;
}
