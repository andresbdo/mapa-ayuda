import { z } from "zod";

export const POINT_TYPES = ["COLLECTION", "DELIVERY"] as const;
export type PointType = (typeof POINT_TYPES)[number];

export const DAYS = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] as const;

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
  .optional()
  .or(z.literal(""));

const dateTimeString = z
  .string()
  .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), {
    message: "Fecha inválida",
  })
  .optional()
  .or(z.literal(""));

const phoneString = z
  .string()
  .trim()
  .refine((value) => !value || /^\+[1-9]\d{7,14}$/.test(value), {
    message: "Usá formato internacional: +584121234567",
  })
  .optional()
  .or(z.literal(""));

const contactPhoneSchema = z.object({
  phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, {
    message: "Usá formato internacional: +584121234567",
  }),
  whatsapp: z.boolean(),
});

const instagramString = z
  .string()
  .trim()
  .transform((value) => value.replace(/^@+/, ""))
  .refine(
    (value) =>
      !value ||
      /^(?!.*\.\.)(?!.*\.$)[A-Za-z0-9][A-Za-z0-9._]{0,29}$/.test(value),
    { message: "Handle de Instagram inválido" }
  )
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
    hours: z.string().trim().max(900).optional().or(z.literal("")),
    startDate: dateString,
    endDate: dateTimeString,
    contact: phoneString,
    contacts: z.array(contactPhoneSchema).max(3, "Máximo 3 celulares").default([]),
    instagram: instagramString,
    temporarilyUnavailable: z.boolean().default(false),
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
