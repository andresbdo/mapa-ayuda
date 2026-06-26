import { NextRequest, NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().optional(),
  token: z.string().trim().min(8).max(200).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Inválido" }, { status: 400 });
  }
  if (parsed.data.token) {
    const existing = await prisma.adminToken.findFirst({
      where: { token: parsed.data.token, NOT: { id } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "Ese token ya existe" }, { status: 409 });
    }
  }
  const adminToken = await prisma.adminToken.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ adminToken });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.adminToken.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
