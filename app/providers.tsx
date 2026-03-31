"use client";

import { useEffect, useRef } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/react-query";
import { createClient } from "@/lib/supabase";
import { logUserActivity } from "@/lib/actions/activity-log";

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const loggedRef = useRef(false);

  // Auth 상태 변화 시 로그인 활동 기록
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" && !loggedRef.current) {
        loggedRef.current = true;
        logUserActivity("login", {
          user_agent: navigator.userAgent,
          screen: `${screen.width}x${screen.height}`,
        });
      } else if (event === "SIGNED_OUT") {
        loggedRef.current = false;
        // 로그아웃은 세션이 끊기므로 기록 불가 — 로그인 이력으로 추적
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
