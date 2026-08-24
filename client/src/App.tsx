import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EnterpriseShell } from "@/components/EnterpriseShell";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { VentureProvider } from "./contexts/VentureContext";
import Architecture from "./pages/Architecture";
import ArchitectureGovernance from "./pages/ArchitectureGovernance";
import ArchitectureAssistant from "./pages/ArchitectureAssistant";
import AsiaOperations from "./pages/AsiaOperations";
import CrossBorderFinance from "./pages/CrossBorderFinance";
import AccessAdministration from "./pages/AccessAdministration";
import DecisionGovernance from "./pages/DecisionGovernance";
import ExecutiveArchitecture from "./pages/ExecutiveArchitecture";
import JournalControl from "./pages/JournalControl";
import InventoryControl from "./pages/InventoryControl";
import ProcurementControl from "./pages/ProcurementControl";
import WorkControl from "./pages/WorkControl";
import ModuleCatalog from "./pages/ModuleCatalog";
import OperationsWorkspace from "./pages/OperationsWorkspace";
import PortfolioDashboard from "./pages/PortfolioDashboard";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={PortfolioDashboard} />
      <Route path={"/executive"} component={ExecutiveArchitecture} />
      <Route path={"/governance"} component={ArchitectureGovernance} />
      <Route path={"/assistant"} component={ArchitectureAssistant} />
      <Route path={"/access"} component={AccessAdministration} />
      <Route path={"/modules"} component={ModuleCatalog} />
      <Route path={"/operations"} component={OperationsWorkspace} />
      <Route path={"/journals"} component={JournalControl} />
      <Route path={"/inventory"} component={InventoryControl} />
      <Route path={"/procurement"} component={ProcurementControl} />
      <Route path={"/work"} component={WorkControl} />
      <Route path={"/asia"} component={AsiaOperations} />
      <Route path={"/cross-border"} component={CrossBorderFinance} />
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
