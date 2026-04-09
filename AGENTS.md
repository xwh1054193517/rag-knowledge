<!-- BEGIN:nextjs-agent-rules -->

# RAG Knowledge Agent 开发约定

## 常用命令

```bash
npm run dev      # 启动开发服务器 (Next.js)
npm run build    # 生产构建
npm run lint     # ESLint 检查
npx prisma generate                              # 重新生成 Prisma Client
```

## 技术栈

- **框架**: Next.js 16 (App Router) + React 19
- **样式**: Tailwind CSS 4 + tailwind-merge + shadcn/ui
- **AI**: LangChain.js + Vercel AI SDK
- **数据库**: Supabase PostgreSQL + pgvector + Prisma ORM
- **认证**: Supabase Auth (邮箱密码 + Google OAuth)
- **搜索**: Tavily Search API
- **UI 库**: lucide-react (图标)、framer-motion (动画)、react-markdown + remark-gfm + rehype-katex (Markdown/LaTeX)

## 架构要点

### 对话流程

- 文本消息 → LangChain → Vercel AI SDK 流式响应

### 工具系统

- RAG 知识库检索 (Supabase pgvector)
- 联网实时搜索 (tavily_search)
- Agent 优先查知识库，无结果再联网

### 数据隔离

- 所有数据通过 `user_id` 隔离
- API 路由统一用 `getCurrentLoginUser()` (`lib/supabase-server.ts`) 鉴权

## 目录约定

- `app/components/` — React 客户端组件（必须带 `"use client"` 指令）
- `app/api/` — API Route Handlers（服务端，不要加 `"use client"`）
- `lib/` — 服务端工具函数和业务逻辑（不要加 `"use client"`）
- `docs/` — 功能实现文档
- `prisma/schema.prisma` — 数据库 Schema（修改后必须运行 `npx prisma generate`）

## 代码规范

### 组件

- 禁止使用 class 组件，统一函数式组件 + `export default function`
- 客户端组件文件顶部必须加 `"use client"`
- Props 使用 `interface XxxProps {}` 定义，不用 `type`
- 图标统一使用 lucide-react，不要引入其他图标库
- 动画统一使用 framer-motion 的 `motion.*` 和 `AnimatePresence`

### 样式

- 使用 Tailwind CSS 原子类，不写自定义 CSS（`globals.css` 除外）
- 浅色主题，主色调
- 透明度边框用 `border-white/5`、`border-white/10`、`border-white/20` 层级

### API 路由

- 每个路由必须在开头调用 `getCurrentLoginUser()` 鉴权，未登录返回 `401`
- 涉及特定资源时，必须验证 `user_id` 归属（如 `prisma.chat.findFirst({ where: { id, user_id: user.id } })`）
- 响应统一使用 `NextResponse.json()`，错误返回 `{ error: string }` 格式
- 错误捕获：`catch (err: unknown)`，用 `err instanceof Error ? err.message : "fallback"` 提取消息

### 数据库 (Prisma)

- 使用 `lib/prisma.ts` 导出的单例 `prisma`，不要自行实例化 `PrismaClient`

### TypeScript

- 尽量避免 `any`，明确类型。对于 Vercel AI SDK 的 `annotations` 等弱类型场景，允许 `as any` 但应加注释说明
- 函数/方法加 `/** JSDoc 注释 */` 说明用途
- 环境变量通过 `process.env.XXX` 读取，带 `NEXT_PUBLIC_` 前缀的可在客户端使用，其余仅服务端可用

## 环境变量

详见 `.env.example`，关键分组：

- `OPENAI_*` / `MODEL_NAME` — 主对话模型
- `VISION_*` — 视觉模型（独立配置）
- `EMBEDDING_*` — 向量嵌入模型（不填则复用主模型配置）
- `TAVILY_API_KEY` — 联网搜索
- `NEXT_PUBLIC_SUPABASE_*` / `DATABASE_URL` — 数据库和认证

<!-- END:nextjs-agent-rules -->
