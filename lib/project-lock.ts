import { getCurrentSessionHeaders } from "@/lib/team"

export type ProjectLock = {
  projectId: string
  userId: string
  userName: string
  role: string
  acquiredAt: number
  updatedAt: number
}

export async function fetchProjectLock(projectId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/projects/${projectId}/lock`, {
    signal,
    cache: "no-store",
    headers: getCurrentSessionHeaders(),
  })
  if (!response.ok) return null
  const data = (await response.json()) as { lock?: ProjectLock | null }
  return data.lock ?? null
}

export async function acquireProjectLock(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/lock`, {
    method: "POST",
    headers: getCurrentSessionHeaders(),
  })
  const data = (await response.json()) as { acquired?: boolean; lock?: ProjectLock | null; error?: string }
  return {
    ok: response.ok,
    status: response.status,
    acquired: Boolean(data.acquired),
    lock: data.lock ?? null,
    error: data.error ?? "",
  }
}

export async function releaseProjectLock(projectId: string) {
  await fetch(`/api/projects/${projectId}/lock`, {
    method: "DELETE",
    headers: getCurrentSessionHeaders(),
  }).catch(() => {})
}
