"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const REFETCH_DEBOUNCE_MS = 250;

export interface RealtimeTableSubscription {
  table: string;
  filter?: string;
}

export function useRealtimeRefetch(subscriptions: RealtimeTableSubscription[], onChange: () => void) {
  const onChangeRef = useRef(onChange);
  const subscriptionKey = JSON.stringify(subscriptions);

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

      const parsed = JSON.parse(subscriptionKey) as RealtimeTableSubscription[];
      channel = supabase.channel("realtime:" + subscriptionKey);
      for (const subscription of parsed) {
        channel = channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: subscription.table, ...(subscription.filter ? { filter: subscription.filter } : {}) },
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
  }, [subscriptionKey]);
}
