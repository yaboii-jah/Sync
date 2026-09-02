import { Skeleton as HeroSkeleton } from "@heroui/react";

export function Skeleton({ className = "" }: { className?: string }) {
  return <HeroSkeleton className={className} />;
}

export function SkeletonText({ className = "" }: { className?: string }) {
  return <HeroSkeleton className={`h-4 rounded-md ${className}`} />;
}
