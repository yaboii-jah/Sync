import type { Metadata } from "next";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { AppHeader } from "@/components/app-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { SettingsBackButton } from "@/components/settings/settings-back-button";
import { NotificationSettings } from "@/components/settings/notification-settings";

export const metadata: Metadata = {
  title: "Account Settings — Sync",
};

export default async function SettingsPage() {
  const { profile } = await requireCompleteProfile();

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 lg:pt-10">
        <AppHeader />
        <SettingsBackButton />
        <h1 className="mt-4 font-display text-3xl text-text-primary uppercase">
          Account
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Update how you appear across the app.
        </p>
        <SettingsForm
          initialName={profile.name}
          initialUrl={profile.linkedin_url ?? ""}
        />
        <NotificationSettings />
      </div>
    </main>
  );
}
