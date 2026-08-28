import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { eosExternalAcquisitionRuns, eosExternalEvidenceRecords, eosExternalEvidenceReviews, eosExternalSourceConnections, erpJournals, users, ventureMemberships, ventures } from "../../drizzle/schema";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db";
import { appRouter } from "../routers";

const reviewerOpenId = "gate3_evidence_reviewer_20260827";
const outsiderOpenId = "gate3_evidence_outsider_20260827";
const fixtureKey = `e2e-fixture-github-evidence-${Date.now()}`;
const fixtureVentureSlug = `e2e-gate3-evidence-${Date.now()}`;
let reviewerUserId = 0;
let outsiderUserId = 0;
let fixtureVentureId = 0;
let connectionId = 0;
let runId = 0;
let evidenceId = 0;
let createdCreatorMembership = false;
let createdReviewerMembership = false;
let createdReviewerUser = false;
let createdOutsiderUser = false;

function callerFor(userId: number, openId: string) {
  return appRouter.createCaller({ user: { id: userId, openId, email: `${openId}@example.invalid`, name: openId, loginMethod: "validation", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });
}

beforeAll(async () => {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  const [fixtureVenture] = await db.insert(ventures).values({ slug: fixtureVentureSlug, name: "E2E Gate 3 Evidence Isolation", legalName: "E2E Gate 3 Evidence Isolation", status: "active", baseCurrency: "USD", timezone: "UTC" }).$returningId();
  fixtureVentureId = fixtureVenture.id;
  const [creatorMembership] = await db.select().from(ventureMemberships).where(and(eq(ventureMemberships.ventureId, fixtureVentureId), eq(ventureMemberships.userId, 1))).limit(1);
  if (!creatorMembership) { await db.insert(ventureMemberships).values({ ventureId: fixtureVentureId, userId: 1, role: "venture_lead", status: "active" }); createdCreatorMembership = true; }
  let [reviewer] = await db.select().from(users).where(eq(users.openId, reviewerOpenId)).limit(1);
  if (!reviewer) { await db.insert(users).values({ openId: reviewerOpenId, name: "VALIDATION Gate 3 Reviewer", email: "gate3-reviewer@example.invalid", loginMethod: "validation", role: "user" }); [reviewer] = await db.select().from(users).where(eq(users.openId, reviewerOpenId)).limit(1); createdReviewerUser = true; }
  reviewerUserId = reviewer!.id;
  const [membership] = await db.select().from(ventureMemberships).where(and(eq(ventureMemberships.ventureId, fixtureVentureId), eq(ventureMemberships.userId, reviewerUserId))).limit(1);
  if (!membership) { await db.insert(ventureMemberships).values({ ventureId: fixtureVentureId, userId: reviewerUserId, role: "venture_lead", status: "active" }); createdReviewerMembership = true; }
  let [outsider] = await db.select().from(users).where(eq(users.openId, outsiderOpenId)).limit(1);
  if (!outsider) { await db.insert(users).values({ openId: outsiderOpenId, name: "VALIDATION Gate 3 Outsider", email: "gate3-outsider@example.invalid", loginMethod: "validation", role: "user" }); [outsider] = await db.select().from(users).where(eq(users.openId, outsiderOpenId)).limit(1); createdOutsiderUser = true; }
  outsiderUserId = outsider!.id;
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  if (evidenceId) await db.delete(eosExternalEvidenceReviews).where(eq(eosExternalEvidenceReviews.evidenceRecordId, evidenceId));
  if (runId) await db.delete(eosExternalEvidenceRecords).where(eq(eosExternalEvidenceRecords.acquisitionRunId, runId));
  if (runId) await db.delete(eosExternalAcquisitionRuns).where(eq(eosExternalAcquisitionRuns.id, runId));
  if (connectionId) await db.delete(eosExternalSourceConnections).where(eq(eosExternalSourceConnections.id, connectionId));
  if (createdReviewerMembership) await db.delete(ventureMemberships).where(and(eq(ventureMemberships.ventureId, fixtureVentureId), eq(ventureMemberships.userId, reviewerUserId)));
  if (createdCreatorMembership) await db.delete(ventureMemberships).where(and(eq(ventureMemberships.ventureId, fixtureVentureId), eq(ventureMemberships.userId, 1)));
  if (fixtureVentureId) await db.delete(ventures).where(eq(ventures.id, fixtureVentureId));
  if (createdReviewerUser) await db.delete(users).where(eq(users.id, reviewerUserId));
  if (createdOutsiderUser) await db.delete(users).where(eq(users.id, outsiderUserId));
});

describe("Gate 3 GitHub external-evidence real lifecycle", () => {
  it("uses one approved repository source as filtered evidence without source truth, automatic refresh, journal effect, or retained test fixture", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is not available.");
    const creator = callerFor(1, "owner");
    const reviewer = callerFor(reviewerUserId, reviewerOpenId);
    const outsider = callerFor(outsiderUserId, outsiderOpenId);
    const journalsBefore = (await db.select().from(erpJournals).where(eq(erpJournals.ventureId, fixtureVentureId))).length;
    await expect(outsider.externalEvidence.overview({ ventureId: fixtureVentureId })).rejects.toThrow();
    const connection = await creator.externalEvidence.createGitHubConnection({ ventureId: fixtureVentureId, connectionKey: fixtureKey, repositoryOwner: "farroshsy", repositoryName: "venture-erp", resourceScopes: ["repository"], dataClassification: "confidential", authorizationReference: "Gate 3 integration fixture authorization for source lifecycle proof only", retentionPolicy: "Test fixture evidence is deleted by the lifecycle test after assertions; no source material is retained as a user-facing record.", deletionProcedure: "Delete uniquely keyed fixture review, evidence, run, and connection records in dependency order after test completion.", revocationProcedure: "Do not reuse this fixture connection; cleanup removes it after proof.", limitations: "This test validates a single repository-metadata response and does not prove source completeness, production availability, operational value, or ERP truth." });
    connectionId = connection.id;
    await expect(creator.externalEvidence.acquireGitHubEvidence({ ventureId: fixtureVentureId, connectionId, runKey: `${fixtureKey}-before-active`, resources: ["repository"], perResourceLimit: 1 })).rejects.toThrow("active");
    const validated = await creator.externalEvidence.validateGitHubConnection({ ventureId: fixtureVentureId, connectionId });
    expect(validated.status).toBe("validated");
    await expect(creator.externalEvidence.authorizeGitHubConnection({ ventureId: fixtureVentureId, connectionId })).rejects.toThrow("different human authorizer");
    const authorized = await reviewer.externalEvidence.authorizeGitHubConnection({ ventureId: fixtureVentureId, connectionId });
    expect(authorized.status).toBe("authorized");
    const active = await creator.externalEvidence.activateGitHubConnection({ ventureId: fixtureVentureId, connectionId });
    expect(active.status).toBe("active");
    const run = await creator.externalEvidence.acquireGitHubEvidence({ ventureId: fixtureVentureId, connectionId, runKey: `${fixtureKey}-run`, resources: ["repository"], perResourceLimit: 1 });
    runId = run.id;
    expect(["completed", "partial"]).toContain(run.status);
    const [record] = await db.select().from(eosExternalEvidenceRecords).where(eq(eosExternalEvidenceRecords.acquisitionRunId, run.id));
    expect(record).toBeTruthy();
    evidenceId = record!.id;
    expect(record).toMatchObject({ ventureId: fixtureVentureId, connectionId, resourceType: "repository", validationPosture: "requires_review", providerApiVersion: "2026-03-10", normalizerVersion: "0.1-github-metadata" });
    expect(record!.rawPayloadHash).toHaveLength(64);
    expect(record!.sourceVersionHash).toHaveLength(64);
    expect(JSON.stringify(record!.rawPayload)).not.toContain("GITHUB_EVIDENCE_TOKEN");
    await expect(creator.externalEvidence.reviewEvidence({ ventureId: fixtureVentureId, evidenceRecordId: record!.id, decision: "reviewed", rationale: "Fixture reviewer separation check." })).rejects.toThrow("different human reviewer");
    const review = await reviewer.externalEvidence.reviewEvidence({ ventureId: fixtureVentureId, evidenceRecordId: record!.id, decision: "reviewed", rationale: "Fixture review confirms retained provenance without treating source as ERP truth." });
    const overview = await creator.externalEvidence.overview({ ventureId: fixtureVentureId });
    const journalsAfter = await db.select().from(erpJournals).where(eq(erpJournals.ventureId, fixtureVentureId));
    expect(review.decision).toBe("reviewed");
    expect(overview.connections.some(item => item.id === connectionId && item.status === "active")).toBe(true);
    expect(overview.runs.some(item => item.id === run.id && ["completed", "partial"].includes(item.status))).toBe(true);
    expect(overview.evidenceRecords.some(item => item.id === record!.id && item.validationPosture === "reviewed" && item.review?.decision === "reviewed")).toBe(true);
    expect(overview.boundary).toMatchObject({ manualHumanTriggeredOnly: true, serverOnlyCredential: true, rawEvidenceBeforeProjection: true, noAutomaticErpTruth: true, noWebhook: true, noScheduler: true, noRepositoryMutation: true, noFinancialEffect: true, noPayrollEffect: true });
    expect(journalsAfter).toHaveLength(journalsBefore);
  });
});
