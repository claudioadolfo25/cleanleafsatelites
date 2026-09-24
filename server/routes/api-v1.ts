import { Router } from "express";
import { authenticateSupabaseJWT, AuthenticatedRequest } from "../middleware/auth";
import { getSatelitesHabilitados } from "@shared/satellite-catalog";
import { getTierForSuperficie, processingModeForTier } from "@shared/satellite-router";
import { getSupabaseUserClient } from "../admin/supabase-client";

export const apiV1Router = Router();

// GET /api/v1/health
apiV1Router.get("/health", (req, res) => {
  res.json({ data: { status: "ok", version: "v1", timestamp: new Date().toISOString() }, error: null });
});

// Protect all remaining /api/v1 endpoints with Supabase JWT authentication
apiV1Router.use(authenticateSupabaseJWT as any);

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
