"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { PageHeader } from "@/components/page-header"
import { cn } from "@/lib/utils"
import { CircleAlert, CircleDot, CircleCheck, ListChecks } from "lucide-react"
import { toast } from "sonner"
import {
  getStoredReviewIssues,
  updateStoredReviewIssue,
  type StudioReviewIssue,
} from "@/lib/local-store"

const severityStyles: Record<StudioReviewIssue["severity"], string> = {
  P0: "bg-destructive/10 text-destructive border-destructive/30",
  P1: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  P2: "bg-muted text-muted-foreground border-border",
}

const statusMeta: Record<StudioReviewIssue["status"], { label: string; icon: typeof CircleDot; cls: string }> = {
  open: { label: "待处理", icon: CircleAlert, cls: "text-destructive" },
  fixing: { label: "返修中", icon: CircleDot, cls: "text-amber-600" },
  resolved: { label: "已解决", icon: CircleCheck, cls: "text-emerald-600" },
}

const filters = [
  { value: "all", label: "全部" },
  { value: "open", label: "待处理" },
  { value: "fixing", label: "返修中" },
  { value: "resolved", label: "已解决" },
]

export default function ReviewPage() {
  const [filter, setFilter] = useState("all")
  const [issues, setIssues] = useState<StudioReviewIssue[]>([])

  useEffect(() => {
    const refresh = () => setIssues(getStoredReviewIssues())
    refresh()
    window.addEventListener("wufang:review-issues-change", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener("wufang:review-issues-change", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [])

  const markResolved = (id: string) => {
    updateStoredReviewIssue(id, { status: "resolved" })
    setIssues(getStoredReviewIssues())
    toast.success(`已将 ${id} 标记为已解决`)
  }

  const list = issues.filter((i) => filter === "all" || i.status === filter)

  const counts = {
    p0: issues.filter((i) => i.severity === "P0").length,
    open: issues.filter((i) => i.status === "open").length,
    fixing: issues.filter((i) => i.status === "fixing").length,
    resolved: issues.filter((i) => i.status === "resolved").length,
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="审核中心"
        description="集中管理跨项目的质量问题，确保对外交付版本零 AI 痕迹、P0 问题清零。"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="P0 阻断问题" value={counts.p0} accent="text-destructive" hint="必须清零方可交付" />
        <SummaryCard label="待处理" value={counts.open} accent="text-foreground" hint="尚未开始返修" />
        <SummaryCard label="返修中" value={counts.fixing} accent="text-amber-600" hint="创作侧处理中" />
        <SummaryCard label="已解决" value={counts.resolved} accent="text-emerald-600" hint="本周累计" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="size-4 text-primary" />
              问题清单
            </CardTitle>
            <CardDescription>按严重级别排序，P0 优先处理。</CardDescription>
          </div>
          <ToggleGroup
            value={[filter]}
            onValueChange={(v) => v[0] && setFilter(v[0])}
            className="hidden sm:flex"
          >
            {filters.map((f) => (
              <ToggleGroupItem key={f.value} value={f.value} className="px-3 text-xs">
                {f.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {list.map((issue) => {
            const meta = statusMeta[issue.status]
            const StatusIcon = meta.icon
            return (
              <div
                key={issue.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/40 md:flex-row md:items-center"
              >
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant="outline" className={cn("font-mono", severityStyles[issue.severity])}>
                    {issue.severity}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">{issue.id}</span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium text-foreground">{issue.project}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{issue.location}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {issue.type}
                    </Badge>
                  </div>
                  <p className="text-pretty text-sm text-muted-foreground">{issue.summary}</p>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-4 md:justify-end">
                  <div className={cn("flex items-center gap-1.5 text-xs font-medium", meta.cls)}>
                    <StatusIcon className="size-3.5" />
                    {meta.label}
                  </div>
                  <span className="text-xs text-muted-foreground">{issue.reviewer}</span>
                  {issue.status !== "resolved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markResolved(issue.id)}
                    >
                      标记解决
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
          {list.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">该筛选条件下暂无问题。</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">审核规则摘要</CardTitle>
          <CardDescription>系统按以下规则自动巡检并生成问题。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          {[
            "对外交付版本不得含可识别的 AI 痕迹",
            "P0 阻断问题数量必须为 0 方可导出",
            "Seedance 视频分块时长须落在 4-15 秒区间",
            "剧本场景标头需包含内外景与时间信息",
            "角色锚点须与 ID-LOCK 锁定描述一致",
            "分镜总时长与目标时长偏差 ≤ 15%",
          ].map((rule) => (
            <div key={rule} className="flex items-start gap-2">
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="text-muted-foreground">{rule}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  accent,
  hint,
}: {
  label: string
  value: number
  accent: string
  hint: string
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn("text-3xl font-semibold tabular-nums", accent)}>{value}</span>
        <Separator className="my-1" />
        <span className="text-xs text-muted-foreground">{hint}</span>
      </CardContent>
    </Card>
  )
}
