import type { Metadata } from "next";
import { Card } from "@heroui/react";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { getOwnNetworkingCard } from "@/lib/supabase/queries/networking";
import { AppHeader } from "@/components/app-header";
import { PageHeader } from "@/components/page-header";
import { ThemeSwitch } from "@/components/theme-switch";
import { SettingsForm } from "@/components/settings/settings-form";
import { SettingsBackButton } from "@/components/settings/settings-back-button";
import { NotificationSettings } from "@/components/settings/notification-settings";

export const metadata: Metadata = {
  title: "Account Settings — Sync",
};

export default async function SettingsPage() {
  const { profile } = await requireCompleteProfile();
  const card = await getOwnNetworkingCard();

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 pb-8 lg:pt-10">
        <AppHeader />
        <SettingsBackButton />
        <PageHeader
          title="Account"
          description="Update how you appear across the app."
        />

        <SettingsForm
          initialName={profile.name}
          initialLinks={card?.links ?? {}}
        />

        <Card className="mt-4">
          <Card.Header>
            <Card.Title>Appearance</Card.Title>
            <Card.Description>
              Follow your device, or pick a mode.
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <ThemeSwitch />
          </Card.Content>
        </Card>

        <NotificationSettings />
      </div>
    </main>
  );
}
