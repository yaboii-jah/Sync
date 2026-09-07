import { useRealtimeRefetch } from "./use-realtime-refetch";

export function useProgramFlowRealtime(onChange: () => void) {
  useRealtimeRefetch(
    ["sessions", "my_flow_bookmarks", "session_seat_claims", "events"],
    onChange,
  );
}
