"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Boxes,
  Clock,
  FileText,
  Play,
  Settings2,
  ShieldCheck,
} from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { qualityGates, workflowSteps, type QualityGate } from "@/lib/data"
import {
  getStoredWorkflowDocument,
  getStoredProjects,
  setActiveProjectId,
  setActiveWorkflowStep,
  type StudioProject,
} from "@/lib/local-store"

const fallbackDoc = "当前项目还没有生成文档。进入生产工作台后，可以先生成第一版策划案。"

function getDocumentFallback(project: StudioProject, stepLabel: string) {
  return `# ${project.name} ${stepLabel}

当前阶段还没有保存内容。进入生产工作台后，可以点击“生成”创建第一版。`
}

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

  useEffect(() => {
    const id = decodeURIComponent(params.id)
    const found = getStoredProjects().find((item) => item.id === id) ?? null
    setProject(found)
    if (found) {
      const step = workflowSteps.find((item) => item.label === found.currentStep) ?? workflowSteps[0]
      setDocument(getStoredWorkflowDocument(found.id, step.key, getDocumentFallback(found, step.label)))
    }
  }, [params.id])

  const nextStep = useMemo(() => {
    if (!project) return workflowSteps[0]
    return workflowSteps.find((step) => step.label === project.currentStep) ?? workflowSteps[0]
  }, [project])

  const enterWorkspace = (stepKey = nextStep.key) => {
    if (!project) return
    setActiveProjectId(project.id)
    setActiveWorkflowStep(stepKey)
    router.push("/workspace")
  }

  if (!project) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="项目不存在"
          description="没有在本地项目库中找到这个项目。"
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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push("/projects")}>
              <ArrowLeft data-icon="inline-start" />
              返回
            </Button>
            <Button onClick={() => enterWorkspace()}>
              <Play data-icon="inline-start" />
              进入生产工作台
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
              <CardDescription>当前项目的生产状态和核心规格。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-4">
                <SpecBlock label="负责人" value={project.owner} />
                <SpecBlock label="当前阶段" value={project.currentStep} />
                <SpecBlock label="更新时间" value={project.updatedAt} />
                <div className="grid gap-1">
                  <span className="text-xs text-muted-foreground">状态</span>
                  <StatusBadge status={project.status} />
                </div>
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
              <CardDescription>当前建议阶段中保存的最新内容预览。</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-72 rounded-md border bg-muted/20">
                <pre className="whitespace-pre-wrap p-4 text-sm leading-relaxed text-foreground/90">
                  {document}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Boxes className="size-4 text-primary" />
                交付物
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
              <CardDescription>当前建议继续处理：{nextStep.label}</CardDescription>
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
                  <span className="w-5 text-xs tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="flex-1">{step.label}</span>
                  <StatusBadge status={step.status} />
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">质量门</CardTitle>
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
        </div>
      </div>
    </div>
  )
}

function SpecBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}
