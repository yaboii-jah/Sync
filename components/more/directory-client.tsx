"use client";

import Image from "next/image";
import { useState } from "react";
import { Button, Card, Modal, Typography } from "@/components/ui";
import { ExternalLink, Users } from "lucide-react";
import type { Person } from "@/lib/supabase/queries/directory";
import { EmptyState } from "@/components/empty-states";
import { primaryLinkClass } from "@/components/ui/link-button";

function PersonPortrait({
  person,
  variant,
}: {
  person: Person;
  variant: "tile" | "modal";
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(person.photo_url) && !imageFailed;

  return (
    <div
      className={`relative overflow-hidden bg-surface-secondary ${
        variant === "tile"
          ? "h-20 w-20 shrink-0 rounded-full sm:h-auto sm:w-auto sm:aspect-[4/5] sm:rounded-none"
          : "aspect-square w-24 shrink-0 rounded-2xl sm:w-28"
      }`}
    >
      {hasImage ? (
        <Image
          src={person.photo_url!}
          alt={`Portrait of ${person.name}`}
          fill
          sizes={variant === "tile" ? "(min-width: 1024px) 18vw, (min-width: 640px) 40vw, 80px" : "112px"}
          unoptimized
          className="object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span
          aria-hidden
          className="flex size-full items-center justify-center bg-surface-secondary text-3xl font-semibold text-foreground sm:text-5xl"
        >
          {person.name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export function DirectoryClient({ people }: { people: Person[] }) {
  const [activePerson, setActivePerson] = useState<Person | null>(null);

  if (people.length === 0) {
    return (
      <Card variant="transparent" className="border border-dashed border-border">
        <EmptyState
          icon={<Users />}
          title="Speakers are being confirmed"
          description="The event lineup will appear here once it is ready."
        />
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {people.map((person) => (
          <Card key={person.id} className="group overflow-hidden p-0 transition-transform hover:-translate-y-0.5 active:scale-[0.98] motion-reduce:transform-none">
            <button
              type="button"
              onClick={() => setActivePerson(person)}
              aria-haspopup="dialog"
              className="flex w-full items-center text-left sm:block"
            >
              <PersonPortrait person={person} variant="tile" />
              <span className="min-w-0 flex-1 px-4 py-3.5 sm:block sm:px-4 sm:py-4">
                <Typography type="body" weight="semibold" className="truncate">
                  {person.name}
                </Typography>
                <Typography type="body-xs" color="muted" className="mt-1 truncate">
                  {person.role === "panelist" ? `Panelist · ${person.organization ?? ""}` : person.organization ?? "Speaker"}
                </Typography>
                <Typography type="body-xs" weight="medium" className="mt-2 text-accent">
                  View profile
                </Typography>
              </span>
            </button>
          </Card>
        ))}
      </div>

      {activePerson ? (
        <PersonProfileModal
          person={activePerson}
          onClose={() => setActivePerson(null)}
        />
      ) : null}
    </>
  );
}

function PersonProfileModal({
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
        isDismissable
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Modal.Container size="md">
          <Modal.Dialog aria-label={person.name}>
            <Modal.CloseTrigger />

            <Modal.Body className="flex flex-col gap-6">
              <div className="flex items-start gap-4 pr-8">
                <PersonPortrait person={person} variant="modal" />
                <div className="min-w-0 pt-1">
                  <Typography type="body-xs" weight="semibold" className="tracking-[0.12em] text-accent uppercase">
                    {person.role === "panelist" ? "Panelist" : "Speaker"}
                  </Typography>
                  <Modal.Heading className="mt-2 text-xl leading-tight">
                    {person.name}
                  </Modal.Heading>
                  {person.organization ? (
                    <Typography type="body-sm" color="muted" className="mt-2">
                      {person.organization}
                    </Typography>
                  ) : null}
                </div>
              </div>
            </Modal.Body>

            <Modal.Footer className="flex-col gap-3 sm:flex-row">
              {person.linkedin_url ? (
                <a
                  href={person.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${primaryLinkClass} w-full sm:w-auto`}
                >
                  <ExternalLink className="size-4" aria-hidden />
                  LinkedIn profile
                </a>
              ) : null}
              <Button variant="secondary" fullWidth onPress={onClose} className="sm:w-auto">
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
