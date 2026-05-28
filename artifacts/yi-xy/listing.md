# InkOS / StoryPilot 闲鱼发布文案包

> 生成时间：2026-05-28  
> 依据：当前仓库 README、package 配置、Studio 运行界面、API 返回与截图。请勿宣称“独家源码/保证收益/现成商用闭源授权”等未确认内容。

## 项目定位

InkOS / StoryPilot 是一套面向网文、短篇和长篇小说创作的 AI 写作工作台：把“构思、建书、对话式创作、章节写作、审稿修订、真相文件/世界观管理、模型服务配置”整合到本地 Web Studio + CLI/TUI 工具链里。适合想做 AI 小说创作工具、自媒体短篇流水线、网文辅助写作后台，或需要二开的内容团队/个人开发者。

## 闲鱼标题备选

1. AI 小说创作 Web 工作台源码｜书籍管理+对话写作+模型配置
2. InkOS/StoryPilot 网文 AI 写作系统｜Studio 面板+CLI 可二开
3. AI 网文创作后台项目｜章节审稿/真相文件/市场雷达/多模型接入
4. 小说自动化创作 Agent 项目源码｜支持短篇/长篇/模型服务商配置
5. 本地 AI 写作工作台源码交付｜React+Node+TypeScript 可部署二开

## 主文案（可直接发布）

出一套 **AI 小说创作工作台项目源码 / 二开部署服务**，当前项目已能本地跑起 Web Studio，界面风格是深色科技感的 StoryPilot Command Deck。

这个项目不是简单的 ChatGPT 套壳，而是围绕“小说创作流程”做了工作台：可以建书、管理书籍、通过对话推进创作、进入单本书工作区查看/编辑创作内容，还带模型服务商配置、题材管理、导入、市场雷达、环境诊断等后台功能入口。README 中也保留了 CLI/TUI/Studio 三套使用方式，适合继续做成网文生产工具、短篇创作工具、AI 内容工作室后台，或者作为 AI Agent 项目二开的基础框架。

当前我本地已验证能启动 Studio：前端与后端均可本地运行。截图已使用脱敏演示项目重新截取，不显示你当前已经创建的书籍名称或正文内容。项目使用 TypeScript / Node.js / React / Vite / Hono / pnpm monorepo，后续二开空间比较大。

适合：
- 想做 AI 网文/短篇辅助创作工具的人
- 想研究多 Agent 写作流程、章节审稿、真相文件管理的开发者
- 想要一个现成 Web 管理台继续改造成 SaaS/私有化工具的团队
- 想做“小说生成 + 封面提示词 + 模型服务商配置”的内容工作室

可交付内容可按沟通确定：源码、启动说明、功能讲解、运行截图素材、基础部署/二开建议。涉及 API Key 和模型费用需买家自行准备；如果需要我协助接入具体模型服务商，可另行约定。

> 备注：项目仓库许可证为 AGPL-3.0，若用于再分发或商用二开，请自行确认并遵守开源许可证要求。我这里建议按“源码学习/部署服务/二开服务”方式沟通，不建议承诺独占版权或闭源转售。

## 卖点清单（基于实际证据）

- **本地 Web Studio 已可运行**：当前截图来自 `http://localhost:4567`，后端 API `http://localhost:4569` 可返回项目和书籍数据。
- **书籍管理与创作驾驶舱**：首页展示项目数、活跃书籍、章节数，并能进入单本书工作区。
- **对话式创作入口**：侧栏有“驾驶舱聊天”，支持普通项目会话和书籍上下文会话，适合把自然语言指令接到写作流程。
- **单本书工作区**：脱敏截图展示了章节区、核心文件、世界观等结构化面板，未展示你的真实书名或正文。
- **模型服务商管理**：Studio 有“模型配置”页，按聚合 API、海外、国内、本地、CodingPlan 分组，支持 API Key、封面生成模型、Base URL 等配置。
- **Provider bank / 多模型接入基础**：README 和代码里包含 Google Gemini、Moonshot、MiniMax、智谱、百炼、DeepSeek、OpenRouter、Ollama、CodingPlan 等服务接入配置。
- **CLI + TUI + Studio 混合形态**：根项目是 pnpm monorepo，包含 core、cli、studio 包；README 写明支持 CLI、TUI、Studio 和 OpenClaw Skill 入口。
- **小说工作流更完整**：README 中描述了章节规划、写作、审计、修订、导出、文风分析、题材管理、市场雷达、真相文件等链路。
- **短篇/封面方向可拓展**：README 中包含独立短篇生成、简介卖点、封面提示词/封面图相关说明，适合改造成短篇内容生产工具。

## 适合人群

- AI 应用开发者：想找一个完整 AI 写作项目做二开/学习。
- 网文作者/工作室：想把构思、设定、章节、审稿集中管理。
- 自媒体短篇团队：想搭建短篇生成、卖点提炼、封面提示词流程。
- 私有化部署需求方：想用自己的模型 Key、本地或中转 API 跑创作工具。
- 产品原型买家：想快速拿到一个有界面、有 CLI、有服务商配置的 AI Agent 项目底座。

## 交付说明建议

可在闲鱼详情里写清楚：

- 交付：项目源码包 / 仓库访问权限 / 启动说明 / 当前截图素材。
- 运行环境：Node.js >= 20、pnpm >= 9。
- 启动方式：
  ```bash
  pnpm install
  pnpm build
  cd packages/studio
  INKOS_STUDIO_PORT=4569 INKOS_PROJECT_ROOT=<你的 InkOS 项目目录> pnpm exec tsx watch --clear-screen=false src/api/index.ts
  pnpm exec vite --host --port 4567
  ```
- 模型配置：API Key、模型账号、模型调用费用由买家自行准备。
- 支持边界：可提供一次远程启动协助/基础讲解；复杂功能定制、商用部署、支付登录、多租户、上线运维等另算。
- 授权提醒：项目许可证为 AGPL-3.0，买家需自行遵守开源协议。

## 搜索关键词 / 标签

AI写作、小说生成、网文工具、短篇创作、AI Agent、React源码、Node项目、TypeScript项目、Vite项目、Hono后端、模型中转、OpenAI兼容、Claude Code、OpenClaw、私有化部署、内容工作室、AI应用二开、SaaS源码、Web管理后台。

## 图片方案与配文

1. `screenshots/00-cover-card.png`  
   配文：AI 小说创作 Web 工作台，真实截图 + 源码交付。
2. `screenshots/01-dashboard.png`  
   配文：首页驾驶舱：书籍、项目进度、章节状态集中展示。
3. `screenshots/02-ai-chat.png`  
   配文：对话式创作入口，可围绕项目/书籍持续沟通。
4. `screenshots/03-book-workspace.png`  
   配文：脱敏单本书工作区：章节、核心文件、世界观等结构化管理。
5. `screenshots/04-create-book.png`  
   配文：新建书籍 / 创作初始化流程，适合从构思开始搭建项目。
6. `screenshots/05-model-services.png`  
   配文：模型服务商管理：聚合 API、海外、国内、本地、CodingPlan 分组配置。
7. `screenshots/06-codingplan-config.png`  
   配文：支持 CodingPlan / 中转站等模型接入，可填写 Base URL 和 API Key。
8. `screenshots/07-mobile-dashboard.png`  
   配文：移动宽度预览，可作为后续适配优化参考。

## 注意事项 / 不建议写的说法

- 不要写“保证自动写出爆款小说”“保证变现”“全网独家源码”等不可验证承诺。
- 不要把生成封面图说成真实 UI；封面图只是闲鱼首图，后续截图才是真实界面。
- 不要承诺包含模型 API Key；密钥和调用费用应由买家自行承担。
- 如果买家要商用闭源，必须先处理 AGPL-3.0 许可证合规问题。
- 当前截图基于脱敏演示项目重新截取，不显示你的真实书籍名称或正文；正式交付前可根据买家方向替换演示书名和样例内容。
