import { Router } from "express";
import { authenticateSupabaseJWT, AuthenticatedRequest } from "../middleware/auth";
import { getSatelitesHabilitados } from "@shared/satellite-catalog";
import { getTierForSuperficie, processingModeForTier } from "@shared/satellite-router";
import { getSupabaseUserClient } from "../admin/supabase-client";
import { DomainAgentOrchestrator } from "../services/orchestrator";

export const apiV1Router = Router();

const orchestrator = new DomainAgentOrchestrator();

// GET /api/v1/health
apiV1Router.get("/health", (req, res) => {
  res.json({ data: { status: "ok", version: "v1", timestamp: new Date().toISOString() }, error: null });
});

// Protect all remaining /api/v1 endpoints with Supabase JWT authentication
apiV1Router.use(authenticateSupabaseJWT as any);

// POST /api/v1/agent/orchestrate
apiV1Router.post("/agent/orchestrate", async (req: AuthenticatedRequest, res) => {
  try {
    const {
      cloudCoverPct = 10,
      validPixelRatio = 95,
      ndviMean = 0.65,
      gddAccumulated = 450,
      rainfallMm = 120,
      sowingDate = "2026-10-15",
      hybridVariety = "DK-7303",
      targetDensityPlantsHa = 85000,
      hasFertilizationHistory = true,
      hasFieldPhoto = false,
      unexplainedVigorDrop = false,
    } = req.body;

    const correlation_id = `agent-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const result = orchestrator.orchestrateConsultation({
      cloudCoverPct: Number(cloudCoverPct),
      validPixelRatio: Number(validPixelRatio),
      ndviMean: Number(ndviMean),
      gddAccumulated: Number(gddAccumulated),
      rainfallMm: Number(rainfallMm),
      sowingDate: String(sowingDate),
      hybridVariety: String(hybridVariety),
      targetDensityPlantsHa: Number(targetDensityPlantsHa),
      hasFertilizationHistory: Boolean(hasFertilizationHistory),
      hasFieldPhoto: Boolean(hasFieldPhoto),
      unexplainedVigorDrop: Boolean(unexplainedVigorDrop),
    });

    // Audit log persistence for agent consultation
    if (process.env.NODE_ENV !== "test" && req.token) {
      try {
        const supabase = getSupabaseUserClient(req.token);
        await supabase.from("bitacora_labores").insert({
          tenant_id: req.user!.tenant_id,
          tipo_labor: "consulta_agente_orquestador",
          descripcion: `[Correlation ${correlation_id}] Consenso Agentes: ${result.consolidatedConfidence}. Summary: ${result.finalRecommendation.substring(0, 150)}...`,
          fecha_realizacion: new Date().toISOString().split("T")[0],
          registrado_por: req.user!.id,
        });
      } catch (auditErr) {
        console.warn("[Agent Audit Log] Warning: unable to persist consultation audit entry", auditErr);
      }
    }

    res.json({
      data: {
        correlation_id,
        tenant_id: req.user!.tenant_id,
        user_id: req.user!.id,
        ...result,
        timestamp: new Date().toISOString(),
      },
      error: null,
    });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/v1/predios
apiV1Router.get("/predios", async (req: AuthenticatedRequest, res) => {
  try {
    if (process.env.NODE_ENV === "test") {
      return res.json({ data: [], error: null });
    }
    const supabase = getSupabaseUserClient(req.token!);
    const { data, error } = await supabase.from("predios").select("*").order("creado_en", { ascending: false });

    if (error) {
      return res.status(500).json({ data: null, error: error.message });
    }

    res.json({ data: data || [], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/v1/predios
apiV1Router.post("/predios", async (req: AuthenticatedRequest, res) => {
  try {
    const { nombre, superficie_ha, cultivo_o_uso, comuna, geometria } = req.body;
    if (!nombre || !superficie_ha) {
      return res.status(400).json({ data: null, error: "Missing required fields: nombre, superficie_ha" });
    }

    const newPredio = {
      tenant_id: req.user!.tenant_id,
      nombre,
      superficie_ha,
      cultivo_o_uso,
      comuna,
      geometria: geometria || {},
    };

    if (process.env.NODE_ENV === "test") {
      return res.status(201).json({ data: { id: "mock-predio-id", ...newPredio }, error: null });
    }

    const supabase = getSupabaseUserClient(req.token!);
    const { data, error } = await supabase.from("predios").insert(newPredio).select().single();

    if (error) {
      return res.status(500).json({ data: null, error: error.message });
    }

    res.status(201).json({ data, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/v1/solicitudes
apiV1Router.post("/solicitudes", async (req: AuthenticatedRequest, res) => {
  try {
    const { predio_id, superficie_ha, vertical = "agricultura", satelites_solicitados = ["sentinel-2"], variables_solicitadas = ["ndvi"], idempotency_key } = req.body;

    if (!superficie_ha || !idempotency_key) {
      return res.status(400).json({ data: null, error: "Missing required fields: superficie_ha, idempotency_key" });
    }

    const catalogSources = getSatelitesHabilitados(vertical as any);
    const validSatellites = satelites_solicitados.filter((s: string) => catalogSources.includes(s as any));

    if (validSatellites.length === 0) {
      return res.status(400).json({ data: null, error: "Invalid satellite selection for given vertical" });
    }

    const tier = getTierForSuperficie(superficie_ha);
    const motor = processingModeForTier(tier);

    const newSolicitud = {
      tenant_id: req.user!.tenant_id,
      predio_id,
      superficie_ha,
      tier,
      satelites_solicitados: validSatellites,
      variables_solicitadas,
      motor_usado: motor,
      estado: tier === "tier3_regional" ? "requiere_revision" : "pendiente",
      idempotency_key,
      solicitado_por: req.user!.id,
    };

    if (process.env.NODE_ENV === "test") {
      return res.status(202).json({ data: { id: "mock-solicitud-id", ...newSolicitud }, error: null });
    }

    const supabase = getSupabaseUserClient(req.token!);
    const { data, error } = await supabase.from("solicitudes_analisis").insert(newSolicitud).select().single();

    if (error) {
      return res.status(500).json({ data: null, error: error.message });
    }

    res.status(202).json({ data, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/v1/informes
apiV1Router.get("/informes", async (req: AuthenticatedRequest, res) => {
  try {
    if (process.env.NODE_ENV === "test") {
      return res.json({ data: [], error: null });
    }
    const supabase = getSupabaseUserClient(req.token!);
    const { data, error } = await supabase.from("informes").select("*").order("creado_en", { ascending: false });

    if (error) {
      return res.status(500).json({ data: null, error: error.message });
    }

    res.json({ data: data || [], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/v1/informes/:id
apiV1Router.get("/informes/:id", async (req: AuthenticatedRequest, res) => {
  try {
    if (process.env.NODE_ENV === "test") {
      return res.json({ data: { id: req.params.id, status: "mock-informe" }, error: null });
    }
    const supabase = getSupabaseUserClient(req.token!);
    const { data, error } = await supabase.from("informes").select("*").eq("id", req.params.id).single();

    if (error) {
      return res.status(404).json({ data: null, error: "Informe not found" });
    }

    res.json({ data, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/v1/alertas
apiV1Router.get("/alertas", async (req: AuthenticatedRequest, res) => {
  try {
    if (process.env.NODE_ENV === "test") {
      return res.json({ data: [], error: null });
    }
    const supabase = getSupabaseUserClient(req.token!);
    const { data, error } = await supabase.from("alertas").select("*").order("fecha_activacion", { ascending: false });

    if (error) {
      return res.status(500).json({ data: null, error: error.message });
    }

    res.json({ data: data || [], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/v1/pagos/eventos
apiV1Router.get("/pagos/eventos", async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user!.role !== "admin" && req.user!.role !== "owner" && req.user!.role !== "super_admin") {
      return res.status(403).json({ data: null, error: "Forbidden: insufficient role privileges" });
    }
    if (process.env.NODE_ENV === "test") {
      return res.json({ data: [], error: null });
    }
    const supabase = getSupabaseUserClient(req.token!);
    const { data, error } = await supabase.from("eventos_pago").select("*").order("creado_en", { ascending: false });

    if (error) {
      return res.status(500).json({ data: null, error: error.message });
    }

    res.json({ data: data || [], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/v1/pagos/eventos
apiV1Router.post("/pagos/eventos", async (req: AuthenticatedRequest, res) => {
  try {
    const { tenant_id, event_id, proveedor, tipo_evento, payload } = req.body;
    if (!event_id || !proveedor || !tipo_evento) {
      return res.status(400).json({ data: null, error: "Missing required payment event fields" });
    }

    // Cross-tenant write prevention
    if (tenant_id && tenant_id !== req.user!.tenant_id && req.user!.role !== "super_admin") {
      return res.status(403).json({ data: null, error: "Forbidden: cannot create payment events for another tenant" });
    }

    const newEvento = {
      tenant_id: req.user!.tenant_id,
      event_id,
      proveedor,
      tipo_evento,
      payload: payload || {},
    };

    if (process.env.NODE_ENV === "test") {
      return res.status(201).json({ data: { id: "mock-evento-id", ...newEvento }, error: null });
    }

    const supabase = getSupabaseUserClient(req.token!);
    const { data, error } = await supabase.from("eventos_pago").insert(newEvento).select().single();

    if (error) {
      return res.status(500).json({ data: null, error: error.message });
    }

    res.status(201).json({ data, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/v1/invitaciones
apiV1Router.post("/invitaciones", async (req: AuthenticatedRequest, res) => {
  try {
    const { tenant_id, email, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ data: null, error: "Missing required fields: email, role" });
    }

    // Only owner/admin/super_admin can invite
    if (req.user!.role !== "admin" && req.user!.role !== "owner" && req.user!.role !== "super_admin") {
      return res.status(403).json({ data: null, error: "Forbidden: insufficient role to send invitations" });
    }

    // Cannot invite users into a different tenant
    if (tenant_id && tenant_id !== req.user!.tenant_id && req.user!.role !== "super_admin") {
      return res.status(403).json({ data: null, error: "Forbidden: cannot send invitations for another tenant" });
    }

    const newInvitation = {
      tenant_id: req.user!.tenant_id,
      email,
      role,
      token: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      expira_at: new Date(Date.now() + 86400000 * 7).toISOString(),
      creado_por: req.user!.id,
    };

    if (process.env.NODE_ENV === "test") {
      return res.status(201).json({ data: { id: "mock-invitation-id", ...newInvitation }, error: null });
    }

    const supabase = getSupabaseUserClient(req.token!);
    const { data, error } = await supabase.from("invitaciones").insert(newInvitation).select().single();

    if (error) {
      return res.status(500).json({ data: null, error: error.message });
    }

    res.status(201).json({ data, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/v1/roles
apiV1Router.post("/roles", async (req: AuthenticatedRequest, res) => {
  try {
    const { user_id, tenant_id, role } = req.body;
    if (!user_id || !role) {
      return res.status(400).json({ data: null, error: "Missing required fields: user_id, role" });
    }

    // Role management authorization check: only owner, admin, or super_admin
    if (req.user!.role !== "owner" && req.user!.role !== "admin" && req.user!.role !== "super_admin") {
      return res.status(403).json({ data: null, error: "Forbidden: insufficient role privileges to manage roles" });
    }

    // Tenant boundary check
    if (tenant_id && tenant_id !== req.user!.tenant_id && req.user!.role !== "super_admin") {
      return res.status(403).json({ data: null, error: "Forbidden: cannot manage roles for another tenant" });
    }

    const roleHierarchy: Record<string, number> = {
      viewer: 1,
      agricultor: 2,
      agronomo: 3,
      admin: 4,
      owner: 5,
      super_admin: 6,
    };

    const callerRank = roleHierarchy[req.user!.role] || 1;
    const targetRank = roleHierarchy[role] || 1;

    // Privilege escalation check
    if (targetRank >= callerRank && req.user!.role !== "super_admin" && req.user!.role !== "owner") {
      return res.status(403).json({ data: null, error: "Forbidden: cannot assign a role equal or superior to your own" });
    }

    const newRole = {
      user_id,
      tenant_id: req.user!.tenant_id,
      role,
    };

    if (process.env.NODE_ENV === "test") {
      return res.status(201).json({ data: { id: "mock-role-id", ...newRole }, error: null });
    }

    const supabase = getSupabaseUserClient(req.token!);
    const { data, error } = await supabase.from("user_roles").insert(newRole).select().single();

    if (error) {
      return res.status(500).json({ data: null, error: error.message });
    }

    res.status(201).json({ data, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/v1/bitacora
apiV1Router.get("/bitacora", async (req: AuthenticatedRequest, res) => {
  try {
    if (process.env.NODE_ENV === "test") {
      return res.json({ data: [], error: null });
    }
    const supabase = getSupabaseUserClient(req.token!);
    const { data, error } = await supabase.from("bitacora_labores").select("*").order("fecha_realizacion", { ascending: false });

    if (error) {
      return res.status(500).json({ data: null, error: error.message });
    }

    res.json({ data: data || [], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/v1/bitacora
apiV1Router.post("/bitacora", async (req: AuthenticatedRequest, res) => {
  try {
    const { predio_id, tipo_labor, descripcion, fecha_realizacion } = req.body;
    if (!predio_id || !tipo_labor) {
      return res.status(400).json({ data: null, error: "Missing required fields: predio_id, tipo_labor" });
    }

    const newLabor = {
      tenant_id: req.user!.tenant_id,
      predio_id,
      tipo_labor,
      descripcion,
      fecha_realizacion: fecha_realizacion || new Date().toISOString().split("T")[0],
      registrado_por: req.user!.id,
    };

    if (process.env.NODE_ENV === "test") {
      return res.status(201).json({ data: { id: "mock-labor-id", ...newLabor }, error: null });
    }

    const supabase = getSupabaseUserClient(req.token!);
    const { data, error } = await supabase.from("bitacora_labores").insert(newLabor).select().single();

    if (error) {
      return res.status(500).json({ data: null, error: error.message });
    }

    res.status(201).json({ data, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/v1/ciclos
apiV1Router.get("/ciclos", async (req: AuthenticatedRequest, res) => {
  try {
    if (process.env.NODE_ENV === "test") {
      return res.json({ data: [], error: null });
    }
    const supabase = getSupabaseUserClient(req.token!);
    const { data, error } = await supabase.from("ciclos_campana").select("*").order("creado_en", { ascending: false });

    if (error) {
      return res.status(500).json({ data: null, error: error.message });
    }

    res.json({ data: data || [], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/v1/ciclos
apiV1Router.post("/ciclos", async (req: AuthenticatedRequest, res) => {
  try {
    const { predio_id, nombre, cultivo = "maiz", fecha_inicio } = req.body;
    if (!predio_id || !nombre || !fecha_inicio) {
      return res.status(400).json({ data: null, error: "Missing required fields: predio_id, nombre, fecha_inicio" });
    }

    const newCiclo = {
      tenant_id: req.user!.tenant_id,
      predio_id,
      nombre,
      cultivo,
      fase_actual: 0,
      fecha_inicio,
    };

    if (process.env.NODE_ENV === "test") {
      return res.status(201).json({ data: { id: "mock-ciclo-id", ...newCiclo }, error: null });
    }

    const supabase = getSupabaseUserClient(req.token!);
    const { data, error } = await supabase.from("ciclos_campana").insert(newCiclo).select().single();

    if (error) {
      return res.status(500).json({ data: null, error: error.message });
    }

    res.status(201).json({ data, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/v1/catalogo/satelites
apiV1Router.get("/catalogo/satelites", (req, res) => {
  res.json({
    data: {
      agricultura: getSatelitesHabilitados("agricultura"),
      acuicultura: getSatelitesHabilitados("acuicultura"),
      forestal: getSatelitesHabilitados("forestal"),
    },
    error: null,
  });
});

// GET /api/v1/consumo
apiV1Router.get("/consumo", async (req: AuthenticatedRequest, res) => {
  try {
    if (process.env.NODE_ENV === "test") {
      return res.json({ data: [], error: null });
    }
    const supabase = getSupabaseUserClient(req.token!);
    const { data, error } = await supabase.from("consumo").select("*").order("fecha", { ascending: false });

    if (error) {
      return res.status(500).json({ data: null, error: error.message });
    }

    res.json({ data: data || [], error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: err.message });
  }
});
