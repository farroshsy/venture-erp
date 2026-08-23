import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EnterpriseShell } from "@/components/EnterpriseShell";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { VentureProvider } from "./contexts/VentureContext";
import Architecture from "./pages/Architecture";
import DecisionGovernance from "./pages/DecisionGovernance";
import ModuleCatalog from "./pages/ModuleCatalog";
import OperationsWorkspace from "./pages/OperationsWorkspace";
import PortfolioDashboard from "./pages/PortfolioDashboard";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={PortfolioDashboard} />
      <Route path={"/modules"} component={ModuleCatalog} />
      <Route path={"/operations"} component={OperationsWorkspace} />
      <Route path={"/decisions"} component={DecisionGovernance} />
      <Route path={"/architecture"} component={Architecture} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <VentureProvider>
            <EnterpriseShell>
              <Router />
            </EnterpriseShell>
            <Toaster richColors position="top-right" />
          </VentureProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
