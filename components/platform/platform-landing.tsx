import { SignInButton } from "@/components/auth/sign-in-button";

export function PlatformLanding({ next, error }: { next?: string; error?: string }) {
  return (
    <main className="sync-app portal relative isolate overflow-hidden text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[url('/assets/story-sky.webp')] bg-cover bg-center" />
      <div aria-hidden className="hero-field" />
      <div aria-hidden className="grain-overlay" />
      <div className="platform-frame relative z-10 flex min-h-dvh flex-col">
        <header className="flex min-h-20 items-center border-b platform-rule">
          <span className="identity-font text-2xl text-accent uppercase">Sync</span>
        </header>
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-8 py-16">
          <div className="min-w-0">
            <p className="platform-kicker">For every room in motion</p>
            <h1 className="identity-font lockup-sheen mt-6 text-[clamp(4rem,14vw,7rem)] uppercase">Sync</h1>
            <div aria-hidden className="flourish mx-auto mt-6" />
            <p className="mt-6 text-2xl font-semibold leading-snug">One calm place for the whole event.</p>
          </div>
          <div className="flex flex-col items-center">
            <p className="max-w-md text-base leading-7 text-muted">Organizers shape the flow. Attendees see what matters now. Every event stays securely separate.</p>
            {error ? <p className="mt-5 text-sm text-danger" role="alert">Something went wrong signing you in. Please try again.</p> : null}
            <div className="mt-8"><SignInButton next={next} variant="platform" /></div>
          </div>
        </div>
        <footer className="border-t py-6 platform-rule"><p className="text-xs text-muted">© 2026 · Sync · Flawless event flow</p></footer>
      </div>
    </main>
  );
}
