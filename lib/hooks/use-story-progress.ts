"use client";

// 만능 스토리 학습 진행도 — localStorage ("외움" 토글). 시제 아크 진행도와 동일 패턴.

import { useCallback, useEffect, useState } from "react";

const KEY = "soridam:story:learned";

function read(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function useStoryProgress() {
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDone(read());
  }, []);

  const persist = useCallback((next: Set<string>) => {
    setDone(new Set(next));
    try {
      window.localStorage.setItem(KEY, JSON.stringify([...next]));
    } catch {
      /* 저장 실패는 무시 (학습 진행도라 치명적이지 않음) */
    }
  }, []);

  const isDone = useCallback((id: string) => done.has(id), [done]);

  const toggle = useCallback(
    (id: string) => {
      const next = new Set(done);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(next);
    },
    [done, persist]
  );

  return { isDone, toggle, totalDone: done.size };
}
