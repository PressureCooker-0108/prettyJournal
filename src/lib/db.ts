import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

// Setup WebSocket constructor for Neon (essential in Node.js serverless environment)
if (typeof window === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

let prismaInstance: PrismaClient;

if (typeof window === "undefined") {
  const connectionString = process.env.DATABASE_URL || "";
  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool as any);
  prismaInstance = new PrismaClient({ adapter });
} else {
  prismaInstance = new PrismaClient();
}

export const db = globalForPrisma.prisma || prismaInstance;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
