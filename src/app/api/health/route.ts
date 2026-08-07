import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { redis } from "@/server/cache";

export async function GET() {
  const checks: Record<string, string> = { app: "ok" };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  try {
    if (redis.status !== "ready") {
      await redis.connect().catch(() => undefined);
    }
    const pong = await redis.ping();
    checks.valkey = pong === "PONG" ? "ok" : "error";
  } catch {
    checks.valkey = "error";
  }

  const healthy = checks.database === "ok";
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks },
    { status: healthy ? 200 : 503 },
  );
}
