export type ProviderId = "mercadolivre" | "amazon" | "shopee" | "magalu";

export interface ProviderMeta {
  id: ProviderId;
  name: string;
  color: string;
  domains: string[];
}

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "mercadolivre",
    name: "Mercado Livre",
    color: "#FFE600",
    domains: ["mercadolivre.com.br", "mercadolivre.com", "produto.mercadolivre.com.br"],
  },
  {
    id: "amazon",
    name: "Amazon",
    color: "#FF9900",
    domains: ["amazon.com.br", "amzn.to", "amazon.com"],
  },
  {
    id: "shopee",
    name: "Shopee",
    color: "#EE4D2D",
    domains: ["shopee.com.br", "s.shopee.com.br", "shp.ee"],
  },
  {
    id: "magalu",
    name: "Magalu",
    color: "#0086FF",
    domains: ["magazineluiza.com.br", "magalu.com", "magazinevoce.com.br"],
  },
];

export interface ProviderConfig {
  provider: ProviderId;
  enabled: boolean;
  mode: "manual" | "automatic";
  affiliateTag: string | null;
  credentialsJson: string | null;
  minDiscountPct: number;
  requireCoupon: boolean;
  belowAveragePrice: boolean;
  categories: string | null;
}

export interface FetchedDeal {
  provider: ProviderId;
  externalId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  originalPrice: number | null;
  discountPct: number | null;
  couponCode: string | null;
  category: string | null;
  productUrl: string;
}
