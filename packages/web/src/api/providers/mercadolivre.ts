import type { FetchedDeal, ProviderConfig } from "./types";

interface MLSearchResult {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  thumbnail: string;
  permalink: string;
  category_id: string;
}

/**
 * Busca ofertas no Mercado Livre usando a API pública de busca (não exige
 * autenticação para consulta de itens). Filtra por desconto mínimo.
 * Observação: a API pública não expõe cupom por item, então se
 * "requireCoupon" estiver ligado, nenhuma oferta passa no filtro
 * automaticamente (fica para revisão manual).
 */
export async function fetchMercadoLivreDeals(
  config: ProviderConfig,
): Promise<FetchedDeal[]> {
  const categories = safeParseCategories(config.categories);
  const queries = categories.length > 0 ? categories : ["ofertas do dia"];

  const deals: FetchedDeal[] = [];

  for (const query of queries) {
    const url = new URL("https://api.mercadolibre.com/sites/MLB/search");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "30");

    const res = await fetch(url.toString());
    if (!res.ok) continue;

    const data = (await res.json()) as { results?: MLSearchResult[] };

    for (const item of data.results ?? []) {
      if (!item.original_price || item.original_price <= item.price) continue;

      const discountPct =
        ((item.original_price - item.price) / item.original_price) * 100;

      if (discountPct < config.minDiscountPct) continue;
      if (config.requireCoupon) continue; // não detectável nesta API pública

      deals.push({
        provider: "mercadolivre",
        externalId: item.id,
        title: item.title,
        description: await fetchDescription(item.id),
        imageUrl: item.thumbnail?.replace("http://", "https://") ?? null,
        price: item.price,
        originalPrice: item.original_price,
        discountPct: Math.round(discountPct * 10) / 10,
        couponCode: null,
        category: item.category_id ?? null,
        productUrl: item.permalink,
      });
    }
  }

  return deals;
}

async function fetchDescription(itemId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.mercadolibre.com/items/${itemId}/description`);
    if (!res.ok) return null;
    const data = (await res.json()) as { plain_text?: string };
    if (!data.plain_text) return null;
    return data.plain_text.slice(0, 220).trim();
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

interface MLCredentials {
  cookie?: string;
}

function safeParseMLCredentials(json: string | null): MLCredentials | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return parsed?.cookie ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Gera o link de afiliado do Mercado Livre.
 *
 * Preferência: se houver um cookie de sessão salvo (copiado do painel de
 * afiliados do ML logado no navegador), tenta gerar o link curto oficial
 * através do link-builder interno usado pelo próprio site de afiliados
 * (afiliados.mercadolivre.com.br) — esse é o formato que garante a
 * comissão corretamente.
 *
 * Se não houver cookie, ou a chamada falhar (cookie expirado, endpoint
 * mudou, etc.), cai para o fallback simples: acrescenta ?matt_tool=SEU_TAG
 * na URL original do produto.
 *
 * Observação: o endpoint abaixo replica o que o painel de afiliados chama
 * internamente. Como não é uma API pública documentada, pode ser necessário
 * ajustar path/payload caso o Mercado Livre mude esse contrato — teste com
 * um cookie real e me avise se vier algum erro pra eu corrigir.
 */
export async function buildMercadoLivreAffiliateUrl(
  productUrl: string,
  config: ProviderConfig,
): Promise<string> {
  const creds = safeParseMLCredentials(config.credentialsJson);

  if (creds?.cookie) {
    try {
      const res = await fetch(
        "https://www.mercadolivre.com.br/affiliate-program/api/proxy/linkbuilder/save",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: creds.cookie,
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          },
          body: JSON.stringify({ url: productUrl }),
        },
      );

      if (res.ok) {
        const data = await res.json();
        const shortUrl = data?.url ?? data?.shortUrl ?? data?.data?.url;
        if (shortUrl) return shortUrl;
      }
    } catch {
      // segue pro fallback abaixo
    }
  }

  if (config.affiliateTag) {
    try {
      const u = new URL(productUrl);
      u.searchParams.set("matt_tool", config.affiliateTag);
      return u.toString();
    } catch {
      return productUrl;
    }
  }

  return productUrl;
}
