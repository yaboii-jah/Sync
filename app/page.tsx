import Image from "next/image";
import { redirect } from "next/navigation";
import { getSafeInternalPath } from "@/lib/auth-redirect";
import { getAuthenticatedClaims } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { SignInButton } from "@/components/auth/sign-in-button";
import { LandingBackdrop } from "@/components/landing-backdrop";
import { LandingMotion } from "@/components/landing-motion";
import styles from "./landing.module.css";

interface LandingPageProps {
  searchParams: Promise<{
    error?: string;
    code?: string;
    next?: string;
    sb_flow_id?: string;
  }>;
}

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const { error, code, next, sb_flow_id: flowId } = await searchParams;

  if (code) {
    const callbackParams = new URLSearchParams({ code });
    if (next) callbackParams.set("next", getSafeInternalPath(next));
    if (flowId) callbackParams.set("sb_flow_id", flowId);
    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  const supabase = await createClient();
  const claims = await getAuthenticatedClaims(supabase);
  if (claims) redirect("/home");

  return (
    <main className={styles.landing}>
      <LandingBackdrop />
      <div className={styles.content}>
        <Image
          src="/new-assets/SS2026 Icon - Transparent.png"
          alt="AWS Student Community Day South Summity 2026 event logo"
          width={96}
          height={96}
          preload
          className={styles.logo}
        />
        <p className={styles.eventName}>
          <span>AWS Student Community Day</span>{" "}
          <span>South Summity 2026</span>
        </p>
        <h1 className={styles.heading}>Sync</h1>
        <p className={styles.description}>
          Your companion for event day — the live schedule, instant session
          alerts, and one-tap LinkedIn networking, all from your home screen.
        </p>

        {error ? (
          <p className={styles.authError} role="alert">
            Something went wrong signing you in. Please try again.
          </p>
        ) : null}

        <div className={styles.signIn}>
          <SignInButton next={next ? getSafeInternalPath(next) : undefined} />
        </div>
      </div>
      <LandingMotion />
    </main>
  );
}
