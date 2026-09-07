import { Card } from "@/components/ui/static";
import { Skeleton, SkeletonText } from "@/components/skeleton";

export default function ConnectLoading() {
  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-5xl px-4 pt-8 lg:pt-10">
        <Skeleton className="h-8 w-36 rounded-md" />
        <SkeletonText className="mt-3 w-56" />
        <Skeleton className="mt-6 h-11 w-full rounded-lg" />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="px-6 py-8 text-center">
            <Skeleton className="mx-auto size-20 rounded-full" />
            <SkeletonText className="mx-auto mt-4 h-6 w-40" />
            <SkeletonText className="mx-auto mt-2 w-56" />
            <Skeleton className="mx-auto mt-6 h-11 w-full rounded-lg" />
            <Skeleton className="mx-auto mt-6 size-[220px] rounded-2xl" />
            <SkeletonText className="mx-auto mt-4 w-64" />
            <div className="mt-6 flex flex-col gap-3">
              <Skeleton className="h-11 w-full rounded-lg" />
              <Skeleton className="h-11 w-full rounded-lg" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          </Card>
          <Card className="px-6 py-6">
            <SkeletonText className="h-6 w-40" />
            <SkeletonText className="mt-2 w-56" />
            <div className="mt-6 flex flex-col gap-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
