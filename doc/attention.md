# 项目注意事项

本文档记录当前项目开发和部署时最容易踩坑的点。

## 1. 数据库与 Prisma

- `DATABASE_URL` 需要使用 Supabase PostgreSQL 的直连地址。
- 如果你在做 Prisma migration，不要优先使用 PgBouncer 事务池连接。
- 修改 [schema.prisma](/e:/myProject/rag-knowledge/prisma/schema.prisma) 后记得执行：

```bash
npx prisma generate
```

- 部署环境中如果有新迁移，记得执行：

```bash
npx prisma migrate deploy
```

## 2. pgvector 相关

- 当前知识库向量列使用 PostgreSQL `vector`。
- Prisma 对 `vector` 的声明仍然是：

```prisma
Unsupported("vector")
```

- 向量写入时项目里使用原生 SQL，而不是完全依赖 Prisma 标准 CRUD。

## 3. Supabase Auth

- 所有受保护 API 都应先调用 `getCurrentLoginUser()`。
- 涉及具体资源时，还要继续校验该资源是否属于当前用户。
- Google OAuth 线上回 localhost 时，通常优先检查：
  - Supabase Site URL
  - Supabase Redirect URLs
  - Google Cloud Console 的 Authorized Redirect URI

## 4. Supabase Storage

- 知识库原文档上传到私有 bucket。
- 文档下载必须先校验 `user_id`。
- 删除文档时要同时删除：
  - Storage 原文件
  - `documents`
  - `document_chunks`

## 5. 聊天流式相关

- 当前聊天区大量依赖 `useChat` 的流式消息。
- 切换会话时不要直接信任旧请求返回，需要做请求竞态保护。
- 流式过程中不要轻易把整段历史重新镜像到本地 state，否则容易触发：
  - 更新深度超限
  - 页面卡顿
  - 流式渲染丢失

## 6. Mermaid / Markdown

- 大模型不一定会严格返回：

````md
```mermaid
graph TD
  A --> B
```
````

````

- 当前前端已经对裸 Mermaid 做了一层预处理，但最稳的方式仍然是：
  - prompt 里强约束格式
  - 前端做兜底规范化

- Mermaid 语法不合法时，当前实现会回退为代码块，不直接显示 Mermaid 错误图。

## 7. 知识库 RAG

- 当前策略是：
  - 先 `knowledge_search`
  - 知识库无有效命中再 `tavily_search`

- 检索范围严格按 `user_id` 过滤，不能跨用户命中。
- 引用标签格式类似：

```text
[handbook.pdf#chunk-2]
````

- 回答中的 citation 已经支持可点击来源卡片。

## 8. 文档上传链路

- 当前首版支持：
  - PDF
  - Markdown
  - TXT

- 上传流程包括：
  - 文件校验
  - 去重 hash
  - Storage 上传
  - 文本提取
  - chunk 切分
  - embedding
  - chunk 入库

- 如果 embedding 环节没有配置好环境变量，文档会停在失败态。

## 9. 前端性能

- Mermaid、Markdown、工具卡片、引用卡片都可能带来较重渲染开销。
- 若页面在流式时明显卡顿，优先检查：
  - 是否每个 chunk 都触发整段 Markdown 重新解析
  - 是否把整个消息列表做了重复 setState
  - 是否多个 Mermaid 图在同一轮里被反复重新渲染

## 10. 提交前建议检查

```bash
npm run lint
npm run build
npm run test
```

如果改动涉及：

- Prisma schema
  - 再跑 `npx prisma generate`
- 知识库上传/检索
  - 再手测 `/knowledge`
- 聊天工具链路
  - 再手测聊天页中的 `knowledge_search` 和 `tavily_search`
