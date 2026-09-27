import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "./ui/sidebar";
import {
  LayoutDashboard,
  FileText,
  Satellite,
  HelpCircle,
  BookOpen,
  Building2,
  ChevronRight,
  ShieldCheck,
  Bot,
  User,
  Settings,
  Sliders,
  History,
  Globe,
} from "lucide-react";
import { Badge } from "./ui/badge";
import FloatingAgentWidget from "./FloatingAgentWidget";
import { useUserProfile } from "../lib/userProfile";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const { profile } = useUserProfile();

  const navigationItems = [
    {
      title: "Panel Principal",
      url: "/dashboard",
      icon: LayoutDashboard,
      description: "Vista general de predios y consumo",
    },
    {
      title: "EO Browser Workstation",
      url: "/dashboard/copernicus/workstation",
      icon: Sliders,
      description: "Consola de satélites y filtros CDSE",
    },
    {
      title: "Históricos & Workspace",
      url: "/dashboard/copernicus/historico",
      icon: History,
      description: "Serie temporal y registro de pasadas",
    },
    {
      title: "Centro de Informes",
      url: "/dashboard/informes",
      icon: FileText,
      description: "Monitoreo satelital y lotes activos",
    },
    {
      title: "Configuración Satelital",
      url: "/dashboard/configuracion/satelites",
      icon: Satellite,
      description: "Políticas por vertical y catalogo",
    },
    {
      title: "Agente IA Agrónomo",
      url: "/dashboard/agente",
      icon: Bot,
      description: "Especialistas Sentinel y Don Ernesto Cruz",
    },
    {
      title: "Mi Perfil & Vertical",
      url: "/dashboard/perfil",
      icon: User,
      description: "Personalización de datos y terrenos",
    },
    {
      title: "Guía de Interpretación",
      url: "/dashboard/guias/interpretar-informes",
      icon: BookOpen,
      description: "Manual agronómico de NDVI y SCL",
    },
    {
      title: "Soporte Técnico",
      url: "/dashboard/soporte",
      icon: HelpCircle,
      description: "Atención prioritaria y consultas",
    },
  ];

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-slate-50/80">
        <Sidebar className="border-r border-slate-200/80 bg-white">
          <SidebarHeader className="border-b border-slate-100 p-4">
            <Link href="/" className="flex items-center gap-3 cursor-pointer group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-800 to-teal-900 text-white shadow-md shadow-emerald-900/10 group-hover:scale-105 transition-transform">
                <Satellite className="h-5.5 w-5.5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 tracking-tight text-base group-hover:text-emerald-800 transition-colors">AgroPulso SaaS</span>
                <span className="text-[11px] font-medium text-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Multi-Tenant CDSE
                </span>
              </div>
            </Link>
          </SidebarHeader>

          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-2 py-1 mb-1">
                Navegación
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {navigationItems.map((item) => {
                    const isActive = location === item.url || (item.url !== "/dashboard" && location.startsWith(item.url));
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className={`w-full justify-between rounded-xl px-3 py-2.5 transition-all text-sm ${
                            isActive
                              ? "bg-emerald-800 text-white font-semibold shadow-sm hover:bg-emerald-900 hover:text-white"
                              : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-medium"
                          }`}
                        >
                          <Link href={item.url}>
                            <div className="flex items-center gap-3">
                              <item.icon className={`h-4.5 w-4.5 ${isActive ? "text-emerald-200" : "text-slate-500"}`} />
                              <span>{item.title}</span>
                            </div>
                            {isActive && <ChevronRight className="h-4 w-4 text-emerald-200" />}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-4 border-t border-slate-100 pt-3">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="w-full text-slate-500 hover:bg-slate-100 text-xs">
                    <Link href="/">
                      <Globe className="h-4 w-4 mr-2 text-teal-600" />
                      <span>Volver al Visor 3D Inicial</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-100 p-3 bg-slate-50/50">
            <Link href="/dashboard/perfil" className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-200/60 transition-all cursor-pointer group">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-800 text-white font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
                {profile.nombre.charAt(0)}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-800 transition-colors">
                  {profile.nombre}
                </span>
                <span className="text-[11px] text-slate-500 truncate capitalize flex items-center gap-1">
                  <Settings className="w-3 h-3 text-emerald-600" /> {profile.vertical}
                </span>
              </div>
            </Link>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-y-auto relative">
          <div className="flex items-center gap-4 border-b border-slate-200/60 bg-white/80 backdrop-blur px-6 py-3.5 sticky top-0 z-10">
            <SidebarTrigger className="text-slate-600 hover:text-slate-900 hover:bg-slate-100" />
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Tenant Activo:</span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-900 border-emerald-200 font-mono text-[11px] py-0">
                demo-tenant-1
              </Badge>
            </div>
          </div>
          <div className="p-6 md:p-8">{children}</div>

          {/* Floating AI Agent Button Widget */}
          <FloatingAgentWidget />
        </main>
      </div>
    </SidebarProvider>
  );
}
