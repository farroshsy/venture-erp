import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EnterpriseShell } from "@/components/EnterpriseShell";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { VentureProvider } from "./contexts/VentureContext";

const NotFound = lazy(() => import("@/pages/NotFound"));
const Architecture = lazy(() => import("./pages/Architecture"));
const ArchitectureGovernance = lazy(() => import("./pages/ArchitectureGovernance"));
const ArchitectureAssistant = lazy(() => import("./pages/ArchitectureAssistant"));
const AsiaOperations = lazy(() => import("./pages/AsiaOperations"));
const CrossBorderFinance = lazy(() => import("./pages/CrossBorderFinance"));
const AccessAdministration = lazy(() => import("./pages/AccessAdministration"));
const DecisionGovernance = lazy(() => import("./pages/DecisionGovernance"));
const ExecutiveArchitecture = lazy(() => import("./pages/ExecutiveArchitecture"));
const JournalControl = lazy(() => import("./pages/JournalControl"));
const ControlledFinanceReporting = lazy(() => import("./pages/ControlledFinanceReporting"));
const CostingControl = lazy(() => import("./pages/CostingControl"));
const InventoryControl = lazy(() => import("./pages/InventoryControl"));
const ProcurementControl = lazy(() => import("./pages/ProcurementControl"));
const SalesControl = lazy(() => import("./pages/SalesControl"));
const PeopleControl = lazy(() => import("./pages/PeopleControl"));
const DeliveryAssetsControl = lazy(() => import("./pages/DeliveryAssetsControl"));
const ServiceCrmControl = lazy(() => import("./pages/ServiceCrmControl"));
const WorkControl = lazy(() => import("./pages/WorkControl"));
const CashControl = lazy(() => import("./pages/CashControl"));
const OperationalInsights = lazy(() => import("./pages/OperationalInsights"));
const AutomationWorkbench = lazy(() => import("./pages/AutomationWorkbench"));
const ModuleCatalog = lazy(() => import("./pages/ModuleCatalog"));
const OperationsWorkspace = lazy(() => import("./pages/OperationsWorkspace"));
const PortfolioDashboard = lazy(() => import("./pages/PortfolioDashboard"));
const WorkspaceGuide = lazy(() => import("./pages/WorkspaceGuide"));
const DecisionIntelligence = lazy(() => import("./pages/DecisionIntelligence"));
const KnowledgeGraph = lazy(() => import("./pages/KnowledgeGraph"));
const OperatingSystem = lazy(() => import("./pages/OperatingSystem"));
const ValidationProgram = lazy(() => import("./pages/ValidationProgram"));

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
      <Route path={"/finance-reporting"} component={ControlledFinanceReporting} />
      <Route path={"/costing"} component={CostingControl} />
      <Route path={"/inventory"} component={InventoryControl} />
      <Route path={"/procurement"} component={ProcurementControl} />
      <Route path={"/sales"} component={SalesControl} />
      <Route path={"/people"} component={PeopleControl} />
      <Route path={"/delivery-assets"} component={DeliveryAssetsControl} />
      <Route path={"/service-crm"} component={ServiceCrmControl} />
      <Route path={"/work"} component={WorkControl} />
      <Route path={"/cash"} component={CashControl} />
      <Route path={"/insights"} component={OperationalInsights} />
      <Route path={"/automation"} component={AutomationWorkbench} />
      <Route path={"/asia"} component={AsiaOperations} />
      <Route path={"/cross-border"} component={CrossBorderFinance} />
      <Route path={"/decisions"} component={DecisionGovernance} />
      <Route path={"/architecture"} component={Architecture} />
      <Route path={"/guide"} component={WorkspaceGuide} />
      <Route path={"/intelligence"} component={DecisionIntelligence} />
      <Route path={"/knowledge-graph"} component={KnowledgeGraph} />
      <Route path={"/operating-system"} component={OperatingSystem} />
      <Route path={"/validation"} component={ValidationProgram} />
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
      <TooltipProvider>
          <VentureProvider>
            <EnterpriseShell>
              <Suspense fallback={<div className="rounded-2xl border border-[#dfe3dc] bg-white p-8 text-sm text-[#5f6f65]">Loading the selected operational workspace…</div>}>
                <Router />
              </Suspense>
            </EnterpriseShell>
            <Toaster richColors position="top-right" />
          </VentureProvider>
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
