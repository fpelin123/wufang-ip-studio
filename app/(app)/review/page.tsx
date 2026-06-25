"use client"

import { useEffect, useState } from "react"
import { CircleAlert, CircleCheck, CircleDot, ListChecks } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { fetchStudioSnapshot } from "@/lib/studio-snapshot"
import { canResolveReview, getCurrentUserRole } from "@/lib/team"
import { updateStoredReviewIssue, type StudioReviewIssue } from "@/lib/local-store"

const severityStyles: Record<StudioReviewIssue["severity"], string> = {
  P0: "bg-destructive/10 text-destructive border-destructive/30",
  P1: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  P2: "bg-muted text-muted-foreground border-border",
}

const statusMeta: Record<
  StudioReviewIssue["status"],
  { label: string; icon: typeof CircleDot; cls: string }
> = {
  open: { label: "待处理", icon: CircleAlert, cls: "text-destructive" },
  fixing: { label: "返修中", icon: CircleDot, cls: "text-amber-600" },
  resolved: { label: "已解决", icon: CircleCheck, cls: "text-emerald-600" },
}

const reviewTransitions: Record<StudioReviewIssue["status"], StudioReviewIssue["status"][]> = {
  open: ["fixing", "resolved"],
  fixing: ["open", "resolved"],
  resolved: ["fixing"],
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
  const canResolve = canResolveReview(getCurrentUserRole())

  useEffect(() => {
    const controller = new AbortController()
    fetchStudioSnapshot(controller.signal).then((snapshot) => setIssues(snapshot.reviewIssues))
    return () => controller.abort()
  }, [])

  const updateStatus = (id: string, status: StudioReviewIssue["status"]) => {
    if (!canResolve) {
      toast.error("当前身份无权处理审校事项")
      return
    }
    updateStoredReviewIssue(id, { status })
    fetchStudioSnapshot().then((snapshot) => setIssues(snapshot.reviewIssues))
    toast.success(`已将 ${id} 更新为 ${statusMeta[status].label}`)
  }

  const list = issues.filter((issue) => filter === "all" || issue.status === filter)

  const counts = {
    p0: issues.filter((issue) => issue.severity === "P0").length,
    open: issues.filter((issue) => issue.status === "open").length,
    fixing: issues.filter((issue) => issue.status === "fixing").length,
    resolved: issues.filter((issue) => issue.status === "resolved").length,
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="审校中心"
        description="集中管理跨项目的质量问题，确保对外交付版本零 AI 痕迹。"
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
            onValueChange={(value) => value[0] && setFilter(value[0])}
            className="hidden sm:flex"
          >
            {filters.map((item) => (
              <ToggleGroupItem key={item.value} value={item.value} className="px-3 text-xs">
                {item.label}
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
                <div className="flex shrink-0 flex-col gap-2 md:items-end">
                  <div className={cn("flex items-center gap-1.5 text-xs font-medium", meta.cls)}>
                    <StatusIcon className="size-3.5" />
                    {meta.label}
                  </div>
                  <span className="text-xs text-muted-foreground">{issue.reviewer}</span>
                  {canResolve && (
                    <div className="flex flex-wrap items-center gap-2">
                      {reviewTransitions[issue.status].map((nextStatus) => (
                        <Button
                          key={nextStatus}
                          size="sm"
                          variant={nextStatus === "resolved" ? "default" : "outline"}
                          onClick={() => updateStatus(issue.id, nextStatus)}
                        >
                          {statusMeta[nextStatus].label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {list.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">当前筛选条件下暂无问题。</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">审校规则摘要</CardTitle>
          <CardDescription>系统按以下规则自动巡检并生成问题。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          {[
            "对外交付版本不得含可识别的 AI 痕迹",
            "P0 阻断问题数量必须为 0 方可导出",
            "Seedance 视频分块时长须落在 4-15 秒区间",
            "剧本场景标头需包含内外景与时间信息",
            "角色锚点需与 ID-LOCK 锁定描述一致",
            "分镜总时长与目标时长偏差 <= 15%",
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
