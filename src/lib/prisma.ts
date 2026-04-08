import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";

/**
 * 创建 Prisma 单例实例，避免开发环境热更新时重复连接数据库。
 */
function prismaClientSingleInstance() {
  const connectionString = `${process.env.DATABASE_URL}`;
  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({ adapter });
}

declare global {
  var prisma: ReturnType<typeof prismaClientSingleInstance> | undefined;
}

export const prisma = globalThis.prisma ?? prismaClientSingleInstance();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
