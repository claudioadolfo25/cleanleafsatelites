import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { BookOpen, FileBarChart2, Home, LayoutDashboard, Leaf, LogOut, MapPinned, Settings, User } from "lucide-react";
import { CSSProperties, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const menuItems = [
  { icon: Home, label: "Inicio", path: "/" },
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: MapPinned, label: "Predios", path: "/dashboard/predios" },
  { icon: FileBarChart2, label: "Informes", path: "/dashboard/informes" },
  { icon: BookOpen, label: "Guía de Informes", path: "/dashboard/guias/interpretar-informes" },
  { icon: Settings, label: "Satélites", path: "/dashboard/configuracion/satelites" },
  { icon: User, label: "Mi Perfil", path: "/dashboard/configuracion/perfil" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth] = useState(260);

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen w-full bg-[#f7f7f2]">
      <Sidebar collapsible="icon" className="border-r border-[#e6e7dd] bg-white">
        <SidebarHeader className="h-16 border-b border-[#e6e7dd] px-4 justify-center">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
              title="Ocultar/Mostrar menú"
            >
              <Leaf size={18} className="text-emerald-700" />
            </button>
            {!isCollapsed ? (
              <span className="font-serif text-lg font-bold tracking-tight text-stone-900">Cleanleaf</span>
            ) : null}
          </div>
        </SidebarHeader>

        <SidebarContent className="py-2">
          <SidebarMenu className="px-2 space-y-1">
            {menuItems.map(item => {
              const isActive = location === item.path;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive}
                    onClick={() => setLocation(item.path)}
                    tooltip={item.label}
                    className={`h-10 text-xs font-semibold rounded-xl ${
                      isActive ? "bg-emerald-100 text-emerald-800" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                    }`}
                  >
                    <item.icon className={`h-4 w-4 ${isActive ? "text-emerald-700" : "text-stone-400"}`} />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="border-t border-[#e6e7dd] p-3">
          <div className="flex items-center justify-between">
            {!isCollapsed ? (
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs font-bold text-stone-800 truncate">Carlos Mendoza</p>
                <p className="text-[10px] text-stone-400 truncate">carlos@agricola.cl</p>
              </div>
            ) : null}
            <button
              onClick={() => {
                toast.info("Sesión cerrada");
                setLocation("/login");
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex-1 min-w-0 bg-[#f7f7f2]">
        {isMobile ? (
          <div className="flex h-14 items-center justify-between border-b border-[#e6e7dd] bg-white px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <span className="font-semibold text-stone-800">Cleanleaf</span>
            </div>
          </div>
        ) : null}
        <div className="min-h-screen">{children}</div>
      </SidebarInset>
    </div>
  );
}
