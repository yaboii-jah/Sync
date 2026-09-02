import Link from "next/link";
import { Card, Typography } from "@heroui/react";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <Card.Header>
          <Typography.Heading level={1}>Page not found</Typography.Heading>
          <Card.Description>Error 404</Card.Description>
        </Card.Header>
        <Card.Content>
          <Typography type="body-sm" color="muted">
            This page does not exist or has moved.
          </Typography>
        </Card.Content>
        <Card.Footer>
          <Link
            href="/home"
            className="bg-accent text-accent-foreground w-full rounded-lg px-4 py-2.5 text-center text-sm font-medium transition-opacity hover:opacity-90"
          >
            Back to Home
          </Link>
        </Card.Footer>
      </Card>
    </main>
  );
}
