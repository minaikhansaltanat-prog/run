import { z } from "zod";
import { isValidPhone } from "@/lib/phone";

const attribution = z
  .object({
    utm_source: z.string().max(120),
    utm_medium: z.string().max(120),
    utm_campaign: z.string().max(120),
    utm_content: z.string().max(120),
    utm_term: z.string().max(120),
    referrer: z.string().max(200),
    landing: z.string().max(300),
    page: z.string().max(400),
  })
  .partial();

export const leadSchema = z.object({
  type: z.enum(["short", "gift"]),
  name: z.string().trim().min(2).max(80),
  phone: z.string().max(40).refine(isValidPhone, "phone"),
  method: z.enum(["whatsapp", "telegram", "call"]),
  consent: z.literal(true),
  locale: z.enum(["ru", "kk"]),
  attribution: attribution.optional(),
  /** ловушка для ботов: настоящий пользователь это поле не видит и не заполняет */
  hp: z.string().max(200).optional(),
  /** сколько мс форма была открыта до отправки (слишком быстро = бот) */
  elapsedMs: z.number().int().min(0).max(86_400_000).optional(),
});

export type LeadPayload = z.infer<typeof leadSchema>;
