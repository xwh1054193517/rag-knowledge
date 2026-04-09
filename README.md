# RAG Knowledge Workspace

一个生产可扩展的 AI 知识检索与对话工作台，基于 Next.js 16 构建，集成 Supabase Auth、Prisma、LangChain 和 Vercel AI SDK。

> 本项目面向“知识库检索 + 联网搜索 + AI 助手对话”场景，提供完整的登录认证、会话管理、流式聊天 UI 和用户级数据隔离能力。

## ✨ 核心特性

### 🤖 AI 对话工作台

- **流式聊天体验** - 基于 Vercel AI SDK 的实时响应 UI
- **LangChain Agent 架构** - 支持模型推理、工具调用和后续扩展
- **最后一条消息重发** - 支持最后一条用户消息重新发送
- **最后一条消息编辑重发** - 可直接在用户气泡内编辑并重新发送
- **Thinking / Process 占位** - 发送后立即反馈 AI 正在处理

### 📚 RAG 与搜索能力

- **知识库会话场景** - 为每个用户构建私有知识库检索基础
- **联网搜索工具** - 集成 Tavily Search，补充实时信息查询
- **文档向量结构预留** - PostgreSQL + pgvector + Prisma Schema 已设计完成
- **公开文档能力预留** - 支持文档公开状态字段，为共享检索做准备

### 🔐 认证与数据隔离

- **Supabase Auth** - 邮箱密码登录 + Google OAuth
- **用户级数据隔离** - 所有会话、消息、文档均通过 `user_id` 隔离
- **服务端鉴权** - API 路由统一在服务端校验当前登录用户
- **会话权限校验** - 用户只能读取和操作自己的会话

### 🎨 现代化聊天 UI

- **Next.js 16 App Router** - 服务端与客户端组件协作
- **Tailwind CSS 4 + shadcn/ui** - 可定制的现代化界面基础
- **Framer Motion** - 统一动画和过渡体验
- **响应式布局** - 侧边栏、会话列表、移动端抽屉完整适配

### 🧪 工程化能力

- **TypeScript 严格模式**
- **ESLint + Prettier**
- **Jest + Testing Library** - 已接入基础单元测试
- **Prisma Client 生成流程** - `postinstall` 自动生成

## 🧱 技术栈

| 类别     | 技术                       |
| -------- | -------------------------- |
| 框架     | Next.js 16 (App Router)    |
| 运行时   | React 19                   |
| 语言     | TypeScript                 |
| 样式     | Tailwind CSS 4 + shadcn/ui |
| 动画     | Framer Motion              |
| AI SDK   | Vercel AI SDK v6           |
| Agent    | LangChain 1.x              |
| 模型接入 | OpenAI / OpenRouter        |
| 搜索     | Tavily Search              |
| 数据库   | PostgreSQL + Prisma ORM    |
| 认证     | Supabase Auth              |
| 测试     | Jest + Testing Library     |

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 9+
- PostgreSQL / Supabase 数据库

### 安装

```bash
# 克隆项目
git clone <your-repo-url>
cd rag-knowledge

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 然后按需补全 .env

# 生成 Prisma Client
npx prisma generate

# 启动开发环境
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看项目。

## 🧪 常用命令

```bash
npm run dev              # 启动开发服务器
npm run build            # 生产构建
npm run start            # 启动生产服务
npm run lint             # ESLint 检查
npm run format           # Prettier 格式化
npm run format:check     # 检查格式
npm run test             # 运行单元测试
npm run test:watch       # 监听模式运行测试
npm run test:coverage    # 生成测试覆盖率
npx prisma generate      # 重新生成 Prisma Client
```

## 📁 项目结构

```bash
rag-knowledge/
├── prisma/
│   └── schema.prisma           # Prisma 数据模型
├── public/                     # 静态资源
├── src/
│   ├── app/
│   │   ├── api/                # API Route Handlers
│   │   │   ├── chats/          # 会话列表 / 会话详情接口
│   │   │   └── runChat/        # 流式聊天接口
│   │   ├── components/         # 页面级客户端组件
│   │   ├── login/              # 登录页
│   │   ├── globals.css         # 全局样式变量
│   │   ├── layout.tsx
│   │   └── page.tsx            # 主聊天页
│   ├── components/
│   │   ├── chat/               # 聊天工作区组件
│   │   └── ui/                 # 基础 UI 组件
│   ├── generated/              # Prisma 生成代码
│   └── lib/
│       ├── aiAgent.ts          # LangChain Agent 工厂
│       ├── chat-utils.ts       # 会话数据库操作封装
│       ├── prisma.ts           # Prisma 单例
│       ├── supabase-browser.ts # 浏览器端 Supabase
│       ├── supabase-server.ts  # 服务端 Supabase
│       └── utils.ts            # 通用工具函数
├── AGENTS.md                   # 项目开发约定
├── jest.config.mjs             # Jest 配置
├── jest.setup.ts               # Jest 初始化
├── package.json
└── README.md
```

## 🗄 数据模型概览

当前 Prisma Schema 主要包含以下实体：

- **Conversation**
  - 会话主表
  - 包含 `id`、`user_id`、`title`、`created_at`、`updated_at`

- **Message**
  - 会话消息表
  - 包含 `conversation_id`、`role`、`content`、`tool_calls`

- **Document**
  - 文档主表
  - 包含文档路径、哈希、公开状态、更新时间

- **DocumentData**
  - 文档内容与向量表
  - 包含 `content`、`metadata`、`embedding`

说明：

- 所有业务实体主键均使用 UUID
- 用户 ID 统一对齐 Supabase `auth.users.id`
- 文档向量列已为 pgvector 使用场景预留

## 🔐 环境变量

项目当前 `.env.example` 中已包含最小必需项，你可以按下面分组配置：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# 数据库
DATABASE_URL=""

# AI 模型
OPENAI_API_KEY=
MODEL_NAME=

# 联网搜索
TAVILY_API_KEY=
```

如你使用 OpenRouter，还可以补充：

```bash
OPENROUTER_API_KEY=
```

说明：

- `NEXT_PUBLIC_` 前缀变量可在客户端使用
- 其余变量仅供服务端读取

## 🔄 当前实现状态

### 已完成

- 登录认证（邮箱密码 + Google OAuth）
- 聊天主界面与响应式侧边栏
- 会话列表分页加载
- 会话详情读取与删除
- 流式聊天接口接入
- 最后一条用户消息重发 / 编辑重发
- 用户级会话隔离
- Jest 单元测试基础设施

### 进行中 / 预留

- RAG 文档上传与切片入库
- pgvector 向量检索接入
- 联网搜索与知识库组合路由策略
- 工具调用过程可视化
- 更完整的 API 测试与组件测试

## 🧪 测试

当前项目已经接入 Jest，可直接运行：

```bash
npm run test
```

当前示例测试覆盖：

- `src/lib/utils.ts`
- `src/components/chat/messageBubble.tsx`

后续推荐补充：

- `chat-utils.ts` 数据库工具函数测试
- `chat-shell.tsx` 关键交互测试
- `app/api/runChat/route.ts` 接口测试

## 🛠 开发约定

详细开发规范见 [AGENTS.md](./AGENTS.md)，核心约定包括：

- 客户端组件必须带 `"use client"`
- API 路由必须统一鉴权
- Prisma 统一使用 `lib/prisma.ts` 单例
- 尽量避免 `any`
- 函数与方法补充 JSDoc 注释
- 环境变量统一通过 `process.env.XXX` 读取

## 📌 后续建议

如果你准备把这个项目继续产品化，建议优先推进：

1. 文档上传与向量化入库
2. 知识库检索工具接入 Agent
3. 生成结果、工具调用和来源片段的前端展示
4. 完整的数据库迁移与部署文档

## 📄 许可证

本项目当前仓库包含 [LICENSE](./LICENSE)。如有二次分发或商用计划，请先确认你的实际授权策略。
