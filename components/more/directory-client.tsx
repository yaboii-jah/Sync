"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { Person } from "@/lib/supabase/queries/directory";
import { EmptyConstellation } from "@/components/empty-states";

type FilterKey = "all" | "speaker" | "host_panelist" | "sponsor";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "speaker", label: "Speakers" },
  { key: "host_panelist", label: "Hosts & Panelists" },
  { key: "sponsor", label: "Sponsors" },
];

const ROLE_LABELS: Record<string, string> = {
  speaker: "Speaker",
  host: "Host",
  panelist: "Panelist",
  sponsor: "Sponsor",
};

function matchesFilter(person: Person, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "host_panelist") {
    return person.role === "host" || person.role === "panelist";
  }
  return person.role === filter;
}

function PersonAvatar({ person }: { person: Person }) {
  if (person.photo_url) {
    return (
      <Image
        src={person.photo_url}
        alt=""
        width={48}
        height={48}
        unoptimized
        className="h-12 w-12 shrink-0 rounded-full border border-border-default object-cover"
      />
    );
  }
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border-default bg-bg-surface font-display text-xl text-text-primary">
      {person.name.charAt(0).toUpperCase()}
    </span>
  );
}

export function DirectoryClient({ people }: { people: Person[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [activePerson, setActivePerson] = useState<Person | null>(null);

  const visible = useMemo(
    () => people.filter((person) => matchesFilter(person, filter)),
    [people, filter],
  );

  const chipClass = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors ${
      active
        ? "bg-pastel-yellow text-charcoal"
        : "border border-border-default text-text-muted hover:text-text-primary"
    }`;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={chipClass(filter === f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {visible.map((person) => (
          <button
            key={person.id}
            type="button"
            onClick={() => setActivePerson(person)}
            aria-haspopup="dialog"
            className="flex w-full items-center gap-4 rounded-2xl border border-border-default bg-bg-base px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:bg-accent-primary/20"
          >
            <PersonAvatar person={person} />
            <span className="min-w-0">
              <span className="block truncate font-bold text-text-primary">
                {person.name}
              </span>
              <span className="block truncate text-sm text-text-muted">
                {ROLE_LABELS[person.role] ?? person.role}
                {person.organization ? ` · ${person.organization}` : ""}
              </span>
            </span>
          </button>
        ))}
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-border-default bg-bg-base px-5 py-8 text-center">
            <EmptyConstellation />
            <p className="mt-3 text-sm text-text-muted">
              No one in this group yet.
            </p>
          </div>
        ) : null}
      </div>

      {activePerson ? (
        <PersonBioModal
          person={activePerson}
          onClose={() => setActivePerson(null)}
        />
      ) : null}
    </div>
  );
}

function PersonBioModal({
  person,
  onClose,
}: {
  person: Person;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={person.name}
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="modal-card relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl border border-border-default bg-bg-base px-6 py-6 shadow-[0_0_40px_rgba(188,131,48,0.3)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center rounded-full bg-accent-primary/50 px-2.5 py-0.5 text-xs font-bold text-text-primary">
            {ROLE_LABELS[person.role] ?? person.role}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <span className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-border-default">
            {person.photo_url ? (
              <Image
                src={person.photo_url}
                alt=""
                width={64}
                height={64}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-bg-surface font-display text-2xl text-text-primary">
                {person.name.charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          <div>
            <h2 className="font-display text-3xl text-text-primary uppercase">
              {person.name}
            </h2>
            {person.organization ? (
              <p className="text-sm text-text-muted">{person.organization}</p>
            ) : null}
          </div>
        </div>

        {person.bio ? (
          <p className="mt-4 leading-relaxed text-text-primary/90">{person.bio}</p>
        ) : null}

        {person.linkedin_url ? (
          <a
            href={person.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-pastel-yellow px-5 py-3 text-xs font-bold tracking-[0.14em] text-charcoal uppercase transition-colors hover:bg-light-green"
          >
            <ExternalLink className="h-4 w-4" />
            View LinkedIn profile
          </a>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-full border border-border-default px-5 py-3 text-xs font-bold tracking-[0.14em] text-text-muted uppercase transition-colors hover:text-text-primary"
        >
          Close
        </button>
      </div>
    </div>
  );
}
