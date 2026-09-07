import { Card } from "@/components/ui/static";
import { Skeleton, SkeletonText } from "@/components/skeleton";

export default function MoreLoading() {
  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 lg:max-w-5xl lg:px-10 lg:pt-10">
        <Skeleton className="h-8 w-28 rounded-md" />

        <SkeletonText className="mt-8 w-24" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="flex flex-row items-center gap-3 px-5 py-4">
              <Skeleton className="size-10 rounded-full" />
              <SkeletonText className="w-24" />
            </Card>
          ))}
        </div>

        <SkeletonText className="mt-8 w-44" />
        <SkeletonText className="mt-2 w-72" />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="flex items-center gap-4 overflow-hidden p-0 sm:block">
              <Skeleton className="size-20 shrink-0 rounded-none sm:h-auto sm:w-auto sm:aspect-[4/5]" />
              <div className="min-w-0 flex-1 px-4 py-3.5 sm:py-4">
                <SkeletonText className="w-36" />
                <SkeletonText className="mt-2 w-28" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
