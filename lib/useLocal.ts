"use client";
import { useCallback, useEffect, useRef, useState } from "react";
/** localStorage-backed state, namespaced per app + user. `ready` flips true after the first read (avoids hydration flashes). */
export function useLocal<T>(ns: string, key: string, initial: T) {
  const k = `loomisdead:${ns}:${key}`;
  const [v, setV] = useState<T>(initial); const [ready, setReady] = useState(false); const first = useRef(true);
  useEffect(() => { try { const raw = localStorage.getItem(k); if (raw) setV(JSON.parse(raw)); } catch { /* ignore */ } setReady(true); }, [k]);
  useEffect(() => { if (first.current) { first.current = false; return; } if (ready) try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ } }, [v, ready, k]);
  const set = useCallback((f: T | ((p: T) => T)) => setV(f as any), []);
  return [v, set, ready] as const;
}
