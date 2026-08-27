import { and, desc, eq } from "drizzle-orm";
import { eosDecisionMemories, eosEvidenceLinks, eosExternalSourceContracts, eosKeyResults, eosScenarioPreparations, eosStrategicObjectives, eosValidationBenchmarks, eosValidationObservations } from "../../drizzle/schema";
import { getDb } from "../db";
import { getEnterpriseKnowledgeGraph } from "./knowledgeGraph";
import { getDecisionIntelligenceOverview } from "./service";

const ensureDb = async () => { const db = await getDb(); if (!db) throw new Error("Database is not available."); return db; };

const benchmarkDimensions = [
  { key: "architecture", name: "Architecture", requirement: "Versioned context boundaries, tenant controls, and a reviewable architecture record." },
  { key: "security", name: "Security", requirement: "Approved security evidence source contract and validated security controls." },
  { key: "governance", name: "Governance", requirement: "Human-reviewed objectives, decisions, and retained evidence-link records." },
  { key: "observability", name: "Observability", requirement: "Approved read-only CI/CD, incident, and observability source contract." },
  { key: "documentation", name: "Documentation", requirement: "Versioned design, route guidance, validation notes, and owner review." },
  { key: "evidence_coverage", name: "Evidence coverage", requirement: "Observed governed metrics with retained source evidence and explicit gaps." },
  { key: "automation", name: "Automation", requirement: "Retained workflow evidence and separately governed automation outcomes." },
  { key: "knowledge_graph", name: "Knowledge Graph", requirement: "Explicit retained relationships, source traceability, and missing-link disclosure." },
  { key: "decision_readiness", name: "Decision readiness", requirement: "Human-approved decision memories and retained outcome/lesson evidence." },
  { key: "metric_coverage", name: "Metric coverage", requirement: "Versioned metric definitions, modeled formulas, and evidence contracts." },
  { key: "ai_readiness", name: "AI readiness", requirement: "Approved source access, privacy controls, model/output evaluation, and human escalation policy." },
  { key: "data_quality", name: "Data quality", requirement: "Source-specific completeness, timeliness, validity, and reconciliation evidence." },
  { key: "integration_readiness", name: "Integration readiness", requirement: "Approved source contracts, connector authorization, retrieval policy, and reviewed tests." },
] as const;

type BenchmarkDimensionKey = typeof benchmarkDimensions[number]["key"];

function percent(numerator: number, denominator: number) { return denominator > 0 ? Math.round((numerator / denominator) * 10000) / 100 : null; }

function structuralMetricTrust(metric: Awaited<ReturnType<typeof getDecisionIntelligenceOverview>>["metrics"][number]) {
  const formulaContract = metric.status === "observed" ? 25 : 0;
  const retainedEvidence = metric.evidence.length > 0 ? 25 : 0;
  const tenantBoundEvaluation = metric.status === "observed" ? 25 : 0;
  const explicitGaps = metric.missingEvidence.length === 0 ? 25 : 0;
  const score = formulaContract + retainedEvidence + tenantBoundEvaluation + explicitGaps;
  return {
    metricKey: metric.key,
    metricName: metric.name,
    status: metric.status,
    structuralTrustScore: score,
    scoreMeaning: "Structural evidence-trust score only: it measures formula/evidence/tenant/gap disclosure presence, not business correctness, source accuracy, causality, forecast reliability, compliance, or professional assurance.",
    components: { formulaContract, retainedEvidence, tenantBoundEvaluation, explicitGaps },
    evidence: metric.evidence,
    missingEvidence: metric.missingEvidence,
    freshness: metric.freshness,
    quality: metric.quality,
    readiness: metric.readiness,
  };
}

function currentDimensionSnapshot(input: {
  intelligence: Awaited<ReturnType<typeof getDecisionIntelligenceOverview>>;
  graph: Awaited<ReturnType<typeof getEnterpriseKnowledgeGraph>>;
  objectives: Awaited<ReturnType<typeof getOperatingSystemValidationOverview>>["records"]["objectives"];
  keyResults: Awaited<ReturnType<typeof getOperatingSystemValidationOverview>>["records"]["keyResults"];
  decisions: Awaited<ReturnType<typeof getOperatingSystemValidationOverview>>["records"]["decisions"];
  observations: Awaited<ReturnType<typeof getOperatingSystemValidationOverview>>["records"]["observations"];
  sourceContracts: Awaited<ReturnType<typeof getOperatingSystemValidationOverview>>["records"]["sourceContracts"];
}) {
  const { intelligence, graph, objectives, keyResults, decisions, observations, sourceContracts } = input;
  const observedMetricPercent = percent(intelligence.summary.observedMetricCount, intelligence.summary.totalMetrics);
  const modeledMetricPercent = percent(intelligence.metrics.filter(metric => metric.status !== "not_modeled").length, intelligence.summary.totalMetrics);
  const approvedDecisionPercent = percent(decisions.filter(decision => decision.status === "approved" || decision.status === "closed").length, decisions.length);
  const outcomeRecordedPercent = percent(decisions.filter(decision => decision.actualOutcome && decision.lessonsLearned).length, decisions.length);
  const verifiedObservationPercent = percent(observations.filter(observation => observation.status === "verified").length, observations.length);
  const approvedSourcePercent = percent(sourceContracts.filter(contract => contract.status === "approved").length, sourceContracts.length);
  const activeObjectivePercent = percent(objectives.filter(objective => objective.status === "active" || objective.status === "achieved").length, objectives.length);
  const linkedKeyResultPercent = percent(keyResults.filter(result => result.metricKey).length, keyResults.length);
  const dimensions: Record<BenchmarkDimensionKey, { status: "observed" | "partially_supported" | "not_evaluable"; measure: number | null; unit: string; evidence: string; gap: string | null }> = {
    architecture: { status: "partially_supported", measure: null, unit: "not scored", evidence: "Architecture/design records and tenant-scoped context controls are retained in this repository.", gap: "No independent architecture benchmark evidence source is connected." },
    security: { status: "not_evaluable", measure: null, unit: "not scored", evidence: "No approved security telemetry or findings source contract is connected.", gap: "Connect a reviewed security evidence contract before scoring security." },
    governance: { status: observations.length || decisions.length || objectives.length ? "partially_supported" : "not_evaluable", measure: approvedDecisionPercent, unit: "% of retained decision memories approved or closed", evidence: `${decisions.length} retained decision memories; ${observations.length} retained validation observations.`, gap: "Approval count is not a governance-quality score; independent review criteria remain required." },
    observability: { status: "not_evaluable", measure: null, unit: "not scored", evidence: "No approved CI/CD, incident, or observability source contract is connected.", gap: "Connect separately approved observability sources; no telemetry is auto-collected." },
    documentation: { status: "partially_supported", measure: null, unit: "not scored", evidence: "Versioned architecture, validation, README, and in-product route-guide records are retained in the repository.", gap: "No document freshness, reader-comprehension, or review-completion metric is modeled." },
    evidence_coverage: { status: "observed", measure: observedMetricPercent, unit: "% of governed metrics with observed retained evidence", evidence: `${intelligence.summary.observedMetricCount} of ${intelligence.summary.totalMetrics} metrics are request-time observed.`, gap: "Coverage does not attest source correctness or overall data completeness." },
    automation: { status: "partially_supported", measure: intelligence.metrics.find(metric => metric.key === "operations.active_workflow_definitions")?.value ?? null, unit: "active retained workflow definitions", evidence: "Workflow definitions and tasks are tenant-scoped retained records.", gap: "No automation outcome, reliability, or external-action rate is calculated." },
    knowledge_graph: { status: "observed", measure: graph.edges.length, unit: "explicit retained edges", evidence: `${graph.nodes.length} response-time nodes and ${graph.edges.length} explicit retained edges.`, gap: "Edge count does not measure completeness, search accuracy, causality, or truth." },
    decision_readiness: { status: decisions.length ? "partially_supported" : "not_evaluable", measure: outcomeRecordedPercent, unit: "% of retained decisions with actual outcome and lesson", evidence: `${decisions.length} decision memories are retained; review separation is required for approval.`, gap: "No recommendation quality, ROI, or decision improvement rate is inferred." },
    metric_coverage: { status: "observed", measure: modeledMetricPercent, unit: "% of governed metrics with a modeled status", evidence: `${intelligence.summary.totalMetrics} versioned metric definitions are visible.`, gap: "A modeled definition is not an available value or validated metric." },
    ai_readiness: { status: "not_evaluable", measure: null, unit: "not scored", evidence: "AI/coplanar source readiness is documented; no model invocation, prompt evaluation, or outcome telemetry is active.", gap: "Requires approved source access, privacy policy, evaluation suite, human escalation, and no-action controls." },
    data_quality: { status: observations.length ? "partially_supported" : "not_evaluable", measure: verifiedObservationPercent, unit: "% of human-recorded observations verified", evidence: `${observations.length} human-recorded validation observations retained.`, gap: "Observation verification is not a dataset-quality score; source-specific profiling is not modeled." },
    integration_readiness: { status: sourceContracts.length ? "partially_supported" : "not_evaluable", measure: approvedSourcePercent, unit: "% of retained source contracts approved", evidence: `${sourceContracts.length} source-contract readiness records retained.`, gap: "Approved contract does not establish a connector, collection, data reliability, or external authorization." },
  };
  return dimensions;
}

export async function getOperatingSystemValidationOverview(ventureId: number) {
  const db = await ensureDb();
  const [intelligence, graph, objectives, keyResults, decisions, scenarios, links, sourceContracts, benchmarks, observations] = await Promise.all([
    getDecisionIntelligenceOverview(ventureId),
    getEnterpriseKnowledgeGraph(ventureId),
    db.select().from(eosStrategicObjectives).where(eq(eosStrategicObjectives.ventureId, ventureId)),
    db.select().from(eosKeyResults).where(eq(eosKeyResults.ventureId, ventureId)),
    db.select().from(eosDecisionMemories).where(eq(eosDecisionMemories.ventureId, ventureId)),
    db.select().from(eosScenarioPreparations).where(eq(eosScenarioPreparations.ventureId, ventureId)),
    db.select().from(eosEvidenceLinks).where(eq(eosEvidenceLinks.ventureId, ventureId)),
    db.select().from(eosExternalSourceContracts).where(eq(eosExternalSourceContracts.ventureId, ventureId)),
    db.select().from(eosValidationBenchmarks).where(eq(eosValidationBenchmarks.ventureId, ventureId)).orderBy(desc(eosValidationBenchmarks.createdAt)),
    db.select().from(eosValidationObservations).where(eq(eosValidationObservations.ventureId, ventureId)).orderBy(desc(eosValidationObservations.occurredAt)),
  ]);
  const metricTrust = intelligence.metrics.map(structuralMetricTrust);
  const dimensions = currentDimensionSnapshot({ intelligence, graph, objectives, keyResults, decisions, observations, sourceContracts });
  const decisionReplay = decisions.map(decision => ({
    decisionMemoryId: decision.id,
    decisionKey: decision.decisionKey,
    title: decision.title,
    status: decision.status,
    decidedAt: decision.decidedAt,
    approvedAt: decision.approvedAt,
    statement: decision.decisionStatement,
    alternatives: decision.alternativesSnapshot,
    assumptions: decision.assumptionsSnapshot,
    expectedOutcome: decision.expectedOutcome,
    actualOutcome: decision.actualOutcome,
    lessonsLearned: decision.lessonsLearned,
    risks: decision.riskSnapshot,
    metricKeys: decision.metricKeys,
    validationObservations: observations.filter(observation => observation.subjectType === "decision_memory" && observation.subjectReference === `DecisionMemory:${decision.id}`),
    posture: "retained_decision_replay_not_recommendation_quality_or_causal_assessment" as const,
  }));
  const strategyLinkage = objectives.map(objective => {
    const relatedKeyResults = keyResults.filter(result => result.objectiveId === objective.id);
    const relatedLinks = links.filter(link => link.targetType === "objective" && link.targetId === objective.id);
    return { objectiveId: objective.id, objectiveKey: objective.objectiveKey, title: objective.title, status: objective.status, periodStart: objective.periodStart, periodEnd: objective.periodEnd, keyResults: relatedKeyResults.map(result => ({ id: result.id, resultKey: result.resultKey, title: result.title, status: result.status, metricKey: result.metricKey, targetValue: result.targetValue, targetUnit: result.targetUnit })), evidenceLinks: relatedLinks.map(link => ({ id: link.id, evidenceType: link.evidenceType, evidenceReference: link.evidenceReference, posture: link.posture })), confidence: relatedLinks.some(link => link.posture === "retained") ? "explicit_retained_evidence_available" : "evidence_link_missing_or_requires_review", posture: "strategy_linkage_not_progress_calculation_or_outcome_prediction" as const };
  });
  const evidencePaths = graph.edges.slice(0, 60).map(edge => ({ from: edge.from, to: edge.to, relationship: edge.type, posture: "explicit_retained_relationship_not_causality" as const }));
  const engineeringIntelligence = {
    observed: intelligence.categorySummaries.find(category => category.category === "engineering")?.observedMetrics ?? 0,
    total: intelligence.categorySummaries.find(category => category.category === "engineering")?.totalMetrics ?? 0,
    connectedSourceContracts: sourceContracts.filter(contract => ["observability", "security", "analytics"].includes(contract.sourceCategory)).map(contract => ({ id: contract.id, sourceKey: contract.sourceKey, status: contract.status, collectionMode: contract.collectionMode })),
    unavailableQuestions: ["Which modules have the most defects?", "Which APIs change most?", "Which tests fail most often?", "Which code has the highest churn?", "Which features are unused?", "Which bounded contexts are ready for extraction?"],
    collectionRequirement: "Use separately approved, tenant-scoped, read-only CI/CD, version-control, incident, observability, product-usage, and code-quality source contracts. No repository, production telemetry, or user-behavior data is collected by this program.",
  };
  const metaIntelligence = {
    recordedObservationCount: observations.length,
    verifiedObservationCount: observations.filter(observation => observation.status === "verified").length,
    subjectCoverage: observations.reduce<Record<string, number>>((counts, observation) => { counts[observation.subjectType] = (counts[observation.subjectType] ?? 0) + 1; return counts; }, {}),
    unavailableQuestions: ["Which metrics are never viewed?", "Which dashboards are ignored?", "Which alerts are dismissed?", "Which recommendations lead to positive outcomes?"],
    boundary: "No browser telemetry, clickstream tracking, behavior profiling, or recommendation tracking is activated. These questions require a separately approved, consent-aware event contract.",
  };
  return {
    model: { name: "Operating System Validation Program", version: "0.1-evidence-first", ventureId, evaluatedAt: new Date().toISOString(), scoringMethod: "structural_evidence_posture_v0.1" },
    benchmarkDimensions,
    currentBenchmark: { status: "preview_not_persisted", dimensions, limitations: "This is a request-time structural evidence posture. Only a separately created and differently human-reviewed benchmark snapshot may represent a retained release review. Measures are not universal scores, ROI, quality certification, causal evidence, or business outcomes." },
    metricTrust,
    decisionReplay,
    strategyLinkage,
    evidencePaths,
    engineeringIntelligence,
    metaIntelligence,
    records: { benchmarks, observations, objectives, keyResults, decisions, scenarios, evidenceLinks: links, sourceContracts },
    summary: { metricTrustCount: metricTrust.length, structurallyTrustedMetricCount: metricTrust.filter(metric => metric.structuralTrustScore === 100).length, graphNodeCount: graph.nodes.length, graphEdgeCount: graph.edges.length, decisionReplayCount: decisionReplay.length, linkedObjectiveCount: strategyLinkage.filter(objective => objective.evidenceLinks.length > 0).length, benchmarkSnapshotCount: benchmarks.length, validationObservationCount: observations.length, verifiedObservationCount: observations.filter(observation => observation.status === "verified").length },
    boundary: { requestTimeReadOnlyProjections: true as const, humanRecordedValidationOnly: true as const, noAutomaticBehaviorTracking: true as const, noCausalInference: true as const, noForecast: true as const, noScenarioCalculation: true as const, noRecommendation: true as const, noDecisionExecution: true as const, noFinancialEffect: true as const, noPayrollEffect: true as const, noExternalCollection: true as const, noExternalEffect: true as const },
  };
}

export async function createValidationBenchmark(input: { ventureId: number; benchmarkKey: string; releaseLabel: string; limitations: string; createdByUserId: number }) {
  const db = await ensureDb();
  const overview = await getOperatingSystemValidationOverview(input.ventureId);
  const [created] = await db.insert(eosValidationBenchmarks).values({ ventureId: input.ventureId, benchmarkKey: input.benchmarkKey, releaseLabel: input.releaseLabel, status: "draft", scoringMethodVersion: overview.model.scoringMethod, evaluatedAt: new Date(), dimensionSnapshot: overview.currentBenchmark.dimensions, evidenceSnapshot: { model: overview.model, summary: overview.summary, metricTrust: overview.metricTrust, boundary: overview.boundary }, limitations: input.limitations, createdByUserId: input.createdByUserId });
  const [benchmark] = await db.select().from(eosValidationBenchmarks).where(eq(eosValidationBenchmarks.id, Number(created.insertId))); return benchmark;
}

export async function reviewValidationBenchmark(ventureId: number, benchmarkId: number, reviewedByUserId: number) {
  const db = await ensureDb(); const [benchmark] = await db.select().from(eosValidationBenchmarks).where(and(eq(eosValidationBenchmarks.ventureId, ventureId), eq(eosValidationBenchmarks.id, benchmarkId)));
  if (!benchmark) throw new Error("Validation benchmark not found in the selected venture."); if (benchmark.createdByUserId === reviewedByUserId) throw new Error("A validation benchmark requires a different human reviewer."); if (benchmark.status !== "draft" && benchmark.status !== "review") throw new Error("Only draft or review validation benchmarks may be approved.");
  await db.update(eosValidationBenchmarks).set({ status: "approved", reviewedByUserId, reviewedAt: new Date() }).where(eq(eosValidationBenchmarks.id, benchmarkId)); const [updated] = await db.select().from(eosValidationBenchmarks).where(eq(eosValidationBenchmarks.id, benchmarkId)); return updated;
}

export async function createValidationObservation(input: { ventureId: number; observationKey: string; observationType: "executive_question" | "dashboard_review" | "metric_investigation" | "knowledge_graph_search" | "decision_replay" | "report_replacement" | "human_feedback" | "engineering_quality" | "source_quality" | "other"; title: string; outcome: "success" | "partial" | "unsuccessful" | "unknown"; measurementValue?: string; measurementUnit?: string; durationSeconds?: number; subjectType: "metric" | "graph_node" | "decision_memory" | "objective" | "key_result" | "workspace" | "source_contract" | "other"; subjectReference: string; evidenceReference?: string; evidenceSnapshot: Record<string, unknown>; limitations: string; occurredAt: Date; createdByUserId: number }) {
  const db = await ensureDb(); const [created] = await db.insert(eosValidationObservations).values({ ...input, status: "recorded" }); const [observation] = await db.select().from(eosValidationObservations).where(eq(eosValidationObservations.id, Number(created.insertId))); return observation;
}

export async function verifyValidationObservation(ventureId: number, observationId: number, verifiedByUserId: number, status: "verified" | "rejected") {
  const db = await ensureDb(); const [observation] = await db.select().from(eosValidationObservations).where(and(eq(eosValidationObservations.ventureId, ventureId), eq(eosValidationObservations.id, observationId)));
  if (!observation) throw new Error("Validation observation not found in the selected venture."); if (observation.createdByUserId === verifiedByUserId) throw new Error("A validation observation requires a different human verifier."); if (observation.status !== "recorded") throw new Error("Only recorded validation observations may be verified or rejected.");
  await db.update(eosValidationObservations).set({ status, verifiedByUserId, verifiedAt: new Date() }).where(eq(eosValidationObservations.id, observationId)); const [updated] = await db.select().from(eosValidationObservations).where(eq(eosValidationObservations.id, observationId)); return updated;
}
