import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./lib/authContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Landing3DPage from "./pages/Landing3DPage";
import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";
import SatelliteConfiguration from "./pages/SatelliteConfiguration";
import ReportsDashboard from "./pages/ReportsDashboard";
import ReportDetail from "./pages/ReportDetail";
import SupportPage from "./pages/SupportPage";
import GuideInterpreterPage from "./pages/GuideInterpreterPage";
import AgentPage from "./pages/AgentPage";
import ProfilePage from "./pages/ProfilePage";
import CopernicusWorkstationPage from "./pages/CopernicusWorkstationPage";
import CopernicusHistoryPage from "./pages/CopernicusHistoryPage";

function Protected({ component: Component }: { component: React.ComponentType<any> }) {
  return (
    <ProtectedRoute>
      <Component />
    </ProtectedRoute>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path={"/"} component={Landing3DPage} />
      <Route path={"/login"} component={AuthPage} />
      <Route path={"/auth"} component={AuthPage} />

      {/* Protected Private Dashboard Routes */}
      <Route path={"/dashboard"}>{() => <Protected component={Home} />}</Route>
      <Route path={"/dashboard/configuracion/satelites"}>{() => <Protected component={SatelliteConfiguration} />}</Route>
      <Route path={"/dashboard/copernicus/workstation"}>{() => <Protected component={CopernicusWorkstationPage} />}</Route>
      <Route path={"/dashboard/copernicus/historico"}>{() => <Protected component={CopernicusHistoryPage} />}</Route>
      <Route path={"/dashboard/informes/:id"}>{() => <Protected component={ReportDetail} />}</Route>
      <Route path={"/dashboard/informes"}>{() => <Protected component={ReportsDashboard} />}</Route>
      <Route path={"/dashboard/soporte"}>{() => <Protected component={SupportPage} />}</Route>
      <Route path={"/dashboard/guias/interpretar-informes"}>{() => <Protected component={GuideInterpreterPage} />}</Route>
      <Route path={"/dashboard/agente"}>{() => <Protected component={AgentPage} />}</Route>
      <Route path={"/dashboard/perfil"}>{() => <Protected component={ProfilePage} />}</Route>

      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
