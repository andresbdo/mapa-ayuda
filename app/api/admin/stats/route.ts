import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isInsideVenezuela } from "@/lib/venezuela";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [allPoints, byType, byStatus] = await Promise.all([
    prisma.point.findMany({ select: { lat: true, lng: true, address: true, createdAt: true } }),
    prisma.point.groupBy({ by: ["type"], _count: { _all: true } }),
    prisma.point.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const total = allPoints.length;

  const typeMap: Record<string, number> = {};
  for (const row of byType) typeMap[row.type] = row._count._all;

  const statusMap: Record<string, number> = {};
  for (const row of byStatus) statusMap[row.status] = row._count._all;

  const countryMap: Record<string, number> = {};
  for (const p of allPoints) {
    let country: string | null = null;
    if (p.address) {
      const last = p.address.split(",").at(-1)?.trim();
      if (last && last.length > 1) country = last;
    }
    if (!country) {
      country = isInsideVenezuela(p.lat, p.lng) ? "Venezuela" : "Sin dirección";
    }
    countryMap[country] = (countryMap[country] ?? 0) + 1;
  }
  const byCountry = Object.fromEntries(
    Object.entries(countryMap).sort((a, b) => b[1] - a[1])
  );

  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const dayMap: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    dayMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const p of allPoints) {
    const day = p.createdAt.toISOString().slice(0, 10);
    if (day in dayMap) dayMap[day]++;
  }
  const recentDays = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

  return NextResponse.json({
    total,
    byType: typeMap,
    byStatus: statusMap,
    byCountry,
    recentDays,
  });
}
