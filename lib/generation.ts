import type { ToolWriteBack } from "@/lib/tool-config"

export type GenerationProject = {
  name: string
  type: string
  platform: string
  aspect: string
  episodes: number
  duration: string
}

export type GenerationStep = {
  key: string
  label: string
}

export type GenerationProvider = {
  baseUrl: string
  apiKey?: string
  textModel: string
  temperature?: number
  maxTokens?: number
}

export type GenerationAsset = {
  name: string
  category: string
  size: number
  addedAt: string
}

export type GenerationRequest = {
  project: GenerationProject
  step?: GenerationStep
  provider?: GenerationProvider
  assets?: GenerationAsset[]
}

export type GenerationResult = {
  content: string
  source: "model" | "local-template"
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatAssets(assets: GenerationAsset[] = []) {
  if (!assets.length) return "暂无项目参考资料。"
  return assets
    .slice(0, 8)
    .map((asset) => `- ${asset.name} · ${asset.category} · ${formatBytes(asset.size)}`)
    .join("\n")
}

function buildDefaultDocument(project: GenerationProject, step?: GenerationStep, assets?: GenerationAsset[]) {
  const label = step?.label ?? "策划案"
  const assetSection = formatAssets(assets)

  if (step?.key === "outline") {
    return `# ${project.name} 分集大纲\n\n## 一、总体结构\n${project.name} 规划 ${project.episodes} 集，每集约 ${project.duration}。分集结构按“开局钩子、持续反转、中段升级、结尾回收”组织，确保适配 ${project.platform} 的观看节奏。\n\n## 二、阶段划分\n- **EP01-EP03：强钩子建立**：快速交代主角目标、核心冲突和第一轮危机。\n- **EP04-EP12：关系展开**：通过人物选择推动世界观和阵营关系。\n- **中段章节：冲突升级**：连续制造代价、误判、反转和新线索。\n- **收束章节：真相回收**：集中兑现伏笔，形成可传播名场面。\n\n## 三、下一步\n锁定前 3 集的单集梗概，再推进 EP01 剧本。\n\n## 四、参考资料\n${assetSection}`
  }

  if (step?.key === "script") {
    return `# ${project.name} EP01 剧本初稿\n\n## 场 1｜开场钩子（${project.aspect}）\n主角在高压情境中被迫做出选择，第一镜必须给出强视觉锚点和明确危险。\n\n## 场 2｜身份反转\n主角用一个细节完成局部反击，但留下更大的悬念。\n\n## 制作备注\n- 单集目标时长：${project.duration}\n- 平台：${project.platform}\n- 下一步：转导演讲戏，拆解镜头意图和表演节奏。\n\n## 参考资料\n${assetSection}`
  }

  if (step?.key === "director") {
    return `# ${project.name} 导演讲戏稿\n\n## 一、整体导演意图\n这一段重点不是解释设定，而是让观众通过角色行动感受到压力、隐秘目标和反转代价。\n\n## 二、表演要求\n- 主角：外冷内紧，台词少，反应要有延迟和克制。\n- 对手：压迫感来自笃定，不靠夸张表情。\n- 关系角色：用视线和站位暗示立场变化。\n\n## 三、镜头节奏\n开场 3 秒必须给出视觉钩子；中段用近景压缩空间；结尾留一个未解释动作，承接下一集。\n\n## 四、参考资料\n${assetSection}`
  }

  if (step?.key === "storyboard") {
    return `# ${project.name} 分镜表\n| 镜号 | 时长 | 景别 | 画面 | 动作 | 声音 |\n| --- | ---: | --- | --- | --- | --- |\n| SB-001 | 4s | 特写 | 主角眼部与标志性视觉锚点 | 轻微抬眼 | 低频环境音 |\n| SB-002 | 6s | 中景 | 对手逼近，空间收窄 | 主角后退半步 | 脚步声 |\n| SB-003 | 5s | 近景 | 关键道具露出 | 主角藏起道具 | 音乐停顿 |\n\n## Seedance 备注\n单分块控制在 4-15 秒；优先保证角色一致性和动作连续性。\n\n## 参考资料\n${assetSection}`
  }

  if (step?.key === "review") {
    return `# ${project.name} 审核报告\n\n## P0 问题\n暂无。\n## P1 问题\n- 需要确认前 3 集钩子是否足够明确。\n- 需要检查角色视觉锚点是否在剧本、导演讲戏、分镜中保持一致。\n## P2 建议\n- 外发版减少泛化形容词。\n- 分镜阶段补充单镜头时长，避免超出视频生成分块上限。\n\n## 参考资料\n${assetSection}`
  }

  return `# ${project.name} IP${label}\n\n## 一、项目定位\n${project.name} 是一部面向 ${project.platform} 的 ${project.type} 项目，采用 ${project.aspect} 画幅，规划 ${project.episodes} 集，每集约 ${project.duration}。\n\n## 二、核心卖点\n1. **明确的平台适配**：按 ${project.platform} 的观看场景和时长节奏设计内容密度。\n2. **可持续的IP生产结构**：从概念、角色、分集、分镜到视觉资产形成连续生产链。\n3. **AI原生制作友好**：优先使用清晰角色锚点、稳定场景资产和可拆分镜头结构。\n\n## 三、故事引擎\n主角在一个高压选择中进入核心事件，每一集围绕一个可视化冲突推进：身份变化、关系反转、代价显现、线索升级。前三集负责建立钩子，第二个中段章节负责验证观众留存，结尾阶段完成主线回收和情绪释放。\n\n## 四、角色体系\n- **主角**：承担观众视角，必须有明确欲望、底线和不可替代的视觉锚点。\n- **对手方**：持续制造压力，不只承担解释功能。\n- **关系角色**：用行动推动主角选择，避免成为说明书式配角。\n\n## 五、分集规划\n- **建立期**：完成世界规则、主角目标和第一轮危机。\n- **发展期**：扩大冲突范围，连续制造反转和代价。\n- **收束期**：集中回收伏笔，形成可传播名场面。\n\n## 六、制作备注\n- 平台规格：${project.platform} · ${project.aspect} · ${project.episodes}集 · ${project.duration}/集\n- 后续步骤：分集大纲 → EP01剧本 → 导演讲戏 → 分镜 → 视觉资产\n- 当前门禁：平台规格已确认；下一步需补充角色身份锁定段和核心视觉参考。\n\n## 七、参考资料\n${assetSection}`
}

export async function generateDocument(request: GenerationRequest): Promise<GenerationResult> {
  const { project, provider, step, assets } = request

  if (!provider?.apiKey || !provider.baseUrl || !provider.textModel) {
    return { content: buildDefaultDocument(project, step, assets), source: "local-template" }
  }

  const baseUrl = provider.baseUrl.replace(/\/$/, "")
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.textModel,
      temperature: provider.temperature ?? 0.7,
      max_tokens: provider.maxTokens ?? 4000,
      messages: [
        {
          role: "system",
          content:
            "你是五方互联内部IP生产助手。请按用户指定阶段输出正式、可用、结构清晰的中文Markdown文档，不写AI自述。",
        },
        {
          role: "user",
          content: `请为以下项目生成「${step?.label ?? "策划案"}」阶段文档。\n\n项目：\n${JSON.stringify(project, null, 2)}\n\n项目参考资料清单：\n${formatAssets(assets)}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    return { content: buildDefaultDocument(project, step, assets), source: "local-template" }
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  return {
    content: typeof content === "string" ? content : buildDefaultDocument(project, step, assets),
    source: "model",
  }
}

export function buildFallbackDocumentFromConfig(project: GenerationProject, step?: GenerationStep, assets?: GenerationAsset[]) {
  return buildDefaultDocument(project, step, assets)
}

