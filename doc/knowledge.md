# 知识库与 RAG 说明

本文档说明当前项目中私有知识库页面、文档处理链路、向量检索链路和 Agent RAG 策略。

## 功能概览

当前项目已经支持：

- `/knowledge` 独立知识库页面
- 上传私有文档
- 查看当前用户文档列表
- 下载自己的文档
- 删除自己的文档
- 文档切分与向量化
- pgvector 检索
- Agent 优先知识库、兜底联网搜索

## 关键文件

### 页面与组件

- [src/app/knowledge/page.tsx](/e:/myProject/rag-knowledge/src/app/knowledge/page.tsx)
- [src/app/components/knowledge-page-shell.tsx](/e:/myProject/rag-knowledge/src/app/components/knowledge-page-shell.tsx)
- [src/components/chat/chat-sidebar.tsx](/e:/myProject/rag-knowledge/src/components/chat/chat-sidebar.tsx)

### API

- [src/app/api/knowledge/documents/route.ts](/e:/myProject/rag-knowledge/src/app/api/knowledge/documents/route.ts)
- [src/app/api/knowledge/documents/[id]/route.ts](/e:/myProject/rag-knowledge/src/app/api/knowledge/documents/[id]/route.ts)
- [src/app/api/knowledge/documents/[id]/download/route.ts](/e:/myProject/rag-knowledge/src/app/api/knowledge/documents/[id]/download/route.ts)

### 服务端逻辑

- [src/lib/knowledge.ts](/e:/myProject/rag-knowledge/src/lib/knowledge.ts)
- [src/lib/supabase-admin.ts](/e:/myProject/rag-knowledge/src/lib/supabase-admin.ts)
- [src/lib/aiAgent.ts](/e:/myProject/rag-knowledge/src/lib/aiAgent.ts)

### 数据模型

- [prisma/schema.prisma](/e:/myProject/rag-knowledge/prisma/schema.prisma)

## 数据模型

### `Document`

保存文档元信息：

- `userId`
- `filePath`
- `fileHash`
- `fileName`
- `fileSize`
- `mimeType`
- `status`
- `errorMessage`

当前状态值：

- `PROCESSING`
- `READY`
- `FAILED`

### `DocumentChunk`

保存切分后的 chunk：

- `documentId`
- `userId`
- `chunkIndex`
- `content`
- `metadata`
- `embedding`

## 上传流程

用户上传文档后，服务端会按下面的顺序处理：

1. 校验登录用户。
2. 校验文件类型，只允许 `PDF / Markdown / TXT`。
3. 读取文件并计算 sha256 hash。
4. 做同用户维度的去重。
5. 先创建一条 `PROCESSING` 状态的文档记录。
6. 上传原文件到 Supabase Storage 私有 bucket。
7. 提取文档纯文本。
8. 使用 `RecursiveCharacterTextSplitter` 切分 chunk。
9. 生成 embedding。
10. 把 chunk 和向量写入 `document_chunks`。
11. 更新文档状态为 `READY`。

如果任一步骤失败：

- 文档状态会变成 `FAILED`
- 错误信息写入 `errorMessage`

## 文档权限

所有文档能力都做了用户隔离：

- 文档列表只返回当前用户的文档
- 下载只允许当前用户下载自己的文档
- 删除只允许当前用户删除自己的文档
- 向量检索也只在当前用户的 chunk 中执行

## 检索流程

当前私有知识库检索函数是：

- `searchKnowledgeBase(userId, query, options?)`

流程如下：

1. 对原始问题做查询重写。
2. 生成查询向量。
3. 在 `document_chunks` 中按 `userId` 过滤。
4. 用 pgvector 做相似度检索。
5. 过滤低于阈值的结果。
6. 返回带引用标签的命中结果。

每条命中结果会包含：

- `fileName`
- `chunkIndex`
- `citationLabel`
- `excerpt`
- `content`
- `similarity`

## Agent 工具策略

当前 Agent 有两个主要检索工具：

- `knowledge_search`
- `tavily_search`

策略是：

1. 优先使用 `knowledge_search`
2. 如果私有知识库没有足够相关结果，再使用 `tavily_search`

这让当前系统具备：

- 私有知识优先
- 实时信息兜底

## 引用展示

知识库检索命中后，工具返回会包含类似这样的标签：

```text
[product-manual.pdf#chunk-3]
```

前端当前已经支持：

- 在 assistant 回答中识别 citation label
- 将其渲染成可点击引用
- 点击后弹出来源卡片，展示文件名、chunk 编号和摘录

## `/knowledge` 页面现状

当前知识库页面已经支持：

- 上传按钮
- 上传进度条
- 文档列表
- 下载按钮
- 删除按钮
- 删除前确认弹窗

上传进度分两段：

- 文件上传阶段
- 文档处理阶段

## 环境变量

知识库功能通常至少依赖这些环境变量：

```bash
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DOCUMENTS_BUCKET=knowledge-documents
EMBEDDING_MODEL_NAME=
EMBEDDING_API_KEY=
EMBEDDING_BASE_URL=
```

聊天和联网兜底检索还依赖：

```bash
MODEL_NAME=
OPENROUTER_API_KEY=
OPENAI_API_KEY=
TAVILY_API_KEY=
```

## 当前边界

当前版本还没有做这些能力：

- 文档重命名
- 文档标签分类
- 文档批量删除
- 多知识库空间
- 检索结果重排模型
- Answer 级别的来源聚合区块

## 一句话总结

当前项目的 RAG 实现可以理解为：

> 用户上传自己的文档，服务端把文档切成向量 chunk 存入 pgvector；聊天时 Agent 先在当前用户的知识库里检索，命中后带引用回答，命中不足再联网搜索。
