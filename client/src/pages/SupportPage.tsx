import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Mail, Phone, MessageSquare, Clock, CheckCircle2, Send, ShieldCheck, LifeBuoy } from "lucide-react";
import { toast } from "sonner";

export default function SupportPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    empresa: "",
    categoria: "tecnico",
    asunto: "",
    mensaje: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.email || !formData.mensaje) {
      toast.error("Por favor completa los campos obligatorios.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      toast.success("Solicitud enviada exitosamente. Un especialista se tomará contacto en breve.");
    }, 800);
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Header & Hero Value Proposition */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 p-8 rounded-2xl text-white shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-emerald-300 border-emerald-500/50 bg-emerald-950/80">
                Soporte Prioritario Agro
              </Badge>
              <span className="text-xs text-emerald-200/80 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> SLA de respuesta &lt; 2 horas
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Centro de Soporte y Atención Técnica</h1>
            <p className="text-emerald-100/90 text-sm max-w-2xl">
              Estamos aquí para asistirte en la interpretación de índices satelitales (NDVI, NDWI, SCL),
              configuración de APIs Copernicus CDSE y gestión de límites operacionales para tu predio.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15">
            <LifeBuoy className="w-8 h-8 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs text-emerald-200 uppercase font-semibold tracking-wider">Estado de Red Satelital</div>
              <div className="text-sm font-bold flex items-center gap-1.5 text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> CDSE Operational (100%)
              </div>
            </div>
          </div>
        </div>

        {/* Support Channels & Quick Contact Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:border-emerald-500/40 transition-all shadow-sm">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2">
                <Mail className="w-5 h-5" />
              </div>
              <CardTitle className="text-base">Correo Electrónico</CardTitle>
              <CardDescription>Respuesta técnica directa y seguimiento de tickets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-semibold text-gray-900">soporte@agropulso.com</p>
              <p className="text-xs text-gray-500">Monitoreado continuamente por ingenieros agrónomos y de sistemas.</p>
            </CardContent>
          </Card>

          <Card className="hover:border-emerald-500/40 transition-all shadow-sm">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2">
                <MessageSquare className="w-5 h-5" />
              </div>
              <CardTitle className="text-base">WhatsApp Agronómico</CardTitle>
              <CardDescription>Atención rápida para consultas de terreno</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-semibold text-emerald-700">+56 9 8765 4321</p>
              <p className="text-xs text-gray-500">Disponible Lunes a Viernes 08:00 – 19:00 CLT</p>
            </CardContent>
          </Card>

          <Card className="hover:border-emerald-500/40 transition-all shadow-sm">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <CardTitle className="text-base">Garantía SLA y Privacidad</CardTitle>
              <CardDescription>Aislamiento estricto multi-tenant Supabase</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-semibold text-gray-900">Datos Protegidos con RLS</p>
              <p className="text-xs text-gray-500">Sus polígonos e informes son estrictamente confidenciales por tenant.</p>
            </CardContent>
          </Card>
        </div>

        {/* Ticket Form + FAQ split section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Contact Ticket Form */}
          <Card className="lg:col-span-7 shadow-md border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2 text-gray-900">
                <Send className="w-5 h-5 text-emerald-700" />
                Enviar Solicitud de Asistencia
              </CardTitle>
              <CardDescription>
                Complete el formulario a continuación para generar un ticket directo a nuestro equipo de ingeniería satelital.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-950">¡Ticket de Soporte Creado!</h3>
                  <p className="text-sm text-emerald-800 max-w-md mx-auto">
                    Hemos recibido su requerimiento. Un especialista revisará el identificador de su predio o la incidencia reportada y le responderá a <strong>{formData.email}</strong> en menos de 2 horas.
                  </p>
                  <Button
                    variant="outline"
                    className="border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({ nombre: "", email: "", empresa: "", categoria: "tecnico", asunto: "", mensaje: "" });
                    }}
                  >
                    Enviar Otra Consulta
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre Completo *</Label>
                      <Input
                        id="nombre"
                        placeholder="Ej: Juan Pérez"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Electrónico *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="ejemplo@agricola.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="empresa">Empresa / Tenant ID</Label>
                      <Input
                        id="empresa"
                        placeholder="Ej: Agrícola El Olivar"
                        value={formData.empresa}
                        onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="categoria">Categoría del Caso</Label>
                      <Select
                        value={formData.categoria}
                        onValueChange={(val) => setFormData({ ...formData, categoria: val })}
                      >
                        <SelectTrigger id="categoria">
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tecnico">Soporte Técnico / API CDSE</SelectItem>
                          <SelectItem value="agronomico">Interpretación Agronómica (NDVI)</SelectItem>
                          <SelectItem value="predios">Límites de Hectáreas y Tiers</SelectItem>
                          <SelectItem value="facturacion">Planes y Facturación</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="asunto">Asunto *</Label>
                    <Input
                      id="asunto"
                      placeholder="Ej: Consulta por baja confianza de píxeles en Lote Cerezos"
                      value={formData.asunto}
                      onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mensaje">Descripción Detallada *</Label>
                    <Textarea
                      id="mensaje"
                      placeholder="Describa el problema o consulta, incluyendo nombre del predio o fecha si aplica..."
                      rows={4}
                      value={formData.mensaje}
                      onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-medium py-2.5 rounded-lg transition-all"
                  >
                    {loading ? "Procesando envío..." : "Enviar Mensaje a Soporte"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Frequently Asked Questions (FAQ) */}
          <Card className="lg:col-span-5 shadow-sm border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                <HelpCircle className="w-5 h-5 text-emerald-700" />
                Preguntas Frecuentes
              </CardTitle>
              <CardDescription>
                Respuestas inmediatas a las dudas técnicas más comunes sobre la plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full space-y-2">
                <AccordionItem value="faq-1" className="border-b pb-2">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline text-left">
                    ¿Qué significa "Confianza Baja" en un informe?
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-gray-600 leading-relaxed pt-1">
                    Significa que más del 70% de la superficie del polígono contenía nubes o sombras al momento de la captura satelital, filtradas automáticamente por la máscara de nubes SCL de Sentinel-2 L2A.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-2" className="border-b pb-2">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline text-left">
                    ¿Cómo solicito la activación de Sentinel-1 Radar?
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-gray-600 leading-relaxed pt-1">
                    Sentinel-1 permite evaluar humedad de suelo atravesando capas de nubes. Puede activarse desde la pestaña <strong>Configuración Satelital</strong> seleccionando la vertical correspondiente o solicitando la expansión a su plan actual.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-3" className="border-b pb-2">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline text-left">
                    ¿Cómo se estructuran los límites de superficie (Tiers)?
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-gray-600 leading-relaxed pt-1">
                    <strong>Tier 1 (&le;50 ha):</strong> Processing API instantáneo.<br/>
                    <strong>Tier 2 (51–5.000 ha):</strong> Statistical API optimizado por polígono PostGIS.<br/>
                    <strong>Tier 3 (&gt;5.000 ha):</strong> Batch API regional con despacho asíncrono.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-4" className="border-b pb-2">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline text-left">
                    ¿Mis datos de polígonos están aislados de otras empresas?
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-gray-600 leading-relaxed pt-1">
                    Sí. AgroPulso opera con aislamiento multi-tenant estricto vía Supabase RLS (Row Level Security). Sus claves JWT garantizan que ninguna otra organización acceda a sus parcelas ni resultados.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
