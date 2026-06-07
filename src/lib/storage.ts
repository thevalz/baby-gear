import { useEffect, useState } from 'react';

/**
 * State that persists to localStorage so edits survive a page refresh.
 * Falls back to `initial` when nothing is stored or parsing fails.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored) as T;
    } catch {
      /* ignore corrupt storage */
    }
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage may be full or unavailable */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
