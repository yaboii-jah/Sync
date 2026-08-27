"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getUnreadAlertCount,
  markAlertsRead,
} from "@/lib/supabase/queries/alert-reads";

interface AlertsCountContextValue {
  unreadCount: number;
  markAllRead: () => void;
}

const AlertsCountContext = createContext<AlertsCountContextValue>({
  unreadCount: 0,
  markAllRead: () => {},
});

export function useAlertsCount() {
  return useContext(AlertsCountContext);
}

export function AlertsCountProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const client = createClient();
        const count = await getUnreadAlertCount(client);
        if (!cancelled) setUnreadCount(count);
      } catch {
        // signed out or network hiccup — badge stays hidden
      }
    }

    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null =
      null;
    let channelClient: ReturnType<typeof createClient> | null = null;

    void (async () => {
      try {
        const c = createClient();
        await c.auth.getSession();
      } catch {}
      if (cancelled) return;
      void refresh();
    })();

    void (async () => {
      const supabase = createClient();
      channelClient = supabase;
      try {
        await supabase.auth.getSession();
      } catch {}
      if (cancelled) return;
      channel = supabase
        .channel("alerts-count")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications" },
          () => {
            if (!cancelled) void refresh();
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel && channelClient) {
        void channelClient.removeChannel(channel);
      }
    };
  }, []);

  function markAllRead() {
    setUnreadCount(0);
    void (async () => {
      const client = createClient();
      await markAlertsRead(client);
    })();
  }

  return (
    <AlertsCountContext.Provider value={{ unreadCount, markAllRead }}>
      {children}
    </AlertsCountContext.Provider>
  );
}
