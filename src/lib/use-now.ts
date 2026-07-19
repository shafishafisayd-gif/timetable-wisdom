import { useEffect, useState } from "react";

/**
 * Returns the current time, but only after client hydration.
 * On the server (and the first client render) it returns `null` so that
 * SSR markup matches the initial client markup and avoids hydration
 * mismatches for time-dependent UI.
 */
export function useNow(intervalMs: number = 30_000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
