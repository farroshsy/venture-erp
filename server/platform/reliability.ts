import { checkApplicationReadiness, getRuntimeHardeningProfile, type RuntimeReadiness } from "../_core/runtimeHardening";

type ReliabilityOverviewOptions = {
  readinessCheck?: () => Promise<RuntimeReadiness>;
  now?: () => Date;
};

export async function getProductionHardeningOverview(options: ReliabilityOverviewOptions = {}) {
  const readiness = await (options.readinessCheck ?? checkApplicationReadiness)();
  const runtime = getRuntimeHardeningProfile();
  const now = options.now ?? (() => new Date());

  return {
    generatedAt: now().toISOString(),
    posture: {
      program: "Gate 1 — Production Hardening",
      status: "in_progress" as const,
      conclusion: "Implemented request-time controls are visible; SLO attainment, alert coverage, recovery objectives, and production capacity remain unmeasured until governed evidence sources and drills exist.",
      scope: "Tenant access gates this operational review. The result exposes application-control posture, not tenant business data or user behavior telemetry.",
    },
    readiness,
    runtime,
    gates: [
      { gate: "Gate 1", title: "Production hardening", status: "in_progress" as const, exitCriterion: "Reliable, observable, secure, and recoverable controls are demonstrated by owned evidence and approved operating procedures.", currentEvidence: "Request correlation, bounded logs, liveness/readiness probes, security headers, rate-limit refusal, tests, and local-only capacity harness are being established.", remainingEvidence: "Measured SLI windows, alert routing, trace/metric retention, recovery drill, backup/restore ownership, security review, and production capacity evidence." },
      { gate: "Gate 2", title: "Adoption", status: "blocked_by_gate_1" as const, exitCriterion: "Independent users can complete real authorized workflows with minimal assistance.", currentEvidence: "Contextual help and human-recorded validation controls exist.", remainingEvidence: "Gate 1 exit and human-reviewed usability evidence." },
      { gate: "Gate 3", title: "Integrations and data acquisition", status: "blocked_by_gate_1_and_2" as const, exitCriterion: "Governed systems of record provide monitored, traceable evidence flows.", currentEvidence: "Source-contract readiness seams exist only.", remainingEvidence: "Gate 1 and Gate 2 exit, approved provider/source contract, credential, provenance, monitoring, and replay controls." },
      { gate: "Gate 4", title: "AI and decision intelligence", status: "blocked_by_gate_1_and_2" as const, exitCriterion: "Answers are grounded in authorized evidence with provenance and human review where required.", currentEvidence: "Evidence lineage, graph, decision memory, and AI readiness exist; model invocation does not.", remainingEvidence: "Gate 1 and Gate 2 exit, approved source controls, retrieval evaluation, privacy review, and human-review policy." },
      { gate: "Gate 5", title: "Commercialization", status: "blocked_by_prior_gates" as const, exitCriterion: "Operating and adoption evidence supports an explicit customer-facing service commitment.", currentEvidence: "Not started by design.", remainingEvidence: "Evidence from the earlier gates and a separate commercial governance decision." },
    ],
    workstreams: [
      { key: "reliability", title: "Reliability and observability", current: "Request-level correlation and bounded completion logging are implemented.", required: "Approved SLIs/SLOs, time-series collection, error-budget policy, alert routing, tracing, and retained incident evidence." },
      { key: "security", title: "Application security", current: "Browser-facing headers, request size limit, OAuth state validation, host-only OAuth state cookie, and API rate-limit refusal are present.", required: "Threat-model review, dependency/supply-chain evidence, penetration-test scope, secret-rotation evidence, and external edge protection where required." },
      { key: "recovery", title: "Recovery and continuity", current: "Checkpoint rollback exists for code. The managed platform owns its infrastructure; no application backup or restore drill has been run by this increment.", required: "Account-specific backup-status confirmation, owned recovery procedure, restore drill evidence, declared RTO/RPO method, and incident communications plan." },
      { key: "performance", title: "Performance and capacity", current: "A local-only health-probe harness is available; its output is intentionally limited to the machine, process, route, concurrency, and time actually exercised.", required: "Representative authorized workload, production-safe load method, capacity observations, database query profiling, and explicit limits." },
      { key: "integrity", title: "Data integrity and release safety", current: "Existing tenant isolation, immutable evidence, migration, and business-domain invariant tests remain the source of truth.", required: "Owned backup/restore evidence, migration rollback drill, concurrency and long-running recovery scenarios, and production incident/release evidence." },
    ],
    runbook: {
      liveProbe: "/healthz",
      readinessProbe: "/readyz",
      localCapacityCommand: "pnpm test:gate1-capacity",
      response: "Use an x-request-id from a user-observed failure to locate its bounded completion log. Do not interpret a successful probe as a full availability or recovery guarantee.",
    },
  };
}
