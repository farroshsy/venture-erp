import { describe, expect, it, vi } from "vitest";

vi.mock("../platform/tenant", () => ({ requireVentureMembership: vi.fn(), requireVentureRole: vi.fn() }));
vi.mock("../intelligence/validationProgram", () => ({ getOperatingSystemValidationOverview: vi.fn(), createValidationBenchmark: vi.fn(), reviewValidationBenchmark: vi.fn(), createValidationObservation: vi.fn(), verifyValidationObservation: vi.fn() }));

import { createValidationBenchmark, createValidationObservation, getOperatingSystemValidationOverview } from "../intelligence/validationProgram";
import { requireVentureMembership, requireVentureRole } from "../platform/tenant";
import { validationProgramRouter } from "./validationProgram";

const ctx = { user: { id: 23, openId: "validation-program-user", name: "Test user", email: "test@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never };
const membership = { id: 1, ventureId: 92, userId: 23, role: "venture_lead", status: "active", createdAt: new Date(), updatedAt: new Date() };

describe("Operating System Validation Program router", () => {
  it("refuses the validation program when tenant membership is absent", async () => {
    vi.mocked(requireVentureMembership).mockRejectedValue(new Error("forbidden"));
    await expect(validationProgramRouter.createCaller(ctx).overview({ ventureId: 92 })).rejects.toThrow("forbidden");
    expect(getOperatingSystemValidationOverview).not.toHaveBeenCalled();
  });
  it("forwards a leader-scoped draft benchmark with human attribution and no automatic scoring authority", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue(membership); vi.mocked(createValidationBenchmark).mockResolvedValue({ id: 6, ventureId: 92, benchmarkKey: "release-proof", status: "draft" } as never);
    const result = await validationProgramRouter.createCaller(ctx).createBenchmark({ ventureId: 92, benchmarkKey: "release-proof", releaseLabel: "Validation release proof", limitations: "This is a structural evidence posture and does not certify quality, ROI, causality, user value, compliance, or business outcome." });
    expect(requireVentureRole).toHaveBeenCalledWith("venture_lead", ["portfolio_admin", "venture_lead"]);
    expect(createValidationBenchmark).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 92, createdByUserId: 23, benchmarkKey: "release-proof" }));
    expect(result).toMatchObject({ id: 6, status: "draft" });
  });
  it("forwards a human-recorded observation without browser telemetry or behavioral tracking inputs", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue(membership); vi.mocked(createValidationObservation).mockResolvedValue({ id: 7, ventureId: 92, observationKey: "question-proof", status: "recorded" } as never);
    const result = await validationProgramRouter.createCaller(ctx).createObservation({ ventureId: 92, observationKey: "question-proof", observationType: "executive_question", title: "Human-timed evidence review", outcome: "partial", durationSeconds: 42, subjectType: "workspace", subjectReference: "Workspace:/intelligence", evidenceSnapshot: { manuallyMeasured: true }, limitations: "The human-recorded observation does not establish causality, adoption, ROI, or overall effectiveness.", occurredAt: new Date("2026-08-27T00:00:00.000Z") });
    expect(createValidationObservation).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 92, createdByUserId: 23, durationSeconds: 42, subjectReference: "Workspace:/intelligence" }));
    expect(result).toMatchObject({ id: 7, status: "recorded" });
  });
  it("returns only bounded structural validation posture, not an autonomous score, prediction, or effect", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue(membership); vi.mocked(getOperatingSystemValidationOverview).mockResolvedValue({ currentBenchmark: { status: "preview_not_persisted" }, boundary: { requestTimeReadOnlyProjections: true, humanRecordedValidationOnly: true, noAutomaticBehaviorTracking: true, noCausalInference: true, noForecast: true, noScenarioCalculation: true, noRecommendation: true, noDecisionExecution: true, noFinancialEffect: true, noPayrollEffect: true, noExternalCollection: true, noExternalEffect: true } } as never);
    const result = await validationProgramRouter.createCaller(ctx).overview({ ventureId: 92 });
    expect(result.currentBenchmark.status).toBe("preview_not_persisted");
    expect(result.boundary).toMatchObject({ requestTimeReadOnlyProjections: true, humanRecordedValidationOnly: true, noAutomaticBehaviorTracking: true, noCausalInference: true, noForecast: true, noScenarioCalculation: true, noRecommendation: true, noDecisionExecution: true, noFinancialEffect: true, noPayrollEffect: true, noExternalCollection: true, noExternalEffect: true });
  });
});
