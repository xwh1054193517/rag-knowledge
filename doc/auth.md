# 认证方案解析

本文档说明当前 `rag-knowledge` 项目中使用到的认证方案与相关 API，重点覆盖：

- Supabase Auth
- 邮箱密码登录
- Google OAuth 登录
- Next.js 服务端鉴权
- 认证状态在页面与 API 中的流转方式

说明：

- 本文档基于当前仓库代码现状整理
- 重点解释“项目里怎么用”，而不是罗列 Supabase 全部功能

---

## 1. 当前项目采用的认证方案

当前项目使用的是 **Supabase Auth**，并结合：

- **邮箱密码登录**
- **邮箱密码注册**
- **Google OAuth 登录**
- **Next.js 16 App Router + SSR Cookie 会话**

也就是说，这个项目并没有自己手写 JWT 鉴权系统，而是把认证能力交给 Supabase，项目侧负责：

- 在浏览器发起登录 / 注册
- 在服务端读取 Supabase 会话
- 对页面和 API 做登录态校验
- 基于用户身份做数据隔离

---

## 2. 核心包与 API

### 2.1 `@supabase/ssr`

这是当前项目认证链路的核心包，用于在 Next.js 的服务端和客户端分别创建 Supabase Client。

项目里用到了两个核心 API：

- `createServerClient`
- `createBrowserClient`

作用分别是：

- **服务端**：在 Server Component、Route Handler、代理层读取和写回认证 Cookie
- **客户端**：在登录页等客户端组件中调用登录、注册、OAuth 跳转

---

### 2.2 `@supabase/supabase-js`

这是 Supabase 官方 JS SDK，`@supabase/ssr` 本质上是围绕它在 SSR 场景下做了一层包装。

项目里真正调用到的认证 API 主要包括：

- `supabase.auth.signUp(...)`
- `supabase.auth.signInWithPassword(...)`
- `supabase.auth.signInWithOAuth(...)`
- `supabase.auth.onAuthStateChange(...)`
- `supabase.auth.getUser()`

---

## 3. 服务端认证实现

### 3.1 `createSupabaseServerClient()`

- **路径**: [src/lib/supabase-server.ts](../src/lib/supabase-server.ts)
- **功能**: 创建服务端 Supabase Client
- **作用**:
  - 读取当前请求里的 Cookie
  - 在需要时把新 Cookie 写回响应
  - 让服务端也能识别当前登录用户

当前项目中的实现要点：

```ts
return createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        ...
      },
    },
  }
);
```

这意味着：

- Supabase 的会话状态不是单独保存在前端内存里
- 而是通过 Cookie 在浏览器和服务端之间共享

---

### 3.2 `getCurrentUser()`

- **路径**: [src/lib/supabase-server.ts](../src/lib/supabase-server.ts)
- **功能**: 获取当前登录用户
- **作用**:
  - 所有服务端页面和 API 都可以复用它做鉴权

当前项目中的实现：

```ts
const supabase = await createSupabaseServerClient();
const {
  data: { user },
} = await supabase.auth.getUser();
```

返回值：

- 已登录时返回 Supabase 用户对象
- 未登录时返回 `null`

这个函数是当前项目认证链路里最重要的服务端入口。

---

### 3.3 `getCurrentLoginUser()`

- **路径**: [src/lib/supabase-server.ts](../src/lib/supabase-server.ts)
- **功能**: `getCurrentUser()` 的兼容别名
- **作用**:
  - 兼容旧代码命名
  - 让现有 API 路由不需要全部重写

当前实现里：

```ts
export async function getCurrentLoginUser() {
  return getCurrentUser();
}
```

---

## 4. 客户端认证实现

### 4.1 `getSupabaseBrowserClient()`

- **路径**: [src/lib/supabase-browser.ts](../src/lib/supabase-browser.ts)
- **功能**: 获取浏览器端单例 Supabase Client
- **作用**:
  - 避免客户端重复创建实例
  - 让登录页等客户端组件可以直接调用 Supabase Auth

当前项目中的实现：

```ts
if (!client) {
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

这表示浏览器端认证依赖：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 5. 登录页中的认证流程

- **路径**: [src/app/login/page.tsx](../src/app/login/page.tsx)

当前登录页承担了三类认证动作：

- 邮箱注册
- 邮箱密码登录
- Google OAuth 登录

---

### 5.1 邮箱注册：`signUp`

当前项目里的注册逻辑：

```ts
await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
  },
});
```

作用：

- 创建邮箱密码账户
- 让用户去邮箱完成验证
- 邮箱验证完成后，回跳到指定地址

当前项目中的设计意图是：

- 用户注册成功后，先提示“请前往邮箱完成验证后再登录”
- 验证链接回到应用后再进入实际使用流程

---

### 5.2 邮箱密码登录：`signInWithPassword`

当前项目中的登录逻辑：

```ts
await supabase.auth.signInWithPassword({
  email,
  password,
});
```

作用：

- 使用邮箱密码登录
- Supabase 登录成功后会把会话写入 Cookie
- 然后前端手动执行：
  - `router.replace(next)`
  - `router.refresh()`

这样用户会直接跳回原本想访问的页面。

---

### 5.3 Google OAuth：`signInWithOAuth`

当前项目中的 Google 登录逻辑：

```ts
await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo,
    queryParams: {
      prompt: "select_account",
    },
  },
});
```

作用：

- 跳转到 Google 授权页面
- 用户授权后回到 `redirectTo`
- Supabase 交换会话后建立登录态

其中：

- `provider: "google"` 指定使用 Google 登录
- `prompt: "select_account"` 强制用户选择 Google 账号

---

### 5.4 `onAuthStateChange`

登录页里还注册了：

```ts
supabase.auth.onAuthStateChange((event, session) => {
  if (
    session &&
    (event === "SIGNED_IN" ||
      event === "TOKEN_REFRESHED" ||
      event === "INITIAL_SESSION")
  ) {
    router.replace(next);
    router.refresh();
  }
});
```

作用：

- 监听登录态变化
- 一旦检测到当前浏览器已有有效会话
- 自动跳到目标页面

这让登录页具备了更稳定的“登录后自动跳转”能力。

---

## 6. 页面级鉴权

### 6.1 首页服务端鉴权

- **路径**: [src/app/page.tsx](../src/app/page.tsx)

当前首页是服务端页面，加载时会先检查：

```ts
const user = await getCurrentUser();

if (!user) {
  redirect("/login");
}
```

作用：

- 用户未登录时直接跳转到 `/login`
- 用户已登录时才渲染聊天工作区

这层校验是“页面级鉴权”。

---

## 7. 路由级鉴权

### 7.1 `proxy.ts`

- **路径**: [src/proxy.ts](../src/proxy.ts)

当前项目通过 `proxy` 做页面层面的认证重定向控制。

核心逻辑：

1. 创建带 Cookie 能力的服务端 Supabase Client
2. 调用 `supabase.auth.getUser()`
3. 判断当前访问路径和登录状态

当前策略：

- **API 路径**：不在这里做页面式重定向，直接放过
- **未登录访问受保护页面**：重定向到 `/login`
- **已登录访问 `/login`**：重定向回首页或 `next` 参数对应页面

这相当于：

- `page.tsx` 负责服务端页面兜底
- `proxy.ts` 负责路径级访问控制

两层一起保证体验稳定。

---

## 8. API 认证

### 8.1 Route Handler 中的统一鉴权

- **路径**:
  - [src/app/api/runChat/route.ts](../src/app/api/runChat/route.ts)
  - [src/app/api/chats/route.ts](../src/app/api/chats/route.ts)
  - [src/app/api/chats/[id]/route.ts](../src/app/api/chats/[id]/route.ts)

当前 API 的统一模式是：

```ts
const user = await getCurrentLoginUser();

if (!user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

作用：

- 所有聊天相关 API 都先要求用户已登录
- 未登录请求直接返回 `401`

然后在会话相关接口中，还会继续基于 `user.id` 做资源归属校验，确保：

- 用户只能看到自己的会话
- 用户只能操作自己的消息

---

## 9. 当前认证链路时序

### 9.1 邮箱密码登录

```text
用户输入邮箱和密码
-> login/page.tsx 调用 supabase.auth.signInWithPassword()
-> Supabase 建立会话并写入 Cookie
-> 前端 router.replace(next)
-> 服务端页面 / API 通过 getCurrentUser() 识别用户
```

### 9.2 Google OAuth 登录

```text
用户点击 Google 登录
-> login/page.tsx 调用 supabase.auth.signInWithOAuth()
-> 跳转到 Google 授权页
-> 授权成功后回到 redirectTo
-> Supabase 建立会话
-> onAuthStateChange 监听到 SIGNED_IN
-> router.replace(next)
```

### 9.3 页面访问控制

```text
用户访问受保护页面
-> proxy.ts 检查当前登录态
-> 未登录: 重定向到 /login
-> 已登录: 放行
```

### 9.4 API 访问控制

```text
前端请求 /api/*
-> Route Handler 调用 getCurrentLoginUser()
-> 未登录: 返回 401
-> 已登录: 继续执行业务逻辑
```

---

## 10. 当前实现中的注意点

### 10.1 当前仓库里没有 `/auth/callback` 路由

登录页当前把 `emailRedirectTo` 和 Google OAuth 的 `redirectTo` 都指向了：

```text
/auth/callback?next=...
```

但当前仓库里暂时没有这个路由文件：

- `src/app/auth/callback/route.ts`

这意味着：

- 登录页代码的设计意图是通过回调路由完成 OAuth / 邮箱验证后的跳转
- 但当前仓库里这一环还没有实际落地

如果你后面要把认证链路补完整，建议优先补上这个回调路由。

---

### 10.2 当前项目使用的是 Supabase 会话式认证，而不是自定义 JWT

所以你后面做 API 鉴权、页面鉴权、数据隔离时，应该统一围绕：

- `getCurrentUser()`
- `getCurrentLoginUser()`

而不是自己去解析 token。

---

## 11. 总结

当前项目的认证方案可以概括成一句话：

> **使用 Supabase Auth 承担账户与会话能力，客户端负责发起登录，服务端负责读取登录态，并通过页面层、路由层和 API 层三重校验保障访问安全。**

核心分工如下：

- [src/lib/supabase-browser.ts](../src/lib/supabase-browser.ts)
  - 浏览器端发起登录、注册、OAuth

- [src/lib/supabase-server.ts](../src/lib/supabase-server.ts)
  - 服务端读取当前用户

- [src/app/login/page.tsx](../src/app/login/page.tsx)
  - 登录与注册 UI

- [src/proxy.ts](../src/proxy.ts)
  - 页面路由级访问控制

- [src/app/page.tsx](../src/app/page.tsx)
  - 首页服务端鉴权

- `src/app/api/*`
  - API 统一鉴权与用户数据隔离
