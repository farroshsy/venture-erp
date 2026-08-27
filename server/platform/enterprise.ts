import type { ArchitectureDecision, PlatformModule } from "@shared/domain/platform";
import { getModuleCatalog } from "./catalog";

export const architectureDecisions: ArchitectureDecision[] = [
  {
    id: "ADR-001", title: "Service-aligned microservices-first evolution", status: "accepted", decidedAt: "2026-08-23", owner: "Enterprise Architecture", contexts: ["platform-kernel", "portfolio-governance"], impact: "high", reviewStatus: "monitoring",
    rejectedAlternatives: ["Immediate physical microservices", "Feature-folder monolith", "Unbounded vendor-core customization"], summary: "Keep independently evolvable boundaries now; extract only when operational evidence outweighs the distributed-systems cost.",
  },
  {
    id: "ADR-002", title: "Venture isolation through membership-scoped access", status: "accepted", decidedAt: "2026-08-23", owner: "Platform Engineering", contexts: ["platform-kernel", "decision-governance"], impact: "high", reviewStatus: "approved",
    rejectedAlternatives: ["Client-selected tenant filter", "Shared access without membership enforcement"], summary: "Every venture record and query must resolve an active membership before access is permitted.",
  },
  {
    id: "ADR-003", title: "AI-assisted evidence review requires human approval", status: "accepted", decidedAt: "2026-08-23", owner: "Enterprise Architecture", contexts: ["decision-governance"], impact: "high", reviewStatus: "monitoring",
    rejectedAlternatives: ["Automatic AI approval", "Unstructured generic chat"], summary: "Models can prepare evidence analysis but code enforces human approval before any governance decision is recorded.",
  },
  {
    id: "ADR-004", title: "Contract versioning and context-owned eventing", status: "accepted", decidedAt: "2026-08-23", owner: "Platform Engineering", contexts: ["platform-kernel", "finance", "procurement", "inventory", "people", "project-operations"], impact: "high", reviewStatus: "scheduled",
    rejectedAlternatives: ["Private table dependencies", "Coordinated releases as the integration mechanism"], summary: "Contexts publish compatible APIs or events, own their data, and carry a consumer migration window for breaking changes.",
  },
  {
    id: "ADR-005", title: "Operational readiness precedes independent release", status: "accepted", decidedAt: "2026-08-23", owner: "Platform Engineering", contexts: ["platform-kernel", "portfolio-governance", "decision-governance"], impact: "medium", reviewStatus: "monitoring",
    rejectedAlternatives: ["Deploy first and document later", "Endpoint count as a microservice maturity signal"], summary: "L3 release independence requires observability, tests, runbook, security evidence, rollback rehearsal, and an owned support posture.",
  },
  {
    id: "ADR-006", title: "Staged service extraction", status: "accepted", decidedAt: "2026-08-23", owner: "Enterprise Architecture", contexts: ["finance", "procurement", "inventory", "people", "project-operations"], impact: "high", reviewStatus: "scheduled",
    rejectedAlternatives: ["Split every feature now", "Wait until the monolith is unmaintainable"], summary: "Move a context through contract hardening, dedicated data, staged traffic, and rollback rehearsal before federated operation.",
  },
];

export const platformDocumentationIndex = [
  { id: "doc:executive-handbook", title: "Executive Architecture Handbook", summary: "Operating philosophy, domain ownership, service maturity, extraction roadmap, and leadership measures.", path: "docs/EXECUTIVE-ARCHITECTURE-HANDBOOK.md" },
  { id: "doc:bounded-contexts", title: "Bounded Contexts", summary: "Business boundaries, data authority, stable interfaces, and extraction signals for ERP capabilities.", path: "docs/architecture/BOUNDED-CONTEXTS.md" },
  { id: "doc:migration-roadmap", title: "Migration Roadmap", summary: "The staged move from a service-aligned foundation toward federated services with rollback controls.", path: "docs/architecture/MIGRATION-ROADMAP.md" },
  { id: "doc:service-maturity", title: "Service Maturity", summary: "L0–L3 readiness evidence for documentation, testing, observability, security, resilience, and support.", path: "docs/platform/SERVICE-MATURITY.md" },
  { id: "doc:enterprise-implementation", title: "Enterprise Platform Implementation Guide", summary: "Control-plane trade-offs, IAM and assistant operating cost, observability integration path, rollback posture, and multi-year roadmap.", path: "docs/architecture/ENTERPRISE-PLATFORM-IMPLEMENTATION.md" },
  { id: "doc:gate-1-production-hardening", title: "Gate 1 Production Hardening", summary: "Successive Gate 1–5 maturity roadmap, implemented request-time controls, local validation scope, recovery ownership, and exit evidence.", path: "docs/architecture/GATE-1-PRODUCTION-HARDENING-DESIGN.md" },
  { id: "doc:control-plane-design", title: "Platform Control Plane Design", summary: "Source-of-truth rules, assistant retrieval policy, authorization boundaries, and dashboard truthfulness constraints.", path: "docs/architecture/PLATFORM-CONTROL-PLANE-DESIGN.md" },
];

const capabilityByModule: Record<string, string> = {
  "platform-kernel": "Identity, access, tenancy, and contract policy",
  "portfolio-governance": "Portfolio stewardship and operating visibility",
  finance: "Financial control and close readiness",
  procurement: "Source-to-approve purchasing",
  inventory: "Availability and reservation management",
  people: "Workforce reference and privacy-aware approvals",
  "project-operations": "Delivery execution and initiative health",
  "decision-governance": "Architecture and build-versus-buy decision governance",
};

const lifecycleByModule: Record<string, "planned" | "incubating" | "operational" | "strategic"> = {
  "platform-kernel": "strategic", "portfolio-governance": "operational", finance: "incubating", procurement: "planned", inventory: "planned", people: "incubating", "project-operations": "operational", "decision-governance": "strategic",
};

const securityByModule: Record<string, "reviewed" | "in-review" | "not-started"> = {
  "platform-kernel": "reviewed", "portfolio-governance": "reviewed", finance: "in-review", procurement: "not-started", inventory: "not-started", people: "in-review", "project-operations": "in-review", "decision-governance": "reviewed",
};

export function getEnterpriseCatalog() {
  return getModuleCatalog().map(module => ({
    ...module,
    businessCapability: capabilityByModule[module.id] ?? module.boundedContext,
    lifecycle: lifecycleByModule[module.id] ?? "planned",
    securityPosture: securityByModule[module.id] ?? "not-started",
    runbookStatus: module.evidence.rollbackPlan ? "available" : "planned",
    adrIds: architectureDecisions.filter(adr => adr.contexts.includes(module.id)).map(adr => adr.id),
    apiSurface: [module.contract],
    eventSurface: module.id === "platform-kernel" ? ["venture.scope-resolved.v1"] : [`${module.id}.state-changed.v1`],
    consumers: getModuleCatalog().filter(candidate => candidate.dependencies.includes(module.id)).map(candidate => candidate.id),
    extractionReadiness: module.maturity.releaseEligible ? "eligible" : module.maturity.level === "L2" ? "hardening" : "evidence-needed",
  }));
}

export function getArchitectureGovernance() {
  const decisions = [...architectureDecisions].sort((left, right) => right.decidedAt.localeCompare(left.decidedAt));
  const modules = getEnterpriseCatalog();
  return {
    decisions,
    timeline: decisions.map((decision, index) => ({ ...decision, sequence: decisions.length - index })),
    contextImpact: modules.map(module => ({
      moduleId: module.id,
      moduleName: module.name,
      adrIds: module.adrIds,
      impact: architectureDecisions.filter(adr => adr.contexts.includes(module.id)).some(adr => adr.impact === "high") ? "high" : "medium",
    })),
    technicalDebt: modules.flatMap(module => module.maturity.missing.map(gap => ({ id: `${module.id}:${gap}`, moduleId: module.id, moduleName: module.name, item: gap, owner: module.engineeringOwner, status: "open" as const }))),
    risks: modules.filter(module => module.health === "attention" || module.securityPosture !== "reviewed").map(module => ({
      id: `risk:${module.id}`,
      title: `${module.name} control evidence gap`,
      context: module.name,
      level: module.health === "attention" ? "high" as const : "medium" as const,
      treatment: module.securityPosture === "not-started" ? "Start threat-model and dependency review before operating controls are connected." : "Complete maturity-scorecard evidence and review the extraction posture.",
    })),
    reviews: decisions.map(decision => ({ id: `review:${decision.id}`, adrId: decision.id, owner: decision.owner, status: decision.reviewStatus, nextAction: decision.reviewStatus === "scheduled" ? "Schedule design review and consumer impact check." : "Monitor assumptions and revisit at the next platform planning cycle." })),
    standards: [
      { name: "Contract-first delivery", status: "enforced", detail: "Public contract validator and compatible-release policy are in the quality gate." },
      { name: "Tenant boundary", status: "enforced", detail: "Membership checks protect every venture-scoped API path." },
      { name: "Operational readiness", status: "governed", detail: "L3 requires scorecard evidence, runbook, rollback, and deployment verification." },
      { name: "Gate 1 request-time hardening", status: "implemented", detail: "Correlation IDs, bounded completion logs, liveness/readiness, browser-facing headers, and per-process API rate-limit refusal are implemented; SLOs, alerts, and recovery drills remain unmeasured." },
      { name: "Evidence-bounded AI", status: "enforced", detail: "Architecture assistant receives authorized platform evidence only and cannot act." },
    ],
    roadmap: [
      { stage: "Gate 1", title: "Production hardening", detail: "Build evidence for reliability, security, recovery, performance, integrity, and operating ownership before extending data or AI surfaces." },
      { stage: "Gate 2", title: "Adoption", detail: "Use human-reviewed evidence to establish that independent users can safely complete real authorized workflows." },
      { stage: "Gate 3", title: "Integrations and data acquisition", detail: "Connect governed systems of record only after hardening/adoption evidence supports monitored provenance, failure visibility, and replay." },
      { stage: "Gate 4", title: "AI and decision intelligence", detail: "Enable evidence-grounded retrieval only after source, authorization, provenance, privacy, and human-review controls are proven." },
      { stage: "Gate 5", title: "Commercialization", detail: "Make customer-facing commitments only after operating and adoption evidence justifies them." },
    ],
    rfcSeam: { status: "planned", description: "RFC records are intentionally modeled as a governance extension point. ADRs remain the durable decision record until review workflow and document integration are introduced." },
  };
}

export function getExecutiveArchitectureProjection() {
  const modules = getEnterpriseCatalog();
  const ready = modules.filter(module => module.maturity.releaseEligible).length;
  const evidenceNeeded = modules.filter(module => module.extractionReadiness === "evidence-needed").length;
  const technicalDebt = modules.flatMap(module => module.maturity.missing.map(gap => ({ moduleId: module.id, moduleName: module.name, gap, severity: module.health === "attention" ? "high" : "medium" })));

  return {
    modules,
    architecture: {
      adrCount: architectureDecisions.length,
      highImpactDecisions: architectureDecisions.filter(adr => adr.impact === "high").length,
      acceptedDecisions: architectureDecisions.filter(adr => adr.status === "accepted").length,
      dependencyEdges: modules.reduce((total, module) => total + module.dependencies.length, 0),
    },
    maturity: {
      releaseReady: ready,
      hardening: modules.filter(module => module.extractionReadiness === "hardening").length,
      evidenceNeeded,
      averageScore: Math.round(modules.reduce((total, module) => total + module.maturity.score, 0) / Math.max(modules.length, 1)),
    },
    technicalDebt,
    kpiDefinitions: [
      { id: "deployment-frequency", name: "Deployment frequency", status: "integration-needed", source: "Future CI/CD provider" },
      { id: "change-failure-rate", name: "Change failure rate", status: "integration-needed", source: "Future deployment and incident sources" },
      { id: "mttr", name: "Mean time to recovery", status: "integration-needed", source: "Future incident and observability sources" },
      { id: "contract-compatibility", name: "Contract compatibility", status: "governed", source: "Contract validation workflow" },
      { id: "service-maturity", name: "Service maturity", status: "governed", source: "Catalog evidence scorecards" },
    ],
  };
}

export function getPlatformDocumentationIndex() {
  return platformDocumentationIndex;
}

export function getModuleById(moduleId: string): PlatformModule | undefined {
  return getModuleCatalog().find(module => module.id === moduleId);
}
