import { Hono } from "hono";
import { db } from "../database";
import { deals } from "../database/schema";
import { eq, desc } from "drizzle-orm";
import type { ProviderId } from "../providers";
import { runFetchCycle, getTargetGroupId, sendDealMessage } from "../deal-engine";

export const dealsRoutes = new Hono()
  .get("/", async (c) => {
    const status = c.req.query("status");
    const rows = status
      ? await db.select().from(deals).where(eq(deals.status, status)).orderBy(desc(deals.createdAt))
      : await db.select().from(deals).orderBy(desc(deals.createdAt));
    return c.json({ deals: rows }, 200);
  })
  .post("/fetch", async (c) => {
    const body = await c.req.json<{ provider?: ProviderId }>().catch(() => ({}) as { provider?: ProviderId });
    const result = await runFetchCycle(body.provider);
    return c.json(result, 200);
  })
  .post("/:id/approve", async (c) => {
    const id = Number(c.req.param("id"));
    const [deal] = await db.select().from(deals).where(eq(deals.id, id));
    if (!deal) return c.json({ error: "Oferta não encontrada" }, 404);

    const targetGroupId = await getTargetGroupId();
    if (!targetGroupId) {
      return c.json({ error: "Nenhum grupo de destino selecionado nas configurações" }, 400);
    }

    try {
      await sendDealMessage(targetGroupId, deal, deal.affiliateUrl);
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }

    await db
      .update(deals)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(deals.id, id));

    return c.json({ ok: true }, 200);
  })
  .post("/:id/reject", async (c) => {
    const id = Number(c.req.param("id"));
    await db.update(deals).set({ status: "rejected" }).where(eq(deals.id, id));
    return c.json({ ok: true }, 200);
  });
