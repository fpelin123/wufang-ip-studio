"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, ChevronDown, Cpu, LogOut, Settings, User } from "lucide-react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { NewProjectDialog } from "@/components/new-project-dialog"
import {
  getActiveProjectId,
  getDefaultTextProvider,
  getStoredProjects,
  setActiveProjectId,
  type StudioProject,
} from "@/lib/local-store"

export function TopBar() {
  const router = useRouter()
  const [projects, setProjects] = useState<StudioProject[]>([])
  const [activeId, setActiveId] = useState("")
  const [modelName, setModelName] = useState("本地模板")

  useEffect(() => {
    const refresh = () => {
      setProjects(getStoredProjects())
      setActiveId(getActiveProjectId())
      setModelName(getDefaultTextProvider()?.textModel ?? "本地模板")
    }

    refresh()
    window.addEventListener("wufang:active-project-change", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener("wufang:active-project-change", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [])

  const changeProject = (value: string | null) => {
    if (!value) return
    setActiveProjectId(value)
    setActiveId(value)
    router.push("/workspace")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-1 h-5" />

      <Select value={activeId} onValueChange={changeProject}>
        <SelectTrigger size="sm" className="w-44">
          <SelectValue placeholder="选择项目" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="ml-auto flex items-center gap-2 md:ml-4 md:mr-auto md:flex-1 md:max-w-md">
        <InputGroup className="hidden md:flex">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput placeholder="搜索项目、文档、资产" />
        </InputGroup>
      </div>

      <div className="flex items-center gap-2">
        <NewProjectDialog />

        <Tooltip>
          <TooltipTrigger
            render={
              <Badge variant="outline" className="hidden gap-1.5 font-normal sm:inline-flex">
                <Cpu className="size-3.5 text-primary" />
                <span className="text-muted-foreground">当前模型</span>
                <span className="font-medium">{modelName}</span>
              </Badge>
            }
          />
          <TooltipContent side="bottom">
            文本生成默认模型，可在“模型设置”中调整。
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-5" />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="h-9 gap-2 px-1.5" aria-label="用户菜单">
                <Avatar className="size-7">
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">五方</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium md:inline">内部团队</span>
                <ChevronDown className="hidden size-4 text-muted-foreground md:inline" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div className="grid leading-tight">
                <span className="text-sm font-medium text-foreground">Wufang IP Studio</span>
                <span className="text-xs font-normal">创作生产工作台</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <User />
                个人资料
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings />
                模型设置
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <LogOut />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
