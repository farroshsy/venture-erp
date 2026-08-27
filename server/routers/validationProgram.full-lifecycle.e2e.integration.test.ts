import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { eosValidationBenchmarks, eosValidationObservations, erpJournals, users, ventureMemberships } from "../../drizzle/schema";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db";
import { intelligenceRouter } from "./intelligence";

const ventureId = 1;
const reviewerOpenId = "validation_program_reviewer_20260827";
const outsiderOpenId = "validation_program_outsider_20260827";
const runKey = `validation-program-${Date.now()}`;
let reviewerUserId = 0;
let outsiderUserId = 0;

function callerFor(userId: number, openId: string) { return intelligenceRouter.createCaller({ user: { id: userId, openId, email: `${openId}@example.invalid`, name: openId, loginMethod: "validation", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] }); }

beforeAll(async () => {
  const db = await getDb(); if (!db) throw new Error("Database is not available.");
  let [reviewer] = await db.select().from(users).where(eq(users.openId, reviewerOpenId)).limit(1);
  if (!reviewer) { await db.insert(users).values({ openId: reviewerOpenId, name: "VALIDATION Program Reviewer", email: "validation-program-reviewer@example.invalid", loginMethod: "validation", role: "user" }); [reviewer] = await db.select().from(users).where(eq(users.openId, reviewerOpenId)).limit(1); }
  reviewerUserId = reviewer!.id; const [membership] = await db.select().from(ventureMemberships).where(and(eq(ventureMemberships.ventureId, ventureId), eq(ventureMemberships.userId, reviewerUserId))).limit(1);
  if (!membership) await db.insert(ventureMemberships).values({ ventureId, userId: reviewerUserId, role: "venture_lead", status: "active" });
  let [outsider] = await db.select().from(users).where(eq(users.openId, outsiderOpenId)).limit(1);
  if (!outsider) { await db.insert(users).values({ openId: outsiderOpenId, name: "VALIDATION Program Outsider", email: "validation-program-outsider@example.invalid", loginMethod: "validation", role: "user" }); [outsider] = await db.select().from(users).where(eq(users.openId, outsiderOpenId)).limit(1); }
  outsiderUserId = outsider!.id;
});

describe("Operating System Validation Program real lifecycle", () => {
  it("retains a reviewed structural benchmark and human observation without automatic telemetry, causal claim, or financial effect", async () => {
    const db = await getDb(); if (!db) throw new Error("Database is not available."); const creator = callerFor(1, "owner"); const reviewer = callerFor(reviewerUserId, reviewerOpenId); const outsider = callerFor(outsiderUserId, outsiderOpenId);
    const journalsBefore = (await db.select().from(erpJournals).where(eq(erpJournals.ventureId, ventureId))).length;
    await expect(outsider.validationProgram.overview({ ventureId })).rejects.toThrow();
    const benchmark = await creator.validationProgram.createBenchmark({ ventureId, benchmarkKey: `${runKey}-benchmark`, releaseLabel: "VALIDATION ONLY Operating System evidence posture", limitations: "This snapshot retains only structural evidence posture. It does not certify quality, ROI, causality, operational success, financial correctness, compliance, adoption, or user behavior." });
    await expect(creator.validationProgram.approveBenchmark({ ventureId, benchmarkId: benchmark.id })).rejects.toThrow("different human reviewer");
    const approvedBenchmark = await reviewer.validationProgram.approveBenchmark({ ventureId, benchmarkId: benchmark.id });
    const observation = await creator.validationProgram.createObservation({ ventureId, observationKey: `${runKey}-observation`, observationType: "executive_question", title: "VALIDATION ONLY human-recorded question review", outcome: "partial", durationSeconds: 45, subjectType: "workspace", subjectReference: "Workspace:/intelligence", evidenceReference: "Metric:operations.inventory_movements", evidenceSnapshot: { validationOnly: true, manuallyMeasured: true, noBrowserTelemetry: true }, limitations: "The observation is a human-retained measurement and does not establish causal impact, adoption, ROI, recommendation quality, or business outcome.", occurredAt: new Date("2026-08-27T00:00:00.000Z") });
    await expect(creator.validationProgram.verifyObservation({ ventureId, observationId: observation.id, status: "verified" })).rejects.toThrow("different human verifier");
    const verifiedObservation = await reviewer.validationProgram.verifyObservation({ ventureId, observationId: observation.id, status: "verified" });
    const overview = await creator.validationProgram.overview({ ventureId }); const journalsAfter = await db.select().from(erpJournals).where(eq(erpJournals.ventureId, ventureId));
    expect(approvedBenchmark.status).toBe("approved"); expect(verifiedObservation.status).toBe("verified");
    expect(overview.currentBenchmark.dimensions.evidence_coverage).toMatchObject({ status: "observed", unit: "% of governed metrics with observed retained evidence" });
    expect(overview.metricTrust).toHaveLength(219); expect(overview.metricTrust.some(metric => metric.metricKey === "operations.inventory_movements" && metric.structuralTrustScore === 100)).toBe(true);
    expect(overview.records.benchmarks.some(item => item.id === benchmark.id && item.status === "approved")).toBe(true); expect(overview.records.observations.some(item => item.id === observation.id && item.status === "verified")).toBe(true);
    expect(overview.boundary).toMatchObject({ requestTimeReadOnlyProjections: true, humanRecordedValidationOnly: true, noAutomaticBehaviorTracking: true, noCausalInference: true, noForecast: true, noScenarioCalculation: true, noRecommendation: true, noDecisionExecution: true, noFinancialEffect: true, noPayrollEffect: true, noExternalCollection: true, noExternalEffect: true });
    expect(journalsAfter).toHaveLength(journalsBefore);
    expect((await db.select().from(eosValidationBenchmarks).where(eq(eosValidationBenchmarks.id, benchmark.id))).at(0)?.status).toBe("approved");
    expect((await db.select().from(eosValidationObservations).where(eq(eosValidationObservations.id, observation.id))).at(0)?.status).toBe("verified");
  });
});
