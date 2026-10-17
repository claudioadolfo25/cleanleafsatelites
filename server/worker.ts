import { getSupabaseAdminClient } from "./admin/supabase-client";
import { startWorkerLoop } from "./services/analysis-worker";

console.log("[Worker Process] Iniciando servicio ejecutor de solicitudes Cleanleaf...");

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[Worker Process] Error FATAL: SUPABASE_SERVICE_ROLE_KEY no configurada.");
  throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required to start analysis worker.");
}

// Inicializar y validar cliente service role al arrancar
getSupabaseAdminClient();

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
