import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const blacklistInput = z.object({
  ip: z.string().trim().min(3).max(120),
  reason: z.string().trim().max(300).optional().or(z.literal("")),
});

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const entries = await prisma.editIpBlacklist.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = blacklistInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const entry = await prisma.editIpBlacklist.upsert({
    where: { ip: parsed.data.ip },
    update: { reason: parsed.data.reason || null },
    create: {
      ip: parsed.data.ip,
      reason: parsed.data.reason || null,
    },
  });
  return NextResponse.json(entry);
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const ip = req.nextUrl.searchParams.get("ip");
  if (!ip) {
    return NextResponse.json({ error: "Falta ip" }, { status: 400 });
  }

  await prisma.editIpBlacklist.delete({ where: { ip } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
