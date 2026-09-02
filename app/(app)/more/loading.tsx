import { Card } from "@heroui/react";
import { Skeleton, SkeletonText } from "@/components/skeleton";

export default function MoreLoading() {
  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 lg:max-w-3xl lg:px-10 lg:pt-10">
        <Skeleton className="h-8 w-28 rounded-md" />

        <SkeletonText className="mt-8 w-24" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <Card key={i} className="flex flex-row items-center gap-3 px-5 py-4">
              <Skeleton className="size-10 rounded-full" />
              <SkeletonText className="w-24" />
            </Card>
          ))}
        </div>

        <SkeletonText className="mt-8 w-44" />
        <div className="mt-3 flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Card key={i} className="flex flex-row items-center gap-4 px-5 py-4">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex-1">
                <SkeletonText className="w-36" />
                <SkeletonText className="mt-2 w-52" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
