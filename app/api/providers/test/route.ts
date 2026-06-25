import { NextResponse } from "next/server"
import { getSessionFromCookieHeader } from "@/lib/session"

type TestRequest = {
  baseUrl?: string
  apiKey?: string
  textModel?: string
}

export async function POST(request: Request) {
  const role = getSessionFromCookieHeader(request.headers.get("cookie")).role || "viewer"
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 })
  }

  const body = (await request.json()) as TestRequest
  const baseUrl = body.baseUrl?.trim().replace(/\/$/, "")

  if (!baseUrl || !body.textModel?.trim()) {
    return NextResponse.json({ ok: false, error: "缺少 Base URL 或文本模型" }, { status: 400 })
  }

  if (!body.apiKey?.trim()) {
    return NextResponse.json({ ok: false, error: "缺少 API Key" }, { status: 400 })
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${body.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: body.textModel.trim(),
        max_tokens: 16,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: "连接测试。请只回复 OK。",
          },
        ],
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      return NextResponse.json({
        ok: false,
        error: `HTTP ${response.status}`,
        detail: detail.slice(0, 500),
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "连接失败",
    })
  }
}
