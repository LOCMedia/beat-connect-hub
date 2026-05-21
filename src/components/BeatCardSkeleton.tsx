import { Skeleton } from "@/components/ui/skeleton";

export const BeatCardSkeleton = () => (
  <div className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card/60 backdrop-blur">
    <Skeleton className="aspect-square w-full rounded-none" />
    <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-1">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-10" />
      </div>
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-9 w-full" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  </div>
);