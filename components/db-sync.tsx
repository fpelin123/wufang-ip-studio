"use client"

import { useEffect } from "react"

import {
  hydrateStoredProjects,
  hydrateStoredProviders,
  hydrateStoredReviewIssues,
  hydrateStoredAssets,
  hydrateStoredWorkflowDocument,
  type StudioAsset,
  type StudioProject,
  type StudioProvider,
  type StudioReviewIssue,
} from "@/lib/local-store"
import { getCurrentSessionHeaders } from "@/lib/team"

type DbSnapshot = {
  projects?: StudioProject[]
  providers?: StudioProvider[]
  reviewIssues?: StudioReviewIssue[]
  assets?: StudioAsset[]
  workflowDocuments?: {
    projectId: string
    stepKey: string
    content: string
  }[]
}

export function DbSync() {
  useEffect(() => {
    const pullDbToLocal = async () => {
      const response = await fetch("/api/db/sync", {
        cache: "no-store",
        headers: getCurrentSessionHeaders(),
      })
      if (!response.ok) return
      const data = (await response.json()) as DbSnapshot

      if (data.projects?.length) hydrateStoredProjects(data.projects)
      if (data.providers?.length) hydrateStoredProviders(data.providers)
      if (data.reviewIssues?.length) hydrateStoredReviewIssues(data.reviewIssues)

      for (const asset of data.assets ?? []) {
        hydrateStoredAssets(asset.projectId, (data.assets ?? []).filter((item) => item.projectId === asset.projectId))
      }

      for (const doc of data.workflowDocuments ?? []) {
        hydrateStoredWorkflowDocument(doc.projectId, doc.stepKey, doc.content)
      }
    }

    pullDbToLocal().catch(() => {
      // 数据库不可用时保留本地缓存，不阻断前端。
    })
  }, [])

  return null
}
