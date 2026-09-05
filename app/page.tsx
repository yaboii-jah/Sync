import type { CSSProperties } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignInButton } from "@/components/auth/sign-in-button";

interface LandingPageProps {
  searchParams: Promise<{
    error?: string;
    code?: string;
    next?: string;
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
  const { error, code, next } = await searchParams;

  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/home");

  return (
    <main
      className="portal relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-bg-base px-6 py-24 text-center text-text-primary"
      style={{ fontFamily: "var(--font-lato)" }}
    >
      <div aria-hidden className="hero-field" />
      <div
        aria-hidden
        className="stars-layer stars-layer-a pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="stars-layer stars-layer-b pointer-events-none absolute inset-0"
      />

      <svg
        aria-hidden
        viewBox="0 0 400 200"
        className="pointer-events-none absolute top-[8%] left-[4%] w-64 opacity-25 md:w-80"
      >
        <polyline
          points="10,150 60,110 120,130 180,80 240,95 300,50"
          fill="none"
          stroke="#BC8330"
          strokeWidth="0.6"
        />
        <polyline
          points="40,40 90,60 140,30 200,45"
          fill="none"
          stroke="#E6FFC9"
          strokeWidth="0.5"
        />
        {[
          [10, 150],
          [60, 110],
          [120, 130],
          [180, 80],
          [240, 95],
          [300, 50],
          [40, 40],
          [90, 60],
          [140, 30],
          [200, 45],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.4" fill="#E6FFC9" />
        ))}
      </svg>

      <div aria-hidden className="pointer-events-none absolute inset-0">
        {COMETS.map((comet, index) => (
          <div key={index} className="comet" style={cometStyle(comet)} />
        ))}
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <Image
          src="/icons/icon-512.png"
          alt="AWS Student Community Day Mega Manila 2026 event logo"
          width={128}
          height={128}
          priority
          className="size-32 rounded-full object-cover shadow-xl"
        />
        <p className="text-[0.68rem] font-bold tracking-[0.24em] text-text-muted uppercase">
          AWS Student Community Day Mega Manila 2026
        </p>
        <h1 className="lockup-sheen mt-6 font-display text-[clamp(2.75rem,14vw,7rem)] uppercase">
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
            next={
              next && next.startsWith("/") && !next.startsWith("//")
                ? next
                : undefined
            }
          />
        </div>
      </div>

      <svg
        aria-hidden
        viewBox="0 0 1440 160"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full md:h-36"
      >
        <defs>
          <radialGradient id="city-glow" cx="50%" cy="100%" r="70%">
            <stop offset="0%" stopColor="#E6B84F" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#E6B84F" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#E6B84F" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="20" width="1440" height="140" fill="url(#city-glow)" />
        <path
          d="M0 160 V118 H60 V96 H130 V128 H210 V84 H260 V112 H340 V72 H400 V104 H480 V88 H560 V120 H650 V78 H720 V108 H800 V92 H880 V126 H960 V82 H1030 V110 H1110 V74 H1190 V102 H1270 V94 H1350 V122 H1440 V160 Z"
          fill="#041A19"
          stroke="#BC8330"
          strokeWidth="1"
        />
      </svg>

      <div aria-hidden className="grain-overlay z-20" />
    </main>
  );
}
