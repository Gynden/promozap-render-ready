import { db } from "./database";
import { deals, providerConfigs, settings } from "./database/schema";
import { eq } from "drizzle-orm";
import {
  PROVIDERS,
  fetchDealsForProvider,
  buildAffiliateUrl,
  type ProviderConfig,
  type ProviderId,
} from "./providers";
import { sendTextMessage, sendImageMessage } from "./whatsapp/service";
import { detectCategoryStyle } from "./providers/category-emoji";

export async function getTargetGroupId(): Promise<string | null> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "targetGroupId"));
  return row ? JSON.parse(row.value) : null;
}

export function toProviderConfig(row: typeof providerConfigs.$inferSelect): ProviderConfig {
  return {
    provider: row.provider as ProviderId,
    enabled: row.enabled,
    mode: row.mode as "manual" | "automatic",
    affiliateTag: row.affiliateTag,
    credentialsJson: row.credentialsJson,
    minDiscountPct: row.minDiscountPct,
    requireCoupon: row.requireCoupon,
    belowAveragePrice: row.belowAveragePrice,
    categories: row.categories,
  };
}

interface DealMessageInput {
  title: string;
  description: string | null;
  category: string | null;
  price: number | null;
  originalPrice: number | null;
  couponCode: string | null;
}

function formatPrice(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Segue o padrão usado nos grupos de ofertas:
 * #SELEÇÃO CATEGORIA
 *
 * emoji TÍTULO
 *
 * descrição curta
 *
 * 🐾 De: R$ X
 * 🐾 Por: R$ Y
 *
 * 🛒 Compre aqui:
 * link
 *
 * 🔄 Preço e condições sujeitos à alteração a qualquer momento.
 */
export function formatDealMessage(deal: DealMessageInput, affiliateUrl: string) {
  const { emoji, hashtag } = detectCategoryStyle(deal.title, deal.category);
  const lines = [`#SELEÇÃO ${hashtag}`, "", `${emoji} ${deal.title}`, ""];

  if (deal.description) {
    lines.push(deal.description, "");
  }

  if (deal.price != null) {
    if (deal.originalPrice && deal.originalPrice > deal.price) {
      lines.push(`🐾 De: R$ ${formatPrice(deal.originalPrice)}`);
    }
    lines.push(`🐾 Por: R$ ${formatPrice(deal.price)}`);
    lines.push("");
  }

  if (deal.couponCode) {
    lines.push(`🎟️ Cupom: ${deal.couponCode}`, "");
  }

  lines.push("🛒 Compre aqui:", affiliateUrl, "");
  lines.push("🔄 Preço e condições sujeitos à alteração a qualquer momento.");

  return lines.join("\n");
}

/**
 * Baixa a imagem do produto (com um User-Agent de navegador, já que várias
 * lojas bloqueiam requisições sem esse header) e retorna o buffer, ou null
 * se não conseguir.
 */
async function downloadImage(imageUrl: string): Promise<Buffer | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

/**
 * Envia a oferta pro grupo já com a imagem do produto carregada (não como
 * link com preview — a imagem vai anexada na própria mensagem). Se não
 * conseguir baixar a imagem, cai para mensagem de texto simples.
 */
export async function sendDealMessage(
  targetGroupId: string,
  deal: DealMessageInput & { imageUrl: string | null },
  affiliateUrl: string,
) {
  const caption = formatDealMessage(deal, affiliateUrl);

  const imageBuffer = deal.imageUrl ? await downloadImage(deal.imageUrl) : null;

  if (imageBuffer) {
    await sendImageMessage(targetGroupId, imageBuffer, caption);
  } else {
    await sendTextMessage(targetGroupId, caption);
  }
}

export async function runFetchCycle(onlyProvider?: ProviderId) {
  const configRows = await db.select().from(providerConfigs);
  const byId = new Map(configRows.map((r) => [r.provider, r]));
  const targetGroupId = await getTargetGroupId();

  const targets = onlyProvider
    ? PROVIDERS.filter((p) => p.id === onlyProvider)
    : PROVIDERS;

  let totalFound = 0;
  let totalAutoSent = 0;

  for (const meta of targets) {
    const configRow = byId.get(meta.id);
    if (!configRow || !configRow.enabled) continue;

    const config = toProviderConfig(configRow);
    const found = await fetchDealsForProvider(config);

    for (const deal of found) {
      const affiliateUrl = await buildAffiliateUrl(deal.productUrl, config);

      const [inserted] = await db
        .insert(deals)
        .values({
          provider: deal.provider,
          externalId: deal.externalId,
          title: deal.title,
          description: deal.description,
          imageUrl: deal.imageUrl,
          price: deal.price,
          originalPrice: deal.originalPrice,
          discountPct: deal.discountPct,
          couponCode: deal.couponCode,
          category: deal.category,
          productUrl: deal.productUrl,
          affiliateUrl,
          status: "pending",
        })
        .returning();

      totalFound += 1;

      if (config.mode === "automatic" && targetGroupId && inserted) {
        try {
          await sendDealMessage(targetGroupId, deal, affiliateUrl);
          await db
            .update(deals)
            .set({ status: "sent", sentAt: new Date() })
            .where(eq(deals.id, inserted.id));
          totalAutoSent += 1;
        } catch {
          // WhatsApp desconectado — oferta fica pendente pra revisão manual
        }
      }
    }
  }

  return { totalFound, totalAutoSent };
}
