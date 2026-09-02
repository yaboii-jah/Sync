"use client";

import Link from "next/link";
import { Button, Card, Typography } from "@heroui/react";
import { RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <Card.Header>
          <Typography.Heading level={1}>Something broke</Typography.Heading>
          {error.digest ? (
            <Card.Description>Reference {error.digest}</Card.Description>
          ) : null}
        </Card.Header>
        <Card.Content>
          <Typography type="body-sm" color="muted">
            An unexpected error interrupted the app. Try again. If it keeps
            happening, come back in a moment.
          </Typography>
        </Card.Content>
        <Card.Footer className="flex flex-col gap-2">
          <Button fullWidth onPress={reset}>
            <RotateCcw className="size-4" aria-hidden />
            Try again
          </Button>
          <Link
            href="/home"
            className="border-border text-muted hover:text-foreground w-full rounded-lg border px-4 py-2.5 text-center text-sm font-medium transition-colors"
          >
            Back to Home
          </Link>
        </Card.Footer>
      </Card>
    </main>
  );
}
