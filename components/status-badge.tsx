import { cn } from "@/lib/utils"
import { statusLabels, type WorkflowStatus } from "@/lib/data"

const statusStyles: Record<WorkflowStatus, string> = {
  "not-started": "bg-muted text-muted-foreground ring-border",
  "in-progress": "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-900",
  "pending-review": "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900",
  passed: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900",
  "needs-revision": "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-900",
}

export function StatusBadge({
  status,
  className,
}: {
  status: WorkflowStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        statusStyles[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {statusLabels[status]}
    </span>
  )
}
