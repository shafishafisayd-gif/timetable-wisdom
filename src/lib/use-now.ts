import { useEffect, useState } from "react";

// Stable local-time placeholder used during SSR and the first client render so
// hydrated markup matches even when server and browser time zones differ.
// Avoid Date(0): getHours() varies by time zone and can change rendered chips.
const SSR_PLACEHOLDER = new Date(2000, 0, 1, 0, 0, 0, 0);

export function useNow(intervalMs: number = 30_000): Date {
  const [now, setNow] = useState<Date>(SSR_PLACEHOLDER);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
