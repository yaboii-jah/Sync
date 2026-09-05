import { Card } from "@heroui/react";
import { Skeleton, SkeletonText } from "@/components/skeleton";

export function HomeLoading() {
  return (
    <main className="w-full">
      <header className="flex items-center justify-between px-4 pt-8 lg:hidden">
        <Skeleton className="h-7 w-24 rounded-md" />
        <Skeleton className="size-9 rounded-lg" />
      </header>

      <div className="mx-auto w-full max-w-md px-4 pt-6 lg:max-w-[1280px] lg:px-10 lg:pt-10">
        <div className="lg:flex lg:items-start lg:gap-12">
          <div className="lg:sticky lg:top-10 lg:w-[38%] lg:max-w-sm lg:self-start">
            <Card className="px-5 py-6">
              <Skeleton className="mx-auto h-3 w-32 rounded-md" />
              <Skeleton className="mx-auto mt-4 h-9 w-48 rounded-md" />
              <Skeleton className="mx-auto mt-4 h-4 w-40 rounded-md" />
            </Card>
            <SkeletonText className="mt-4 hidden w-56 lg:block" />
          </div>

          <section className="mt-8 lg:mt-0 lg:min-w-0 lg:flex-1">
            <SkeletonText className="w-48" />
            <div className="mt-4 flex gap-1">
              <Skeleton className="h-9 flex-1 rounded-lg" />
              <Skeleton className="h-9 flex-1 rounded-lg" />
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Card key={i} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <SkeletonText className="w-24" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <SkeletonText className="mt-3 h-5 w-3/4" />
                  <SkeletonText className="mt-2 w-1/3" />
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
