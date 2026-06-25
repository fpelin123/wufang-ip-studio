import { NextResponse } from "next/server"

import { addAuditEvent, upsertAssets } from "@/lib/db"
import { saveProjectFile } from "@/lib/storage"
import { getSessionFromCookieHeader } from "@/lib/session"

export const runtime = "nodejs"

type UploadAsset = {
  id: string
  projectId: string
  name: string
  type: string
  size: number
  category: "document" | "image" | "video" | "audio" | "other"
  addedAt: string
  filePath: string
}

export async function POST(request: Request) {
  const role = getSessionFromCookieHeader(request.headers.get("cookie")).role || "viewer"
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const formData = await request.formData()
  const projectId = String(formData.get("projectId") ?? "")
  const files = formData.getAll("files").filter((item): item is File => item instanceof File)

  if (!projectId || files.length === 0) {
    return NextResponse.json({ error: "missing projectId or files" }, { status: 400 })
  }

  const now = new Date().toLocaleString("zh-CN", { hour12: false })
  const assets = await Promise.all<UploadAsset>(
    files.map(async (file) => {
      const bytes = Buffer.from(await file.arrayBuffer())
      const filePath = saveProjectFile(projectId, file.name, bytes)
      return {
        id: `${projectId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        projectId,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        category: file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("video/")
            ? "video"
            : file.type.startsWith("audio/")
              ? "audio"
          : "document",
        addedAt: now,
        filePath,
      }
    }),
  )

  upsertAssets(assets)
  addAuditEvent({
    id: `audit-upload-${Date.now()}`,
    scope: "assets",
    action: "上传",
    target: projectId,
    detail: `上传 ${assets.length} 个文件`,
    actor: "local-user",
    createdAt: now,
  })

  return NextResponse.json({ ok: true, assets })
}
