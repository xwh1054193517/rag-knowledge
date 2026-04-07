import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
// 创建一个单例的 Prisma 客户端实例
const prismaClientSingleInstance = () => {
  const connectionString = `${process.env.DATABASE_URL}`;
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
};

declare global {
  var prisma: ReturnType<typeof prismaClientSingleInstance> | undefined;
}

export const prisma = globalThis.prisma ?? prismaClientSingleInstance();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
