# 项目中用到的核心包 API 解析

本文档面向当前 `rag-knowledge` 项目实现，解释项目里已经接入或正在使用的核心包 API，重点覆盖：

- `@ai-sdk/react`
- `ai`
- `@ai-sdk/langchain`
- `langchain`
- `@langchain/openai`
- `@langchain/tavily`
- `zod`
- `@prisma/client`
- `@supabase/ssr` / `@supabase/supabase-js`

文档目标不是罗列官网全部 API，而是结合当前项目代码说明：

- 这个 API 在哪里用
- 它负责什么
- 它在本项目里的作用是什么

---

## 1. 前端 AI SDK

### 1.1 `useChat`（来自 `@ai-sdk/react`）

- **路径**: [src/components/chat/chat-shell.tsx](../src/components/chat/chat-shell.tsx)
- **功能**: React Hook，负责前端聊天状态管理与流式响应消费。
- **作用**:
  - 管理 `messages`、`status`
  - 提供 `sendMessage()` 发起聊天请求
  - 提供 `regenerate()` 重新触发最后一条消息的生成流程
  - 提供 `stop()` 中止当前流式生成
  - 自动解析后端返回的 UI Message Stream，并将其转为前端可渲染的消息结构

当前项目中的典型用法：

```ts
const { messages, regenerate, sendMessage, setMessages, status, stop } =
  useChat({
    transport: new DefaultChatTransport({
      api: "/api/runChat",
      credentials: "include",
    }),
  });
```

在本项目里的职责：

- 作为聊天 UI 的底层消息流来源
- 和本地 `conversationMessages` 共同实现“当前会话消息视图”
- 和 `status` 一起控制发送态、thinking、停止按钮、超时逻辑

---

### 1.2 `DefaultChatTransport`（来自 `ai`）

- **路径**: [src/components/chat/chat-shell.tsx](../src/components/chat/chat-shell.tsx)
- **功能**: `useChat` 的默认传输层实现。
- **作用**:
  - 将前端消息提交到指定 API
  - 接收后端返回的流式响应
  - 处理带认证的请求配置，如 `credentials: "include"`

当前项目中：

```ts
new DefaultChatTransport({
  api: "/api/runChat",
  credentials: "include",
});
```

这表示：

- 前端聊天统一调用 `/api/runChat`
- 请求会自动携带 Cookie，用于服务端 Supabase 鉴权

---

### 1.3 `UIMessage`（来自 `ai`）

- **路径**:
  - [src/components/chat/chat-shell.tsx](../src/components/chat/chat-shell.tsx)
  - [src/components/chat/chat-message.tsx](../src/components/chat/chat-message.tsx)
  - [src/components/chat/messageBubble.tsx](../src/components/chat/messageBubble.tsx)
  - [src/app/api/runChat/route.ts](../src/app/api/runChat/route.ts)
- **功能**: AI SDK 的统一消息结构。
- **作用**:
  - 表示用户消息、助手消息、thinking、reasoning、失败提示等前端消息对象
  - `parts` 字段支持文本、推理内容等多种消息片段

本项目中常见结构：

```ts
{
  id: "message-id",
  role: "assistant",
  parts: [
    {
      type: "text",
      text: "你好，我可以帮你检索知识库。",
    },
  ],
}
```

在本项目里的作用：

- 会话详情接口返回的消息格式
- 前端聊天区渲染的统一输入
- 乐观消息、超时消息、失败消息也都复用了这一结构

---

## 2. 后端 AI SDK

### 2.1 `createUIMessageStreamResponse`（来自 `ai`）

- **路径**: [src/app/api/runChat/route.ts](../src/app/api/runChat/route.ts)
- **功能**: 将一条 UI Message Stream 封装成标准 HTTP 流式响应。
- **作用**:
  - 作为聊天接口的最终返回出口
  - 将 LangChain 生成的流式内容传给前端 `useChat`
  - 支持附带 HTTP Header，例如当前会话 id

当前项目中的典型用法：

```ts
return createUIMessageStreamResponse({
  stream: toUIMessageStream(stream, {
    async onFinal(completion) {
      // 保存 assistant 最终消息
    },
    onAbort() {
      // 记录中止
    },
    onError(error) {
      console.error(error);
    },
  }),
  headers: {
    "Cache-Control": "no-cache, no-transform",
    "X-Conversation-Id": activeConversationId,
  },
});
```

在本项目里的作用：

- 将 agent 输出转换成前端可消费的流
- 在 `onFinal` 中把完整 assistant 回复落库
- 在 `onAbort` 中避免把被停止的回答错误写入数据库

---

## 3. AI SDK 与 LangChain 的桥接

### 3.1 `toBaseMessages`（来自 `@ai-sdk/langchain`）

- **路径**: [src/app/api/runChat/route.ts](../src/app/api/runChat/route.ts)
- **功能**: 将 AI SDK 的 `UIMessage[]` 转换为 LangChain 可识别的消息结构。
- **作用**:
  - 把前端传来的消息历史交给 LangChain Agent
  - 省去手动拼装 `HumanMessage` / `AIMessage` 的过程

当前项目中的典型用法：

```ts
const langchainMessages = await toBaseMessages(uiMessages);
```

在本项目里的作用：

- 让前端 `useChat` 的消息格式和后端 LangChain agent 无缝衔接

---

### 3.2 `toUIMessageStream`（来自 `@ai-sdk/langchain`）

- **路径**: [src/app/api/runChat/route.ts](../src/app/api/runChat/route.ts)
- **功能**: 将 LangChain 的流式结果转换为 AI SDK 的 UI Message Stream。
- **作用**:
  - 把 agent 的流式输出适配给 `createUIMessageStreamResponse`
  - 在转换过程中挂接 `onFinal`、`onAbort`、`onError`

当前项目中的典型用法：

```ts
toUIMessageStream(stream, {
  async onFinal(completion) {
    // assistant 完整文本
  },
  onAbort() {
    // 用户中止
  },
  onError(error) {
    console.error(error);
  },
});
```

在本项目里的作用：

- 作为 LangChain 到 Vercel AI SDK 的关键适配层
- 负责把后端 Agent 流转成前端 `useChat` 能识别的格式

---

## 4. LangChain Agent 相关 API

### 4.1 `createAgent`（来自 `langchain`）

- **路径**: [src/lib/aiAgent.ts](../src/lib/aiAgent.ts)
- **功能**: 创建一个新版 LangChain Agent 实例。
- **作用**:
  - 绑定模型
  - 注入系统提示词
  - 后续可继续接入工具列表

当前项目中的典型用法：

```ts
return createAgent({
  model: llm,
  systemPrompt: `${prompt}`,
});
```

在本项目里的作用：

- 负责真正的对话推理执行
- 是 `/api/runChat` 里流式调用的核心入口

---

### 4.2 `agent.stream(...)`（来自 `langchain` Agent 实例）

- **路径**: [src/app/api/runChat/route.ts](../src/app/api/runChat/route.ts)
- **功能**: 对 Agent 执行流式调用。
- **作用**:
  - 接收完整消息历史
  - 让模型逐步产出结果
  - 支持不同流模式

当前项目中的典型用法：

```ts
const stream = await agentExecutor.stream(
  {
    messages: langchainMessages,
  },
  {
    streamMode: ["values", "messages"],
  }
);
```

在本项目里的作用：

- 支撑聊天区的流式输出
- 让后端可以一边生成、一边把结果传给前端

---

### 4.3 `DynamicStructuredTool`（来自 `langchain`）

- **路径**: [src/lib/aiAgent.ts](../src/lib/aiAgent.ts)
- **功能**: LangChain 的结构化工具类型。
- **当前状态**:
  - 目前文件中有引入
  - 但当前版本的 `createAgentExecutor()` 里还没有真正把工具列表接上

在项目规划中的用途：

- 用于封装知识库检索工具
- 用于封装联网搜索工具
- 让 Agent 能通过结构化 schema 调用外部能力

---

## 5. 模型与搜索接入

### 5.1 `ChatOpenAI`（来自 `@langchain/openai`）

- **路径**: [src/lib/aiAgent.ts](../src/lib/aiAgent.ts)
- **功能**: LangChain 对 OpenAI Chat Model 的封装。
- **作用**:
  - 创建项目当前默认使用的聊天模型
  - 支持在 Agent 中作为底层模型使用

当前项目中的典型用法：

```ts
return new ChatOpenAI({
  temperature: 0,
});
```

在本项目里的作用：

- 作为当前 `createLLM()` 的默认实现
- 负责 AI 对话生成

说明：

- 文件中也保留了 `ChatOpenRouter` 的注释示例，后续可切换到 OpenRouter 模型

---

### 5.2 `TavilySearch`（来自 `@langchain/tavily`）

- **路径**: [src/lib/aiAgent.ts](../src/lib/aiAgent.ts)
- **功能**: LangChain 提供的 Tavily 搜索工具封装。
- **当前状态**:
  - 目前已引入
  - 但当前 agent 尚未真正挂载使用

未来在本项目中的作用：

- 提供实时联网搜索能力
- 作为 Agent 的工具之一补充知识库之外的信息

---

## 6. 请求参数与校验

### 6.1 `z.object(...)` / `z.enum(...)` / `z.array(...)`（来自 `zod`）

- **路径**: [src/app/api/runChat/route.ts](../src/app/api/runChat/route.ts)
- **功能**: 运行时请求参数校验。
- **作用**:
  - 校验 `conversationId`
  - 校验 `mode`
  - 校验 `messages`

当前项目中的典型用法：

```ts
const runChatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  mode: z.enum(["create", "rerun-last-user"]).optional(),
  messages: z.array(z.unknown()).min(1, "messages is required"),
});
```

在本项目里的作用：

- 防止非法请求体进入业务逻辑
- 明确区分普通发送与“最后一条用户消息重发”两种模式

---

## 7. Prisma 数据库 API

### 7.1 `prisma`（来自 `@prisma/client` 的项目单例封装）

- **路径**: [src/lib/prisma.ts](../src/lib/prisma.ts)
- **功能**: 项目统一的 Prisma Client 单例。
- **作用**:
  - 避免重复实例化 PrismaClient
  - 作为所有数据库操作的统一入口

在项目中的使用方式：

- 不直接在 API 里写 Prisma
- 统一通过 [src/lib/chat-utils.ts](../src/lib/chat-utils.ts) 封装数据库操作

---

### 7.2 `prisma.conversation.*` / `prisma.message.*`

- **路径**: [src/lib/chat-utils.ts](../src/lib/chat-utils.ts)
- **功能**: 会话与消息表的 CRUD 操作。
- **作用**:
  - 读取当前用户会话列表
  - 读取单个会话详情
  - 创建会话
  - 追加消息
  - 更新最后一条用户消息
  - 删除最后一条用户消息之后的 assistant 回复

在本项目里的职责：

- 为 `/api/chats` 和 `/api/runChat` 提供数据层支持
- 将数据库语义从 API 路由中拆分出去，保持 API 只负责服务编排

---

## 8. Supabase 认证相关 API

### 8.1 `createServerClient` / `createBrowserClient`（来自 `@supabase/ssr`）

- **路径**:
  - [src/lib/supabase-server.ts](../src/lib/supabase-server.ts)
  - [src/lib/supabase-browser.ts](../src/lib/supabase-browser.ts)
- **功能**: 为 Next.js SSR / CSR 场景创建 Supabase 客户端。
- **作用**:
  - 服务端获取当前登录用户
  - 客户端完成登录、登出、OAuth 跳转等操作

在本项目里的职责：

- 登录页发起认证
- API 路由读取会话
- 页面加载时基于服务端用户状态做跳转或渲染

---

### 8.2 `getCurrentLoginUser()`（项目封装）

- **路径**: [src/lib/supabase-server.ts](../src/lib/supabase-server.ts)
- **功能**: 获取当前登录用户。
- **作用**:
  - 作为 API 路由统一鉴权入口

当前项目中的典型用法：

```ts
const user = await getCurrentLoginUser();

if (!user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

在本项目里的作用：

- 保证用户只能访问自己的聊天数据
- 作为所有受保护接口的第一道校验

---

## 9. 当前项目里的 API 协作关系

可以把这条聊天调用链理解成：

```text
前端 useChat
-> DefaultChatTransport 调用 /api/runChat
-> zod 校验请求体
-> chat-utils 处理会话和消息数据库逻辑
-> createAgentExecutor() 创建 LangChain Agent
-> toBaseMessages() 转 LangChain 消息
-> agent.stream() 执行流式生成
-> toUIMessageStream() 转为 AI SDK UI 流
-> createUIMessageStreamResponse() 返回前端
-> useChat 实时解析并更新 UI
```

---

## 10. 后续建议

结合当前项目现状，后续最值得继续扩展的 API 点有：

1. 在 [src/lib/aiAgent.ts](../src/lib/aiAgent.ts) 中正式接入工具列表
   - `knowledge_search`
   - `tavily_search`

2. 在前端消息渲染中支持更多 AI SDK parts
   - `reasoning`
   - `tool`
   - `annotations`

3. 为 `runChat` 增加更细的错误分层
   - 请求前失败
   - 用户消息已入库但生成失败
   - 工具调用失败

4. 持续补充对应单元测试和接口测试
