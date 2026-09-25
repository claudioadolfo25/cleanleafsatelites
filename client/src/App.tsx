import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import SatelliteConfiguration from "./pages/SatelliteConfiguration";
import ReportsDashboard from "./pages/ReportsDashboard";
import ReportDetail from "./pages/ReportDetail";
import SupportPage from "./pages/SupportPage";
import GuideInterpreterPage from "./pages/GuideInterpreterPage";
import AgentPage from "./pages/AgentPage";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard/configuracion/satelites"} component={SatelliteConfiguration} />
      <Route path={"/dashboard/informes/:id"} component={ReportDetail} />
      <Route path={"/dashboard/informes"} component={ReportsDashboard} />
      <Route path={"/dashboard/soporte"} component={SupportPage} />
      <Route path={"/dashboard/guias/interpretar-informes"} component={GuideInterpreterPage} />
      <Route path={"/dashboard/agente"} component={AgentPage} />
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
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
