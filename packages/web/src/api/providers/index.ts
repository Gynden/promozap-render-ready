import type { FetchedDeal, ProviderConfig, ProviderId } from "./types";
import { fetchMercadoLivreDeals, buildMercadoLivreAffiliateUrl } from "./mercadolivre";
import { fetchAmazonDeals } from "./amazon";
import { fetchShopeeDeals } from "./shopee";
import { fetchMagaluDeals } from "./magalu";

export * from "./types";
export * from "./link";
export { buildMercadoLivreAffiliateUrl };

export async function fetchDealsForProvider(
  config: ProviderConfig,
): Promise<FetchedDeal[]> {
  switch (config.provider as ProviderId) {
    case "mercadolivre":
      return fetchMercadoLivreDeals(config);
    case "amazon":
      return fetchAmazonDeals(config);
    case "shopee":
      return fetchShopeeDeals(config);
    case "magalu":
      return fetchMagaluDeals(config);
    default:
      return [];
  }
}

/**
 * Constrói a URL de afiliado pra qualquer loja. Mercado Livre tem um
 * caminho especial (cookie de sessão -> link curto real, com fallback pra
 * tag simples). As demais lojas usam a troca de parâmetro na própria URL.
 */
export async function buildAffiliateUrl(
  productUrl: string,
  config: ProviderConfig,
): Promise<string> {
  if (config.provider === "mercadolivre") {
    return buildMercadoLivreAffiliateUrl(productUrl, config);
  }
  if (!config.affiliateTag) return productUrl;
  const { applyAffiliateTag } = await import("./link");
  return applyAffiliateTag(config.provider, productUrl, config.affiliateTag);
}
