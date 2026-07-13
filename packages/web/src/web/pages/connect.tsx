import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { QrCode, LogOut, RefreshCw } from "lucide-react";

export default function ConnectPage() {
  const queryClient = useQueryClient();

  const status = useQuery({
    queryKey: ["whatsapp-status"],
    queryFn: async () => (await api.whatsapp.status.$get()).json(),
    refetchInterval: 3000,
  });

  const connect = useMutation({
    mutationFn: async () => (await api.whatsapp.connect.$post()).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp-status"] }),
  });

  const logout = useMutation({
    mutationFn: async () => (await api.whatsapp.logout.$post()).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp-status"] }),
  });

  const s = status.data;

  return (
    <Layout>
      <h2 className="text-2xl font-bold mb-1">Conectar WhatsApp</h2>
      <p className="text-muted-foreground text-sm mb-8">
        Escaneie o QR Code com o WhatsApp do celular que vai postar as promoções (WhatsApp {'>'} Aparelhos conectados {'>'} Conectar um aparelho).
      </p>

      <div className="max-w-md rounded-lg border border-border bg-card p-8 flex flex-col items-center gap-6">
        {status.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : s?.status === "connected" ? (
          <>
            <div className="size-16 rounded-full bg-primary/15 flex items-center justify-center">
              <QrCode className="size-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold">WhatsApp conectado</p>
              {s.meNumber && (
                <p className="text-sm text-muted-foreground font-mono mt-1">+{s.meNumber}</p>
              )}
            </div>
            <Button variant="outline" onClick={() => logout.mutate()} disabled={logout.isPending}>
              <LogOut className="size-4" />
              {logout.isPending ? "Desconectando..." : "Desconectar"}
            </Button>
          </>
        ) : s?.status === "waiting_qr" && s.qrDataUrl ? (
          <>
            <img src={s.qrDataUrl} alt="QR Code do WhatsApp" className="size-56 rounded-lg bg-white p-2" />
            <p className="text-sm text-muted-foreground text-center">
              Abra o WhatsApp no celular e escaneie este código. Ele atualiza sozinho.
            </p>
          </>
        ) : (
          <>
            <div className="size-16 rounded-full bg-muted flex items-center justify-center">
              <QrCode className="size-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Nenhuma sessão ativa. Clique abaixo para gerar o QR Code.
            </p>
            <Button onClick={() => connect.mutate()} disabled={connect.isPending}>
              <RefreshCw className={connect.isPending ? "size-4 animate-spin" : "size-4"} />
              {connect.isPending ? "Gerando..." : "Gerar QR Code"}
            </Button>
          </>
        )}
      </div>
    </Layout>
  );
}
