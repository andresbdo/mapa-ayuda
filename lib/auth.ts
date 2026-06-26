import { cookies } from "next/headers";
import { prisma } from "./prisma";

const COOKIE_NAME = "admin_token";

export function getAdminToken(): string | undefined {
  return process.env.ADMIN_TOKEN;
}

export async function isSuperAdmin(): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === token;
}

export async function isAdmin(): Promise<boolean> {
  if (await isSuperAdmin()) return true;
  const store = await cookies();
  const cookieVal = store.get(COOKIE_NAME)?.value;
  if (!cookieVal) return false;
  const dbToken = await prisma.adminToken.findUnique({
    where: { token: cookieVal },
    select: { id: true },
  });
  return dbToken !== null;
}

export { COOKIE_NAME };
