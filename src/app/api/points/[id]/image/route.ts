import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pointImages, points } from "@/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const imgs = await db.select().from(pointImages).where(eq(pointImages.pointId, id));
  return NextResponse.json({ images: imgs });
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const caption = (form.get("caption") as string) || "";
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "too large" }, { status: 413 });
  const buf = Buffer.from(await file.arrayBuffer());
  const b64 = `data:${file.type || "image/jpeg"};base64,${buf.toString("base64")}`;
  const [created] = await db.insert(pointImages).values({ pointId: id, url: b64, caption }).returning();
  await db.update(points).set({ imageUrl: b64, updatedAt: new Date() }).where(eq(points.id, id));
  return NextResponse.json({ image: created });
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const imageId = req.nextUrl.searchParams.get("imageId");
  if (!imageId) return NextResponse.json({ error: "imageId required" }, { status: 400 });
  await db.delete(pointImages).where(eq(pointImages.id, imageId));
  return NextResponse.json({ ok: true });
}
