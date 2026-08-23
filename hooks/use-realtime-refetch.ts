"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const REFETCH_DEBOUNCE_MS = 250;

export function useRealtimeRefetch(tables: string[], onChange: () => void) {
  const onChangeRef = useRef(onChange);
  const tableKey = tables.join(",");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const supabase = createClient();
    let channel: ReturnType<
      ReturnType<typeof createClient>["channel"]
    > | null = null;

    const scheduleRefetch = () => {
      if (timeout != null) return;
      timeout = setTimeout(() => {
        timeout = null;
        onChangeRef.current();
      }, REFETCH_DEBOUNCE_MS);
    };

    async function connect() {
      // Recover the auth session BEFORE joining so the socket authorizes as
      // the signed-in user — otherwise postgres_changes filters everything
      // out silently (tables have no anon policies).
      await supabase.auth.getSession();
      if (cancelled) return;

      channel = supabase.channel("realtime:" + tableKey);
      for (const table of tables) {
        channel = channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          scheduleRefetch,
        );
      }
      channel.subscribe();
    }

    void connect();

    return () => {
      cancelled = true;
      if (timeout != null) clearTimeout(timeout);
      if (channel) void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey]);
}
