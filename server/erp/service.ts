import { and, desc, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import {
  erpAccountClassificationRevisions,
  erpAccountingCalculationEvidence,
  erpAccountingEvents,
  erpAccountingPeriods,
  erpAuditEvents,
  erpBudgetEnvelopes,
  erpBudgetNodes,
  erpCompensationComponents,
  erpCrmOpportunities,
  erpEmployeeProfiles,
  erpExchangeRates,
  erpFinanceDimensionDefinitions,
  erpFinanceDimensionValues,
  erpAssets,
  erpInventoryBalances,
  erpInventoryMovements,
  erpJournalLines,
  erpJournalProposals,
  erpJournals,
  erpLedgerEntries,
  erpMaintenanceWorkOrders,
  erpMasterRecords,
  erpOperationalRecords,
  erpPayrollCalendars,
  erpPayrollRuns,
  erpPostingRuleRevisions,
  erpProjects,
  erpProjectTasks,
  erpServiceRequests,
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
export type PostingRuleLine = { entrySide: "debit" | "credit"; accountMasterId: number; narrative: string; allocationBasisPoints?: number };
export type ProcurementReceiptSourceFacts = { internalReceiptReference?: string; warehouseCode?: string; costCenterCode?: string; projectCode?: string; supplierDeliveryReference?: string; evidenceReference?: string };
export type AccountClassificationFamily = "asset" | "liability" | "equity" | "revenue" | "expense" | "memo";
export type AccountStatementSection = "current_assets" | "noncurrent_assets" | "current_liabilities" | "noncurrent_liabilities" | "equity" | "operating_revenue" | "other_income" | "operating_expense" | "other_expense" | "memo";

const expectedClassificationPresentation: Record<AccountClassificationFamily, { sections: AccountStatementSection[]; normalBalance?: "debit" | "credit" }> = {
  asset: { sections: ["current_assets", "noncurrent_assets"], normalBalance: "debit" },
  liability: { sections: ["current_liabilities", "noncurrent_liabilities"], normalBalance: "credit" },
  equity: { sections: ["equity"], normalBalance: "credit" },
  revenue: { sections: ["operating_revenue", "other_income"], normalBalance: "credit" },
  expense: { sections: ["operating_expense", "other_expense"], normalBalance: "debit" },
  memo: { sections: ["memo"] },
};

function validateAccountClassification(input: { classificationFamily: AccountClassificationFamily; statementSection: AccountStatementSection; normalBalance: "debit" | "credit" }) {
  const expected = expectedClassificationPresentation[input.classificationFamily];
  if (!expected.sections.includes(input.statementSection)) throw new Error(`Statement section ${input.statementSection} is not valid for ${input.classificationFamily} classification.`);
  if (expected.normalBalance && expected.normalBalance !== input.normalBalance) throw new Error(`${input.classificationFamily} classifications require a ${expected.normalBalance} normal balance.`);
}

function normalizeProcurementReceiptSourceFacts(sourceFacts?: ProcurementReceiptSourceFacts) {
  if (!sourceFacts) return undefined;
  const fields: Array<[keyof ProcurementReceiptSourceFacts, number]> = [["internalReceiptReference", 96], ["warehouseCode", 96], ["costCenterCode", 96], ["projectCode", 96], ["supplierDeliveryReference", 160], ["evidenceReference", 180]];
  const normalized: ProcurementReceiptSourceFacts = {};
  for (const [field, maxLength] of fields) {
    const value = sourceFacts[field];
    if (value === undefined) continue;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > maxLength) throw new Error(`${field} must be non-empty and at most ${maxLength} characters when supplied.`);
    normalized[field] = trimmed;
  }
  return Object.keys(normalized).length ? normalized : undefined;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  return db;
}

function asPostingRuleLines(value: unknown): PostingRuleLine[] {
  if (!Array.isArray(value) || value.length < 2) throw new Error("Posting rules require at least one debit and one credit line.");
  const rawLines = value as PostingRuleLine[];
  const debitCount = rawLines.filter(line => line.entrySide === "debit").length;
  const creditCount = rawLines.filter(line => line.entrySide === "credit").length;
  const lines = rawLines.map(line => ({ ...line, allocationBasisPoints: line.allocationBasisPoints ?? (line.entrySide === "credit" || debitCount === 1 ? 10_000 : undefined) }));
  if (!lines.some(line => line.entrySide === "debit") || lines.filter(line => line.entrySide === "credit").length !== 1) throw new Error("Posting rules require one or more debit lines and exactly one credit line.");
  for (const line of lines) {
    if (!Number.isInteger(line.accountMasterId) || line.accountMasterId <= 0 || !line.narrative?.trim() || !Number.isInteger(line.allocationBasisPoints) || (line.allocationBasisPoints ?? 0) <= 0) throw new Error("Posting-rule lines require an active account, narrative, and positive deterministic allocation.");
  }
  const debitBasisPoints = lines.filter(line => line.entrySide === "debit").reduce((sum, line) => sum + (line.allocationBasisPoints ?? 0), 0);
  const creditBasisPoints = lines.filter(line => line.entrySide === "credit").reduce((sum, line) => sum + (line.allocationBasisPoints ?? 0), 0);
  if (debitBasisPoints !== 10_000 || creditBasisPoints !== 10_000) throw new Error("Deterministic allocation percentages must total exactly 100.00% on both debit and credit sides.");
  return lines.map(line => ({ entrySide: line.entrySide, accountMasterId: line.accountMasterId, narrative: line.narrative.trim(), allocationBasisPoints: line.allocationBasisPoints }));
}

async function requireAccountMaster(db: Awaited<ReturnType<typeof requireDb>>, ventureId: number, accountMasterId: number) {
  const [account] = await db.select().from(erpMasterRecords).where(and(eq(erpMasterRecords.id, accountMasterId), eq(erpMasterRecords.ventureId, ventureId))).limit(1);
  if (!account || account.domain !== "account" || account.status !== "active") throw new Error("Posting-rule accounts must be active chart-of-accounts masters in the active venture.");
  return account;
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

export async function createOperationalRecord(input: { ventureId: number; domain: OperationalDomain; recordType: string; recordNumber: string; title: string; counterpartyMasterId?: number; accountingPeriodId?: number; budgetEnvelopeId?: number; publicBudgetNodeId?: number; taxPolicyId?: number; transactionCurrency?: string; functionalCurrency?: string; exchangeRateId?: number; reportingExchangeRateId?: number; amount: number; effectiveDate: string; dueDate?: string; supplierInvoiceReferenceNormalized?: string; data: Record<string, unknown>; createdByUserId: number }) {
  const db = await requireDb();
  const amount = normalizeMoney(input.amount);
  const ventureRows = await db.select({ baseCurrency: ventures.baseCurrency, reportingCurrency: ventures.reportingCurrency }).from(ventures).where(eq(ventures.id, input.ventureId)).limit(1);
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
  const reportingCurrency = (ventureRows[0]?.reportingCurrency ?? functionalCurrency).toUpperCase();
  const reportingExchangeRate = functionalCurrency === reportingCurrency ? undefined : await requireApprovedExchangeRate(db, input.ventureId, input.reportingExchangeRateId, functionalCurrency, reportingCurrency);
  const reportingAmount = reportingExchangeRate ? convertCurrency(functionalAmount, Number(reportingExchangeRate.rate)) : functionalAmount;
  const publicBudgetAvailable = publicBudgetNode ? availableBudget(Number(publicBudgetNode.appropriatedAmount), Number(publicBudgetNode.committedAmount), Number(publicBudgetNode.spentAmount)) : Number.POSITIVE_INFINITY;
  const budgetException = tax.totalAmount > budgetAvailable || functionalAmount > publicBudgetAvailable;
  const status: OperationalStatus = budgetException ? "pending_approval" : "draft";
  const result = await db.insert(erpOperationalRecords).values({ ...input, status, amount: String(amount), taxAmount: String(tax.taxAmount), totalAmount: String(tax.totalAmount), transactionCurrency, functionalCurrency, exchangeRateId: exchangeRate?.id, functionalAmount: String(functionalAmount), reportingCurrency, reportingExchangeRateId: reportingExchangeRate?.id, reportingAmount: String(reportingAmount) });
  const id = Number(result[0].insertId);
  await createAuditEvent({ ventureId: input.ventureId, domain: input.domain, operationalRecordId: id, eventType: "record.created", actorUserId: input.createdByUserId, payload: { recordNumber: input.recordNumber, status, amount, taxAmount: tax.taxAmount, totalAmount: tax.totalAmount, transactionCurrency, functionalCurrency, functionalAmount, exchangeRateId: exchangeRate?.id ?? null, reportingCurrency, reportingAmount, reportingExchangeRateId: reportingExchangeRate?.id ?? null, budgetException, noExternalExecution: true } });
  return { id, ...input, status, amount, taxAmount: tax.taxAmount, totalAmount: tax.totalAmount, transactionCurrency, functionalCurrency, functionalAmount, exchangeRateId: exchangeRate?.id, reportingCurrency, reportingAmount, reportingExchangeRateId: reportingExchangeRate?.id, budgetException };
}

export async function getVentureCurrencyPolicy(ventureId: number) {
  const db = await requireDb();
  const [venture] = await db.select({ id: ventures.id, baseCurrency: ventures.baseCurrency, reportingCurrency: ventures.reportingCurrency }).from(ventures).where(eq(ventures.id, ventureId)).limit(1);
  if (!venture) throw new Error("Active venture not found.");
  return { ventureId: venture.id, baseCurrency: venture.baseCurrency, reportingCurrency: venture.reportingCurrency ?? venture.baseCurrency };
}

export async function setVentureReportingCurrency(input: { ventureId: number; reportingCurrency: string; actorUserId: number }) {
  const db = await requireDb();
  const reportingCurrency = input.reportingCurrency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(reportingCurrency)) throw new Error("Reporting currency must be a three-letter currency code.");
  const [venture] = await db.select({ id: ventures.id, baseCurrency: ventures.baseCurrency }).from(ventures).where(eq(ventures.id, input.ventureId)).limit(1);
  if (!venture) throw new Error("Active venture not found.");
  await db.update(ventures).set({ reportingCurrency }).where(eq(ventures.id, input.ventureId));
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", eventType: "currency.reporting_policy_set", actorUserId: input.actorUserId, payload: { baseCurrency: venture.baseCurrency, reportingCurrency, noExternalExecution: true } });
  return { ventureId: input.ventureId, baseCurrency: venture.baseCurrency, reportingCurrency };
}

export type InvoiceType = "receivable_invoice" | "payable_invoice";
export type InvoiceAgingBucket = "not_due" | "1_30" | "31_60" | "61_90" | "over_90" | "undated";

export function classifyInvoiceAge(dueDate: string | undefined, asOfDate: string): { bucket: InvoiceAgingBucket; daysPastDue: number | null } {
  if (!dueDate) return { bucket: "undated", daysPastDue: null };
  const asOf = new Date(`${asOfDate}T00:00:00.000Z`);
  const due = new Date(`${dueDate}T00:00:00.000Z`);
  if (Number.isNaN(asOf.getTime()) || Number.isNaN(due.getTime())) throw new Error("Aging requires ISO calendar dates.");
  const daysPastDue = Math.floor((asOf.getTime() - due.getTime()) / 86_400_000);
  if (daysPastDue <= 0) return { bucket: "not_due", daysPastDue: 0 };
  if (daysPastDue <= 30) return { bucket: "1_30", daysPastDue };
  if (daysPastDue <= 60) return { bucket: "31_60", daysPastDue };
  if (daysPastDue <= 90) return { bucket: "61_90", daysPastDue };
  return { bucket: "over_90", daysPastDue };
}

type PayableThreeWayMatch = {
  status: "matched" | "mismatch";
  purchaseOrderRecordId: number;
  purchaseOrderRecordNumber: string;
  purchaseOrderTotalAmount: number;
  invoiceTotalAmount: number;
  purchaseOrderCurrency: string;
  invoiceCurrency: string;
  receiptCount: number;
  receivedQuantity: number;
  supplierMatched: boolean;
  currencyMatched: boolean;
  amountWithinPurchaseOrder: boolean;
  reasonCodes: string[];
  evaluatedAt: string;
  evaluatedByUserId: number;
  internalEvidenceOnly: true;
  noPaymentExecution: true;
  noExternalSupplierAction: true;
};

export async function createInvoiceRecord(input: { ventureId: number; invoiceType: InvoiceType; recordNumber: string; title: string; counterpartyMasterId: number; accountingPeriodId?: number; taxPolicyId?: number; amount: number; effectiveDate: string; dueDate?: string; supplierInvoiceReference?: string; data: Record<string, unknown>; createdByUserId: number }) {
  const db = await requireDb();
  const counterparty = await requireMaster(db, input.ventureId, input.counterpartyMasterId);
  const expectedDomain = input.invoiceType === "receivable_invoice" ? "customer" : "supplier";
  if (counterparty.domain !== expectedDomain) throw new Error(`${input.invoiceType === "receivable_invoice" ? "Receivable" : "Payable"} invoices require an active ${expectedDomain} master record.`);
  const supplierInvoiceReference = input.invoiceType === "payable_invoice" && input.supplierInvoiceReference?.trim() ? input.supplierInvoiceReference.trim() : undefined;
  const supplierInvoiceReferenceNormalized = supplierInvoiceReference?.toUpperCase();
  if (supplierInvoiceReferenceNormalized) {
    const payableInvoices = await db.select().from(erpOperationalRecords).where(and(eq(erpOperationalRecords.ventureId, input.ventureId), eq(erpOperationalRecords.recordType, "payable_invoice")));
    const duplicate = payableInvoices.find(record => record.counterpartyMasterId === input.counterpartyMasterId && (record.supplierInvoiceReferenceNormalized === supplierInvoiceReferenceNormalized || (record.data as { supplierInvoiceReferenceNormalized?: unknown }).supplierInvoiceReferenceNormalized === supplierInvoiceReferenceNormalized));
    if (duplicate) {
      await createAuditEvent({ ventureId: input.ventureId, domain: "finance", operationalRecordId: duplicate.id, eventType: "payable_invoice.duplicate_supplier_reference_rejected", actorUserId: input.createdByUserId, payload: { supplierMasterId: input.counterpartyMasterId, duplicateOperationalRecordId: duplicate.id, attemptedReferencePresent: true, attemptedReferenceRawValueStored: false, noExternalSupplierAction: true, noPaymentExecution: true } });
      throw new Error("A payable invoice with this supplier invoice reference already exists for the active supplier in this venture.");
    }
  }
  let invoice: Awaited<ReturnType<typeof createOperationalRecord>>;
  try {
    invoice = await createOperationalRecord({ ventureId: input.ventureId, domain: input.invoiceType === "receivable_invoice" ? "sales" : "procurement", recordType: input.invoiceType, recordNumber: input.recordNumber, title: input.title, counterpartyMasterId: input.counterpartyMasterId, accountingPeriodId: input.accountingPeriodId, taxPolicyId: input.taxPolicyId, amount: input.amount, effectiveDate: input.effectiveDate, dueDate: input.dueDate, supplierInvoiceReferenceNormalized, data: { ...input.data, invoiceType: input.invoiceType, ...(supplierInvoiceReference ? { supplierInvoiceReference, supplierInvoiceReferenceNormalized } : {}), noExternalCollectionOrDisbursement: true }, createdByUserId: input.createdByUserId });
  } catch (error) {
    if (supplierInvoiceReferenceNormalized && String(error).includes("erp_payable_supplier_reference_unique")) {
      await createAuditEvent({ ventureId: input.ventureId, domain: "finance", eventType: "payable_invoice.duplicate_supplier_reference_rejected", actorUserId: input.createdByUserId, payload: { supplierMasterId: input.counterpartyMasterId, attemptedReferencePresent: true, attemptedReferenceRawValueStored: false, constraint: "erp_payable_supplier_reference_unique", noExternalSupplierAction: true, noPaymentExecution: true } });
      throw new Error("A payable invoice with this supplier invoice reference already exists for the active supplier in this venture.");
    }
    throw error;
  }
  if (supplierInvoiceReferenceNormalized) await createAuditEvent({ ventureId: input.ventureId, domain: "finance", operationalRecordId: invoice.id, eventType: "payable_invoice.supplier_reference_recorded", actorUserId: input.createdByUserId, payload: { supplierMasterId: input.counterpartyMasterId, supplierInvoiceReference, supplierInvoiceReferenceNormalized, noExternalSupplierAction: true, noPaymentExecution: true } });
  return invoice;
}

export async function evaluatePayableInvoiceThreeWayMatch(input: { ventureId: number; payableInvoiceRecordId: number; purchaseOrderRecordId: number; actorUserId: number }) {
  const db = await requireDb();
  const [invoice] = await db.select().from(erpOperationalRecords).where(and(eq(erpOperationalRecords.id, input.payableInvoiceRecordId), eq(erpOperationalRecords.ventureId, input.ventureId))).limit(1);
  if (!invoice || invoice.recordType !== "payable_invoice" || invoice.domain !== "procurement") throw new Error("Payable invoice not found in the active venture.");
  if (!["draft", "pending_approval"].includes(invoice.status)) throw new Error("Only draft or pending-approval payable invoices may be evaluated for an internal three-way match.");
  const [purchaseOrder] = await db.select().from(erpOperationalRecords).where(and(eq(erpOperationalRecords.id, input.purchaseOrderRecordId), eq(erpOperationalRecords.ventureId, input.ventureId))).limit(1);
  if (!purchaseOrder || purchaseOrder.recordType !== "purchase_order" || purchaseOrder.domain !== "procurement") throw new Error("Purchase order not found in the active venture.");
  if (!["approved", "posted", "fulfilled"].includes(purchaseOrder.status)) throw new Error("Purchase order must be approved, posted, or fulfilled before an internal three-way match.");
  const receipts = await db.select().from(erpInventoryMovements).where(and(eq(erpInventoryMovements.ventureId, input.ventureId), eq(erpInventoryMovements.operationalRecordId, purchaseOrder.id), eq(erpInventoryMovements.movementType, "receipt")));
  const receivedQuantity = normalizeMoney(receipts.reduce((total, receipt) => total + Number(receipt.quantity), 0));
  const supplierMatched = invoice.counterpartyMasterId === purchaseOrder.counterpartyMasterId;
  const currencyMatched = invoice.transactionCurrency === purchaseOrder.transactionCurrency;
  const amountWithinPurchaseOrder = Number(invoice.totalAmount) <= Number(purchaseOrder.totalAmount);
  const reasonCodes = [
    ...(supplierMatched ? [] : ["supplier_mismatch"]),
    ...(currencyMatched ? [] : ["currency_mismatch"]),
    ...(amountWithinPurchaseOrder ? [] : ["invoice_exceeds_purchase_order"]),
    ...(receipts.length > 0 && receivedQuantity > 0 ? [] : ["missing_receipt_evidence"]),
  ];
  const match: PayableThreeWayMatch = {
    status: reasonCodes.length === 0 ? "matched" : "mismatch",
    purchaseOrderRecordId: purchaseOrder.id,
    purchaseOrderRecordNumber: purchaseOrder.recordNumber,
    purchaseOrderTotalAmount: normalizeMoney(Number(purchaseOrder.totalAmount)),
    invoiceTotalAmount: normalizeMoney(Number(invoice.totalAmount)),
    purchaseOrderCurrency: purchaseOrder.transactionCurrency,
    invoiceCurrency: invoice.transactionCurrency,
    receiptCount: receipts.length,
    receivedQuantity,
    supplierMatched,
    currencyMatched,
    amountWithinPurchaseOrder,
    reasonCodes,
    evaluatedAt: new Date().toISOString(),
    evaluatedByUserId: input.actorUserId,
    internalEvidenceOnly: true,
    noPaymentExecution: true,
    noExternalSupplierAction: true,
  };
  await db.update(erpOperationalRecords).set({ data: { ...(invoice.data as Record<string, unknown>), threeWayMatch: match } }).where(eq(erpOperationalRecords.id, invoice.id));
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", operationalRecordId: invoice.id, eventType: "payable_invoice.three_way_match_evaluated", actorUserId: input.actorUserId, payload: match });
  return { payableInvoiceRecordId: invoice.id, ...match };
}

export async function approveMatchedPayableInvoice(input: { ventureId: number; payableInvoiceRecordId: number; actorUserId: number; note?: string }) {
  const db = await requireDb();
  const [invoice] = await db.select().from(erpOperationalRecords).where(and(eq(erpOperationalRecords.id, input.payableInvoiceRecordId), eq(erpOperationalRecords.ventureId, input.ventureId))).limit(1);
  if (!invoice || invoice.recordType !== "payable_invoice" || invoice.domain !== "procurement") throw new Error("Payable invoice not found in the active venture.");
  if (invoice.status !== "pending_approval") throw new Error("Only a pending-approval payable invoice may be approved through the internal three-way-match control.");
  const match = (invoice.data as { threeWayMatch?: PayableThreeWayMatch }).threeWayMatch;
  if (!match || match.status !== "matched") throw new Error("Payable invoice approval requires a successful internal three-way match.");
  return transitionOperationalRecord({ ventureId: input.ventureId, operationalRecordId: invoice.id, targetStatus: "approved", actorUserId: input.actorUserId, note: input.note ?? "Approved after successful internal three-way match; no payment or external action." });
}

export async function createInternalPaymentRecord(input: { ventureId: number; recordNumber: string; title: string; invoiceRecordId: number; amount: number; effectiveDate: string; data: Record<string, unknown>; createdByUserId: number }) {
  const db = await requireDb();
  const rows = await db.select().from(erpOperationalRecords).where(and(eq(erpOperationalRecords.id, input.invoiceRecordId), eq(erpOperationalRecords.ventureId, input.ventureId))).limit(1);
  const invoice = rows[0];
  if (!invoice || !["receivable_invoice", "payable_invoice"].includes(invoice.recordType)) throw new Error("Payment records must reference a receivable or payable invoice in the active venture.");
  return createOperationalRecord({ ventureId: input.ventureId, domain: "finance", recordType: "payment_record", recordNumber: input.recordNumber, title: input.title, counterpartyMasterId: invoice.counterpartyMasterId ?? undefined, accountingPeriodId: invoice.accountingPeriodId ?? undefined, amount: input.amount, effectiveDate: input.effectiveDate, data: { ...input.data, invoiceRecordId: invoice.id, noExternalExecution: true, paymentEvidenceOnly: true }, createdByUserId: input.createdByUserId });
}

export async function convertProcurementRequestToPurchaseOrder(input: { ventureId: number; procurementRequestRecordId: number; purchaseOrderNumber: string; supplierMasterId: number; title: string; dueDate?: string; actorUserId: number }) {
  const db = await requireDb();
  const [request] = await db.select().from(erpOperationalRecords).where(and(eq(erpOperationalRecords.id, input.procurementRequestRecordId), eq(erpOperationalRecords.ventureId, input.ventureId))).limit(1);
  if (!request || request.domain !== "procurement" || request.recordType !== "procurement_request") throw new Error("Approved procurement request not found in the active venture.");
  if (request.status !== "approved") throw new Error("Procurement requests must be approved before conversion to a purchase order.");
  const supplier = await requireMaster(db, input.ventureId, input.supplierMasterId);
  if (supplier.domain !== "supplier" || supplier.status !== "active") throw new Error("Purchase-order conversion requires an active supplier master record.");
  const procurementRecords = await listOperationalRecords({ ventureId: input.ventureId, domain: "procurement" });
  if (procurementRecords.some(record => record.recordType === "purchase_order" && Number((record.data as { procurementRequestRecordId?: unknown }).procurementRequestRecordId) === request.id)) throw new Error("A purchase order already exists for this procurement request in the active venture.");
  const purchaseOrder = await createOperationalRecord({ ventureId: input.ventureId, domain: "procurement", recordType: "purchase_order", recordNumber: input.purchaseOrderNumber, title: input.title, counterpartyMasterId: supplier.id, accountingPeriodId: request.accountingPeriodId ?? undefined, budgetEnvelopeId: request.budgetEnvelopeId ?? undefined, publicBudgetNodeId: request.publicBudgetNodeId ?? undefined, taxPolicyId: request.taxPolicyId ?? undefined, transactionCurrency: request.transactionCurrency, functionalCurrency: request.functionalCurrency, exchangeRateId: request.exchangeRateId ?? undefined, amount: Number(request.amount), effectiveDate: request.effectiveDate, dueDate: input.dueDate, data: { ...(request.data as Record<string, unknown>), procurementRequestRecordId: request.id, conversionEvidence: "approved_procurement_request", noSupplierPayment: true, noExternalProcurementAction: true }, createdByUserId: input.actorUserId });
  await transitionOperationalRecord({ ventureId: input.ventureId, operationalRecordId: request.id, targetStatus: "posted", note: `Converted to purchase order ${purchaseOrder.recordNumber}`, actorUserId: input.actorUserId });
  await createAuditEvent({ ventureId: input.ventureId, domain: "procurement", operationalRecordId: request.id, eventType: "procurement_request.converted", actorUserId: input.actorUserId, payload: { purchaseOrderRecordId: purchaseOrder.id, purchaseOrderNumber: purchaseOrder.recordNumber, supplierMasterId: supplier.id, noSupplierPayment: true, noExternalProcurementAction: true } });
  return { procurementRequestRecordId: request.id, purchaseOrderRecordId: purchaseOrder.id, purchaseOrderStatus: purchaseOrder.status, requestStatus: "posted" as const };
}

export async function listInvoiceSettlements(ventureId: number) {
  const records = await listOperationalRecords({ ventureId });
  const invoices = records.filter(record => ["receivable_invoice", "payable_invoice"].includes(record.recordType));
  const postedPayments = records.filter(record => record.recordType === "payment_record" && ["posted", "fulfilled", "closed"].includes(record.status));
  return invoices.map(invoice => {
    const settledAmount = postedPayments.filter(payment => Number((payment.data as { invoiceRecordId?: unknown }).invoiceRecordId) === invoice.id).reduce((total, payment) => total + Number(payment.totalAmount), 0);
    return { invoice, settledAmount: normalizeMoney(settledAmount), openAmount: normalizeMoney(Math.max(0, Number(invoice.totalAmount) - settledAmount)) };
  });
}

export async function listInvoiceAging(ventureId: number, asOfDate: string) {
  const settlements = await listInvoiceSettlements(ventureId);
  const buckets: InvoiceAgingBucket[] = ["not_due", "1_30", "31_60", "61_90", "over_90", "undated"];
  const emptyTotals = () => Object.fromEntries(buckets.map(bucket => [bucket, 0])) as Record<InvoiceAgingBucket, number>;
  const summary: Record<InvoiceType, Record<string, Record<InvoiceAgingBucket, number>>> = { receivable_invoice: {}, payable_invoice: {} };
  const invoices = settlements.filter(item => item.openAmount > 0).map(item => {
    const age = classifyInvoiceAge(item.invoice.dueDate ?? undefined, asOfDate);
    const invoiceType = item.invoice.recordType as InvoiceType;
    const currency = item.invoice.transactionCurrency;
    const currencyTotals = summary[invoiceType][currency] ?? emptyTotals();
    currencyTotals[age.bucket] = normalizeMoney(currencyTotals[age.bucket] + item.openAmount);
    summary[invoiceType][currency] = currencyTotals;
    return { invoiceId: item.invoice.id, recordNumber: item.invoice.recordNumber, title: item.invoice.title, invoiceType, dueDate: item.invoice.dueDate ?? null, openAmount: item.openAmount, currency, ...age };
  });
  return { asOfDate, invoices, summary };
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
  if (record.recordType === "payable_invoice" && input.targetStatus === "approved") {
    const match = (record.data as { threeWayMatch?: PayableThreeWayMatch }).threeWayMatch;
    if (!match || match.status !== "matched") throw new Error("Payable invoice approval requires a successful internal three-way match against an approved purchase order and recorded receipt evidence.");
  }
  if (record.recordType === "payment_record" && input.targetStatus === "posted") {
    const invoiceRecordId = Number((record.data as { invoiceRecordId?: unknown }).invoiceRecordId);
    if (!Number.isInteger(invoiceRecordId) || invoiceRecordId <= 0) throw new Error("Payment record is missing its invoice reference.");
    const settlements = await listInvoiceSettlements(input.ventureId);
    const settlement = settlements.find(item => item.invoice.id === invoiceRecordId);
    if (!settlement) throw new Error("Payment invoice reference is not available in the active venture.");
    if (!["approved", "posted", "fulfilled"].includes(settlement.invoice.status)) throw new Error("Invoice must be approved or posted before internal payment evidence can be posted.");
    if (Number(record.totalAmount) > settlement.openAmount) throw new Error("Internal payment amount exceeds the invoice open balance.");
  }
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
  const activeDefinitions = await db.select().from(erpWorkflowDefinitions).where(and(eq(erpWorkflowDefinitions.ventureId, input.ventureId), eq(erpWorkflowDefinitions.status, "active")));
  for (const definition of activeDefinitions) {
    const trigger = (definition.definition as { trigger?: WorkflowTrigger }).trigger;
    if (!trigger || trigger.event !== "operational_record.transitioned" || trigger.targetStatus !== input.targetStatus || (trigger.domain && trigger.domain !== record.domain) || (trigger.recordType && trigger.recordType !== record.recordType)) continue;
    const instance = await startWorkflow({ ventureId: input.ventureId, workflowDefinitionId: definition.id, operationalRecordId: record.id, assigneeUserId: input.actorUserId, context: { trigger: trigger.event, recordDomain: record.domain, recordType: record.recordType, targetStatus: input.targetStatus, noExternalEffect: true }, startedByUserId: input.actorUserId });
    await createAuditEvent({ ventureId: input.ventureId, domain: "workflow", operationalRecordId: record.id, eventType: "workflow.event_triggered", actorUserId: input.actorUserId, payload: { workflowDefinitionId: definition.id, workflowInstanceId: instance.id, trigger, noExternalEffect: true } });
  }
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

export async function createAccountClassificationRevision(input: { ventureId: number; accountMasterId: number; classificationFamily: AccountClassificationFamily; statementSection: AccountStatementSection; normalBalance: "debit" | "credit"; effectiveFrom: string; effectiveTo?: string; rationale: string; adrReference?: string; createdByUserId: number }) {
  if (!input.rationale.trim()) throw new Error("Account-classification rationale is required.");
  if (input.effectiveTo && input.effectiveTo < input.effectiveFrom) throw new Error("Account-classification effective end date cannot precede its effective start date.");
  validateAccountClassification(input);
  const db = await requireDb();
  await requireAccountMaster(db, input.ventureId, input.accountMasterId);
  const existing = await db.select().from(erpAccountClassificationRevisions).where(and(eq(erpAccountClassificationRevisions.ventureId, input.ventureId), eq(erpAccountClassificationRevisions.accountMasterId, input.accountMasterId))).orderBy(desc(erpAccountClassificationRevisions.revision));
  const revision = (existing[0]?.revision ?? 0) + 1;
  const result = await db.insert(erpAccountClassificationRevisions).values({ ventureId: input.ventureId, accountMasterId: input.accountMasterId, revision, classificationFamily: input.classificationFamily, statementSection: input.statementSection, normalBalance: input.normalBalance, effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo ?? null, status: "draft", rationale: input.rationale.trim(), adrReference: input.adrReference?.trim() || null, createdByUserId: input.createdByUserId });
  const id = Number(result[0].insertId);
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", eventType: "account_classification_revision.created", actorUserId: input.createdByUserId, payload: { accountClassificationRevisionId: id, accountMasterId: input.accountMasterId, revision, classificationFamily: input.classificationFamily, statementSection: input.statementSection, normalBalance: input.normalBalance, effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo ?? null, noJournalCreated: true, noPosting: true, noBalanceMutation: true, noExternalEffect: true } });
  return { id, revision, status: "draft" as const };
}

export async function approveAccountClassificationRevision(input: { ventureId: number; accountClassificationRevisionId: number; actorUserId: number }) {
  const db = await requireDb();
  const [revision] = await db.select().from(erpAccountClassificationRevisions).where(and(eq(erpAccountClassificationRevisions.id, input.accountClassificationRevisionId), eq(erpAccountClassificationRevisions.ventureId, input.ventureId))).limit(1);
  if (!revision) throw new Error("Account-classification revision not found in the active venture.");
  if (revision.status !== "draft") throw new Error("Only draft account-classification revisions may be approved.");
  const approved = await db.select().from(erpAccountClassificationRevisions).where(and(eq(erpAccountClassificationRevisions.ventureId, input.ventureId), eq(erpAccountClassificationRevisions.accountMasterId, revision.accountMasterId), eq(erpAccountClassificationRevisions.status, "approved")));
  const overlaps = approved.some(item => item.effectiveFrom <= (revision.effectiveTo ?? "9999-12-31") && (item.effectiveTo ?? "9999-12-31") >= revision.effectiveFrom);
  if (overlaps) throw new Error("Approved account-classification revisions for the same account cannot have overlapping effective dates.");
  await db.update(erpAccountClassificationRevisions).set({ status: "approved", approvedByUserId: input.actorUserId, approvedAt: new Date() }).where(eq(erpAccountClassificationRevisions.id, revision.id));
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", eventType: "account_classification_revision.approved", actorUserId: input.actorUserId, payload: { accountClassificationRevisionId: revision.id, accountMasterId: revision.accountMasterId, revision: revision.revision, effectiveFrom: revision.effectiveFrom, effectiveTo: revision.effectiveTo, noJournalCreated: true, noPosting: true, noBalanceMutation: true, noExternalEffect: true } });
  return { id: revision.id, status: "approved" as const };
}

export async function listAccountClassificationRevisions(ventureId: number) {
  const db = await requireDb();
  return db.select().from(erpAccountClassificationRevisions).where(eq(erpAccountClassificationRevisions.ventureId, ventureId)).orderBy(desc(erpAccountClassificationRevisions.createdAt));
}

export async function createPostingRuleRevision(input: { ventureId: number; ruleCode: string; ruleName: string; eventType: "procurement_receipt"; effectiveFrom: string; effectiveTo?: string; debitAccountMasterId: number; creditAccountMasterId: number; debitAllocations?: Array<{ accountMasterId: number; allocationBasisPoints: number; narrative: string }>; changeRationale: string; adrReference?: string; createdByUserId: number }) {
  if (!input.ruleCode.trim() || !input.ruleName.trim() || !input.changeRationale.trim()) throw new Error("Posting-rule code, name, and rationale are required.");
  if (input.effectiveTo && input.effectiveTo < input.effectiveFrom) throw new Error("Posting-rule effective end date cannot precede its effective start date.");
  const db = await requireDb();
  await requireAccountMaster(db, input.ventureId, input.debitAccountMasterId);
  await requireAccountMaster(db, input.ventureId, input.creditAccountMasterId);
  if (input.debitAccountMasterId === input.creditAccountMasterId) throw new Error("Posting-rule debit and credit accounts must be distinct.");
  const existing = await db.select().from(erpPostingRuleRevisions).where(and(eq(erpPostingRuleRevisions.ventureId, input.ventureId), eq(erpPostingRuleRevisions.ruleCode, input.ruleCode.trim()))).orderBy(desc(erpPostingRuleRevisions.revision));
  const revision = (existing[0]?.revision ?? 0) + 1;
  const debitAllocations = input.debitAllocations?.length ? input.debitAllocations : [{ accountMasterId: input.debitAccountMasterId, allocationBasisPoints: 10_000, narrative: "Internal procurement receipt — inventory/receipt clearing debit" }];
  if (debitAllocations.some(allocation => allocation.accountMasterId === input.creditAccountMasterId)) throw new Error("Posting-rule debit allocations must not use the balancing credit account.");
  for (const allocation of debitAllocations) await requireAccountMaster(db, input.ventureId, allocation.accountMasterId);
  const lineConfiguration = asPostingRuleLines([
    ...debitAllocations.map(line => ({ entrySide: "debit" as const, accountMasterId: line.accountMasterId, narrative: line.narrative, allocationBasisPoints: line.allocationBasisPoints })),
    { entrySide: "credit", accountMasterId: input.creditAccountMasterId, narrative: "Internal procurement receipt — inventory/receipt clearing credit", allocationBasisPoints: 10_000 },
  ]);
  const result = await db.insert(erpPostingRuleRevisions).values({ ventureId: input.ventureId, ruleCode: input.ruleCode.trim(), ruleName: input.ruleName.trim(), eventType: input.eventType, revision, effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo, status: "draft", lineConfiguration, requiredDimensions: ["sourceOperationalRecordId", "sourceInventoryMovementId", "itemMasterId", "supplierMasterId"], changeRationale: input.changeRationale.trim(), adrReference: input.adrReference?.trim() || null, createdByUserId: input.createdByUserId });
  const id = Number(result[0].insertId);
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", eventType: "posting_rule_revision.created", actorUserId: input.createdByUserId, payload: { postingRuleRevisionId: id, ruleCode: input.ruleCode.trim(), revision, eventType: input.eventType, noAutomaticPosting: true, noExternalEffect: true } });
  return { id, revision, status: "draft" as const, lineConfiguration };
}

export async function approvePostingRuleRevision(input: { ventureId: number; postingRuleRevisionId: number; actorUserId: number }) {
  const db = await requireDb();
  const [revision] = await db.select().from(erpPostingRuleRevisions).where(and(eq(erpPostingRuleRevisions.id, input.postingRuleRevisionId), eq(erpPostingRuleRevisions.ventureId, input.ventureId))).limit(1);
  if (!revision) throw new Error("Posting-rule revision not found in the active venture.");
  if (revision.status !== "draft" && revision.status !== "reviewed") throw new Error("Only draft or reviewed posting-rule revisions may be approved.");
  const siblings = await db.select().from(erpPostingRuleRevisions).where(and(eq(erpPostingRuleRevisions.ventureId, input.ventureId), eq(erpPostingRuleRevisions.ruleCode, revision.ruleCode), eq(erpPostingRuleRevisions.status, "approved")));
  const overlaps = siblings.some(item => item.effectiveFrom <= (revision.effectiveTo ?? "9999-12-31") && (item.effectiveTo ?? "9999-12-31") >= revision.effectiveFrom);
  if (overlaps) throw new Error("Approved posting-rule revisions for the same rule code cannot have overlapping effective dates.");
  await db.update(erpPostingRuleRevisions).set({ status: "approved", approvedByUserId: input.actorUserId, approvedAt: new Date() }).where(eq(erpPostingRuleRevisions.id, revision.id));
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", eventType: "posting_rule_revision.approved", actorUserId: input.actorUserId, payload: { postingRuleRevisionId: revision.id, ruleCode: revision.ruleCode, revision: revision.revision, noAutomaticPosting: true, noExternalEffect: true } });
  return { id: revision.id, status: "approved" as const };
}

export async function listPostingRuleRevisions(ventureId: number) {
  const db = await requireDb();
  return db.select().from(erpPostingRuleRevisions).where(eq(erpPostingRuleRevisions.ventureId, ventureId)).orderBy(desc(erpPostingRuleRevisions.createdAt));
}

export async function emitProcurementReceiptAccountingEvent(input: { ventureId: number; purchaseOrderRecordId: number; inventoryMovementId: number; actorUserId: number }) {
  const db = await requireDb();
  const [purchaseOrder] = await db.select().from(erpOperationalRecords).where(and(eq(erpOperationalRecords.id, input.purchaseOrderRecordId), eq(erpOperationalRecords.ventureId, input.ventureId))).limit(1);
  if (!purchaseOrder || purchaseOrder.domain !== "procurement" || purchaseOrder.recordType !== "purchase_order" || !["posted", "fulfilled"].includes(purchaseOrder.status)) throw new Error("A posted or fulfilled procurement purchase order is required to emit a receipt accounting event.");
  const [movement] = await db.select().from(erpInventoryMovements).where(and(eq(erpInventoryMovements.id, input.inventoryMovementId), eq(erpInventoryMovements.ventureId, input.ventureId), eq(erpInventoryMovements.operationalRecordId, purchaseOrder.id), eq(erpInventoryMovements.movementType, "receipt"))).limit(1);
  if (!movement) throw new Error("Recorded receipt evidence was not found for the active purchase order.");
  const eventKey = `PROC-RECEIPT-${movement.id}`;
  const [existing] = await db.select().from(erpAccountingEvents).where(and(eq(erpAccountingEvents.ventureId, input.ventureId), eq(erpAccountingEvents.eventKey, eventKey))).limit(1);
  if (existing) return { ...existing, idempotent: true as const };
  const receiptSourceFacts = (movement.sourceFacts ?? {}) as ProcurementReceiptSourceFacts;
  const result = await db.insert(erpAccountingEvents).values({ ventureId: input.ventureId, eventKey, eventType: "procurement_receipt", sourceDomain: "procurement", sourceOperationalRecordId: purchaseOrder.id, sourceInventoryMovementId: movement.id, accountingPeriodId: purchaseOrder.accountingPeriodId, accountingDate: purchaseOrder.effectiveDate, transactionCurrency: purchaseOrder.transactionCurrency, functionalCurrency: purchaseOrder.functionalCurrency, amount: String(normalizeMoney(Number(purchaseOrder.totalAmount))), functionalAmount: String(normalizeMoney(Number(purchaseOrder.functionalAmount))), sourceSnapshot: { recordNumber: purchaseOrder.recordNumber, status: purchaseOrder.status, totalAmount: purchaseOrder.totalAmount, functionalAmount: purchaseOrder.functionalAmount, receiptQuantity: movement.quantity, receiptNarrative: movement.narrative, receiptSourceFacts }, dimensionsSnapshot: { sourceModule: "procurement", sourceOperationalRecordId: purchaseOrder.id, sourceInventoryMovementId: movement.id, supplierMasterId: purchaseOrder.counterpartyMasterId ?? null, itemMasterId: movement.itemMasterId, warehouse: receiptSourceFacts.warehouseCode ?? null, project: receiptSourceFacts.projectCode ?? null, costCenter: receiptSourceFacts.costCenterCode ?? null, WAREHOUSE: receiptSourceFacts.warehouseCode ?? null, PROJECT: receiptSourceFacts.projectCode ?? null, COST_CENTER: receiptSourceFacts.costCenterCode ?? null }, evidenceSnapshot: { inventoryMovementId: movement.id, internalReceiptReference: receiptSourceFacts.internalReceiptReference ?? null, supplierDeliveryReference: receiptSourceFacts.supplierDeliveryReference ?? null, evidenceReference: receiptSourceFacts.evidenceReference ?? null, noTaxDetermination: true, noPaymentExecution: true, noExternalEffect: true }, emittedByUserId: input.actorUserId });
  const id = Number(result[0].insertId);
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", operationalRecordId: purchaseOrder.id, eventType: "accounting_event.procurement_receipt_emitted", actorUserId: input.actorUserId, payload: { accountingEventId: id, eventKey, inventoryMovementId: movement.id, capturedSourceFactKeys: Object.keys(receiptSourceFacts), noAutomaticJournalPosting: true, noTaxDetermination: true, noPaymentExecution: true, noExternalEffect: true } });
  return { id, eventKey, eventType: "procurement_receipt" as const, idempotent: false as const };
}

export async function evaluateAccountingEventToProposal(input: { ventureId: number; accountingEventId: number; actorUserId: number }) {
  const db = await requireDb();
  const [event] = await db.select().from(erpAccountingEvents).where(and(eq(erpAccountingEvents.id, input.accountingEventId), eq(erpAccountingEvents.ventureId, input.ventureId))).limit(1);
  if (!event) throw new Error("Accounting event not found in the active venture.");
  const activeDimensions = await db.select().from(erpFinanceDimensionDefinitions).where(and(eq(erpFinanceDimensionDefinitions.ventureId, input.ventureId), eq(erpFinanceDimensionDefinitions.status, "active")));
  const sourceDimensions = event.dimensionsSnapshot as Record<string, unknown>;
  const financeDimensionSnapshot = activeDimensions.map(definition => ({ definitionId: definition.id, code: definition.code, name: definition.name, requiredForProposal: definition.requiredForProposal, sourceValue: sourceDimensions[definition.code] ?? null }));
  const missingRequiredDimensions = financeDimensionSnapshot.filter(dimension => dimension.requiredForProposal && (dimension.sourceValue === null || dimension.sourceValue === undefined)).map(dimension => `Required finance dimension ${dimension.code} has no retained source value.`);
  const candidates = (await db.select().from(erpPostingRuleRevisions).where(and(eq(erpPostingRuleRevisions.ventureId, input.ventureId), eq(erpPostingRuleRevisions.eventType, event.eventType), eq(erpPostingRuleRevisions.status, "approved")))).filter(rule => rule.effectiveFrom <= event.accountingDate && (rule.effectiveTo === null || rule.effectiveTo >= event.accountingDate));
  if (candidates.length !== 1 || missingRequiredDimensions.length) {
    const proposalNumber = `JP-REF-${event.id}`;
    const [existing] = await db.select().from(erpJournalProposals).where(and(eq(erpJournalProposals.ventureId, input.ventureId), eq(erpJournalProposals.proposalNumber, proposalNumber))).limit(1);
    if (existing) return existing;
    const ruleReasons = candidates.length === 0 ? ["No approved effective-dated posting rule matches this accounting event."] : candidates.length > 1 ? ["More than one approved effective-dated posting rule matches this accounting event."] : [];
    const reasons = [...ruleReasons, ...missingRequiredDimensions];
    const result = await db.insert(erpJournalProposals).values({ ventureId: input.ventureId, proposalNumber, accountingEventId: event.id, accountingPeriodId: event.accountingPeriodId, status: "refused", currency: event.functionalCurrency, proposalSnapshot: { accountingEventId: event.id, eventKey: event.eventKey, frozenFinanceDimensions: financeDimensionSnapshot, noJournalCreated: true }, refusalReasons: reasons, createdByUserId: input.actorUserId });
    const id = Number(result[0].insertId);
    await createAuditEvent({ ventureId: input.ventureId, domain: "finance", operationalRecordId: event.sourceOperationalRecordId, eventType: "journal_proposal.refused", actorUserId: input.actorUserId, payload: { journalProposalId: id, accountingEventId: event.id, reasons, noAutomaticJournalPosting: true, noExternalEffect: true } });
    return { id, status: "refused" as const, refusalReasons: reasons };
  }
  const rule = candidates[0];
  const [existing] = await db.select().from(erpJournalProposals).where(and(eq(erpJournalProposals.accountingEventId, event.id), eq(erpJournalProposals.postingRuleRevisionId, rule.id))).limit(1);
  if (existing) return existing;
  if (!event.accountingPeriodId) throw new Error("Procurement receipt accounting events require an accounting period before a proposal can be generated.");
  await requirePeriod(db, input.ventureId, event.accountingPeriodId);
  const frozenContext = { tenant: input.ventureId, accountingEventId: event.id, sourceDocument: event.sourceSnapshot, sourceDimensions: event.dimensionsSnapshot, evidenceReferences: event.evidenceSnapshot, postingRuleRevisionId: rule.id, ruleCode: rule.ruleCode, ruleRevision: rule.revision, effectiveDate: event.accountingDate, accountingPeriodId: event.accountingPeriodId, currency: event.functionalCurrency, financeDimensions: financeDimensionSnapshot };
  const configuredLines = asPostingRuleLines(rule.lineConfiguration);
  const totalCents = Math.round(Number(event.functionalAmount) * 100);
  let allocatedDebitCents = 0;
  const debitLines = configuredLines.filter(line => line.entrySide === "debit");
  const lines = configuredLines.map(line => {
    const isFinalDebit = line.entrySide === "debit" && line === debitLines[debitLines.length - 1];
    const amountCents = line.entrySide === "credit" ? totalCents : isFinalDebit ? totalCents - allocatedDebitCents : Math.floor(totalCents * (line.allocationBasisPoints ?? 0) / 10_000);
    if (line.entrySide === "debit") allocatedDebitCents += amountCents;
    return { ...line, amount: normalizeMoney(amountCents / 100), derivation: { method: "percentage_allocation", allocationBasisPoints: line.allocationBasisPoints, totalCents, residualApplied: isFinalDebit ? totalCents - allocatedDebitCents + amountCents : 0 }, frozenDimensions: frozenContext };
  });
  for (const line of lines) await requireAccountMaster(db, input.ventureId, line.accountMasterId);
  validateBalancedJournal(lines);
  const proposalNumber = `JP-${event.id}-R${rule.revision}`;
  const result = await db.insert(erpJournalProposals).values({ ventureId: input.ventureId, proposalNumber, accountingEventId: event.id, postingRuleRevisionId: rule.id, accountingPeriodId: event.accountingPeriodId, status: "pending_review", currency: event.functionalCurrency, proposalSnapshot: { accountingEventId: event.id, eventKey: event.eventKey, sourceOperationalRecordId: event.sourceOperationalRecordId, sourceInventoryMovementId: event.sourceInventoryMovementId, postingRuleRevisionId: rule.id, ruleCode: rule.ruleCode, ruleRevision: rule.revision, functionalAmount: event.functionalAmount, dimensions: event.dimensionsSnapshot, frozenContext, lines, noJournalCreated: true, noAutomaticPosting: true, noExternalEffect: true }, refusalReasons: [], createdByUserId: input.actorUserId });
  const id = Number(result[0].insertId);
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", operationalRecordId: event.sourceOperationalRecordId, eventType: "journal_proposal.generated", actorUserId: input.actorUserId, payload: { journalProposalId: id, accountingEventId: event.id, postingRuleRevisionId: rule.id, noJournalCreated: true, noAutomaticPosting: true, noExternalEffect: true } });
  return { id, proposalNumber, status: "pending_review" as const, lines };
}

export async function simulateAccountingEvent(input: { ventureId: number; accountingEventId: number; postingRuleRevisionId?: number; actorUserId: number; rationale: string }) {
  const db = await requireDb();
  const [event] = await db.select().from(erpAccountingEvents).where(and(eq(erpAccountingEvents.id, input.accountingEventId), eq(erpAccountingEvents.ventureId, input.ventureId))).limit(1);
  if (!event) throw new Error("Accounting event not found in the active venture.");
  const rules = (await db.select().from(erpPostingRuleRevisions).where(and(eq(erpPostingRuleRevisions.ventureId, input.ventureId), eq(erpPostingRuleRevisions.eventType, event.eventType), eq(erpPostingRuleRevisions.status, "approved")))).filter(rule => rule.effectiveFrom <= event.accountingDate && (rule.effectiveTo === null || rule.effectiveTo >= event.accountingDate) && (!input.postingRuleRevisionId || rule.id === input.postingRuleRevisionId));
  const activeDimensions = await db.select().from(erpFinanceDimensionDefinitions).where(and(eq(erpFinanceDimensionDefinitions.ventureId, input.ventureId), eq(erpFinanceDimensionDefinitions.status, "active")));
  const sourceDimensions = event.dimensionsSnapshot as Record<string, unknown>;
  const frozenDimensions = activeDimensions.map(definition => ({ definitionId: definition.id, code: definition.code, name: definition.name, requiredForProposal: definition.requiredForProposal, sourceValue: sourceDimensions[definition.code] ?? null }));
  const refusalReasons = [
    ...(rules.length === 0 ? ["No matching approved effective-dated rule revision is available."] : rules.length > 1 ? ["More than one matching approved rule revision is available."] : []),
    ...frozenDimensions.filter(dimension => dimension.requiredForProposal && (dimension.sourceValue === null || dimension.sourceValue === undefined)).map(dimension => `Required finance dimension ${dimension.code} has no retained source value.`),
  ];
  const rule = rules.length === 1 ? rules[0] : null;
  const simulationId = `SIM-${event.id}-${rule?.id ?? "REFUSED"}-${event.eventKey}`;
  let lines: Array<Record<string, unknown>> = [];
  if (rule && refusalReasons.length === 0) {
    const configuredLines = asPostingRuleLines(rule.lineConfiguration);
    const totalCents = Math.round(Number(event.functionalAmount) * 100);
    let allocatedDebitCents = 0;
    const debitLines = configuredLines.filter(line => line.entrySide === "debit");
    const frozenContext = { tenant: input.ventureId, accountingEventId: event.id, sourceDocument: event.sourceSnapshot, sourceEvidence: event.evidenceSnapshot, sourceDimensions: event.dimensionsSnapshot, postingRuleRevisionId: rule.id, ruleCode: rule.ruleCode, ruleRevision: rule.revision, effectiveDate: event.accountingDate, accountingPeriodId: event.accountingPeriodId, currency: event.functionalCurrency, financeDimensions: frozenDimensions };
    lines = configuredLines.map(line => { const isFinalDebit = line.entrySide === "debit" && line === debitLines[debitLines.length - 1]; const amountCents = line.entrySide === "credit" ? totalCents : isFinalDebit ? totalCents - allocatedDebitCents : Math.floor(totalCents * (line.allocationBasisPoints ?? 0) / 10_000); if (line.entrySide === "debit") allocatedDebitCents += amountCents; return { ...line, currency: event.functionalCurrency, amount: normalizeMoney(amountCents / 100), derivation: { method: "percentage_allocation", allocationBasisPoints: line.allocationBasisPoints, totalCents, residualApplied: isFinalDebit ? totalCents - allocatedDebitCents + amountCents : 0 }, frozenDimensions: frozenContext }; });
  }
  const debitTotal = lines.filter(line => line.entrySide === "debit").reduce((sum, line) => sum + Number(line.amount), 0);
  const creditTotal = lines.filter(line => line.entrySide === "credit").reduce((sum, line) => sum + Number(line.amount), 0);
  const isBalanced = lines.length > 0 && normalizeMoney(debitTotal) === normalizeMoney(creditTotal);
  if (lines.length > 0 && !isBalanced) refusalReasons.push("Simulation output is not balanced.");
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", eventType: refusalReasons.length ? "ledger_simulation.refused" : "ledger_simulation.executed", actorUserId: input.actorUserId, payload: { simulationId, accountingEventId: event.id, postingRuleRevisionId: rule?.id ?? null, rationale: input.rationale, lineCount: lines.length, status: refusalReasons.length ? "refused" : "completed", metadataOnly: true, noJournalCreated: true, noJournalNumberAssigned: true, noBalanceMutation: true, noWorkflowTriggered: true, noExternalEffect: true } });
  return { simulationId, simulationVersion: 1, simulationTimestamp: event.createdAt, accountingEventId: event.id, postingRuleRevisionId: rule?.id ?? null, lines, balancing: { debitTotal: normalizeMoney(debitTotal), creditTotal: normalizeMoney(creditTotal), isBalanced }, frozenDimensions, refusalReasons, boundary: { simulationOnly: true, journalCreated: false, journalNumberAssigned: false, balanceMutated: false, workflowTriggered: false, integrationTriggered: false, externalEffect: false } };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonicalize(child)]));
  return value;
}
const canonicalHash = (value: unknown) => createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");

function independentlyValidateCalculation(lines: Array<Record<string, unknown>>, balancing: { debitTotal: number; creditTotal: number; isBalanced: boolean }) {
  const debitLines = lines.filter(line => line.entrySide === "debit");
  const creditLines = lines.filter(line => line.entrySide === "credit");
  const debitBasisPoints = debitLines.reduce((sum, line) => sum + Number((line.derivation as Record<string, unknown> | undefined)?.allocationBasisPoints ?? 0), 0);
  const creditBasisPoints = creditLines.reduce((sum, line) => sum + Number((line.derivation as Record<string, unknown> | undefined)?.allocationBasisPoints ?? 0), 0);
  const debitCents = debitLines.reduce((sum, line) => sum + Math.round(Number(line.amount) * 100), 0);
  const creditCents = creditLines.reduce((sum, line) => sum + Math.round(Number(line.amount) * 100), 0);
  const sourceTotalCents = Number((lines[0]?.derivation as Record<string, unknown> | undefined)?.totalCents ?? 0);
  const finalDebit = debitLines[debitLines.length - 1];
  const residualApplied = Number((finalDebit?.derivation as Record<string, unknown> | undefined)?.residualApplied ?? 0);
  return {
    debitEqualsCredit: balancing.isBalanced && debitCents === creditCents && normalizeMoney(balancing.debitTotal) === normalizeMoney(balancing.creditTotal),
    debitAllocationTotals10k: debitLines.length > 0 && debitBasisPoints === 10_000,
    creditAllocationTotals10k: creditLines.length === 1 && creditBasisPoints === 10_000,
    allocatedDebitCentsEqualsSource: debitLines.length > 0 && debitCents === sourceTotalCents,
    deterministicResidualExplained: debitLines.length > 0 && Number.isInteger(residualApplied) && residualApplied >= 0,
    sourceTotalCents,
    debitCents,
    creditCents,
    residualApplied,
    noPostingPath: true,
    noExternalEffect: true,
  };
}

export async function createAccountingCalculationEvidence(input: { ventureId: number; accountingEventId: number; postingRuleRevisionId?: number; actorUserId: number; rationale: string }) {
  const simulation = await simulateAccountingEvent(input); const db = await requireDb(); const calculationKey = `CALC-${simulation.simulationId}`;
  const [existing] = await db.select().from(erpAccountingCalculationEvidence).where(and(eq(erpAccountingCalculationEvidence.ventureId, input.ventureId), eq(erpAccountingCalculationEvidence.calculationKey, calculationKey))).limit(1); if (existing) return existing;
  const inputSnapshot = { accountingEventId: simulation.accountingEventId, postingRuleRevisionId: simulation.postingRuleRevisionId, frozenDimensions: simulation.frozenDimensions, rationale: input.rationale };
  const calculationSnapshot = { lines: simulation.lines, balancing: simulation.balancing, refusalReasons: simulation.refusalReasons };
  const invariantSnapshot = independentlyValidateCalculation(simulation.lines, simulation.balancing);
  const [previous] = await db.select().from(erpAccountingCalculationEvidence).where(eq(erpAccountingCalculationEvidence.ventureId, input.ventureId)).orderBy(desc(erpAccountingCalculationEvidence.id)).limit(1); const inputHash = canonicalHash(inputSnapshot); const outputHash = canonicalHash(calculationSnapshot); const previousRecordHash = previous?.recordHash ?? null; const recordHash = canonicalHash({ calculationKey, inputHash, outputHash, previousRecordHash, engineVersion: "1.0.0" });
  const result = await db.insert(erpAccountingCalculationEvidence).values({ ventureId: input.ventureId, calculationKey, accountingEventId: simulation.accountingEventId, postingRuleRevisionId: simulation.postingRuleRevisionId, engineVersion: "1.0.0", status: simulation.refusalReasons.length ? "refused" : "completed", inputHash, outputHash, previousRecordHash, recordHash, inputSnapshot, calculationSnapshot, invariantSnapshot, calculatedByUserId: input.actorUserId });
  const id = Number(result[0].insertId);
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", eventType: "ledger_calculation_evidence.created", actorUserId: input.actorUserId, payload: { calculationEvidenceId: id, accountingEventId: simulation.accountingEventId, postingRuleRevisionId: simulation.postingRuleRevisionId, calculationKey, status: simulation.refusalReasons.length ? "refused" : "completed", recordHash, previousRecordHash, noJournalCreated: true, noJournalNumberAssigned: true, noBalanceMutation: true, noTaxCalculation: true, noPayrollCalculation: true, noPaymentExecution: true, noFiling: true, noWorkflowTriggered: true, noIntegrationTriggered: true, noExternalEffect: true } });
  return { id, calculationKey, recordHash, status: simulation.refusalReasons.length ? "refused" as const : "completed" as const, simulation };
}

export async function listAccountingCalculationEvidence(ventureId: number) {
  const db = await requireDb();
  return db.select().from(erpAccountingCalculationEvidence).where(eq(erpAccountingCalculationEvidence.ventureId, ventureId)).orderBy(desc(erpAccountingCalculationEvidence.id));
}

export async function getControlledFinanceReporting(input: { ventureId: number; accountingPeriodId?: number; comparisonAccountingPeriodId?: number; accountMasterId?: number }) {
  const db = await requireDb();
  const [evidenceRecords, events, accountMasters, periods, classifications, chain] = await Promise.all([
    db.select().from(erpAccountingCalculationEvidence).where(eq(erpAccountingCalculationEvidence.ventureId, input.ventureId)).orderBy(erpAccountingCalculationEvidence.id),
    db.select().from(erpAccountingEvents).where(eq(erpAccountingEvents.ventureId, input.ventureId)),
    db.select().from(erpMasterRecords).where(and(eq(erpMasterRecords.ventureId, input.ventureId), eq(erpMasterRecords.domain, "account"))),
    db.select().from(erpAccountingPeriods).where(eq(erpAccountingPeriods.ventureId, input.ventureId)),
    db.select().from(erpAccountClassificationRevisions).where(eq(erpAccountClassificationRevisions.ventureId, input.ventureId)),
    verifyAccountingCalculationEvidenceChain(input.ventureId),
  ]);
  const eventById = new Map(events.map(event => [event.id, event]));
  const accountById = new Map(accountMasters.map(account => [account.id, account]));
  const periodById = new Map(periods.map(period => [period.id, period]));
  const classificationsByAccountId = new Map<number, typeof classifications>();
  for (const classification of classifications) classificationsByAccountId.set(classification.accountMasterId, [...(classificationsByAccountId.get(classification.accountMasterId) ?? []), classification]);
  const chainCheckByEvidenceId = new Map(chain.checks.map(check => [check.id, check]));
  type ClassificationMatch = { id: number; revision: number; classificationFamily: AccountClassificationFamily; statementSection: AccountStatementSection; normalBalance: "debit" | "credit"; effectiveFrom: string; effectiveTo: string | null };
  type ReportLine = { evidenceId: number; calculationKey: string; recordHash: string; accountingEventId: number; accountingDate: string; accountingPeriodId: number | null; accountingPeriodCode: string | null; sourceOperationalRecordId: number; postingRuleRevisionId: number | null; accountMasterId: number; accountCode: string; accountName: string; currency: string; entrySide: "debit" | "credit"; amount: number; narrative: string; frozenDimensions: unknown; classificationStatus: "classified" | "unclassified" | "ambiguous"; accountClassification: ClassificationMatch | null };
  const eligibleLines: ReportLine[] = [];
  const excludedEvidence = evidenceRecords.flatMap(record => {
    const event = eventById.get(record.accountingEventId);
    const check = chainCheckByEvidenceId.get(record.id);
    const invariant = record.invariantSnapshot as Record<string, unknown>;
    const reasons = [
      ...(record.status !== "completed" ? ["evidence_not_completed"] : []),
      ...(!check?.valid ? ["evidence_chain_or_hash_invalid"] : []),
      ...(invariant.debitEqualsCredit !== true || invariant.debitAllocationTotals10k !== true || invariant.creditAllocationTotals10k !== true || invariant.allocatedDebitCentsEqualsSource !== true || invariant.deterministicResidualExplained !== true ? ["independent_invariant_invalid"] : []),
      ...(!event ? ["source_event_missing"] : []),
    ];
    if (reasons.length) return [{ evidenceId: record.id, calculationKey: record.calculationKey, reasons }];
    const snapshot = record.calculationSnapshot as { lines?: Array<Record<string, unknown>> };
    for (const line of snapshot.lines ?? []) {
      const accountMasterId = Number(line.accountMasterId); const amount = Number(line.amount); const entrySide = line.entrySide;
      const account = accountById.get(accountMasterId);
      if (!account || !Number.isFinite(amount) || amount < 0 || (entrySide !== "debit" && entrySide !== "credit")) continue;
      const matches = (classificationsByAccountId.get(accountMasterId) ?? []).filter(classification => classification.status === "approved" && classification.effectiveFrom <= event!.accountingDate && (classification.effectiveTo === null || classification.effectiveTo >= event!.accountingDate));
      const matched = matches.length === 1 ? matches[0] : null;
      eligibleLines.push({ evidenceId: record.id, calculationKey: record.calculationKey, recordHash: record.recordHash, accountingEventId: event!.id, accountingDate: event!.accountingDate, accountingPeriodId: event!.accountingPeriodId, accountingPeriodCode: event!.accountingPeriodId ? periodById.get(event!.accountingPeriodId)?.code ?? null : null, sourceOperationalRecordId: event!.sourceOperationalRecordId, postingRuleRevisionId: record.postingRuleRevisionId, accountMasterId, accountCode: account.code, accountName: account.name, currency: typeof line.currency === "string" ? line.currency : event!.functionalCurrency, entrySide, amount: normalizeMoney(amount), narrative: typeof line.narrative === "string" ? line.narrative : "Retained immutable calculation line", frozenDimensions: line.frozenDimensions ?? null, classificationStatus: matches.length === 1 ? "classified" : matches.length === 0 ? "unclassified" : "ambiguous", accountClassification: matched ? { id: matched.id, revision: matched.revision, classificationFamily: matched.classificationFamily, statementSection: matched.statementSection, normalBalance: matched.normalBalance, effectiveFrom: matched.effectiveFrom, effectiveTo: matched.effectiveTo } : null });
    }
    return [];
  });
  const buildPeriodProjection = (accountingPeriodId?: number) => {
    const lines = eligibleLines.filter(line => (accountingPeriodId === undefined || line.accountingPeriodId === accountingPeriodId) && (input.accountMasterId === undefined || line.accountMasterId === input.accountMasterId));
    const buckets = new Map<string, { accountMasterId: number; accountCode: string; accountName: string; currency: string; debit: number; credit: number; netDebit: number; lineCount: number; evidenceIds: number[] }>();
    for (const line of lines) {
      const key = `${line.accountMasterId}:${line.currency}`; const bucket = buckets.get(key) ?? { accountMasterId: line.accountMasterId, accountCode: line.accountCode, accountName: line.accountName, currency: line.currency, debit: 0, credit: 0, netDebit: 0, lineCount: 0, evidenceIds: [] };
      if (line.entrySide === "debit") bucket.debit = normalizeMoney(bucket.debit + line.amount); else bucket.credit = normalizeMoney(bucket.credit + line.amount);
      bucket.netDebit = Math.round((bucket.debit - bucket.credit) * 100) / 100; bucket.lineCount += 1; if (!bucket.evidenceIds.includes(line.evidenceId)) bucket.evidenceIds.push(line.evidenceId); buckets.set(key, bucket);
    }
    return { accountingPeriodId: accountingPeriodId ?? null, accountingPeriodCode: accountingPeriodId ? periodById.get(accountingPeriodId)?.code ?? null : null, trialBalanceActivity: Array.from(buckets.values()).sort((a, b) => a.accountCode.localeCompare(b.accountCode) || a.currency.localeCompare(b.currency)), generalLedgerActivity: lines.sort((a, b) => a.accountingDate.localeCompare(b.accountingDate) || a.evidenceId - b.evidenceId) };
  };
  const classificationCoverage = { approvedRevisionCount: classifications.filter(classification => classification.status === "approved").length, eligibleEvidenceLineCount: eligibleLines.length, classifiedEvidenceLineCount: eligibleLines.filter(line => line.classificationStatus === "classified").length, unclassifiedEvidenceLineCount: eligibleLines.filter(line => line.classificationStatus === "unclassified").length, ambiguousEvidenceLineCount: eligibleLines.filter(line => line.classificationStatus === "ambiguous").length, policy: "effective_dated_finance_owned_read_model_only" as const, noHistoricalRewrite: true as const };
  const evidenceIntegrityReady = chain.valid && eligibleLines.length > 0;
  const classificationCoverageReady = classificationCoverage.eligibleEvidenceLineCount > 0 && classificationCoverage.unclassifiedEvidenceLineCount === 0 && classificationCoverage.ambiguousEvidenceLineCount === 0;
  const derivedGate = (key: string, status: "ready" | "blocked", detail: string) => ({ key, status, detail, derivedOnly: true as const });
  const unavailableGate = (key: string, detail: string) => ({ key, status: "blocked" as const, detail, derivedOnly: false as const });
  const evidenceGate = derivedGate("immutable_evidence_integrity", evidenceIntegrityReady ? "ready" : "blocked", evidenceIntegrityReady ? "Completed immutable calculation evidence has a valid retained chain and independent invariants." : "No eligible completed immutable calculation evidence with a valid retained chain and invariants is available.");
  const classificationGate = derivedGate("effective_dated_classification_coverage", classificationCoverageReady ? "ready" : "blocked", classificationCoverageReady ? "Each eligible evidence line has exactly one approved effective-dated finance classification." : `${classificationCoverage.unclassifiedEvidenceLineCount} unclassified and ${classificationCoverage.ambiguousEvidenceLineCount} ambiguous eligible evidence line(s) remain.`);
  const formalStatementReadiness = [
    { statement: "balance_sheet" as const, available: false as const, gates: [evidenceGate, classificationGate, unavailableGate("opening_balance_policy", "No governed opening-balance policy or canonical opening evidence is configured."), unavailableGate("period_close_and_presentation_policy", "No governed statement period-close and presentation policy is configured."), unavailableGate("statement_projection_evidence", "No immutable formal-statement projection or reconciliation evidence exists.")] },
    { statement: "income_statement" as const, available: false as const, gates: [evidenceGate, classificationGate, unavailableGate("revenue_and_expense_presentation_policy", "No governed revenue and expense presentation policy is configured."), unavailableGate("period_close_and_presentation_policy", "No governed statement period-close and presentation policy is configured."), unavailableGate("statement_projection_evidence", "No immutable formal-statement projection or reconciliation evidence exists.")] },
    { statement: "cash_flow" as const, available: false as const, gates: [evidenceGate, unavailableGate("cash_flow_policy", "No governed cash-flow classification policy or canonical cash-flow evidence is configured."), unavailableGate("currency_translation_policy", "No governed translation policy and retained translation evidence is configured."), unavailableGate("statement_projection_evidence", "No immutable cash-flow projection or reconciliation evidence exists.")] },
    { statement: "cogs_and_margin" as const, available: false as const, gates: [evidenceGate, unavailableGate("valuation_policy", "No governed inventory valuation or COGS policy and canonical valuation evidence is configured."), unavailableGate("statement_projection_evidence", "No immutable COGS or margin projection evidence exists.")] },
    { statement: "profitability" as const, available: false as const, gates: [evidenceGate, classificationGate, unavailableGate("dimension_and_source_policy", "No governed profitability dimension and source-attribution policy is configured."), unavailableGate("statement_projection_evidence", "No immutable profitability projection evidence exists.")] },
  ];
  return {
    ventureId: input.ventureId,
    source: "immutable_calculation_evidence" as const,
    reportMode: "evidence_activity_not_posted_gl" as const,
    chainVerification: { valid: chain.valid, recordCount: chain.recordCount },
    current: buildPeriodProjection(input.accountingPeriodId),
    comparison: input.comparisonAccountingPeriodId ? buildPeriodProjection(input.comparisonAccountingPeriodId) : null,
    excludedEvidence,
    classificationCoverage,
    formalStatementReadiness,
    formalStatements: { trialBalance: "evidence_activity_available" as const, generalLedger: "evidence_activity_available" as const, balanceSheet: "not_available_pending_statement_policy_and_frozen_classification_evidence" as const, incomeStatement: "not_available_pending_statement_policy_and_frozen_classification_evidence" as const, cashFlow: "not_available_without_governed_cash_flow_policy" as const, cogsAndMargin: "not_available_without_governed_valuation_policy" as const, profitability: "not_available_without_governed_dimension_and_source_policy" as const, translatedCurrencyPresentation: "not_available_without_retained_translation_evidence" as const },
    boundary: { noJournalCreated: true as const, noAutomaticPosting: true as const, noBalanceMutation: true as const, noTaxCalculation: true as const, noPayrollCalculation: true as const, noPaymentExecution: true as const, noFiling: true as const, noExternalEffect: true as const },
  };
}

export async function verifyAccountingCalculationEvidenceChain(ventureId: number) {
  const db = await requireDb();
  const records = await db.select().from(erpAccountingCalculationEvidence).where(eq(erpAccountingCalculationEvidence.ventureId, ventureId)).orderBy(erpAccountingCalculationEvidence.id);
  let expectedPreviousRecordHash: string | null = null;
  const checks = records.map(record => {
    const inputHashValid = canonicalHash(record.inputSnapshot) === record.inputHash;
    const outputHashValid = canonicalHash(record.calculationSnapshot) === record.outputHash;
    const expectedRecordHash = canonicalHash({ calculationKey: record.calculationKey, inputHash: record.inputHash, outputHash: record.outputHash, previousRecordHash: expectedPreviousRecordHash, engineVersion: record.engineVersion });
    const chainLinkValid = record.previousRecordHash === expectedPreviousRecordHash;
    const recordHashValid = expectedRecordHash === record.recordHash;
    const snapshot = record.calculationSnapshot as { lines?: Array<Record<string, unknown>>; balancing?: { debitTotal: number; creditTotal: number; isBalanced: boolean } };
    const invariantSnapshot = independentlyValidateCalculation(snapshot.lines ?? [], snapshot.balancing ?? { debitTotal: 0, creditTotal: 0, isBalanced: false });
    const independentInvariantValid = canonicalHash(invariantSnapshot) === canonicalHash(record.invariantSnapshot);
    expectedPreviousRecordHash = record.recordHash;
    return { id: record.id, calculationKey: record.calculationKey, inputHashValid, outputHashValid, chainLinkValid, recordHashValid, independentInvariantValid, valid: inputHashValid && outputHashValid && chainLinkValid && recordHashValid && independentInvariantValid };
  });
  return { ventureId, recordCount: records.length, valid: checks.every(check => check.valid), checks, noJournalCreated: true as const, noAutomaticPosting: true as const, noExternalEffect: true as const };
}

export async function reviewJournalProposal(input: { ventureId: number; journalProposalId: number; decision: "approved" | "rejected"; note: string; actorUserId: number }) {
  const db = await requireDb();
  const [proposal] = await db.select().from(erpJournalProposals).where(and(eq(erpJournalProposals.id, input.journalProposalId), eq(erpJournalProposals.ventureId, input.ventureId))).limit(1);
  if (!proposal) throw new Error("Journal proposal not found in the active venture.");
  if (proposal.status !== "pending_review") throw new Error("Only pending-review journal proposals may be reviewed.");
  if (!input.note.trim()) throw new Error("Journal proposal review requires a note.");
  await db.update(erpJournalProposals).set({ status: input.decision, reviewedByUserId: input.actorUserId, reviewedAt: new Date(), reviewNote: input.note.trim() }).where(eq(erpJournalProposals.id, proposal.id));
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", eventType: `journal_proposal.${input.decision}`, actorUserId: input.actorUserId, payload: { journalProposalId: proposal.id, accountingEventId: proposal.accountingEventId, note: input.note.trim(), noJournalCreated: true, noAutomaticPosting: true, noExternalEffect: true } });
  return { id: proposal.id, status: input.decision, noJournalCreated: true as const };
}

export async function listAccountingControl(ventureId: number) {
  const db = await requireDb();
  const [events, rules, proposals] = await Promise.all([
    db.select().from(erpAccountingEvents).where(eq(erpAccountingEvents.ventureId, ventureId)).orderBy(desc(erpAccountingEvents.createdAt)),
    db.select().from(erpPostingRuleRevisions).where(eq(erpPostingRuleRevisions.ventureId, ventureId)).orderBy(desc(erpPostingRuleRevisions.createdAt)),
    db.select().from(erpJournalProposals).where(eq(erpJournalProposals.ventureId, ventureId)).orderBy(desc(erpJournalProposals.updatedAt)),
  ]);
  return { events, rules, proposals };
}

export async function createFinanceDimensionDefinition(input: { ventureId: number; code: string; name: string; description?: string; requiredForProposal?: boolean; createdByUserId: number }) {
  const db = await requireDb();
  const result = await db.insert(erpFinanceDimensionDefinitions).values({ ventureId: input.ventureId, code: input.code.trim(), name: input.name.trim(), description: input.description?.trim() || null, requiredForProposal: Boolean(input.requiredForProposal), status: "draft", createdByUserId: input.createdByUserId });
  const id = Number(result[0].insertId);
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", eventType: "finance_dimension.definition_created", actorUserId: input.createdByUserId, payload: { financeDimensionDefinitionId: id, code: input.code.trim(), requiredForProposal: Boolean(input.requiredForProposal), noAutomaticPosting: true, noExternalEffect: true } });
  return { id, status: "draft" as const };
}

export async function activateFinanceDimensionDefinition(input: { ventureId: number; financeDimensionDefinitionId: number; actorUserId: number }) {
  const db = await requireDb();
  const [definition] = await db.select().from(erpFinanceDimensionDefinitions).where(and(eq(erpFinanceDimensionDefinitions.id, input.financeDimensionDefinitionId), eq(erpFinanceDimensionDefinitions.ventureId, input.ventureId))).limit(1);
  if (!definition) throw new Error("Finance dimension definition not found in the active venture.");
  if (definition.status === "retired") throw new Error("Retired finance dimension definitions cannot be activated.");
  await db.update(erpFinanceDimensionDefinitions).set({ status: "active" }).where(eq(erpFinanceDimensionDefinitions.id, definition.id));
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", eventType: "finance_dimension.definition_activated", actorUserId: input.actorUserId, payload: { financeDimensionDefinitionId: definition.id, noAutomaticPosting: true, noExternalEffect: true } });
  return { id: definition.id, status: "active" as const };
}

export async function createFinanceDimensionValue(input: { ventureId: number; financeDimensionDefinitionId: number; code: string; name: string; attributes: Record<string, unknown>; createdByUserId: number }) {
  const db = await requireDb();
  const [definition] = await db.select().from(erpFinanceDimensionDefinitions).where(and(eq(erpFinanceDimensionDefinitions.id, input.financeDimensionDefinitionId), eq(erpFinanceDimensionDefinitions.ventureId, input.ventureId))).limit(1);
  if (!definition || definition.status !== "active") throw new Error("An active finance dimension definition is required before adding a value.");
  const result = await db.insert(erpFinanceDimensionValues).values({ ventureId: input.ventureId, dimensionDefinitionId: definition.id, code: input.code.trim(), name: input.name.trim(), status: "draft", attributes: input.attributes, createdByUserId: input.createdByUserId });
  const id = Number(result[0].insertId);
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", eventType: "finance_dimension.value_created", actorUserId: input.createdByUserId, payload: { financeDimensionValueId: id, financeDimensionDefinitionId: definition.id, code: input.code.trim(), noAutomaticPosting: true, noExternalEffect: true } });
  return { id, status: "draft" as const };
}

export async function activateFinanceDimensionValue(input: { ventureId: number; financeDimensionValueId: number; actorUserId: number }) {
  const db = await requireDb();
  const [value] = await db.select().from(erpFinanceDimensionValues).where(and(eq(erpFinanceDimensionValues.id, input.financeDimensionValueId), eq(erpFinanceDimensionValues.ventureId, input.ventureId))).limit(1);
  if (!value) throw new Error("Finance dimension value not found in the active venture.");
  if (value.status === "retired") throw new Error("Retired finance dimension values cannot be activated.");
  await db.update(erpFinanceDimensionValues).set({ status: "active" }).where(eq(erpFinanceDimensionValues.id, value.id));
  await createAuditEvent({ ventureId: input.ventureId, domain: "finance", eventType: "finance_dimension.value_activated", actorUserId: input.actorUserId, payload: { financeDimensionValueId: value.id, financeDimensionDefinitionId: value.dimensionDefinitionId, noAutomaticPosting: true, noExternalEffect: true } });
  return { id: value.id, status: "active" as const };
}

export async function listFinanceDimensions(ventureId: number) {
  const db = await requireDb();
  const [definitions, values] = await Promise.all([
    db.select().from(erpFinanceDimensionDefinitions).where(eq(erpFinanceDimensionDefinitions.ventureId, ventureId)).orderBy(desc(erpFinanceDimensionDefinitions.updatedAt)),
    db.select().from(erpFinanceDimensionValues).where(eq(erpFinanceDimensionValues.ventureId, ventureId)).orderBy(desc(erpFinanceDimensionValues.updatedAt)),
  ]);
  return definitions.map(definition => ({ ...definition, values: values.filter(value => value.dimensionDefinitionId === definition.id) }));
}

export type InventoryMovementType = "receipt" | "issue" | "adjust_in" | "adjust_out" | "reserve" | "release";
export type WorkflowTrigger = { event: "operational_record.transitioned"; domain?: OperationalDomain; recordType?: string; targetStatus: OperationalStatus };

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

export async function recordInventoryMovement(input: { ventureId: number; itemMasterId: number; operationalRecordId?: number; movementType: InventoryMovementType; quantity: number; narrative: string; sourceFacts?: Record<string, unknown>; createdByUserId: number }) {
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
    const result = await tx.insert(erpInventoryMovements).values({ ventureId: input.ventureId, itemMasterId: input.itemMasterId, operationalRecordId: input.operationalRecordId, movementType: input.movementType, quantity: String(quantity), onHandAfter: String(nextOnHand), reservedAfter: String(nextReserved), narrative: input.narrative, sourceFacts: input.sourceFacts ?? null, createdByUserId: input.createdByUserId });
    return { id: Number(result[0].insertId), onHandQuantity: nextOnHand, reservedQuantity: nextReserved, availableQuantity: Math.round((nextOnHand - nextReserved) * 1000) / 1000 };
  });
  await createAuditEvent({ ventureId: input.ventureId, domain: "inventory", eventType: "inventory.movement_recorded", actorUserId: input.createdByUserId, payload: { movementId: outcome.id, itemMasterId: input.itemMasterId, movementType: input.movementType, quantity, onHandAfter: outcome.onHandQuantity, reservedAfter: outcome.reservedQuantity, capturedSourceFactKeys: Object.keys(input.sourceFacts ?? {}) } });
  return { ...input, quantity, ...outcome };
}

export async function receivePurchaseOrder(input: { ventureId: number; purchaseOrderRecordId: number; itemMasterId: number; quantity: number; narrative: string; sourceFacts?: ProcurementReceiptSourceFacts; finalReceipt?: boolean; actorUserId: number }) {
  const db = await requireDb();
  const rows = await db.select().from(erpOperationalRecords).where(and(eq(erpOperationalRecords.id, input.purchaseOrderRecordId), eq(erpOperationalRecords.ventureId, input.ventureId))).limit(1);
  const purchaseOrder = rows[0];
  if (!purchaseOrder || purchaseOrder.domain !== "procurement" || purchaseOrder.recordType !== "purchase_order") throw new Error("Approved purchase order not found in the active venture.");
  if (!["approved", "posted"].includes(purchaseOrder.status)) throw new Error("Purchase orders must be approved or posted before receipt.");
  const sourceFacts = normalizeProcurementReceiptSourceFacts(input.sourceFacts);
  const receipt = await recordInventoryMovement({ ventureId: input.ventureId, itemMasterId: input.itemMasterId, operationalRecordId: purchaseOrder.id, movementType: "receipt", quantity: input.quantity, narrative: input.narrative, sourceFacts, createdByUserId: input.actorUserId });
  let status = purchaseOrder.status;
  if (input.finalReceipt) {
    status = "fulfilled";
    await db.update(erpOperationalRecords).set({ status, updatedAt: new Date() }).where(eq(erpOperationalRecords.id, purchaseOrder.id));
  }
  await createAuditEvent({ ventureId: input.ventureId, domain: "procurement", operationalRecordId: purchaseOrder.id, eventType: "purchase_order.received", actorUserId: input.actorUserId, payload: { itemMasterId: input.itemMasterId, quantity: receipt.quantity, inventoryMovementId: receipt.id, finalReceipt: Boolean(input.finalReceipt), capturedSourceFactKeys: Object.keys(sourceFacts ?? {}), resultingStatus: status, noValuationCalculation: true, noTaxCalculation: true, noExternalEffect: true } });
  const accountingControl = input.finalReceipt
    ? await emitProcurementReceiptAccountingEvent({ ventureId: input.ventureId, purchaseOrderRecordId: purchaseOrder.id, inventoryMovementId: receipt.id, actorUserId: input.actorUserId })
    : undefined;
  const proposal = accountingControl && !accountingControl.idempotent
    ? await evaluateAccountingEventToProposal({ ventureId: input.ventureId, accountingEventId: accountingControl.id, actorUserId: input.actorUserId })
    : undefined;
  return { purchaseOrderRecordId: purchaseOrder.id, inventoryMovementId: receipt.id, quantity: receipt.quantity, status, finalReceipt: Boolean(input.finalReceipt), accountingEvent: accountingControl, journalProposal: proposal, noAutomaticJournalPosting: Boolean(accountingControl), noExternalEffect: Boolean(accountingControl) };
}

export async function reserveSalesOrderInventory(input: { ventureId: number; salesOrderRecordId: number; itemMasterId: number; quantity: number; narrative: string; actorUserId: number }) {
  const db = await requireDb();
  const rows = await db.select().from(erpOperationalRecords).where(and(eq(erpOperationalRecords.id, input.salesOrderRecordId), eq(erpOperationalRecords.ventureId, input.ventureId))).limit(1);
  const salesOrder = rows[0];
  if (!salesOrder || salesOrder.domain !== "sales" || salesOrder.recordType !== "sales_order") throw new Error("Approved sales order not found in the active venture.");
  if (!['approved', 'posted'].includes(salesOrder.status)) throw new Error("Sales orders must be approved or posted before inventory can be reserved.");
  const reservation = await recordInventoryMovement({ ventureId: input.ventureId, itemMasterId: input.itemMasterId, operationalRecordId: salesOrder.id, movementType: "reserve", quantity: input.quantity, narrative: input.narrative, createdByUserId: input.actorUserId });
  await createAuditEvent({ ventureId: input.ventureId, domain: "sales", operationalRecordId: salesOrder.id, eventType: "sales_order.inventory_reserved", actorUserId: input.actorUserId, payload: { itemMasterId: input.itemMasterId, quantity: reservation.quantity, inventoryMovementId: reservation.id, noExternalFulfillment: true } });
  return { salesOrderRecordId: salesOrder.id, inventoryMovementId: reservation.id, quantity: reservation.quantity, availableQuantity: reservation.availableQuantity };
}

export async function fulfillSalesOrderInventory(input: { ventureId: number; salesOrderRecordId: number; itemMasterId: number; quantity: number; narrative: string; finalFulfillment?: boolean; actorUserId: number }) {
  const db = await requireDb();
  const quantity = Math.round(input.quantity * 1000) / 1000;
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Fulfillment quantity must be greater than zero.");
  if (!input.narrative.trim()) throw new Error("Sales-order fulfillment requires a narrative.");
  const [salesOrder] = await db.select().from(erpOperationalRecords).where(and(eq(erpOperationalRecords.id, input.salesOrderRecordId), eq(erpOperationalRecords.ventureId, input.ventureId))).limit(1);
  if (!salesOrder || salesOrder.domain !== "sales" || salesOrder.recordType !== "sales_order") throw new Error("Approved sales order not found in the active venture.");
  if (!['approved', 'posted'].includes(salesOrder.status)) throw new Error("Sales orders must be approved or posted before fulfillment.");
  const item = await requireMaster(db, input.ventureId, input.itemMasterId);
  if (item.domain !== "item") throw new Error("Sales-order fulfillment requires an item master record.");
  const orderMovements = await db.select().from(erpInventoryMovements).where(and(eq(erpInventoryMovements.ventureId, input.ventureId), eq(erpInventoryMovements.operationalRecordId, salesOrder.id), eq(erpInventoryMovements.itemMasterId, input.itemMasterId)));
  const reservedForOrder = orderMovements.reduce((total, movement) => total + (movement.movementType === "reserve" ? Number(movement.quantity) : movement.movementType === "release" ? -Number(movement.quantity) : 0), 0);
  if (reservedForOrder < quantity) throw new Error("Sales-order fulfillment cannot exceed the order-linked reserved inventory.");
  const remainingReserved = Math.round((reservedForOrder - quantity) * 1000) / 1000;
  if (input.finalFulfillment && remainingReserved > 0) throw new Error("Final fulfillment requires consuming all remaining order-linked reservations.");
  const outcome = await db.transaction(async tx => {
    const [balance] = await tx.select().from(erpInventoryBalances).where(and(eq(erpInventoryBalances.ventureId, input.ventureId), eq(erpInventoryBalances.itemMasterId, input.itemMasterId))).limit(1);
    const onHand = Number(balance?.onHandQuantity ?? 0); const reserved = Number(balance?.reservedQuantity ?? 0);
    if (!balance || onHand < quantity || reserved < quantity) throw new Error("Insufficient reserved inventory for sales-order fulfillment.");
    const nextOnHand = Math.round((onHand - quantity) * 1000) / 1000; const nextReserved = Math.round((reserved - quantity) * 1000) / 1000;
    if (nextOnHand < 0 || nextReserved < 0 || nextReserved > nextOnHand) throw new Error("Inventory balance invariant failed.");
    await tx.update(erpInventoryBalances).set({ onHandQuantity: String(nextOnHand), reservedQuantity: String(nextReserved) }).where(eq(erpInventoryBalances.id, balance.id));
    const release = await tx.insert(erpInventoryMovements).values({ ventureId: input.ventureId, itemMasterId: input.itemMasterId, operationalRecordId: salesOrder.id, movementType: "release", quantity: String(quantity), onHandAfter: String(onHand), reservedAfter: String(nextReserved), narrative: `Release for fulfillment: ${input.narrative}`, createdByUserId: input.actorUserId });
    const issue = await tx.insert(erpInventoryMovements).values({ ventureId: input.ventureId, itemMasterId: input.itemMasterId, operationalRecordId: salesOrder.id, movementType: "issue", quantity: String(quantity), onHandAfter: String(nextOnHand), reservedAfter: String(nextReserved), narrative: input.narrative, createdByUserId: input.actorUserId });
    return { releaseMovementId: Number(release[0].insertId), issueMovementId: Number(issue[0].insertId), onHandQuantity: nextOnHand, reservedQuantity: nextReserved, availableQuantity: Math.round((nextOnHand - nextReserved) * 1000) / 1000 };
  });
  const status = input.finalFulfillment ? "fulfilled" : salesOrder.status;
  if (input.finalFulfillment) await db.update(erpOperationalRecords).set({ status, updatedAt: new Date() }).where(eq(erpOperationalRecords.id, salesOrder.id));
  await createAuditEvent({ ventureId: input.ventureId, domain: "sales", operationalRecordId: salesOrder.id, eventType: "sales_order.inventory_fulfilled", actorUserId: input.actorUserId, payload: { itemMasterId: input.itemMasterId, quantity, releaseMovementId: outcome.releaseMovementId, issueMovementId: outcome.issueMovementId, finalFulfillment: Boolean(input.finalFulfillment), resultingStatus: status, noExternalShipmentOrBilling: true } });
  return { salesOrderRecordId: salesOrder.id, quantity, status, finalFulfillment: Boolean(input.finalFulfillment), ...outcome };
}

export async function createWorkflowDefinition(input: { ventureId: number; key: string; name: string; domain: string; definition: { nodes: Array<{ id: string; type: "start" | "task" | "approval" | "gateway" | "end"; title: string }>; transitions: Array<{ from: string; to: string; condition?: string }>; trigger?: WorkflowTrigger }; createdByUserId: number }) {
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
  const db = await requireDb();
  const [records, budgets, tasks, audits, inventoryBalances, invoiceSettlements, taxPolicies, employeeProfiles, compensationComponents, payrollCalendars, payrollRuns, projects, projectTasks, assets, maintenanceWorkOrders, serviceRequests, opportunities] = await Promise.all([
    listOperationalRecords({ ventureId }),
    listBudgetEnvelopes(ventureId),
    listWorkflowTasks(ventureId),
    listAuditEvents(ventureId),
    listInventoryBalances(ventureId),
    listInvoiceSettlements(ventureId),
    db.select().from(erpTaxPolicies).where(eq(erpTaxPolicies.ventureId, ventureId)),
    db.select().from(erpEmployeeProfiles).where(eq(erpEmployeeProfiles.ventureId, ventureId)),
    db.select().from(erpCompensationComponents).where(eq(erpCompensationComponents.ventureId, ventureId)),
    db.select().from(erpPayrollCalendars).where(eq(erpPayrollCalendars.ventureId, ventureId)),
    db.select().from(erpPayrollRuns).where(eq(erpPayrollRuns.ventureId, ventureId)),
    db.select().from(erpProjects).where(eq(erpProjects.ventureId, ventureId)),
    db.select().from(erpProjectTasks).where(eq(erpProjectTasks.ventureId, ventureId)),
    db.select().from(erpAssets).where(eq(erpAssets.ventureId, ventureId)),
    db.select().from(erpMaintenanceWorkOrders).where(eq(erpMaintenanceWorkOrders.ventureId, ventureId)),
    db.select().from(erpServiceRequests).where(eq(erpServiceRequests.ventureId, ventureId)),
    db.select().from(erpCrmOpportunities).where(eq(erpCrmOpportunities.ventureId, ventureId)),
  ]);
  const byDomain = records.reduce<Record<string, { count: number; total: number; pending: number }>>((result, record) => {
    const entry = result[record.domain] ?? { count: 0, total: 0, pending: 0 };
    entry.count += 1; entry.total += Number(record.totalAmount); if (record.status === "pending_approval") entry.pending += 1; result[record.domain] = entry; return result;
  }, {});
  return {
    byDomain,
    openTasks: tasks.filter(task => task.status === "pending").length,
    budgetUtilization: budgets.map(budget => ({ id: budget.id, code: budget.code, name: budget.name, amount: Number(budget.amount), committed: Number(budget.committedAmount), spent: Number(budget.spentAmount), remaining: Number(budget.amount) - Number(budget.committedAmount) - Number(budget.spentAmount), status: budget.status })),
    finance: {
      receivableOpen: invoiceSettlements.filter(item => item.invoice.recordType === "receivable_invoice").reduce((total, item) => total + item.openAmount, 0),
      payableOpen: invoiceSettlements.filter(item => item.invoice.recordType === "payable_invoice").reduce((total, item) => total + item.openAmount, 0),
      postedInternalPaymentEvidence: records.filter(record => record.recordType === "payment_record" && ["posted", "fulfilled", "closed"].includes(record.status)).length,
    },
    inventory: {
      trackedItems: inventoryBalances.length,
      onHandQuantity: inventoryBalances.reduce((total, item) => total + Number(item.onHandQuantity), 0),
      reservedQuantity: inventoryBalances.reduce((total, item) => total + Number(item.reservedQuantity), 0),
      availableQuantity: inventoryBalances.reduce((total, item) => total + item.availableQuantity, 0),
    },
    procurement: {
      openPurchaseOrders: records.filter(record => record.domain === "procurement" && record.recordType === "purchase_order" && !["fulfilled", "closed", "cancelled"].includes(record.status)).length,
      fulfilledPurchaseOrders: records.filter(record => record.domain === "procurement" && record.recordType === "purchase_order" && record.status === "fulfilled").length,
    },
    taxBudget: {
      activeTaxPolicies: taxPolicies.filter(policy => policy.status === "active").length,
      draftTaxPolicies: taxPolicies.filter(policy => policy.status === "draft").length,
      activeBudgets: budgets.filter(budget => budget.status === "active").length,
      committedBudgetAmount: budgets.reduce((total, budget) => total + Number(budget.committedAmount), 0),
      spentBudgetAmount: budgets.reduce((total, budget) => total + Number(budget.spentAmount), 0),
    },
    peoplePayroll: {
      activeEmployees: employeeProfiles.filter(profile => profile.status === "active").length,
      activeCompensationComponents: compensationComponents.filter(component => component.status === "active").length,
      payrollCalendars: payrollCalendars.length,
      payrollRuns: payrollRuns.length,
      reviewablePayrollRuns: payrollRuns.filter(run => ["draft", "review", "approved"].includes(run.status)).length,
    },
    delivery: {
      activeProjects: projects.filter(project => project.status === "active").length,
      activeTasks: projectTasks.filter(task => ["ready", "in_progress", "blocked"].includes(task.status)).length,
      blockedTasks: projectTasks.filter(task => task.status === "blocked").length,
    },
    assetsService: {
      inServiceAssets: assets.filter(asset => asset.status === "in_service").length,
      activeMaintenance: maintenanceWorkOrders.filter(workOrder => ["scheduled", "in_progress"].includes(workOrder.status)).length,
      openServiceRequests: serviceRequests.filter(request => !["resolved", "closed", "cancelled"].includes(request.status)).length,
      activeOpportunities: opportunities.filter(opportunity => ["qualified", "proposal", "negotiation"].includes(opportunity.stage)).length,
    },
    portfolio: {
      operationalRecords: records.length,
      auditedEvents: audits.length,
      controlledDomains: new Set([...records.map(record => record.domain), ...(employeeProfiles.length ? ["people"] : []), ...(projects.length ? ["projects"] : []), ...(assets.length ? ["assets"] : []), ...(serviceRequests.length ? ["service"] : []), ...(opportunities.length ? ["crm"] : [])]).size,
    },
    work: Object.fromEntries(["people", "projects", "assets", "service", "crm"].map(domain => [domain, records.filter(record => record.domain === domain && !["closed", "cancelled"].includes(record.status)).length])),
    latestAuditEvents: audits.slice(0, 12),
  };
}

export async function getAccessiblePortfolioDashboard(ventures: Array<{ id: number; name: string; role: string }>) {
  const perVenture = await Promise.all(ventures.map(async venture => {
    const dashboard = await getOperationalDashboard(venture.id);
    return {
      ventureId: venture.id,
      ventureName: venture.name,
      role: venture.role,
      operationalRecords: dashboard.portfolio.operationalRecords,
      auditedEvents: dashboard.portfolio.auditedEvents,
      openWorkflowTasks: dashboard.openTasks,
      availableInventory: dashboard.inventory.availableQuantity,
      receivableOpen: dashboard.finance.receivableOpen,
      payableOpen: dashboard.finance.payableOpen,
      activeProjects: dashboard.delivery.activeProjects,
      inServiceAssets: dashboard.assetsService.inServiceAssets,
      openServiceRequests: dashboard.assetsService.openServiceRequests,
    };
  }));
  return {
    ventures: perVenture,
    totals: perVenture.reduce((total, venture) => ({
      accessibleVentures: total.accessibleVentures + 1,
      operationalRecords: total.operationalRecords + venture.operationalRecords,
      auditedEvents: total.auditedEvents + venture.auditedEvents,
      openWorkflowTasks: total.openWorkflowTasks + venture.openWorkflowTasks,
      activeProjects: total.activeProjects + venture.activeProjects,
      inServiceAssets: total.inServiceAssets + venture.inServiceAssets,
      openServiceRequests: total.openServiceRequests + venture.openServiceRequests,
    }), { accessibleVentures: 0, operationalRecords: 0, auditedEvents: 0, openWorkflowTasks: 0, activeProjects: 0, inServiceAssets: 0, openServiceRequests: 0 }),
  };
}

export async function listWorkflowTasks(ventureId: number) {
  const db = await requireDb();
  return db.select().from(erpWorkflowTasks).where(eq(erpWorkflowTasks.ventureId, ventureId)).orderBy(desc(erpWorkflowTasks.createdAt));
}

export async function listWorkflowInstances(ventureId: number) {
  const db = await requireDb();
  return db.select().from(erpWorkflowInstances).where(eq(erpWorkflowInstances.ventureId, ventureId)).orderBy(desc(erpWorkflowInstances.createdAt));
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
