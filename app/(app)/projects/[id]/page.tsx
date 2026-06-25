"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Boxes, Clock, FileText, Play, Save, Settings2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { ProjectAccessChip } from "@/components/project-access-chip"
import { ProjectAssetsPanel } from "@/components/project-assets-panel"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { qualityGates, workflowSteps, type QualityGate } from "@/lib/data"
import {
  updateStoredProject,
  setActiveProjectId,
  setActiveWorkflowStep,
  type StudioProject,
} from "@/lib/local-store"
import { fetchStudioSnapshot, getProjectFromSnapshot, getWorkflowDocumentFromSnapshot } from "@/lib/studio-snapshot"
import { canEditContent, getCurrentUserId, getCurrentUserRole, getCurrentUserName } from "@/lib/team"
import { acquireProjectLock, fetchProjectLock, releaseProjectLock, type ProjectLock } from "@/lib/project-lock"

const fallbackDoc = "当前项目还没有生成文档。进入工作台后，可以先生成第一版策划案。"

const gateIcon: Record<QualityGate["status"], typeof ShieldCheck> = {
  passed: ShieldCheck,
  pending: Clock,
  failed: ShieldCheck,
}

const gateColor: Record<QualityGate["status"], string> = {
  passed: "text-emerald-600",
  pending: "text-amber-600",
  failed: "text-red-600",
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject] = useState<StudioProject | null>(null)
  const [document, setDocument] = useState(fallbackDoc)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({
    name: "",
    owner: "",
    type: "",
    platform: "",
    aspect: "",
    episodes: 60,
    duration: "",
  })
  const [lock, setLock] = useState<ProjectLock | null>(null)
  const [lockLoading, setLockLoading] = useState(true)

  const currentUserId = getCurrentUserId()
  const currentUserName = getCurrentUserName() || currentUserId || "当前用户"
  const canEditByRole = canEditContent(getCurrentUserRole())
  const isLockedByOther = Boolean(lock && lock.userId !== currentUserId)
  const canEdit = canEditByRole && !isLockedByOther

  useEffect(() => {
    const controller = new AbortController()
    const id = decodeURIComponent(params.id)

    const hydrate = async () => {
      setLockLoading(true)
      const snapshot = await fetchStudioSnapshot(controller.signal)
      const found = getProjectFromSnapshot(snapshot, id)
      setProject(found)
      if (found) {
        const step = workflowSteps.find((item) => item.label === found.currentStep) ?? workflowSteps[0]
        setDraft({
          name: found.name,
          owner: found.owner,
          type: found.type,
          platform: found.platform,
          aspect: found.aspect,
          episodes: found.episodes,
          duration: found.duration,
        })
        setDocument(getWorkflowDocumentFromSnapshot(snapshot, found.id, step.key) ?? fallbackDoc)
      }
      const nextLock = await fetchProjectLock(id, controller.signal)
      setLock(nextLock)
      setLockLoading(false)
    }

    void hydrate()

    return () => {
      controller.abort()
      if (project?.id) {
        void releaseProjectLock(project.id)
      }
    }
  }, [params.id])

  useEffect(() => {
    if (!project || !canEditByRole) return

    let active = true
    const claim = async () => {
      const result = await acquireProjectLock(project.id)
      if (!active) return
      if (result.acquired) {
        setLock(result.lock)
        return
      }
      setLock(result.lock)
      toast.message("当前项目已被占用", {
        description: result.lock ? `${result.lock.userName} 正在编辑，当前仅可查看和下载。` : "当前仅可查看和下载。",
      })
    }

    void claim()
    return () => {
      active = false
      void releaseProjectLock(project.id)
    }
  }, [project?.id, canEditByRole])

  const nextStep = useMemo(() => {
    if (!project) return workflowSteps[0]
    return workflowSteps.find((step) => step.label === project.currentStep) ?? workflowSteps[0]
  }, [project])

  const enterWorkspace = (stepKey = nextStep.key) => {
    if (!project) return
    if (canEditByRole && isLockedByOther) {
      toast.message("当前项目已被占用", {
        description: lock ? `${lock.userName} 正在编辑，你只能查看和下载。` : "你只能查看和下载。",
      })
    }
    setActiveProjectId(project.id)
    setActiveWorkflowStep(stepKey)
    router.push("/workspace")
  }

  const saveProject = async () => {
    if (!canEdit) {
      toast.error("当前状态不可编辑")
      return
    }
    if (!project) return
    setSaving(true)
    try {
      const nextProject = updateStoredProject(project.id, {
        name: draft.name.trim() || project.name,
        owner: draft.owner.trim() || project.owner,
        type: draft.type || project.type,
        platform: draft.platform || project.platform,
        aspect: draft.aspect || project.aspect,
        episodes: draft.episodes || project.episodes,
        duration: draft.duration || project.duration,
        updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      })
      if (nextProject) setProject(nextProject)
      toast.success("项目已保存")
    } finally {
      setSaving(false)
    }
  }

  if (!project) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="项目不存在"
          description="没有在本地项目库里找到这个项目。"
          actions={
            <Button variant="outline" onClick={() => router.push("/projects")}>
              <ArrowLeft data-icon="inline-start" />
              返回项目管理
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={project.name}
        description={`${project.type} · ${project.platform} · ${project.aspect} · ${project.episodes} 集 · ${project.duration}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ProjectAccessChip editable={canEdit} />
            <Button variant="outline" onClick={() => router.push("/projects")}>
              <ArrowLeft data-icon="inline-start" />
              返回
            </Button>
            <Button variant="outline" onClick={saveProject} disabled={saving || !canEdit}>
              <Save data-icon="inline-start" />
              {saving ? "保存中" : "保存修改"}
            </Button>
            <Button onClick={() => enterWorkspace()} disabled={canEditByRole && isLockedByOther}>
              <Play data-icon="inline-start" />
              {canEdit && !isLockedByOther ? "进入工作台" : "查看工作台"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="size-4 text-primary" />
                项目概览
              </CardTitle>
              <CardDescription>
                {lockLoading
                  ? "正在检查项目占用状态。"
                  : isLockedByOther
                    ? `${lock?.userName ?? "其他用户"} 正在编辑，当前仅可查看和下载。`
                    : canEdit
                      ? "当前可编辑。"
                      : "当前身份仅可查看和下载。"}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldInput label="项目名称" value={draft.name} onChange={(value) => setDraft((s) => ({ ...s, name: value }))} disabled={!canEdit} />
                <FieldInput label="负责人" value={draft.owner} onChange={(value) => setDraft((s) => ({ ...s, owner: value }))} disabled={!canEdit} />
                <FieldInput label="项目类型" value={draft.type} onChange={(value) => setDraft((s) => ({ ...s, type: value }))} disabled={!canEdit} />
                <FieldInput label="平台" value={draft.platform} onChange={(value) => setDraft((s) => ({ ...s, platform: value }))} disabled={!canEdit} />
                <FieldInput label="画幅" value={draft.aspect} onChange={(value) => setDraft((s) => ({ ...s, aspect: value }))} disabled={!canEdit} />
                <FieldInput label="单集时长" value={draft.duration} onChange={(value) => setDraft((s) => ({ ...s, duration: value }))} disabled={!canEdit} />
              </div>
              <div className="grid gap-2 sm:max-w-40">
                <FieldInput label="集数" value={String(draft.episodes)} onChange={(value) => setDraft((s) => ({ ...s, episodes: Number(value) || 1 }))} disabled={!canEdit} />
              </div>
              <Separator />
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium">整体进度</span>
                  <span className="text-sm tabular-nums text-muted-foreground">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-primary" />
                当前文档
              </CardTitle>
              <CardDescription>当前阶段的最新内容预览。</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-72 rounded-md border bg-muted/20">
                <pre className="whitespace-pre-wrap p-4 text-sm leading-relaxed text-foreground/90">
                  {document}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>

          <ProjectAssetsPanel projectId={project.id} />
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Boxes className="size-4 text-primary" />
                交付件
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {project.deliverables.map((item) => (
                <Badge key={item} variant="secondary" className="font-normal">
                  {item}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">工作流</CardTitle>
              <CardDescription>建议继续处理：{nextStep.label}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-1">
              {workflowSteps.map((step, index) => (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => enterWorkspace(step.key)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                    step.label === project.currentStep && "bg-accent font-medium",
                  )}
                >
                  <span className="w-5 text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                  <span className="flex-1">{step.label}</span>
                  <StatusBadge status={step.status} />
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">质检规则</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {qualityGates.map((gate) => {
                const Icon = gateIcon[gate.status]
                return (
                  <div key={gate.label} className="flex items-center gap-2 text-sm">
                    <Icon className={cn("size-4 shrink-0", gateColor[gate.status])} />
                    <span>{gate.label}</span>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {lock && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">编辑状态</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {lock.userId === currentUserId ? (
                  <div>你正在编辑这个项目。</div>
                ) : (
                  <div>
                    {lock.userName} 正在编辑，当前只能查看和下载。
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function FieldInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
    </div>
  )
}
