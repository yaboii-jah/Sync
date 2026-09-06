import { Card } from "@/components/ui/static";
import { Skeleton, SkeletonText } from "@/components/skeleton";

export default function PhotoBoothLoading() {
  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 pb-6 lg:max-w-xl lg:px-10 lg:pt-10">
        <Skeleton className="h-8 w-28 rounded-md" />
        <SkeletonText className="mt-6 w-44" />
        <Card className="mt-6">
          <Card.Content className="p-3">
            <Skeleton className="aspect-[9/16] w-full rounded-xl" />
          </Card.Content>
        </Card>
        <Skeleton className="mt-4 h-11 w-full rounded-lg" />
      </div>
    </main>
  );
}
