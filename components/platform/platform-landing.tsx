import { SignInButton } from "@/components/auth/sign-in-button";

export function PlatformLanding({ next, error }: { next?: string; error?: string }) {
  return (
    <main className="tenant-platform">
      <div className="platform-frame flex min-h-dvh flex-col">
        <header className="flex min-h-20 items-center border-b platform-rule">
          <span className="text-lg font-semibold tracking-[-0.04em]">Sync<span aria-hidden className="text-accent">/</span></span>
        </header>
        <div className="grid flex-1 gap-10 py-16 md:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)] md:items-center">
          <div className="min-w-0">
            <p className="platform-kicker">For every room in motion</p>
            <h1 className="platform-display mt-5">One calm place for the whole event.</h1>
          </div>
          <div className="border-t pt-6 platform-rule md:border-t-0 md:border-l md:pl-10">
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
