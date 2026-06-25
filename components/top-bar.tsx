"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Cpu, LogOut, Search, Settings, User } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { NewProjectDialog } from "@/components/new-project-dialog"
import { fetchStudioSnapshot } from "@/lib/studio-snapshot"
import { getActiveProjectId, setActiveProjectId, type StudioProject } from "@/lib/local-store"
import { clearCurrentUser, ensureCurrentSession, getCurrentUserId, getCurrentUserRole, roleLabels } from "@/lib/team"

export function TopBar() {
  const router = useRouter()
  const [projects, setProjects] = useState<StudioProject[]>([])
  const [activeId, setActiveId] = useState("")
  const [modelName, setModelName] = useState("未配置模型")
  const [query, setQuery] = useState("")

  useEffect(() => {
    ensureCurrentSession()
    const controller = new AbortController()
    fetchStudioSnapshot(controller.signal).then((snapshot) => {
      setProjects(snapshot.projects)
      setActiveId(getActiveProjectId())
      setModelName(snapshot.providers.find((provider) => provider.enabled)?.textModel ?? "未配置模型")
    })
    return () => controller.abort()
  }, [])

  const changeProject = (value: string | null) => {
    if (!value) return
    setActiveProjectId(value)
    setActiveId(value)
    router.push("/workspace")
    router.refresh()
  }

  const submitSearch = () => {
    const keyword = query.trim()
    if (!keyword) return
    router.push(`/search?q=${encodeURIComponent(keyword)}`)
    setQuery("")
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
          <InputGroupInput
            placeholder="搜索项目、文档、素材、审校"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitSearch()
            }}
          />
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
          <TooltipContent side="bottom">当前启用的文本模型</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-5" />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="h-9 gap-2 px-1.5" aria-label="用户菜单">
                <Avatar className="size-7">
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">团</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium md:inline">内部团队</span>
                <ChevronDown className="hidden size-4 text-muted-foreground md:inline" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="grid leading-tight">
                <span className="text-sm font-medium text-foreground">Wufang IP Studio</span>
                <span className="text-xs font-normal">
                  {getCurrentUserId() || "未登录"} · {roleLabels[getCurrentUserRole()]}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/login")}>
                <User />
                登录 / 切换身份
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings />
                模型设置
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                clearCurrentUser()
                router.push("/login")
              }}
            >
              <LogOut />
              退出
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
