import {
  Mountain,
  Swords,
  Shirt,
  ImageIcon,
  Sparkles,
  FileText,
  Plus,
} from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { characters } from "@/lib/data"

const scenes = [
  { name: "千面殿", tag: "EP01 · EP12", icon: Mountain },
  { name: "凿天峰顶", tag: "EP03 · EP18", icon: Mountain },
  { name: "云隐市集", tag: "EP05", icon: Mountain },
  { name: "古谷书院", tag: "EP08", icon: Mountain },
]
const props = [
  { name: "千面面具", tag: "关键道具", icon: Swords },
  { name: "凿天斧", tag: "关键道具", icon: Swords },
  { name: "青铜罗盘", tag: "线索道具", icon: Swords },
]
const costumes = [
  { name: "玄衣 v2", tag: "沈千面", icon: Shirt },
  { name: "战甲 v1", tag: "凿天君", icon: Shirt },
  { name: "青衫 v1", tag: "苏晚晴", icon: Shirt },
]
const docs = [
  { name: "《千面》世界观设定集.md", tag: "策划", date: "06-20" },
  { name: "《千面》IP 提案 v3.md", tag: "策划", date: "06-21" },
  { name: "分集大纲 EP01-EP12.md", tag: "大纲", date: "06-22" },
]

function SimpleAssetGrid({
  items,
}: {
  items: { name: string; tag: string; icon: typeof Mountain }[]
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((it) => (
        <Card key={it.name} className="gap-0 py-0">
          <div className="flex aspect-video items-center justify-center rounded-t-xl bg-muted text-muted-foreground">
            <it.icon className="size-7" />
          </div>
          <div className="flex items-center justify-between gap-2 p-3">
            <span className="truncate text-sm font-medium">{it.name}</span>
            <Badge variant="outline" className="shrink-0 text-xs">
              {it.tag}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  )
}

export default function AssetsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="资产库"
        description="集中管理角色、场景、道具、服装与生成素材，保证跨集一致性。"
        actions={
          <Button size="sm">
            <Plus data-icon="inline-start" />
            上传资产
          </Button>
        }
      />

      <Tabs defaultValue="character">
        <TabsList className="flex-wrap">
          <TabsTrigger value="character">角色</TabsTrigger>
          <TabsTrigger value="scene">场景</TabsTrigger>
          <TabsTrigger value="prop">道具</TabsTrigger>
          <TabsTrigger value="costume">服装</TabsTrigger>
          <TabsTrigger value="reference">参考图</TabsTrigger>
          <TabsTrigger value="generated">生成图</TabsTrigger>
          <TabsTrigger value="doc">文档</TabsTrigger>
        </TabsList>

        <TabsContent value="character">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {characters.map((c) => (
              <Card key={c.id} className="gap-0 overflow-hidden py-0">
                <div className="flex gap-3 p-3">
                  <div className="size-20 shrink-0 overflow-hidden rounded-md bg-muted">
                    {c.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.image || "/placeholder.svg"}
                        alt={`角色 ${c.name} 的参考图`}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <ImageIcon className="size-6" />
                      </div>
                    )}
                  </div>
                  <div className="grid min-w-0 flex-1 content-start gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {c.identityLock}
                    </p>
                  </div>
                </div>
                <Separator />
                <CardContent className="grid gap-2 py-3 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">视觉锚点</span>
                    <span className="text-right font-medium">
                      {c.visualAnchor}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">服装版本</span>
                    <span className="font-medium">{c.costume}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">关联分集</span>
                    <span className="font-mono">{c.episodes}</span>
                  </div>
                </CardContent>
                <CardFooter className="border-t py-2.5">
                  <Button variant="ghost" size="sm" className="w-full">
                    查看身份锁定段
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scene">
          <SimpleAssetGrid items={scenes} />
        </TabsContent>
        <TabsContent value="prop">
          <SimpleAssetGrid items={props} />
        </TabsContent>
        <TabsContent value="costume">
          <SimpleAssetGrid items={costumes} />
        </TabsContent>

        <TabsContent value="reference">
          <Empty className="rounded-xl border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ImageIcon />
              </EmptyMedia>
              <EmptyTitle>暂无参考图</EmptyTitle>
              <EmptyDescription>
                上传外部参考素材，用于风格对齐与视觉开发。
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm">
                <Plus data-icon="inline-start" />
                上传参考图
              </Button>
            </EmptyContent>
          </Empty>
        </TabsContent>

        <TabsContent value="generated">
          <Empty className="rounded-xl border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Sparkles />
              </EmptyMedia>
              <EmptyTitle>暂无生成图</EmptyTitle>
              <EmptyDescription>
                通过「出图提示词生成」工具产出的图片会归档在此。
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </TabsContent>

        <TabsContent value="doc">
          <Card className="py-0">
            <CardContent className="flex flex-col gap-1 py-2">
              {docs.map((d, i) => (
                <div key={d.name}>
                  <div className="flex items-center gap-3 py-2.5">
                    <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <FileText className="size-4" />
                    </div>
                    <div className="grid min-w-0 flex-1 gap-0.5">
                      <span className="truncate text-sm font-medium">
                        {d.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        更新于 {d.date}
                      </span>
                    </div>
                    <Badge variant="secondary">{d.tag}</Badge>
                  </div>
                  {i < docs.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
