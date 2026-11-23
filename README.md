# ✨ AI Chat Studio

基于 **React 19 + TypeScript + Vite + Node.js** 的大模型流式对话应用，接入 DeepSeek（兼容任何 OpenAI 协议的模型），支持深度思考展示、Markdown 实时渲染、多会话管理与角色预设。

> 未配置 API Key 时自动进入 **Mock 演示模式**，clone 下来即可运行体验。

<!-- 部署后把截图放到 docs/screenshot.png 并取消注释 -->
<!-- ![screenshot](docs/screenshot.png) -->

## 功能

- 🚀 **流式输出**：基于 SSE + `ReadableStream`，逐字渲染，支持随时中断、重新生成
- 🧠 **深度思考**：支持 DeepSeek-R1 `reasoning_content`，思考过程可折叠查看
- 📝 **Markdown 渲染**：GFM 表格、代码高亮、一键复制代码
- 💬 **多会话管理**：新建 / 切换 / 搜索 / 删除，本地持久化，刷新不丢失
- 🎭 **角色预设**：通用助手、前端面试官、代码审查、技术翻译
- 🌗 **主题切换**：亮色 / 暗色，默认跟随系统
- 📱 **响应式布局**：移动端侧边栏抽屉
- 🔐 **BFF 代理**：API Key 只保存在服务端，含参数校验与限流

## 技术亮点

| 问题 | 方案 |
| --- | --- |
| 网络分片会在任意位置截断 SSE 事件 | 实现增量 SSE 解析器，缓冲至完整事件块再解析，带单元测试覆盖 |
| 每个 token 都 `setState` 导致频繁重渲染 | 按 `requestAnimationFrame` 合并增量后批量写入 store；消息组件 `memo`，只重渲染正在生成的那条 |
| 中断生成后服务端仍在消耗 token | 前端 `AbortController` 断开连接，服务端监听 `close` 事件同步中止上游请求 |
| 中文输入法选词时按 Enter 误发送 | 判断 `isComposing` |
| 上下文无限增长 | 只携带最近 20 条历史，服务端限制总长度 |
| 刷新页面时流式消息状态残留 | persist `merge` 时将 `streaming` 状态修正为 `stopped` |
| 不同模型厂商流格式不一致 | 服务端统一转换为 `reasoning / content / usage / done / error` 事件 |
| HTTP 部署时 `crypto.randomUUID`、Clipboard API 不可用 | 检测安全上下文并降级 |

## 技术栈

- **前端**：React 19、TypeScript、Vite、Zustand、react-markdown、highlight.js
- **服务端**：Node.js、Express、原生 `fetch` 流式转发
- **工程化**：npm workspaces、Vitest、GitHub Actions、Docker

## 快速开始

需要 Node.js >= 20.12。

```bash
git clone https://github.com/<your-name>/ai-chat-studio.git
cd ai-chat-studio
npm install

# 可选：接入真实模型
cp .env.example .env   # 填写 LLM_API_KEY

npm run dev            # 前端 http://localhost:5173 ，服务端 http://localhost:3001
```

DeepSeek API Key 在 [platform.deepseek.com](https://platform.deepseek.com/) 申请。切换其他模型只需修改 `.env`：

```bash
# 通义千问
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODELS=qwen-plus,qwen-max
```

## 部署

```bash
npm run build && npm start   # 服务端同时托管前端，访问 http://localhost:3001
```

或使用 Docker：

```bash
docker build -t ai-chat-studio .
docker run -d -p 3001:3001 -e LLM_API_KEY=sk-xxx ai-chat-studio
```

## 目录结构

```
├── client/                 # 前端
│   └── src/
│       ├── api/            # 接口与流式请求
│       ├── components/     # Sidebar / ChatView / MessageItem / Markdown / Composer
│       ├── lib/            # SSE 解析器（含单测）、工具函数
│       ├── store/          # Zustand 状态管理（会话、流式更新、中断）
│       └── presets.ts      # 角色预设
├── server/                 # BFF 服务
│   └── src/
│       ├── chat.ts         # /api/chat 路由，参数校验 + SSE 推送
│       ├── llm.ts          # OpenAI 兼容协议流式调用
│       ├── mock.ts         # Mock 演示模式
│       └── rateLimit.ts    # 简易限流
└── .github/workflows/      # CI
```

## License

MIT
