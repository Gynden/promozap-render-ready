import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { Image as ImageIcon, Send, Wand2, X } from "lucide-react";

export default function ManualPage() {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [converted, setConverted] = useState("");
  const [missingTags, setMissingTags] = useState<string[]>([]);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const convert = useMutation({
    mutationFn: async () => (await api.manual.convert.$post({ json: { text } })).json(),
    onSuccess: (data) => {
      setConverted(data.convertedText);
      setMissingTags(data.missingTags);
    },
  });

  const send = useMutation({
    mutationFn: async () =>
      (
        await api.manual.send.$post({
          json: {
            originalText: text,
            convertedText: converted,
            imageBase64: imageBase64 ?? undefined,
          },
        })
      ).json(),
    onSuccess: (data) => {
      if ((data as any).error) return;
      setText("");
      setConverted("");
      setImageBase64(null);
      queryClient.invalidateQueries({ queryKey: ["manual-history"] });
    },
  });

  const history = useQuery({
    queryKey: ["manual-history"],
    queryFn: async () => (await api.manual.history.$get()).json(),
  });

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageBase64(reader.result as string);
    reader.readAsDataURL(file);
  }

  const sendError = (send.data as any)?.error;

  return (
    <Layout>
      <h2 className="text-2xl font-bold mb-1">Conversor de Link</h2>
      <p className="text-muted-foreground text-sm mb-8">
        Cole o texto da promoção que você viu em outro grupo. O link da loja é trocado
        automaticamente pelo seu link de afiliado antes de postar no seu grupo.
      </p>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg border border-border bg-card p-5">
          <label className="text-xs text-muted-foreground">Texto original</label>
          <textarea
            className="w-full mt-1 bg-secondary border border-input rounded-md px-3 py-2 text-sm h-48 resize-none"
            placeholder="Cole aqui a mensagem da promoção..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className="mt-3 flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <ImageIcon className="size-4" /> {imageBase64 ? "Trocar imagem" : "Anexar print"}
            </Button>
            {imageBase64 && (
              <div className="relative">
                <img src={imageBase64} alt="preview" className="h-10 rounded-md" />
                <button
                  className="absolute -top-1.5 -right-1.5 bg-destructive rounded-full size-4 flex items-center justify-center"
                  onClick={() => setImageBase64(null)}
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
          </div>

          <Button className="mt-4" onClick={() => convert.mutate()} disabled={!text || convert.isPending}>
            <Wand2 className="size-4" />
            {convert.isPending ? "Convertendo..." : "Trocar pelo meu link"}
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <label className="text-xs text-muted-foreground">Prévia (pronto pra enviar)</label>
          <textarea
            className="w-full mt-1 bg-secondary border border-input rounded-md px-3 py-2 text-sm h-48 resize-none font-mono"
            value={converted}
            onChange={(e) => setConverted(e.target.value)}
            placeholder="A prévia aparece aqui depois de converter."
          />

          {missingTags.length > 0 && (
            <p className="text-xs text-chart-3 mt-2">
              Link de {missingTags.join(", ")} detectado, mas sem tag de afiliado configurada em Configurações —
              foi mantido o link original.
            </p>
          )}
          {sendError && <p className="text-xs text-destructive mt-2">{sendError}</p>}

          <Button
            className="mt-4"
            onClick={() => send.mutate()}
            disabled={!converted || send.isPending}
          >
            <Send className="size-4" />
            {send.isPending ? "Enviando..." : "Enviar pro meu grupo"}
          </Button>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-10 mb-4">Histórico</h3>
      <div className="flex flex-col gap-2">
        {history.data?.posts.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum envio ainda.</p>
        )}
        {history.data?.posts.map((post: any) => (
          <div key={post.id} className="rounded-lg border border-border bg-card p-3 text-sm">
            <p className="truncate font-mono text-xs text-muted-foreground">{post.convertedText}</p>
          </div>
        ))}
      </div>
    </Layout>
  );
}
