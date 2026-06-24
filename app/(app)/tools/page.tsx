import {
  FileText,
  ShieldCheck,
  Eraser,
  Clapperboard,
  LayoutGrid,
  Film,
  Lock,
  ImageIcon,
  Ruler,
  ScanLine,
  PackageOpen,
  ArrowRight,
} from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { tools } from "@/lib/data"

const iconMap: Record<string, typeof FileText> = {
  "proposal-gen": FileText,
  "script-review": ShieldCheck,
  "script-deai": Eraser,
  "script-to-director": Clapperboard,
  "director-to-storyboard": LayoutGrid,
  "seedance-prompt": Film,
  "identity-lock": Lock,
  "image-prompt": ImageIcon,
  "platform-check": Ruler,
  "deai-check": ScanLine,
  "package-export": PackageOpen,
}

const categoryVariant: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  生成: "default",
  审核: "secondary",
  优化: "outline",
  转换: "outline",
  导出: "secondary",
}

export default function ToolsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="工具中心"
        description="按生产环节组织的 AI 工具集，单点接入工作流。"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => {
          const Icon = iconMap[t.id] ?? FileText
          return (
            <Card key={t.id} className="gap-4">
              <CardHeader>
                <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </div>
                <CardTitle className="mt-2 flex items-center gap-2 text-base">
                  {t.title}
                  <Badge
                    variant={categoryVariant[t.category] ?? "outline"}
                    className="ml-auto font-normal"
                  >
                    {t.category}
                  </Badge>
                </CardTitle>
                <CardDescription className="line-clamp-2 leading-relaxed">
                  {t.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="text-foreground/70">输入</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono">
                    {t.input}
                  </span>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full">
                  打开工具
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
