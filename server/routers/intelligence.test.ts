import { describe, expect, it, vi } from "vitest";

vi.mock("../platform/tenant", () => ({ requireVentureMembership: vi.fn() }));
vi.mock("../intelligence/service", () => ({ getDecisionIntelligenceOverview: vi.fn() }));

import { getDecisionIntelligenceOverview } from "../intelligence/service";
import { requireVentureMembership } from "../platform/tenant";
import { intelligenceRouter } from "./intelligence";

const ctx = { user: { id: 22, openId: "intelligence-test-user", name: "Test user", email: "test@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never };

describe("Enterprise Intelligence router", () => {
  it("refuses metric evidence when active venture membership cannot be resolved", async () => {
    vi.mocked(requireVentureMembership).mockRejectedValue(new Error("forbidden"));
    await expect(intelligenceRouter.createCaller(ctx).overview({ ventureId: 91 })).rejects.toThrow("forbidden");
    expect(getDecisionIntelligenceOverview).not.toHaveBeenCalled();
  });

  it("forwards only the active tenant to the read-only metric evaluator", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, ventureId: 91, userId: 22, role: "viewer", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(getDecisionIntelligenceOverview).mockResolvedValue({ model: { name: "Enterprise Decision Intelligence Layer" }, metrics: [{ key: "operations.inventory_movements", status: "observed", value: 3 }], boundary: { readOnlyMetricEvaluation: true, noMetricPersistence: true, noJournalCreated: true, noPaymentExecution: true, noTaxCalculation: true, noPayrollCalculation: true, noFiling: true, noIntegrationTriggered: true, noExternalEffect: true } } as never);
    const result = await intelligenceRouter.createCaller(ctx).overview({ ventureId: 91 });
    expect(requireVentureMembership).toHaveBeenCalledWith(22, 91);
    expect(getDecisionIntelligenceOverview).toHaveBeenCalledWith(91);
    expect(result).toMatchObject({ model: { name: "Enterprise Decision Intelligence Layer" }, metrics: [expect.objectContaining({ key: "operations.inventory_movements", status: "observed", value: 3 })], boundary: { readOnlyMetricEvaluation: true, noMetricPersistence: true, noJournalCreated: true, noPaymentExecution: true, noTaxCalculation: true, noPayrollCalculation: true, noFiling: true, noIntegrationTriggered: true, noExternalEffect: true } });
  });
});
