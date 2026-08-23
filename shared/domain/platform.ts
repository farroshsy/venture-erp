export const ventureRoles = [
  "portfolio_admin",
  "venture_lead",
  "finance_lead",
  "operator",
  "viewer",
] as const;

export type VentureRole = (typeof ventureRoles)[number];

export const moduleHealthStates = ["healthy", "attention", "planned"] as const;
export type ModuleHealth = (typeof moduleHealthStates)[number];

export type ServiceEvidence = {
  documentation: boolean;
  unitTests: boolean;
  contractTests: boolean;
  integrationTests: boolean;
  structuredLogs: boolean;
  metrics: boolean;
  traces: boolean;
  threatModel: boolean;
  dependencyReview: boolean;
  rollbackPlan: boolean;
  onCall: boolean;
  resilienceTest: boolean;
};

export type ServiceMaturityLevel = "L0" | "L1" | "L2" | "L3" | "L4";

export type PlatformModule = {
  id: string;
  name: string;
  boundedContext: string;
  businessOwner: string;
  engineeringOwner: string;
  dataAuthority: string;
  release: string;
  contract: string;
  health: ModuleHealth;
  deploymentMode: "service-aligned" | "independent-service";
  releaseIndependence: "contract-gated" | "independent";
  description: string;
  dependencies: string[];
  evidence: ServiceEvidence;
};

export type ServiceMaturityResult = {
  score: number;
  level: ServiceMaturityLevel;
  missing: string[];
  releaseEligible: boolean;
};

export type DecisionCriterionKey =
  | "differentiation"
  | "compliance"
  | "integration"
  | "totalCost"
  | "lockIn"
  | "deliveryCapacity";

export const decisionCriterionLabels: Record<DecisionCriterionKey, string> = {
  differentiation: "Process differentiation",
  compliance: "Compliance fit",
  integration: "Integration complexity",
  totalCost: "Total cost of ownership",
  lockIn: "Vendor lock-in exposure",
  deliveryCapacity: "Delivery capacity",
};

export const decisionPaths = ["sap", "alternative", "custom"] as const;
export type DecisionPath = (typeof decisionPaths)[number];
