import type { FetchedDeal, ProviderConfig } from "./types";

/**
 * A Magalu (Magalu Parceiros) não expõe uma API pública de busca de ofertas
 * documentada para afiliados comuns — o programa funciona majoritariamente via
 * gerador de link manual. Por isso a busca automática fica desativada por
 * padrão; o suporte à loja continua funcionando normalmente no conversor
 * manual de links (cola o texto, troca pelo seu link de afiliado).
 */
export async function fetchMagaluDeals(_config: ProviderConfig): Promise<FetchedDeal[]> {
  return [];
}
