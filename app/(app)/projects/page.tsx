"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, SlidersHorizontal } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { NewProjectDialog } from "@/components/new-project-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
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
import { getStoredProjects, type StudioProject } from "@/lib/local-store"

export default function ProjectsPage() {
  const [query, setQuery] = useState("")
  const [type, setType] = useState("all")
  const [list, setList] = useState<StudioProject[]>([])

  useEffect(() => {
    const refresh = () => setList(getStoredProjects())
    refresh()
    window.addEventListener("wufang:projects-change", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener("wufang:projects-change", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [])

  const filtered = list.filter((p) => {
    const matchQuery = p.name.includes(query) || p.owner.includes(query)
    const matchType = type === "all" || p.type === type
    return matchQuery && matchType
  })

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
        <span className="text-sm text-muted-foreground sm:ml-auto">
          共 {filtered.length} 个项目
        </span>
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
                <TableHead className="pr-6 text-right">更新时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => {
                    window.location.href = `/projects/${p.id}`
                  }}
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
                      当前：{p.currentStep}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.type}
                  </TableCell>
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
                  <TableCell className="pr-6 text-right text-xs text-muted-foreground">
                    {p.updatedAt}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
