import { and, eq, inArray } from "drizzle-orm";
import { eosDecisionMemories, eosEvidenceLinks, eosExternalSourceContracts, eosKeyResults, eosScenarioPreparations, eosStrategicObjectives, governanceCases, erpAuditEvents, erpInventoryMovements, erpItemMasterProfiles, erpOperationalRecords, erpSupplierMasterProfiles, erpWorkflowDefinitions, erpWorkflowInstances, erpWorkflowTasks } from "../../drizzle/schema";
import { getDb } from "../db";
import { getDecisionIntelligenceOverview } from "./service";

export type KnowledgeGraphNodeKind = "metric" | "evidence_source" | "operational_record" | "inventory_movement" | "canonical_resource" | "canonical_supplier" | "workflow_definition" | "workflow_instance" | "workflow_task" | "audit_event" | "governance_decision" | "strategic_objective" | "key_result" | "decision_memory" | "scenario_preparation" | "external_source_contract" | "evidence_link";
export type KnowledgeGraphEdgeType = "depends_on" | "derived_from" | "references" | "evidenced_by" | "governed_by" | "executed_in";

const sourceNodeId = (source: string) => `EvidenceSource:${source.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;

export async function getEnterpriseKnowledgeGraph(ventureId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  const [intelligence, records, movements, itemProfiles, supplierProfiles, workflowDefinitions, workflowInstances, workflowTasks, auditEvents, decisions, objectives, keyResults, decisionMemories, scenarios, sourceContracts, evidenceLinks] = await Promise.all([
    getDecisionIntelligenceOverview(ventureId),
    db.select().from(erpOperationalRecords).where(eq(erpOperationalRecords.ventureId, ventureId)),
    db.select().from(erpInventoryMovements).where(eq(erpInventoryMovements.ventureId, ventureId)),
    db.select().from(erpItemMasterProfiles).where(eq(erpItemMasterProfiles.ventureId, ventureId)),
    db.select().from(erpSupplierMasterProfiles).where(eq(erpSupplierMasterProfiles.ventureId, ventureId)),
    db.select().from(erpWorkflowDefinitions).where(eq(erpWorkflowDefinitions.ventureId, ventureId)),
    db.select().from(erpWorkflowInstances).where(eq(erpWorkflowInstances.ventureId, ventureId)),
    db.select().from(erpWorkflowTasks).where(eq(erpWorkflowTasks.ventureId, ventureId)),
    db.select().from(erpAuditEvents).where(eq(erpAuditEvents.ventureId, ventureId)),
    db.select().from(governanceCases).where(eq(governanceCases.ventureId, ventureId)),
    db.select().from(eosStrategicObjectives).where(eq(eosStrategicObjectives.ventureId, ventureId)),
    db.select().from(eosKeyResults).where(eq(eosKeyResults.ventureId, ventureId)),
    db.select().from(eosDecisionMemories).where(eq(eosDecisionMemories.ventureId, ventureId)),
    db.select().from(eosScenarioPreparations).where(eq(eosScenarioPreparations.ventureId, ventureId)),
    db.select().from(eosExternalSourceContracts).where(eq(eosExternalSourceContracts.ventureId, ventureId)),
    db.select().from(eosEvidenceLinks).where(eq(eosEvidenceLinks.ventureId, ventureId)),
  ]);
  const metricSourceNames = Array.from(new Set(intelligence.metrics.flatMap(metric => metric.evidence.map(item => item.source))));
  const nodes = [
    ...intelligence.metrics.map(metric => ({ id: `Metric:${metric.key}`, kind: "metric" as const, label: metric.name, status: metric.status, detail: `Metric definition v${metric.definitionVersion} · ${metric.effectiveFrom}`, evidencePosture: metric.status === "observed" ? "retained_evidence_available" : "missing_or_unmodeled_evidence" })),
    ...metricSourceNames.map(source => ({ id: sourceNodeId(source), kind: "evidence_source" as const, label: source, status: "retained" as const, detail: "Aggregated retained source reference from the request-time metric evaluator.", evidencePosture: "retained_source_reference" })),
    ...records.map(record => ({ id: `OperationalRecord:${record.id}`, kind: "operational_record" as const, label: record.recordNumber, status: record.status, detail: `${record.domain} · ${record.recordType} · ${record.title}`, evidencePosture: "retained_operational_record" })),
    ...movements.map(movement => ({ id: `InventoryMovement:${movement.id}`, kind: "inventory_movement" as const, label: `${movement.movementType} · ${movement.quantity}`, status: "retained" as const, detail: movement.narrative, evidencePosture: "retained_inventory_evidence" })),
    ...itemProfiles.map(profile => ({ id: `Resource:${profile.itemMasterId}`, kind: "canonical_resource" as const, label: `Resource ${profile.itemMasterId}`, status: profile.status, detail: `${profile.itemType} · declared base UOM ${profile.baseUomCode}`, evidencePosture: "canonical_read_projection" })),
    ...supplierProfiles.map(profile => ({ id: `Supplier:${profile.supplierMasterId}`, kind: "canonical_supplier" as const, label: `Supplier ${profile.supplierMasterId}`, status: profile.status, detail: `${profile.counterpartyType} · ${profile.procurementScope}`, evidencePosture: "canonical_read_projection" })),
    ...workflowDefinitions.map(definition => ({ id: `WorkflowDefinition:${definition.id}`, kind: "workflow_definition" as const, label: definition.name, status: definition.status, detail: `${definition.domain} · v${definition.version}`, evidencePosture: "retained_workflow_definition" })),
    ...workflowInstances.map(instance => ({ id: `WorkflowInstance:${instance.id}`, kind: "workflow_instance" as const, label: `Workflow instance ${instance.id}`, status: instance.status, detail: `Current node: ${instance.currentNodeId}`, evidencePosture: "retained_workflow_instance" })),
    ...workflowTasks.map(task => ({ id: `WorkflowTask:${task.id}`, kind: "workflow_task" as const, label: task.title, status: task.status, detail: `Workflow task ${task.id}`, evidencePosture: "retained_human_task" })),
    ...auditEvents.map(event => ({ id: `AuditEvent:${event.id}`, kind: "audit_event" as const, label: event.eventType, status: "retained" as const, detail: `${event.domain} audit event`, evidencePosture: "retained_audit_evidence" })),
    ...decisions.map(decision => ({ id: `GovernanceDecision:${decision.id}`, kind: "governance_decision" as const, label: decision.title, status: decision.status, detail: `${decision.capability} · ${decision.recommendation}`, evidencePosture: "retained_governance_decision" })),
    ...objectives.map(objective => ({ id: `StrategicObjective:${objective.id}`, kind: "strategic_objective" as const, label: objective.title, status: objective.status, detail: `${objective.objectiveKey} · ${objective.periodStart} → ${objective.periodEnd}`, evidencePosture: "human_governed_strategic_record" })),
    ...keyResults.map(result => ({ id: `KeyResult:${result.id}`, kind: "key_result" as const, label: result.title, status: result.status, detail: `${result.resultKey} · ${result.metricKey ?? "no metric key declared"}`, evidencePosture: "human_governed_strategic_record" })),
    ...decisionMemories.map(memory => ({ id: `DecisionMemory:${memory.id}`, kind: "decision_memory" as const, label: memory.title, status: memory.status, detail: `${memory.decisionKey} · expected outcome retained`, evidencePosture: "human_governed_decision_memory" })),
    ...scenarios.map(scenario => ({ id: `ScenarioPreparation:${scenario.id}`, kind: "scenario_preparation" as const, label: scenario.title, status: scenario.status, detail: `${scenario.scenarioType} · preparation only`, evidencePosture: "declared_assumptions_not_simulation" })),
    ...sourceContracts.map(contract => ({ id: `ExternalSourceContract:${contract.id}`, kind: "external_source_contract" as const, label: contract.name, status: contract.status, detail: `${contract.sourceCategory} · ${contract.collectionMode} · collection disabled`, evidencePosture: "source_contract_not_connected" })),
    ...evidenceLinks.map(link => ({ id: `EvidenceLink:${link.id}`, kind: "evidence_link" as const, label: link.evidenceReference, status: link.posture, detail: `${link.evidenceType} → ${link.targetType}:${link.targetId}`, evidencePosture: "explicitly_retained_evidence_link" })),
  ];
  const nodeIds = new Set(nodes.map(node => node.id));
  const edgeCandidates = [
    ...intelligence.metrics.flatMap(metric => metric.evidence.map(evidence => ({ from: `Metric:${metric.key}`, to: sourceNodeId(evidence.source), type: "derived_from" as const, detail: `${metric.name} reads ${evidence.recordCount} retained source row(s) in this request-time evaluation.` }))),
    ...intelligence.dependencyGraph.edges.map(edge => ({ from: `Metric:${edge.from}`, to: `Metric:${edge.to}`, type: "depends_on" as const, detail: edge.relationship.replace(/_/g, " ") })),
    ...movements.filter(movement => movement.operationalRecordId).map(movement => ({ from: `InventoryMovement:${movement.id}`, to: `OperationalRecord:${movement.operationalRecordId}`, type: "evidenced_by" as const, detail: "Movement retains an explicit operational-record reference." })),
    ...movements.map(movement => ({ from: `Resource:${movement.itemMasterId}`, to: `InventoryMovement:${movement.id}`, type: "evidenced_by" as const, detail: "Resource evidence projection includes this retained item movement." })),
    ...workflowInstances.filter(instance => instance.operationalRecordId).map(instance => ({ from: `WorkflowInstance:${instance.id}`, to: `OperationalRecord:${instance.operationalRecordId}`, type: "executed_in" as const, detail: "Workflow instance retains an explicit operational-record reference." })),
    ...workflowInstances.map(instance => ({ from: `WorkflowInstance:${instance.id}`, to: `WorkflowDefinition:${instance.workflowDefinitionId}`, type: "governed_by" as const, detail: "Instance is governed by its retained workflow definition." })),
    ...workflowTasks.map(task => ({ from: `WorkflowTask:${task.id}`, to: `WorkflowInstance:${task.workflowInstanceId}`, type: "executed_in" as const, detail: "Human task belongs to this retained workflow instance." })),
    ...auditEvents.filter(event => event.operationalRecordId).map(event => ({ from: `AuditEvent:${event.id}`, to: `OperationalRecord:${event.operationalRecordId}`, type: "references" as const, detail: "Audit event retains an explicit operational-record reference." })),
    ...keyResults.map(result => ({ from: `KeyResult:${result.id}`, to: `StrategicObjective:${result.objectiveId}`, type: "governed_by" as const, detail: "Key result retains an explicit strategic-objective reference." })),
    ...keyResults.filter(result => result.metricKey).map(result => ({ from: `KeyResult:${result.id}`, to: `Metric:${result.metricKey}`, type: "references" as const, detail: "Key result retains the declared metric key; availability remains visible on the metric node." })),
    ...decisionMemories.filter(memory => memory.governanceCaseId).map(memory => ({ from: `DecisionMemory:${memory.id}`, to: `GovernanceDecision:${memory.governanceCaseId}`, type: "references" as const, detail: "Decision memory retains an explicit governance-case reference." })),
    ...evidenceLinks.map(link => ({ from: `EvidenceLink:${link.id}`, to: link.targetType === "objective" ? `StrategicObjective:${link.targetId}` : link.targetType === "key_result" ? `KeyResult:${link.targetId}` : link.targetType === "decision_memory" ? `DecisionMemory:${link.targetId}` : link.targetType === "scenario" ? `ScenarioPreparation:${link.targetId}` : `ExternalSourceContract:${link.targetId}`, type: "evidenced_by" as const, detail: "Retained evidence link points explicitly to this planning target." })),
    ...evidenceLinks.map(link => ({ from: `EvidenceLink:${link.id}`, to: link.evidenceReference, type: "references" as const, detail: "Evidence link reference is connected only when it exactly equals an existing graph node ID." })),
  ];
  const edges = edgeCandidates.filter(edge => nodeIds.has(edge.from) && nodeIds.has(edge.to));
  const kindCounts = nodes.reduce<Record<string, number>>((counts, node) => { counts[node.kind] = (counts[node.kind] ?? 0) + 1; return counts; }, {});
  return {
    model: { name: "Enterprise Knowledge Graph", version: "0.1-read-only-projection", ventureId, evaluatedAt: intelligence.model.evaluatedAt, posture: "retained_relationship_projection_not_causal_model_or_system_of_record" as const },
    nodes,
    edges,
    summary: { nodeCount: nodes.length, edgeCount: edges.length, nodeKinds: kindCounts, metricNodeCount: intelligence.metrics.length, evidenceSourceNodeCount: metricSourceNames.length },
    boundary: { readOnlyProjection: true as const, noGraphPersistence: true as const, noSourceMutation: true as const, noRelationshipInference: true as const, noCausalityClaim: true as const, noPrediction: true as const, noRecommendation: true as const, noDecisionExecution: true as const, noFinancialEffect: true as const, noPayrollEffect: true as const, noExternalIntegration: true as const, noExternalEffect: true as const },
  };
}
