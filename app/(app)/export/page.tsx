"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/page-header"
import { exportHistory, projects } from "@/lib/data"
import { Package, FileText, Download, ShieldCheck, History } from "lucide-react"
import { toast } from "sonner"

const deliverables = [
  { id: "spec", label: "项目规格表", desc: "平台 / 画幅 / 分集 / 时长", size: "0.2 MB" },
  { id: "proposal", label: "策划案", desc: "立项方案与世界观设定", size: "1.1 MB" },
  { id: "outline", label: "分集大纲", desc: "全集剧情脉络", size: "0.8 MB" },
  { id: "script", label: "剧本（全集）", desc: "标准格式剧本", size: "2.4 MB" },
  { id: "storyboard", label: "分镜表", desc: "镜头 / 时长 / 运镜", size: "3.6 MB" },
  { id: "prompts", label: "出图 / 视频提示词", desc: "Seedance 分块提示词", size: "0.6 MB" },
  { id: "assets", label: "角色资产包", desc: "身份锁定 + 视觉锚点", size: "8.2 MB" },
  { id: "report", label: "审核报告", desc: "质量门禁与问题记录", size: "0.4 MB" },
]

export default function ExportPage() {
  const [selected, setSelected] = useState<string[]>(["spec", "proposal", "outline", "script", "report"])
  const [deAi, setDeAi] = useState(true)

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="导出中心"
        description="勾选交付物、确认质量门禁，一键打包导出标准资料包。"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="size-4 text-primary" />
                选择交付物
              </CardTitle>
              <CardDescription>勾选需要打包进资料包的内容。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {deliverables.map((d) => {
                const checked = selected.includes(d.id)
                return (
                  <Label
                    key={d.id}
                    htmlFor={`d-${d.id}`}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/40 has-data-[checked=true]:border-primary/40 has-data-[checked=true]:bg-accent/40"
                    data-checked={checked}
                  >
                    <Checkbox id={`d-${d.id}`} checked={checked} onCheckedChange={() => toggle(d.id)} />
                    <div className="flex flex-1 flex-col gap-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">{d.label}</span>
                        <span className="font-mono text-xs text-muted-foreground">{d.size}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{d.desc}</span>
                    </div>
                  </Label>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="size-4 text-primary" />
                导出历史
              </CardTitle>
              <CardDescription>近期生成的资料包记录。</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">名称</TableHead>
                    <TableHead>格式</TableHead>
                    <TableHead>大小</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead className="pr-6 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportHistory.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-muted-foreground" />
                          <span className="font-medium">{e.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {e.format}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{e.size}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.date}</TableCell>
                      <TableCell className="pr-6 text-right">
                        <Button size="sm" variant="ghost" onClick={() => toast.success("开始下载")}>
                          <Download data-icon="inline-start" />
                          下载
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-base">导出设置</CardTitle>
              <CardDescription>确认范围与合规要求。</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">所属项目</Label>
                <Select defaultValue={projects[0].id}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">打包格式</Label>
                <Select defaultValue="zip">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zip">ZIP 压缩包</SelectItem>
                    <SelectItem value="pdf">PDF 合订本</SelectItem>
                    <SelectItem value="folder">分目录文件夹</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <Label
                htmlFor="deai"
                className="flex cursor-pointer items-start gap-3"
                data-checked={deAi}
              >
                <Checkbox id="deai" checked={deAi} onCheckedChange={(v) => setDeAi(Boolean(v))} />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">对外版去 AI 痕迹检查</span>
                  <span className="text-xs text-muted-foreground">导出前自动巡检并拦截风险点</span>
                </div>
              </Label>

              <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700">
                <ShieldCheck className="size-4 shrink-0" />
                <span>质量门禁：P0 问题为 0，可安全导出。</span>
              </div>
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>已选 {selected.length} 项</span>
                <span>预计 ~15 MB</span>
              </div>
              <Button
                className="w-full"
                disabled={selected.length === 0}
                onClick={() => toast.success("资料包已开始打包导出")}
              >
                <Download data-icon="inline-start" />
                生成并导出资料包
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
