import type { Vertical, SatelliteId, SatelliteVariable } from "./satellite-catalog";
import type { ProcessingTier } from "./satellite-router";

export type Tenant = {
  id: string;
  nombre: string;
  vertical: Vertical;
  creado_en: string;
};

export type User = {
  id: string;
  tenant_id: string;
  role: "super_admin" | "admin" | "viewer";
  email: string;
  creado_en: string;
};

export type Predio = {
  id: string;
  tenant_id: string;
  nombre: string;
  geometria: Record<string, unknown>;
  cultivo_o_uso?: string;
  comuna?: string;
  superficie_ha: number;
  creado_en: string;
};

export type SolicitudAnalisis = {
  id: string;
  tenant_id: string;
  predio_id?: string;
  geometria: Record<string, unknown>;
  superficie_ha: number;
  tier: ProcessingTier;
  satelites_solicitados: SatelliteId[];
  estado: string;
  motor_usado?: string;
  variables_solicitadas: string[];
  correlation_id: string;
  idempotency_key: string;
  solicitado_por?: string;
  creado_en: string;
};

export type Informe = {
  id: string;
  tenant_id: string;
  predio_id?: string;
  solicitud_id?: string;
  fecha_generacion: string;
  tipo_lente: string;
  contenido: Record<string, unknown>;
  creado_en: string;
};

export type Medicion = {
  id: string;
  tenant_id: string;
  predio_id: string;
  solicitud_id?: string;
  satelite: SatelliteId;
  variable: string;
  valor: number;
  unidad?: string;
  fecha_adquisicion: string;
  creado_en: string;
};

export type Alerta = {
  id: string;
  tenant_id: string;
  predio_id?: string;
  tipo_alerta: string;
  valor_umbral?: number;
  valor_real?: number;
  explicacion?: string;
  nivel_confianza?: "alto" | "medio" | "bajo" | "no_concluyente";
  fecha_activacion: string;
  enviada: boolean;
  creado_en: string;
};
