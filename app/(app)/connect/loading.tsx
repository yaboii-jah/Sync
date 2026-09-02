import { Skeleton, SkeletonCard, SkeletonText } from "@/components/skeleton";

export default function ConnectLoading() {
  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 lg:pt-10">
        <Skeleton className="h-9 w-36" />
        <SkeletonText className="mt-3 w-56" />
        <SkeletonCard className="mt-6 px-6 py-8 text-center">
          {/* Platform dropdown */}
          <Skeleton className="mx-auto h-10 w-32 rounded-full" />
          {/* Avatar */}
          <Skeleton className="mx-auto mt-6 h-20 w-20 rounded-full" />
          <SkeletonText className="mx-auto mt-4 h-6 w-40" />
          <SkeletonText className="mx-auto mt-2 w-56" />
          {/* QR placeholder */}
          <div className="mx-auto mt-6 flex h-[252px] w-[252px] items-center justify-center rounded-2xl border border-border-default">
            <Skeleton className="h-[220px] w-[220px] rounded-lg" />
          </div>
          <SkeletonText className="mx-auto mt-4 w-64" />
          {/* URL input */}
          <Skeleton className="mx-auto mt-6 h-12 w-full rounded-full" />
          {/* Generate QR */}
          <Skeleton className="mx-auto mt-3 h-12 w-full rounded-full" />
          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3">
            <Skeleton className="h-12 w-full rounded-full" />
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
        </SkeletonCard>
      </div>
    </main>
  );
}
