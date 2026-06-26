import { NextRequest, NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  token: z.string().trim().min(8).max(200),
});

export async function GET() {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const tokens = await prisma.adminToken.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, token: true, createdAt: true },
  });
  return NextResponse.json({ tokens });
}

export async function POST(req: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Inválido" }, { status: 400 });
  }
  const existing = await prisma.adminToken.findUnique({
    where: { token: parsed.data.token },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Ese token ya existe" }, { status: 409 });
  }
  const adminToken = await prisma.adminToken.create({ data: parsed.data });
  return NextResponse.json({ adminToken }, { status: 201 });
}
