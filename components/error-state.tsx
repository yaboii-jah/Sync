"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { Card, Typography } from "@/components/ui/static";
import { RotateCcw } from "lucide-react";

interface ErrorStateProps {
  title: string;
  description: string;
  reference?: string;
  retry?: () => void;
  homeHref?: string;
  homeLabel?: string;
}

export function ErrorState({
  title,
  description,
  reference,
  retry,
  homeHref = "/home",
  homeLabel = "Back to Home",
}: ErrorStateProps) {
  return (
    <main className="flex min-h-[70vh] flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <Card.Content className="items-center text-center">
          <div
            aria-hidden
            className="relative flex size-16 items-center justify-center rounded-[22px] bg-surface-secondary text-success"
          >
            <span className="absolute size-9 rounded-full border border-success/50" />
            <span className="absolute size-2 rounded-full bg-success" />
            <span className="absolute h-px w-12 rotate-45 bg-success/45" />
            <span className="absolute h-px w-12 -rotate-45 bg-success/45" />
          </div>
          <Typography.Heading level={1} className="mt-5">
            {title}
          </Typography.Heading>
          {reference ? (
            <Typography type="body-xs" color="muted" className="mt-1">
              {reference}
            </Typography>
          ) : null}
          <Typography type="body-sm" color="muted" className="mt-3">
            {description}
          </Typography>
        </Card.Content>
        <Card.Footer className="mt-2 flex flex-col gap-2">
          {retry ? (
            <Button fullWidth onPress={retry}>
              <RotateCcw className="size-4" aria-hidden />
              Try again
            </Button>
          ) : null}
          <Link
            href={homeHref}
            className={`${retry ? "border-border text-muted hover:text-foreground border" : "bg-accent text-accent-foreground hover:opacity-90"} w-full rounded-lg px-4 py-2.5 text-center text-sm font-medium transition-opacity`}
          >
            {homeLabel}
          </Link>
        </Card.Footer>
      </Card>
    </main>
  );
}
