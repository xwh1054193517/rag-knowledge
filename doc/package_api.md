# 核心包与 API 说明

本文档面向当前 `rag-knowledge` 项目，说明几个最核心的第三方包在项目里的职责和使用位置。

## 1. `@ai-sdk/react`

### `useChat`

- 位置：
  - [src/components/chat/chat-shell.tsx](/e:/myProject/rag-knowledge/src/components/chat/chat-shell.tsx)
- 作用：
  - 管理聊天消息
  - 管理发送状态
  - 消费后端流式响应
  - 提供 `sendMessage()`、`regenerate()`、`stop()`、`setMessages()`

项目中它是聊天 UI 的主状态源，流式消息、工具卡片、重发逻辑都围绕它展开。

## 2. `ai`

### `DefaultChatTransport`

- 位置：
  - [src/components/chat/chat-shell.tsx](/e:/myProject/rag-knowledge/src/components/chat/chat-shell.tsx)
- 作用：
  - 把 `useChat` 请求发到 `/api/runChat`
  - 携带 Cookie
  - 接收流式响应

### `createUIMessageStreamResponse`

- 位置：
  - [src/app/api/runChat/route.ts](/e:/myProject/rag-knowledge/src/app/api/runChat/route.ts)
- 作用：
  - 把 LangChain 的流式输出封装成 AI SDK 可以识别的 HTTP Response

### `UIMessage`

- 位置：
  - 聊天前端组件
  - 聊天接口
  - 消息回放工具函数
- 作用：
  - 统一消息结构
  - `parts` 支持文本、reasoning、工具调用结果等多种片段

## 3. `@ai-sdk/langchain`

### `toBaseMessages`

- 位置：
  - [src/app/api/runChat/route.ts](/e:/myProject/rag-knowledge/src/app/api/runChat/route.ts)
- 作用：
  - 把前端 `UIMessage[]` 转成 LangChain 可消费的消息

### `toUIMessageStream`

- 位置：
  - [src/app/api/runChat/route.ts](/e:/myProject/rag-knowledge/src/app/api/runChat/route.ts)
- 作用：
  - 把 LangChain 流转成 AI SDK 的 UI message stream

## 4. `langchain`

### `createAgent`

- 位置：
  - [src/lib/aiAgent.ts](/e:/myProject/rag-knowledge/src/lib/aiAgent.ts)
- 作用：
  - 创建 LangChain Agent

### `tool`

- 位置：
  - [src/lib/aiAgent.ts](/e:/myProject/rag-knowledge/src/lib/aiAgent.ts)
- 作用：
  - 定义 `knowledge_search`
  - 定义 `tavily_search`

### `agent.stream(...)`

- 位置：
  - [src/app/api/runChat/route.ts](/e:/myProject/rag-knowledge/src/app/api/runChat/route.ts)
- 作用：
  - 执行流式 Agent 推理

## 5. `@langchain/openai`

### `ChatOpenAI`

- 位置：
  - [src/lib/aiAgent.ts](/e:/myProject/rag-knowledge/src/lib/aiAgent.ts)
  - [src/lib/knowledge.ts](/e:/myProject/rag-knowledge/src/lib/knowledge.ts)
- 作用：
  - 作为聊天模型回退方案
  - 作为 embedding 模型调用基础

### `OpenAIEmbeddings`

- 位置：
  - [src/lib/knowledge.ts](/e:/myProject/rag-knowledge/src/lib/knowledge.ts)
- 作用：
  - 生成知识库 chunk 的 embedding
  - 生成查询向量

## 6. `@langchain/openrouter`

### `ChatOpenRouter`

- 位置：
  - [src/lib/aiAgent.ts](/e:/myProject/rag-knowledge/src/lib/aiAgent.ts)
  - [src/lib/knowledge.ts](/e:/myProject/rag-knowledge/src/lib/knowledge.ts)
- 作用：
  - 当前项目优先使用的聊天模型
  - 也用于查询重写

## 7. `@langchain/tavily`

### `TavilySearch`

- 位置：
  - [src/lib/aiAgent.ts](/e:/myProject/rag-knowledge/src/lib/aiAgent.ts)
- 作用：
  - 提供联网搜索工具 `tavily_search`
  - 在知识库无命中时作为兜底工具

## 8. `@langchain/textsplitters`

### `RecursiveCharacterTextSplitter`

- 位置：
  - [src/lib/knowledge.ts](/e:/myProject/rag-knowledge/src/lib/knowledge.ts)
- 作用：
  - 把抽取出的文档文本切成 chunk
  - 用于后续 embedding 和向量检索

## 9. `pdf-parse`

### `PDFParse`

- 位置：
  - [src/lib/knowledge.ts](/e:/myProject/rag-knowledge/src/lib/knowledge.ts)
- 作用：
  - 从 PDF 中提取纯文本

## 10. `zod`

- 位置：
  - [src/app/api/runChat/route.ts](/e:/myProject/rag-knowledge/src/app/api/runChat/route.ts)
  - [src/lib/aiAgent.ts](/e:/myProject/rag-knowledge/src/lib/aiAgent.ts)
- 作用：
  - 校验接口请求体
  - 校验工具输入 schema

## 11. `@prisma/client`

- 位置：
  - [src/lib/prisma.ts](/e:/myProject/rag-knowledge/src/lib/prisma.ts)
  - [src/lib/chat-utils.ts](/e:/myProject/rag-knowledge/src/lib/chat-utils.ts)
  - [src/lib/knowledge.ts](/e:/myProject/rag-knowledge/src/lib/knowledge.ts)
- 作用：
  - 管理会话、消息、文档、chunk 等数据库操作

项目中统一通过：

- [src/lib/prisma.ts](/e:/myProject/rag-knowledge/src/lib/prisma.ts)

输出单例客户端。

## 12. `@supabase/ssr` 和 `@supabase/supabase-js`

- 位置：
  - [src/lib/supabase-browser.ts](/e:/myProject/rag-knowledge/src/lib/supabase-browser.ts)
  - [src/lib/supabase-server.ts](/e:/myProject/rag-knowledge/src/lib/supabase-server.ts)
  - [src/lib/supabase-admin.ts](/e:/myProject/rag-knowledge/src/lib/supabase-admin.ts)
- 作用：
  - 用户认证
  - 服务器端读取当前用户
  - 知识库原文件上传、下载、删除

## 13. `react-markdown` / `remark-gfm` / `rehype-katex` / `mermaid`

- 位置：
  - [src/components/chat/rich-message-content.tsx](/e:/myProject/rag-knowledge/src/components/chat/rich-message-content.tsx)
  - [src/components/chat/mermaid-renderer.tsx](/e:/myProject/rag-knowledge/src/components/chat/mermaid-renderer.tsx)
- 作用：
  - 渲染 Markdown
  - 支持 Mermaid 图表
  - 支持代码高亮
  - 支持 LaTeX 数学公式

## 总结

可以把整个项目的依赖协作关系理解成：

1. 前端 `useChat` 发起请求。
2. 后端 `runChat` 把消息转成 LangChain 输入。
3. Agent 调用 `knowledge_search` / `tavily_search`。
4. 检索结果和最终回答以流式形式回到前端。
5. 前端再用 Markdown、Mermaid、工具卡片、引用卡片把消息可视化。
