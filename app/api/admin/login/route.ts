import { NextRequest, NextResponse } from "next/server";
import { getAdminToken, COOKIE_NAME, isAdmin, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await isAdmin();
  if (!admin) return NextResponse.json({ admin: false, superAdmin: false });
  const superAdmin = await isSuperAdmin();
  return NextResponse.json({ admin: true, superAdmin });
}

export async function POST(req: NextRequest) {
  const superToken = getAdminToken();
  const body = (await req.json().catch(() => ({}))) as { token?: string };
  const submitted = body.token?.trim() ?? "";

  if (!submitted) {
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });
  }

  let valid = false;
  if (superToken && submitted === superToken) {
    valid = true;
  } else {
    const dbToken = await prisma.adminToken.findUnique({
      where: { token: submitted },
      select: { id: true },
    });
    valid = dbToken !== null;
  }

  if (!valid) {
    return NextResponse.json({ error: "Token incorrecto" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, submitted, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME);
  return res;
}
