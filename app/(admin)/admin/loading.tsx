import { Card } from "@heroui/react";
import { Skeleton, SkeletonText } from "@/components/skeleton";

export default function AdminLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-10 lg:py-10">
      <SkeletonText className="w-32" />
      <Skeleton className="mt-3 h-8 w-72 rounded-md" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Card key={item} className="px-5 py-5">
            <SkeletonText className="w-24" />
            <Skeleton className="mt-3 h-8 w-16 rounded-md" />
          </Card>
        ))}
      </div>
    </div>
  );
}
