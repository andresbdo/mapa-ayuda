import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { isAdmin } from "@/lib/auth";
import { pointInputSchema, POINT_TYPES } from "@/lib/types";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const where: Prisma.PointWhereInput = {};

  const type = searchParams.get("type");
  if (type && POINT_TYPES.includes(type as (typeof POINT_TYPES)[number])) {
    where.type = type as (typeof POINT_TYPES)[number];
  }

  const status = searchParams.get("status");
  const admin = await isAdmin();
  if (status && admin) {
    where.status = status as Prisma.PointWhereInput["status"];
  } else {
    where.status = "APPROVED";
    const startOfToday = new Date(new Date().toISOString().slice(0, 10));
    where.OR = [{ endDate: null }, { endDate: { gte: startOfToday } }];
  }

  const minLat = parseFloat(searchParams.get("minLat") ?? "");
  const maxLat = parseFloat(searchParams.get("maxLat") ?? "");
  const minLng = parseFloat(searchParams.get("minLng") ?? "");
  const maxLng = parseFloat(searchParams.get("maxLng") ?? "");
  if (![minLat, maxLat, minLng, maxLng].some(Number.isNaN)) {
    where.lat = { gte: minLat, lte: maxLat };
    where.lng = { gte: minLng, lte: maxLng };
  }

  const points = await prisma.point.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  return NextResponse.json(points);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = pointInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const settings = await getSettings();
  const data = parsed.data;

  const point = await prisma.point.create({
    data: {
      type: data.type,
      name: data.name,
      description: data.description || null,
      lat: data.lat,
      lng: data.lng,
      address: data.address || null,
      items: data.items,
      days: data.days,
      hours: data.hours || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      contact: data.contact || null,
      status: settings.moderationEnabled ? "PENDING" : "APPROVED",
    },
  });

  return NextResponse.json(point, { status: 201 });
}
