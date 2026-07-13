import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { RefreshCw, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProviderRow {
  provider: string;
  name: string;
  color: string;
  enabled: boolean;
  mode: "manual" | "automatic";
  affiliateTag: string;
  hasCredentials: boolean;
  credentialKeys: string[];
  minDiscountPct: number;
  requireCoupon: boolean;
  belowAveragePrice: boolean;
  categories: string[];
}

const CREDENTIAL_FIELDS: Record<string, { key: string; label: string }[]> = {
  mercadolivre: [
    {
      key: "cookie",
      label: "Cookie da sessão (afiliados.mercadolivre.com.br) — opcional, gera link curto oficial",
    },
  ],
  amazon: [
    { key: "accessKey", label: "Access Key" },
    { key: "secretKey", label: "Secret Key" },
    { key: "partnerTag", label: "Partner Tag (Associates)" },
  ],
  shopee: [
    { key: "appId", label: "App ID" },
    { key: "appSecret", label: "App Secret" },
  ],
};

// Campos exibidos no painel de status de credenciais (checklist rápido).
const STATUS_FIELDS: Record<string, { key: string; label: string; type: "tag" | "credential" }[]> = {
  mercadolivre: [
    { key: "affiliateTag", label: "Tag", type: "tag" },
    { key: "cookie", label: "Cookie", type: "credential" },
  ],
  amazon: [
    { key: "partnerTag", label: "Partner Tag", type: "credential" },
    { key: "accessKey", label: "Access Key", type: "credential" },
    { key: "secretKey", label: "Secret Key", type: "credential" },
  ],
  shopee: [
    { key: "appId", label: "App ID", type: "credential" },
    { key: "appSecret", label: "App Secret", type: "credential" },
  ],
  magalu: [{ key: "affiliateTag", label: "Tag", type: "tag" }],
};

function CredentialsStatusPanel({ providers }: { providers: ProviderRow[] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 mb-8">
      <h3 className="font-semibold mb-1">Status das credenciais</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Checklist rápido do que já está configurado em cada loja.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {providers.map((row) => {
          const fields = STATUS_FIELDS[row.provider] ?? [];
          return (
            <div key={row.provider} className="rounded-md border border-border bg-secondary/40 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                <span className="text-sm font-medium">{row.name}</span>
              </div>
              <div className="flex flex-col gap-1">
                {fields.map((f) => {
                  const ok =
                    f.type === "tag" ? Boolean(row.affiliateTag) : row.credentialKeys.includes(f.key);
                  return (
                    <div key={f.key} className="flex items-center gap-1.5 text-xs">
                      <span className={ok ? "text-primary" : "text-muted-foreground"}>
                        {ok ? "✓" : "—"}
                      </span>
                      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{f.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProviderCard({ row }: { row: ProviderRow }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(row);
  const [creds, setCreds] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        enabled: form.enabled,
        mode: form.mode,
        affiliateTag: form.affiliateTag,
        minDiscountPct: Number(form.minDiscountPct),
        requireCoupon: form.requireCoupon,
        belowAveragePrice: form.belowAveragePrice,
        categories: form.categories,
      };
      const fields = CREDENTIAL_FIELDS[row.provider];
      if (fields && fields.some((f) => creds[f.key])) {
        payload.credentials = creds;
      }
      return (
        await api.settings.providers[":provider"].$put({
          param: { provider: row.provider },
          json: payload,
        })
      ).json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["provider-settings"] }),
  });

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className="size-3 rounded-full"
            style={{ backgroundColor: row.color }}
          />
          <h3 className="font-semibold">{row.name}</h3>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          Ativo
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs text-muted-foreground">Modo de envio</label>
          <select
            className="w-full mt-1 bg-secondary border border-input rounded-md px-3 py-2 text-sm"
            value={form.mode}
            onChange={(e) => setForm({ ...form, mode: e.target.value as "manual" | "automatic" })}
          >
            <option value="manual">Manual (revisar antes de enviar)</option>
            <option value="automatic">Automático (envia direto)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Seu link/tag de afiliado</label>
          <input
            className="w-full mt-1 bg-secondary border border-input rounded-md px-3 py-2 text-sm font-mono"
            placeholder="ex: seunome-20"
            value={form.affiliateTag ?? ""}
            onChange={(e) => setForm({ ...form, affiliateTag: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="text-xs text-muted-foreground">Desconto mínimo (%)</label>
          <input
            type="number"
            className="w-full mt-1 bg-secondary border border-input rounded-md px-3 py-2 text-sm font-mono"
            value={form.minDiscountPct}
            onChange={(e) => setForm({ ...form, minDiscountPct: Number(e.target.value) })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm self-end pb-2">
          <input
            type="checkbox"
            checked={form.requireCoupon}
            onChange={(e) => setForm({ ...form, requireCoupon: e.target.checked })}
          />
          Só com cupom
        </label>
        <label className="flex items-center gap-2 text-sm self-end pb-2">
          <input
            type="checkbox"
            checked={form.belowAveragePrice}
            onChange={(e) => setForm({ ...form, belowAveragePrice: e.target.checked })}
          />
          Abaixo da média
        </label>
      </div>

      <div className="mb-4">
        <label className="text-xs text-muted-foreground">Categorias/palavras-chave (separadas por vírgula)</label>
        <input
          className="w-full mt-1 bg-secondary border border-input rounded-md px-3 py-2 text-sm"
          placeholder="ex: eletrônicos, celular, casa"
          value={form.categories.join(", ")}
          onChange={(e) =>
            setForm({
              ...form,
              categories: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
            })
          }
        />
      </div>

      {CREDENTIAL_FIELDS[row.provider] && (
        <div className="mb-4 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground mb-2">
            Credenciais da API {row.hasCredentials && <span className="text-primary">(já configuradas)</span>}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {CREDENTIAL_FIELDS[row.provider].map((f) => (
              <input
                key={f.key}
                type="password"
                placeholder={f.label}
                className="bg-secondary border border-input rounded-md px-3 py-2 text-sm font-mono"
                onChange={(e) => setCreds({ ...creds, [f.key]: e.target.value })}
              />
            ))}
          </div>
        </div>
      )}

      <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
        <Save className="size-4" />
        {save.isPending ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );
}

function GroupSelector() {
  const queryClient = useQueryClient();
  const groups = useQuery({
    queryKey: ["whatsapp-groups"],
    queryFn: async () => (await api.whatsapp.groups.$get()).json(),
  });
  const targetGroup = useQuery({
    queryKey: ["target-group"],
    queryFn: async () => (await api.whatsapp["target-group"].$get()).json(),
  });
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    if (targetGroup.data?.targetGroupId) setSelected(targetGroup.data.targetGroupId);
  }, [targetGroup.data?.targetGroupId]);

  const save = useMutation({
    mutationFn: async (groupId: string) =>
      (await api.whatsapp["target-group"].$post({ json: { groupId } })).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["target-group"] }),
  });

  return (
    <div className="rounded-lg border border-border bg-card p-5 mb-8">
      <h3 className="font-semibold mb-1">Grupo de destino</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Grupo do seu WhatsApp onde as promoções serão postadas.
      </p>
      <div className="flex gap-3">
        <select
          className="flex-1 bg-secondary border border-input rounded-md px-3 py-2 text-sm"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Selecione um grupo...</option>
          {groups.data?.groups.map((g: { id: string; name: string }) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => groups.refetch()}
          disabled={groups.isFetching}
        >
          <RefreshCw className={cn("size-4", groups.isFetching && "animate-spin")} />
        </Button>
        <Button onClick={() => selected && save.mutate(selected)} disabled={!selected || save.isPending}>
          Salvar
        </Button>
      </div>
      {groups.data?.groups.length === 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Nenhum grupo encontrado — conecte o WhatsApp primeiro.
        </p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const providers = useQuery({
    queryKey: ["provider-settings"],
    queryFn: async () => (await api.settings.providers.$get()).json(),
  });

  return (
    <Layout>
      <h2 className="text-2xl font-bold mb-1">Configurações</h2>
      <p className="text-muted-foreground text-sm mb-8">
        Grupo de destino, tags de afiliado, credenciais de API e filtros por loja.
      </p>

      <GroupSelector />

      {!providers.isLoading && providers.data?.providers && (
        <CredentialsStatusPanel providers={providers.data.providers as ProviderRow[]} />
      )}

      {providers.isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {providers.data?.providers.map((row: ProviderRow) => (
            <ProviderCard key={row.provider} row={row} />
          ))}
        </div>
      )}
    </Layout>
  );
}
