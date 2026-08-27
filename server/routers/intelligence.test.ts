import { describe, expect, it, vi } from "vitest";

vi.mock("../platform/tenant", () => ({ requireVentureMembership: vi.fn() }));
vi.mock("../intelligence/service", () => ({ getDecisionIntelligenceOverview: vi.fn() }));
vi.mock("../intelligence/knowledgeGraph", () => ({ getEnterpriseKnowledgeGraph: vi.fn() }));

import { getDecisionIntelligenceOverview } from "../intelligence/service";
import { requireVentureMembership } from "../platform/tenant";
import { intelligenceRouter } from "./intelligence";
import { getEnterpriseKnowledgeGraph } from "../intelligence/knowledgeGraph";

const ctx = { user: { id: 22, openId: "intelligence-test-user", name: "Test user", email: "test@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never };

describe("Enterprise Intelligence router", () => {
  it("refuses metric evidence when active venture membership cannot be resolved", async () => {
    vi.mocked(requireVentureMembership).mockRejectedValue(new Error("forbidden"));
    await expect(intelligenceRouter.createCaller(ctx).overview({ ventureId: 91 })).rejects.toThrow("forbidden");
    expect(getDecisionIntelligenceOverview).not.toHaveBeenCalled();
  });

  it("forwards only the active tenant to the read-only metric evaluator", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, ventureId: 91, userId: 22, role: "viewer", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(getDecisionIntelligenceOverview).mockResolvedValue({ model: { name: "Enterprise Decision Intelligence Layer", version: "0.2-executive-read-only" }, metrics: [{ key: "operations.inventory_movements", status: "observed", value: 3 }], metricLedger: [{ ledgerEntryId: "MetricLedger:operations.inventory_movements:2026-08-27T00:00:00.000Z", metricKey: "operations.inventory_movements", persistence: "response_only_not_persisted" }], dependencyGraph: { posture: "dependency_and_evidence_context_not_causality_or_prediction" }, prioritySignals: [{ id: "coverage-company_value", investigationRoute: "/intelligence" }], boundary: { readOnlyMetricEvaluation: true, responseOnlyMetricLedger: true, noMetricPersistence: true, noJournalCreated: true, noPaymentExecution: true, noTaxCalculation: true, noPayrollCalculation: true, noFiling: true, noIntegrationTriggered: true, noAutonomousRecommendation: true, noExternalEffect: true } } as never);
    const result = await intelligenceRouter.createCaller(ctx).overview({ ventureId: 91 });
    expect(requireVentureMembership).toHaveBeenCalledWith(22, 91);
    expect(getDecisionIntelligenceOverview).toHaveBeenCalledWith(91);
    expect(result).toMatchObject({ model: { name: "Enterprise Decision Intelligence Layer", version: "0.2-executive-read-only" }, metrics: [expect.objectContaining({ key: "operations.inventory_movements", status: "observed", value: 3 })], metricLedger: [expect.objectContaining({ metricKey: "operations.inventory_movements", persistence: "response_only_not_persisted" })], dependencyGraph: { posture: "dependency_and_evidence_context_not_causality_or_prediction" }, prioritySignals: [expect.objectContaining({ id: "coverage-company_value", investigationRoute: "/intelligence" })], boundary: { readOnlyMetricEvaluation: true, responseOnlyMetricLedger: true, noMetricPersistence: true, noJournalCreated: true, noPaymentExecution: true, noTaxCalculation: true, noPayrollCalculation: true, noFiling: true, noIntegrationTriggered: true, noAutonomousRecommendation: true, noExternalEffect: true } });
  });
  it("forwards only the active tenant to the read-only retained-relationship graph", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, ventureId: 91, userId: 22, role: "viewer", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(getEnterpriseKnowledgeGraph).mockResolvedValue({ model: { name: "Enterprise Knowledge Graph" }, nodes: [{ id: "Metric:operations.inventory_movements" }], edges: [], boundary: { readOnlyProjection: true, noGraphPersistence: true, noSourceMutation: true, noRelationshipInference: true, noCausalityClaim: true, noPrediction: true, noRecommendation: true, noDecisionExecution: true, noFinancialEffect: true, noPayrollEffect: true, noExternalIntegration: true, noExternalEffect: true } } as never);
    const result = await intelligenceRouter.createCaller(ctx).knowledgeGraph({ ventureId: 91 });
    expect(requireVentureMembership).toHaveBeenCalledWith(22, 91);
    expect(getEnterpriseKnowledgeGraph).toHaveBeenCalledWith(91);
    expect(result).toMatchObject({ nodes: [expect.objectContaining({ id: "Metric:operations.inventory_movements" })], boundary: { readOnlyProjection: true, noRelationshipInference: true, noCausalityClaim: true, noPrediction: true, noRecommendation: true, noDecisionExecution: true, noFinancialEffect: true, noPayrollEffect: true, noExternalIntegration: true, noExternalEffect: true } });
  });
});
