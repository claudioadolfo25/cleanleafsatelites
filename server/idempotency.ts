import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (_supabaseClient) return _supabaseClient;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (url && key) {
    try {
      _supabaseClient = createClient(url, key);
      return _supabaseClient;
    } catch (e) {
      console.warn("[Supabase] Client initialization failed:", e);
    }
  }
  return null;
}

// Memory fallback store mimicking the DB unique constraint table structure when Supabase env vars are absent during offline tests
const inMemoryTableStore = new Map<string, { result: unknown; createdAt: Date }>();

export async function getIdempotentAnalysis(tenantId: string, idempotencyKey: string): Promise<unknown | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("solicitudes_analisis")
        .select("resultado_json")
        .eq("tenant_id", tenantId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (!error && data && data.resultado_json) {
        return data.resultado_json;
      }
    } catch (err) {
      console.warn("[Supabase Idempotency] Error querying solicitudes_analisis:", err);
    }
  }

  const lookupKey = `${tenantId}:${idempotencyKey}`;
  const record = inMemoryTableStore.get(lookupKey);
  return record ? record.result : null;
}

export async function setIdempotentAnalysis(
  tenantId: string,
  idempotencyKey: string,
  result: unknown,
  metadata?: {
    superficieHa?: number;
    tier?: string;
    satelitesSolicitados?: string[];
    variablesSolicitadas?: string[];
    estado?: string;
    motorUsado?: string;
    correlationId?: string;
  }
): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.from("solicitudes_analisis").upsert(
        {
          tenant_id: tenantId,
          idempotency_key: idempotencyKey,
          superficie_ha: metadata?.superficieHa ?? 1,
          tier: metadata?.tier ?? "tier1_predio",
          satelites_solicitados: metadata?.satelitesSolicitados ?? ["sentinel-2"],
          variables_solicitadas: metadata?.variablesSolicitadas ?? ["ndvi"],
          estado: metadata?.estado ?? "completado",
          motor_usado: metadata?.motorUsado ?? "processing_api",
          correlation_id: metadata?.correlationId,
          resultado_json: result,
          actualizado_en: new Date().toISOString(),
        },
        { onConflict: "tenant_id,idempotency_key" }
      );

      if (error) {
        console.warn("[Supabase Idempotency] Error inserting into solicitudes_analisis:", error.message);
      } else {
        return;
      }
    } catch (err) {
      console.warn("[Supabase Idempotency] Exception on insert:", err);
    }
  }

  const lookupKey = `${tenantId}:${idempotencyKey}`;
  inMemoryTableStore.set(lookupKey, { result, createdAt: new Date() });
}

export function clearInMemoryIdempotencyStore(): void {
  inMemoryTableStore.clear();
}
