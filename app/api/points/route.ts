import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { isAdmin } from "@/lib/auth";
import { pointInputSchema, POINT_TYPES } from "@/lib/types";
import { isInsideVenezuela } from "@/lib/venezuela";
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
    where.OR = [{ endDate: null }, { endDate: { gte: new Date() } }];
  }

  const q = searchParams.get("q")?.trim();
  if (q) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { address: { contains: q, mode: "insensitive" } },
        ],
      },
    ];
  }

  const minLat = parseFloat(searchParams.get("minLat") ?? "");
  const maxLat = parseFloat(searchParams.get("maxLat") ?? "");
  const minLng = parseFloat(searchParams.get("minLng") ?? "");
  const maxLng = parseFloat(searchParams.get("maxLng") ?? "");
  if (![minLat, maxLat, minLng, maxLng].some(Number.isNaN)) {
    where.lat = { gte: minLat, lte: maxLat };
    where.lng = { gte: minLng, lte: maxLng };
  }

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20)
  );
  const shouldPaginate = !!status && admin;

  const [points, total] = await Promise.all([
    prisma.point.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: shouldPaginate ? (page - 1) * pageSize : 0,
      take: shouldPaginate ? pageSize : 2000,
    }),
    shouldPaginate ? prisma.point.count({ where }) : Promise.resolve(0),
  ]);

  if (shouldPaginate) {
    return NextResponse.json({
      points,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  }

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
  if (
    settings.restrictDeliveryToVenezuela &&
    data.type === "DELIVERY" &&
    !isInsideVenezuela(data.lat, data.lng)
  ) {
    return NextResponse.json(
      {
        error:
          "Los puntos de entrega de ayuda sólo pueden crearse dentro de Venezuela.",
        issues: {
          fieldErrors: {
            lat: ["La ubicación debe estar dentro de Venezuela."],
            lng: ["La ubicación debe estar dentro de Venezuela."],
          },
        },
      },
      { status: 400 }
    );
  }

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
      contacts: data.contacts,
      instagram: data.instagram || null,
      temporarilyUnavailable: data.temporarilyUnavailable,
      status: settings.moderationEnabled ? "PENDING" : "APPROVED",
    },
  });

  return NextResponse.json(point, { status: 201 });
}
