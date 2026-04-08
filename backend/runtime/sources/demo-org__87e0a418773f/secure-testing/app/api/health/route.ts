import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    checks: {
      server: "ok",
      memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    },
  });
}
