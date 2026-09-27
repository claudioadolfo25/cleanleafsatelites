export type ProcessingTier = "tier1_predio" | "tier2_extendido" | "tier3_regional";

const DEFAULT_TIER1_MAX_HA = 50;
const DEFAULT_TIER2_MAX_HA = 5000;

function configuredLimit(key: string, fallback: number): number {
  const raw = typeof process !== "undefined" && process?.env ? process.env[key] : undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getTierLimits() {
  const tier1MaxHa = configuredLimit("CLEANLEAF_TIER1_MAX_HA", DEFAULT_TIER1_MAX_HA);
  const configuredTier2 = configuredLimit("CLEANLEAF_TIER2_MAX_HA", DEFAULT_TIER2_MAX_HA);
  return {
    tier1MaxHa,
    tier2MaxHa: Math.max(configuredTier2, tier1MaxHa + 0.01),
  };
}

export function getTierForSuperficie(hectares: number): ProcessingTier {
  if (!Number.isFinite(hectares) || hectares < 0.5) {
    throw new Error("La superficie debe ser un número válido de al menos 0,5 ha.");
  }
  const { tier1MaxHa, tier2MaxHa } = getTierLimits();
  if (hectares <= tier1MaxHa) return "tier1_predio";
  if (hectares <= tier2MaxHa) return "tier2_extendido";
  return "tier3_regional";
}

export function processingModeForTier(tier: ProcessingTier): "processing_api" | "statistical_api" | "batch_api" {
  const modes: Record<ProcessingTier, "processing_api" | "statistical_api" | "batch_api"> = {
    tier1_predio: "processing_api",
    tier2_extendido: "statistical_api",
    tier3_regional: "batch_api",
  };
  return modes[tier];
}

export function tierWaitEstimate(tier: ProcessingTier): string {
  return {
    tier1_predio: "unos minutos",
    tier2_extendido: "10–30 minutos",
    tier3_regional: "varias horas",
  }[tier];
}
