import raw from "@config/pricing.json";
import { pricingSchema, type Pricing } from "./schema";

/**
 * Прайс загружается и проверяется схемой zod при импорте: некорректный config/pricing.json
 * ломает сборку, а не показывает клиентам неверные цифры (ТЗ 13.5).
 */
export const pricing: Pricing = pricingSchema.parse(raw);
