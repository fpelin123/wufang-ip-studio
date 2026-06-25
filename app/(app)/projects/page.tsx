"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Lock, Pencil, Search, SlidersHorizontal } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { ProjectAccessChip } from "@/components/project-access-chip"
import { StatusBadge } from "@/components/status-badge"
import { NewProjectDialog } from "@/components/new-project-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { type StudioProject } from "@/lib/local-store"
import { fetchStudioSnapshot } from "@/lib/studio-snapshot"
import { canEditContent, getCurrentUserId, getCurrentUserRole } from "@/lib/team"

type ProjectLockInfo = {
  userName: string
  userId: string
}

export default function ProjectsPage() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [type, setType] = useState("all")
  const [list, setList] = useState<StudioProject[]>([])
  const [locks, setLocks] = useState<Record<string, ProjectLockInfo>>({})

  const currentUserId = getCurrentUserId()
  const canEditByRole = canEditContent(getCurrentUserRole())

  const refreshProjects = async (signal?: AbortSignal) => {
    const snapshot = await fetchStudioSnapshot(signal)
    setList(snapshot.projects)
    setLocks(
      Object.fromEntries(
        (snapshot.projectLocks ?? []).map((lock) => [
          lock.projectId,
          { userName: lock.userName, userId: lock.userId },
        ]),
      ),
    )
  }

  useEffect(() => {
    const controller = new AbortController()
    refreshProjects(controller.signal)
    return () => controller.abort()
  }, [])

  const filtered = useMemo(
    () =>
      list.filter((p) => {
        const matchQuery = p.name.includes(query) || p.owner.includes(query)
        const matchType = type === "all" || p.type === type
        return matchQuery && matchType
      }),
    [list, query, type],
  )

  const getAccessState = (projectId: string) => {
    const lock = locks[projectId]
    if (!canEditByRole) {
      return { editable: false, label: "只读", detail: "当前身份无编辑权限" }
    }
    if (lock && lock.userId !== currentUserId) {
      return { editable: false, label: "只读", detail: `正在编辑：${lock.userName}` }
    }
    if (lock && lock.userId === currentUserId) {
      return { editable: true, label: "可编辑", detail: "你正在编辑" }
    }
    return { editable: true, label: "可编辑", detail: "可直接进入编辑" }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="项目管理"
        description="管理所有 IP 生产项目及其工作流状态。"
        actions={<NewProjectDialog />}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <InputGroup className="sm:max-w-xs">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="搜索项目名称或负责人"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>
        <Select value={type} onValueChange={(value) => value && setType(value)}>
          <SelectTrigger className="sm:w-40">
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="AI漫剧">AI漫剧</SelectItem>
            <SelectItem value="微短剧">微短剧</SelectItem>
            <SelectItem value="IP样片">IP样片</SelectItem>
            <SelectItem value="文旅方案">文旅方案</SelectItem>
            <SelectItem value="AIGC培训">AIGC培训</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground sm:ml-auto">共 {filtered.length} 个项目</span>
      </div>

      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">项目</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>平台 / 画幅</TableHead>
                <TableHead>集数</TableHead>
                <TableHead>负责人</TableHead>
                <TableHead className="w-36">进度</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>编辑状态</TableHead>
                <TableHead className="pr-6 text-right">更新时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const access = getAccessState(p.id)
                const lock = locks[p.id]
                return (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/projects/${p.id}`)}
                  >
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-2">
                        <Link href={`/projects/${p.id}`} className="font-medium hover:underline">
                          {p.name}
                        </Link>
                        <ProjectAccessChip editable={access.editable} />
                      </div>
                      <div className="text-xs text-muted-foreground">当前：{p.currentStep}</div>
                      {lock && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          {lock.userId === currentUserId ? <Pencil className="size-3.5" /> : <Lock className="size-3.5" />}
                          {lock.userId === currentUserId ? "你正在编辑" : `正在编辑：${lock.userName}`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.type}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.platform} · {p.aspect}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {p.episodes} 集 · {p.duration}
                    </TableCell>
                    <TableCell>{p.owner}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={p.progress} className="h-1.5" />
                        <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                          {p.progress}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{access.detail}</TableCell>
                    <TableCell className="pr-6 text-right text-xs text-muted-foreground">{p.updatedAt}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
