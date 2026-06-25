import { NextResponse, type NextRequest } from "next/server"

import { acquireProjectLock, getProjectLock, releaseProjectLock } from "@/lib/db"
import { getSessionFromCookieHeader } from "@/lib/session"

function getSession(request: Request) {
  const session = getSessionFromCookieHeader(request.headers.get("cookie"))
  const userId = session.userId || request.headers.get("x-wufang-user-id") || ""
  const role = session.role || request.headers.get("x-wufang-role") || "viewer"
  const userName = request.headers.get("x-wufang-user-name") || userId || "未命名用户"
  return { userId, role, userName }
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const lock = getProjectLock(id)
  return NextResponse.json({ lock })
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const session = getSession(request)
  if (!session.userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const result = acquireProjectLock(id, session.userId, session.userName, session.role)
  return NextResponse.json(result, { status: result.acquired ? 200 : 409 })
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const session = getSession(request)
  releaseProjectLock(id, session.userId || undefined)
  return NextResponse.json({ ok: true })
}
