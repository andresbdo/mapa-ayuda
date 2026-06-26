import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const reports = await prisma.pointReport.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      point: {
        select: { id: true, name: true, type: true, address: true },
      },
    },
  });

  return NextResponse.json(reports);
}
