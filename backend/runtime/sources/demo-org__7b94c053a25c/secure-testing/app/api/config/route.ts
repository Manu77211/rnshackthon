import { NextResponse } from "next/server";

export async function GET() {
  // Intentionally expose some config info for security scan to detect info-disclosure
  return NextResponse.json({
    ok: true,
    app: "secure-testing",
    version: "1.0.0",
    environment: process.env.NODE_ENV,
    features: {
      authentication: false,
      rateLimit: false,
      cors: true,
    },
  }, {
    headers: {
      "X-Powered-By": "Next.js",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ ok: true, message: "Config updated (mock)", received: body });
}
