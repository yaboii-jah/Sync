import type { CSSProperties } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getSafeInternalPath } from "@/lib/auth-redirect";
import { getAuthenticatedClaims } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { SignInButton } from "@/components/auth/sign-in-button";

interface LandingPageProps {
  searchParams: Promise<{
    error?: string;
    code?: string;
    next?: string;
    sb_flow_id?: string;
  }>;
}

interface CometConfig {
  sx: string;
  top: string;
  dur: string;
  delay: string;
  w: string;
  endO?: string;
}

const COMETS: CometConfig[] = [
  { sx: "-18vw", top: "-4vh", dur: "21s", delay: "-3s", w: "14rem" },
  { sx: "-6vw", top: "2vh", dur: "26s", delay: "-11s", w: "19rem", endO: "0.35" },
  { sx: "8vw", top: "7vh", dur: "23s", delay: "-17s", w: "15rem" },
  { sx: "16vw", top: "12vh", dur: "27s", delay: "-6s", w: "20rem", endO: "0.3" },
  { sx: "-2vw", top: "-1vh", dur: "24s", delay: "-20s", w: "16rem" },
  { sx: "20vw", top: "4vh", dur: "19s", delay: "-23s", w: "13rem" },
];

function cometStyle(comet: CometConfig): CSSProperties {
  return {
    "--sx": comet.sx,
    "--top": comet.top,
    "--dur": comet.dur,
    "--delay": comet.delay,
    "--w": comet.w,
    "--end-o": comet.endO ?? "0",
  } as CSSProperties;
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
    <main
      className="portal relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-bg-base px-6 py-24 text-center text-text-primary"
    >
      <Image
        src="/assets/story-sky.webp"
        alt=""
        fill
        sizes="100vw"
        preload
        aria-hidden
        className="pointer-events-none object-cover"
      />
      <div aria-hidden className="hero-field" />

      <div aria-hidden className="pointer-events-none absolute inset-0">
        {COMETS.map((comet, index) => (
          <div key={index} className="comet" style={cometStyle(comet)} />
        ))}
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <div className="flex items-center justify-center gap-4">
          <Image
            src="/icons/icon-512.png"
            alt="AWS Student Community Day Mega Manila 2026 event logo"
            width={80}
            height={80}
            preload
            className="size-20 rounded-full object-cover shadow-xl"
          />
          <Image
            src="/assets/v2.png"
            alt="AWS Builder Group Alpha logo"
            width={80}
            height={80}
            preload
            className="size-20 rounded-full object-cover shadow-xl"
          />
        </div>
        <p className="mt-4 text-[0.68rem] font-bold tracking-[0.24em] text-text-muted uppercase">
          AWS Student Community Day Mega Manila 2026
        </p>
        <h1 className="identity-font lockup-sheen mt-6 text-[clamp(2.75rem,14vw,7rem)] uppercase">
          Sync
        </h1>
        <div className="flourish mt-6" />
        <p className="mt-6 leading-relaxed text-text-muted">
          Your companion for event day — the live schedule, instant session
          alerts, and one-tap LinkedIn networking, all from your home screen.
        </p>

        {error ? (
          <p className="mt-6 w-full rounded-lg bg-state-error/20 px-3 py-2 text-sm break-words text-state-error">
            Something went wrong signing you in. Please try again.
          </p>
        ) : null}

        <div className="mt-10">
          <SignInButton
            next={next ? getSafeInternalPath(next) : undefined}
          />
        </div>
      </div>

      <div aria-hidden className="grain-overlay z-20" />
    </main>
  );
}
