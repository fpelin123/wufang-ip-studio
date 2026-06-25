import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { getCurrentSessionSetting } from "@/lib/db"
import { sessionCookieNames } from "@/lib/session"

export async function AuthGuard() {
  const cookieStore = await cookies()
  const userId = cookieStore.get(sessionCookieNames.userId)?.value ?? ""
  const persisted = getCurrentSessionSetting()

  if (!userId && !persisted?.userId) {
    redirect("/login")
  }

  return null
}
