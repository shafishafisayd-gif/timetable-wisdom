import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to postgres_changes on evaluations and round_picks and invalidates
 * the relevant TanStack Query caches so all devices stay in sync live.
 */
export function useRealtimeSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("maljaa-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "evaluations" },
        () => {
          qc.invalidateQueries({ queryKey: ["evaluations"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "round_picks" },
        () => {
          qc.invalidateQueries({ queryKey: ["round_picks"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => {
          qc.invalidateQueries({ queryKey: ["students"] });
          qc.invalidateQueries({ queryKey: ["student"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
