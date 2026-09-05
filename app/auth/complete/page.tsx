import Image from "next/image";
import { redirect } from "next/navigation";
import { AuthComplete } from "@/components/auth/auth-complete";
import { createClient } from "@/lib/supabase/server";

export default async function AuthCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const requested = Array.isArray(params.next) ? params.next[0] : params.next;
  const destination =
    requested && requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/home";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?error=oauth");

  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center bg-bg-base px-6 text-center text-text-primary">
      <Image
        src="/icons/icon-512.png"
        alt=""
        width={112}
        height={112}
        priority
        className="size-28"
      />
      <h1 className="mt-6 font-display text-5xl uppercase">Sync</h1>
      <p className="mt-3 text-sm text-text-muted">Opening your event companion...</p>
      <AuthComplete destination={destination} />
    </main>
  );
}
