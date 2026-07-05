import { useCallback, useState } from 'react';

/**
 * Like useState, but the value is mirrored to `sessionStorage` under `key`, so
 * it survives component remounts (tab switches, detail↔back) and page reloads
 * for the life of the browser tab — and is cleared when the tab closes. Used to
 * persist per-module sort/filter in the comparison grid within a session.
 */
export function useSessionState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw != null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof v === 'function' ? (v as (prev: T) => T)(prev) : v;
        try {
          sessionStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* storage unavailable — keep it in memory only */
        }
        return next;
      });
    },
    [key],
  );

  return [state, set];
}
