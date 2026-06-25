"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  Clapperboard,
  Copy,
  Eraser,
  FileText,
  Film,
  ImageIcon,
  LayoutGrid,
  Lock,
  PackageOpen,
  Ruler,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { tools, workflowSteps } from "@/lib/data"
import { generateDocument } from "@/lib/generation"
import { fetchStudioSnapshot, getAssetsFromSnapshot, getWorkflowDocumentFromSnapshot } from "@/lib/studio-snapshot"
import { getDefaultTextProvider, saveToolOutputToProject, type StudioProject } from "@/lib/local-store"
import { toolDefaultInput, toolWriteBackMap, type ToolId } from "@/lib/tool-config"

const iconMap: Record<string, typeof FileText> = {
  "proposal-gen": FileText,
  "script-review": ShieldCheck,
  "script-deai": Eraser,
  "script-to-director": Clapperboard,
  "director-to-storyboard": LayoutGrid,
  "seedance-prompt": Film,
  "identity-lock": Lock,
  "image-prompt": ImageIcon,
  "platform-check": Ruler,
  "deai-check": ScanLine,
  "package-export": PackageOpen,
}

const categoryVariant: Record<string, "default" | "secondary" | "outline"> = {
  生成: "default",
  审核: "secondary",
  优化: "outline",
  转换: "outline",
  导出: "secondary",
}

export default function ToolsPage() {
  const [projects, setProjects] = useState<StudioProject[]>([])
  const [selectedId, setSelectedId] = useState<ToolId>("proposal-gen")
  const [projectId, setProjectId] = useState("")
  const [inputText, setInputText] = useState(toolDefaultInput["proposal-gen"])
  const [result, setResult] = useState("")
  const [running, setRunning] = useState(false)
  const [snapshotReady, setSnapshotReady] = useState(false)

  const selected = useMemo(() => tools.find((item) => item.id === selectedId) ?? tools[0], [selectedId])
  const SelectedIcon = iconMap[selected.id] ?? FileText
  const target = toolWriteBackMap[selected.id]
  const activeProject = useMemo(() => projects.find((item) => item.id === projectId) ?? projects[0] ?? null, [projects, projectId])

  useEffect(() => {
    void fetchStudioSnapshot().then((snapshot) => {
      setProjects(snapshot.projects)
      const first = snapshot.projects[0]
      if (first) {
        setProjectId(first.id)
        setInputText(first.referenceFiles?.length ? first.referenceFiles.join("、") : toolDefaultInput["proposal-gen"])
      }
      setSnapshotReady(true)
    })
  }, [])

  useEffect(() => {
    setInputText(toolDefaultInput[selected.id as ToolId] ?? toolDefaultInput["proposal-gen"])
  }, [selected.id])

  const runTool = async () => {
    if (!activeProject) {
      toast.error("请先选择项目")
      return
    }
    setRunning(true)
    try {
      const provider = getDefaultTextProvider()
      const snapshot = await fetchStudioSnapshot()
      const assets = getAssetsFromSnapshot(snapshot, activeProject.id)
      const workflowDocument = getWorkflowDocumentFromSnapshot(snapshot, activeProject.id, target.step) ?? ""
      const response = await generateDocument({
        project: activeProject,
        provider: provider
          ? {
              baseUrl: provider.baseUrl,
              apiKey: provider.apiKey,
              textModel: provider.textModel,
              temperature: provider.temperature,
              maxTokens: provider.maxTokens,
            }
          : undefined,
        step: { key: target.step, label: target.label },
        assets: assets.map((asset) => ({
          name: asset.name,
          category: asset.category,
          size: asset.size,
          addedAt: asset.addedAt,
        })),
      })
      const merged = [workflowDocument, response.content].filter(Boolean).join("\n\n")
      setResult(merged)
      toast.success(response.source === "model" ? "已由模型生成" : "已生成本地模板")
    } catch (error) {
      toast.error("运行失败", { description: error instanceof Error ? error.message : "请检查模型配置" })
    } finally {
      setRunning(false)
    }
  }

  const copyResult = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result)
    toast.success("已复制结果")
  }

  const writeBack = () => {
    if (!activeProject || !result) return
    saveToolOutputToProject(activeProject.id, target.step, result, {
      stepLabel: target.label,
      progress: target.progress,
      status: target.status,
    })
    toast.success("已写回项目")
  }

  const exportResult = () => {
    if (!result) return
    const blob = new Blob([result], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${activeProject?.name ?? "wufang"}-${target.label}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("已导出文档")
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="工具中心" description="点开就能用的工具工作台，结果可以直接写回项目。" />

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-base">工具列表</CardTitle>
            <CardDescription>选一个工具，右侧会切换参数和结果。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 p-3">
            {tools.map((tool) => {
              const ToolIcon = iconMap[tool.id] ?? FileText
              const active = selected.id === tool.id
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setSelectedId(tool.id as ToolId)}
                  className={[
                    "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50",
                    active ? "border-primary bg-primary/5" : "",
                  ].join(" ")}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <ToolIcon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{tool.title}</span>
                      <Badge variant={categoryVariant[tool.category] ?? "outline"} className="shrink-0 font-normal">
                        {tool.category}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{tool.description}</p>
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="border-b py-4">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <SelectedIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base">{selected.title}</CardTitle>
                <CardDescription>{selected.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="当前项目" value={activeProject?.name ?? ""} />
              <Field label="项目类型" value={activeProject?.type ?? ""} />
              <Field label="平台" value={activeProject?.platform ?? ""} />
              <Field label="画幅" value={activeProject?.aspect ?? ""} />
              <Field label="集数" value={activeProject ? String(activeProject.episodes) : ""} />
              <Field label="单集时长" value={activeProject?.duration ?? ""} />
            </div>

            <div className="grid gap-2">
              <Label className="text-sm text-muted-foreground">输入内容</Label>
              <Textarea value={inputText} onChange={(e) => setInputText(e.target.value)} className="min-h-28" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void runTool()} disabled={running}>
                <Sparkles data-icon="inline-start" />
                {running ? "运行中..." : "运行工具"}
              </Button>
              <Button variant="outline" onClick={writeBack} disabled={!result || !activeProject}>
                <ArrowRight data-icon="inline-start" />
                写回项目
              </Button>
              <Button variant="outline" onClick={() => void copyResult()} disabled={!result}>
                <Copy data-icon="inline-start" />
                复制结果
              </Button>
              <Button variant="outline" onClick={exportResult} disabled={!result}>
                <PackageOpen data-icon="inline-start" />
                导出
              </Button>
            </div>

            <div className="grid gap-2">
              <Label className="text-sm text-muted-foreground">输出结果</Label>
              <Textarea value={result} readOnly className="min-h-[360px] font-mono text-sm" />
            </div>

            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              当前写回：{target.label} / {workflowSteps.find((step) => step.key === target.step)?.label ?? target.step}
              {snapshotReady ? "" : "（加载中）"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <Input value={value} readOnly />
    </div>
  )
}

