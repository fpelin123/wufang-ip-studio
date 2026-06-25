import { NextResponse } from "next/server"

import { generateDocument, type GenerationRequest } from "@/lib/generation"
import { getSessionFromCookieHeader } from "@/lib/session"

export async function POST(request: Request) {
  const role = getSessionFromCookieHeader(request.headers.get("cookie")).role || "viewer"
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = (await request.json()) as GenerationRequest
  if (!body?.project?.name) {
    return NextResponse.json({ error: "缺少项目名称" }, { status: 400 })
  }

  const result = await generateDocument(body)
  return NextResponse.json(result)
}

