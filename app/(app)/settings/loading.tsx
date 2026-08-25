import { Skeleton, SkeletonCard, SkeletonText } from "@/components/skeleton";

export default function SettingsLoading() {
  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 lg:pt-10">
        <Skeleton className="h-9 w-36" />
        <SkeletonText className="mt-3 w-64" />
        <SkeletonCard className="mt-4 flex flex-col gap-4 px-6 py-6">
          <div>
            <SkeletonText className="w-16" />
            <Skeleton className="mt-2 h-12 w-full rounded-lg" />
          </div>
          <div>
            <SkeletonText className="w-36" />
            <Skeleton className="mt-2 h-12 w-full rounded-lg" />
          </div>
          <Skeleton className="mt-2 h-12 w-full rounded-full" />
        </SkeletonCard>
      </div>
    </main>
  );
}
