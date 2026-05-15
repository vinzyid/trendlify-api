import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function addPoolParams(url: string): string {
  if (!url) return url;
  const sep = url.includes("?") ? "&" : "?";
  const params: string[] = [];
  if (!url.includes("pgbouncer")) params.push("pgbouncer=true");
  if (!url.includes("connection_limit")) params.push("connection_limit=1");
  return params.length ? `${url}${sep}${params.join("&")}` : url;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["warn", "error"],
    datasources: {
      db: { url: addPoolParams(process.env.DATABASE_URL ?? "") },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
