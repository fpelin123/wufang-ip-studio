export type WorkflowStatus =
  | "not-started"
  | "in-progress"
  | "pending-review"
  | "passed"
  | "needs-revision"

export const statusLabels: Record<WorkflowStatus, string> = {
  "not-started": "未开始",
  "in-progress": "进行中",
  "pending-review": "待审核",
  passed: "已通过",
  "needs-revision": "需返修",
}

export type Project = {
  id: string
  name: string
  type: string
  platform: string
  aspect: string
  episodes: number
  duration: string
  owner: string
  updatedAt: string
  progress: number
  status: WorkflowStatus
  currentStep: string
}

export const projects: Project[] = [
  {
    id: "qm",
    name: "《千面》",
    type: "AI漫剧",
    platform: "红果",
    aspect: "9:16 竖屏",
    episodes: 60,
    duration: "90s",
    owner: "林知遥",
    updatedAt: "2026-06-22 14:20",
    progress: 72,
    status: "in-progress",
    currentStep: "分镜",
  },
  {
    id: "zt",
    name: "《凿天》",
    type: "微短剧",
    platform: "芒果TV",
    aspect: "16:9 横屏",
    episodes: 24,
    duration: "3min",
    owner: "周慕白",
    updatedAt: "2026-06-22 10:05",
    progress: 45,
    status: "pending-review",
    currentStep: "剧本",
  },
  {
    id: "jg",
    name: "晋谷云智 AIGC 课程",
    type: "AIGC培训",
    platform: "B站",
    aspect: "16:9 横屏",
    episodes: 12,
    duration: "20min",
    owner: "韩立",
    updatedAt: "2026-06-21 18:42",
    progress: 88,
    status: "passed",
    currentStep: "导出",
  },
  {
    id: "wl",
    name: "文旅 AI 漫剧样片",
    type: "文旅方案",
    platform: "抖音",
    aspect: "9:16 竖屏",
    episodes: 6,
    duration: "60s",
    owner: "苏晚",
    updatedAt: "2026-06-21 09:30",
    progress: 30,
    status: "needs-revision",
    currentStep: "策划案",
  },
  {
    id: "yp",
    name: "《山海绘卷》IP 样片",
    type: "IP样片",
    platform: "腾讯",
    aspect: "16:9 横屏",
    episodes: 1,
    duration: "5min",
    owner: "陈默",
    updatedAt: "2026-06-20 16:12",
    progress: 12,
    status: "not-started",
    currentStep: "项目规格",
  },
]

export type WorkflowStep = {
  key: string
  label: string
  status: WorkflowStatus
}

export const workflowSteps: WorkflowStep[] = [
  { key: "spec", label: "项目规格", status: "passed" },
  { key: "ip", label: "IP建立", status: "passed" },
  { key: "proposal", label: "策划案", status: "passed" },
  { key: "outline", label: "分集大纲", status: "passed" },
  { key: "script", label: "剧本", status: "in-progress" },
  { key: "director", label: "导演讲戏", status: "pending-review" },
  { key: "storyboard", label: "分镜", status: "not-started" },
  { key: "visual", label: "视觉开发", status: "not-started" },
  { key: "prompt", label: "出图提示词", status: "not-started" },
  { key: "review", label: "审核", status: "needs-revision" },
  { key: "export", label: "导出", status: "not-started" },
]

export type QualityGate = {
  label: string
  status: "passed" | "pending" | "failed"
}

export const qualityGates: QualityGate[] = [
  { label: "平台规格已确认", status: "passed" },
  { label: "剧本格式合格", status: "passed" },
  { label: "分镜总时长偏差 ≤ 15%", status: "pending" },
  { label: "Seedance 分块 4-15 秒", status: "pending" },
  { label: "对外版无 AI 痕迹", status: "failed" },
  { label: "P0 问题为 0", status: "passed" },
]

export type Tool = {
  id: string
  title: string
  description: string
  input: string
  category: string
}

export const tools: Tool[] = [
  { id: "proposal-gen", title: "项目方案生成器", description: "依据项目规格与参考资料，自动生成结构化策划案初稿。", input: "项目规格 / 参考文件", category: "生成" },
  { id: "script-review", title: "剧本审核", description: "对剧本进行格式、节奏与平台合规性多维度审核。", input: "剧本文档", category: "审核" },
  { id: "script-deai", title: "剧本去 AI 化", description: "优化用词与句式，降低 AI 痕迹，贴近人工创作语感。", input: "剧本文档", category: "优化" },
  { id: "script-to-director", title: "剧本转导演讲戏", description: "将剧本拆解为镜头意图、表演与节奏的导演讲戏稿。", input: "剧本文档", category: "转换" },
  { id: "director-to-storyboard", title: "导演讲戏转分镜", description: "把导演讲戏稿转化为标准分镜表与时长分配。", input: "导演讲戏稿", category: "转换" },
  { id: "seedance-prompt", title: "Seedance 提示词生成", description: "按分镜生成 Seedance 视频分块提示词，控制在 4-15 秒。", input: "分镜表", category: "生成" },
  { id: "identity-lock", title: "角色身份锁定段生成", description: "生成角色一致性锁定描述，确保跨集视觉统一。", input: "角色资产", category: "生成" },
  { id: "image-prompt", title: "出图提示词生成", description: "为关键帧与场景生成结构化出图提示词。", input: "分镜 / 视觉锚点", category: "生成" },
  { id: "platform-check", title: "平台规格检查", description: "校验时长、画幅、分集等是否符合目标平台要求。", input: "项目规格", category: "审核" },
  { id: "deai-check", title: "对外版去 AI 痕迹检查", description: "扫描对外交付版本，标记潜在 AI 痕迹风险点。", input: "成品文档", category: "审核" },
  { id: "package-export", title: "资料包导出", description: "聚合各阶段交付物，一键打包导出标准资料包。", input: "项目交付物", category: "导出" },
]

export type Provider = {
  id: string
  name: string
  type: string
  baseUrl: string
  textModel: string
  longModel: string
  visionModel: string
  imageModel: string
  enabled: boolean
  status: "connected" | "untested" | "error"
}

export const providers: Provider[] = [
  { id: "deepseek", name: "DeepSeek", type: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", textModel: "deepseek-chat", longModel: "deepseek-chat", visionModel: "—", imageModel: "—", enabled: true, status: "connected" },
  { id: "openai", name: "OpenAI", type: "OpenAI", baseUrl: "https://api.openai.com/v1", textModel: "gpt-4o", longModel: "gpt-4o", visionModel: "gpt-4o", imageModel: "dall-e-3", enabled: true, status: "connected" },
  { id: "qwen", name: "Qwen", type: "Qwen", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", textModel: "qwen-max", longModel: "qwen-long", visionModel: "qwen-vl-max", imageModel: "wanx-v1", enabled: true, status: "untested" },
  { id: "modelarts", name: "Huawei ModelArts", type: "Huawei ModelArts", baseUrl: "https://modelarts.cn-north-4.myhuaweicloud.com/v1", textModel: "pangu-text", longModel: "pangu-long", visionModel: "pangu-vision", imageModel: "pangu-image", enabled: false, status: "error" },
  { id: "ollama", name: "Ollama Local", type: "Ollama", baseUrl: "http://localhost:11434/v1", textModel: "qwen2.5:14b", longModel: "qwen2.5:14b", visionModel: "llava:13b", imageModel: "—", enabled: true, status: "connected" },
]

export type CharacterAsset = {
  id: string
  name: string
  identityLock: string
  visualAnchor: string
  costume: string
  episodes: string
  status: WorkflowStatus
  image?: string
}

export const characters: CharacterAsset[] = [
  { id: "c1", name: "沈千面", identityLock: "ID-LOCK-001 · 银发赤瞳，左眉骨疤痕，常着玄色长衫", visualAnchor: "面部锚点 v3 · 三视图已锁定", costume: "玄衣 v2", episodes: "EP01-EP24", status: "passed", image: "/characters/shen-qianmian.png" },
  { id: "c2", name: "凿天君", identityLock: "ID-LOCK-002 · 金瞳长发，额心朱砂，披甲", visualAnchor: "面部锚点 v2 · 待复核", costume: "战甲 v1", episodes: "EP03-EP18", status: "pending-review", image: "/characters/zaotian-jun.png" },
  { id: "c3", name: "苏晚晴", identityLock: "ID-LOCK-003 · 黑发青衫，颈侧朱痣", visualAnchor: "面部锚点 v1", costume: "青衫 v1", episodes: "EP01-EP12", status: "in-progress", image: "/characters/su-wanqing.png" },
  { id: "c4", name: "韩九渊", identityLock: "ID-LOCK-004 · 灰发独眼，右眼覆带", visualAnchor: "未生成", costume: "—", episodes: "EP05-EP09", status: "not-started" },
]

export type ReviewIssue = {
  id: string
  project: string
  location: string
  severity: "P0" | "P1" | "P2"
  type: string
  summary: string
  status: "open" | "fixing" | "resolved"
  reviewer: string
}

export const reviewIssues: ReviewIssue[] = [
  { id: "R-118", project: "《千面》", location: "EP04 · 分镜 SB-027", severity: "P0", type: "AI痕迹", summary: "旁白用词机械化，建议口语化重写第 3-5 句。", status: "open", reviewer: "审核组·叶清" },
  { id: "R-117", project: "《凿天》", location: "EP02 · 剧本第 2 场", severity: "P1", type: "格式", summary: "场景标头缺少时间/内外景标注，需补全。", status: "fixing", reviewer: "审核组·叶清" },
  { id: "R-115", project: "《千面》", location: "EP04 · 分镜 SB-031", severity: "P1", type: "时长", summary: "单分块时长 17 秒，超出 Seedance 4-15 秒上限。", status: "open", reviewer: "审核组·关山" },
  { id: "R-112", project: "文旅 AI 漫剧样片", location: "策划案 · 第 1 节", severity: "P2", type: "一致性", summary: "主角姓名前后不一致（『阿岚』/『阿兰』）。", status: "resolved", reviewer: "审核组·关山" },
  { id: "R-110", project: "《凿天》", location: "EP02 · 角色锚点", severity: "P1", type: "一致性", summary: "凿天君额心朱砂位置与 ID-LOCK 描述偏差。", status: "fixing", reviewer: "审核组·叶清" },
  { id: "R-108", project: "《千面》", location: "EP03 · 导演讲戏", severity: "P2", type: "节奏", summary: "情绪转折过快，建议增加一个过渡镜头。", status: "resolved", reviewer: "审核组·关山" },
]

export const exportHistory = [
  { id: "e1", name: "《千面》分集大纲资料包", format: "ZIP", size: "12.4 MB", date: "2026-06-22 13:10", by: "林知遥" },
  { id: "e2", name: "晋谷云智 AIGC 课程讲义", format: "PDF", size: "8.1 MB", date: "2026-06-21 17:55", by: "韩立" },
  { id: "e3", name: "《凿天》剧本第一卷", format: "DOCX", size: "1.2 MB", date: "2026-06-21 11:30", by: "周慕白" },
  { id: "e4", name: "文旅样片提案", format: "PPTX", size: "5.6 MB", date: "2026-06-20 15:02", by: "苏晚" },
]
