export interface RaffleAttendee {
  id: string;
  name: string;
}

export interface RaffleEntry {
  id: string;
  label: string;
  isDuplicate: boolean;
}

function normalizedName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

/** Formats the names-only payload that may leave the protected admin workspace. */
export function formatRaffleEntries(attendees: readonly RaffleAttendee[]): RaffleEntry[] {
  const ordered = attendees
    .map((attendee) => ({ ...attendee, name: normalizedName(attendee.name) }))
    .filter((attendee) => attendee.name.length > 0)
    .sort((left, right) => {
      const leftKey = left.name.toLowerCase();
      const rightKey = right.name.toLowerCase();
      if (leftKey < rightKey) return -1;
      if (leftKey > rightKey) return 1;
      return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
    });
  const totals = new Map<string, number>();

  for (const attendee of ordered) {
    const key = attendee.name.toLowerCase();
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }

  const positions = new Map<string, number>();
  return ordered.map((attendee) => {
    const key = attendee.name.toLowerCase();
    const total = totals.get(key) ?? 0;
    const position = (positions.get(key) ?? 0) + 1;
    positions.set(key, position);

    return {
      id: attendee.id,
      label: total > 1 ? `${attendee.name} #${position}` : attendee.name,
      isDuplicate: total > 1,
    };
  });
}

export function raffleText(entries: readonly RaffleEntry[]): string {
  return entries.map((entry) => entry.label).join("\n");
}
