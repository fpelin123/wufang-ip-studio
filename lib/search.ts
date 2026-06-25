import type { StudioAsset, StudioProject, StudioReviewIssue } from "@/lib/local-store"

export type SearchResult =
  | {
      type: "project"
      id: string
      title: string
      subtitle: string
      href: string
    }
  | {
      type: "document"
      id: string
      title: string
      subtitle: string
      href: string
    }
  | {
      type: "asset"
      id: string
      title: string
      subtitle: string
      href: string
    }
  | {
      type: "review"
      id: string
      title: string
      subtitle: string
      href: string
    }

function includes(text: string, query: string) {
  return text.toLowerCase().includes(query.toLowerCase())
}

export function searchStudioData(params: {
  query: string
  projects: StudioProject[]
  documents: { projectId: string; stepKey: string; content: string }[]
  assets: StudioAsset[]
  reviews: StudioReviewIssue[]
}) {
  const query = params.query.trim()
  if (!query) return []

  const results: SearchResult[] = []

  for (const project of params.projects) {
    if (
      includes(project.name, query) ||
      includes(project.owner, query) ||
      includes(project.type, query) ||
      includes(project.platform, query)
    ) {
      results.push({
        type: "project",
        id: project.id,
        title: project.name,
        subtitle: `${project.type} · ${project.platform} · ${project.currentStep}`,
        href: `/projects/${project.id}`,
      })
    }
  }

  for (const document of params.documents) {
    if (includes(document.content, query) || includes(document.stepKey, query)) {
      results.push({
        type: "document",
        id: `${document.projectId}-${document.stepKey}`,
        title: `${document.projectId} / ${document.stepKey}`,
        subtitle: document.content.slice(0, 80).replace(/\s+/g, " "),
        href: `/workspace?project=${document.projectId}&step=${document.stepKey}`,
      })
    }
  }

  for (const asset of params.assets) {
    if (includes(asset.name, query) || includes(asset.category, query)) {
      results.push({
        type: "asset",
        id: asset.id,
        title: asset.name,
        subtitle: `${asset.category} · ${asset.projectId}`,
        href: `/projects/${asset.projectId}`,
      })
    }
  }

  for (const review of params.reviews) {
    if (
      includes(review.id, query) ||
      includes(review.project, query) ||
      includes(review.location, query) ||
      includes(review.summary, query)
    ) {
      results.push({
        type: "review",
        id: review.id,
        title: `${review.project} / ${review.location}`,
        subtitle: `${review.severity} · ${review.status}`,
        href: "/review",
      })
    }
  }

  return results.slice(0, 20)
}
