export type TeamRole = "admin" | "editor" | "reviewer" | "viewer"
export type TeamStatus = "active" | "invited" | "disabled"

export type TeamMember = {
  id: string
  name: string
  email: string
  role: TeamRole
  status: TeamStatus
  lastActiveAt: string
}

const currentUserIdKey = "wufang.currentUserId"
const currentUserRoleKey = "wufang.currentUserRole"
const currentUserNameKey = "wufang.currentUserName"

export const roleLabels: Record<TeamRole, string> = {
  admin: "管理员",
  editor: "编辑",
  reviewer: "审校",
  viewer: "查看",
}

export const roleDescriptions: Record<TeamRole, string> = {
  admin: "全量管理项目、成员和系统配置",
  editor: "创建与编辑项目、文档和素材",
  reviewer: "查看内容并处理审校事项",
  viewer: "只读查看项目和结果",
}

export const statusLabels: Record<TeamStatus, string> = {
  active: "活跃",
  invited: "已邀请",
  disabled: "禁用",
}

export function getCurrentUserId() {
  if (typeof window === "undefined") return ""
  return window.localStorage.getItem(currentUserIdKey) ?? ""
}

export function getCurrentUserRole() {
  if (typeof window === "undefined") return "viewer" as TeamRole
  return (window.localStorage.getItem(currentUserRoleKey) as TeamRole | null) ?? "viewer"
}

export function getCurrentUserName() {
  if (typeof window === "undefined") return ""
  return window.localStorage.getItem(currentUserNameKey) ?? (getCurrentUserId() || "")
}

export async function setCurrentUser(member: Pick<TeamMember, "id" | "role">) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(currentUserIdKey, member.id)
  window.localStorage.setItem(currentUserRoleKey, member.role)
  window.localStorage.setItem(currentUserNameKey, member.id)
  await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: member.id, role: member.role }),
  }).catch(() => {})
  window.dispatchEvent(new CustomEvent("wufang:current-user-change", { detail: member.id }))
}

export function clearCurrentUser() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(currentUserIdKey)
  window.localStorage.removeItem(currentUserRoleKey)
  window.localStorage.removeItem(currentUserNameKey)
  fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "", role: "viewer" }),
  }).catch(() => {})
  window.dispatchEvent(new CustomEvent("wufang:current-user-change", { detail: "" }))
}

export function ensureCurrentSession() {
  if (typeof window === "undefined") return
  const userId = getCurrentUserId()
  const role = getCurrentUserRole()
  fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, role }),
  }).catch(() => {})
}

export async function hydrateCurrentSession() {
  if (typeof window === "undefined") return null
  try {
    const response = await fetch("/api/session", { cache: "no-store" })
    if (!response.ok) return null
    const data = (await response.json()) as { userId?: string; role?: TeamRole }
    if (data.userId) {
      window.localStorage.setItem(currentUserIdKey, data.userId)
      window.localStorage.setItem(currentUserNameKey, data.userId)
    }
    if (data.role) window.localStorage.setItem(currentUserRoleKey, data.role)
    return data
  } catch {
    return null
  }
}

export function canEditContent(role: TeamRole) {
  return role === "admin" || role === "editor"
}

export function canManageTeam(role: TeamRole) {
  return role === "admin"
}

export function canResolveReview(role: TeamRole) {
  return role === "admin" || role === "reviewer"
}

export function getCurrentSessionHeaders() {
  if (typeof window === "undefined") {
    return {
      "x-wufang-user-id": "",
      "x-wufang-role": "viewer",
      "x-wufang-user-name": "",
    }
  }
  return {
    "x-wufang-user-id": getCurrentUserId() || "",
    "x-wufang-role": getCurrentUserRole() || "viewer",
    "x-wufang-user-name": getCurrentUserName() || getCurrentUserId() || "",
  }
}
