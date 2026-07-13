import { useQuery } from "@tanstack/react-query";
import { Layout } from "../components/layout";
import { api } from "../lib/api";
import { Link } from "wouter";
import { QrCode, Tags, Repeat } from "lucide-react";

export default function DashboardPage() {
  const status = useQuery({
    queryKey: ["whatsapp-status"],
    queryFn: async () => (await api.whatsapp.status.$get()).json(),
    refetchInterval: 4000,
  });

  const pendingDeals = useQuery({
    queryKey: ["deals", "pending"],
    queryFn: async () => (await api.deals.$get({ query: { status: "pending" } })).json(),
  });

  const sentDeals = useQuery({
    queryKey: ["deals", "sent"],
    queryFn: async () => (await api.deals.$get({ query: { status: "sent" } })).json(),
  });

  const isConnected = status.data?.status === "connected";

  return (
    <Layout>
      <h2 className="text-2xl font-bold mb-1">Dashboard</h2>
      <p className="text-muted-foreground text-sm mb-8">Visão geral do seu painel de promoções.</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Status WhatsApp</p>
          <p className={`text-xl font-bold ${isConnected ? "text-primary" : "text-destructive"}`}>
            {isConnected ? "Conectado" : "Desconectado"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Ofertas pendentes</p>
          <p className="text-xl font-bold font-mono">{pendingDeals.data?.deals.length ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Ofertas enviadas</p>
          <p className="text-xl font-bold font-mono">{sentDeals.data?.deals.length ?? "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Link
          to="/connect"
          className="rounded-lg border border-border bg-card p-5 hover:border-primary/50 transition-colors"
        >
          <QrCode className="size-5 text-primary mb-2" />
          <p className="font-semibold text-sm">Conectar WhatsApp</p>
          <p className="text-xs text-muted-foreground mt-1">Escaneie o QR Code para ativar o envio.</p>
        </Link>
        <Link
          to="/deals"
          className="rounded-lg border border-border bg-card p-5 hover:border-primary/50 transition-colors"
        >
          <Tags className="size-5 text-primary mb-2" />
          <p className="font-semibold text-sm">Revisar ofertas</p>
          <p className="text-xs text-muted-foreground mt-1">Aprove ou rejeite promoções encontradas.</p>
        </Link>
        <Link
          to="/manual"
          className="rounded-lg border border-border bg-card p-5 hover:border-primary/50 transition-colors"
        >
          <Repeat className="size-5 text-primary mb-2" />
          <p className="font-semibold text-sm">Converter link</p>
          <p className="text-xs text-muted-foreground mt-1">Cole uma promoção de outro grupo e poste no seu.</p>
        </Link>
      </div>
    </Layout>
  );
}
