"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { ensureCurrentSession, hydrateCurrentSession } from "@/lib/team"

export function SessionBootstrap() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (cancelled) return
      const session = await hydrateCurrentSession()
      if (cancelled) return
      if (session?.userId) ensureCurrentSession()
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [router])

  return null
}
