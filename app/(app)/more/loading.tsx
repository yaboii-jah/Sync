import { Skeleton, SkeletonCard, SkeletonText } from "@/components/skeleton";

export default function MoreLoading() {
  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 lg:max-w-3xl lg:px-10 lg:pt-10">
        <Skeleton className="h-9 w-28" />

        <SkeletonText className="mt-8 w-24" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <SkeletonCard key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <SkeletonText className="w-24" />
            </SkeletonCard>
          ))}
        </div>

        <SkeletonText className="mt-8 w-20" />
        <SkeletonCard className="mt-3 flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <SkeletonText className="w-40" />
            <SkeletonText className="mt-2 w-56" />
          </div>
        </SkeletonCard>

        <SkeletonText className="mt-8 w-44" />
        <div className="mt-3 flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-full" />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1">
                <SkeletonText className="w-36" />
                <SkeletonText className="mt-2 w-52" />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </div>
    </main>
  );
}
