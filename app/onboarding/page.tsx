import { redirect } from "next/navigation";
import { Card, Typography } from "@heroui/react";
import { getAuthenticatedProfile } from "@/lib/supabase/profile";
import { LinkedInUrlForm } from "./linkedin-url-form";

export default async function OnboardingPage() {
  const result = await getAuthenticatedProfile();

  if (!result || !result.profile) redirect("/login");
  if (result.profile.linkedin_url) redirect("/home");

  const displayName = result.profile.name || result.user.email || "there";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <Card.Header>
          <Typography.Heading level={1}>
            Welcome, {displayName}
          </Typography.Heading>
          <Card.Description>One last step</Card.Description>
        </Card.Header>
        <Card.Content>
          <Typography type="body-sm" color="muted">
            Paste your LinkedIn profile URL. It powers your networking QR code
            so people you meet can find you instantly.
          </Typography>
          <LinkedInUrlForm />
        </Card.Content>
      </Card>
    </main>
  );
}
