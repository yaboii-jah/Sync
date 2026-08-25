import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-20 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 55% at 88% 4%, rgba(230,184,79,0.25), transparent 62%), radial-gradient(85% 62% at 50% 45%, rgba(25,123,98,0.2), transparent 72%)",
        }}
      />

      <svg
        aria-hidden
        viewBox="0 0 400 200"
        className="pointer-events-none absolute top-[10%] left-[6%] w-56 opacity-25"
      >
        <polyline
          points="10,150 60,110 120,130 180,80 240,95 300,50"
          fill="none"
          stroke="#BC8330"
          strokeWidth="0.6"
        />
        <circle cx="180" cy="80" r="3" fill="#E6FFC9" />
        <circle cx="60" cy="110" r="2.5" fill="#E6FFC9" />
      </svg>

      <svg
        aria-hidden
        viewBox="0 0 200 40"
        className="mb-8 w-48"
      >
        <defs>
          <linearGradient id="lost-comet" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FCDB64" />
            <stop offset="100%" stopColor="#BC8330" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g transform="rotate(-24 100 20)">
          <rect x="10" y="18" width="150" height="4" rx="2" fill="url(#lost-comet)" />
          <circle cx="160" cy="20" r="8" fill="#FCDB64" />
        </g>
      </svg>

      <p className="text-xs font-bold tracking-[0.24em] text-text-muted uppercase">
        404
      </p>
      <h1 className="mt-3 font-display text-5xl text-text-primary uppercase">
        Lost in the sky
      </h1>
      <p className="mt-4 max-w-sm text-text-muted">
        This page drifted off the map. Let&apos;s get you back to the event.
      </p>

      <Link
        href="/home"
        className="mt-8 block w-full max-w-xs rounded-full bg-pastel-yellow px-5 py-3 text-xs font-bold tracking-[0.14em] text-charcoal uppercase transition-colors hover:bg-light-green"
      >
        Back to Home
      </Link>
    </main>
  );
}
