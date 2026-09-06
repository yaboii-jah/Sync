import { Card } from "@/components/ui/static";
import { Skeleton, SkeletonText } from "@/components/skeleton";

export default function AlertsLoading() {
  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 lg:max-w-2xl lg:px-10 lg:pt-10">
        <Skeleton className="h-8 w-32 rounded-md" />
        <SkeletonText className="mt-3 w-72" />
        <Card className="mt-6 overflow-hidden p-0">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3.5 px-5 py-4">
              <Skeleton className="size-10 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <SkeletonText className="w-24" />
                  <SkeletonText className="w-16" />
                </div>
                <SkeletonText className="mt-3 h-5 w-2/3" />
                <SkeletonText className="mt-2 w-full" />
              </div>
            </div>
          ))}
        </Card>
      </div>
    </main>
  );
}
