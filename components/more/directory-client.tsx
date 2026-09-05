"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Avatar, Button, Card, Chip, Modal, Tabs, Typography } from "@heroui/react";
import type { Key } from "react-aria-components/Tabs";
import { ExternalLink, Users } from "lucide-react";
import type { Person } from "@/lib/supabase/queries/directory";
import { EmptyState } from "@/components/empty-states";
import { primaryLinkClass } from "@/components/ui/link-button";

type FilterKey =
  | "all"
  | "speaker"
  | "facilitator"
  | "host_panelist"
  | "sponsor";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "speaker", label: "Speakers" },
  { key: "facilitator", label: "Facilitators" },
  { key: "host_panelist", label: "Hosts & panelists" },
  { key: "sponsor", label: "Sponsors" },
];

const ROLE_LABELS: Record<string, string> = {
  speaker: "Speaker",
  facilitator: "Facilitator",
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

function PersonAvatar({ person, size }: { person: Person; size: "md" | "lg" }) {
  const px = size === "lg" ? 64 : 48;

  return (
    <Avatar size={size} className={size === "lg" ? "size-16" : "size-12"}>
      {person.photo_url ? (
        <Avatar.Image asChild src={person.photo_url}>
          <Image
            src={person.photo_url}
            alt=""
            width={px}
            height={px}
            unoptimized
          />
        </Avatar.Image>
      ) : null}
      <Avatar.Fallback>{person.name.charAt(0).toUpperCase()}</Avatar.Fallback>
    </Avatar>
  );
}

export function DirectoryClient({ people }: { people: Person[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [activePerson, setActivePerson] = useState<Person | null>(null);

  const byFilter = useMemo(() => {
    const map = {} as Record<FilterKey, Person[]>;
    for (const f of FILTERS) {
      map[f.key] = people.filter((person) => matchesFilter(person, f.key));
    }
    return map;
  }, [people]);

  function renderList(items: Person[]) {
    if (items.length === 0) {
      return (
        <Card variant="transparent" className="border-border border border-dashed">
          <EmptyState
            icon={<Users />}
            title="No one in this group yet"
            description="Speakers and sponsors appear here as they are confirmed."
          />
        </Card>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {items.map((person) => (
          <Card key={person.id}>
            <button
              type="button"
              onClick={() => setActivePerson(person)}
              aria-haspopup="dialog"
              className="flex w-full items-center gap-4 px-5 py-4 text-left"
            >
              <PersonAvatar person={person} size="md" />
              <span className="min-w-0">
                <Typography type="body-sm" weight="semibold" truncate>
                  {person.name}
                </Typography>
                <Typography type="body-xs" color="muted" truncate>
                  {ROLE_LABELS[person.role] ?? person.role}
                  {person.organization ? `, ${person.organization}` : ""}
                </Typography>
              </span>
            </button>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div>
      <Tabs
        variant="secondary"
        selectedKey={filter}
         onSelectionChange={(key: Key) => setFilter(key as FilterKey)}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="Filter people by role">
            {FILTERS.map((f, index) => (
              <Tabs.Tab key={f.key} id={f.key}>
                {index > 0 ? <Tabs.Separator /> : null}
                {f.label}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>

        {FILTERS.map((f) => (
          <Tabs.Panel key={f.key} {...{ id: f.key }} className="mt-4">
            {renderList(byFilter[f.key])}
          </Tabs.Panel>
        ))}
      </Tabs>

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
  return (
    <Modal>
      <Modal.Backdrop
        isOpen
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Modal.Container size="md">
          <Modal.Dialog aria-label={person.name}>
            <Modal.CloseTrigger />

            <Modal.Header>
              <Modal.Heading>{person.name}</Modal.Heading>
            </Modal.Header>

            <Modal.Body className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <PersonAvatar person={person} size="lg" />
                <div className="min-w-0">
                  <Chip size="sm" variant="secondary">
                    {ROLE_LABELS[person.role] ?? person.role}
                  </Chip>
                  {person.organization ? (
                    <Typography type="body-sm" color="muted" className="mt-2">
                      {person.organization}
                    </Typography>
                  ) : null}
                </div>
              </div>

              {person.bio ? (
                <Typography type="body-sm">{person.bio}</Typography>
              ) : null}
            </Modal.Body>

            <Modal.Footer className="flex flex-col gap-3">
              {person.linkedin_url ? (
                <a
                  href={person.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${primaryLinkClass} w-full`}
                >
                  <ExternalLink className="size-4" aria-hidden />
                  View LinkedIn profile
                </a>
              ) : null}
              <Button variant="secondary" fullWidth onPress={onClose}>
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
