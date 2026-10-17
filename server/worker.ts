import { startWorkerLoop } from "./services/analysis-worker";
import { getSupabaseAdminClient } from "./db/supabase-client";

console.log("[Worker Process] Iniciando servicio ejecutor de solicitudes Cleanleaf...");

const adminClient = getSupabaseAdminClient();
if (process.env.SUPABASE_SERVICE_ROLE_KEY || adminClient) {
  console.log("[Worker Process] SUPABASE_SERVICE_ROLE_KEY detectado para ejecuciones de servicio.");
}

const stop = startWorkerLoop(2000);

process.on("SIGTERM", () => {
  console.log("[Worker Process] Recibida señal SIGTERM, deteniendo ejecución...");
  stop();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[Worker Process] Recibida señal SIGINT, deteniendo ejecución...");
  stop();
  process.exit(0);
});
