import { AuthComplete } from "@/components/auth/auth-complete";
import { HomeLoading } from "@/components/home/home-loading";
import {
  getSafeInternalPath,
  serializeForInlineScript,
} from "@/lib/auth-redirect";

export default async function AuthCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const requested = Array.isArray(params.next) ? params.next[0] : params.next;
  const destination = getSafeInternalPath(requested);

  return (
    <div className="relative min-h-dvh w-full">
      <script
        dangerouslySetInnerHTML={{
          __html: `window.location.replace(${serializeForInlineScript(destination)});`,
        }}
      />
      <HomeLoading />
      <div className="fixed inset-x-0 bottom-28 z-20 flex justify-center px-4">
        <AuthComplete destination={destination} />
      </div>
    </div>
  );
}
