import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

import { Pool as PgPool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// Setup WebSocket constructor for Neon (essential in Node.js serverless environment)
if (typeof window === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

let prismaInstance: PrismaClient;

if (typeof window === "undefined") {
  let connectionString = process.env.DATABASE_URL || "";
  if (connectionString && !connectionString.includes("connection_limit=")) {
    const separator = connectionString.includes("?") ? "&" : "?";
    connectionString = `${connectionString}${separator}connection_limit=10`;
  }

  if (connectionString.startsWith("prisma+postgres://")) {
    prismaInstance = new PrismaClient({
      accelerateUrl: connectionString,
    });
  } else if (connectionString.includes("localhost") || connectionString.includes("127.0.0.1")) {
    const pool = new PgPool({ connectionString });
    const adapter = new PrismaPg(pool);
    prismaInstance = new PrismaClient({ adapter });
  } else {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool as any);
    prismaInstance = new PrismaClient({ adapter });
  }
} else {
  prismaInstance = new PrismaClient();
}

export const db = globalForPrisma.prisma || prismaInstance;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
