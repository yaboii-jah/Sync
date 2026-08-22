import { signInWithLinkedIn } from "./actions";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border-default px-8 py-10 text-center">
        <h1 className="text-2xl font-bold text-text-primary">Log in</h1>
        <p className="mt-3 text-text-muted">
          Sign in with LinkedIn to get your name, photo, and networking card
          set up automatically.
        </p>
        {error ? (
          <p className="mt-4 rounded-lg bg-state-error/20 px-3 py-2 text-sm text-state-error">
            Something went wrong signing you in. Please try again.
          </p>
        ) : null}
        <form action={signInWithLinkedIn} className="mt-8">
          <button
            type="submit"
            className="w-full rounded-lg bg-accent-primary px-5 py-3 font-bold text-text-primary transition-colors hover:brightness-125"
          >
            Sign in with LinkedIn
          </button>
        </form>
      </div>
    </main>
  );
}
