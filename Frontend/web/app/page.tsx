"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated } = useUserStore();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!hasRedirected.current) {
      hasRedirected.current = true;
      console.log("Root page - redirecting. isAuthenticated:", isAuthenticated);

      if (isAuthenticated) {
        router.replace("/map");
      } else {
        router.replace("/login");
      }
    }
  }, [isAuthenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
    </div>
  );
}
