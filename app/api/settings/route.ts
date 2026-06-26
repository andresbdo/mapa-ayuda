import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { isAdmin } from "@/lib/auth";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const settings = await getSettings();
  return NextResponse.json({
    moderationEnabled: settings.moderationEnabled,
    restrictDeliveryToVenezuela: settings.restrictDeliveryToVenezuela,
  });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    moderationEnabled?: boolean;
    restrictDeliveryToVenezuela?: boolean;
  };

  if (
    typeof body.moderationEnabled !== "boolean" ||
    typeof body.restrictDeliveryToVenezuela !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Configuración inválida" },
      { status: 400 }
    );
  }

  await getSettings();
  const updated = await prisma.settings.update({
    where: { id: "global" },
    data: {
      moderationEnabled: body.moderationEnabled,
      restrictDeliveryToVenezuela: body.restrictDeliveryToVenezuela,
    },
  });

  return NextResponse.json({
    moderationEnabled: updated.moderationEnabled,
    restrictDeliveryToVenezuela: updated.restrictDeliveryToVenezuela,
  });
}
