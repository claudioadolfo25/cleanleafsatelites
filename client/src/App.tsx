import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const SatellitesPlaceholderPage = lazy(() => import("./pages/SatellitesPlaceholderPage"));
const Home = lazy(() => import("./pages/Home"));
const SatelliteConfiguration = lazy(() => import("./pages/SatelliteConfiguration"));
const ReportsDashboard = lazy(() => import("./pages/ReportsDashboard"));
const ReportDetail = lazy(() => import("./pages/ReportDetail"));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f7f2]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        {/* Rutas Públicas (Fase 1 & Fase 2) */}
        <Route path="/" component={LandingPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/satelites" component={SatellitesPlaceholderPage} />

        {/* Rutas Protegidas bajo /dashboard */}
        <Route path="/dashboard">
          {() => <ProtectedRoute component={Home} />}
        </Route>
        <Route path="/dashboard/configuracion/satelites">
          {() => <ProtectedRoute component={SatelliteConfiguration} />}
        </Route>
        <Route path="/dashboard/informes/:id">
          {(params) => <ProtectedRoute component={ReportDetail} params={params} />}
        </Route>
        <Route path="/dashboard/informes">
          {() => <ProtectedRoute component={ReportsDashboard} />}
        </Route>

        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
