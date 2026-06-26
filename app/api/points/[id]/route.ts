import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { pointInputSchema } from "@/lib/types";

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    null
  );
}

function pointSnapshot(point: {
  type: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  address: string | null;
  items: string[];
  days: string[];
  hours: string | null;
  startDate: Date | null;
  endDate: Date | null;
  contact: string | null;
}) {
  return {
    type: point.type,
    name: point.name,
    description: point.description,
    lat: point.lat,
    lng: point.lng,
    address: point.address,
    items: point.items,
    days: point.days,
    hours: point.hours,
    startDate: point.startDate?.toISOString() ?? null,
    endDate: point.endDate?.toISOString() ?? null,
    contact: point.contact,
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // Full edit: public, but every change is stored with edit history.
  if (body.name !== undefined || body.type !== undefined) {
    const editorIp = getClientIp(req);
    if (editorIp) {
      const blocked = await prisma.editIpBlacklist.findUnique({
        where: { ip: editorIp },
        select: { id: true },
      });
      if (blocked) {
        return NextResponse.json(
          { error: "No autorizado para editar este punto." },
          { status: 403 }
        );
      }
    }

    const parsed = pointInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;
    const point = await prisma
      .$transaction(async (tx) => {
        const before = await tx.point.findUnique({ where: { id } });
        if (!before) return null;

        const after = await tx.point.update({
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
        });

        await tx.pointEditHistory.create({
          data: {
            pointId: id,
            editorIp,
            before: pointSnapshot(before),
            after: pointSnapshot(after),
          },
        });

        return after;
      })
      .catch(() => null);

    if (!point) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    return NextResponse.json(point);
  }

  // Status-only update
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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
