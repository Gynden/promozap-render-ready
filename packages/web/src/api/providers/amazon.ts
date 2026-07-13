import { createHash, createHmac } from "node:crypto";
import type { FetchedDeal, ProviderConfig } from "./types";

interface AmazonCredentials {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
}

const HOST = "webservices.amazon.com.br";
const REGION = "us-east-1";
const SERVICE = "ProductAdvertisingAPI";
const ENDPOINT = `https://${HOST}/paapi5/searchitems`;

function sign(key: Buffer, msg: string) {
  return createHmac("sha256", key).update(msg, "utf8").digest();
}

function getSignatureKey(secretKey: string, dateStamp: string) {
  const kDate = sign(Buffer.from(`AWS4${secretKey}`, "utf8"), dateStamp);
  const kRegion = sign(kDate, REGION);
  const kService = sign(kRegion, SERVICE);
  return sign(kService, "aws4_request");
}

async function signedRequest(payload: Record<string, unknown>, creds: AmazonCredentials) {
  const body = JSON.stringify(payload);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const target = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems";
  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=utf-8\n` +
    `host:${HOST}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${target}\n`;
  const signedHeaders = "content-encoding;content-type;host;x-amz-date;x-amz-target";
  const payloadHash = createHash("sha256").update(body, "utf8").digest("hex");

  const canonicalRequest = [
    "POST",
    "/paapi5/searchitems",
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    createHash("sha256").update(canonicalRequest, "utf8").digest("hex"),
  ].join("\n");

  const signingKey = getSignatureKey(creds.secretKey, dateStamp);
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${creds.accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-encoding": "amz-1.0",
      "content-type": "application/json; charset=utf-8",
      "x-amz-date": amzDate,
      "x-amz-target": target,
      Authorization: authorization,
    },
    body,
  });
}

/**
 * Busca itens via Amazon Product Advertising API (PA-API v5). Exige conta de
 * associado ativa (mínimo de indicações de venda) e chaves válidas. Se as
 * credenciais não estiverem configuradas, retorna lista vazia.
 */
export async function fetchAmazonDeals(config: ProviderConfig): Promise<FetchedDeal[]> {
  const creds = safeParseCredentials(config.credentialsJson);
  if (!creds) return [];

  const categories = safeParseCategories(config.categories);
  const keywords = categories.length > 0 ? categories : ["promoção"];

  const deals: FetchedDeal[] = [];

  for (const keyword of keywords) {
    try {
      const res = await signedRequest(
        {
          Keywords: keyword,
          PartnerTag: creds.partnerTag,
          PartnerType: "Associates",
          Marketplace: "www.amazon.com.br",
          Resources: [
            "ItemInfo.Title",
            "ItemInfo.Features",
            "Offers.Listings.Price",
            "Offers.Listings.SavingBasis",
            "Images.Primary.Large",
          ],
        },
        creds,
      );

      if (!res.ok) continue;
      const data = await res.json();

      for (const item of data.SearchResult?.Items ?? []) {
        const price = item.Offers?.Listings?.[0]?.Price?.Amount ?? null;
        const originalPrice = item.Offers?.Listings?.[0]?.SavingBasis?.Amount ?? null;
        if (!price || !originalPrice || originalPrice <= price) continue;

        const discountPct = ((originalPrice - price) / originalPrice) * 100;
        if (discountPct < config.minDiscountPct) continue;

        const features: string[] = item.ItemInfo?.Features?.DisplayValues ?? [];

        deals.push({
          provider: "amazon",
          externalId: item.ASIN,
          title: item.ItemInfo?.Title?.DisplayValue ?? "Produto Amazon",
          description: features.length ? features.slice(0, 3).join(". ").slice(0, 220) : null,
          imageUrl: item.Images?.Primary?.Large?.URL ?? null,
          price,
          originalPrice,
          discountPct: Math.round(discountPct * 10) / 10,
          couponCode: null,
          category: null,
          productUrl: item.DetailPageURL,
        });
      }
    } catch {
      // credenciais inválidas ou API indisponível — ignora esta palavra-chave
    }
  }

  return deals;
}

function safeParseCredentials(json: string | null): AmazonCredentials | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (parsed.accessKey && parsed.secretKey && parsed.partnerTag) return parsed;
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
