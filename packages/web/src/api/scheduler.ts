import { runFetchCycle } from "./deal-engine";

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutos

const globalKey = "__promozap_scheduler__";
const g = globalThis as unknown as Record<string, ReturnType<typeof setInterval> | undefined>;

export function startScheduler() {
  if (g[globalKey]) return;

  g[globalKey] = setInterval(() => {
    runFetchCycle().catch((err) => console.error("[scheduler]", err));
  }, CHECK_INTERVAL_MS);
}
