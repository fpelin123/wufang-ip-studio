"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Field, FieldLabel, FieldGroup, FieldDescription } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/page-header"
import type { Provider } from "@/lib/data"
import { cn } from "@/lib/utils"
import { Cpu, Plug, KeyRound, CircleCheck, CircleAlert, CircleHelp } from "lucide-react"
import { toast } from "sonner"
import {
  getStoredProviders,
  saveStoredProviders,
  type StudioProvider,
} from "@/lib/local-store"

const statusMeta: Record<Provider["status"], { label: string; icon: typeof CircleCheck; cls: string }> = {
  connected: { label: "已连接", icon: CircleCheck, cls: "text-emerald-600" },
  untested: { label: "未测试", icon: CircleHelp, cls: "text-muted-foreground" },
  error: { label: "连接异常", icon: CircleAlert, cls: "text-destructive" },
}

const taskBindings = [
  { task: "策划 / 剧本生成", model: "deepseek-chat", type: "文本模型" },
  { task: "长文档处理", model: "qwen-long", type: "长文本模型" },
  { task: "视觉锚点理解", model: "gpt-4o", type: "视觉模型" },
  { task: "出图生成", model: "dall-e-3", type: "图像模型" },
]

export default function SettingsPage() {
  const [list, setList] = useState<StudioProvider[]>([])
  const [testingId, setTestingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [type, setType] = useState("OpenAI-compatible")
  const [baseUrl, setBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [textModel, setTextModel] = useState("")

  useEffect(() => {
    setList(getStoredProviders())
  }, [])

  const updateList = (next: StudioProvider[]) => {
    setList(next)
    saveStoredProviders(next)
  }

  const toggle = (id: string) => {
    const next = list.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    updateList(next)
  }

  const testProvider = async (provider: StudioProvider) => {
    setTestingId(provider.id)
    try {
      const response = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(provider),
      })
      const data = await response.json()
      const status: StudioProvider["status"] = response.ok && data.ok ? "connected" : "error"
      updateList(list.map((item) => (item.id === provider.id ? { ...item, status } : item)))
      if (status === "connected") {
        toast.success("连接测试通过", { description: provider.name })
      } else {
        toast.error("连接测试失败", {
          description: data?.error ?? "请检查 Base URL、API Key 和模型名。",
        })
      }
    } catch (error) {
      updateList(list.map((item) => (item.id === provider.id ? { ...item, status: "error" } : item)))
      toast.error("连接测试失败", {
        description: error instanceof Error ? error.message : "请检查网络或供应商配置。",
      })
    } finally {
      setTestingId(null)
    }
  }

  const testDraftProvider = async () => {
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
      visionModel: "—",
      imageModel: "—",
      enabled: true,
      status: "untested",
    })
  }

  const saveProvider = () => {
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
      visionModel: "—",
      imageModel: "—",
      enabled: true,
      status: "untested",
      temperature: 0.7,
      maxTokens: 4000,
      timeoutMs: 60000,
    }

    updateList([provider, ...list])
    setName("")
    setBaseUrl("")
    setApiKey("")
    setTextModel("")
    toast.success("供应商已保存", { description: "已写入本地浏览器配置。" })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="模型设置"
        description="配置多家大模型供应商与 API，按任务类型绑定不同模型，统一管理生产引擎。"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plug className="size-4 text-primary" />
            供应商
          </CardTitle>
          <CardDescription>已接入的大模型供应商及其连接状态。</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">供应商</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>文本模型</TableHead>
                <TableHead>视觉模型</TableHead>
                <TableHead>图像模型</TableHead>
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testProvider(p)}
                        disabled={testingId === p.id}
                      >
                        {testingId === p.id ? "测试中" : "测试"}
                      </Button>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Switch checked={p.enabled} onCheckedChange={() => toggle(p.id)} />
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
                <Input
                  id="prov-name"
                  placeholder="例如：DeepSeek 生产环境"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="prov-type">供应商类型</FieldLabel>
                <Select value={type} onValueChange={(value) => value && setType(value)}>
                  <SelectTrigger id="prov-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OpenAI-compatible">OpenAI-compatible</SelectItem>
                    <SelectItem value="DeepSeek">DeepSeek</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="qwen">Qwen（通义千问）</SelectItem>
                    <SelectItem value="modelarts">Huawei ModelArts</SelectItem>
                    <SelectItem value="ollama">Ollama（本地）</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="prov-url">Base URL</FieldLabel>
                <Input
                  id="prov-url"
                  placeholder="https://api.deepseek.com/v1"
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="prov-key">API Key</FieldLabel>
                <Input
                  id="prov-key"
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                />
                <FieldDescription>密钥仅保存在本地配置，不会随资料包导出。</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="prov-model">文本模型</FieldLabel>
                <Input
                  id="prov-model"
                  placeholder="例如：deepseek-chat"
                  value={textModel}
                  onChange={(event) => setTextModel(event.target.value)}
                />
              </Field>
              <div className="flex gap-2">
                <Button variant="outline" onClick={testDraftProvider} disabled={testingId === "__draft__"}>
                  {testingId === "__draft__" ? "测试中" : "测试连接"}
                </Button>
                <Button onClick={saveProvider}>保存供应商</Button>
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
            {taskBindings.map((b, i) => (
              <div key={b.task}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">{b.task}</span>
                    <span className="text-xs text-muted-foreground">{b.type}</span>
                  </div>
                  <Select defaultValue={b.model}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={b.model}>{b.model}</SelectItem>
                      <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                      <SelectItem value="deepseek-chat">deepseek-chat</SelectItem>
                      <SelectItem value="qwen-max">qwen-max</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {i < taskBindings.length - 1 && <Separator className="mt-3" />}
              </div>
            ))}
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 p-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">失败自动降级</span>
                <span className="text-xs text-muted-foreground">主模型异常时切换到备用本地模型</span>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
