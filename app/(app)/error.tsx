"use client";

import { Button, Card, Typography } from "@heroui/react";
import { RotateCcw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex w-full flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <Card.Header>
          <Typography.Heading level={1}>Something broke</Typography.Heading>
          {error.digest ? (
            <Card.Description>Reference {error.digest}</Card.Description>
          ) : null}
        </Card.Header>
        <Card.Content>
          <Typography type="body-sm" color="muted">
            This screen hit an unexpected error. Your data is safe.
          </Typography>
        </Card.Content>
        <Card.Footer>
          <Button fullWidth onPress={reset}>
            <RotateCcw className="size-4" aria-hidden />
            Try again
          </Button>
        </Card.Footer>
      </Card>
    </main>
  );
}
