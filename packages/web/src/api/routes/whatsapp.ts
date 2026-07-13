import { Hono } from "hono";
import {
  getStatus,
  startConnection,
  logout,
  refreshGroups,
  getCachedGroups,
} from "../whatsapp/service";
import { db } from "../database";
import { settings } from "../database/schema";
import { eq } from "drizzle-orm";

export const whatsapp = new Hono()
  .get("/status", (c) => c.json(getStatus(), 200))
  .post("/connect", async (c) => {
    const status = await startConnection();
    return c.json(status, 200);
  })
  .post("/logout", async (c) => {
    await logout();
    return c.json({ ok: true }, 200);
  })
  .get("/groups", async (c) => {
    const groups = await refreshGroups();
    return c.json({ groups: groups.length ? groups : getCachedGroups() }, 200);
  })
  .get("/target-group", async (c) => {
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "targetGroupId"));
    return c.json({ targetGroupId: row ? JSON.parse(row.value) : null }, 200);
  })
  .post("/target-group", async (c) => {
    const body = await c.req.json<{ groupId: string }>();
    await db
      .insert(settings)
      .values({ key: "targetGroupId", value: JSON.stringify(body.groupId) })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: JSON.stringify(body.groupId) },
      });
    return c.json({ ok: true }, 200);
  });
