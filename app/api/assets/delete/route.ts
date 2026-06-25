import { NextResponse } from "next/server"

import { deleteAsset } from "@/lib/db"
import { removeProjectFile } from "@/lib/storage"
import { getSessionFromCookieHeader } from "@/lib/session"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const role = getSessionFromCookieHeader(request.headers.get("cookie")).role || "viewer"
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { projectId, assetId, filePath } = (await request.json()) as {
    projectId?: string
    assetId?: string
    filePath?: string
  }

  if (!projectId || !assetId) {
    return NextResponse.json({ error: "missing projectId or assetId" }, { status: 400 })
  }

  deleteAsset(projectId, assetId)
  if (filePath) {
    removeProjectFile(filePath)
  }

  return NextResponse.json({ ok: true })
}
