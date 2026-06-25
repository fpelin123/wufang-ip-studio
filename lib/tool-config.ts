import { tools } from "@/lib/data"

export type ToolId = (typeof tools)[number]["id"]

export type ToolWriteBack = {
  step: string
  label: string
  progress: number
  status: "in-progress" | "pending-review" | "passed"
}

export const toolWriteBackMap: Record<ToolId, ToolWriteBack> = {
  "proposal-gen": { step: "proposal", label: "策划案", progress: 18, status: "in-progress" },
  "script-review": { step: "review", label: "审核", progress: 90, status: "pending-review" },
  "script-deai": { step: "script", label: "剧本", progress: 35, status: "in-progress" },
  "script-to-director": { step: "director", label: "导演讲戏", progress: 55, status: "in-progress" },
  "director-to-storyboard": { step: "storyboard", label: "分镜", progress: 70, status: "in-progress" },
  "seedance-prompt": { step: "visual", label: "视觉开发", progress: 75, status: "in-progress" },
  "identity-lock": { step: "visual", label: "视觉开发", progress: 72, status: "in-progress" },
  "image-prompt": { step: "prompt", label: "出图提示词", progress: 78, status: "in-progress" },
  "platform-check": { step: "review", label: "审核", progress: 88, status: "pending-review" },
  "deai-check": { step: "review", label: "审核", progress: 90, status: "pending-review" },
  "package-export": { step: "export", label: "导出", progress: 100, status: "passed" },
}

export const toolDefaultInput: Record<ToolId, string> = {
  "proposal-gen": "当前项目参考资料、角色设定、分镜草稿。",
  "script-review": "请检查剧本结构、节奏和平台适配。",
  "script-deai": "请将以下剧本文案做去 AI 痕迹处理。",
  "script-to-director": "请把剧本转为导演讲戏稿。",
  "director-to-storyboard": "请把导演讲戏稿转为分镜表。",
  "seedance-prompt": "请基于分镜生成 Seedance 提示词。",
  "identity-lock": "请整理角色视觉锚点和身份锁定描述。",
  "image-prompt": "请生成出图提示词与场景说明。",
  "platform-check": "请检查平台规格适配。",
  "deai-check": "请检查外发版本 AI 痕迹。",
  "package-export": "请整理项目资料包导出内容。",
}

