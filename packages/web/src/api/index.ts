import { Hono } from 'hono';
import { cors } from "hono/cors"
import { auth } from "./auth";
import { authMiddleware, requireAuth } from "./middleware/auth";
import { db } from "./database";
import { user as userTable } from "./database/schema";
import { whatsapp } from "./routes/whatsapp";
import { settingsRoutes } from "./routes/settings";
import { dealsRoutes } from "./routes/deals";
import { manualRoutes } from "./routes/manual";
import { startConnection } from "./whatsapp/service";
import { startScheduler } from "./scheduler";

const app = new Hono()
  .use(cors({ origin: (origin) => origin ?? "*", credentials: true, exposeHeaders: ["set-auth-token"] }))
  // PromoZap é feito pra uso pessoal — depois que a primeira conta é criada,
  // o cadastro fica bloqueado (protege caso o painel seja acessado por
  // outra pessoa na mesma rede).
  .use("/api/auth/sign-up/email", async (c, next) => {
    if (c.req.method !== "POST") return next();
    const [existing] = await db.select().from(userTable).limit(1);
    if (existing) {
      return c.json({ message: "Cadastro encerrado — já existe uma conta configurada." }, 403);
    }
    return next();
  })
  .on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .basePath('api')
  .use("*", authMiddleware)
  .get('/ping', (c) => c.json({ message: `Pong! ${Date.now()}` }, 200))
  .get('/health', (c) => c.json({ status: 'ok' }, 200))
  .get('/auth-status', async (c) => {
    const [existing] = await db.select().from(userTable).limit(1);
    return c.json({ hasAccount: Boolean(existing) }, 200);
  })
  .use("/whatsapp/*", requireAuth)
  .use("/settings/*", requireAuth)
  .use("/deals/*", requireAuth)
  .use("/manual/*", requireAuth)
  .route("/whatsapp", whatsapp)
  .route("/settings", settingsRoutes)
  .route("/deals", dealsRoutes)
  .route("/manual", manualRoutes);

// Tenta restaurar a sessão do WhatsApp automaticamente ao subir o servidor
// (se já houver credenciais salvas de um QR escaneado antes).
startConnection().catch(() => {});
startScheduler();

export type AppType = typeof app;
export default app;
