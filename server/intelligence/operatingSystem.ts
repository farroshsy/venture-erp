import { and, eq } from "drizzle-orm";
import { eosDecisionMemories, eosEvidenceLinks, eosExternalSourceContracts, eosKeyResults, eosScenarioPreparations, eosStrategicObjectives, governanceCases } from "../../drizzle/schema";
import { getDb } from "../db";

const ensureDb = async () => { const db = await getDb(); if (!db) throw new Error("Database is not available."); return db; };

export async function getOperatingSystemOverview(ventureId: number) {
  const db = await ensureDb();
  const [objectives, keyResults, decisionMemories, scenarios, evidenceLinks, externalSourceContracts] = await Promise.all([
    db.select().from(eosStrategicObjectives).where(eq(eosStrategicObjectives.ventureId, ventureId)),
    db.select().from(eosKeyResults).where(eq(eosKeyResults.ventureId, ventureId)),
    db.select().from(eosDecisionMemories).where(eq(eosDecisionMemories.ventureId, ventureId)),
    db.select().from(eosScenarioPreparations).where(eq(eosScenarioPreparations.ventureId, ventureId)),
    db.select().from(eosEvidenceLinks).where(eq(eosEvidenceLinks.ventureId, ventureId)),
    db.select().from(eosExternalSourceContracts).where(eq(eosExternalSourceContracts.ventureId, ventureId)),
  ]);
  const approvedSourceContracts = externalSourceContracts.filter(item => item.status === "approved");
  return { model: { name: "Enterprise Operating System planning layer", version: "0.1-human-governed", ventureId, evaluatedAt: new Date().toISOString() }, objectives, keyResults, decisionMemories, scenarios, evidenceLinks, externalSourceContracts, summary: { objectives: objectives.length, activeObjectives: objectives.filter(item => item.status === "active").length, keyResults: keyResults.length, activeKeyResults: keyResults.filter(item => item.status === "active" || item.status === "at_risk").length, decisionMemories: decisionMemories.length, reviewedDecisionMemories: decisionMemories.filter(item => item.status === "approved").length, scenarios: scenarios.length, approvedScenarios: scenarios.filter(item => item.status === "approved").length, sourceContracts: externalSourceContracts.length, approvedSourceContracts: approvedSourceContracts.length, evidenceLinks: evidenceLinks.length }, copilotReadiness: { posture: "evidence_bounded_source_readiness_not_ai_execution" as const, retainedSources: [{ source: "Enterprise Knowledge Graph", availability: "available", detail: "Tenant-scoped retained relationship projection is available through its separate read-only query." }, { source: "Governed metric catalog", availability: "available", detail: "Metric definitions, lineage, gaps, quality, freshness posture, and collection plans are available at request time." }, { source: "Decision memory", availability: decisionMemories.length > 0 ? "partially_available" : "unavailable", detail: decisionMemories.length > 0 ? `${decisionMemories.length} retained decision-memory record(s) are available subject to tenant membership.` : "No retained decision memory exists in this tenant yet." }, { source: "Strategic objectives and key results", availability: objectives.length > 0 || keyResults.length > 0 ? "partially_available" : "unavailable", detail: `${objectives.length} objective(s) and ${keyResults.length} key result(s) are retained.` }, { source: "External intelligence", availability: approvedSourceContracts.length > 0 ? "contract_approved_collection_disabled" : "unavailable", detail: approvedSourceContracts.length > 0 ? `${approvedSourceContracts.length} source contract(s) are approved, but no connector, API call, refresh job, collection, or transmission is activated.` : "No approved external-source contract exists in this tenant." }, { source: "Forecasting and scenario calculation", availability: "blocked", detail: "Scenario records are preparation artifacts only; no modeled historical series, forecasting policy, validation, or calculation engine is active." }], requiredForFutureCopilot: ["Human-approved source access and data-classification contract", "Tenant-scoped retrieval authorization", "Versioned prompt/output/evaluation policy", "Explicit human-review and escalation rules", "No-action tool boundary with separately authorized mutations"], boundary: "No model invocation, connector call, external collection, prediction, recommendation, decision, or operational effect occurs in this readiness projection." }, boundary: { humanGovernedRecords: true as const, noForecastCalculation: true as const, noScenarioSimulation: true as const, noCausalityClaim: true as const, noRecommendation: true as const, noDecisionExecution: true as const, noExternalCollection: true as const, noFinancialEffect: true as const, noPayrollEffect: true as const, noExternalEffect: true as const } };
}

export async function createStrategicObjective(input: { ventureId: number; objectiveKey: string; title: string; description: string; periodStart: string; periodEnd: string; ownerUserId?: number; evidenceRequirement: string; createdByUserId: number }) {
  const db = await ensureDb();
  const [created] = await db.insert(eosStrategicObjectives).values({ ...input, status: "draft" });
  const [objective] = await db.select().from(eosStrategicObjectives).where(eq(eosStrategicObjectives.id, Number(created.insertId)));
  return objective;
}

export async function activateStrategicObjective(ventureId: number, objectiveId: number, approvedByUserId: number) {
  const db = await ensureDb();
  const [objective] = await db.select().from(eosStrategicObjectives).where(and(eq(eosStrategicObjectives.ventureId, ventureId), eq(eosStrategicObjectives.id, objectiveId)));
  if (!objective) throw new Error("Strategic objective not found in the selected venture.");
  if (objective.createdByUserId === approvedByUserId) throw new Error("A strategic objective requires a different human approver.");
  if (objective.status !== "draft" && objective.status !== "paused") throw new Error("Only draft or paused strategic objectives may be activated.");
  await db.update(eosStrategicObjectives).set({ status: "active", approvedByUserId, approvedAt: new Date() }).where(eq(eosStrategicObjectives.id, objectiveId));
  const [updated] = await db.select().from(eosStrategicObjectives).where(eq(eosStrategicObjectives.id, objectiveId)); return updated;
}

export async function createKeyResult(input: { ventureId: number; objectiveId: number; resultKey: string; title: string; description: string; metricKey?: string; direction: "increase" | "decrease" | "maintain" | "milestone"; targetValue?: string; targetUnit?: string; ownerUserId?: number; evidenceRequirement: string; createdByUserId: number }) {
  const db = await ensureDb();
  const [objective] = await db.select().from(eosStrategicObjectives).where(and(eq(eosStrategicObjectives.id, input.objectiveId), eq(eosStrategicObjectives.ventureId, input.ventureId)));
  if (!objective) throw new Error("Strategic objective not found in the selected venture.");
  const [created] = await db.insert(eosKeyResults).values({ ...input, status: "draft" });
  const [keyResult] = await db.select().from(eosKeyResults).where(eq(eosKeyResults.id, Number(created.insertId))); return keyResult;
}

export async function setKeyResultStatus(ventureId: number, keyResultId: number, status: "active" | "at_risk" | "achieved" | "closed" | "cancelled") {
  const db = await ensureDb();
  const [keyResult] = await db.select().from(eosKeyResults).where(and(eq(eosKeyResults.id, keyResultId), eq(eosKeyResults.ventureId, ventureId)));
  if (!keyResult) throw new Error("Key result not found in the selected venture.");
  if (keyResult.status === "closed" || keyResult.status === "cancelled") throw new Error("A closed or cancelled key result cannot change status.");
  await db.update(eosKeyResults).set({ status }).where(eq(eosKeyResults.id, keyResultId));
  const [updated] = await db.select().from(eosKeyResults).where(eq(eosKeyResults.id, keyResultId)); return updated;
}

export async function createDecisionMemory(input: { ventureId: number; decisionKey: string; governanceCaseId?: number; title: string; decisionStatement: string; alternatives: string[]; assumptions: string[]; expectedOutcome: string; risks: string[]; metricKeys: string[]; projectReferences: string[]; reviewDueAt?: Date; decidedAt?: Date; createdByUserId: number }) {
  const db = await ensureDb();
  if (input.governanceCaseId) { const [caseRow] = await db.select().from(governanceCases).where(and(eq(governanceCases.id, input.governanceCaseId), eq(governanceCases.ventureId, input.ventureId))); if (!caseRow) throw new Error("Governance case not found in the selected venture."); }
  const [created] = await db.insert(eosDecisionMemories).values({ ventureId: input.ventureId, decisionKey: input.decisionKey, governanceCaseId: input.governanceCaseId, title: input.title, status: "draft", decisionStatement: input.decisionStatement, alternativesSnapshot: input.alternatives, assumptionsSnapshot: input.assumptions, expectedOutcome: input.expectedOutcome, riskSnapshot: input.risks, metricKeys: input.metricKeys, projectReferences: input.projectReferences, reviewDueAt: input.reviewDueAt, decidedAt: input.decidedAt, createdByUserId: input.createdByUserId });
  const [memory] = await db.select().from(eosDecisionMemories).where(eq(eosDecisionMemories.id, Number(created.insertId))); return memory;
}

export async function approveDecisionMemory(ventureId: number, decisionMemoryId: number, approvedByUserId: number) {
  const db = await ensureDb(); const [memory] = await db.select().from(eosDecisionMemories).where(and(eq(eosDecisionMemories.id, decisionMemoryId), eq(eosDecisionMemories.ventureId, ventureId)));
  if (!memory) throw new Error("Decision memory not found in the selected venture."); if (memory.createdByUserId === approvedByUserId) throw new Error("A decision memory requires a different human approver."); if (memory.status !== "draft" && memory.status !== "review") throw new Error("Only draft or review decision memories may be approved.");
  await db.update(eosDecisionMemories).set({ status: "approved", approvedByUserId, approvedAt: new Date() }).where(eq(eosDecisionMemories.id, decisionMemoryId)); const [updated] = await db.select().from(eosDecisionMemories).where(eq(eosDecisionMemories.id, decisionMemoryId)); return updated;
}

export async function recordDecisionLearning(input: { ventureId: number; decisionMemoryId: number; actualOutcome: string; lessonsLearned: string; reviewedByUserId: number }) {
  const db = await ensureDb(); const [memory] = await db.select().from(eosDecisionMemories).where(and(eq(eosDecisionMemories.id, input.decisionMemoryId), eq(eosDecisionMemories.ventureId, input.ventureId)));
  if (!memory) throw new Error("Decision memory not found in the selected venture."); if (memory.status !== "approved") throw new Error("Only an approved decision memory can retain outcome learning.");
  await db.update(eosDecisionMemories).set({ actualOutcome: input.actualOutcome, lessonsLearned: input.lessonsLearned, status: "closed" }).where(eq(eosDecisionMemories.id, input.decisionMemoryId)); const [updated] = await db.select().from(eosDecisionMemories).where(eq(eosDecisionMemories.id, input.decisionMemoryId)); return updated;
}

export async function createScenarioPreparation(input: { ventureId: number; scenarioKey: string; title: string; scenarioType: "strategy" | "risk" | "opportunity" | "portfolio" | "operating_plan"; question: string; assumptions: string[]; evidenceRequirement: string; limitations: string; ownerUserId?: number; createdByUserId: number }) { const db = await ensureDb(); const [created] = await db.insert(eosScenarioPreparations).values({ ventureId: input.ventureId, scenarioKey: input.scenarioKey, title: input.title, scenarioType: input.scenarioType, status: "draft", question: input.question, assumptionsSnapshot: input.assumptions, evidenceRequirement: input.evidenceRequirement, limitations: input.limitations, ownerUserId: input.ownerUserId, createdByUserId: input.createdByUserId }); const [scenario] = await db.select().from(eosScenarioPreparations).where(eq(eosScenarioPreparations.id, Number(created.insertId))); return scenario; }
export async function approveScenarioPreparation(ventureId: number, scenarioId: number, reviewedByUserId: number) { const db = await ensureDb(); const [scenario] = await db.select().from(eosScenarioPreparations).where(and(eq(eosScenarioPreparations.id, scenarioId), eq(eosScenarioPreparations.ventureId, ventureId))); if (!scenario) throw new Error("Scenario preparation not found in the selected venture."); if (scenario.createdByUserId === reviewedByUserId) throw new Error("A scenario preparation requires a different human reviewer."); if (scenario.status !== "draft" && scenario.status !== "review") throw new Error("Only draft or review scenarios may be approved."); await db.update(eosScenarioPreparations).set({ status: "approved", reviewedByUserId, reviewedAt: new Date() }).where(eq(eosScenarioPreparations.id, scenarioId)); const [updated] = await db.select().from(eosScenarioPreparations).where(eq(eosScenarioPreparations.id, scenarioId)); return updated; }

export async function createExternalSourceContract(input: { ventureId: number; sourceKey: string; name: string; sourceCategory: "market" | "competitor" | "government" | "tender" | "economic" | "fx" | "interest_rate" | "inflation" | "news" | "hiring" | "patent" | "regulation" | "industry" | "analytics" | "billing" | "crm" | "observability" | "security"; collectionMode: "manual_evidence" | "approved_connector_required" | "api_contract_required" | "file_import_required"; dataClassification: "public" | "internal" | "confidential" | "restricted"; sourceUrl?: string; refreshExpectation: string; evidenceRequirement: string; boundaryNote: string; ownerUserId?: number; createdByUserId: number }) { const db = await ensureDb(); const [created] = await db.insert(eosExternalSourceContracts).values({ ...input, status: "draft" }); const [contract] = await db.select().from(eosExternalSourceContracts).where(eq(eosExternalSourceContracts.id, Number(created.insertId))); return contract; }
export async function approveExternalSourceContract(ventureId: number, contractId: number, reviewedByUserId: number) { const db = await ensureDb(); const [contract] = await db.select().from(eosExternalSourceContracts).where(and(eq(eosExternalSourceContracts.id, contractId), eq(eosExternalSourceContracts.ventureId, ventureId))); if (!contract) throw new Error("External source contract not found in the selected venture."); if (contract.createdByUserId === reviewedByUserId) throw new Error("An external source contract requires a different human reviewer."); if (contract.status !== "draft" && contract.status !== "review") throw new Error("Only draft or review source contracts may be approved."); await db.update(eosExternalSourceContracts).set({ status: "approved", reviewedByUserId, reviewedAt: new Date() }).where(eq(eosExternalSourceContracts.id, contractId)); const [updated] = await db.select().from(eosExternalSourceContracts).where(eq(eosExternalSourceContracts.id, contractId)); return updated; }

export async function createEvidenceLink(input: { ventureId: number; targetType: "objective" | "key_result" | "decision_memory" | "scenario" | "external_source_contract"; targetId: number; evidenceType: "metric" | "canonical_object" | "operational_record" | "workflow" | "audit_event" | "governance_decision" | "external_source_contract" | "human_assertion"; evidenceReference: string; evidenceSnapshot: Record<string, unknown>; posture: "retained" | "declared" | "missing" | "requires_review"; createdByUserId: number }) { const db = await ensureDb(); const [created] = await db.insert(eosEvidenceLinks).values(input); const [link] = await db.select().from(eosEvidenceLinks).where(eq(eosEvidenceLinks.id, Number(created.insertId))); return link; }
