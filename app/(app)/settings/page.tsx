"use client"

import { useEffect, useState } from "react"
import { CircleAlert, CircleCheck, CircleHelp, Cpu, KeyRound, Plug, Save } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { Provider } from "@/lib/data"
import { fetchStudioSnapshot } from "@/lib/studio-snapshot"
import { saveStoredProviders, type StudioProvider } from "@/lib/local-store"
import { canManageTeam, getCurrentSessionHeaders, getCurrentUserRole } from "@/lib/team"

type TaskBinding = {
  task: string
  model: string
  type: string
}

const statusMeta: Record<Provider["status"], { label: string; icon: typeof CircleCheck; cls: string }> = {
  connected: { label: "已连接", icon: CircleCheck, cls: "text-emerald-600" },
  untested: { label: "未测试", icon: CircleHelp, cls: "text-muted-foreground" },
  error: { label: "连接异常", icon: CircleAlert, cls: "text-destructive" },
}

const defaultTaskBindings: TaskBinding[] = [
  { task: "策划 / 剧本生成", model: "deepseek-chat", type: "文本模型" },
  { task: "长文档处理", model: "qwen-long", type: "长文本模型" },
  { task: "视觉锚点理解", model: "gpt-4o", type: "视觉模型" },
  { task: "出图生成", model: "dall-e-3", type: "图片模型" },
]

const modelOptions = ["deepseek-chat", "gpt-4o", "qwen-max", "qwen-long", "dall-e-3"]

export default function SettingsPage() {
  const [list, setList] = useState<StudioProvider[]>([])
  const [testingId, setTestingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [type, setType] = useState("OpenAI-compatible")
  const [baseUrl, setBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [textModel, setTextModel] = useState("")
  const [taskBindings, setTaskBindings] = useState<TaskBinding[]>(defaultTaskBindings)
  const canManage = canManageTeam(getCurrentUserRole())

  useEffect(() => {
    const controller = new AbortController()
    fetchStudioSnapshot(controller.signal).then((snapshot) => {
      setList(snapshot.providers)
      const raw = snapshot.settings?.taskBindings
      if (typeof raw === "string" && raw.trim()) {
        try {
          const parsed = JSON.parse(raw) as TaskBinding[]
          if (Array.isArray(parsed) && parsed.length) setTaskBindings(parsed)
        } catch {
          setTaskBindings(defaultTaskBindings)
        }
      }
    })
    return () => controller.abort()
  }, [])

  const refreshProviders = async () => {
    const snapshot = await fetchStudioSnapshot()
    setList(snapshot.providers)
  }

  const updateList = async (next: StudioProvider[]) => {
    setList(next)
    saveStoredProviders(next)
    await refreshProviders()
  }

  const toggle = async (id: string) => {
    if (!canManage) {
      toast.error("当前身份无权修改模型")
      return
    }
    const next = list.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    await updateList(next)
  }

  const testProvider = async (provider: StudioProvider) => {
    if (!canManage) {
      toast.error("当前身份无权测试模型")
      return
    }
    setTestingId(provider.id)
    try {
      const response = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCurrentSessionHeaders() },
        body: JSON.stringify(provider),
      })
      const data = await response.json()
      const status: StudioProvider["status"] = response.ok && data.ok ? "connected" : "error"
      await updateList(list.map((item) => (item.id === provider.id ? { ...item, status } : item)))
      toast[status === "connected" ? "success" : "error"](
        status === "connected" ? "连接测试通过" : "连接测试失败",
        { description: status === "connected" ? provider.name : data?.error ?? "请检查配置" },
      )
    } catch (error) {
      await updateList(list.map((item) => (item.id === provider.id ? { ...item, status: "error" } : item)))
      toast.error("连接测试失败", {
        description: error instanceof Error ? error.message : "请检查网络或供应商配置",
      })
    } finally {
      setTestingId(null)
    }
  }

  const testDraftProvider = async () => {
    if (!canManage) {
      toast.error("当前身份无权测试模型")
      return
    }
    if (!name.trim() || !baseUrl.trim() || !textModel.trim()) {
      toast.error("请填写名称、Base URL 和文本模型")
      return
    }

    await testProvider({
      id: "__draft__",
      name: name.trim(),
      type,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      textModel: textModel.trim(),
      longModel: textModel.trim(),
      visionModel: "-",
      imageModel: "-",
      enabled: true,
      status: "untested",
    })
  }

  const saveProvider = async () => {
    if (!canManage) {
      toast.error("当前身份无权保存模型")
      return
    }
    if (!name.trim() || !baseUrl.trim() || !textModel.trim()) {
      toast.error("请填写名称、Base URL 和文本模型")
      return
    }

    const provider: StudioProvider = {
      id: `${name.trim().toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`,
      name: name.trim(),
      type,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      textModel: textModel.trim(),
      longModel: textModel.trim(),
      visionModel: "-",
      imageModel: "-",
      enabled: true,
      status: "untested",
      temperature: 0.7,
      maxTokens: 4000,
      timeoutMs: 60000,
    }

    await updateList([provider, ...list])
    setName("")
    setBaseUrl("")
    setApiKey("")
    setTextModel("")
    toast.success("供应商已保存")
  }

  const saveTaskBindings = async () => {
    if (!canManage) {
      toast.error("当前身份无权保存任务绑定")
      return
    }
    await fetch("/api/db/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getCurrentSessionHeaders() },
      body: JSON.stringify({
        settings: [
          {
            key: "taskBindings",
            value: JSON.stringify(taskBindings),
          },
        ],
      }),
    })
    toast.success("任务绑定已保存")
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="模型设置"
        description="配置多家模型供应商 API，并按任务类型绑定不同模型。"
      />

      {!canManage && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            当前身份仅可查看设置，不能修改模型和任务绑定。
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plug className="size-4 text-primary" />
            供应商
          </CardTitle>
          <CardDescription>已接入的模型供应商及其连接状态。</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">供应商</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>文本模型</TableHead>
                <TableHead>视觉模型</TableHead>
                <TableHead>图片模型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">测试</TableHead>
                <TableHead className="pr-6 text-right">启用</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => {
                const meta = statusMeta[p.status]
                const StatusIcon = meta.icon
                return (
                  <TableRow key={p.id}>
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="font-medium">{p.name}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{p.baseUrl}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.type}</TableCell>
                    <TableCell className="font-mono text-xs">{p.textModel}</TableCell>
                    <TableCell className="font-mono text-xs">{p.visionModel}</TableCell>
                    <TableCell className="font-mono text-xs">{p.imageModel}</TableCell>
                    <TableCell>
                      <span className={cn("flex items-center gap-1.5 text-xs font-medium", meta.cls)}>
                        <StatusIcon className="size-3.5" />
                        {meta.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => void testProvider(p)} disabled={testingId === p.id || !canManage}>
                        {testingId === p.id ? "测试中" : "测试"}
                      </Button>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Switch checked={p.enabled} onCheckedChange={() => void toggle(p.id)} disabled={!canManage} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-4 text-primary" />
              新增供应商
            </CardTitle>
            <CardDescription>填写 OpenAI 兼容的接入信息。</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="prov-name">显示名称</FieldLabel>
                <Input id="prov-name" value={name} onChange={(event) => setName(event.target.value)} disabled={!canManage} />
              </Field>
              <Field>
                <FieldLabel htmlFor="prov-type">供应商类型</FieldLabel>
                <Select value={type} onValueChange={(value) => value && setType(value)} disabled={!canManage}>
                  <SelectTrigger id="prov-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OpenAI-compatible">OpenAI-compatible</SelectItem>
                    <SelectItem value="DeepSeek">DeepSeek</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="qwen">Qwen</SelectItem>
                    <SelectItem value="modelarts">Huawei ModelArts</SelectItem>
                    <SelectItem value="ollama">Ollama</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="prov-url">Base URL</FieldLabel>
                <Input id="prov-url" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} disabled={!canManage} />
              </Field>
              <Field>
                <FieldLabel htmlFor="prov-key">API Key</FieldLabel>
                <Input
                  id="prov-key"
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  disabled={!canManage}
                />
                <FieldDescription>密钥仅保存在本地设置中，不会导出。</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="prov-model">文本模型</FieldLabel>
                <Input id="prov-model" value={textModel} onChange={(event) => setTextModel(event.target.value)} disabled={!canManage} />
              </Field>
              <div className="flex gap-2">
                <Button variant="outline" onClick={testDraftProvider} disabled={testingId === "__draft__" || !canManage}>
                  {testingId === "__draft__" ? "测试中" : "测试连接"}
                </Button>
                <Button onClick={saveProvider} disabled={!canManage}>
                  保存供应商
                </Button>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cpu className="size-4 text-primary" />
              任务模型绑定
            </CardTitle>
            <CardDescription>为不同生产环节指定使用的模型。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {taskBindings.map((binding, index) => (
              <div key={binding.task}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">{binding.task}</span>
                    <span className="text-xs text-muted-foreground">{binding.type}</span>
                  </div>
                  <Select
                    value={binding.model}
                    onValueChange={(value) => {
                      const nextModel = value ?? binding.model
                      setTaskBindings((current) =>
                        current.map((item) => (item.task === binding.task ? { ...item, model: nextModel } : item)),
                      )
                    }}
                    disabled={!canManage}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {modelOptions.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {index < taskBindings.length - 1 && <Separator className="mt-3" />}
              </div>
            ))}

            <Button variant="outline" className="self-end" onClick={saveTaskBindings} disabled={!canManage}>
              <Save data-icon="inline-start" />
              保存绑定
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
