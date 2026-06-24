"use client"

import { useEffect, useRef, useState } from "react"
import { FileText, ImageIcon, Music, Paperclip, Trash2, UploadCloud, Video } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  addStoredAssets,
  getStoredAssets,
  removeStoredAsset,
  type StudioAsset,
} from "@/lib/local-store"
import { cn } from "@/lib/utils"

const assetIcon = {
  document: FileText,
  image: ImageIcon,
  video: Video,
  audio: Music,
  other: Paperclip,
}

const categoryLabel: Record<StudioAsset["category"], string> = {
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
  const [assets, setAssets] = useState<StudioAsset[]>([])

  useEffect(() => {
    const refresh = () => setAssets(getStoredAssets(projectId))
    refresh()
    window.addEventListener("wufang:assets-change", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener("wufang:assets-change", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [projectId])

  const handleFiles = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? [])
    if (!files.length) return

    const added = addStoredAssets(projectId, files)
    setAssets(getStoredAssets(projectId))
    toast.success("资料已加入项目素材库", {
      description: `已登记 ${added.length} 个文件。`,
    })
    if (inputRef.current) inputRef.current.value = ""
  }

  const removeAsset = (asset: StudioAsset) => {
    removeStoredAsset(projectId, asset.id)
    setAssets(getStoredAssets(projectId))
    toast.success("资料已移除", { description: asset.name })
  }

  return (
    <Card className={cn(compact && "gap-3 py-4")}>
      <CardHeader className={cn(compact && "px-4")}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Paperclip className="size-4 text-primary" />
          项目素材库
        </CardTitle>
        {!compact && (
          <CardDescription>登记世界观、人设、参考剧本、图片和视频素材。</CardDescription>
        )}
      </CardHeader>
      <CardContent className={cn("grid gap-3", compact && "px-4")}>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            handleFiles(event.dataTransfer.files)
          }}
          className={cn(
            "flex w-full min-w-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-dashed px-3 py-6 text-center transition-colors hover:bg-accent/40",
            compact && "py-4",
          )}
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <UploadCloud className="size-5" />
          </div>
          <span className="max-w-full truncate text-sm font-medium">点击或拖拽文件加入素材库</span>
          {!compact && (
            <span className="max-w-full text-wrap text-xs text-muted-foreground">
              当前版本保存文件信息，后续可接入公司对象存储。
            </span>
          )}
        </button>

        <div className="grid gap-2">
          {assets.map((asset) => {
            const Icon = assetIcon[asset.category]
            return (
              <div
                key={asset.id}
                className="flex min-w-0 items-center gap-3 rounded-md border p-2"
              >
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
                  onClick={() => removeAsset(asset)}
                  aria-label="移除资料"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )
          })}
          {assets.length === 0 && (
            <p className="rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">
              暂无资料。
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
