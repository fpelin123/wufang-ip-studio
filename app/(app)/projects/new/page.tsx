"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Save, UploadCloud } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { createProjectId, upsertStoredProject, type StudioProject } from "@/lib/local-store"
import { canEditContent, getCurrentUserRole, getCurrentSessionHeaders } from "@/lib/team"

const projectTypes = ["AI漫剧", "微短剧", "IP样片", "文旅方案", "AIGC培训", "自定义"]
const platforms = ["红果", "芒果TV", "B站", "抖音", "腾讯", "优酷", "自定义"]
const deliverables = ["策划案", "分集大纲", "剧本", "导演讲戏", "分镜", "视觉资产", "审核报告", "资料包"]

export default function NewProjectPage() {
  const router = useRouter()
  const canCreate = canEditContent(getCurrentUserRole())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [projectId] = useState(() => createProjectId("project"))
  const [name, setName] = useState("")
  const [type, setType] = useState("AI漫剧")
  const [platform, setPlatform] = useState("红果")
  const [aspect, setAspect] = useState("9:16 竖屏")
  const [episodes, setEpisodes] = useState(60)
  const [duration, setDuration] = useState("90s")
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>(deliverables.slice(0, 4))
  const [referenceFiles, setReferenceFiles] = useState<string[]>([])

  const saveProject = (status: "not-started" | "in-progress") => {
    if (!canCreate) {
      toast.error("当前身份无权创建项目")
      return null
    }

    const cleanName = name.trim() || "未命名项目"
    const project: StudioProject = {
      id: projectId,
      name: cleanName,
      type,
      platform,
      aspect,
      episodes,
      duration,
      owner: "内部团队",
      updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      progress: status === "in-progress" ? 8 : 0,
      status,
      currentStep: status === "in-progress" ? "项目规格" : "未开始",
      deliverables: selectedDeliverables,
      referenceFiles,
    }

    upsertStoredProject(project)
    return project
  }

  const toggleDeliverable = (deliverable: string, checked: boolean) => {
    setSelectedDeliverables((current) =>
      checked ? [...new Set([...current, deliverable])] : current.filter((item) => item !== deliverable),
    )
  }

  const uploadReferences = async (files: FileList | null) => {
    const picked = Array.from(files ?? [])
    if (!picked.length) return
    try {
      const formData = new FormData()
      formData.append("projectId", projectId)
      for (const file of picked) {
        formData.append("files", file)
      }

      const response = await fetch("/api/assets/upload", {
        method: "POST",
        headers: getCurrentSessionHeaders(),
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error ?? "上传失败")

      setReferenceFiles((current) => [...new Set([...current, ...picked.map((file) => file.name)])])
      toast.success("参考文件已上传", { description: `${picked.length} 个文件已接入项目` })
    } catch (error) {
      setReferenceFiles((current) => [...new Set([...current, ...picked.map((file) => file.name)])])
      toast.warning("文件已加入列表，但上传未完成", {
        description: error instanceof Error ? error.message : "请稍后再试",
      })
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title="新建项目" description="配置项目规格、交付物和参考文件，创建后可直接进入工作台。" />

      <Card>
        <CardHeader>
          <CardTitle>基础信息</CardTitle>
          <CardDescription>项目的核心规格参数。</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">项目名称</FieldLabel>
              <Input id="name" placeholder="例如：千面" value={name} onChange={(event) => setName(event.target.value)} />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel>项目类型</FieldLabel>
                <Select value={type} onValueChange={(value) => value && setType(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypes.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>目标平台</FieldLabel>
                <Select value={platform} onValueChange={(value) => value && setPlatform(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <FieldLabel>画幅比例</FieldLabel>
              <ToggleGroup
                value={[aspect.startsWith("16:9") ? "16:9" : "9:16"]}
                onValueChange={(value) => {
                  if (value.includes("16:9")) setAspect("16:9 横屏")
                  if (value.includes("9:16")) setAspect("9:16 竖屏")
                }}
                className="w-full"
              >
                <ToggleGroupItem value="9:16" className="flex-1">
                  9:16 竖屏
                </ToggleGroupItem>
                <ToggleGroupItem value="16:9" className="flex-1">
                  16:9 横屏
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="episodes">集数</FieldLabel>
                <Input id="episodes" type="number" value={episodes} onChange={(event) => setEpisodes(Number(event.target.value) || 1)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="duration">单集时长</FieldLabel>
                <Input id="duration" placeholder="例如：90s" value={duration} onChange={(event) => setDuration(event.target.value)} />
                <FieldDescription>支持秒或分钟。</FieldDescription>
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>交付物</CardTitle>
          <CardDescription>勾选本项目需要产出的内容。</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldSet>
            <FieldLegend variant="label" className="sr-only">
              交付物
            </FieldLegend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {deliverables.map((item, index) => (
                <FieldLabel key={item} htmlFor={`d-${index}`} className="flex items-center gap-2 rounded-lg border p-3">
                  <Checkbox id={`d-${index}`} checked={selectedDeliverables.includes(item)} onCheckedChange={(checked) => toggleDeliverable(item, checked === true)} />
                  <span className="text-sm font-medium">{item}</span>
                </FieldLabel>
              ))}
            </div>
          </FieldSet>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>参考文件</CardTitle>
          <CardDescription>上传参考文件后，会同步写入项目参考文件列表。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => void uploadReferences(event.target.files)}
          />
          <button
            type="button"
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-10 text-center transition-colors hover:bg-accent/40"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UploadCloud className="size-5" />
            </div>
            <span className="text-sm font-medium">点击选择或拖拽文件到这里上传</span>
            <span className="text-xs text-muted-foreground">文件名会同步到项目记录，真正文件由上传接口保存。</span>
          </button>
          {referenceFiles.length > 0 && (
            <div className="grid gap-2 rounded-lg border p-3 text-sm">
              {referenceFiles.map((file) => (
                <div key={file} className="flex items-center justify-between gap-3">
                  <span className="truncate">{file}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          disabled={!canCreate}
          onClick={() => {
            if (!saveProject("not-started")) return
            toast.success("草稿已保存")
            router.push("/projects")
          }}
        >
          <Save data-icon="inline-start" />
          保存草稿
        </Button>
        <Button
          disabled={!canCreate}
          onClick={() => {
            if (!saveProject("in-progress")) return
            toast.success("项目已创建", { description: "已进入工作台。" })
            router.push("/workspace")
          }}
        >
          <Check data-icon="inline-start" />
          创建项目
        </Button>
      </div>
    </div>
  )
}
