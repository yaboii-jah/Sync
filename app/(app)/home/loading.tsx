import { Skeleton, SkeletonCard, SkeletonText } from "@/components/skeleton";

export default function HomeLoading() {
  return (
    <main className="w-full">
      <header className="flex items-center justify-between px-4 pt-8 lg:hidden">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </header>

      <div className="mx-auto w-full max-w-md px-4 pt-6 lg:max-w-[1280px] lg:px-10 lg:pt-2">
        <div className="lg:flex lg:items-start lg:gap-12">
          <div className="lg:sticky lg:top-10 lg:w-[38%] lg:max-w-sm lg:self-start">
            <SkeletonCard className="px-5 py-6">
              <Skeleton className="mx-auto h-3 w-32" />
              <Skeleton className="mx-auto mt-4 h-9 w-48" />
              <Skeleton className="mx-auto mt-4 h-4 w-40" />
            </SkeletonCard>
            <SkeletonText className="mt-4 hidden w-56 lg:block" />
          </div>

          <section className="mt-8 lg:mt-0 lg:min-w-0 lg:flex-1">
            <SkeletonText className="w-48" />
            <div className="mt-4 rounded-xl border border-border-default p-1">
              <div className="flex gap-1">
                <Skeleton className="h-9 flex-1 rounded-lg" />
                <Skeleton className="h-9 flex-1 rounded-lg" />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {[0, 1, 2, 3].map((i) => (
                <SkeletonCard key={i}>
                  <div className="flex items-center justify-between">
                    <SkeletonText className="w-24" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <SkeletonText className="mt-3 h-5 w-3/4" />
                  <SkeletonText className="mt-2 w-1/3" />
                </SkeletonCard>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
