import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton({ className, chart }: { className?: string; chart?: boolean }) {
  return (
    <div className={`space-y-3 rounded-xl border bg-card p-6 shadow ${className ?? ""}`}>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-56" />
      <Skeleton className={chart ? "h-[260px] w-full" : "h-10 w-24"} />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <Skeleton className="h-9 w-80" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <CardSkeleton className="xl:col-span-2" />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <CardSkeleton chart />
        <CardSkeleton chart />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CardSkeleton chart />
        <CardSkeleton chart />
        <CardSkeleton chart />
        <CardSkeleton chart />
      </div>
    </div>
  );
}
