"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const REFETCH_DEBOUNCE_MS = 250;

export function useProgramFlowRealtime(onChange: () => void) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const supabase = createClient();
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefetch = () => {
      if (timeout != null) return;
      timeout = setTimeout(() => {
        timeout = null;
        onChangeRef.current();
      }, REFETCH_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel("program-flow")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        scheduleRefetch,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "my_flow_bookmarks" },
        scheduleRefetch,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        scheduleRefetch,
      )
      .subscribe();

    return () => {
      if (timeout != null) clearTimeout(timeout);
      void supabase.removeChannel(channel);
    };
  }, []);
}
