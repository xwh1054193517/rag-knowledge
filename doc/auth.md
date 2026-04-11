# 认证方案说明

本文档说明当前项目使用的认证链路，以及认证相关代码分别放在哪里。

## 认证方案概览

当前项目使用 **Supabase Auth**，包含两类登录方式：

- 邮箱密码登录
- Google OAuth 登录

认证后的会话通过 Supabase Cookie 在浏览器和服务端之间共享，服务端页面与 API 都通过 Supabase Server Client 读取当前用户。

## 关键文件

- [src/lib/supabase-browser.ts](/e:/myProject/rag-knowledge/src/lib/supabase-browser.ts)
  - 浏览器端 Supabase Client 单例
- [src/lib/supabase-server.ts](/e:/myProject/rag-knowledge/src/lib/supabase-server.ts)
  - 服务端 Supabase Client
  - `getCurrentUser()`
  - `getCurrentLoginUser()`
- [src/app/login/page.tsx](/e:/myProject/rag-knowledge/src/app/login/page.tsx)
  - 登录页
- [src/proxy.ts](/e:/myProject/rag-knowledge/src/proxy.ts)
  - 页面级访问控制

## 浏览器端认证

浏览器端通过 `createBrowserClient()` 创建 Supabase Client。

当前主要使用到的 API：

- `supabase.auth.signInWithPassword(...)`
- `supabase.auth.signUp(...)`
- `supabase.auth.signInWithOAuth(...)`
- `supabase.auth.onAuthStateChange(...)`

作用如下：

- 处理登录与注册
- 发起 Google OAuth 跳转
- 监听登录态变化并在成功后跳转页面

## 服务端认证

服务端通过 `createServerClient()` 创建带 Cookie 能力的 Supabase Client。

当前主要使用到的 API：

- `supabase.auth.getUser()`

项目封装后常用入口是：

- `getCurrentUser()`
- `getCurrentLoginUser()`

这两个函数用于：

- App Router 页面加载前确认用户身份
- API Route Handler 鉴权
- 数据隔离时拿到当前 `user.id`

## 页面级鉴权

### 根页面 `/`

[src/app/page.tsx](/e:/myProject/rag-knowledge/src/app/page.tsx) 会先读取当前用户：

- 已登录：进入聊天页
- 未登录：重定向到 `/login`

### 中间层控制

[src/proxy.ts](/e:/myProject/rag-knowledge/src/proxy.ts) 负责：

- 未登录访问受保护页面时跳转到 `/login`
- 已登录访问 `/login` 时重定向回应用

## API 鉴权约定

项目中的 API 路由统一在开头调用：

- `getCurrentLoginUser()`

如果未登录，则返回：

```json
{ "error": "Unauthorized" }
```

状态码为 `401`。

除此之外，涉及具体资源时还会继续校验资源归属，例如：

- 聊天会话是否属于当前用户
- 知识库文档是否属于当前用户
- 下载和删除时是否只操作自己的文档

## Google OAuth 注意事项

当前登录页中的 `redirectTo` 是由浏览器当前域名拼出来的，不是硬编码 `localhost`。

如果线上 Google 登录后跳回 localhost，优先检查：

1. Supabase Dashboard 的 `Site URL`
2. Supabase Dashboard 的 `Redirect URLs`
3. Google Cloud Console 的 Authorized Redirect URI

另外还要注意：

- 当前仓库里登录页使用了 `/auth/callback`
- 如果项目里没有对应回调路由，就需要补上这一层链路

## 推荐的配置检查项

### Supabase

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 线上 OAuth

- `Site URL` 配置为线上域名
- `Redirect URLs` 同时包含本地和线上地址
- Google OAuth 授权回调地址与 Supabase 配置一致

## 一句话总结

当前项目的认证模式可以理解为：

> 浏览器发起登录，Supabase 维护会话，服务端读取当前用户，再基于 `user_id` 对页面、API、聊天和知识库数据做统一隔离。
