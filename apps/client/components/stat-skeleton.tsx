import { Skeleton } from "@/components/ui/skeleton";

export function StatSkeleton() {
  return (
    <div className="px-5 py-4 bg-white border rounded-xl border-stone-200">
      <div className="flex items-center gap-2 mb-2 text-stone-500">
        <Skeleton className="w-4 h-4 rounded-sm" />
        <Skeleton className="w-20 h-3" />
      </div>
      <div className="flex items-end gap-1">
        <Skeleton className="w-14 h-9" />
        <Skeleton className="w-12 h-3 mb-1" />
      </div>
    </div>
  );
}