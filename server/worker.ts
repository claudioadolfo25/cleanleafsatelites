import { startWorkerLoop } from "./services/analysis-worker";

console.log("[Worker Process] Iniciando servicio ejecutor de solicitudes Cleanleaf...");

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
