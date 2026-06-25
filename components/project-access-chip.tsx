"use client"

import { Lock, Pencil } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function ProjectAccessChip({
  editable,
  className,
}: {
  editable: boolean
  className?: string
}) {
  return (
    <Badge variant={editable ? "default" : "secondary"} className={cn("gap-1.5", className)}>
      {editable ? <Pencil className="size-3.5" /> : <Lock className="size-3.5" />}
      {editable ? "可编辑" : "只读"}
    </Badge>
  )
}
