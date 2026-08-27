import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { eosAdoptionObservations, eosAdoptionStudies, erpJournals, users, ventureMemberships } from "../../drizzle/schema";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db";
import { appRouter } from "../routers";

const ventureId = 1;
const reviewerOpenId = "adoption_reviewer_20260827";
const outsiderOpenId = "adoption_outsider_20260827";
const runKey = `e2e-fixture-adoption-${Date.now()}`;
let reviewerUserId = 0;
let outsiderUserId = 0;

function callerFor(userId: number, openId: string) {
  return appRouter.createCaller({ user: { id: userId, openId, email: `${openId}@example.invalid`, name: openId, loginMethod: "validation", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });
}

beforeAll(async () => {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  let [reviewer] = await db.select().from(users).where(eq(users.openId, reviewerOpenId)).limit(1);
  if (!reviewer) { await db.insert(users).values({ openId: reviewerOpenId, name: "VALIDATION Adoption Reviewer", email: "adoption-reviewer@example.invalid", loginMethod: "validation", role: "user" }); [reviewer] = await db.select().from(users).where(eq(users.openId, reviewerOpenId)).limit(1); }
  reviewerUserId = reviewer!.id;
  const [membership] = await db.select().from(ventureMemberships).where(and(eq(ventureMemberships.ventureId, ventureId), eq(ventureMemberships.userId, reviewerUserId))).limit(1);
  if (!membership) await db.insert(ventureMemberships).values({ ventureId, userId: reviewerUserId, role: "venture_lead", status: "active" });
  let [outsider] = await db.select().from(users).where(eq(users.openId, outsiderOpenId)).limit(1);
  if (!outsider) { await db.insert(users).values({ openId: outsiderOpenId, name: "VALIDATION Adoption Outsider", email: "adoption-outsider@example.invalid", loginMethod: "validation", role: "user" }); [outsider] = await db.select().from(users).where(eq(users.openId, outsiderOpenId)).limit(1); }
  outsiderUserId = outsider!.id;
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  await db.delete(eosAdoptionObservations).where(eq(eosAdoptionObservations.observationKey, `${runKey}-observation`));
  await db.delete(eosAdoptionStudies).where(eq(eosAdoptionStudies.studyKey, `${runKey}-study`));
});

describe("Gate 2 Adoption and Operator Validation real lifecycle", () => {
  it("retains separately reviewed human adoption evidence without telemetry, payroll enablement, or a journal effect", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is not available.");
    const creator = callerFor(1, "owner");
    const reviewer = callerFor(reviewerUserId, reviewerOpenId);
    const outsider = callerFor(outsiderUserId, outsiderOpenId);
    const journalsBefore = (await db.select().from(erpJournals).where(eq(erpJournals.ventureId, ventureId))).length;
    const limitations = "This consent-confirmed, human-recorded observation covers one stated participant and task only. It does not establish general adoption, satisfaction, productivity, compliance, payroll readiness, or production readiness.";
    await expect(outsider.adoption.overview({ ventureId })).rejects.toThrow();
    const study = await creator.adoption.createStudy({ ventureId, studyKey: `${runKey}-study`, title: "VALIDATION ONLY independent operator study", purpose: "Observe whether an independent participant can locate and explain the retained procurement evidence path without developer instruction.", journeyKeys: ["procurement_evidence", "payroll_blocker_comprehension"], consentNotice: "Participation is voluntary, may stop, and retains a pseudonymous reference only without identity, telemetry, audio, video, or screen recording.", independencePolicy: "The participant did not build the tested feature; the record retains only declared independence and no employment or demographic detail.", limitations });
    await expect(creator.adoption.reviewStudy({ ventureId, studyId: study.id, status: "approved" })).rejects.toThrow("different human reviewer");
    const approvedStudy = await reviewer.adoption.reviewStudy({ ventureId, studyId: study.id, status: "approved" });
    const observation = await creator.adoption.createObservation({ ventureId, studyId: study.id, observationKey: `${runKey}-observation`, participantReference: "participant_01", participantIndependence: "declared_independent", roleLens: "operator", journeyKey: "procurement_evidence", outcome: "completed_with_assistance", taskStartedAt: new Date("2026-08-27T00:00:00.000Z"), taskEndedAt: new Date("2026-08-27T00:01:15.000Z"), assistanceCount: 1, errorCount: 0, retryCount: 1, helpUsed: true, evidenceGapEncountered: true, refusalOrRecovery: "evidence_missing", evidenceReference: "Workspace:/procurement", limitations, consentConfirmed: true, occurredAt: new Date("2026-08-27T00:01:15.000Z") });
    await expect(creator.adoption.verifyObservation({ ventureId, observationId: observation.id, status: "verified" })).rejects.toThrow("different human verifier");
    const verified = await reviewer.adoption.verifyObservation({ ventureId, observationId: observation.id, status: "verified" });
    const overview = await creator.adoption.overview({ ventureId });
    const journalsAfter = await db.select().from(erpJournals).where(eq(erpJournals.ventureId, ventureId));
    expect(approvedStudy.status).toBe("approved");
    expect(verified.status).toBe("verified");
    expect(overview.studies.some(item => item.id === study.id && item.status === "approved")).toBe(true);
    expect(overview.observations.some(item => item.id === observation.id && item.status === "verified" && item.durationSeconds === 75 && item.consentConfirmed === 1)).toBe(true);
    expect(overview.summary.verifiedIndependentObservationCount).toBeGreaterThanOrEqual(1);
    expect(overview.summary.verifiedCompletionCount).toBeGreaterThanOrEqual(1);
    expect(overview.boundary).toMatchObject({ humanRecordedOnly: true, automaticBehaviorTracking: false, externalTelemetry: false, identityProfiling: false, noFinancialEffect: true, noPayrollEffect: true, noExternalEffect: true });
    expect(journalsAfter).toHaveLength(journalsBefore);
    expect((await db.select().from(eosAdoptionStudies).where(eq(eosAdoptionStudies.id, study.id))).at(0)?.status).toBe("approved");
    expect((await db.select().from(eosAdoptionObservations).where(eq(eosAdoptionObservations.id, observation.id))).at(0)).toMatchObject({ status: "verified", participantReference: "participant_01", consentConfirmed: 1, durationSeconds: 75, assistanceCount: 1, errorCount: 0, retryCount: 1, helpUsed: 1, evidenceGapEncountered: 1 });
  });
});
