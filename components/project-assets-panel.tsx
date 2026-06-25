"use client"

import { useEffect, useRef, useState } from "react"
import { FileText, ImageIcon, Music, Paperclip, Trash2, UploadCloud, Video } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { fetchStudioSnapshot, getAssetsFromSnapshot } from "@/lib/studio-snapshot"
import type { StudioAsset } from "@/lib/local-store"
import { canEditContent, getCurrentUserRole, getCurrentSessionHeaders } from "@/lib/team"

type StoredAsset = StudioAsset & { filePath?: string }

const assetIcon = {
  document: FileText,
  image: ImageIcon,
  video: Video,
  audio: Music,
  other: Paperclip,
}

const categoryLabel: Record<StoredAsset["category"], string> = {
  document: "文档",
  image: "图片",
  video: "视频",
  audio: "音频",
  other: "其他",
}

export function ProjectAssetsPanel({
  projectId,
  compact = false,
}: {
  projectId: string
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [assets, setAssets] = useState<StoredAsset[]>([])
  const canEdit = canEditContent(getCurrentUserRole())

  useEffect(() => {
    const controller = new AbortController()
    fetchStudioSnapshot(controller.signal).then((snapshot) => {
      setAssets(getAssetsFromSnapshot(snapshot, projectId) as StoredAsset[])
    })
    return () => controller.abort()
  }, [projectId])

  const handleFiles = async (fileList: FileList | null) => {
    if (!canEdit) {
      toast.error("当前身份无权上传素材")
      return
    }

    const files = Array.from(fileList ?? [])
    if (!files.length) return

    const formData = new FormData()
    formData.append("projectId", projectId)
    for (const file of files) {
      formData.append("files", file)
    }

    const response = await fetch("/api/assets/upload", {
      method: "POST",
      headers: getCurrentSessionHeaders(),
      body: formData,
    })
    const data = await response.json()
    if (!response.ok) {
      toast.error("上传失败", { description: data?.error ?? "请重试" })
      return
    }

    setAssets((current) => [...data.assets, ...current])
    toast.success("素材已上传", {
      description: `已上传 ${data.assets.length} 个文件`,
    })
    if (inputRef.current) inputRef.current.value = ""
  }

  const removeAsset = async (asset: StoredAsset) => {
    if (!canEdit) {
      toast.error("当前身份无权删除素材")
      return
    }

    const response = await fetch("/api/assets/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getCurrentSessionHeaders() },
      body: JSON.stringify({
        projectId,
        assetId: asset.id,
        filePath: asset.filePath,
      }),
    })
    if (!response.ok) {
      toast.error("删除失败")
      return
    }

    setAssets((current) => current.filter((item) => item.id !== asset.id))
    toast.success("素材已删除", { description: asset.name })
  }

  return (
    <Card className={cn(compact && "gap-3 py-4")}>
      <CardHeader className={cn(compact && "px-4")}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Paperclip className="size-4 text-primary" />
          项目素材库
        </CardTitle>
        {!compact && <CardDescription>管理项目参考文件、图片、视频和音频素材。</CardDescription>}
      </CardHeader>
      <CardContent className={cn("grid gap-3", compact && "px-4")}>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          disabled={!canEdit}
          onChange={(event) => void handleFiles(event.target.files)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={!canEdit}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            void handleFiles(event.dataTransfer.files)
          }}
          className={cn(
            "flex w-full min-w-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-dashed px-3 py-6 text-center transition-colors hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-60",
            compact && "py-4",
          )}
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <UploadCloud className="size-5" />
          </div>
          <span className="max-w-full truncate text-sm font-medium">点击或拖拽上传素材</span>
          {!compact && (
            <span className="max-w-full text-wrap text-xs text-muted-foreground">
              文件会保存到服务端磁盘并同步到数据库。
            </span>
          )}
        </button>

        <div className="grid gap-2">
          {assets.map((asset) => {
            const Icon = assetIcon[asset.category]
            return (
              <div key={asset.id} className="flex min-w-0 items-center gap-3 rounded-md border p-2">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="block max-w-full truncate text-sm font-medium" title={asset.name}>
                    {asset.name}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {formatBytes(asset.size)} · {asset.addedAt}
                  </div>
                </div>
                <Badge variant="secondary" className="hidden shrink-0 font-normal sm:inline-flex">
                  {categoryLabel[asset.category]}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => void removeAsset(asset)}
                  disabled={!canEdit}
                  aria-label="删除素材"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )
          })}
          {assets.length === 0 && (
            <p className="rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">
              暂无素材。
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
