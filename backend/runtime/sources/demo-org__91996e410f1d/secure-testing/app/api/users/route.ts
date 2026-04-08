import { NextResponse } from "next/server";

const users = [
  { id: 1, name: "Alice Chen", email: "alice@example.com", role: "admin" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", role: "developer" },
  { id: 3, name: "Carol Davis", email: "carol@example.com", role: "viewer" },
  { id: 4, name: "Dan Wilson", email: "dan@example.com", role: "developer" },
  { id: 5, name: "Eve Martinez", email: "eve@example.com", role: "admin" },
];

export async function GET() {
  return NextResponse.json({ ok: true, users });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { name, email, role } = body as { name?: string; email?: string; role?: string };

  if (!name || !email) {
    return NextResponse.json({ ok: false, error: "name and email are required" }, { status: 400 });
  }

  const newUser = { id: users.length + 1, name, email, role: role ?? "viewer" };
  return NextResponse.json({ ok: true, user: newUser }, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { id, name, email } = body as { id?: number; name?: string; email?: string };

  if (!id) {
    return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
  }

  const user = users.find((u) => u.id === id);
  if (!user) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, user: { ...user, name: name ?? user.name, email: email ?? user.email } });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ ok: false, error: "id query parameter is required" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, deleted: Number(id) });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { id, role } = body as { id?: number; role?: string };

  if (!id || !role) {
    return NextResponse.json({ ok: false, error: "id and role are required" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, updated: { id, role } });
}
