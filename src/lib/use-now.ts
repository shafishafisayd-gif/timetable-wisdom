import { useEffect, useState } from "react";

// Stable placeholder used during SSR and the first client render so that
// hydrated markup matches. The real time is set inside an effect.
const SSR_PLACEHOLDER = new Date(0);

export function useNow(intervalMs: number = 30_000): Date {
  const [now, setNow] = useState<Date>(SSR_PLACEHOLDER);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
