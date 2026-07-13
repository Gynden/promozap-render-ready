import { PROVIDERS, type ProviderId } from "./types";

const URL_REGEX = /https?:\/\/[^\s)\]]+/gi;

export interface DetectedLink {
  url: string;
  provider: ProviderId;
}

export function detectLinksInText(text: string): DetectedLink[] {
  const matches = text.match(URL_REGEX) ?? [];
  const found: DetectedLink[] = [];

  for (const raw of matches) {
    const url = raw.replace(/[.,;!?)]+$/g, "");
    const provider = PROVIDERS.find((p) =>
      p.domains.some((d) => url.toLowerCase().includes(d)),
    );
    if (provider) found.push({ url, provider: provider.id });
  }

  return found;
}

/**
 * Aplica a tag/ID de afiliado de cada loja na URL do produto.
 * Amazon segue o formato oficial (?tag=). As demais usam o formato mais comum
 * de link de afiliado da loja — ajuste fino pode ser necessário conforme o
 * gerador de links oficial de cada programa.
 */
export function applyAffiliateTag(
  provider: ProviderId,
  url: string,
  affiliateTag: string,
): string {
  if (!affiliateTag) return url;

  try {
    const u = new URL(url);

    switch (provider) {
      case "amazon":
        u.searchParams.set("tag", affiliateTag);
        return u.toString();
      case "mercadolivre":
        u.searchParams.set("matt_tool", affiliateTag);
        return u.toString();
      case "shopee":
        u.searchParams.set("af_id", affiliateTag);
        return u.toString();
      case "magalu":
        u.searchParams.set("partner_id", affiliateTag);
        return u.toString();
      default:
        return url;
    }
  } catch {
    return url;
  }
}

export function replaceLinksWithAffiliate(
  text: string,
  tagsByProvider: Partial<Record<ProviderId, string>>,
): { text: string; providersFound: ProviderId[] } {
  const detected = detectLinksInText(text);
  let result = text;
  const providersFound = new Set<ProviderId>();

  for (const { url, provider } of detected) {
    const tag = tagsByProvider[provider];
    providersFound.add(provider);
    if (!tag) continue;
    const newUrl = applyAffiliateTag(provider, url, tag);
    result = result.split(url).join(newUrl);
  }

  return { text: result, providersFound: Array.from(providersFound) };
}
