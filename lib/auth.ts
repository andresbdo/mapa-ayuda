import { cookies } from "next/headers";

const COOKIE_NAME = "admin_token";

export function getAdminToken(): string | undefined {
  return process.env.ADMIN_TOKEN;
}

export async function isAdmin(): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === token;
}

export { COOKIE_NAME };
