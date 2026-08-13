import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { maps } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
export const dynamic = "force-dynamic";
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = crypto.randomBytes(8).toString("hex");
  const [updated] = await db.update(maps).set({ shareToken: token }).where(eq(maps.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ token, url: `/shared/${token}` });
}
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const [m] = await db.select().from(maps).where(eq(maps.id, id));
  if (!m) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!m.shareToken) return NextResponse.json({ token: null });
  return NextResponse.json({ token: m.shareToken, url: `/shared/${m.shareToken}` });
}
