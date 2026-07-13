import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  QrCode,
  Tags,
  Repeat,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { authClient, signOut } from "../lib/auth";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/connect", label: "Conectar WhatsApp", icon: QrCode },
  { href: "/deals", label: "Ofertas", icon: Tags },
  { href: "/manual", label: "Conversor de Link", icon: Repeat },
  { href: "/settings", label: "Configurações", icon: SettingsIcon },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { data: session } = authClient.useSession();

  const status = useQuery({
    queryKey: ["whatsapp-status"],
    queryFn: async () => (await api.whatsapp.status.$get()).json(),
    refetchInterval: 4000,
  });

  const isConnected = status.data?.status === "connected";

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
        <div className="px-5 py-6 border-b border-sidebar-border">
          <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground">
            Promo<span className="text-primary">Zap</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Painel de automação local</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active = location === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "size-2 rounded-full",
                isConnected ? "bg-primary" : "bg-destructive",
                status.data?.status === "waiting_qr" && "bg-chart-3 animate-pulse",
              )}
            />
            <span className="text-muted-foreground">
              {isConnected
                ? `Conectado${status.data?.meNumber ? ` (${status.data.meNumber})` : ""}`
                : status.data?.status === "waiting_qr"
                  ? "Aguardando QR Code"
                  : "WhatsApp desconectado"}
            </span>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-sidebar-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground truncate">{session?.user?.email}</span>
          <button
            onClick={async () => {
              await signOut();
              navigate("/login");
            }}
            className="text-muted-foreground hover:text-foreground"
            title="Sair"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
