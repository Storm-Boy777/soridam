"use client";

import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { getQueryClient } from "@/lib/react-query";
import { createClient } from "@/lib/supabase";
import { logUserActivity } from "@/lib/actions/activity-log";

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  // Auth 상태 변화 시 로그인 활동 기록 (브라우저 세션당 1회)
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        const already = sessionStorage.getItem("soridam_login_logged");
        if (!already) {
          sessionStorage.setItem("soridam_login_logged", "1");
          logUserActivity("login", {
            user_agent: navigator.userAgent,
            screen: `${screen.width}x${screen.height}`,
          });
        }
      } else if (event === "SIGNED_OUT") {
        sessionStorage.removeItem("soridam_login_logged");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-center"
        offset={300}
        duration={3000}
        toastOptions={{
          style: {
            background: "#1A1A2E",
            color: "#FAFAF7",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            fontSize: "14px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
