"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  PackageOpen,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Boxes,
  CircleDashed,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ProjectAccessChip } from "@/components/project-access-chip"
import { ProjectAssetsPanel } from "@/components/project-assets-panel"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { workflowSteps, qualityGates, type WorkflowStatus, type QualityGate } from "@/lib/data"
import {
  getActiveProjectId,
  getActiveWorkflowStep,
  getDefaultTextProvider,
  addStoredReviewIssue,
  saveStoredWorkflowDocument,
  setActiveWorkflowStep,
  updateProjectWorkflow,
  type StudioAsset,
  type StudioProject,
} from "@/lib/local-store"
import { canEditContent, getCurrentUserId, getCurrentUserRole } from "@/lib/team"
import { fetchStudioSnapshot, getAssetsFromSnapshot, getWorkflowDocumentFromSnapshot } from "@/lib/studio-snapshot"
import { acquireProjectLock, fetchProjectLock, releaseProjectLock, type ProjectLock } from "@/lib/project-lock"

type VersionItem = {
  versionLabel: string
  content: string
  createdAt: string
}

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

const fallbackDoc = `# Wufang IP Studio

## 工作目标
围绕项目当前阶段完成标准化内容产出。

## 操作说明
1. 点击左侧流程切换阶段。
2. 编辑中间正文会自动保存到本地和数据库。
3. 右侧可查看版本、素材和质检状态。
`

function getStepFallback(project: StudioProject, stepKey: string) {
  const step = workflowSteps.find((item) => item.key === stepKey)
  const title = step?.label ?? "工作文档"

  return `# ${project.name} ${title}

## 工作目标
围绕 ${project.platform} 平台、${project.aspect} 画幅、${project.episodes} 集、单集 ${project.duration} 的规格，完成 ${title} 阶段文档。

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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatAssetList(assets: StudioAsset[]) {
  if (!assets.length) return "暂无登记素材。"
  return assets
    .map((asset) => `- ${asset.name}｜${asset.category}｜${formatBytes(asset.size)}｜${asset.addedAt}`)
    .join("\n")
}

export default function WorkspacePage() {
  const [project, setProject] = useState<StudioProject | null>(null)
  const [activeStep, setActiveStep] = useState("proposal")
  const [content, setContent] = useState(fallbackDoc)
  const [preview, setPreview] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [versions, setVersions] = useState<VersionItem[]>([])
  const [selectedVersion, setSelectedVersion] = useState("current")
  const [lock, setLock] = useState<ProjectLock | null>(null)

  const current = workflowSteps.find((step) => step.key === activeStep)
  const currentVersion = useMemo(() => versions.find((item) => item.versionLabel === selectedVersion), [versions, selectedVersion])
  const canEditByRole = canEditContent(getCurrentUserRole())
  const currentUserId = getCurrentUserId()
  const isLockedByOther = Boolean(lock && lock.userId !== currentUserId)
  const canEdit = canEditByRole && (!lock || lock.userId === getCurrentUserId())

  const hydrateFromSnapshot = (snapshot: Awaited<ReturnType<typeof fetchStudioSnapshot>>, projectId: string, step: string) => {
    const activeProject = snapshot.projects.find((item) => item.id === projectId) ?? snapshot.projects[0] ?? null
    if (!activeProject) return null

    const nextContent = getWorkflowDocumentFromSnapshot(snapshot, activeProject.id, step) ?? getStepFallback(activeProject, step)
    const nextVersions = (snapshot.workflowDocumentVersions ?? [])
      .filter((item) => item.projectId === activeProject.id && item.stepKey === step)
      .map((item) => ({ versionLabel: item.versionLabel, content: item.content, createdAt: item.createdAt }))

    setProject(activeProject)
    setActiveStep(step)
    setContent(nextContent)
    setVersions(nextVersions)
    setSelectedVersion("current")
    return activeProject
  }

  const refreshSnapshot = async (projectId: string, step: string) => {
    const snapshot = await fetchStudioSnapshot()
    hydrateFromSnapshot(snapshot, projectId, step)
  }

  useEffect(() => {
    let cancelled = false

    void fetchStudioSnapshot().then((snapshot) => {
      if (cancelled) return
      const activeId = getActiveProjectId()
      const step = getActiveWorkflowStep()
      hydrateFromSnapshot(snapshot, activeId, step)
    })

    void (async () => {
      if (cancelled) return
      const activeId = getActiveProjectId()
      const nextLock = await fetchProjectLock(activeId)
      if (cancelled) return
      setLock(nextLock)
      if (canEditByRole) {
        const result = await acquireProjectLock(activeId)
        if (cancelled) return
        if (result.acquired) {
          setLock(result.lock)
        } else {
          setLock(result.lock)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (project) void releaseProjectLock(project.id)
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [project?.id])

  const updateContent = (value: string) => {
    if (!canEdit) return
    setContent(value)
    if (project) saveStoredWorkflowDocument(project.id, activeStep, value)
  }

  const changeStep = (step: string) => {
    if (!canEdit) {
      toast.error("当前身份无权切换工作流阶段")
      return
    }
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
      void refreshSnapshot(project.id, step)
    }
  }

  const handleVersionSelect = (value: string | null) => {
    if (!value) return
    setSelectedVersion(value)
    if (value === "current") {
      return
    }
    const version = versions.find((item) => item.versionLabel === value)
    if (version) {
      setContent(version.content)
      setPreview(false)
    }
  }

  const resetCurrentContent = async () => {
    if (!project) return
    await refreshSnapshot(project.id, activeStep)
    toast.success("已恢复当前版本")
  }

  const restoreVersion = async () => {
    if (!project || selectedVersion === "current") return
    const version = versions.find((item) => item.versionLabel === selectedVersion)
    if (!version) return

    updateContent(version.content)
    await refreshSnapshot(project.id, activeStep)
    toast.success(`已恢复 ${version.versionLabel} 为当前版本`)
  }

  const generateProposal = async () => {
    if (!project || !canEdit) return

    setGenerating(true)
    try {
      const provider = getDefaultTextProvider()
      const snapshot = await fetchStudioSnapshot()
      const assets = getAssetsFromSnapshot(snapshot, project.id)
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
      toast.success(data.source === "model" ? `${step.label}已由模型生成` : `已生成本地模板：${step.label}`, {
        description: data.source === "model" ? provider?.textModel ?? "模型" : "未配置 API Key，使用本地模板。",
      })
      void refreshSnapshot(project.id, step.key)
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

  const exportPackage = async () => {
    if (!project || !canEdit) {
      if (!canEdit) toast.error("当前身份无权导出")
      return
    }

    const snapshot = await fetchStudioSnapshot()
    const assets = getAssetsFromSnapshot(snapshot, project.id)
    const sections = workflowSteps.map((step) => {
      const document = getWorkflowDocumentFromSnapshot(snapshot, project.id, step.key) ?? getStepFallback(project, step.key)
      return `## ${step.label}\n\n${document}`
    })

    const markdown = `# ${project.name} 项目资料包\n\n## 项目规格\n- 项目类型：${project.type}\n- 平台：${project.platform}\n- 画幅：${project.aspect}\n- 集数：${project.episodes}\n- 单集时长：${project.duration}\n- 当前阶段：${project.currentStep}\n- 当前状态：${project.status}\n- 更新时间：${project.updatedAt}\n\n## 素材清单\n${formatAssetList(assets)}\n\n${sections.join("\n\n---\n\n")}`

    downloadMarkdown(`${safeFilename(project.name)}-项目资料包.md`, markdown)
    const nextProject = updateProjectWorkflow(project.id, "导出", 100, "passed")
    if (nextProject) setProject(nextProject)
    toast.success("已导出项目资料包")
  }

  const submitReview = () => {
    if (!project || !current || !canEdit) {
      if (!canEdit) toast.error("当前身份无权发起审校")
      return
    }

    const issue = addStoredReviewIssue({
      id: `R-${Date.now().toString().slice(-6)}`,
      project: project.name,
      projectId: project.id,
      location: `${current.label} / 当前文档`,
      severity: current.key === "review" ? "P1" : "P2",
      type: current.key === "storyboard" ? "时长" : "格式",
      summary:
        current.key === "storyboard"
          ? "请检查单镜头时长是否控制在 4-15 秒，并补齐缺失镜头字段。"
          : `已提交 ${current.label} 阶段审核，请检查结构完整性、平台适配和对外表达风险。`,
      status: "open",
      reviewer: "审核中心",
      createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
    })

    const nextProject = updateProjectWorkflow(project.id, "审核", getStepProgress("review"), "pending-review")
    if (nextProject) setProject(nextProject)
    changeStep("review")
    toast.success("已提交审核", { description: `审核记录 ${issue.id} 已进入审核中心。` })
  }

  return (
    <div className="flex h-[calc(100svh-3.5rem-3rem)] min-h-[600px] flex-col gap-4 md:h-[calc(100svh-3.5rem-3rem)]">
      <div className="flex flex-wrap items-center gap-3 border-b pb-3">
        <h1 className="text-lg font-semibold">{project?.name ?? "工作台"}</h1>
        <Badge variant="secondary">{project?.type ?? "项目"}</Badge>
        <ProjectAccessChip editable={canEdit} />
        {lock && !canEdit && <span className="text-xs text-muted-foreground">{lock.userName} 正在编辑</span>}
        <span className="text-sm text-muted-foreground">
          {project?.platform ?? "平台"} · {project?.aspect ?? "画幅"} · {project?.episodes ?? 0} 集 · {project?.duration ?? "时长"}
        </span>
        <div className="ml-auto text-sm text-muted-foreground">
          负责人 {project?.owner ?? "-"} · 更新于 {project?.updatedAt ?? "-"}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <Card className="hidden min-h-0 py-0 lg:flex">
          <ScrollArea className="h-full">
            <div className="p-3">
              <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">工作流</p>
              <div className="flex flex-col gap-0.5">
                {workflowSteps.map((step, index) => {
                  const Icon = stepIcon[step.status]
                  return (
                    <button
                      key={step.key}
                      onClick={() => changeStep(step.key)}
                      disabled={!canEdit}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60",
                        activeStep === step.key && "bg-accent font-medium",
                      )}
                    >
                      <span className="w-4 shrink-0 text-center text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                      <Icon className={cn("size-4 shrink-0", stepIconColor[step.status])} />
                      <span className="flex-1 truncate">{step.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </ScrollArea>
        </Card>

        <Card className="min-h-0 gap-0 py-0">
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <FileText className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">{current?.label ?? "文档"}</span>
            {current && <StatusBadge status={current.status} />}
            <div className="ml-auto flex items-center gap-2">
              <Select value={selectedVersion} onValueChange={handleVersionSelect}>
                <SelectTrigger size="sm" className="w-44">
                  <SelectValue placeholder="当前版本" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">当前版本</SelectItem>
                  {versions.map((version) => (
                    <SelectItem key={version.versionLabel} value={version.versionLabel}>
                      {version.versionLabel} · {version.createdAt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentVersion && selectedVersion !== "current" && (
                <Badge variant="outline" className="hidden sm:inline-flex">
                  {currentVersion.versionLabel}
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={() => setPreview((value) => !value)}>
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
                onChange={(event) => updateContent(event.target.value)}
                readOnly={!canEdit}
                className="h-full min-h-[320px] resize-none rounded-none border-0 font-mono text-sm leading-relaxed focus-visible:ring-0"
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t p-3">
            <Button size="sm" onClick={generateProposal} disabled={generating || !canEdit}>
              <Sparkles data-icon="inline-start" />
              {generating ? "生成中" : "生成"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void resetCurrentContent()}>
              <RefreshCw data-icon="inline-start" />
              重置
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void restoreVersion()}
              disabled={selectedVersion === "current"}
            >
              <ArrowRight data-icon="inline-start" />
              恢复版本
            </Button>
            <Button variant="outline" size="sm" onClick={submitReview} disabled={!canEdit}>
              <ShieldCheck data-icon="inline-start" />
              审核
            </Button>
            <Button variant="outline" size="sm" onClick={exportMarkdown}>
              <Download data-icon="inline-start" />
              导出
            </Button>
            <Button variant="outline" size="sm" className="ml-auto" onClick={exportPackage} disabled={!canEdit}>
              <PackageOpen data-icon="inline-start" />
              资料包
            </Button>
          </div>
        </Card>

        <div className="hidden min-h-0 lg:block">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-4 pr-3">
              <Card className="gap-3 py-4">
                <CardHeader className="px-4">
                  <CardTitle className="text-sm">项目规格</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 px-4 text-xs">
                  <SpecRow label="平台" value={project?.platform ?? "-"} />
                  <SpecRow label="画幅" value={project?.aspect ?? "-"} />
                  <SpecRow label="集数" value={`${project?.episodes ?? 0} 集`} />
                  <SpecRow label="单集时长" value={project?.duration ?? "-"} />
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
                  {["平台规格", "IP设定", "角色锁定", "分镜模板", "Seedance"].map((item) => (
                    <Badge key={item} variant="secondary" className="font-normal">
                      {item}
                    </Badge>
                  ))}
                </CardContent>
              </Card>

              <Card className="gap-3 py-4">
                <CardHeader className="px-4">
                  <CardTitle className="text-sm">质量门</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 px-4">
                  {qualityGates.map((gate) => {
                    const Icon = gateIcon[gate.status]
                    return (
                      <div key={gate.label} className="flex items-center gap-2 text-xs">
                        <Icon className={cn("size-3.5 shrink-0", gateColor[gate.status])} />
                        <span className="flex-1">{gate.label}</span>
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
                  <p className="text-xs text-muted-foreground">当前阶段已保存，建议继续完善文档并提交审核。</p>
                    <Button size="sm" className="mt-3 w-full" onClick={() => changeStep("script")} disabled={!canEdit}>
                      继续到剧本
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
      {lines.map((line, index) => {
        if (line.startsWith("# ")) {
          return (
            <h1 key={index} className="text-xl font-semibold">
              {line.slice(2)}
            </h1>
          )
        }
        if (line.startsWith("## ")) {
          return (
            <h2 key={index} className="mt-2 text-base font-semibold">
              {line.slice(3)}
            </h2>
          )
        }
        if (line.startsWith("- ")) {
          return (
            <p key={index} className="ml-4 list-item list-disc">
              {renderInline(line.slice(2))}
            </p>
          )
        }
        if (line.trim() === "") return <div key={index} className="h-1" />
        return (
          <p key={index} className="text-foreground/90">
            {renderInline(line)}
          </p>
        )
      })}
    </div>
  )
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  )
}
