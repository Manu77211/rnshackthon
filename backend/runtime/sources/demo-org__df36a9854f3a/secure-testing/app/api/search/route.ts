import { NextResponse } from "next/server";

const data = [
  { id: 1, title: "SecDev Pro", type: "product" },
  { id: 2, title: "Alice Chen", type: "user" },
  { id: 3, title: "Sandbox Credits", type: "product" },
  { id: 4, title: "Bob Smith", type: "user" },
  { id: 5, title: "CI/CD Pipeline", type: "product" },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  if (!q) {
    return NextResponse.json({ ok: true, results: [], query: "" });
  }

  const results = data.filter((d) =>
    d.title.toLowerCase().includes(q.toLowerCase())
  );

  return NextResponse.json({ ok: true, results, query: q });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { query } = body as { query?: string };

  if (!query) {
    return NextResponse.json({ ok: false, error: "query is required" }, { status: 400 });
  }

  const results = data.filter((d) =>
    d.title.toLowerCase().includes(query.toLowerCase())
  );

  return NextResponse.json({ ok: true, results, query });
}
