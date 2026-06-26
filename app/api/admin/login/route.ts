import { NextRequest, NextResponse } from "next/server";
import { getAdminToken, COOKIE_NAME, isAdmin } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({ admin: await isAdmin() });
}

export async function POST(req: NextRequest) {
  const token = getAdminToken();
  if (!token) {
    return NextResponse.json(
      { error: "ADMIN_TOKEN no configurado en el servidor" },
      { status: 500 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { token?: string };
  if (body.token !== token) {
    return NextResponse.json({ error: "Token incorrecto" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
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
