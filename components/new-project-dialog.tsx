"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  createProjectId,
  defaultDeliverables,
  platforms,
  projectTypes,
  upsertStoredProject,
  type StudioProject,
} from "@/lib/local-store"
import { canEditContent, getCurrentUserRole } from "@/lib/team"

export function NewProjectDialog({ trigger }: { trigger?: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [type, setType] = React.useState(projectTypes[0])
  const [platform, setPlatform] = React.useState(platforms[0])
  const [aspect, setAspect] = React.useState("9:16 绔栖睆")
  const [episodes, setEpisodes] = React.useState(60)
  const [duration, setDuration] = React.useState("90s")

  const canCreate = canEditContent(getCurrentUserRole())

  function handleCreate() {
    if (!canCreate) {
      toast.error("当前身份无权创建项目")
      return
    }

    const cleanName = name.trim() || "未命名项目"
    const project: StudioProject = {
      id: createProjectId(cleanName),
      name: cleanName,
      type,
      platform,
      aspect,
      episodes,
      duration,
      owner: "内部团队",
      updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      progress: 8,
      status: "in-progress",
      currentStep: "项目规格",
      deliverables: defaultDeliverables.slice(0, 4),
    }

    upsertStoredProject(project)
    setOpen(false)
    setName("")
    toast.success("项目已创建")
    router.push("/workspace")
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button size="sm">
              <Plus data-icon="inline-start" />
              新建项目
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新建项目</DialogTitle>
          <DialogDescription>填写项目规格，创建后进入工作台。</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="np-name">项目名称</FieldLabel>
            <Input
              id="np-name"
              placeholder="例如：千面 IP"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="np-ep">集数</FieldLabel>
              <Input
                id="np-ep"
                type="number"
                min={1}
                value={episodes}
                onChange={(event) => setEpisodes(Number(event.target.value) || 1)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="np-dur">单集时长</FieldLabel>
              <Input
                id="np-dur"
                placeholder="例如：90s"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              />
            </Field>
          </div>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">取消</Button>} />
          <Button onClick={handleCreate} disabled={!canCreate}>
            创建项目
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
