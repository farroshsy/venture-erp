import type { ServiceEvidence, ServiceMaturityResult } from "@shared/domain/platform";

const evidenceLabels: Record<keyof ServiceEvidence, string> = {
  documentation: "service documentation and owned contract",
  unitTests: "unit-test evidence",
  contractTests: "contract-test evidence",
  integrationTests: "integration-test evidence",
  structuredLogs: "structured logging",
  metrics: "service metrics",
  traces: "correlation and distributed tracing",
  threatModel: "threat model",
  dependencyReview: "dependency review",
  rollbackPlan: "tested rollback plan",
  onCall: "operational ownership or on-call path",
  resilienceTest: "resilience-test evidence",
};

const evidenceWeights: Record<keyof ServiceEvidence, number> = {
  documentation: 8,
  unitTests: 10,
  contractTests: 12,
  integrationTests: 10,
  structuredLogs: 8,
  metrics: 8,
  traces: 8,
  threatModel: 8,
  dependencyReview: 6,
  rollbackPlan: 10,
  onCall: 6,
  resilienceTest: 6,
};

export function calculateServiceMaturity(evidence: ServiceEvidence): ServiceMaturityResult {
  const score = Object.entries(evidenceWeights).reduce((total, [key, weight]) => {
    return total + (evidence[key as keyof ServiceEvidence] ? weight : 0);
  }, 0);

  const missing = Object.entries(evidence)
    .filter(([, present]) => !present)
    .map(([key]) => evidenceLabels[key as keyof ServiceEvidence]);

  const l4Gate = evidence.resilienceTest && evidence.onCall && evidence.threatModel;
  const l3Gate = evidence.contractTests && evidence.integrationTests && evidence.metrics && evidence.traces && evidence.rollbackPlan;
  const l2Gate = evidence.documentation && evidence.unitTests && evidence.dependencyReview;
  const l1Gate = evidence.documentation;

  const level = score >= 90 && l4Gate
    ? "L4"
    : score >= 70 && l3Gate
      ? "L3"
      : score >= 50 && l2Gate
        ? "L2"
        : score >= 25 && l1Gate
          ? "L1"
          : "L0";

  return {
    score,
    level,
    missing,
    releaseEligible: level === "L3" || level === "L4",
  };
}
