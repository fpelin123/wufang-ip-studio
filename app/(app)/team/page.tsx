"use client"

import { useEffect, useMemo, useState } from "react"
import { Clock3, Shield, Users, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchStudioSnapshot } from "@/lib/studio-snapshot"
import {
  canManageTeam,
  ensureCurrentSession,
  getCurrentUserId,
  getCurrentUserRole,
  getCurrentSessionHeaders,
  roleDescriptions,
  roleLabels,
  setCurrentUser,
  statusLabels,
  type TeamMember,
  type TeamRole,
  type TeamStatus,
} from "@/lib/team"

const roleOptions: TeamRole[] = ["admin", "editor", "reviewer", "viewer"]
const statusOptions: TeamStatus[] = ["active", "invited", "disabled"]

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<TeamRole>("editor")
  const [currentUserId, setCurrentUserId] = useState("")
  const [currentUserRole, setCurrentUserRole] = useState<TeamRole>("viewer")

  useEffect(() => {
    const controller = new AbortController()
    fetchStudioSnapshot(controller.signal).then((snapshot) => {
      const nextMembers = (snapshot as { teamMembers?: TeamMember[] }).teamMembers ?? []
      setMembers(nextMembers)
      const storedId = getCurrentUserId()
      const storedRole = getCurrentUserRole()
      setCurrentUserId(storedId || nextMembers[0]?.id || "")
      setCurrentUserRole(storedRole)
      ensureCurrentSession()
      if (!storedId && nextMembers[0]) {
        setCurrentUser(nextMembers[0])
      }
      if (storedId) {
        const member = nextMembers.find((item) => item.id === storedId)
        if (member) setCurrentUser(member)
      }
    })
    return () => controller.abort()
  }, [])

  const currentMember = useMemo(
    () => members.find((member) => member.id === currentUserId) ?? members[0] ?? null,
    [currentUserId, members],
  )
  const manageAllowed = canManageTeam(currentUserRole)

  const saveMembers = async (next: TeamMember[]) => {
    setMembers(next)
    await fetch("/api/db/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getCurrentSessionHeaders() },
      body: JSON.stringify({ teamMembers: next }),
    })
  }

  const addMember = async () => {
    if (!manageAllowed) return
    if (!name.trim() || !email.trim()) {
      toast.error("请填写姓名和邮箱")
      return
    }

    const now = new Date().toLocaleString("zh-CN", { hour12: false })
    const next: TeamMember[] = [
      {
        id: `m-${Date.now().toString(36)}`,
        name: name.trim(),
        email: email.trim(),
        role,
        status: "invited",
        lastActiveAt: now,
      },
      ...members,
    ]
    await saveMembers(next)
    setName("")
    setEmail("")
    toast.success("成员已邀请")
  }

  const updateMember = async (id: string, patch: Partial<TeamMember>) => {
    if (!manageAllowed) return
    await saveMembers(members.map((member) => (member.id === id ? { ...member, ...patch } : member)))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="团队管理" description="管理成员、角色和最小权限。" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">当前身份</CardTitle>
          <CardDescription>切换身份后会限制可操作范围。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Select
            value={currentUserId}
            onValueChange={(value) => {
              const member = members.find((item) => item.id === value)
              if (!member) return
              setCurrentUserId(member.id)
              setCurrentUserRole(member.role)
              setCurrentUser(member)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择成员" />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name} · {roleLabels[member.role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            当前角色：{roleLabels[currentUserRole]}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-primary" />
              成员列表
            </CardTitle>
            <CardDescription>当前项目组内可用成员和角色。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">{member.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{member.email}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary">{roleLabels[member.role]}</Badge>
                    <Badge variant="outline">{statusLabels[member.status]}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={member.role}
                    onValueChange={(value) => void updateMember(member.id, { role: value as TeamRole })}
                    disabled={!manageAllowed}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((item) => (
                        <SelectItem key={item} value={item}>
                          {roleLabels[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={member.status}
                    onValueChange={(value) => void updateMember(member.id, { status: value as TeamStatus })}
                    disabled={!manageAllowed}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((item) => (
                        <SelectItem key={item} value={item}>
                          {statusLabels[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="size-4 text-primary" />
              添加成员
            </CardTitle>
            <CardDescription>管理员可以邀请新成员。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="姓名" disabled={!manageAllowed} />
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="邮箱" disabled={!manageAllowed} />
            <Select value={role} onValueChange={(value) => setRole(value as TeamRole)} disabled={!manageAllowed}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {roleLabels[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addMember} disabled={!manageAllowed}>
              <Shield data-icon="inline-start" />
              邀请成员
            </Button>
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Clock3 className="size-3.5" />
                角色说明
              </div>
              <div className="mt-2 grid gap-2">
                {roleOptions.map((item) => (
                  <div key={item}>
                    <div className="font-medium text-foreground">{roleLabels[item]}</div>
                    <div>{roleDescriptions[item]}</div>
                  </div>
                ))}
              </div>
              {!manageAllowed && currentMember && (
                <p className="mt-3 text-xs text-amber-600">当前身份仅可查看，不可修改团队。</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
