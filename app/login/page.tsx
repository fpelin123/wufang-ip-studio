"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Search, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { fetchStudioSnapshot } from "@/lib/studio-snapshot"
import { hydrateCurrentSession, setCurrentUser, type TeamMember } from "@/lib/team"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState("")

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    const run = async () => {
      const snapshot = await fetchStudioSnapshot(controller.signal)
      if (cancelled) return
      const nextMembers = snapshot.teamMembers ?? []
      setMembers(nextMembers)
      setSelected(nextMembers[0]?.id || "")

      const session = await hydrateCurrentSession()
      if (cancelled) return
      if (session?.userId && nextMembers.some((member) => member.id === session.userId)) {
        router.replace(searchParams.get("next") || "/")
      }
    }

    void run()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [router, searchParams])

  const filtered = useMemo(() => {
    const keyword = query.trim()
    if (!keyword) return members
    return members.filter((member) => [member.name, member.email, member.role].some((item) => item.includes(keyword)))
  }, [members, query])

  const handleLogin = async (id: string) => {
    const member = members.find((item) => item.id === id)
    if (!member) return
    await setCurrentUser(member)
    toast.success(`已切换为 ${member.name}`)
    router.replace(searchParams.get("next") || "/")
  }

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-primary" />
            选择身份进入系统
          </CardTitle>
          <CardDescription>从团队成员中选择一个身份，然后进入工作台。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索成员、邮箱或角色"
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={() => void handleLogin(selected)} disabled={!selected}>
              <ArrowRight data-icon="inline-start" />
              进入系统
            </Button>
          </div>

          <div className="grid gap-2">
            {filtered.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setSelected(member.id)}
                className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent/40"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">{member.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{member.email}</div>
                </div>
                <Badge variant={selected === member.id ? "default" : "secondary"}>{member.role}</Badge>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">没有找到匹配成员。</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
