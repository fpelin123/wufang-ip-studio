import type { StudioAsset, StudioProject, StudioProvider, StudioReviewIssue } from "@/lib/local-store"
import type { TeamMember } from "@/lib/team"
import { getCurrentSessionHeaders } from "@/lib/team"

export type StudioSnapshot = {
  projects: StudioProject[]
  providers: StudioProvider[]
  reviewIssues: StudioReviewIssue[]
  teamMembers?: TeamMember[]
  projectLocks?: {
    projectId: string
    userId: string
    userName: string
    role: string
    acquiredAt: number
    updatedAt: number
  }[]
  auditEvents?: {
    id: string
    scope: string
    action: string
    target: string
    detail: string
    actor: string
    createdAt: string
  }[]
  assets: StudioAsset[]
  settings?: Record<string, string>
  workflowDocumentVersions?: {
    projectId: string
    stepKey: string
    versionLabel: string
    content: string
    createdAt: string
  }[]
  workflowDocuments: {
    projectId: string
    stepKey: string
    content: string
    updatedAt?: string
  }[]
}

const emptySnapshot: StudioSnapshot = {
  projects: [],
  providers: [],
  reviewIssues: [],
  auditEvents: [],
  assets: [],
  workflowDocuments: [],
}

export async function fetchStudioSnapshot(signal?: AbortSignal): Promise<StudioSnapshot> {
  try {
    const response = await fetch("/api/db/sync", {
      signal,
      cache: "no-store",
      headers: getCurrentSessionHeaders(),
    })
    if (!response.ok) return emptySnapshot
    const data = (await response.json()) as Partial<StudioSnapshot>
    return {
      projects: data.projects ?? [],
      providers: data.providers ?? [],
      reviewIssues: data.reviewIssues ?? [],
      teamMembers: data.teamMembers ?? [],
      projectLocks: data.projectLocks ?? [],
      auditEvents: data.auditEvents ?? [],
      assets: data.assets ?? [],
      settings: data.settings ?? {},
    workflowDocumentVersions: data.workflowDocumentVersions ?? [],
    workflowDocuments: data.workflowDocuments ?? [],
  }
  } catch {
    return emptySnapshot
  }
}

export function getWorkflowDocumentFromSnapshot(
  snapshot: StudioSnapshot,
  projectId: string,
  stepKey: string,
) {
  return snapshot.workflowDocuments.find(
    (document) => document.projectId === projectId && document.stepKey === stepKey,
  )?.content
}

export function getProjectFromSnapshot(snapshot: StudioSnapshot, projectId: string) {
  return snapshot.projects.find((project) => project.id === projectId) ?? null
}

export function getAssetsFromSnapshot(snapshot: StudioSnapshot, projectId: string) {
  return snapshot.assets.filter((asset) => asset.projectId === projectId)
}
