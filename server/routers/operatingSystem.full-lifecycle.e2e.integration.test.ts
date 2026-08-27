import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { eosDecisionMemories, eosEvidenceLinks, eosExternalSourceContracts, eosKeyResults, eosScenarioPreparations, eosStrategicObjectives, erpJournals, users, ventureMemberships } from "../../drizzle/schema";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db";
import { intelligenceRouter } from "./intelligence";

const ventureId = 1;
const reviewerOpenId = "validation_eos_reviewer_20260827";
const outsiderOpenId = "validation_eos_outsider_20260827";
const runKey = `eos-e2e-${Date.now()}`;
let reviewerUserId = 0;
let outsiderUserId = 0;

function callerFor(userId: number, openId: string) {
  return intelligenceRouter.createCaller({ user: { id: userId, openId, email: `${openId}@example.invalid`, name: openId, loginMethod: "validation", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });
}

beforeAll(async () => {
  const db = await getDb(); if (!db) throw new Error("Database is not available.");
  let [reviewer] = await db.select().from(users).where(eq(users.openId, reviewerOpenId)).limit(1);
  if (!reviewer) { await db.insert(users).values({ openId: reviewerOpenId, name: "VALIDATION EOS Reviewer", email: "validation-eos-reviewer@example.invalid", loginMethod: "validation", role: "user" }); [reviewer] = await db.select().from(users).where(eq(users.openId, reviewerOpenId)).limit(1); }
  reviewerUserId = reviewer!.id;
  const [membership] = await db.select().from(ventureMemberships).where(and(eq(ventureMemberships.ventureId, ventureId), eq(ventureMemberships.userId, reviewerUserId))).limit(1);
  if (!membership) await db.insert(ventureMemberships).values({ ventureId, userId: reviewerUserId, role: "venture_lead", status: "active" });
  let [outsider] = await db.select().from(users).where(eq(users.openId, outsiderOpenId)).limit(1);
  if (!outsider) { await db.insert(users).values({ openId: outsiderOpenId, name: "VALIDATION EOS Outsider", email: "validation-eos-outsider@example.invalid", loginMethod: "validation", role: "user" }); [outsider] = await db.select().from(users).where(eq(users.openId, outsiderOpenId)).limit(1); }
  outsiderUserId = outsider!.id;
});

describe("Enterprise Operating System real lifecycle", () => {
  it("retains separately reviewed planning records and explicit evidence without creating a journal or external effect", async () => {
    const db = await getDb(); if (!db) throw new Error("Database is not available.");
    const creator = callerFor(1, "owner"); const reviewer = callerFor(reviewerUserId, reviewerOpenId); const outsider = callerFor(outsiderUserId, outsiderOpenId);
    const journalCountBefore = (await db.select().from(erpJournals).where(eq(erpJournals.ventureId, ventureId))).length;
    await expect(outsider.operatingSystem.overview({ ventureId })).rejects.toThrow();
    const objective = await creator.operatingSystem.createObjective({ ventureId, objectiveKey: `${runKey}-objective`, title: "VALIDATION EOS human-governed objective", description: "Retain a test-scoped objective whose review and evidence requirements are explicitly represented.", periodStart: "2026-08-27", periodEnd: "2026-12-31", evidenceRequirement: "Use tenant-scoped retained evidence and a separate human approval before activation." });
    await expect(creator.operatingSystem.activateObjective({ ventureId, objectiveId: objective.id })).rejects.toThrow("different human approver");
    const activeObjective = await reviewer.operatingSystem.activateObjective({ ventureId, objectiveId: objective.id });
    const result = await creator.operatingSystem.createKeyResult({ ventureId, objectiveId: activeObjective.id, resultKey: `${runKey}-kr`, title: "VALIDATION EOS evidence-linked key result", description: "Retain a test-scoped key result that names a governed metric without calculating progress.", metricKey: "operations.inventory_movements", direction: "increase", targetValue: "1", targetUnit: "count", evidenceRequirement: "Review the governed metric lineage and retained source counts." });
    const activeResult = await reviewer.operatingSystem.setKeyResultStatus({ ventureId, keyResultId: result.id, status: "active" });
    const memory = await creator.operatingSystem.createDecisionMemory({ ventureId, decisionKey: `${runKey}-decision`, title: "VALIDATION EOS decision memory", decisionStatement: "Retain the stated decision context without selecting or executing an operating decision.", alternatives: ["Continue human review", "Defer pending evidence"], assumptions: ["Evidence is tenant scoped"], expectedOutcome: "A future reviewer can inspect the original alternatives, assumptions, and evidence requirements.", risks: ["Evidence may be incomplete"], metricKeys: ["operations.inventory_movements"], projectReferences: [] });
    await expect(creator.operatingSystem.approveDecisionMemory({ ventureId, decisionMemoryId: memory.id })).rejects.toThrow("different human approver");
    const approvedMemory = await reviewer.operatingSystem.approveDecisionMemory({ ventureId, decisionMemoryId: memory.id });
    const scenario = await creator.operatingSystem.createScenario({ ventureId, scenarioKey: `${runKey}-scenario`, title: "VALIDATION EOS scenario preparation", scenarioType: "risk", question: "Which evidence should a future separately governed risk analysis evaluate?", assumptions: ["No simulation is active"], evidenceRequirement: "Attach explicit retained evidence links before a human review.", limitations: "This preparation does not calculate a scenario, forecast, recommendation, or action." });
    const approvedScenario = await reviewer.operatingSystem.approveScenario({ ventureId, scenarioId: scenario.id });
    const contract = await creator.operatingSystem.createExternalSourceContract({ ventureId, sourceKey: `${runKey}-source`, name: "VALIDATION EOS source-contract seam", sourceCategory: "market", collectionMode: "api_contract_required", dataClassification: "public", refreshExpectation: "Manual review only until separately enabled", evidenceRequirement: "A future approved connector/API contract, classification review, and human authorization are required.", boundaryNote: "Contract only; no connector, collection, external transmission, or action is activated." });
    const approvedContract = await reviewer.operatingSystem.approveExternalSourceContract({ ventureId, contractId: contract.id });
    const link = await creator.operatingSystem.createEvidenceLink({ ventureId, targetType: "objective", targetId: activeObjective.id, evidenceType: "metric", evidenceReference: "Metric:operations.inventory_movements", evidenceSnapshot: { validationOnly: true, source: "governed metric catalog" }, posture: "retained" });
    const overview = await creator.operatingSystem.overview({ ventureId });
    const graph = await creator.knowledgeGraph({ ventureId });
    const journalsAfter = await db.select().from(erpJournals).where(eq(erpJournals.ventureId, ventureId));
    expect(activeObjective.status).toBe("active"); expect(activeResult.status).toBe("active"); expect(approvedMemory.status).toBe("approved"); expect(approvedScenario.status).toBe("approved"); expect(approvedContract.status).toBe("approved");
    expect(overview.objectives.some(item => item.id === objective.id)).toBe(true); expect(overview.keyResults.some(item => item.id === result.id)).toBe(true); expect(overview.decisionMemories.some(item => item.id === memory.id)).toBe(true); expect(overview.scenarios.some(item => item.id === scenario.id)).toBe(true); expect(overview.externalSourceContracts.some(item => item.id === contract.id)).toBe(true); expect(overview.evidenceLinks.some(item => item.id === link.id)).toBe(true);
    expect(overview.boundary).toMatchObject({ noForecastCalculation: true, noScenarioSimulation: true, noCausalityClaim: true, noRecommendation: true, noDecisionExecution: true, noExternalCollection: true, noFinancialEffect: true, noPayrollEffect: true, noExternalEffect: true });
    expect(graph.nodes).toEqual(expect.arrayContaining([expect.objectContaining({ id: `StrategicObjective:${objective.id}`, kind: "strategic_objective" }), expect.objectContaining({ id: `KeyResult:${result.id}`, kind: "key_result" }), expect.objectContaining({ id: `DecisionMemory:${memory.id}`, kind: "decision_memory" }), expect.objectContaining({ id: `ScenarioPreparation:${scenario.id}`, kind: "scenario_preparation" }), expect.objectContaining({ id: `ExternalSourceContract:${contract.id}`, kind: "external_source_contract" }), expect.objectContaining({ id: `EvidenceLink:${link.id}`, kind: "evidence_link" })]));
    expect(graph.edges).toEqual(expect.arrayContaining([expect.objectContaining({ from: `KeyResult:${result.id}`, to: `StrategicObjective:${objective.id}`, type: "governed_by" }), expect.objectContaining({ from: `EvidenceLink:${link.id}`, to: `StrategicObjective:${objective.id}`, type: "evidenced_by" })]));
    expect(journalsAfter).toHaveLength(journalCountBefore);
    expect((await db.select().from(eosStrategicObjectives).where(eq(eosStrategicObjectives.id, objective.id))).at(0)?.status).toBe("active");
    expect((await db.select().from(eosKeyResults).where(eq(eosKeyResults.id, result.id))).at(0)?.status).toBe("active");
    expect((await db.select().from(eosDecisionMemories).where(eq(eosDecisionMemories.id, memory.id))).at(0)?.status).toBe("approved");
    expect((await db.select().from(eosScenarioPreparations).where(eq(eosScenarioPreparations.id, scenario.id))).at(0)?.status).toBe("approved");
    expect((await db.select().from(eosExternalSourceContracts).where(eq(eosExternalSourceContracts.id, contract.id))).at(0)?.status).toBe("approved");
    expect((await db.select().from(eosEvidenceLinks).where(eq(eosEvidenceLinks.id, link.id))).at(0)?.evidenceReference).toBe("Metric:operations.inventory_movements");
  });
});
