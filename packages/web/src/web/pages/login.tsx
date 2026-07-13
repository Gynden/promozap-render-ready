import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { authClient } from "../lib/auth";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Lock, Mail, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const authStatus = useQuery({
    queryKey: ["auth-status"],
    queryFn: async () => (await api["auth-status"].$get()).json(),
  });

  const canSignup = !authStatus.isLoading && !authStatus.data?.hasAccount;
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === "signup") {
        const { error: err } = await authClient.signUp.email({ name, email, password });
        if (err) throw new Error(err.message ?? "Não foi possível criar a conta.");
      } else {
        const { error: err } = await authClient.signIn.email({ email, password });
        if (err) throw new Error(err.message ?? "Email ou senha inválidos.");
      }
      navigate("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Promo<span className="text-primary">Zap</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Painel de automação local</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex mb-6 rounded-md bg-secondary p-1">
            <button
              className={cn(
                "flex-1 text-sm font-medium py-1.5 rounded-md transition-colors",
                tab === "login" ? "bg-card text-foreground" : "text-muted-foreground",
              )}
              onClick={() => setTab("login")}
              type="button"
            >
              Entrar
            </button>
            <button
              className={cn(
                "flex-1 text-sm font-medium py-1.5 rounded-md transition-colors",
                tab === "signup" ? "bg-card text-foreground" : "text-muted-foreground",
                !canSignup && "opacity-40 cursor-not-allowed",
              )}
              onClick={() => canSignup && setTab("signup")}
              type="button"
              disabled={!canSignup}
            >
              Cadastro
            </button>
          </div>

          {tab === "signup" && !canSignup && (
            <p className="text-xs text-chart-3 mb-4">
              Cadastro encerrado — já existe uma conta configurada neste PromoZap. Faça login.
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {tab === "signup" && (
              <div className="relative">
                <User className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="w-full bg-secondary border border-input rounded-md pl-9 pr-3 py-2 text-sm"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="relative">
              <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                className="w-full bg-secondary border border-input rounded-md pl-9 pr-3 py-2 text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="relative">
              <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                className="w-full bg-secondary border border-input rounded-md pl-9 pr-3 py-2 text-sm"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button type="submit" className="mt-2" disabled={loading || (tab === "signup" && !canSignup)}>
              {loading ? "Aguarde..." : tab === "signup" ? "Criar conta" : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
