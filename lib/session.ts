export const sessionCookieNames = {
  userId: "wufang_user_id",
  role: "wufang_user_role",
} as const

export function parseCookieHeader(cookieHeader: string | null) {
  const entries = new Map<string, string>()
  for (const part of (cookieHeader ?? "").split(";")) {
    const [rawKey, ...rest] = part.trim().split("=")
    if (!rawKey) continue
    entries.set(rawKey, decodeURIComponent(rest.join("=") || ""))
  }
  return entries
}

export function getSessionFromCookieHeader(cookieHeader: string | null) {
  const cookies = parseCookieHeader(cookieHeader)
  return {
    userId: cookies.get(sessionCookieNames.userId) ?? "",
    role: cookies.get(sessionCookieNames.role) ?? "viewer",
  }
}
