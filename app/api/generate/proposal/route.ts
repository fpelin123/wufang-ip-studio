import { NextResponse } from "next/server"

type GenerateRequest = {
  project: {
    name: string
    type: string
    platform: string
    aspect: string
    episodes: number
    duration: string
  }
  step?: {
    key: string
    label: string
  }
  provider?: {
    baseUrl: string
    apiKey?: string
    textModel: string
    temperature?: number
    maxTokens?: number
  }
  assets?: {
    name: string
    category: string
    size: number
    addedAt: string
  }[]
}

function formatAssets(assets: GenerateRequest["assets"] = []) {
  if (!assets.length) return "暂无项目参考资料。"
  return assets
    .slice(0, 8)
    .map((asset) => `- ${asset.name}（${asset.category}，${formatBytes(asset.size)}）`)
    .join("\n")
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fallbackDocument(
  project: GenerateRequest["project"],
  step?: GenerateRequest["step"],
  assets?: GenerateRequest["assets"],
) {
  const label = step?.label ?? "策划案"
  const assetSection = formatAssets(assets)

  if (step?.key === "outline") {
    return `# ${project.name} 分集大纲

## 一、总体结构
${project.name} 规划 ${project.episodes} 集，每集约 ${project.duration}。分集结构按“开局钩子、持续反转、中段升级、终局回收”组织，确保适配 ${project.platform} 的观看节奏。

## 二、阶段划分
- **EP01-EP03：强钩子建立**：快速交代主角目标、核心冲突和第一轮危机。
- **EP04-EP12：关系展开**：通过人物选择推动世界观和阵营关系。
- **中段篇章：冲突升级**：连续制造代价、误判、反转和新线索。
- **收束篇章：真相回收**：集中兑现伏笔，形成可传播名场面。

## 三、下一步
锁定前 3 集的单集梗概，再推进 EP01 剧本。

## 四、参考资料
${assetSection}`
  }

  if (step?.key === "script") {
    return `# ${project.name} EP01 剧本初稿

## 场 1｜开场钩子｜${project.aspect}
主角在高压情境中被迫做出选择，第一镜必须给出强视觉锚点和明确危险。

**人物行动**：主角隐藏真实目的，表面顺从，实际观察环境破绽。

**冲突推进**：对手方给出不可回避的限制，逼迫主角暴露一部分能力。

## 场 2｜身份反转
主角用一个细节完成局部反击，但留下更大的悬念。

## 制作备注
- 单集目标时长：${project.duration}
- 平台：${project.platform}
- 下一步：转导演讲戏，拆解镜头意图和表演节奏。

## 参考资料
${assetSection}`
  }

  if (step?.key === "director") {
    return `# ${project.name} 导演讲戏稿

## 一、整体导演意图
本段重点不是解释设定，而是让观众通过角色行动感受到压力、隐藏目标和反转代价。

## 二、表演要求
- 主角：外冷内紧，台词少，反应要有延迟和克制。
- 对手：压迫感来自笃定，不靠夸张表情。
- 关系角色：用视线和站位暗示立场变化。

## 三、镜头节奏
开场 3 秒必须给出视觉钩子；中段用近景压缩空间；结尾留一个未解释动作，承接下一集。

## 四、参考资料
${assetSection}`
  }

  if (step?.key === "storyboard") {
    return `# ${project.name} 分镜表

| 镜号 | 时长 | 景别 | 画面 | 动作 | 声音 |
| --- | ---: | --- | --- | --- | --- |
| SB-001 | 4s | 特写 | 主角眼部与标志性视觉锚点 | 轻微抬眼 | 低频环境音 |
| SB-002 | 6s | 中景 | 对手压近，空间收窄 | 主角后退半步 | 脚步声 |
| SB-003 | 5s | 近景 | 关键道具露出 | 主角藏起道具 | 音乐停顿 |

## Seedance 备注
单分块控制在 4-15 秒；优先保证角色一致性和动作连续性。

## 参考资料
${assetSection}`
  }

  if (step?.key === "review") {
    return `# ${project.name} 审核报告

## P0 问题
暂无。

## P1 问题
- 需要确认前 3 集钩子是否足够明确。
- 需要检查角色视觉锚点是否在剧本、导演讲戏、分镜中保持一致。

## P2 建议
- 对外版减少“宏大、震撼、极致”等泛化形容词。
- 分镜阶段补充单镜头时长，避免超出视频生成分块上限。

## 参考资料
${assetSection}`
  }

  return `# ${project.name} IP${label}

## 一、项目定位
${project.name} 是一部面向 ${project.platform} 的 ${project.type} 项目，采用 ${project.aspect} 画幅，规划 ${project.episodes} 集，每集约 ${project.duration}。项目第一阶段目标是形成可进入内部评审的策划案、分集方向与后续剧本生产基础。

## 二、核心卖点
1. **明确的平台适配**：按 ${project.platform} 的观看场景和时长节奏设计内容密度。
2. **可持续的IP生产结构**：从概念、角色、分集、分镜到视觉资产形成连续生产链。
3. **AI原生制作友好**：优先使用清晰角色锚点、稳定场景资产和可拆分镜头结构。

## 三、故事引擎
主角在一个高压选择中进入核心事件，每一集围绕一个可视化冲突推进：身份变化、关系反转、代价显现、线索升级。前3集负责建立钩子，第一个中段节点负责验证观众留存，结尾阶段完成主线回收和情绪释放。

## 四、角色体系
- **主角**：承担观众视角，必须有明确欲望、底线和不可替代的视觉锚点。
- **对手方**：持续制造压力，不只承担解释功能。
- **关系角色**：用行动推动主角选择，避免成为说明书式配角。

## 五、分集规划
- **建立期**：完成世界规则、主角目标和第一轮危机。
- **发展期**：扩大冲突范围，连续制造反转和代价。
- **收束期**：集中回收伏笔，形成可传播名场面。

## 六、制作备忘
- 平台规格：${project.platform} · ${project.aspect} · ${project.episodes}集 · ${project.duration}/集
- 后续步骤：分集大纲 → EP01剧本 → 导演讲戏 → 分镜 → 视觉资产
- 当前门禁：平台规格已确认；下一步需补充角色身份锁定段和核心视觉参考。

## 七、参考资料
${assetSection}
`
}

export async function POST(request: Request) {
  const body = (await request.json()) as GenerateRequest
  const { project, provider, step, assets } = body

  if (!project?.name) {
    return NextResponse.json({ error: "缺少项目名称" }, { status: 400 })
  }

  if (!provider?.apiKey || !provider.baseUrl || !provider.textModel) {
    return NextResponse.json({
      content: fallbackDocument(project, step, assets),
      source: "local-template",
    })
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
            "你是五方互联内部IP生产助手。按用户指定阶段输出正式、可用、结构清晰的中文Markdown文档，不写AI自述。",
        },
        {
          role: "user",
          content: `请为以下项目生成「${step?.label ?? "策划案"}」阶段文档。\n\n项目：\n${JSON.stringify(project, null, 2)}\n\n项目参考资料清单：\n${formatAssets(assets)}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    return NextResponse.json(
      {
        error: "模型调用失败",
        detail: text.slice(0, 1000),
        content: fallbackDocument(project, step, assets),
        source: "local-template",
      },
      { status: 200 }
    )
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content

  return NextResponse.json({
    content: typeof content === "string" ? content : fallbackDocument(project, step, assets),
    source: "model",
  })
}
