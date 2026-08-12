import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { maps, points } from "@/db/schema";
import { eq } from "drizzle-orm";
export const dynamic="force-dynamic";
export async function GET(_req:NextRequest, ctx:{params:Promise<{token:string}>}){
  const {token}=await ctx.params;
  const [m]=await db.select().from(maps).where(eq(maps.shareToken, token));
  if(!m) return NextResponse.json({error:"Nicht gefunden"}, {status:404});
  const pts=await db.select().from(points).where(eq(points.mapId, m.id));
  return NextResponse.json({map:m, points:pts});
}
