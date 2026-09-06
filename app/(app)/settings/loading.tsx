import { Card } from "@/components/ui/static";
import { Skeleton, SkeletonText } from "@/components/skeleton";

export default function SettingsLoading() {
  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 lg:pt-10">
        <Skeleton className="h-8 w-36 rounded-md" />
        <SkeletonText className="mt-3 w-64" />
        <Card className="mt-4 flex flex-col gap-4 px-6 py-6">
          <div>
            <SkeletonText className="w-16" />
            <Skeleton className="mt-2 h-11 w-full rounded-xl" />
          </div>
          <div>
            <SkeletonText className="w-36" />
            <Skeleton className="mt-2 h-11 w-full rounded-xl" />
          </div>
          <Skeleton className="mt-2 h-11 w-full rounded-lg" />
        </Card>
      </div>
    </main>
  );
}
