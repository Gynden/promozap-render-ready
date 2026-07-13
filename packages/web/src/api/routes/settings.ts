import { Hono } from "hono";
import { db } from "../database";
import { providerConfigs } from "../database/schema";
import { eq } from "drizzle-orm";
import { PROVIDERS, type ProviderId } from "../providers";

const VALID_IDS = PROVIDERS.map((p) => p.id);

export const settingsRoutes = new Hono()
  .get("/providers", async (c) => {
    const rows = await db.select().from(providerConfigs);
    const byId = new Map(rows.map((r) => [r.provider, r]));

    const result = PROVIDERS.map((meta) => {
      const row = byId.get(meta.id);
      let credentialKeys: string[] = [];
      if (row?.credentialsJson) {
        try {
          const parsed = JSON.parse(row.credentialsJson);
          credentialKeys = Object.keys(parsed).filter((k) => Boolean(parsed[k]));
        } catch {
          credentialKeys = [];
        }
      }
      return {
        provider: meta.id,
        name: meta.name,
        color: meta.color,
        enabled: row?.enabled ?? false,
        mode: row?.mode ?? "manual",
        affiliateTag: row?.affiliateTag ?? "",
        hasCredentials: Boolean(row?.credentialsJson),
        credentialKeys,
        minDiscountPct: row?.minDiscountPct ?? 30,
        requireCoupon: row?.requireCoupon ?? false,
        belowAveragePrice: row?.belowAveragePrice ?? false,
        categories: row?.categories ? JSON.parse(row.categories) : [],
      };
    });

    return c.json({ providers: result }, 200);
  })
  .put("/providers/:provider", async (c) => {
    const provider = c.req.param("provider") as ProviderId;
    if (!VALID_IDS.includes(provider)) {
      return c.json({ error: "Provedor inválido" }, 400);
    }

    const body = await c.req.json<{
      enabled?: boolean;
      mode?: "manual" | "automatic";
      affiliateTag?: string;
      credentials?: Record<string, string> | null;
      minDiscountPct?: number;
      requireCoupon?: boolean;
      belowAveragePrice?: boolean;
      categories?: string[];
    }>();

    const [existing] = await db
      .select()
      .from(providerConfigs)
      .where(eq(providerConfigs.provider, provider));

    const values = {
      provider,
      enabled: body.enabled ?? existing?.enabled ?? false,
      mode: body.mode ?? existing?.mode ?? "manual",
      affiliateTag: body.affiliateTag ?? existing?.affiliateTag ?? null,
      credentialsJson:
        body.credentials !== undefined
          ? body.credentials
            ? JSON.stringify(body.credentials)
            : null
          : existing?.credentialsJson ?? null,
      minDiscountPct: body.minDiscountPct ?? existing?.minDiscountPct ?? 30,
      requireCoupon: body.requireCoupon ?? existing?.requireCoupon ?? false,
      belowAveragePrice:
        body.belowAveragePrice ?? existing?.belowAveragePrice ?? false,
      categories: body.categories
        ? JSON.stringify(body.categories)
        : existing?.categories ?? null,
      updatedAt: new Date(),
    };

    await db
      .insert(providerConfigs)
      .values(values)
      .onConflictDoUpdate({ target: providerConfigs.provider, set: values });

    return c.json({ ok: true }, 200);
  });
