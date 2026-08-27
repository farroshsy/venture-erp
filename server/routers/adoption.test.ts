import { describe, expect, it, vi } from "vitest";

vi.mock("../platform/tenant", () => ({ requireVentureMembership: vi.fn(), requireVentureRole: vi.fn() }));
vi.mock("../platform/adoption", () => ({
  adoptionJourneys: [
    { key: "procurement_evidence", title: "Procurement evidence" },
    { key: "sales_fulfillment_evidence", title: "Sales evidence" },
    { key: "payable_match", title: "Payable match" },
    { key: "work_lifecycle", title: "Work lifecycle" },
    { key: "decision_lineage", title: "Decision lineage" },
    { key: "audit_traceability", title: "Audit traceability" },
    { key: "payroll_blocker_comprehension", title: "Payroll blocker" },
  ],
  roleLenses: [{ key: "operator" }, { key: "finance_lead" }, { key: "approver" }, { key: "auditor" }, { key: "executive" }, { key: "administrator" }],
  createAdoptionStudy: vi.fn(),
  reviewAdoptionStudy: vi.fn(),
  createAdoptionObservation: vi.fn(),
  verifyAdoptionObservation: vi.fn(),
  getAdoptionOverview: vi.fn(),
}));

import { createAdoptionObservation, createAdoptionStudy, getAdoptionOverview } from "../platform/adoption";
import { requireVentureMembership, requireVentureRole } from "../platform/tenant";
import { adoptionRouter } from "./adoption";

const ctx = { user: { id: 31, openId: "adoption-user", name: "Adoption user", email: "adoption@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never };
const membership = { id: 1, ventureId: 93, userId: 31, role: "venture_lead", status: "active", createdAt: new Date(), updatedAt: new Date() };
const limitations = "This small human-recorded task observation does not establish adoption, usability, satisfaction, production readiness, compliance, or business value.";

describe("Gate 2 adoption router", () => {
  it("refuses adoption reads when selected-venture membership is absent", async () => {
    vi.mocked(requireVentureMembership).mockRejectedValue(new Error("forbidden"));
    await expect(adoptionRouter.createCaller(ctx).overview({ ventureId: 93 })).rejects.toThrow("forbidden");
    expect(getAdoptionOverview).not.toHaveBeenCalled();
  });

  it("forwards a leader-scoped draft protocol with creator attribution and selected journeys", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue(membership);
    vi.mocked(createAdoptionStudy).mockResolvedValue({ id: 8, ventureId: 93, studyKey: "independent-q3", status: "draft" } as never);
    const result = await adoptionRouter.createCaller(ctx).createStudy({ ventureId: 93, studyKey: "independent-q3", title: "Independent operator journey study", purpose: "Observe whether an independent participant can use a bounded retained-evidence workflow without developer intervention.", journeyKeys: ["procurement_evidence", "payroll_blocker_comprehension"], consentNotice: "Participation is voluntary, may stop at any time, and uses only a pseudonymous participant reference.", independencePolicy: "The participant must not have built the feature; retain declared independence without identity or employment details.", limitations });
    expect(requireVentureRole).toHaveBeenCalledWith("venture_lead", ["portfolio_admin", "venture_lead"]);
    expect(createAdoptionStudy).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 93, createdByUserId: 31, studyKey: "independent-q3", journeyKeys: ["procurement_evidence", "payroll_blocker_comprehension"] }));
    expect(result).toMatchObject({ id: 8, status: "draft" });
  });

  it("requires explicit consent before an observation can reach persistence", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue(membership);
    await expect(adoptionRouter.createCaller(ctx).createObservation({ ventureId: 93, studyId: 8, observationKey: "task-01", participantReference: "participant_01", participantIndependence: "declared_independent", roleLens: "operator", journeyKey: "procurement_evidence", outcome: "completed_unassisted", assistanceCount: 0, errorCount: 0, retryCount: 0, helpUsed: false, evidenceGapEncountered: false, limitations, consentConfirmed: false as never, occurredAt: new Date("2026-08-27T00:00:00.000Z") })).rejects.toThrow();
    expect(createAdoptionObservation).not.toHaveBeenCalled();
  });

  it("forwards only facilitator-entered human-recorded measures and no behavioral event stream", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue(membership);
    vi.mocked(createAdoptionObservation).mockResolvedValue({ id: 9, ventureId: 93, observationKey: "task-02", status: "recorded" } as never);
    const result = await adoptionRouter.createCaller(ctx).createObservation({ ventureId: 93, studyId: 8, observationKey: "task-02", participantReference: "participant_02", participantIndependence: "declared_independent", roleLens: "operator", journeyKey: "procurement_evidence", outcome: "completed_with_assistance", taskStartedAt: new Date("2026-08-27T00:00:00.000Z"), taskEndedAt: new Date("2026-08-27T00:01:12.000Z"), assistanceCount: 1, errorCount: 0, retryCount: 1, helpUsed: true, evidenceGapEncountered: true, refusalOrRecovery: "evidence_missing", evidenceReference: "Workspace:/procurement", limitations, consentConfirmed: true, occurredAt: new Date("2026-08-27T00:01:12.000Z") });
    expect(createAdoptionObservation).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 93, createdByUserId: 31, participantReference: "participant_02", assistanceCount: 1, helpUsed: true, evidenceGapEncountered: true, consentConfirmed: true }));
    expect(result).toMatchObject({ id: 9, status: "recorded" });
  });

  it("returns an explicit evidence-only posture rather than automatic analytics or an adoption claim", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue(membership);
    vi.mocked(getAdoptionOverview).mockResolvedValue({ boundary: { humanRecordedOnly: true, automaticBehaviorTracking: false, externalTelemetry: false, identityProfiling: false, noFinancialEffect: true, noPayrollEffect: true, noExternalEffect: true }, summary: { verifiedIndependentObservationCount: 0, verifiedCompletionRate: null } } as never);
    const result = await adoptionRouter.createCaller(ctx).overview({ ventureId: 93 });
    expect(result.boundary).toMatchObject({ humanRecordedOnly: true, automaticBehaviorTracking: false, externalTelemetry: false, identityProfiling: false, noFinancialEffect: true, noPayrollEffect: true, noExternalEffect: true });
    expect(result.summary).toMatchObject({ verifiedIndependentObservationCount: 0, verifiedCompletionRate: null });
  });
});
