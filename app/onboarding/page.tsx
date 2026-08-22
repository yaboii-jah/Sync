import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/profile";
import { LinkedInUrlForm } from "./linkedin-url-form";

export default async function OnboardingPage() {
  const result = await getAuthenticatedProfile();

  if (!result || !result.profile) redirect("/login");
  if (result.profile.linkedin_url) redirect("/home");

  const displayName =
    result.profile.name || result.user.email || "there";

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border-default px-8 py-10 text-center">
        <h1 className="text-2xl font-bold text-text-primary">
          Welcome, {displayName}
        </h1>
        <p className="mt-3 text-text-muted">
          One last step — paste your LinkedIn profile URL. It powers your
          networking QR code so people you meet can find you instantly.
        </p>
        <LinkedInUrlForm />
      </div>
    </main>
  );
}
