"use client";

// 쉐도잉 진행도 — 체득 완료 표시 (localStorage, MVP)
//   per-user DB 동기화는 V2. 현재는 dogfooding(본인 1인) 기준 로컬 저장.

import { useState, useEffect, useCallback } from "react";

const KEY = "soridam:shadowing:done";

export function useShadowingProgress() {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // 최초 1회 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setDone(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* noop */
    }
    setLoaded(true);
  }, []);

  const persist = useCallback((s: Set<string>) => {
    try {
      localStorage.setItem(KEY, JSON.stringify([...s]));
    } catch {
      /* noop */
    }
  }, []);

  const toggle = useCallback(
    (id: string) => {
      setDone((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const markDone = useCallback(
    (id: string) => {
      setDone((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const isDone = useCallback((id: string) => done.has(id), [done]);

  return { done, isDone, toggle, markDone, totalDone: done.size, loaded };
}
