import { prisma } from "./prisma";

export async function getSettings() {
  const existing = await prisma.settings.findUnique({ where: { id: "global" } });
  if (existing) return existing;
  return prisma.settings.create({ data: { id: "global" } });
}
