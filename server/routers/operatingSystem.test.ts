import { describe, expect, it, vi } from "vitest";

vi.mock("../platform/tenant", () => ({ requireVentureMembership: vi.fn(), requireVentureRole: vi.fn() }));
vi.mock("../intelligence/operatingSystem", () => ({ getOperatingSystemOverview: vi.fn(), createStrategicObjective: vi.fn(), activateStrategicObjective: vi.fn(), createKeyResult: vi.fn(), setKeyResultStatus: vi.fn(), createDecisionMemory: vi.fn(), approveDecisionMemory: vi.fn(), recordDecisionLearning: vi.fn(), createScenarioPreparation: vi.fn(), approveScenarioPreparation: vi.fn(), createExternalSourceContract: vi.fn(), approveExternalSourceContract: vi.fn(), createEvidenceLink: vi.fn() }));

import { requireVentureMembership, requireVentureRole } from "../platform/tenant";
import { createStrategicObjective, getOperatingSystemOverview } from "../intelligence/operatingSystem";
import { operatingSystemRouter } from "./operatingSystem";

const ctx = { user: { id: 22, openId: "operating-system-user", name: "Test user", email: "test@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never };
const activeMembership = { id: 1, ventureId: 91, userId: 22, role: "venture_lead", status: "active", createdAt: new Date(), updatedAt: new Date() };

describe("Enterprise Operating System router", () => {
  it("refuses planning reads and writes when active tenant membership cannot be resolved", async () => {
    vi.mocked(requireVentureMembership).mockRejectedValue(new Error("forbidden"));
    await expect(operatingSystemRouter.createCaller(ctx).overview({ ventureId: 91 })).rejects.toThrow("forbidden");
    expect(getOperatingSystemOverview).not.toHaveBeenCalled();
  });
  it("forwards a leader-scoped objective draft with actor attribution and no execution effect", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue(activeMembership);
    vi.mocked(createStrategicObjective).mockResolvedValue({ id: 5, ventureId: 91, objectiveKey: "proof-objective", status: "draft" } as never);
    const result = await operatingSystemRouter.createCaller(ctx).createObjective({ ventureId: 91, objectiveKey: "proof-objective", title: "Preserve evidence-first planning", description: "Create a test-scoped strategic objective with an explicit retained evidence requirement.", periodStart: "2026-08-27", periodEnd: "2026-12-31", evidenceRequirement: "Use only tenant-scoped retained evidence and separately approved review." });
    expect(requireVentureMembership).toHaveBeenCalledWith(22, 91);
    expect(requireVentureRole).toHaveBeenCalledWith("venture_lead", ["portfolio_admin", "venture_lead"]);
    expect(createStrategicObjective).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 91, createdByUserId: 22, objectiveKey: "proof-objective" }));
    expect(result).toMatchObject({ id: 5, ventureId: 91, status: "draft" });
  });
  it("returns planning boundaries without predicting, collecting, recommending, or executing", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue(activeMembership);
    vi.mocked(getOperatingSystemOverview).mockResolvedValue({ boundary: { humanGovernedRecords: true, noForecastCalculation: true, noScenarioSimulation: true, noCausalityClaim: true, noRecommendation: true, noDecisionExecution: true, noExternalCollection: true, noFinancialEffect: true, noPayrollEffect: true, noExternalEffect: true } } as never);
    const result = await operatingSystemRouter.createCaller(ctx).overview({ ventureId: 91 });
    expect(result.boundary).toMatchObject({ humanGovernedRecords: true, noForecastCalculation: true, noScenarioSimulation: true, noCausalityClaim: true, noRecommendation: true, noDecisionExecution: true, noExternalCollection: true, noFinancialEffect: true, noPayrollEffect: true, noExternalEffect: true });
  });
});
