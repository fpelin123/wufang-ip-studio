import { NextResponse } from "next/server"

import {
  getWorkflowDocument,
  getWorkflowDocumentVersion,
  getSetting,
  addAuditEvent,
  listAssets,
  listAuditEvents,
  listProjects,
  listProjectLocks,
  listProviders,
  listTeamMembers,
  listWorkflowDocumentVersions,
  listWorkflowDocuments,
  listReviewIssues,
  replaceProjectAssets,
  saveProviders,
  saveTeamMembers,
  saveWorkflowDocument,
  setSetting,
  upsertAssets,
  upsertProject,
  upsertReviewIssue,
} from "@/lib/db"
import { workflowSteps } from "@/lib/data"
import { getSessionFromCookieHeader } from "@/lib/session"

function getRole(request: Request) {
  return getSessionFromCookieHeader(request.headers.get("cookie")).role || (request.headers.get("x-wufang-role") ?? "viewer")
}

function canEditContent(role: string) {
  return role === "admin" || role === "editor"
}

function canResolveReview(role: string) {
  return role === "admin" || role === "editor" || role === "reviewer"
}

type SyncPayload = {
  projects?: Parameters<typeof upsertProject>[0][]
  providers?: Parameters<typeof saveProviders>[0]
  teamMembers?: Parameters<typeof saveTeamMembers>[0]
  reviewIssues?: Parameters<typeof upsertReviewIssue>[0][]
  assets?: Parameters<typeof upsertAssets>[0]
  assetProjectId?: string
  workflowDocuments?: {
    projectId: string
    stepKey: string
    content: string
  }[]
  settings?: {
    key: string
    value: string
  }[]
}

export async function GET() {
  const projects = listProjects()
  return NextResponse.json({
    projects,
    providers: listProviders(),
    teamMembers: listTeamMembers(),
    reviewIssues: listReviewIssues(),
    projectLocks: listProjectLocks(),
    assets: projects.flatMap((project) => listAssets(project.id)),
    auditEvents: listAuditEvents(),
    workflowDocuments: listWorkflowDocuments(),
    workflowDocumentVersions: projects.flatMap((project) =>
      workflowSteps.flatMap((step) =>
        listWorkflowDocumentVersions(project.id, step.key).map((version) => ({
          projectId: project.id,
          stepKey: step.key,
          ...version,
        })),
      ),
    ),
    settings: {
      taskBindings: getSetting("taskBindings"),
    },
  })
}

export async function POST(request: Request) {
  const payload = (await request.json()) as SyncPayload
  const role = getRole(request)
  const contentAllowed = canEditContent(role)
  const reviewAllowed = canResolveReview(role)

  if (payload.projects?.length && !contentAllowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  if (payload.providers && !contentAllowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  if (payload.teamMembers && role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  if (payload.assets?.length && !contentAllowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  if (payload.workflowDocuments?.length && !contentAllowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  if (payload.settings?.length && role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  if (payload.reviewIssues?.length && !reviewAllowed && !contentAllowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  for (const project of payload.projects ?? []) {
    upsertProject(project)
  }

  if (payload.providers) {
    saveProviders(payload.providers)
  }

  if (payload.teamMembers) {
    saveTeamMembers(payload.teamMembers)
  }

  for (const issue of payload.reviewIssues ?? []) {
    upsertReviewIssue(issue)
  }

  if (payload.assetProjectId) {
    replaceProjectAssets(payload.assetProjectId, payload.assets ?? [])
  } else if (payload.assets?.length) {
    upsertAssets(payload.assets)
  }

  for (const document of payload.workflowDocuments ?? []) {
    saveWorkflowDocument(document.projectId, document.stepKey, document.content)
  }

  for (const setting of payload.settings ?? []) {
    setSetting(setting.key, setting.value)
  }

  if (payload.projects?.length || payload.providers?.length || payload.teamMembers?.length || payload.reviewIssues?.length || payload.assets?.length || payload.workflowDocuments?.length || payload.settings?.length) {
    addAuditEvent({
      id: `audit-${Date.now()}`,
      scope: "sync",
      action: "同步",
      target: "数据库",
      detail: "从本地状态写入最新数据。",
      actor: "local-sync",
      createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
    })
  }

  return NextResponse.json({ ok: true })
}

export async function PUT(request: Request) {
  const { projectId, stepKey, versionLabel } = (await request.json()) as {
    projectId?: string
    stepKey?: string
    versionLabel?: string
  }

  if (!projectId || !stepKey) {
    return NextResponse.json({ error: "缺少 projectId 或 stepKey" }, { status: 400 })
  }

  return NextResponse.json({
    content: versionLabel
      ? getWorkflowDocumentVersion(projectId, stepKey, versionLabel)
      : getWorkflowDocument(projectId, stepKey),
  })
}
