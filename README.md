# RAG Knowledge Workspace

一个基于 Next.js 16、LangChain、Vercel AI SDK、Supabase 和 Prisma 构建的私有知识库对话应用。

项目当前已经支持：

- 用户登录与 Google OAuth
- 多会话聊天
- LangChain Agent 工具调用
- 私有知识库上传、列表、下载、删除
- 文档切分、向量化、pgvector 检索
- 优先知识库、兜底联网搜索的 RAG 工作流
- Markdown / Mermaid / LaTeX 富文本回答渲染

## 核心能力

### AI Chat

- 基于 `useChat` 和 `ai` SDK 的流式对话体验
- 支持最后一条用户消息重发、编辑后重发
- 支持工具调用卡片、知识库引用卡片、Markdown 富文本展示

### Private Knowledge Base

- 独立 `/knowledge` 页面管理用户自己的文档
- 支持 `PDF / Markdown / TXT`
- 文档原文件存入 Supabase Storage 私有 bucket
- 文档切分后写入 PostgreSQL + pgvector
- 检索严格按 `user_id` 隔离

### RAG + Tools

- Agent 优先调用 `knowledge_search`
- 私有知识库无命中时再调用 `tavily_search`
- 支持查询重写、chunk 引用标签、来源片段展示

### Auth + Data Isolation

- Supabase Auth
- 邮箱密码登录
- Google OAuth 登录
- 会话、消息、文档、文档 chunk 均按 `user_id` 隔离

## 技术栈

| 类别     | 技术                           |
| -------- | ------------------------------ |
| 框架     | Next.js 16 App Router          |
| 前端     | React 19                       |
| 样式     | Tailwind CSS 4 + shadcn/ui     |
| 动画     | Framer Motion                  |
| AI       | LangChain + Vercel AI SDK      |
| 模型接入 | OpenAI / OpenRouter            |
| 联网搜索 | Tavily                         |
| 数据库   | Supabase PostgreSQL + pgvector |
| ORM      | Prisma                         |
| 认证     | Supabase Auth                  |
| 测试     | Jest + Testing Library         |

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+
- Supabase 项目
- PostgreSQL / pgvector

### 安装

```bash
git clone <your-repo-url>
cd rag-knowledge
npm install
cp .env.example .env
```

### 常用命令

```bash
npm run dev
npm run build
npm run lint
npm run test
npx prisma generate
npx prisma migrate deploy
```

## 关键环境变量

详见 [.env.example](/e:/myProject/rag-knowledge/.env.example)。

常用分组如下：

### Supabase

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DOCUMENTS_BUCKET=knowledge-documents
DATABASE_URL=
```

### Chat Model

```bash
MODEL_NAME=
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENROUTER_API_KEY=
```

### Embedding Model

```bash
EMBEDDING_MODEL_NAME=
EMBEDDING_API_KEY=
EMBEDDING_BASE_URL=
```

### Search

```bash
TAVILY_API_KEY=
```

## 项目结构

```text
src/
  app/
    api/
      chats/
      knowledge/documents/
      runChat/
    components/
      chat-page-shell.tsx
      knowledge-page-shell.tsx
    knowledge/page.tsx
    login/page.tsx
    page.tsx
  components/
    chat/
      chat-shell.tsx
      chat-sidebar.tsx
      messageBubble.tsx
      rich-message-content.tsx
      mermaid-renderer.tsx
      tool-bubble.tsx
  lib/
    aiAgent.ts
    chat-utils.ts
    knowledge.ts
    prisma.ts
    supabase-admin.ts
    supabase-browser.ts
    supabase-server.ts
prisma/
  schema.prisma
  migrations/
doc/
  attention.md
  auth.md
  knowledge.md
  package_api.md
```

## 当前主要页面

- `/`
  - 主聊天页面
- `/login`
  - 登录页
- `/knowledge`
  - 私有知识库管理页

## 当前主要 API

- `GET /api/chats`
- `GET /api/chats/:id`
- `POST /api/runChat`
- `GET /api/knowledge/documents`
- `POST /api/knowledge/documents`
- `DELETE /api/knowledge/documents/:id`
- `GET /api/knowledge/documents/:id/download`

## RAG 工作流

1. 用户上传文档到知识库。
2. 服务端抽取文本、切分 chunk、生成 embedding。
3. chunk 写入 `document_chunks`，原文件写入 Supabase Storage。
4. 聊天时 Agent 优先调用 `knowledge_search`。
5. 检索命中时返回带引用标签的 chunk 结果。
6. 检索不足时再调用 `tavily_search`。
7. 前端把工具调用、引用标签和最终回答一起可视化。

## 数据模型概览

### Conversation

- 用户会话
- 通过 `userId` 隔离

### Message

- 会话消息
- 支持 `toolCalls` JSON 字段保存工具摘要

### Document

- 文档元信息
- 记录文件名、路径、hash、状态、错误信息

### DocumentChunk

- 文档切分后的向量 chunk
- 存储文本、metadata、embedding
- 作为知识库检索的核心数据表

## 测试与检查

当前项目已接入：

- ESLint
- Prettier
- Jest

建议在提交前至少执行：

```bash
npm run lint
npm run build
npm run test
```

## 文档索引

- [认证方案说明](/e:/myProject/rag-knowledge/doc/auth.md)
- [核心包与 API 说明](/e:/myProject/rag-knowledge/doc/package_api.md)
- [项目注意事项](/e:/myProject/rag-knowledge/doc/attention.md)
- [知识库与 RAG 说明](/e:/myProject/rag-knowledge/doc/knowledge.md)

## 说明

当前仓库已经具备生产原型所需的主要能力，但仍建议继续补充：

- OAuth 回调路由收口
- 知识库页更多文档管理能力
- 引用来源聚合展示
- 更完整的接口测试和 RAG 流程测试
