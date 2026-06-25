import { NextResponse } from "next/server"
import { getCurrentSessionSetting, setCurrentSessionSetting } from "@/lib/db"

const userIdCookie = "wufang_user_id"
const roleCookie = "wufang_user_role"

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie") ?? ""
  const persisted = getCurrentSessionSetting()
  const userId = matchCookie(cookie, userIdCookie) || persisted?.userId || ""
  const role = matchCookie(cookie, roleCookie) || persisted?.role || "viewer"

  return NextResponse.json({ userId, role })
}

export async function POST(request: Request) {
  const body = (await request.json()) as { userId?: string; role?: string }
  const userId = body.userId ?? ""
  const role = body.role ?? "viewer"
  setCurrentSessionSetting(userId, role)
  const response = NextResponse.json({ ok: true })

  response.headers.append("Set-Cookie", `${userIdCookie}=${encodeURIComponent(userId)}; Path=/; SameSite=Lax`)
  response.headers.append("Set-Cookie", `${roleCookie}=${encodeURIComponent(role)}; Path=/; SameSite=Lax`)

  return response
}

function matchCookie(cookie: string, name: string) {
  const match = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
  if (!match) return ""
  return decodeURIComponent(match.slice(name.length + 1))
}
