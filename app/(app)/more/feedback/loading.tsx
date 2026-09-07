import { Card } from "@/components/ui/static";
import { Skeleton, SkeletonText } from "@/components/skeleton";

export default function FeedbackLoading() {
  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 lg:pt-10">
        <Skeleton className="h-6 w-20 rounded-md" />
        <Skeleton className="mt-8 h-5 w-16 rounded-md" />
        <SkeletonText className="mt-6 w-28" />
        <Card className="mt-6">
          <SkeletonText className="w-48" />
          <div className="mt-5 flex flex-col gap-2">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-16 rounded-xl" />
            ))}
          </div>
          <SkeletonText className="mt-6 w-40" />
          <Skeleton className="mt-2 h-36 rounded-lg" />
          <Skeleton className="mt-5 h-11 w-full rounded-lg" />
        </Card>
      </div>
    </main>
  );
}
