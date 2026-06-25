"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Search, Folder, FileText, ImageIcon, ClipboardList } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { fetchStudioSnapshot } from "@/lib/studio-snapshot"
import { searchStudioData, type SearchResult } from "@/lib/search"

const iconMap = {
  project: Folder,
  document: FileText,
  asset: ImageIcon,
  review: ClipboardList,
} as const

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") ?? ""
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])

  useEffect(() => {
    const controller = new AbortController()
    fetchStudioSnapshot(controller.signal).then((snapshot) => {
      setResults(
        searchStudioData({
          query: initialQuery,
          projects: snapshot.projects,
          documents: snapshot.workflowDocuments,
          assets: snapshot.assets,
          reviews: snapshot.reviewIssues,
        }),
      )
    })
    return () => controller.abort()
  }, [initialQuery])

  const submit = () => {
    router.push(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  const summary = useMemo(() => {
    const count = results.length
    return count
  }, [results])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="全局搜索"
        description="搜索项目、文档、素材和审校记录。"
        actions={
          <div className="flex items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit()
              }}
              className="w-72"
              placeholder="输入关键词"
            />
            <Button onClick={submit}>
              <Search data-icon="inline-start" />
              搜索
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">结果 {summary}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {results.map((item) => {
            const Icon = iconMap[item.type]
            return (
              <button
                key={item.id}
                onClick={() => router.push(item.href)}
                className="flex w-full items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent/50"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{item.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{item.subtitle}</div>
                  </div>
                </div>
                <Badge variant="secondary">{item.type}</Badge>
              </button>
            )
          })}
          {results.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">没有找到结果。</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
