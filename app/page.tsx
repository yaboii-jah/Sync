import { redirect } from "next/navigation";
import { Alert, Button, Card, Form, Typography } from "@heroui/react";
import { signInWithLinkedIn } from "./actions";

interface LandingPageProps {
  searchParams: Promise<{
    error?: string;
    code?: string;
    detail?: string;
    next?: string;
  }>;
}

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const { error, code, detail, next } = await searchParams;

  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}`);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <Card.Header>
          <Typography.Heading level={1}>Sync</Typography.Heading>
          <Card.Description>
            AWS Student Community Day Mega Manila 2026
          </Card.Description>
        </Card.Header>

        <Card.Content className="flex flex-col gap-4">
          <Typography type="body-sm" color="muted">
            Your companion for event day: the live schedule, instant session
            alerts, and one-tap LinkedIn networking.
          </Typography>

          {error ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Sign-in failed</Alert.Title>
                <Alert.Description>
                  Something went wrong signing you in.
                  {detail ? ` (${detail})` : ""}
                </Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}
        </Card.Content>

        <Card.Footer>
          <Form action={signInWithLinkedIn} className="w-full">
            {next ? <input type="hidden" name="next" value={next} /> : null}
            <Button type="submit" fullWidth>
              Sign in with LinkedIn
            </Button>
          </Form>
        </Card.Footer>
      </Card>
    </main>
  );
}
