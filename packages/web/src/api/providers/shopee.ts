import { createHash } from "node:crypto";
import type { FetchedDeal, ProviderConfig } from "./types";

interface ShopeeCredentials {
  appId: string;
  appSecret: string;
}

const ENDPOINT = "https://open-api.affiliate.shopee.com.br/graphql";

function buildSignature(appId: string, appSecret: string, timestamp: number, payload: string) {
  const base = `${appId}${timestamp}${payload}${appSecret}`;
  return createHash("sha256").update(base, "utf8").digest("hex");
}

/**
 * Busca ofertas via Shopee Affiliate Open API (GraphQL, com assinatura
 * SHA256). Exige App ID + App Secret do programa de afiliados Shopee. Se as
 * credenciais não estiverem configuradas, retorna lista vazia.
 */
export async function fetchShopeeDeals(config: ProviderConfig): Promise<FetchedDeal[]> {
  const creds = safeParseCredentials(config.credentialsJson);
  if (!creds) return [];

  const categories = safeParseCategories(config.categories);
  const keyword = categories[0] ?? "";

  const query = `
    query offerList($keyword: String) {
      productOfferV2(keyword: $keyword, listType: 1, sortType: 2, limit: 30) {
        nodes {
          itemId
          productName
          imageUrl
          price
          priceMin
          priceMax
          offerLink
          productCatIds
        }
      }
    }
  `;

  const payload = JSON.stringify({ query, variables: { keyword } });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = buildSignature(creds.appId, creds.appSecret, timestamp, payload);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `SHA256 Credential=${creds.appId}, Signature=${signature}, Timestamp=${timestamp}`,
      },
      body: payload,
    });

    if (!res.ok) return [];
    const data = await res.json();
    const nodes = data?.data?.productOfferV2?.nodes ?? [];

    const deals: FetchedDeal[] = [];
    for (const node of nodes) {
      const price = Number(node.price ?? node.priceMin);
      const originalPrice = Number(node.priceMax ?? node.price);
      if (!price || !originalPrice || originalPrice <= price) continue;

      const discountPct = ((originalPrice - price) / originalPrice) * 100;
      if (discountPct < config.minDiscountPct) continue;

      deals.push({
        provider: "shopee",
        externalId: String(node.itemId),
        title: node.productName ?? "Produto Shopee",
        description: null,
        imageUrl: node.imageUrl ?? null,
        price,
        originalPrice,
        discountPct: Math.round(discountPct * 10) / 10,
        couponCode: null,
        category: node.productCatIds?.[0] ?? null,
        productUrl: node.offerLink,
      });
    }

    return deals;
  } catch {
    return [];
  }
}

function safeParseCredentials(json: string | null): ShopeeCredentials | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (parsed.appId && parsed.appSecret) return parsed;
    return null;
  } catch {
    return null;
  }
}

function safeParseCategories(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}
