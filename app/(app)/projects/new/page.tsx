"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UploadCloud, Save, Check } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  createProjectId,
  upsertStoredProject,
  type StudioProject,
} from "@/lib/local-store"

const projectTypes = ["AI漫剧", "微短剧", "IP样片", "文旅方案", "AIGC培训", "自定义"]
const platforms = ["红果", "芒果TV", "B站", "抖音", "腾讯", "优酷", "自定义"]
const deliverables = [
  "策划案",
  "分集大纲",
  "剧本",
  "导演讲戏",
  "分镜",
  "视觉资产",
  "审核报告",
  "资料包",
]

export default function NewProjectPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [type, setType] = useState("AI漫剧")
  const [platform, setPlatform] = useState("红果")
  const [aspect, setAspect] = useState("9:16 竖屏")
  const [episodes, setEpisodes] = useState(60)
  const [duration, setDuration] = useState("90s")
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>(
    deliverables.slice(0, 4)
  )

  const saveProject = (status: "not-started" | "in-progress") => {
    const cleanName = name.trim() || "未命名项目"
    const project: StudioProject = {
      id: createProjectId(cleanName),
      name: cleanName,
      type,
      platform,
      aspect,
      episodes,
      duration,
      owner: "林知遥",
      updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      progress: status === "in-progress" ? 8 : 0,
      status,
      currentStep: status === "in-progress" ? "项目规格" : "未开始",
      deliverables: selectedDeliverables,
    }

    upsertStoredProject(project)
    return project
  }

  const toggleDeliverable = (deliverable: string, checked: boolean) => {
    setSelectedDeliverables((current) =>
      checked
        ? [...new Set([...current, deliverable])]
        : current.filter((item) => item !== deliverable)
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title="新建项目"
        description="配置项目规格与交付物，创建后进入生产工作台。"
      />

      <Card>
        <CardHeader>
          <CardTitle>基础信息</CardTitle>
          <CardDescription>项目的核心规格参数</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">项目名称</FieldLabel>
              <Input
                id="name"
                placeholder="例如：《千面》"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel>项目类型</FieldLabel>
                <Select value={type} onValueChange={(value) => value && setType(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
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
                    {platforms.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
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
                <Input
                  id="episodes"
                  type="number"
                  value={episodes}
                  onChange={(event) => setEpisodes(Number(event.target.value) || 1)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="duration">单集时长</FieldLabel>
                <Input
                  id="duration"
                  placeholder="例如：90s"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                />
                <FieldDescription>支持秒（s）或分钟（min）。</FieldDescription>
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>交付物</CardTitle>
          <CardDescription>勾选本项目需要产出的交付物</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldSet>
            <FieldLegend variant="label" className="sr-only">
              交付物
            </FieldLegend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {deliverables.map((d, i) => (
                <FieldLabel
                  key={d}
                  htmlFor={`d-${i}`}
                  className="flex items-center gap-2 rounded-lg border p-3"
                >
                  <Checkbox
                    id={`d-${i}`}
                    checked={selectedDeliverables.includes(d)}
                    onCheckedChange={(checked) => toggleDeliverable(d, checked === true)}
                  />
                  <span className="text-sm font-medium">{d}</span>
                </FieldLabel>
              ))}
            </div>
          </FieldSet>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>参考文件</CardTitle>
          <CardDescription>上传世界观、人设、参考剧本等资料</CardDescription>
        </CardHeader>
        <CardContent>
          <button
            type="button"
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-10 text-center transition-colors hover:bg-accent/40"
          >
            <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UploadCloud className="size-5" />
            </div>
            <span className="text-sm font-medium">
              点击或拖拽文件到此处上传
            </span>
            <span className="text-xs text-muted-foreground">
              支持 PDF、DOCX、TXT、PNG、JPG，单文件 ≤ 50MB
            </span>
          </button>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          onClick={() => {
            saveProject("not-started")
            toast.success("草稿已保存")
            router.push("/projects")
          }}
        >
          <Save data-icon="inline-start" />
          保存草稿
        </Button>
        <Button
          onClick={() => {
            saveProject("in-progress")
            toast.success("项目已创建", { description: "已进入项目工作台。" })
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
