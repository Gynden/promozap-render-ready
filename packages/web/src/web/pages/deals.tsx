import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { Check, X, RefreshCw, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface Deal {
  id: number;
  provider: string;
  title: string;
  imageUrl: string | null;
  price: number | null;
  originalPrice: number | null;
  discountPct: number | null;
  couponCode: string | null;
  affiliateUrl: string;
  status: string;
  createdAt: string;
}

const STATUS_TABS = [
  { value: "pending", label: "Pendentes" },
  { value: "sent", label: "Enviadas" },
  { value: "rejected", label: "Rejeitadas" },
];

function DealCard({ deal }: { deal: Deal }) {
  const queryClient = useQueryClient();

  const approve = useMutation({
    mutationFn: async () => (await api.deals[":id"].approve.$post({ param: { id: String(deal.id) } })).json(),
    onSuccess: (data) => {
      if ((data as any).error) return;
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });

  const reject = useMutation({
    mutationFn: async () => (await api.deals[":id"].reject.$post({ param: { id: String(deal.id) } })).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deals"] }),
  });

  const error = (approve.data as any)?.error;

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex gap-4">
      {deal.imageUrl ? (
        <img src={deal.imageUrl} alt={deal.title} className="size-20 rounded-md object-cover shrink-0 bg-secondary" />
      ) : (
        <div className="size-20 rounded-md bg-secondary shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{deal.provider}</span>
          {deal.discountPct && (
            <span className="text-xs font-semibold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
              {Math.round(deal.discountPct)}% OFF
            </span>
          )}
          {deal.couponCode && (
            <span className="text-xs font-semibold bg-chart-3/15 text-chart-3 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Tag className="size-3" /> {deal.couponCode}
            </span>
          )}
        </div>
        <p className="font-medium truncate">{deal.title}</p>
        <div className="flex items-baseline gap-2 mt-1 font-mono">
          {deal.originalPrice && deal.price && deal.originalPrice > deal.price && (
            <span className="text-xs text-muted-foreground line-through">
              R$ {deal.originalPrice.toFixed(2)}
            </span>
          )}
          {deal.price && <span className="text-primary font-semibold">R$ {deal.price.toFixed(2)}</span>}
        </div>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>

      {deal.status === "pending" && (
        <div className="flex flex-col gap-2 shrink-0">
          <Button size="sm" onClick={() => approve.mutate()} disabled={approve.isPending || reject.isPending}>
            <Check className="size-4" /> Aprovar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => reject.mutate()}
            disabled={approve.isPending || reject.isPending}
          >
            <X className="size-4" /> Rejeitar
          </Button>
        </div>
      )}
    </div>
  );
}

export default function DealsPage() {
  const [status, setStatus] = useState("pending");
  const queryClient = useQueryClient();

  const deals = useQuery({
    queryKey: ["deals", status],
    queryFn: async () => (await api.deals.$get({ query: { status } })).json(),
  });

  const fetchNow = useMutation({
    mutationFn: async () => (await api.deals.fetch.$post({ json: {} })).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deals"] }),
  });

  return (
    <Layout>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-bold">Ofertas</h2>
        <Button onClick={() => fetchNow.mutate()} disabled={fetchNow.isPending}>
          <RefreshCw className={cn("size-4", fetchNow.isPending && "animate-spin")} />
          {fetchNow.isPending ? "Buscando..." : "Buscar agora"}
        </Button>
      </div>
      <p className="text-muted-foreground text-sm mb-6">
        Ofertas encontradas pelas APIs configuradas, filtradas pelos critérios de cada loja.
      </p>

      {fetchNow.data && (
        <p className="text-sm text-muted-foreground mb-4">
          {(fetchNow.data as any).totalFound} ofertas encontradas · {(fetchNow.data as any).totalAutoSent} enviadas automaticamente
        </p>
      )}

      <div className="flex gap-2 mb-6">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium border",
              status === tab.value
                ? "bg-secondary border-border text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {deals.isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : deals.data?.deals.length === 0 ? (
        <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-8 text-center">
          Nenhuma oferta aqui ainda. Configure os provedores em Configurações e clique em "Buscar agora".
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {deals.data?.deals.map((deal: Deal) => <DealCard key={deal.id} deal={deal} />)}
        </div>
      )}
    </Layout>
  );
}
