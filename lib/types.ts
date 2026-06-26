import { z } from "zod";

export const POINT_TYPES = ["COLLECTION", "DELIVERY"] as const;
export type PointType = (typeof POINT_TYPES)[number];

export const DAYS = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] as const;

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
  .optional()
  .or(z.literal(""));

export const pointInputSchema = z
  .object({
    type: z.enum(POINT_TYPES),
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(1000).optional().or(z.literal("")),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().trim().max(300).optional().or(z.literal("")),
    items: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
    days: z.array(z.enum(DAYS)).max(7).default([]),
    hours: z.string().trim().max(60).optional().or(z.literal("")),
    startDate: dateString,
    endDate: dateString,
    contact: z.string().trim().max(120).optional().or(z.literal("")),
  })
  .refine(
    (d) => !d.startDate || !d.endDate || d.endDate >= d.startDate,
    { message: "La fecha de fin no puede ser anterior a la de inicio", path: ["endDate"] }
  );

export type PointInput = z.infer<typeof pointInputSchema>;

export const TYPE_LABELS: Record<PointType, string> = {
  COLLECTION: "Centro de acopio",
  DELIVERY: "Entrega de ayuda",
};
