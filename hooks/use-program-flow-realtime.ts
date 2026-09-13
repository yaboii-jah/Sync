import { useRealtimeRefetch } from "./use-realtime-refetch";

export function useProgramFlowRealtime(eventId: string, onChange: () => void) {
  useRealtimeRefetch(
    [
      { table: "sessions", filter: `event_id=eq.${eventId}` },
      { table: "my_flow_bookmarks", filter: `event_id=eq.${eventId}` },
      { table: "events", filter: `id=eq.${eventId}` },
      { table: "speakers_sponsors", filter: `event_id=eq.${eventId}` },
      { table: "session_speakers", filter: `event_id=eq.${eventId}` },
    ],
    onChange,
  );
}
