"use client";

import { useEffect } from "react";
import { Button, Card, Typography } from "@heroui/react";
import { RotateCcw } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] route error", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <Card.Header>
          <Typography.Heading level={1}>
            Operations unavailable
          </Typography.Heading>
        </Card.Header>
        <Card.Content>
          <Typography type="body-sm" color="muted">
            The admin data could not be loaded. No change was made.
          </Typography>
        </Card.Content>
        <Card.Footer>
          <Button fullWidth onPress={reset}>
            <RotateCcw className="size-4" aria-hidden />
            Try again
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}
