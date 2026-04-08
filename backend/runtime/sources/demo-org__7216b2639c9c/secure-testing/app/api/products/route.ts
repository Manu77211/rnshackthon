import { NextResponse } from "next/server";

const products = [
  { id: 1, name: "SecDev Pro", price: 49, category: "platform" },
  { id: 2, name: "Sandbox Credits", price: 0.10, category: "infrastructure" },
  { id: 3, name: "Enterprise Plan", price: 299, category: "platform" },
  { id: 4, name: "CI/CD Pipeline", price: 29, category: "automation" },
  { id: 5, name: "Security Add-on", price: 19, category: "security" },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const filtered = category ? products.filter((p) => p.category === category) : products;
  return NextResponse.json({ ok: true, products: filtered, total: filtered.length });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { name, price, category } = body as { name?: string; price?: number; category?: string };

  if (!name || price === undefined) {
    return NextResponse.json({ ok: false, error: "name and price are required" }, { status: 400 });
  }

  const newProduct = { id: products.length + 1, name, price, category: category ?? "other" };
  return NextResponse.json({ ok: true, product: newProduct }, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { id, name, price } = body as { id?: number; name?: string; price?: number };

  if (!id) {
    return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
  }

  const product = products.find((p) => p.id === id);
  if (!product) {
    return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, product: { ...product, name: name ?? product.name, price: price ?? product.price } });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ ok: false, error: "id query parameter is required" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, deleted: Number(id) });
}
