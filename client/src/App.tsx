import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import SatelliteConfiguration from "./pages/SatelliteConfiguration";
import ReportsDashboard from "./pages/ReportsDashboard";
import ReportDetail from "./pages/ReportDetail";
import UserProfile from "./pages/UserProfile";
import GuideInterpreterPage from "./pages/GuideInterpreterPage";

function Router() {
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/registro"} component={Register} />
      <Route path={"/"}>
        {() => (
          <DashboardLayout>
            <Home />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/dashboard"}>
        {() => (
          <DashboardLayout>
            <Home />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/dashboard/predios"}>
        {() => (
          <DashboardLayout>
            <Home />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/dashboard/guias/interpretar-informes"}>
        {() => (
          <DashboardLayout>
            <GuideInterpreterPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/dashboard/configuracion"}>
        {() => (
          <DashboardLayout>
            <UserProfile />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/dashboard/configuracion/perfil"}>
        {() => (
          <DashboardLayout>
            <UserProfile />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/dashboard/configuracion/satelites"}>
        {() => (
          <DashboardLayout>
            <SatelliteConfiguration />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/dashboard/informes/:id"}>
        {() => (
          <DashboardLayout>
            <ReportDetail />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/dashboard/informes"}>
        {() => (
          <DashboardLayout>
            <ReportsDashboard />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/404"} component={NotFound} />
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
