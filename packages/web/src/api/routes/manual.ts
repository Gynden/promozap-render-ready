import { Hono } from "hono";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { db } from "../database";
import { manualPosts, providerConfigs } from "../database/schema";
import { desc } from "drizzle-orm";
import { detectLinksInText, buildAffiliateUrl, type ProviderId } from "../providers";
import { sendTextMessage, sendImageMessage } from "../whatsapp/service";
import { getTargetGroupId, toProviderConfig } from "../deal-engine";

const UPLOADS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../.data/uploads",
);

async function getProviderConfigMap() {
  const rows = await db.select().from(providerConfigs);
  const map = new Map<ProviderId, ReturnType<typeof toProviderConfig>>();
  for (const row of rows) map.set(row.provider as ProviderId, toProviderConfig(row));
  return map;
}

export const manualRoutes = new Hono()
  .get("/history", async (c) => {
    const rows = await db
      .select()
      .from(manualPosts)
      .orderBy(desc(manualPosts.createdAt))
      .limit(50);
    return c.json({ posts: rows }, 200);
  })
  .post("/convert", async (c) => {
    const body = await c.req.json<{ text: string }>();
    const configMap = await getProviderConfigMap();
    const detected = detectLinksInText(body.text);

    let convertedText = body.text;
    const providersFound = new Set<ProviderId>();
    const missingTags: ProviderId[] = [];

    for (const { url, provider } of detected) {
      providersFound.add(provider);
      const config = configMap.get(provider);
      const hasCredential = config && (config.affiliateTag || config.credentialsJson);

      if (!hasCredential) {
        if (!missingTags.includes(provider)) missingTags.push(provider);
        continue;
      }

      const newUrl = await buildAffiliateUrl(url, config);
      convertedText = convertedText.split(url).join(newUrl);
    }

    return c.json(
      {
        convertedText,
        providersFound: Array.from(providersFound),
        missingTags,
      },
      200,
    );
  })
  .post("/send", async (c) => {
    const body = await c.req.json<{
      originalText: string;
      convertedText: string;
      detectedProvider?: string;
      imageBase64?: string;
    }>();

    const targetGroupId = await getTargetGroupId();
    if (!targetGroupId) {
      return c.json({ error: "Nenhum grupo de destino selecionado nas configurações" }, 400);
    }

    let imagePath: string | null = null;

    try {
      if (body.imageBase64) {
        await mkdir(UPLOADS_DIR, { recursive: true });
        const matches = body.imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
        const ext = matches?.[1]?.split("/")[1] ?? "jpg";
        const buffer = Buffer.from(matches ? matches[2] : body.imageBase64, "base64");
        const fileName = `${Date.now()}.${ext}`;
        await Bun.write(path.join(UPLOADS_DIR, fileName), buffer);
        imagePath = fileName;

        await sendImageMessage(targetGroupId, buffer, body.convertedText);
      } else {
        await sendTextMessage(targetGroupId, body.convertedText);
      }
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }

    await db.insert(manualPosts).values({
      originalText: body.originalText,
      convertedText: body.convertedText,
      imagePath,
      detectedProvider: body.detectedProvider ?? null,
      status: "sent",
      sentAt: new Date(),
    });

    return c.json({ ok: true }, 200);
  })
  .get("/uploads/:file", async (c) => {
    const file = c.req.param("file");
    const filePath = path.join(UPLOADS_DIR, file);
    const bunFile = Bun.file(filePath);
    if (!(await bunFile.exists())) return c.json({ error: "Não encontrado" }, 404);
    return new Response(bunFile);
  });
