import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export * from "./auth-schema";


/**
 * Configuração geral do app (single-row / key-value simples).
 */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // JSON stringificado
});

/**
 * Credenciais / tags de afiliado por loja (Mercado Livre, Amazon, Shopee, Magalu).
 */
export const providerConfigs = sqliteTable("provider_configs", {
  provider: text("provider").primaryKey(), // mercadolivre | amazon | shopee | magalu
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  mode: text("mode").notNull().default("manual"), // "manual" | "automatic"
  affiliateTag: text("affiliate_tag"), // sua tag/ID de afiliado
  credentialsJson: text("credentials_json"), // chaves de API (JSON), quando aplicável
  minDiscountPct: integer("min_discount_pct").notNull().default(30),
  requireCoupon: integer("require_coupon", { mode: "boolean" }).notNull().default(false),
  belowAveragePrice: integer("below_average_price", { mode: "boolean" }).notNull().default(false),
  categories: text("categories"), // JSON array de categorias/keywords
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/**
 * Ofertas encontradas automaticamente pelas APIs, aguardando ou já processadas.
 */
export const deals = sqliteTable("deals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  provider: text("provider").notNull(),
  externalId: text("external_id"),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  price: real("price"),
  originalPrice: real("original_price"),
  discountPct: real("discount_pct"),
  couponCode: text("coupon_code"),
  category: text("category"),
  productUrl: text("product_url").notNull(),
  affiliateUrl: text("affiliate_url").notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | rejected | sent
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  sentAt: integer("sent_at", { mode: "timestamp" }),
});

/**
 * Histórico de conversões manuais (mensagem colada de outro grupo -> link trocado).
 */
export const manualPosts = sqliteTable("manual_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  originalText: text("original_text").notNull(),
  convertedText: text("converted_text").notNull(),
  imagePath: text("image_path"),
  detectedProvider: text("detected_provider"),
  status: text("status").notNull().default("draft"), // draft | sent
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  sentAt: integer("sent_at", { mode: "timestamp" }),
});
