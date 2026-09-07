import type { ProcessingTier } from "./satellite-router";

export type PlanId = "piloto" | "regional_pyme" | "region_completa";

export type PlanDefinition = {
  id: PlanId;
  nombre: string;
  maxPredios: number;
  maxHaMes: number;
  permiteTier3Regional: boolean;
};

export const planCatalog: Record<PlanId, PlanDefinition> = {
  piloto: { id: "piloto", nombre: "Piloto", maxPredios: 5, maxHaMes: 50, permiteTier3Regional: false },
  regional_pyme: { id: "regional_pyme", nombre: "Regional PyME", maxPredios: 50, maxHaMes: 5000, permiteTier3Regional: false },
  region_completa: { id: "region_completa", nombre: "Región completa", maxPredios: 1000, maxHaMes: Number.POSITIVE_INFINITY, permiteTier3Regional: true },
};

export type PlanUsage = { haMesUsadas: number; prediosActivos: number };

export function validatePlanLimits(planId: PlanId, tier: ProcessingTier, hectares: number, usage: PlanUsage) {
  const plan = planCatalog[planId];
  if (!plan) return { allowed: false, code: "PLAN_NOT_FOUND", message: "El plan solicitado no existe." } as const;
  if (tier === "tier3_regional" && !plan.permiteTier3Regional) {
    return { allowed: false, code: "TIER3_NOT_ALLOWED", message: `El plan ${plan.nombre} no permite análisis regionales.` } as const;
  }
  if (usage.haMesUsadas + hectares > plan.maxHaMes) {
    return { allowed: false, code: "MONTHLY_HA_LIMIT", message: `El plan ${plan.nombre} supera su límite mensual de hectáreas analizables.` } as const;
  }
  if (usage.prediosActivos > plan.maxPredios) {
    return { allowed: false, code: "PREDIO_LIMIT", message: `El plan ${plan.nombre} supera su límite de predios.` } as const;
  }
  return { allowed: true, plan } as const;
}
