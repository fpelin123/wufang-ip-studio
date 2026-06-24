"use client"

import { useEffect, useState } from "react"
import {
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Download,
  PackageOpen,
  Eye,
  Pencil,
  FileText,
  CheckCircle2,
  CircleDashed,
  Clock,
  AlertTriangle,
  ChevronRight,
  Boxes,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ProjectAssetsPanel } from "@/components/project-assets-panel"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  workflowSteps,
  qualityGates,
  type WorkflowStatus,
  type QualityGate,
} from "@/lib/data"
import {
  getActiveProject,
  getActiveWorkflowStep,
  getDefaultTextProvider,
  getStoredAssets,
  getStoredWorkflowDocument,
  addStoredReviewIssue,
  saveStoredWorkflowDocument,
  setActiveWorkflowStep,
  updateProjectWorkflow,
  type StudioProject,
  type StudioAsset,
} from "@/lib/local-store"

const stepIcon: Record<WorkflowStatus, typeof CheckCircle2> = {
  passed: CheckCircle2,
  "in-progress": Clock,
  "pending-review": Clock,
  "needs-revision": AlertTriangle,
  "not-started": CircleDashed,
}

const stepIconColor: Record<WorkflowStatus, string> = {
  passed: "text-emerald-600",
  "in-progress": "text-sky-600",
  "pending-review": "text-amber-600",
  "needs-revision": "text-red-600",
  "not-started": "text-muted-foreground",
}

const gateIcon: Record<QualityGate["status"], typeof CheckCircle2> = {
  passed: CheckCircle2,
  pending: Clock,
  failed: AlertTriangle,
}
const gateColor: Record<QualityGate["status"], string> = {
  passed: "text-emerald-600",
  pending: "text-amber-600",
  failed: "text-red-600",
}

const sampleDoc = `# 《千面》IP 策划案

## 一、项目定位
《千面》是一部面向红果平台的竖屏 AI 漫剧，主打"东方悬疑 + 身份谜题"。以"一人千面"的换脸异能为核心钩子，单集 90 秒，强节奏、强反转。

## 二、世界观
故事发生在架空王朝"昭"。乱世之中，一群拥有"易面"之术的异人游走于权力夹缝。主角沈千面背负灭门之仇，借千面之术潜入各方势力，逐步揭开当年血案真相。

## 三、核心人物
- **沈千面**：银发赤瞳，左眉骨疤痕。冷静、隐忍，目标是复仇与真相。
- **凿天君**：昭国最强武者，亦敌亦友，掌握关键线索。
- **苏晚晴**：书院遗孤，沈千面唯一信任之人。

## 四、剧集结构
- 第一卷（EP01-EP12）：复仇起势，潜入相府。
- 第二卷（EP13-EP36）：身份反转，多方角力。
- 第三卷（EP37-EP60）：真相揭露，终局对决。

## 五、商业化与平台适配
画幅 9:16，单集 90s，符合红果短剧投流模型；前 3 集设置强钩子，第 6 集首个大反转，留存目标 ≥ 45%。`

function getStepFallback(project: StudioProject, stepKey: string) {
  const step = workflowSteps.find((item) => item.key === stepKey)
  const title = step?.label ?? "工作文档"

  if (stepKey === "proposal" && project.id === "qm") return sampleDoc

  return `# ${project.name} ${title}

## 工作目标
围绕 ${project.platform} 平台、${project.aspect}、${project.episodes} 集、单集 ${project.duration} 的规格，完成「${title}」阶段文档。

## 当前输入
- 项目类型：${project.type}
- 当前阶段：${project.currentStep}
- 负责人：${project.owner}

## 待生成内容
点击下方“生成”按钮，系统会按当前阶段生成第一版内容。`
}

function getStepProgress(stepKey: string) {
  const index = workflowSteps.findIndex((step) => step.key === stepKey)
  if (index < 0) return 8
  return Math.round(((index + 1) / workflowSteps.length) * 100)
}

function getStepProjectStatus(stepKey: string): WorkflowStatus {
  if (stepKey === "review") return "pending-review"
  if (stepKey === "export") return "passed"
  return "in-progress"
}

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function safeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "") || "wufang-project"
}

function formatAssetList(assets: StudioAsset[]) {
  if (!assets.length) return "暂无登记素材。"
  return assets
    .map((asset) => `- ${asset.name}（${asset.category}，${formatBytes(asset.size)}，${asset.addedAt}）`)
    .join("\n")
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function WorkspacePage() {
  const [activeStep, setActiveStep] = useState("proposal")
  const [preview, setPreview] = useState(false)
  const [content, setContent] = useState(sampleDoc)
  const [project, setProject] = useState<StudioProject | null>(null)
  const [generating, setGenerating] = useState(false)

  const current = workflowSteps.find((s) => s.key === activeStep)

  useEffect(() => {
    const loadActiveProject = () => {
      const activeProject = getActiveProject()
      const step = getActiveWorkflowStep()
      setProject(activeProject)
      setActiveStep(step)
      setContent(getStoredWorkflowDocument(activeProject.id, step, getStepFallback(activeProject, step)))
    }

    loadActiveProject()
    window.addEventListener("wufang:active-project-change", loadActiveProject)
    return () => {
      window.removeEventListener("wufang:active-project-change", loadActiveProject)
    }
  }, [])

  const updateContent = (value: string) => {
    setContent(value)
    if (project) saveStoredWorkflowDocument(project.id, activeStep, value)
  }

  const changeStep = (step: string) => {
    const workflowStep = workflowSteps.find((item) => item.key === step)
    setActiveStep(step)
    setActiveWorkflowStep(step)
    if (project) {
      const nextProject = updateProjectWorkflow(
        project.id,
        workflowStep?.label ?? project.currentStep,
        getStepProgress(step),
        getStepProjectStatus(step),
      )
      if (nextProject) setProject(nextProject)
      setContent(getStoredWorkflowDocument(project.id, step, getStepFallback(project, step)))
    }
  }

  const generateProposal = async () => {
    if (!project) return

    setGenerating(true)
    try {
      const provider = getDefaultTextProvider()
      const assets = getStoredAssets(project.id)
      const step = current ? { key: current.key, label: current.label } : { key: activeStep, label: activeStep }
      const response = await fetch("/api/generate/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, provider, step, assets }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error ?? "生成失败")

      updateContent(data.content)
      const nextProject = updateProjectWorkflow(
        project.id,
        step.label,
        getStepProgress(step.key),
        getStepProjectStatus(step.key),
      )
      if (nextProject) setProject(nextProject)
      toast.success(data.source === "model" ? `${step.label}已由模型生成` : `已生成本地模板${step.label}`, {
        description: data.source === "model" ? provider?.textModel : "未配置API Key，使用本地模板。",
      })
    } catch (error) {
      toast.error("生成失败", {
        description: error instanceof Error ? error.message : "请检查模型配置。",
      })
    } finally {
      setGenerating(false)
    }
  }

  const exportMarkdown = () => {
    if (!project) return

    downloadMarkdown(`${safeFilename(project.name)}-${current?.label ?? "工作文档"}.md`, content)
    toast.success("已导出当前文档")
  }

  const exportPackage = () => {
    if (!project) return

    const assets = getStoredAssets(project.id)
    const sections = workflowSteps.map((step) => {
      const document = getStoredWorkflowDocument(project.id, step.key, getStepFallback(project, step.key))
      return `## ${step.label}\n\n${document}`
    })
    const markdown = `# ${project.name} 项目资料包

## 项目规格
- 项目类型：${project.type}
- 平台：${project.platform}
- 画幅：${project.aspect}
- 集数：${project.episodes}
- 单集时长：${project.duration}
- 当前阶段：${project.currentStep}
- 当前状态：${project.status}
- 更新时间：${project.updatedAt}

## 素材清单
${formatAssetList(assets)}

${sections.join("\n\n---\n\n")}
`

    downloadMarkdown(`${safeFilename(project.name)}-项目资料包.md`, markdown)
    const nextProject = updateProjectWorkflow(project.id, "导出", 100, "passed")
    if (nextProject) setProject(nextProject)
    toast.success("已导出项目资料包")
  }

  const submitReview = () => {
    if (!project || !current) return

    const issue = addStoredReviewIssue({
      id: `R-${Date.now().toString().slice(-6)}`,
      project: project.name,
      projectId: project.id,
      location: `${current.label} · 当前文档`,
      severity: current.key === "review" ? "P1" : "P2",
      type: current.key === "storyboard" ? "时长" : "格式",
      summary:
        current.key === "storyboard"
          ? "请检查分镜单块时长是否控制在 4-15 秒，并补齐缺失镜头字段。"
          : `已提交「${current.label}」阶段审核，请检查结构完整性、平台适配和对外表达风险。`,
      status: "open",
      reviewer: "审核组·系统",
      createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
    })

    const nextProject = updateProjectWorkflow(
      project.id,
      "审核",
      getStepProgress("review"),
      "pending-review",
    )
    if (nextProject) setProject(nextProject)
    changeStep("review")
    toast.success("已提交审核", { description: `审核记录 ${issue.id} 已进入审核中心。` })
  }

  return (
    <div className="flex h-[calc(100svh-3.5rem-3rem)] min-h-[600px] flex-col gap-4 md:h-[calc(100svh-3.5rem-3rem)]">
      {/* Project header */}
      <div className="flex flex-wrap items-center gap-3 border-b pb-3">
        <h1 className="text-lg font-semibold">{project?.name ?? "《千面》"}</h1>
        <Badge variant="secondary">{project?.type ?? "AI漫剧"}</Badge>
        <span className="text-sm text-muted-foreground">
          {project?.platform ?? "红果"} · {project?.aspect ?? "9:16 竖屏"} · {project?.episodes ?? 60} 集 · {project?.duration ?? "90s"}
        </span>
        <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          负责人 {project?.owner ?? "林知遥"} · 更新于 {project?.updatedAt ?? "14:20"}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        {/* Left: workflow tree */}
        <Card className="hidden min-h-0 py-0 lg:flex">
          <ScrollArea className="h-full">
            <div className="p-3">
              <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">
                工作流
              </p>
              <div className="flex flex-col gap-0.5">
                {workflowSteps.map((s, i) => {
                  const Icon = stepIcon[s.status]
                  return (
                    <button
                      key={s.key}
                      onClick={() => changeStep(s.key)}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                        activeStep === s.key && "bg-accent font-medium",
                      )}
                    >
                      <span className="w-4 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
                        {i + 1}
                      </span>
                      <Icon
                        className={cn("size-4 shrink-0", stepIconColor[s.status])}
                      />
                      <span className="flex-1 truncate">{s.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </ScrollArea>
        </Card>

        {/* Center: editor */}
        <Card className="min-h-0 gap-0 py-0">
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <FileText className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {current?.label ?? "策划案"}
            </span>
            {current && <StatusBadge status={current.status} />}
            <div className="ml-auto flex items-center gap-2">
              <Select defaultValue="v3">
                <SelectTrigger size="sm" className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="v3">版本 v3（当前）</SelectItem>
                  <SelectItem value="v2">版本 v2</SelectItem>
                  <SelectItem value="v1">版本 v1</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreview((p) => !p)}
              >
                {preview ? (
                  <>
                    <Pencil data-icon="inline-start" />
                    编辑
                  </>
                ) : (
                  <>
                    <Eye data-icon="inline-start" />
                    预览
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1">
            {preview ? (
              <ScrollArea className="h-full">
                <MarkdownPreview content={content} />
              </ScrollArea>
            ) : (
              <Textarea
                value={content}
                onChange={(e) => updateContent(e.target.value)}
                className="h-full min-h-[320px] resize-none rounded-none border-0 font-mono text-sm leading-relaxed focus-visible:ring-0"
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t p-3">
            <Button size="sm" onClick={generateProposal} disabled={generating}>
              <Sparkles data-icon="inline-start" />
              {generating ? "生成中" : "生成"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("已重写选定段落")}
            >
              <RefreshCw data-icon="inline-start" />
              改写
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={submitReview}
            >
              <ShieldCheck data-icon="inline-start" />
              审核
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportMarkdown}
            >
              <Download data-icon="inline-start" />
              导出
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={exportPackage}
            >
              <PackageOpen data-icon="inline-start" />
              资料包
            </Button>
          </div>
        </Card>

        {/* Right: panels */}
        <div className="hidden min-h-0 lg:block">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-4 pr-3">
              <Card className="gap-3 py-4">
                <CardHeader className="px-4">
                  <CardTitle className="text-sm">项目规格</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 px-4 text-xs">
                  <SpecRow label="平台" value={project?.platform ?? "红果"} />
                  <SpecRow label="画幅" value={project?.aspect ?? "9:16 竖屏"} />
                  <SpecRow label="集数" value={`${project?.episodes ?? 60} 集`} />
                  <SpecRow label="单集时长" value={project?.duration ?? "90s"} />
                  <SpecRow label="视频引擎" value="Seedance" />
                </CardContent>
              </Card>

              <Card className="gap-3 py-4">
                <CardHeader className="px-4">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Boxes className="size-4 text-primary" />
                    已加载模块
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1.5 px-4">
                  {["平台规格", "IP设定", "角色锁定", "分镜模板", "Seedance"].map(
                    (m) => (
                      <Badge key={m} variant="secondary" className="font-normal">
                        {m}
                      </Badge>
                    ),
                  )}
                </CardContent>
              </Card>

              <Card className="gap-3 py-4">
                <CardHeader className="px-4">
                  <CardTitle className="text-sm">质量门</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 px-4">
                  {qualityGates.map((g) => {
                    const Icon = gateIcon[g.status]
                    return (
                      <div
                        key={g.label}
                        className="flex items-center gap-2 text-xs"
                      >
                        <Icon className={cn("size-3.5 shrink-0", gateColor[g.status])} />
                        <span className="flex-1">{g.label}</span>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {project && <ProjectAssetsPanel projectId={project.id} compact />}

              <Card className="gap-3 border-primary/30 bg-primary/5 py-4">
                <CardHeader className="px-4">
                  <CardTitle className="text-sm">下一步</CardTitle>
                </CardHeader>
                <CardContent className="px-4">
                  <p className="text-xs text-muted-foreground">
                    策划案已通过，建议继续完善剧本并提交审核。
                  </p>
                  <Button size="sm" className="mt-3 w-full">
                    继续：剧本
                    <ChevronRight data-icon="inline-end" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function MarkdownPreview({ content }: { content: string }) {
  const lines = content.split("\n")
  return (
    <div className="flex flex-col gap-2 p-5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("# "))
          return (
            <h1 key={i} className="text-xl font-semibold">
              {line.slice(2)}
            </h1>
          )
        if (line.startsWith("## "))
          return (
            <h2 key={i} className="mt-2 text-base font-semibold">
              {line.slice(3)}
            </h2>
          )
        if (line.startsWith("- "))
          return (
            <p key={i} className="ml-4 list-item list-disc">
              {renderInline(line.slice(2))}
            </p>
          )
        if (line.trim() === "") return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-foreground/90">
            {renderInline(line)}
          </p>
        )
      })}
    </div>
  )
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}
