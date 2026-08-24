import { and, desc, eq } from "drizzle-orm";
import {
  erpAccountingPeriods,
  erpAuditEvents,
  erpBudgetEnvelopes,
  erpBudgetNodes,
  erpExchangeRates,
  erpInventoryBalances,
  erpInventoryMovements,
  erpJournalLines,
  erpJournals,
  erpLedgerEntries,
  erpMasterRecords,
  erpOperationalRecords,
  erpTaxPolicies,
  erpWorkflowDefinitions,
  erpWorkflowInstances,
  erpWorkflowTasks,
  ventures,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { availableBudget, calculateTax, canTransition, convertCurrency, normalizeMoney, validateBalancedJournal, type OperationalStatus } from "./policy";

export type MasterDomain = "customer" | "supplier" | "item" | "employee" | "account" | "project" | "asset" | "location" | "compensation_component" | "tax_category";
export type OperationalDomain = "finance" | "sales" | "procurement" | "inventory" | "people" | "payroll" | "projects" | "assets" | "service" | "crm";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  return db;
}

export async function createMasterRecord(input: { ventureId: number; domain: MasterDomain; code: string; name: string; attributes: Record<string, unknown>; createdByUserId: number }) {
  const db = await requireDb();
  const result = await db.insert(erpMasterRecords).values({ ...input, status: "active" });
  const id = Number(result[0].insertId);
  await createAuditEvent({ ventureId: input.ventureId, domain: input.domain, eventType: "master.created", actorUserId: input.createdByUserId, payload: { id, code: input.code, name: input.name } });
  return { id, ...input, status: "active" as const };
}

export async function listMasterRecords(ventureId: number, domain?: MasterDomain) {
  const db = await requireDb();
  return db.select().from(erpMasterRecords).where(domain ? and(eq(erpMasterRecords.ventureId, ventureId), eq(erpMasterRecords.domain, domain)) : eq(erpMasterRecords.ventureId, ventureId)).orderBy(desc(erpMasterRecords.updatedAt));
}

export async function createAccountingPeriod(input: { ventureId: number; code: string; name: string; startDate: string; endDate: string; createdByUserId: number }) {
  if (input.startDate > input.endDate) throw new Error("Period start date must be on or before the end date.");
  const db = await requireDb();
  const result = await db.insert(erpAccountingPeriods).values({ ...input, status: "open" });
  const id = Number(result[0].insertId);
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", eventType: "period.created", actorUserId: input.createdByUserId, payload: { id, code: input.code } });
  return { id, ...input, status: "open" as const };
}

export async function listAccountingPeriods(ventureId: number) {
  const db = await requireDb();
  return db.select().from(erpAccountingPeriods).where(eq(erpAccountingPeriods.ventureId, ventureId)).orderBy(desc(erpAccountingPeriods.startDate));
}

export async function closeAccountingPeriod(input: { ventureId: number; accountingPeriodId: number; actorUserId: number }) {
  const db = await requireDb();
  const rows = await db.select().from(erpAccountingPeriods).where(and(eq(erpAccountingPeriods.id, input.accountingPeriodId), eq(erpAccountingPeriods.ventureId, input.ventureId))).limit(1);
  const period = rows[0];
  if (!period) throw new Error("Accounting period not found in the active venture.");
  if (period.status === "closed") throw new Error("Accounting period is already closed.");
  const drafts = await db.select().from(erpJournals).where(and(eq(erpJournals.ventureId, input.ventureId), eq(erpJournals.accountingPeriodId, period.id), eq(erpJournals.status, "draft"))).limit(1);
  if (drafts[0]) throw new Error("Post or void all draft journals before closing the accounting period.");
  await db.update(erpAccountingPeriods).set({ status: "closed" }).where(eq(erpAccountingPeriods.id, period.id));
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", eventType: "period.closed", actorUserId: input.actorUserId, payload: { accountingPeriodId: period.id, code: period.code } });
  return { id: period.id, status: "closed" as const };
}

export async function createTaxPolicy(input: { ventureId: number; code: string; name: string; category: "transaction" | "payroll"; rateBasisPoints: number; calculationMethod: "exclusive" | "inclusive" | "flat_amount"; effectiveFrom: string; effectiveTo?: string; configuration: Record<string, unknown>; createdByUserId: number }) {
  if (input.rateBasisPoints < 0 || input.rateBasisPoints > 1_000_000) throw new Error("Tax policy rate must be between 0 and 1,000,000 basis points.");
  const db = await requireDb();
  const result = await db.insert(erpTaxPolicies).values({ ...input, status: "draft" });
  const id = Number(result[0].insertId);
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", eventType: "tax_policy.created", actorUserId: input.createdByUserId, payload: { id, code: input.code, category: input.category } });
  return { id, ...input, status: "draft" as const };
}

export async function activateTaxPolicy(input: { ventureId: number; taxPolicyId: number; reviewerUserId: number }) {
  const db = await requireDb();
  const rows = await db.select().from(erpTaxPolicies).where(and(eq(erpTaxPolicies.id, input.taxPolicyId), eq(erpTaxPolicies.ventureId, input.ventureId))).limit(1);
  if (!rows[0]) throw new Error("Tax policy not found in the active venture.");
  await db.update(erpTaxPolicies).set({ status: "active", reviewedByUserId: input.reviewerUserId }).where(eq(erpTaxPolicies.id, input.taxPolicyId));
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", eventType: "tax_policy.activated", actorUserId: input.reviewerUserId, payload: { taxPolicyId: input.taxPolicyId } });
  return { success: true, taxPolicyId: input.taxPolicyId, status: "active" as const };
}

export async function listTaxPolicies(ventureId: number) {
  const db = await requireDb();
  return db.select().from(erpTaxPolicies).where(eq(erpTaxPolicies.ventureId, ventureId)).orderBy(desc(erpTaxPolicies.effectiveFrom));
}

export async function createBudgetEnvelope(input: { ventureId: number; accountingPeriodId?: number; code: string; name: string; amount: number; ownerUserId?: number; createdByUserId: number }) {
  const db = await requireDb();
  if (input.accountingPeriodId) await requirePeriod(db, input.ventureId, input.accountingPeriodId);
  const result = await db.insert(erpBudgetEnvelopes).values({ ...input, amount: String(normalizeMoney(input.amount)), status: "draft" });
  const id = Number(result[0].insertId);
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", eventType: "budget.created", actorUserId: input.createdByUserId, payload: { id, code: input.code, amount: normalizeMoney(input.amount) } });
  return { id, ...input, amount: normalizeMoney(input.amount), status: "draft" as const };
}

export async function activateBudgetEnvelope(input: { ventureId: number; budgetEnvelopeId: number; reviewerUserId: number }) {
  const db = await requireDb();
  const rows = await db.select().from(erpBudgetEnvelopes).where(and(eq(erpBudgetEnvelopes.id, input.budgetEnvelopeId), eq(erpBudgetEnvelopes.ventureId, input.ventureId))).limit(1);
  if (!rows[0]) throw new Error("Budget envelope not found in the active venture.");
  await db.update(erpBudgetEnvelopes).set({ status: "active" }).where(eq(erpBudgetEnvelopes.id, input.budgetEnvelopeId));
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", eventType: "budget.activated", actorUserId: input.reviewerUserId, payload: { budgetEnvelopeId: input.budgetEnvelopeId } });
  return { success: true, budgetEnvelopeId: input.budgetEnvelopeId, status: "active" as const };
}

export async function listBudgetEnvelopes(ventureId: number) {
  const db = await requireDb();
  return db.select().from(erpBudgetEnvelopes).where(eq(erpBudgetEnvelopes.ventureId, ventureId)).orderBy(desc(erpBudgetEnvelopes.updatedAt));
}

export async function createOperationalRecord(input: { ventureId: number; domain: OperationalDomain; recordType: string; recordNumber: string; title: string; counterpartyMasterId?: number; accountingPeriodId?: number; budgetEnvelopeId?: number; publicBudgetNodeId?: number; taxPolicyId?: number; transactionCurrency?: string; functionalCurrency?: string; exchangeRateId?: number; amount: number; effectiveDate: string; dueDate?: string; data: Record<string, unknown>; createdByUserId: number }) {
  const db = await requireDb();
  const amount = normalizeMoney(input.amount);
  const ventureRows = await db.select({ baseCurrency: ventures.baseCurrency }).from(ventures).where(eq(ventures.id, input.ventureId)).limit(1);
  const baseCurrency = ventureRows[0]?.baseCurrency;
  if (!baseCurrency) throw new Error("Active venture not found.");
  const transactionCurrency = (input.transactionCurrency ?? baseCurrency).toUpperCase();
  const functionalCurrency = (input.functionalCurrency ?? baseCurrency).toUpperCase();
  if (input.counterpartyMasterId) await requireMaster(db, input.ventureId, input.counterpartyMasterId);
  if (input.accountingPeriodId) await requirePeriod(db, input.ventureId, input.accountingPeriodId);
  const budget = input.budgetEnvelopeId ? await requireBudget(db, input.ventureId, input.budgetEnvelopeId) : undefined;
  const publicBudgetNode = input.publicBudgetNodeId ? await requireBudgetNode(db, input.ventureId, input.publicBudgetNodeId) : undefined;
  const taxPolicy = input.taxPolicyId ? await requireTaxPolicy(db, input.ventureId, input.taxPolicyId) : undefined;
  if (budget && budget.status !== "active") throw new Error("Budget envelope must be active before it can be used.");
  if (publicBudgetNode && publicBudgetNode.status !== "active") throw new Error("Public budget node must be active before it can be used.");
  if (publicBudgetNode && publicBudgetNode.currency !== functionalCurrency) throw new Error("Public budget node currency must match the record functional currency.");
  const budgetAvailable = budget ? availableBudget(Number(budget.amount), Number(budget.committedAmount), Number(budget.spentAmount)) : Number.POSITIVE_INFINITY;
  const tax = taxPolicy ? calculateTax(amount, taxPolicy.rateBasisPoints, taxPolicy.calculationMethod, taxPolicy.configuration) : { taxAmount: 0, totalAmount: amount };
  const exchangeRate = transactionCurrency === functionalCurrency ? undefined : await requireApprovedExchangeRate(db, input.ventureId, input.exchangeRateId, transactionCurrency, functionalCurrency);
  const functionalAmount = exchangeRate ? convertCurrency(tax.totalAmount, Number(exchangeRate.rate)) : tax.totalAmount;
  const publicBudgetAvailable = publicBudgetNode ? availableBudget(Number(publicBudgetNode.appropriatedAmount), Number(publicBudgetNode.committedAmount), Number(publicBudgetNode.spentAmount)) : Number.POSITIVE_INFINITY;
  const budgetException = tax.totalAmount > budgetAvailable || functionalAmount > publicBudgetAvailable;
  const status: OperationalStatus = budgetException ? "pending_approval" : "draft";
  const result = await db.insert(erpOperationalRecords).values({ ...input, status, amount: String(amount), taxAmount: String(tax.taxAmount), totalAmount: String(tax.totalAmount), transactionCurrency, functionalCurrency, exchangeRateId: exchangeRate?.id, functionalAmount: String(functionalAmount) });
  const id = Number(result[0].insertId);
  await createAuditEvent({ ventureId: input.ventureId, domain: input.domain, operationalRecordId: id, eventType: "record.created", actorUserId: input.createdByUserId, payload: { recordNumber: input.recordNumber, status, amount, taxAmount: tax.taxAmount, totalAmount: tax.totalAmount, transactionCurrency, functionalCurrency, functionalAmount, exchangeRateId: exchangeRate?.id ?? null, budgetException } });
  return { id, ...input, status, amount, taxAmount: tax.taxAmount, totalAmount: tax.totalAmount, transactionCurrency, functionalCurrency, functionalAmount, exchangeRateId: exchangeRate?.id, budgetException };
}

export async function listOperationalRecords(input: { ventureId: number; domain?: OperationalDomain }) {
  const db = await requireDb();
  return db.select().from(erpOperationalRecords).where(input.domain ? and(eq(erpOperationalRecords.ventureId, input.ventureId), eq(erpOperationalRecords.domain, input.domain)) : eq(erpOperationalRecords.ventureId, input.ventureId)).orderBy(desc(erpOperationalRecords.updatedAt));
}

export async function transitionOperationalRecord(input: { ventureId: number; operationalRecordId: number; targetStatus: OperationalStatus; actorUserId: number; note?: string }) {
  const db = await requireDb();
  const rows = await db.select().from(erpOperationalRecords).where(and(eq(erpOperationalRecords.id, input.operationalRecordId), eq(erpOperationalRecords.ventureId, input.ventureId))).limit(1);
  const record = rows[0];
  if (!record) throw new Error("Operational record not found in the active venture.");
  if (!canTransition(record.status, input.targetStatus)) throw new Error(`Cannot transition ${record.status} to ${input.targetStatus}.`);
  const updates: Partial<typeof erpOperationalRecords.$inferInsert> = { status: input.targetStatus };
  if (input.targetStatus === "approved") { updates.approvedByUserId = input.actorUserId; updates.approvedAt = new Date(); }
  await db.update(erpOperationalRecords).set(updates).where(eq(erpOperationalRecords.id, input.operationalRecordId));
  if (input.targetStatus === "approved" && record.budgetEnvelopeId) {
    const budget = await requireBudget(db, input.ventureId, record.budgetEnvelopeId);
    await db.update(erpBudgetEnvelopes).set({ committedAmount: String(normalizeMoney(Number(budget.committedAmount) + Number(record.totalAmount))) }).where(eq(erpBudgetEnvelopes.id, record.budgetEnvelopeId));
  }
  if (input.targetStatus === "approved" && record.publicBudgetNodeId) {
    const node = await requireBudgetNode(db, input.ventureId, record.publicBudgetNodeId);
    await db.update(erpBudgetNodes).set({ committedAmount: String(normalizeMoney(Number(node.committedAmount) + Number(record.functionalAmount))) }).where(eq(erpBudgetNodes.id, node.id));
  }
  if (input.targetStatus === "posted" && record.budgetEnvelopeId) {
    const budget = await requireBudget(db, input.ventureId, record.budgetEnvelopeId);
    await db.update(erpBudgetEnvelopes).set({ committedAmount: String(normalizeMoney(Math.max(0, Number(budget.committedAmount) - Number(record.totalAmount)))), spentAmount: String(normalizeMoney(Number(budget.spentAmount) + Number(record.totalAmount))) }).where(eq(erpBudgetEnvelopes.id, record.budgetEnvelopeId));
  }
  if (input.targetStatus === "posted" && record.publicBudgetNodeId) {
    const node = await requireBudgetNode(db, input.ventureId, record.publicBudgetNodeId);
    await db.update(erpBudgetNodes).set({ committedAmount: String(normalizeMoney(Math.max(0, Number(node.committedAmount) - Number(record.functionalAmount)))), spentAmount: String(normalizeMoney(Number(node.spentAmount) + Number(record.functionalAmount))) }).where(eq(erpBudgetNodes.id, node.id));
  }
  await createAuditEvent({ ventureId: input.ventureId, domain: record.domain, operationalRecordId: record.id, eventType: "record.transitioned", actorUserId: input.actorUserId, payload: { from: record.status, to: input.targetStatus, note: input.note ?? null } });
  return { id: record.id, from: record.status, to: input.targetStatus };
}

export async function createLedgerEntry(input: { ventureId: number; operationalRecordId: number; accountMasterId: number; entrySide: "debit" | "credit"; amount: number; narrative: string; actorUserId: number }) {
  const db = await requireDb();
  const records = await db.select().from(erpOperationalRecords).where(and(eq(erpOperationalRecords.id, input.operationalRecordId), eq(erpOperationalRecords.ventureId, input.ventureId))).limit(1);
  if (!records[0]) throw new Error("Operational record not found in the active venture.");
  const account = await requireMaster(db, input.ventureId, input.accountMasterId);
  if (account.domain !== "account") throw new Error("Ledger entries require a chart-of-accounts master record.");
  const result = await db.insert(erpLedgerEntries).values({ ...input, amount: String(normalizeMoney(input.amount)) });
  const id = Number(result[0].insertId);
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", operationalRecordId: input.operationalRecordId, eventType: "ledger_entry.created", actorUserId: input.actorUserId, payload: { id, accountMasterId: input.accountMasterId, entrySide: input.entrySide, amount: normalizeMoney(input.amount) } });
  return { id, ...input, amount: normalizeMoney(input.amount) };
}

export async function createJournal(input: { ventureId: number; journalNumber: string; accountingPeriodId: number; sourceOperationalRecordId?: number; currency: string; narrative: string; lines: Array<{ accountMasterId: number; entrySide: "debit" | "credit"; amount: number; narrative: string }>; createdByUserId: number }) {
  const db = await requireDb();
  const totals = validateBalancedJournal(input.lines);
  await requirePeriod(db, input.ventureId, input.accountingPeriodId);
  if (input.sourceOperationalRecordId) {
    const records = await db.select().from(erpOperationalRecords).where(and(eq(erpOperationalRecords.id, input.sourceOperationalRecordId), eq(erpOperationalRecords.ventureId, input.ventureId))).limit(1);
    if (!records[0]) throw new Error("Journal source record does not belong to the active venture.");
  }
  for (const line of input.lines) {
    const account = await requireMaster(db, input.ventureId, line.accountMasterId);
    if (account.domain !== "account") throw new Error("Journal lines require chart-of-accounts masters.");
  }
  const result = await db.insert(erpJournals).values({ ventureId: input.ventureId, journalNumber: input.journalNumber, accountingPeriodId: input.accountingPeriodId, sourceOperationalRecordId: input.sourceOperationalRecordId, currency: input.currency, narrative: input.narrative, status: "draft", createdByUserId: input.createdByUserId });
  const id = Number(result[0].insertId);
  await db.insert(erpJournalLines).values(input.lines.map(line => ({ ventureId: input.ventureId, journalId: id, accountMasterId: line.accountMasterId, entrySide: line.entrySide, amount: String(normalizeMoney(line.amount)), narrative: line.narrative })));
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", eventType: "journal.created", actorUserId: input.createdByUserId, payload: { journalId: id, journalNumber: input.journalNumber, ...totals } });
  return { id, ...input, status: "draft" as const, ...totals };
}

export async function listJournals(ventureId: number) {
  const db = await requireDb();
  const journals = await db.select().from(erpJournals).where(eq(erpJournals.ventureId, ventureId)).orderBy(desc(erpJournals.updatedAt));
  const lines = await db.select().from(erpJournalLines).where(eq(erpJournalLines.ventureId, ventureId)).orderBy(desc(erpJournalLines.id));
  return journals.map(journal => ({ ...journal, lines: lines.filter(line => line.journalId === journal.id) }));
}

export async function postJournal(input: { ventureId: number; journalId: number; actorUserId: number }) {
  const db = await requireDb();
  const rows = await db.select().from(erpJournals).where(and(eq(erpJournals.id, input.journalId), eq(erpJournals.ventureId, input.ventureId))).limit(1);
  const journal = rows[0];
  if (!journal) throw new Error("Journal not found in the active venture.");
  if (journal.status !== "draft") throw new Error("Only draft journals may be posted.");
  await requirePeriod(db, input.ventureId, journal.accountingPeriodId);
  const lines = await db.select().from(erpJournalLines).where(and(eq(erpJournalLines.journalId, journal.id), eq(erpJournalLines.ventureId, input.ventureId)));
  validateBalancedJournal(lines.map(line => ({ accountMasterId: line.accountMasterId, entrySide: line.entrySide, amount: Number(line.amount), narrative: line.narrative })));
  await db.update(erpJournals).set({ status: "posted", postedByUserId: input.actorUserId, postedAt: new Date() }).where(eq(erpJournals.id, journal.id));
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", eventType: "journal.posted", actorUserId: input.actorUserId, payload: { journalId: journal.id, journalNumber: journal.journalNumber } });
  return { id: journal.id, status: "posted" as const };
}

export type InventoryMovementType = "receipt" | "issue" | "adjust_in" | "adjust_out" | "reserve" | "release";

export async function listInventoryBalances(ventureId: number) {
  const db = await requireDb();
  const balances = await db.select().from(erpInventoryBalances).where(eq(erpInventoryBalances.ventureId, ventureId));
  const items = await db.select().from(erpMasterRecords).where(and(eq(erpMasterRecords.ventureId, ventureId), eq(erpMasterRecords.domain, "item")));
  return balances.map(balance => ({ ...balance, availableQuantity: Number(balance.onHandQuantity) - Number(balance.reservedQuantity), item: items.find(item => item.id === balance.itemMasterId) }));
}

export async function listInventoryMovements(ventureId: number, itemMasterId?: number) {
  const db = await requireDb();
  return db.select().from(erpInventoryMovements).where(itemMasterId ? and(eq(erpInventoryMovements.ventureId, ventureId), eq(erpInventoryMovements.itemMasterId, itemMasterId)) : eq(erpInventoryMovements.ventureId, ventureId)).orderBy(desc(erpInventoryMovements.createdAt));
}

export async function recordInventoryMovement(input: { ventureId: number; itemMasterId: number; operationalRecordId?: number; movementType: InventoryMovementType; quantity: number; narrative: string; createdByUserId: number }) {
  const db = await requireDb();
  const quantity = Math.round(input.quantity * 1000) / 1000;
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Inventory quantity must be greater than zero.");
  if (!input.narrative.trim()) throw new Error("Inventory movements require a narrative.");
  const item = await requireMaster(db, input.ventureId, input.itemMasterId);
  if (item.domain !== "item") throw new Error("Inventory movements require an item master record.");
  if (input.operationalRecordId) {
    const records = await db.select().from(erpOperationalRecords).where(and(eq(erpOperationalRecords.id, input.operationalRecordId), eq(erpOperationalRecords.ventureId, input.ventureId))).limit(1);
    if (!records[0]) throw new Error("Inventory source record does not belong to the active venture.");
  }
  const outcome = await db.transaction(async tx => {
    const rows = await tx.select().from(erpInventoryBalances).where(and(eq(erpInventoryBalances.ventureId, input.ventureId), eq(erpInventoryBalances.itemMasterId, input.itemMasterId))).limit(1);
    const current = rows[0];
    const onHand = Number(current?.onHandQuantity ?? 0);
    const reserved = Number(current?.reservedQuantity ?? 0);
    const available = onHand - reserved;
    let nextOnHand = onHand;
    let nextReserved = reserved;
    if (["receipt", "adjust_in"].includes(input.movementType)) nextOnHand += quantity;
    if (["issue", "adjust_out"].includes(input.movementType)) { if (available < quantity) throw new Error("Insufficient available inventory for this issue."); nextOnHand -= quantity; }
    if (input.movementType === "reserve") { if (available < quantity) throw new Error("Insufficient available inventory for this reservation."); nextReserved += quantity; }
    if (input.movementType === "release") { if (reserved < quantity) throw new Error("Cannot release more inventory than is reserved."); nextReserved -= quantity; }
    nextOnHand = Math.round(nextOnHand * 1000) / 1000;
    nextReserved = Math.round(nextReserved * 1000) / 1000;
    if (nextOnHand < 0 || nextReserved < 0 || nextReserved > nextOnHand) throw new Error("Inventory balance invariant failed.");
    if (current) await tx.update(erpInventoryBalances).set({ onHandQuantity: String(nextOnHand), reservedQuantity: String(nextReserved) }).where(eq(erpInventoryBalances.id, current.id));
    else await tx.insert(erpInventoryBalances).values({ ventureId: input.ventureId, itemMasterId: input.itemMasterId, onHandQuantity: String(nextOnHand), reservedQuantity: String(nextReserved) });
    const result = await tx.insert(erpInventoryMovements).values({ ventureId: input.ventureId, itemMasterId: input.itemMasterId, operationalRecordId: input.operationalRecordId, movementType: input.movementType, quantity: String(quantity), onHandAfter: String(nextOnHand), reservedAfter: String(nextReserved), narrative: input.narrative, createdByUserId: input.createdByUserId });
    return { id: Number(result[0].insertId), onHandQuantity: nextOnHand, reservedQuantity: nextReserved, availableQuantity: Math.round((nextOnHand - nextReserved) * 1000) / 1000 };
  });
  await createAuditEvent({ ventureId: input.ventureId, domain: "inventory", eventType: "inventory.movement_recorded", actorUserId: input.createdByUserId, payload: { movementId: outcome.id, itemMasterId: input.itemMasterId, movementType: input.movementType, quantity, onHandAfter: outcome.onHandQuantity, reservedAfter: outcome.reservedQuantity } });
  return { ...input, quantity, ...outcome };
}

export async function receivePurchaseOrder(input: { ventureId: number; purchaseOrderRecordId: number; itemMasterId: number; quantity: number; narrative: string; finalReceipt?: boolean; actorUserId: number }) {
  const db = await requireDb();
  const rows = await db.select().from(erpOperationalRecords).where(and(eq(erpOperationalRecords.id, input.purchaseOrderRecordId), eq(erpOperationalRecords.ventureId, input.ventureId))).limit(1);
  const purchaseOrder = rows[0];
  if (!purchaseOrder || purchaseOrder.domain !== "procurement" || purchaseOrder.recordType !== "purchase_order") throw new Error("Approved purchase order not found in the active venture.");
  if (!["approved", "posted"].includes(purchaseOrder.status)) throw new Error("Purchase orders must be approved or posted before receipt.");
  const receipt = await recordInventoryMovement({ ventureId: input.ventureId, itemMasterId: input.itemMasterId, operationalRecordId: purchaseOrder.id, movementType: "receipt", quantity: input.quantity, narrative: input.narrative, createdByUserId: input.actorUserId });
  let status = purchaseOrder.status;
  if (input.finalReceipt) {
    status = "fulfilled";
    await db.update(erpOperationalRecords).set({ status, updatedAt: new Date() }).where(eq(erpOperationalRecords.id, purchaseOrder.id));
  }
  await createAuditEvent({ ventureId: input.ventureId, domain: "procurement", operationalRecordId: purchaseOrder.id, eventType: "purchase_order.received", actorUserId: input.actorUserId, payload: { itemMasterId: input.itemMasterId, quantity: receipt.quantity, inventoryMovementId: receipt.id, finalReceipt: Boolean(input.finalReceipt), resultingStatus: status } });
  return { purchaseOrderRecordId: purchaseOrder.id, inventoryMovementId: receipt.id, quantity: receipt.quantity, status, finalReceipt: Boolean(input.finalReceipt) };
}

export async function createWorkflowDefinition(input: { ventureId: number; key: string; name: string; domain: string; definition: { nodes: Array<{ id: string; type: "start" | "task" | "approval" | "gateway" | "end"; title: string }>; transitions: Array<{ from: string; to: string; condition?: string }> }; createdByUserId: number }) {
  if (!input.definition.nodes.some(node => node.type === "start") || !input.definition.nodes.some(node => node.type === "end")) throw new Error("Workflow definition must contain start and end nodes.");
  const db = await requireDb();
  const result = await db.insert(erpWorkflowDefinitions).values({ ...input, version: 1, status: "draft" });
  const id = Number(result[0].insertId);
  await createAuditEvent({ ventureId: input.ventureId, domain: "workflow", eventType: "workflow.created", actorUserId: input.createdByUserId, payload: { id, key: input.key } });
  return { id, ...input, version: 1, status: "draft" as const };
}

export async function activateWorkflowDefinition(input: { ventureId: number; workflowDefinitionId: number; actorUserId: number }) {
  const db = await requireDb();
  const rows = await db.select().from(erpWorkflowDefinitions).where(and(eq(erpWorkflowDefinitions.id, input.workflowDefinitionId), eq(erpWorkflowDefinitions.ventureId, input.ventureId))).limit(1);
  if (!rows[0]) throw new Error("Workflow definition not found in the active venture.");
  await db.update(erpWorkflowDefinitions).set({ status: "active" }).where(eq(erpWorkflowDefinitions.id, input.workflowDefinitionId));
  await createAuditEvent({ ventureId: input.ventureId, domain: "workflow", eventType: "workflow.activated", actorUserId: input.actorUserId, payload: { workflowDefinitionId: input.workflowDefinitionId } });
  return { success: true, workflowDefinitionId: input.workflowDefinitionId, status: "active" as const };
}

export async function listWorkflowDefinitions(ventureId: number) {
  const db = await requireDb();
  return db.select().from(erpWorkflowDefinitions).where(eq(erpWorkflowDefinitions.ventureId, ventureId)).orderBy(desc(erpWorkflowDefinitions.updatedAt));
}

export async function startWorkflow(input: { ventureId: number; workflowDefinitionId: number; operationalRecordId?: number; startedByUserId: number; assigneeUserId?: number; context: Record<string, unknown> }) {
  const db = await requireDb();
  const definitions = await db.select().from(erpWorkflowDefinitions).where(and(eq(erpWorkflowDefinitions.id, input.workflowDefinitionId), eq(erpWorkflowDefinitions.ventureId, input.ventureId), eq(erpWorkflowDefinitions.status, "active"))).limit(1);
  const definition = definitions[0];
  if (!definition) throw new Error("Active workflow definition not found in the active venture.");
  if (input.operationalRecordId) {
    const record = await db.select().from(erpOperationalRecords).where(and(eq(erpOperationalRecords.id, input.operationalRecordId), eq(erpOperationalRecords.ventureId, input.ventureId))).limit(1);
    if (!record[0]) throw new Error("Workflow record does not belong to the active venture.");
  }
  const model = definition.definition as { nodes: Array<{ id: string; type: "start" | "task" | "approval" | "gateway" | "end"; title: string }>; transitions: Array<{ from: string; to: string }> };
  const start = model.nodes.find(node => node.type === "start");
  const firstNodeId = model.transitions.find(transition => transition.from === start?.id)?.to ?? start?.id;
  const node = model.nodes.find(candidate => candidate.id === firstNodeId);
  if (!node) throw new Error("Workflow definition does not contain an executable first node.");
  const instanceResult = await db.insert(erpWorkflowInstances).values({ ventureId: input.ventureId, workflowDefinitionId: input.workflowDefinitionId, operationalRecordId: input.operationalRecordId, status: "active", currentNodeId: node.id, context: input.context, startedByUserId: input.startedByUserId });
  const id = Number(instanceResult[0].insertId);
  if (node.type !== "end") await db.insert(erpWorkflowTasks).values({ ventureId: input.ventureId, workflowInstanceId: id, nodeId: node.id, title: node.title, assigneeUserId: input.assigneeUserId ?? input.startedByUserId, data: input.context });
  await createAuditEvent({ ventureId: input.ventureId, domain: "workflow", operationalRecordId: input.operationalRecordId, eventType: "workflow.started", actorUserId: input.startedByUserId, payload: { workflowInstanceId: id, workflowDefinitionId: input.workflowDefinitionId, nodeId: node.id } });
  return { id, status: "active" as const, currentNodeId: node.id };
}

export async function completeWorkflowTask(input: { ventureId: number; workflowTaskId: number; outcome: "approved" | "rejected" | "completed"; actorUserId: number }) {
  const db = await requireDb();
  const rows = await db.select().from(erpWorkflowTasks).where(and(eq(erpWorkflowTasks.id, input.workflowTaskId), eq(erpWorkflowTasks.ventureId, input.ventureId))).limit(1);
  const task = rows[0];
  if (!task) throw new Error("Workflow task not found in the active venture.");
  if (task.status !== "pending") throw new Error("Only pending workflow tasks may be completed.");
  await db.update(erpWorkflowTasks).set({ status: input.outcome, completedAt: new Date() }).where(eq(erpWorkflowTasks.id, task.id));
  await db.update(erpWorkflowInstances).set({ status: input.outcome === "rejected" ? "rejected" : "completed", completedAt: new Date() }).where(eq(erpWorkflowInstances.id, task.workflowInstanceId));
  await createAuditEvent({ ventureId: input.ventureId, domain: "workflow", eventType: "workflow.task_completed", actorUserId: input.actorUserId, payload: { workflowTaskId: task.id, outcome: input.outcome } });
  return { id: task.id, status: input.outcome };
}

export async function getOperationalDashboard(ventureId: number) {
  const [records, budgets, tasks, audits] = await Promise.all([
    listOperationalRecords({ ventureId }),
    listBudgetEnvelopes(ventureId),
    listWorkflowTasks(ventureId),
    listAuditEvents(ventureId),
  ]);
  const byDomain = records.reduce<Record<string, { count: number; total: number; pending: number }>>((result, record) => {
    const entry = result[record.domain] ?? { count: 0, total: 0, pending: 0 };
    entry.count += 1; entry.total += Number(record.totalAmount); if (record.status === "pending_approval") entry.pending += 1; result[record.domain] = entry; return result;
  }, {});
  return {
    byDomain,
    openTasks: tasks.filter(task => task.status === "pending").length,
    budgetUtilization: budgets.map(budget => ({ id: budget.id, code: budget.code, name: budget.name, amount: Number(budget.amount), committed: Number(budget.committedAmount), spent: Number(budget.spentAmount), remaining: Number(budget.amount) - Number(budget.committedAmount) - Number(budget.spentAmount), status: budget.status })),
    latestAuditEvents: audits.slice(0, 12),
  };
}

export async function listWorkflowTasks(ventureId: number) {
  const db = await requireDb();
  return db.select().from(erpWorkflowTasks).where(eq(erpWorkflowTasks.ventureId, ventureId)).orderBy(desc(erpWorkflowTasks.createdAt));
}

export async function listAuditEvents(ventureId: number) {
  const db = await requireDb();
  return db.select().from(erpAuditEvents).where(eq(erpAuditEvents.ventureId, ventureId)).orderBy(desc(erpAuditEvents.createdAt));
}

async function createAuditEvent(input: { ventureId: number; domain: string; operationalRecordId?: number; eventType: string; actorUserId?: number; payload: Record<string, unknown> }) {
  const db = await requireDb();
  await db.insert(erpAuditEvents).values(input);
}

async function requireMaster(db: Awaited<ReturnType<typeof requireDb>>, ventureId: number, masterId: number) {
  const rows = await db.select().from(erpMasterRecords).where(and(eq(erpMasterRecords.id, masterId), eq(erpMasterRecords.ventureId, ventureId))).limit(1);
  if (!rows[0]) throw new Error("Master record not found in the active venture.");
  return rows[0];
}

async function requirePeriod(db: Awaited<ReturnType<typeof requireDb>>, ventureId: number, periodId: number) {
  const rows = await db.select().from(erpAccountingPeriods).where(and(eq(erpAccountingPeriods.id, periodId), eq(erpAccountingPeriods.ventureId, ventureId))).limit(1);
  if (!rows[0]) throw new Error("Accounting period not found in the active venture.");
  if (rows[0].status === "closed") throw new Error("Accounting period is closed.");
  return rows[0];
}

async function requireBudget(db: Awaited<ReturnType<typeof requireDb>>, ventureId: number, budgetId: number) {
  const rows = await db.select().from(erpBudgetEnvelopes).where(and(eq(erpBudgetEnvelopes.id, budgetId), eq(erpBudgetEnvelopes.ventureId, ventureId))).limit(1);
  if (!rows[0]) throw new Error("Budget envelope not found in the active venture.");
  return rows[0];
}

async function requireBudgetNode(db: Awaited<ReturnType<typeof requireDb>>, ventureId: number, budgetNodeId: number) {
  const rows = await db.select().from(erpBudgetNodes).where(and(eq(erpBudgetNodes.id, budgetNodeId), eq(erpBudgetNodes.ventureId, ventureId))).limit(1);
  if (!rows[0]) throw new Error("Public budget node not found in the active venture.");
  return rows[0];
}

async function requireApprovedExchangeRate(db: Awaited<ReturnType<typeof requireDb>>, ventureId: number, exchangeRateId: number | undefined, sourceCurrency: string, targetCurrency: string) {
  if (!exchangeRateId) throw new Error("An approved exchange rate is required when transaction and functional currency differ.");
  const rows = await db.select().from(erpExchangeRates).where(and(eq(erpExchangeRates.id, exchangeRateId), eq(erpExchangeRates.ventureId, ventureId), eq(erpExchangeRates.status, "approved"), eq(erpExchangeRates.sourceCurrency, sourceCurrency), eq(erpExchangeRates.targetCurrency, targetCurrency))).limit(1);
  if (!rows[0]) throw new Error("Approved exchange rate not found for the selected currency pair in the active venture.");
  return rows[0];
}

async function requireTaxPolicy(db: Awaited<ReturnType<typeof requireDb>>, ventureId: number, taxPolicyId: number) {
  const rows = await db.select().from(erpTaxPolicies).where(and(eq(erpTaxPolicies.id, taxPolicyId), eq(erpTaxPolicies.ventureId, ventureId), eq(erpTaxPolicies.status, "active"))).limit(1);
  if (!rows[0]) throw new Error("Active tax policy not found in the active venture.");
  return rows[0];
}
