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
  provider?: {
    baseUrl: string
    apiKey?: string
    textModel: string
    temperature?: number
    maxTokens?: number
  }
}

function fallbackProposal(project: GenerateRequest["project"]) {
  return `# ${project.name} IP策划案

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
`
}

export async function POST(request: Request) {
  const body = (await request.json()) as GenerateRequest
  const { project, provider } = body

  if (!project?.name) {
    return NextResponse.json({ error: "缺少项目名称" }, { status: 400 })
  }

  if (!provider?.apiKey || !provider.baseUrl || !provider.textModel) {
    return NextResponse.json({
      content: fallbackProposal(project),
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
            "你是五方互联内部IP策划助手。输出正式、可用、结构清晰的中文Markdown策划案，不写AI自述，不使用表格评分。",
        },
        {
          role: "user",
          content: `请为以下项目生成第一版IP策划案：\n${JSON.stringify(project, null, 2)}`,
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
        content: fallbackProposal(project),
        source: "local-template",
      },
      { status: 200 }
    )
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content

  return NextResponse.json({
    content: typeof content === "string" ? content : fallbackProposal(project),
    source: "model",
  })
}
