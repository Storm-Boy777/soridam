"use client";

import { useState, useEffect } from "react";
import { useEventDrawStore } from "@/lib/stores/eventDrawStore";
import PasswordGate from "@/components/event-draw/PasswordGate";
import EventDrawClient from "./EventDrawClient";

export default function EventDrawPage() {
  const isAuthenticated = useEventDrawStore((s) => s.isAuthenticated);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useEventDrawStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (useEventDrawStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PasswordGate />;
  }

  return <EventDrawClient />;
}
