# langchain.js

# 数据库

- prisma 的url写在prisma.config.ts
- url需要用supabase不带pgbouncer
- Supabase 的 “pooled connections” 模式（PgBouncer）**不支持事务性操作**，而 Prisma 的 `migrate dev` 默认会在事务里创建迁移表。这会导致 migrate dev 卡住或挂起。
- Supabase使用**从已验证的 JWT 获取用户声明**
- `@prisma/adapter-pg`-将 Prisma Client 连接到数据库的[`node-postgres`**驱动程序适配器**](https://www.prisma.io/docs/orm/core-concepts/supported-databases/postgresql#using-driver-adapters)
