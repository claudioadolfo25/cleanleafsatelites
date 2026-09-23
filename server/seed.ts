import { calcularConfianza } from "./services/confidence";

export async function runSeed() {
  console.log("[Seed] Starting AgroPulso demo seed insertion...");

  const userDemo = {
    openId: "demo-user-jalisco",
    name: "Don Ernesto Cruz",
    email: "ernesto@agropulso.io",
    role: "admin",
  };

  const parcelaDemo = {
    id: "parc-jalisco-01",
    nombre: "Lote 3 Norte - Maíz Híbrido",
    areaHa: 45.5,
    poligonoGeojson: JSON.stringify({
      type: "Polygon",
      coordinates: [
        [
          [-103.35, 20.65],
          [-103.35, 20.67],
          [-103.32, 20.67],
          [-103.32, 20.65],
          [-103.35, 20.65],
        ],
      ],
    }),
  };

  const temporadaDemo = {
    id: "temp-2026",
    parcelaId: parcelaDemo.id,
    ciclo: "2026-2027",
    faseActual: 4,
    metaRendimientoTonHa: 14.5,
  };

  const analisisSueloDemo = {
    ph: 5.8,
    nKgHa: 22.4,
    pKgHa: 12.1,
    kKgHa: 180.5,
    materiaOrganicaPct: 1.2,
    fechaAnalisis: "2024-04-15",
  };

  const c1 = calcularConfianza({ validObservations: 3, cloudCoverageAvg: 12, daysSinceLastObservation: 7, trendConsistency: "consistente" });
  const c2 = calcularConfianza({ validObservations: 2, cloudCoverageAvg: 28, daysSinceLastObservation: 14, trendConsistency: "parcial" });
  const c3 = calcularConfianza({ validObservations: 1, cloudCoverageAvg: 65, daysSinceLastObservation: 25, trendConsistency: "consistente" });

  const alertasDemo = [
    {
      id: "alt-101",
      zona: "Zona Norte",
      tipo: "bajo_vigor",
      deteccion: "El NDVI de la zona norte ha descendido un 18% en las últimas 2 observaciones satelitales.",
      hipotesis: ["Estrés hídrico por pendiente", "Emergencia irregular", "Deficiencia nutricional de Fósforo"],
      accionRecomendada: "Inspecciona 3 puntos en la zona norte hoy. Toma fotografías y verifica humedad del suelo a 20 cm.",
      confianza: c1.level,
      factoresConfianza: c1.factors,
      fechaImagen: "2024-08-25",
    },
    {
      id: "alt-102",
      zona: "Zona Sur",
      tipo: "estres_hidrico",
      deteccion: "Métrica radar Sigma0 VV indica suelo seco.",
      hipotesis: ["Pérdida de humedad por evotranspiración alta"],
      accionRecomendada: "Verificar válvulas de riego en el sector sur.",
      confianza: c2.level,
      factoresConfianza: c2.factors,
      fechaImagen: "2024-08-20",
    },
    {
      id: "alt-103",
      zona: "Zona Este",
      tipo: "posible_anomalia",
      deteccion: "Nubosidad alta en última toma satelital.",
      hipotesis: ["Interferencia por nubes acumuladas"],
      accionRecomendada: "Esperar a la siguiente pasada de Sentinel-2 en 3 días.",
      confianza: c3.level,
      factoresConfianza: c3.factors,
      fechaImagen: "2024-08-10",
    },
  ];

  const laboresDemo = [
    { id: "lab-1", fase: 2, tipo: "Barbecho y nivelación", fecha: "2024-04-20", descripcion: "Nivelación con láser y rastra profunda" },
    { id: "lab-2", fase: 3, tipo: "Siembra", fecha: "2024-05-10", descripcion: "Siembra de maíz híbrido a 75,000 pl/ha" },
    { id: "lab-3", fase: 4, tipo: "Fertilización V4", fecha: "2024-06-15", descripcion: "Primera aplicación de nitrógeno en banda" },
    { id: "lab-4", fase: 4, tipo: "Monitoreo de plagas", fecha: "2024-07-02", descripcion: "Monitoreo de gusano cogollero - incidencia < 2%" },
    { id: "lab-5", fase: 4, tipo: "Riego de auxilio", fecha: "2024-08-01", descripcion: "Riego de 45 mm por aspersión" },
  ];

  console.log("[Seed] Demo data generated successfully:");
  console.log(`- User: ${userDemo.name}`);
  console.log(`- Parcela: ${parcelaDemo.nombre} (${parcelaDemo.areaHa} ha)`);
  console.log(`- Temporada: ${temporadaDemo.ciclo} (Fase ${temporadaDemo.faseActual})`);
  console.log(`- Analisis Suelo: pH ${analisisSueloDemo.ph}`);
  console.log(`- Alertas: ${alertasDemo.length} alertas insertadas con niveles de confianza [${alertasDemo.map(a => a.confianza).join(", ")}]`);
  console.log(`- Labores: ${laboresDemo.length} labores registradas`);

  return { userDemo, parcelaDemo, temporadaDemo, analisisSueloDemo, alertasDemo, laboresDemo };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSeed().catch(console.error);
}
