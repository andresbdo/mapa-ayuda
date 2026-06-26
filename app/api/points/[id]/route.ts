import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { pointInputSchema } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // Full edit: the payload carries point fields
  if (body.name !== undefined || body.type !== undefined) {
    const parsed = pointInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;
    const point = await prisma.point
      .update({
        where: { id },
        data: {
          type: d.type,
          name: d.name,
          description: d.description || null,
          lat: d.lat,
          lng: d.lng,
          address: d.address || null,
          items: d.items,
          days: d.days,
          hours: d.hours || null,
          startDate: d.startDate ? new Date(d.startDate) : null,
          endDate: d.endDate ? new Date(d.endDate) : null,
          contact: d.contact || null,
        },
      })
      .catch(() => null);

    if (!point) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    return NextResponse.json(point);
  }

  // Status-only update
  const status = body.status as string | undefined;
  if (!status || !["PENDING", "APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "status inválido" }, { status: 400 });
  }

  const point = await prisma.point
    .update({
      where: { id },
      data: { status: status as "PENDING" | "APPROVED" | "REJECTED" },
    })
    .catch(() => null);

  if (!point) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json(point);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await prisma.point.delete({ where: { id } }).catch(() => null);

  if (!deleted) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
