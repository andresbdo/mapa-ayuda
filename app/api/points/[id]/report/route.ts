import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const reportSchema = z.object({
  text: z.string().trim().min(5, "Mínimo 5 caracteres").max(1000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  const point = await prisma.point.findUnique({ where: { id }, select: { id: true } });
  if (!point) {
    return NextResponse.json({ error: "Punto no encontrado" }, { status: 404 });
  }

  await prisma.pointReport.create({
    data: { pointId: id, text: parsed.data.text },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
