import { and, desc, eq, inArray } from "drizzle-orm";
import { createHash } from "node:crypto";
import { erpAccountingCalculationEvidence, erpAuditEvents, erpCostingCalculationEvidence, erpCostingPolicyRevisions, erpCostLayers, erpInventoryMovements, erpMasterRecords } from "../../drizzle/schema";
import { getDb } from "../db";

export const valuationMethods = ["fifo", "lifo", "moving_average", "weighted_average", "standard_cost", "specific_identification"] as const;
export const landedCostCategories = ["freight", "insurance", "customs", "duty", "handling", "miscellaneous"] as const;
export const allocationDrivers = ["quantity", "weight", "value", "volume", "manual_finance_approved"] as const;
type ValuationMethod = (typeof valuationMethods)[number];
type LandedCostCategory = (typeof landedCostCategories)[number];
type AllocationDriver = (typeof allocationDrivers)[number];

async function db() { const connection = await getDb(); if (!connection) throw new Error("Database is not available."); return connection; }
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const quantity = (value: number) => Math.round((value + Number.EPSILON) * 1_000) / 1_000;
function canonicalize(value: unknown): unknown { if (Array.isArray(value)) return value.map(canonicalize); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonicalize(child)])); return value; }
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
function dateValid(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value); }
async function audit(ventureId: number, eventType: string, actorUserId: number, payload: Record<string, unknown>) { const connection = await db(); await connection.insert(erpAuditEvents).values({ ventureId, domain: "finance", eventType, actorUserId, payload: { ...payload, costingEngine: true, noJournalCreated: true, noAutomaticPosting: true, noBalanceMutation: true, noTaxCalculation: true, noPayrollCalculation: true, noPaymentExecution: true, noFiling: true, noIntegrationTriggered: true, noExternalEffect: true } }); }

async function approvedPolicy(input: { ventureId: number; costingPolicyRevisionId: number; costDomain: "inventory"; costingDate: string }) {
  const connection = await db();
  const [policy] = await connection.select().from(erpCostingPolicyRevisions).where(and(eq(erpCostingPolicyRevisions.id, input.costingPolicyRevisionId), eq(erpCostingPolicyRevisions.ventureId, input.ventureId))).limit(1);
  if (!policy || policy.costDomain !== input.costDomain || policy.status !== "approved") throw new Error("An approved inventory costing-policy revision is required in the active venture.");
  if (policy.effectiveFrom > input.costingDate || (policy.effectiveTo && policy.effectiveTo < input.costingDate)) throw new Error("The approved costing policy is not effective on the supplied costing date.");
  return policy;
}

function invariantSnapshot(input: { type: "valuation_preview" | "landed_cost_allocation" | "validation_report"; result: Record<string, unknown>; refusalReasons: string[] }) {
  const lines = Array.isArray(input.result.lines) ? input.result.lines as Array<Record<string, unknown>> : [];
  const allocationTotal = Number(input.result.allocationTotal ?? 0);
  const suppliedTotal = Number(input.result.suppliedTotal ?? 0);
  const layerQuantityValid = lines.every(line => Number(line.quantity ?? 0) >= 0 && Number(line.remainingQuantity ?? 0) >= 0 && Number(line.consumedQuantity ?? 0) >= 0);
  const valueFinite = lines.every(line => Number.isFinite(Number(line.value ?? line.allocatedValue ?? 0)));
  return { noRefusalReasons: input.refusalReasons.length === 0, layerQuantityValid, valueFinite, allocationReconciles: input.type !== "landed_cost_allocation" || money(allocationTotal) === money(suppliedTotal), deterministicResidualExplained: input.type !== "landed_cost_allocation" || typeof input.result.residualTargetLayerId === "number" || money(suppliedTotal) === 0, noJournalCreated: true, noAutomaticPosting: true, noBalanceMutation: true, noFinancialStatementMutation: true, noTaxCalculation: true, noPayrollCalculation: true, noPaymentExecution: true, noFiling: true, noIntegrationTriggered: true, noExternalEffect: true };
}

async function persistCalculationEvidence(input: { ventureId: number; calculationKey: string; calculationType: "valuation_preview" | "landed_cost_allocation" | "validation_report"; costingPolicyRevisionId?: number; costLayerId?: number; accountingCalculationEvidenceId?: number; actorUserId: number; inputSnapshot: Record<string, unknown>; calculationSnapshot: Record<string, unknown>; invariantSnapshot: Record<string, unknown>; status: "completed" | "refused" }) {
  const connection = await db();
  const [existing] = await connection.select().from(erpCostingCalculationEvidence).where(and(eq(erpCostingCalculationEvidence.ventureId, input.ventureId), eq(erpCostingCalculationEvidence.calculationKey, input.calculationKey))).limit(1);
  if (existing) return existing;
  if (input.accountingCalculationEvidenceId) {
    const [linked] = await connection.select().from(erpAccountingCalculationEvidence).where(and(eq(erpAccountingCalculationEvidence.id, input.accountingCalculationEvidenceId), eq(erpAccountingCalculationEvidence.ventureId, input.ventureId))).limit(1);
    if (!linked) throw new Error("Linked accounting calculation evidence is not available in the active venture.");
  }
  const [previous] = await connection.select().from(erpCostingCalculationEvidence).where(eq(erpCostingCalculationEvidence.ventureId, input.ventureId)).orderBy(desc(erpCostingCalculationEvidence.id)).limit(1);
  const inputHash = hash(input.inputSnapshot); const outputHash = hash(input.calculationSnapshot); const previousRecordHash = previous?.recordHash ?? null; const recordHash = hash({ calculationKey: input.calculationKey, calculationType: input.calculationType, inputHash, outputHash, previousRecordHash, engineVersion: "1.0.0" });
  const result = await connection.insert(erpCostingCalculationEvidence).values({ ventureId: input.ventureId, calculationKey: input.calculationKey, calculationType: input.calculationType, costingPolicyRevisionId: input.costingPolicyRevisionId, costLayerId: input.costLayerId, accountingCalculationEvidenceId: input.accountingCalculationEvidenceId, engineVersion: "1.0.0", status: input.status, inputHash, outputHash, previousRecordHash, recordHash, inputSnapshot: input.inputSnapshot, calculationSnapshot: input.calculationSnapshot, invariantSnapshot: input.invariantSnapshot, calculatedByUserId: input.actorUserId });
  const id = Number(result[0].insertId);
  await audit(input.ventureId, "costing_calculation_evidence.created", input.actorUserId, { costingCalculationEvidenceId: id, calculationKey: input.calculationKey, calculationType: input.calculationType, status: input.status, recordHash, previousRecordHash, linkedAccountingCalculationEvidenceId: input.accountingCalculationEvidenceId ?? null });
  return { id, calculationKey: input.calculationKey, recordHash, previousRecordHash, status: input.status };
}

export async function listCostingControl(ventureId: number) {
  const connection = await db();
  const [policies, layers, evidence] = await Promise.all([
    connection.select().from(erpCostingPolicyRevisions).where(eq(erpCostingPolicyRevisions.ventureId, ventureId)).orderBy(desc(erpCostingPolicyRevisions.createdAt)),
    connection.select().from(erpCostLayers).where(eq(erpCostLayers.ventureId, ventureId)).orderBy(desc(erpCostLayers.createdAt)),
    connection.select().from(erpCostingCalculationEvidence).where(eq(erpCostingCalculationEvidence.ventureId, ventureId)).orderBy(desc(erpCostingCalculationEvidence.id)),
  ]);
  return { policies, layers, evidence, boundary: { evidenceOnly: true as const, noJournalCreated: true as const, noAutomaticPosting: true as const, noBalanceMutation: true as const, noFinancialStatementMutation: true as const, noTaxCalculation: true as const, noPayrollCalculation: true as const, noPaymentExecution: true as const, noFiling: true as const, noIntegrationTriggered: true as const, noExternalEffect: true as const } };
}

export async function createCostingPolicyRevision(input: { ventureId: number; policyCode: string; policyName: string; costDomain: "inventory" | "manufacturing" | "project" | "service" | "asset" | "investment"; valuationMethod: ValuationMethod; effectiveFrom: string; effectiveTo?: string; policyConfiguration: Record<string, unknown>; sourceRequirements: Record<string, unknown>; rationale: string; adrReference?: string; createdByUserId: number }) {
  if (!dateValid(input.effectiveFrom) || (input.effectiveTo && !dateValid(input.effectiveTo))) throw new Error("Costing policy effective dates must use YYYY-MM-DD.");
  if (input.effectiveTo && input.effectiveTo < input.effectiveFrom) throw new Error("Costing policy effective end date must not precede its start date.");
  const connection = await db();
  const rows = await connection.select().from(erpCostingPolicyRevisions).where(and(eq(erpCostingPolicyRevisions.ventureId, input.ventureId), eq(erpCostingPolicyRevisions.policyCode, input.policyCode)));
  const revision = Math.max(0, ...rows.map(row => row.revision)) + 1;
  const result = await connection.insert(erpCostingPolicyRevisions).values({ ...input, revision, status: "draft" }); const id = Number(result[0].insertId);
  await audit(input.ventureId, "costing_policy_revision.created", input.createdByUserId, { costingPolicyRevisionId: id, policyCode: input.policyCode, revision, costDomain: input.costDomain, valuationMethod: input.valuationMethod, effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo ?? null });
  return { id, revision, status: "draft" as const, noValuationPosting: true as const };
}

export async function approveCostingPolicyRevision(input: { ventureId: number; costingPolicyRevisionId: number; actorUserId: number }) {
  const connection = await db();
  const [candidate] = await connection.select().from(erpCostingPolicyRevisions).where(and(eq(erpCostingPolicyRevisions.id, input.costingPolicyRevisionId), eq(erpCostingPolicyRevisions.ventureId, input.ventureId))).limit(1);
  if (!candidate) throw new Error("Costing policy revision not found in the active venture.");
  if (candidate.status !== "draft" && candidate.status !== "reviewed") throw new Error("Only draft or reviewed costing policy revisions may be approved.");
  const approved = await connection.select().from(erpCostingPolicyRevisions).where(and(eq(erpCostingPolicyRevisions.ventureId, input.ventureId), eq(erpCostingPolicyRevisions.policyCode, candidate.policyCode), eq(erpCostingPolicyRevisions.status, "approved")));
  const overlaps = approved.some(row => candidate.effectiveFrom <= (row.effectiveTo ?? "9999-12-31") && (candidate.effectiveTo ?? "9999-12-31") >= row.effectiveFrom);
  if (overlaps) throw new Error("An approved effective-dated costing policy revision already overlaps this interval.");
  await connection.update(erpCostingPolicyRevisions).set({ status: "approved", approvedByUserId: input.actorUserId, approvedAt: new Date() }).where(eq(erpCostingPolicyRevisions.id, candidate.id));
  await audit(input.ventureId, "costing_policy_revision.approved", input.actorUserId, { costingPolicyRevisionId: candidate.id, policyCode: candidate.policyCode, revision: candidate.revision, valuationMethod: candidate.valuationMethod });
  return { id: candidate.id, status: "approved" as const, noValuationPosting: true as const };
}

export async function createReceiptCostLayer(input: { ventureId: number; sourceInventoryMovementId: number; costingPolicyRevisionId: number; costingDate: string; originalValue: number; currency: string; sourceEvidence?: Record<string, unknown>; actorUserId: number }) {
  if (!dateValid(input.costingDate) || !Number.isFinite(input.originalValue) || input.originalValue < 0 || !/^[A-Za-z]{3}$/.test(input.currency)) throw new Error("Receipt cost-layer date, value, and currency are invalid.");
  const connection = await db(); const policy = await approvedPolicy({ ventureId: input.ventureId, costingPolicyRevisionId: input.costingPolicyRevisionId, costDomain: "inventory", costingDate: input.costingDate });
  const [movement] = await connection.select().from(erpInventoryMovements).where(and(eq(erpInventoryMovements.id, input.sourceInventoryMovementId), eq(erpInventoryMovements.ventureId, input.ventureId))).limit(1);
  if (!movement || movement.movementType !== "receipt") throw new Error("An immutable receipt inventory movement is required for a receipt cost layer.");
  const [item] = await connection.select().from(erpMasterRecords).where(and(eq(erpMasterRecords.id, movement.itemMasterId), eq(erpMasterRecords.ventureId, input.ventureId), eq(erpMasterRecords.domain, "item"), eq(erpMasterRecords.status, "active"))).limit(1);
  if (!item) throw new Error("Receipt cost layer requires an active item master in the active venture.");
  const sourceFacts = (movement.sourceFacts ?? {}) as Record<string, unknown>;
  const attributionSnapshot = { costCenterCode: typeof sourceFacts.costCenterCode === "string" ? sourceFacts.costCenterCode : null, profitCenterCode: typeof sourceFacts.profitCenterCode === "string" ? sourceFacts.profitCenterCode : null, internalOrderCode: typeof sourceFacts.internalOrderCode === "string" ? sourceFacts.internalOrderCode : null, projectCode: typeof sourceFacts.projectCode === "string" ? sourceFacts.projectCode : null, warehouseCode: typeof sourceFacts.warehouseCode === "string" ? sourceFacts.warehouseCode : null, noInference: true };
  const sourceSnapshot = { inventoryMovementId: movement.id, itemMasterId: movement.itemMasterId, movementType: movement.movementType, quantity: Number(movement.quantity), narrative: movement.narrative, createdAt: new Date(movement.createdAt).toISOString(), costingDate: input.costingDate, sourceFacts };
  const evidenceSnapshot = { sourceEvidence: input.sourceEvidence ?? {}, sourceFactKeys: Object.keys(sourceFacts), currency: input.currency.toUpperCase(), policyCode: policy.policyCode, policyRevision: policy.revision, valuationMethod: policy.valuationMethod };
  const layerKey = `COST-LAYER-RECEIPT-${movement.id}-${policy.id}`;
  const [existing] = await connection.select().from(erpCostLayers).where(and(eq(erpCostLayers.ventureId, input.ventureId), eq(erpCostLayers.layerKey, layerKey))).limit(1); if (existing) return existing;
  const sourceHash = hash({ sourceSnapshot, attributionSnapshot, evidenceSnapshot, originalValue: money(input.originalValue) });
  const result = await connection.insert(erpCostLayers).values({ ventureId: input.ventureId, layerKey, itemMasterId: movement.itemMasterId, sourceInventoryMovementId: movement.id, costingPolicyRevisionId: policy.id, layerType: "receipt", quantity: String(quantity(Number(movement.quantity))), remainingQuantity: String(quantity(Number(movement.quantity))), originalValue: String(money(input.originalValue)), remainingValue: String(money(input.originalValue)), currency: input.currency.toUpperCase(), sourceSnapshot, attributionSnapshot, evidenceSnapshot, sourceHash, createdByUserId: input.actorUserId });
  const id = Number(result[0].insertId); await audit(input.ventureId, "cost_layer.receipt_created", input.actorUserId, { costLayerId: id, layerKey, sourceInventoryMovementId: movement.id, costingPolicyRevisionId: policy.id, attributionKeys: Object.keys(attributionSnapshot).filter(key => attributionSnapshot[key as keyof typeof attributionSnapshot] !== null), noInventoryBalanceMutation: true });
  return { id, layerKey, sourceHash, policyRevisionId: policy.id, noInventoryBalanceMutation: true as const, noValuationPosting: true as const };
}

function allocationLines(input: { targets: Array<{ id: number; quantity: number; originalValue: number; sourceSnapshot: unknown }>; driver: AllocationDriver; manualDrivers?: Array<{ costLayerId: number; driverValue: number }>; suppliedTotal: number }) {
  const manualByLayerId = new Map((input.manualDrivers ?? []).map(entry => [entry.costLayerId, entry.driverValue]));
  const raw = input.targets.map(target => {
    const sourceSnapshot = target.sourceSnapshot as Record<string, unknown>; const sourceFacts = (sourceSnapshot?.sourceFacts ?? {}) as Record<string, unknown>;
    const measureValue = input.driver === "weight" || input.driver === "volume" ? Number(sourceFacts[input.driver] ?? sourceSnapshot?.[input.driver] ?? 0) : 0;
    const measureUnit = input.driver === "weight" ? sourceFacts.weightUnit : input.driver === "volume" ? sourceFacts.volumeUnit : undefined;
    return { target, driverValue: input.driver === "quantity" ? target.quantity : input.driver === "value" ? target.originalValue : input.driver === "weight" || input.driver === "volume" ? measureValue : manualByLayerId.get(target.id) ?? 0, driverUnit: typeof measureUnit === "string" ? measureUnit : null };
  });
  const measureDriven = input.driver === "weight" || input.driver === "volume";
  const declaredUnits = Array.from(new Set(raw.map(line => line.driverUnit).filter((unit): unit is string => typeof unit === "string" && unit.length > 0)));
  if (measureDriven && raw.some(line => line.driverUnit === null)) throw new Error(`Selected ${input.driver} allocation targets must each retain an explicit declared unit.`);
  if (measureDriven && declaredUnits.length !== 1) throw new Error(`Selected ${input.driver} allocation targets declare incompatible units (${declaredUnits.join(", ")}). Unit conversion is not implemented.`);
  const totalDriver = raw.reduce((sum, line) => sum + line.driverValue, 0); if (!Number.isFinite(totalDriver) || totalDriver <= 0) throw new Error("Selected allocation driver has no positive eligible total.");
  let allocatedCents = 0; const totalCents = Math.round(input.suppliedTotal * 100);
  const lines = raw.map((line, index) => { const final = index === raw.length - 1; const cents = final ? totalCents - allocatedCents : Math.floor(totalCents * line.driverValue / totalDriver); allocatedCents += cents; return { costLayerId: line.target.id, driverValue: line.driverValue, driverUnit: line.driverUnit, allocatedValue: money(cents / 100), allocatedCents: cents, residualApplied: final ? totalCents - (allocatedCents - cents) - cents : 0 }; });
  return { lines, driverUnit: measureDriven ? declaredUnits[0] ?? null : null, totalDriver, allocationTotal: money(lines.reduce((sum, line) => sum + line.allocatedValue, 0)), residualTargetLayerId: lines[lines.length - 1]?.costLayerId ?? null };
}

export async function createLandedCostAllocationEvidence(input: { ventureId: number; costingPolicyRevisionId: number; costingDate: string; landedCostCategory: LandedCostCategory; allocationDriver: AllocationDriver; totalAmount: number; currency: string; targetCostLayerIds: number[]; manualDrivers?: Array<{ costLayerId: number; driverValue: number }>; rationale: string; accountingCalculationEvidenceId?: number; actorUserId: number }) {
  const refusalReasons: string[] = [];
  if (!dateValid(input.costingDate) || !Number.isFinite(input.totalAmount) || input.totalAmount < 0 || !/^[A-Za-z]{3}$/.test(input.currency) || !input.rationale.trim()) refusalReasons.push("Allocation date, total amount, currency, and rationale are required.");
  const policy = await approvedPolicy({ ventureId: input.ventureId, costingPolicyRevisionId: input.costingPolicyRevisionId, costDomain: "inventory", costingDate: input.costingDate }); const connection = await db();
  const ids = Array.from(new Set(input.targetCostLayerIds)); const layers = ids.length ? await connection.select().from(erpCostLayers).where(and(eq(erpCostLayers.ventureId, input.ventureId), inArray(erpCostLayers.id, ids))) : [];
  if (layers.length !== ids.length || layers.some(layer => layer.layerType !== "receipt" || layer.currency !== input.currency.toUpperCase() || layer.costingPolicyRevisionId !== policy.id)) refusalReasons.push("Allocation targets must be same-venture receipt layers in the allocation currency and selected policy revision.");
  if (input.allocationDriver === "manual_finance_approved" && (!input.manualDrivers?.length || input.manualDrivers.some(entry => !Number.isFinite(entry.driverValue) || entry.driverValue <= 0))) refusalReasons.push("Manual allocation requires positive finance-approved driver values for every target.");
  let result: Record<string, unknown> = { lines: [], suppliedTotal: money(input.totalAmount), allocationTotal: 0, residualTargetLayerId: null }; try { if (!refusalReasons.length) result = { ...allocationLines({ targets: layers.map(layer => ({ id: layer.id, quantity: Number(layer.quantity), originalValue: Number(layer.originalValue), sourceSnapshot: layer.sourceSnapshot })), driver: input.allocationDriver, manualDrivers: input.manualDrivers, suppliedTotal: input.totalAmount }), suppliedTotal: money(input.totalAmount), category: input.landedCostCategory, currency: input.currency.toUpperCase() }; } catch (error) { refusalReasons.push(error instanceof Error ? error.message : "Allocation failed."); }
  const invariant = invariantSnapshot({ type: "landed_cost_allocation", result, refusalReasons }); const key = `COST-ALLOC-${input.costingPolicyRevisionId}-${hash({ date: input.costingDate, category: input.landedCostCategory, driver: input.allocationDriver, amount: money(input.totalAmount), targets: ids, manualDrivers: input.manualDrivers ?? [] }).slice(0, 48)}`;
  return persistCalculationEvidence({ ventureId: input.ventureId, calculationKey: key, calculationType: "landed_cost_allocation", costingPolicyRevisionId: policy.id, accountingCalculationEvidenceId: input.accountingCalculationEvidenceId, actorUserId: input.actorUserId, inputSnapshot: { costingDate: input.costingDate, landedCostCategory: input.landedCostCategory, allocationDriver: input.allocationDriver, totalAmount: money(input.totalAmount), currency: input.currency.toUpperCase(), targetCostLayerIds: ids, manualDrivers: input.manualDrivers ?? [], rationale: input.rationale.trim(), policy: { id: policy.id, code: policy.policyCode, revision: policy.revision } }, calculationSnapshot: { result, refusalReasons }, invariantSnapshot: invariant, status: refusalReasons.length ? "refused" : "completed" });
}

export async function previewInventoryValuation(input: { ventureId: number; itemMasterId: number; costingPolicyRevisionId: number; costingDate: string; issueQuantity: number; accountingCalculationEvidenceId?: number; rationale: string; actorUserId: number }) {
  const refusalReasons: string[] = []; if (!dateValid(input.costingDate) || !Number.isFinite(input.issueQuantity) || input.issueQuantity <= 0 || !input.rationale.trim()) refusalReasons.push("Costing date, positive issue quantity, and rationale are required.");
  const policy = await approvedPolicy({ ventureId: input.ventureId, costingPolicyRevisionId: input.costingPolicyRevisionId, costDomain: "inventory", costingDate: input.costingDate }); const connection = await db();
  const layers = await connection.select().from(erpCostLayers).where(and(eq(erpCostLayers.ventureId, input.ventureId), eq(erpCostLayers.itemMasterId, input.itemMasterId), eq(erpCostLayers.layerType, "receipt"), eq(erpCostLayers.costingPolicyRevisionId, policy.id))).orderBy(erpCostLayers.createdAt);
  const available = layers.filter(layer => Number(layer.remainingQuantity) > 0); if (!available.length) refusalReasons.push("No eligible remaining receipt cost layers exist for the selected item and policy."); if (available.reduce((sum, layer) => sum + Number(layer.remainingQuantity), 0) + 1e-9 < input.issueQuantity) refusalReasons.push("Eligible cost layers have insufficient remaining quantity for this preview.");
  if (["standard_cost", "specific_identification"].includes(policy.valuationMethod)) refusalReasons.push(`${policy.valuationMethod} preview requires separately governed canonical standard-cost or lot/serial identification evidence and is refused in this foundation.`);
  const ordered = policy.valuationMethod === "lifo" ? [...available].reverse() : available;
  const lines: Array<Record<string, unknown>> = []; let remaining = quantity(input.issueQuantity); let total = 0;
  if (!refusalReasons.length) {
    if (["moving_average", "weighted_average"].includes(policy.valuationMethod)) {
      const totalQuantity = available.reduce((sum, layer) => sum + Number(layer.remainingQuantity), 0); const totalValue = available.reduce((sum, layer) => sum + Number(layer.remainingValue), 0); const unitCost = totalValue / totalQuantity; lines.push({ method: policy.valuationMethod, pooledLayerIds: available.map(layer => layer.id), consumedQuantity: quantity(input.issueQuantity), unitCost: money(unitCost), value: money(unitCost * input.issueQuantity), quantity: quantity(input.issueQuantity), remainingQuantity: quantity(totalQuantity - input.issueQuantity) }); total = money(unitCost * input.issueQuantity);
    } else for (const layer of ordered) { if (remaining <= 0) break; const consumedQuantity = quantity(Math.min(remaining, Number(layer.remainingQuantity))); const unitCost = Number(layer.remainingValue) / Number(layer.remainingQuantity); const value = money(unitCost * consumedQuantity); lines.push({ costLayerId: layer.id, method: policy.valuationMethod, consumedQuantity, unitCost: money(unitCost), value, quantity: Number(layer.quantity), remainingQuantity: quantity(Number(layer.remainingQuantity) - consumedQuantity), sourceHash: layer.sourceHash, attributionSnapshot: layer.attributionSnapshot }); total = money(total + value); remaining = quantity(remaining - consumedQuantity); }
  }
  const result: Record<string, unknown> = { lines, totalValue: money(total), totalQuantity: quantity(input.issueQuantity), currency: available[0]?.currency ?? null, policyMethod: policy.valuationMethod, suppliedTotal: 0, allocationTotal: 0, residualTargetLayerId: null }; const invariant = invariantSnapshot({ type: "valuation_preview", result, refusalReasons }); const eligibleLayerEvidence = available.map(layer => ({ id: layer.id, sourceHash: layer.sourceHash, remainingQuantity: Number(layer.remainingQuantity), remainingValue: Number(layer.remainingValue) })); const key = `COST-VALUATION-${input.itemMasterId}-${policy.id}-${hash({ date: input.costingDate, quantity: quantity(input.issueQuantity), rationale: input.rationale.trim(), eligibleLayerEvidence }).slice(0, 48)}`;
  return persistCalculationEvidence({ ventureId: input.ventureId, calculationKey: key, calculationType: "valuation_preview", costingPolicyRevisionId: policy.id, accountingCalculationEvidenceId: input.accountingCalculationEvidenceId, actorUserId: input.actorUserId, inputSnapshot: { itemMasterId: input.itemMasterId, costingDate: input.costingDate, issueQuantity: quantity(input.issueQuantity), rationale: input.rationale.trim(), policy: { id: policy.id, code: policy.policyCode, revision: policy.revision, valuationMethod: policy.valuationMethod }, eligibleLayerEvidence }, calculationSnapshot: { result, refusalReasons }, invariantSnapshot: invariant, status: refusalReasons.length ? "refused" : "completed" });
}

export async function getCostingValidationReport(input: { ventureId: number; costingPolicyRevisionId?: number; actorUserId: number }) {
  const connection = await db(); const [allLayers, allEvidence] = await Promise.all([connection.select().from(erpCostLayers).where(eq(erpCostLayers.ventureId, input.ventureId)), connection.select().from(erpCostingCalculationEvidence).where(eq(erpCostingCalculationEvidence.ventureId, input.ventureId)).orderBy(erpCostingCalculationEvidence.id)]); const layers = input.costingPolicyRevisionId ? allLayers.filter(layer => layer.costingPolicyRevisionId === input.costingPolicyRevisionId) : allLayers; const evidence = input.costingPolicyRevisionId ? allEvidence.filter(record => record.costingPolicyRevisionId === input.costingPolicyRevisionId) : allEvidence;
  let expectedPrevious: string | null = null; const chainChecksById = new Map(allEvidence.map(record => { const inputHashValid = hash(record.inputSnapshot) === record.inputHash; const outputHashValid = hash(record.calculationSnapshot) === record.outputHash; const expectedHash = hash({ calculationKey: record.calculationKey, calculationType: record.calculationType, inputHash: record.inputHash, outputHash: record.outputHash, previousRecordHash: expectedPrevious, engineVersion: record.engineVersion }); const chainLinkValid = record.previousRecordHash === expectedPrevious; const recordHashValid = record.recordHash === expectedHash; expectedPrevious = record.recordHash; return [record.id, { id: record.id, calculationKey: record.calculationKey, valid: inputHashValid && outputHashValid && chainLinkValid && recordHashValid, inputHashValid, outputHashValid, chainLinkValid, recordHashValid }] as const; })); const chainChecks = evidence.map(record => chainChecksById.get(record.id)!).filter(Boolean);
  const layerChecks = layers.map(layer => ({ id: layer.id, layerKey: layer.layerKey, quantityValid: Number(layer.quantity) > 0 && Number(layer.remainingQuantity) >= 0 && Number(layer.remainingQuantity) <= Number(layer.quantity), valueValid: Number(layer.originalValue) >= 0 && Number(layer.remainingValue) >= 0, sourceHashValid: hash({ sourceSnapshot: layer.sourceSnapshot, attributionSnapshot: layer.attributionSnapshot, evidenceSnapshot: layer.evidenceSnapshot, originalValue: Number(layer.originalValue) }) === layer.sourceHash })); const valid = chainChecks.every(check => check.valid) && layerChecks.every(check => check.quantityValid && check.valueValid && check.sourceHashValid);
  const result = { chainChecks, layerChecks, valid, layerCount: layers.length, calculationRecordCount: evidence.length, lines: layerChecks.map(check => ({ quantity: check.quantityValid ? 1 : -1, remainingQuantity: check.valueValid ? 1 : -1, value: check.sourceHashValid ? 1 : Number.NaN })), suppliedTotal: 0, allocationTotal: 0, residualTargetLayerId: null }; const invariant = invariantSnapshot({ type: "validation_report", result, refusalReasons: valid ? [] : ["One or more cost-layer or calculation-chain integrity checks failed."] }); const key = `COST-VALIDATION-${hash({ layerIds: layers.map(layer => [layer.id, layer.sourceHash]), evidence: evidence.map(record => [record.id, record.recordHash]) }).slice(0, 60)}`;
  const evidenceRecord = await persistCalculationEvidence({ ventureId: input.ventureId, calculationKey: key, calculationType: "validation_report", actorUserId: input.actorUserId, inputSnapshot: { layerCount: layers.length, calculationRecordCount: evidence.length, layerIdentifiers: layers.map(layer => ({ id: layer.id, sourceHash: layer.sourceHash })), calculationIdentifiers: evidence.map(record => ({ id: record.id, recordHash: record.recordHash })) }, calculationSnapshot: result, invariantSnapshot: invariant, status: valid ? "completed" : "refused" });
  return { ...result, validationEvidence: evidenceRecord, boundary: { readOnlyValidation: true as const, noJournalCreated: true as const, noAutomaticPosting: true as const, noBalanceMutation: true as const, noFinancialStatementMutation: true as const, noTaxCalculation: true as const, noPayrollCalculation: true as const, noPaymentExecution: true as const, noFiling: true as const, noIntegrationTriggered: true as const, noExternalEffect: true as const } };
}
