import { describe, expect, it, vi } from "vitest";

vi.mock("../platform/tenant", () => ({ requireVentureMembership: vi.fn(), requireVentureRole: vi.fn() }));
vi.mock("../platform/externalEvidence", () => ({
  githubConnectionScopes: ["repository", "issues", "pull_requests", "commits", "releases"],
  createGitHubSourceConnection: vi.fn(),
  validateGitHubSourceConnection: vi.fn(),
  authorizeGitHubSourceConnection: vi.fn(),
  activateGitHubSourceConnection: vi.fn(),
  revokeGitHubSourceConnection: vi.fn(),
  acquireGitHubEvidence: vi.fn(),
  reviewExternalEvidence: vi.fn(),
  getExternalEvidenceOverview: vi.fn(),
}));

import { acquireGitHubEvidence, createGitHubSourceConnection, getExternalEvidenceOverview, reviewExternalEvidence } from "../platform/externalEvidence";
import { requireVentureMembership, requireVentureRole } from "../platform/tenant";
import { externalEvidenceRouter } from "./externalEvidence";

const ctx = { user: { id: 41, openId: "external-evidence-user", name: "External evidence user", email: "external-evidence@example.invalid", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never };
const membership = { id: 1, ventureId: 93, userId: 41, role: "venture_lead", status: "active", createdAt: new Date(), updatedAt: new Date() };
const policies = { authorizationReference: "Approved Gate 3 source scope for a single repository metadata evidence path.", retentionPolicy: "Retain only filtered, versioned evidence under the declared tenant policy and delete only through an approved procedure.", deletionProcedure: "A separately authorized custodian verifies scope, retention obligations, and deletion evidence before a future destructive workflow is introduced.", revocationProcedure: "Revoke future acquisition immediately when scope, authorization, or credential posture changes; preserve the audit rationale.", limitations: "One bounded manual GitHub page is external evidence only; it is not complete, authoritative ERP truth, metric truth, or an outcome claim." };

describe("Gate 3 external-evidence router", () => {
  it("refuses a selected-venture overview without active membership", async () => {
    vi.mocked(requireVentureMembership).mockRejectedValue(new Error("forbidden"));
    await expect(externalEvidenceRouter.createCaller(ctx).overview({ ventureId: 93 })).rejects.toThrow("forbidden");
    expect(getExternalEvidenceOverview).not.toHaveBeenCalled();
  });

  it("forwards a leader-scoped draft GitHub connection without a browser credential field", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue(membership);
    vi.mocked(createGitHubSourceConnection).mockResolvedValue({ id: 8, ventureId: 93, connectionKey: "engineering-evidence", status: "draft" } as never);
    const result = await externalEvidenceRouter.createCaller(ctx).createGitHubConnection({ ventureId: 93, connectionKey: "engineering-evidence", repositoryOwner: "farroshsy", repositoryName: "venture-erp", resourceScopes: ["repository", "issues"], dataClassification: "confidential", ...policies });
    expect(requireVentureRole).toHaveBeenCalledWith("venture_lead", ["portfolio_admin", "venture_lead"]);
    expect(createGitHubSourceConnection).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 93, createdByUserId: 41, repositoryOwner: "farroshsy", repositoryName: "venture-erp", resourceScopes: ["repository", "issues"] }));
    expect(JSON.stringify(vi.mocked(createGitHubSourceConnection).mock.calls[0][0])).not.toContain("token");
    expect(result).toMatchObject({ id: 8, status: "draft" });
  });

  it("enforces bounded known resource types before manual acquisition reaches the service", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue(membership);
    await expect(externalEvidenceRouter.createCaller(ctx).acquireGitHubEvidence({ ventureId: 93, connectionId: 8, runKey: "manual-one-page", resources: ["repository", "unapproved_scope"] as never, perResourceLimit: 25 })).rejects.toThrow();
    expect(acquireGitHubEvidence).not.toHaveBeenCalled();
  });

  it("forwards one human-triggered bounded acquisition with caller attribution", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue(membership);
    vi.mocked(acquireGitHubEvidence).mockResolvedValue({ id: 12, ventureId: 93, status: "completed", retainedCount: 1, duplicateCount: 0 } as never);
    const result = await externalEvidenceRouter.createCaller(ctx).acquireGitHubEvidence({ ventureId: 93, connectionId: 8, runKey: "manual-one-page", resources: ["repository"], perResourceLimit: 1 });
    expect(acquireGitHubEvidence).toHaveBeenCalledWith({ ventureId: 93, connectionId: 8, runKey: "manual-one-page", resources: ["repository"], perResourceLimit: 1, requestedByUserId: 41 });
    expect(result).toMatchObject({ id: 12, retainedCount: 1 });
  });

  it("hands an evidence decision to the separate-review service and exposes no-truth boundaries", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue(membership);
    vi.mocked(reviewExternalEvidence).mockResolvedValue({ id: 13, decision: "reviewed" } as never);
    vi.mocked(getExternalEvidenceOverview).mockResolvedValue({ boundary: { manualHumanTriggeredOnly: true, serverOnlyCredential: true, rawEvidenceBeforeProjection: true, noAutomaticErpTruth: true, noWebhook: true, noScheduler: true, noRepositoryMutation: true, noFinancialEffect: true, noPayrollEffect: true }, summary: { connectionCount: 0, evidenceRecordCount: 0 } } as never);
    const review = await externalEvidenceRouter.createCaller(ctx).reviewEvidence({ ventureId: 93, evidenceRecordId: 5, decision: "reviewed", rationale: "A different authorized reviewer confirms only retained source provenance and does not approve ERP truth." });
    const overview = await externalEvidenceRouter.createCaller(ctx).overview({ ventureId: 93 });
    expect(reviewExternalEvidence).toHaveBeenCalledWith(93, 5, "reviewed", "A different authorized reviewer confirms only retained source provenance and does not approve ERP truth.", 41);
    expect(review).toMatchObject({ decision: "reviewed" });
    expect(overview.boundary).toMatchObject({ manualHumanTriggeredOnly: true, serverOnlyCredential: true, rawEvidenceBeforeProjection: true, noAutomaticErpTruth: true, noWebhook: true, noScheduler: true, noRepositoryMutation: true, noFinancialEffect: true, noPayrollEffect: true });
  });
});
