"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowUpRight,
  ClipboardCheck,
  FileText,
  PackageOpen,
  Wrench,
} from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { NewProjectDialog } from "@/components/new-project-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  exportHistory,
  statusLabels,
  tools,
  type WorkflowStatus,
} from "@/lib/data"
import { getStoredProjects, type StudioProject } from "@/lib/local-store"

const pendingReviews = [
  { project: "《凿天》", stage: "剧本", owner: "周慕白", time: "2 小时前" },
  { project: "凿天君", stage: "角色身份锁定", owner: "陈默", time: "5 小时前" },
  { project: "文旅 AI 漫剧样片", stage: "策划案", owner: "苏晚", time: "昨天" },
]

const quickTools = tools.slice(0, 4)

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<StudioProject[]>([])

  useEffect(() => {
    const refresh = () => setProjects(getStoredProjects())
    refresh()
    window.addEventListener("wufang:active-project-change", refresh)
    window.addEventListener("wufang:projects-change", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener("wufang:active-project-change", refresh)
      window.removeEventListener("wufang:projects-change", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [])

  const summary: { label: string; key: WorkflowStatus; count: number }[] = [
    {
      label: statusLabels["in-progress"],
      key: "in-progress",
      count: projects.filter((project) => project.status === "in-progress").length,
    },
    {
      label: statusLabels["pending-review"],
      key: "pending-review",
      count: projects.filter((project) => project.status === "pending-review").length,
    },
    {
      label: statusLabels["needs-revision"],
      key: "needs-revision",
      count: projects.filter((project) => project.status === "needs-revision").length,
    },
    {
      label: statusLabels["passed"],
      key: "passed",
      count: projects.filter((project) => project.status === "passed").length,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="工作台"
        description="跨项目的生产概览：进度、待办与最近交付一目了然。"
        actions={<NewProjectDialog />}
      />

      {/* Workflow status summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.map((s) => (
          <Card key={s.key} className="gap-2 py-4">
            <CardHeader className="px-4">
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{s.count}</CardTitle>
              <CardAction>
                <StatusBadge status={s.key} />
              </CardAction>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent projects */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>最近项目</CardTitle>
            <CardDescription>按最近更新排序</CardDescription>
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link href="/projects" />}
              >
                全部项目
                <ArrowUpRight data-icon="inline-end" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">项目</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>当前阶段</TableHead>
                  <TableHead className="w-36">进度</TableHead>
                  <TableHead className="pr-6 text-right">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.slice(0, 5).map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/projects/${p.id}`)}
                  >
                    <TableCell className="pl-6">
                      <Link
                        href={`/projects/${p.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="font-medium hover:underline"
                      >
                        {p.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {p.platform} · {p.aspect}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.type}
                    </TableCell>
                    <TableCell>{p.currentStep}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={p.progress} className="h-1.5" />
                        <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                          {p.progress}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <StatusBadge status={p.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pending reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-4 text-primary" />
              待审核
            </CardTitle>
            <CardDescription>需要你处理的审核请求</CardDescription>
            <CardAction>
              <Badge variant="secondary">{pendingReviews.length}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {pendingReviews.map((r, i) => (
              <div key={i}>
                <div className="flex items-start justify-between gap-3 py-2">
                  <div className="grid gap-0.5">
                    <span className="text-sm font-medium">{r.project}</span>
                    <span className="text-xs text-muted-foreground">
                      {r.stage} · {r.owner}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {r.time}
                  </span>
                </div>
                {i < pendingReviews.length - 1 && <Separator />}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              nativeButton={false}
              render={<Link href="/review" />}
            >
              进入审核中心
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Quick tools */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="size-4 text-primary" />
              快捷工具
            </CardTitle>
            <CardDescription>常用 AI 生产工具</CardDescription>
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link href="/tools" />}
              >
                工具中心
                <ArrowUpRight data-icon="inline-end" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {quickTools.map((t) => (
              <Link
                key={t.id}
                href="/tools"
                className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileText className="size-4" />
                </div>
                <div className="grid gap-0.5">
                  <span className="text-sm font-medium">{t.title}</span>
                  <span className="line-clamp-1 text-xs text-muted-foreground">
                    {t.description}
                  </span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent exports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageOpen className="size-4 text-primary" />
              最近导出
            </CardTitle>
            <CardDescription>最新的交付资料包</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {exportHistory.slice(0, 4).map((e, i) => (
              <div key={e.id}>
                <div className="flex items-center justify-between gap-3 py-2">
                  <div className="grid min-w-0 gap-0.5">
                    <span className="truncate text-sm font-medium">
                      {e.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {e.date}
                    </span>
                  </div>
                  <Badge variant="outline" className="shrink-0 font-mono text-xs">
                    {e.format}
                  </Badge>
                </div>
                {i < 3 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
