import { useLocation } from "wouter";
import { useEffect } from "react";
import { authClient } from "../lib/auth";
import LoginPage from "../pages/login";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!isPending && !session && location !== "/login") {
      navigate("/login");
    }
  }, [isPending, session, location, navigate]);

  if (location === "/login") return <LoginPage />;

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!session) return <LoginPage />;

  return <>{children}</>;
}
