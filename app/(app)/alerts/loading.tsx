import { Skeleton, SkeletonCard, SkeletonText } from "@/components/skeleton";

export default function AlertsLoading() {
  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 lg:max-w-2xl lg:px-10 lg:pt-10">
        <Skeleton className="h-9 w-32" />
        <SkeletonText className="mt-3 w-72" />
        <div className="mt-6 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i}>
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-16 rounded-full" />
                <SkeletonText className="w-20" />
              </div>
              <SkeletonText className="mt-3 h-5 w-2/3" />
              <SkeletonText className="mt-2 w-full" />
            </SkeletonCard>
          ))}
        </div>
      </div>
    </main>
  );
}
