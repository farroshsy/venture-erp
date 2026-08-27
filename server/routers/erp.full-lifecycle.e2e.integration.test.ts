import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { erpOperationalRecords, users, ventureMemberships } from "../../drizzle/schema";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db";
import { erpRouter } from "./erp";
import { intelligenceRouter } from "./intelligence";

const ventureId = 1;
const operatorOpenId = "validation_e2e_operator_20260824";
const financeReviewerOpenId = "validation_e2e_finance_reviewer_20260826";
const customerCode = "VALIDATION-E2E-CUSTOMER-20260824";
const itemCode = "VALIDATION-E2E-ITEM-20260824";
const orderNumber = "VALIDATION-E2E-SALES-ORDER-20260824";
let operatorUserId = 0;
let financeReviewerUserId = 0;

function callerFor(userId: number, openId: string) {
  return erpRouter.createCaller({ user: { id: userId, openId, email: `${openId}@example.invalid`, name: openId, loginMethod: "validation", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });
}
function intelligenceCallerFor(userId: number, openId: string) {
  return intelligenceRouter.createCaller({ user: { id: userId, openId, email: `${openId}@example.invalid`, name: openId, loginMethod: "validation", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });
}

beforeAll(async () => {
  const db = await getDb(); if (!db) throw new Error("Database is not available.");
  let [user] = await db.select().from(users).where(eq(users.openId, operatorOpenId)).limit(1);
  if (!user) { await db.insert(users).values({ openId: operatorOpenId, name: "VALIDATION E2E Operator", email: "validation-e2e-operator@example.invalid", loginMethod: "validation", role: "user" }); [user] = await db.select().from(users).where(eq(users.openId, operatorOpenId)).limit(1); }
  operatorUserId = user!.id;
  const [membership] = await db.select().from(ventureMemberships).where(and(eq(ventureMemberships.ventureId, ventureId), eq(ventureMemberships.userId, operatorUserId))).limit(1);
  if (!membership) await db.insert(ventureMemberships).values({ ventureId, userId: operatorUserId, role: "operator", status: "active" });
  let [reviewer] = await db.select().from(users).where(eq(users.openId, financeReviewerOpenId)).limit(1);
  if (!reviewer) { await db.insert(users).values({ openId: financeReviewerOpenId, name: "VALIDATION E2E Finance Reviewer", email: "validation-e2e-finance-reviewer@example.invalid", loginMethod: "validation", role: "user" }); [reviewer] = await db.select().from(users).where(eq(users.openId, financeReviewerOpenId)).limit(1); }
  financeReviewerUserId = reviewer!.id;
  const [reviewerMembership] = await db.select().from(ventureMemberships).where(and(eq(ventureMemberships.ventureId, ventureId), eq(ventureMemberships.userId, financeReviewerUserId))).limit(1);
  if (!reviewerMembership) await db.insert(ventureMemberships).values({ ventureId, userId: financeReviewerUserId, role: "finance_lead", status: "active" });
});

describe("typed-route sales lifecycle with real authorization", () => {
  it("lets an operator execute an internal sales lifecycle but forbids finance policy changes, while a portfolio admin completes the human task and all state is audited", async () => {
    const operator = callerFor(operatorUserId, operatorOpenId); const admin = callerFor(1, "owner");
    await expect(operator.currencyPolicy.setReportingCurrency({ ventureId, reportingCurrency: "USD" })).rejects.toThrow();
    const masters = await operator.master.list({ ventureId });
    let customer = masters.find(master => master.domain === "customer" && master.code === customerCode);
    if (!customer) customer = await operator.master.create({ ventureId, domain: "customer", code: customerCode, name: "VALIDATION-ONLY E2E customer", attributes: { validationOnly: true } });
    let item = masters.find(master => master.domain === "item" && master.code === itemCode);
    if (!item) item = await operator.master.create({ ventureId, domain: "item", code: itemCode, name: "VALIDATION-ONLY E2E item", attributes: { validationOnly: true } });
    let records = await operator.records.list({ ventureId });
    let order = records.find(record => record.recordNumber === orderNumber);
    if (!order) {
      const balances = await operator.inventory.balances({ ventureId });
      const balance = balances.find(row => row.itemMasterId === item!.id);
      if (!balance || Number(balance.onHandQuantity) < 2) await operator.inventory.recordMovement({ ventureId, itemMasterId: item!.id, movementType: "adjust_in", quantity: 2, narrative: "VALIDATION-ONLY E2E opening stock" });
      order = await operator.records.create({ ventureId, domain: "sales", recordType: "sales_order", recordNumber: orderNumber, title: "VALIDATION-ONLY E2E controlled sales order", counterpartyMasterId: customer!.id, amount: 1, effectiveDate: "2026-08-24", data: { validationOnly: true, noShipping: true, noBilling: true, noPayment: true } });
      await operator.records.transition({ ventureId, operationalRecordId: order.id, targetStatus: "pending_approval", note: "VALIDATION-ONLY E2E approval request" });
      await operator.records.transition({ ventureId, operationalRecordId: order.id, targetStatus: "approved", note: "VALIDATION-ONLY E2E approval" });
      await operator.sales.reserveInventory({ ventureId, salesOrderRecordId: order.id, itemMasterId: item!.id, quantity: 1, narrative: "VALIDATION-ONLY E2E reservation" });
      await operator.sales.fulfillInventory({ ventureId, salesOrderRecordId: order.id, itemMasterId: item!.id, quantity: 1, narrative: "VALIDATION-ONLY E2E internal fulfillment", finalFulfillment: true });
    }
    const instances = await admin.workflow.instances({ ventureId });
    const instance = instances.find(candidate => candidate.operationalRecordId === order!.id);
    const tasks = await admin.workflow.tasks({ ventureId });
    const pendingTask = tasks.find(task => task.workflowInstanceId === instance?.id && task.status === "pending");
    if (pendingTask) await admin.workflow.completeTask({ ventureId, workflowTaskId: pendingTask.id, outcome: "approved" });
    records = await admin.records.list({ ventureId }); const audits = await admin.audit({ ventureId }); const completedTasks = await admin.workflow.tasks({ ventureId });
    expect(records.find(record => record.id === order!.id)?.status).toBe("fulfilled");
    expect(completedTasks.some(task => task.workflowInstanceId === instance?.id && task.status === "approved")).toBe(true);
    expect(audits.some(event => event.operationalRecordId === order!.id && event.eventType === "record.transitioned")).toBe(true);
    expect(audits.some(event => event.operationalRecordId === order!.id && event.eventType === "sales_order.inventory_reserved")).toBe(true);
    expect(audits.some(event => event.operationalRecordId === order!.id && event.eventType === "sales_order.inventory_fulfilled")).toBe(true);
    expect(audits.some(event => event.eventType === "workflow.task_completed")).toBe(true);
  });

  it("captures explicitly supplied sales-fulfillment source facts on retained inventory issue evidence without revenue, COGS, journal, or external effects", async () => {
    const operator = callerFor(operatorUserId, operatorOpenId); const admin = callerFor(1, "owner");
    const customerCode = "VALIDATION-E2E-SALES-SOURCE-FACTS-CUSTOMER-20260826";
    const itemCode = "VALIDATION-E2E-SALES-SOURCE-FACTS-ITEM-20260826";
    const orderNumber = "VALIDATION-E2E-SALES-SOURCE-FACTS-ORDER-20260826";
    const sourceFacts = { internalFulfillmentReference: "VALIDATION-FUL-INT-20260826", warehouseCode: "WH-VALIDATION", costCenterCode: "CC-VALIDATION", projectCode: "PRJ-VALIDATION", customerDeliveryReference: "CUSTOMER-DELIVERY-VALIDATION", evidenceReference: "EVIDENCE-SALES-FULFILLMENT-VALIDATION" };
    let masters = await operator.master.list({ ventureId });
    let customer = masters.find(master => master.domain === "customer" && master.code === customerCode);
    if (!customer) customer = await operator.master.create({ ventureId, domain: "customer", code: customerCode, name: "VALIDATION-ONLY sales source-fact customer", attributes: { validationOnly: true, noExternalCustomerContact: true } });
    let item = masters.find(master => master.domain === "item" && master.code === itemCode);
    if (!item) item = await operator.master.create({ ventureId, domain: "item", code: itemCode, name: "VALIDATION-ONLY sales source-fact item", attributes: { validationOnly: true } });
    const balance = (await operator.inventory.balances({ ventureId })).find(candidate => candidate.itemMasterId === item!.id);
    if (!balance || Number(balance.onHandQuantity) < 1) await operator.inventory.recordMovement({ ventureId, itemMasterId: item.id, movementType: "adjust_in", quantity: 1, narrative: "VALIDATION-ONLY sales source-fact opening stock" });
    let order = (await operator.records.list({ ventureId })).find(record => record.recordNumber === orderNumber);
    if (!order) order = await operator.records.create({ ventureId, domain: "sales", recordType: "sales_order", recordNumber: orderNumber, title: "VALIDATION-ONLY sales fulfillment source facts", counterpartyMasterId: customer.id, amount: 1, effectiveDate: "2026-08-26", data: { validationOnly: true, noShipping: true, noBilling: true, noPayment: true, noRevenueRecognition: true, noCogsOrValuation: true } });
    if (order.status === "draft") await operator.records.transition({ ventureId, operationalRecordId: order.id, targetStatus: "pending_approval", note: "VALIDATION-ONLY sales source-fact approval request" });
    order = (await operator.records.list({ ventureId })).find(record => record.id === order!.id)!;
    if (order.status === "pending_approval") await operator.records.transition({ ventureId, operationalRecordId: order.id, targetStatus: "approved", note: "VALIDATION-ONLY sales source-fact approval" });
    const existingIssue = (await operator.inventory.movements({ ventureId, itemMasterId: item.id })).find(movement => movement.operationalRecordId === order!.id && movement.movementType === "issue");
    const journalCountBefore = (await admin.journal.list({ ventureId })).length;
    if (!existingIssue) {
      await operator.sales.reserveInventory({ ventureId, salesOrderRecordId: order.id, itemMasterId: item.id, quantity: 1, narrative: "VALIDATION-ONLY sales source-fact reservation" });
      await operator.sales.fulfillInventory({ ventureId, salesOrderRecordId: order.id, itemMasterId: item.id, quantity: 1, narrative: "VALIDATION-ONLY sales source-fact fulfillment", sourceFacts, finalFulfillment: true });
    }
    const issue = (await admin.inventory.movements({ ventureId, itemMasterId: item.id })).find(movement => movement.operationalRecordId === order!.id && movement.movementType === "issue")!;
    const audits = await admin.audit({ ventureId });
    expect(issue.sourceFacts).toEqual(sourceFacts);
    expect((await admin.records.list({ ventureId })).find(record => record.id === order!.id)?.status).toBe("fulfilled");
    expect(audits.some(event => event.operationalRecordId === order!.id && event.eventType === "sales_order.inventory_fulfilled" && (event.payload as { capturedSourceFactKeys?: string[]; noRevenueRecognition?: boolean; noCogsOrValuationCalculation?: boolean; noExternalEffect?: boolean }).capturedSourceFactKeys?.length === 6 && (event.payload as { noRevenueRecognition?: boolean }).noRevenueRecognition === true && (event.payload as { noCogsOrValuationCalculation?: boolean }).noCogsOrValuationCalculation === true && (event.payload as { noExternalEffect?: boolean }).noExternalEffect === true)).toBe(true);
    expect((await admin.journal.list({ ventureId })).length).toBe(journalCountBefore);
  }, 20_000);

  it("records receipt-backed payable three-way-match evidence, permits only a matched payable approval, and blocks a mismatched payable", async () => {
    const operator = callerFor(operatorUserId, operatorOpenId); const admin = callerFor(1, "owner");
    const supplierCode = "VALIDATION-E2E-THREE-WAY-SUPPLIER-20260825";
    const itemCode = "VALIDATION-E2E-THREE-WAY-ITEM-20260825";
    const purchaseOrderNumber = "VALIDATION-E2E-THREE-WAY-PO-20260825";
    const matchedInvoiceNumber = "VALIDATION-E2E-THREE-WAY-AP-20260825";
    const mismatchedInvoiceNumber = "VALIDATION-E2E-THREE-WAY-AP-MISMATCH-20260825";
    const masters = await operator.master.list({ ventureId });
    let supplier = masters.find(master => master.domain === "supplier" && master.code === supplierCode);
    if (!supplier) supplier = await operator.master.create({ ventureId, domain: "supplier", code: supplierCode, name: "VALIDATION-ONLY three-way-match supplier", attributes: { validationOnly: true, noExternalSupplierAction: true } });
    let item = masters.find(master => master.domain === "item" && master.code === itemCode);
    if (!item) item = await operator.master.create({ ventureId, domain: "item", code: itemCode, name: "VALIDATION-ONLY three-way-match item", attributes: { validationOnly: true } });
    let records = await operator.records.list({ ventureId });
    let purchaseOrder = records.find(record => record.recordNumber === purchaseOrderNumber);
    if (!purchaseOrder) {
      purchaseOrder = await operator.records.create({ ventureId, domain: "procurement", recordType: "purchase_order", recordNumber: purchaseOrderNumber, title: "VALIDATION-ONLY three-way-match purchase order", counterpartyMasterId: supplier.id, amount: 100, effectiveDate: "2026-08-25", data: { validationOnly: true, noSupplierPayment: true, noExternalProcurementAction: true } });
    }
    if (purchaseOrder.status === "draft") await operator.records.transition({ ventureId, operationalRecordId: purchaseOrder.id, targetStatus: "pending_approval", note: "VALIDATION-ONLY purchase order approval request for matching" });
    purchaseOrder = (await operator.records.list({ ventureId })).find(record => record.id === purchaseOrder!.id)!;
    if (purchaseOrder.status === "pending_approval") await operator.records.transition({ ventureId, operationalRecordId: purchaseOrder.id, targetStatus: "approved", note: "VALIDATION-ONLY approved purchase order for matching" });
    purchaseOrder = (await operator.records.list({ ventureId })).find(record => record.id === purchaseOrder!.id)!;
    const existingReceipt = (await operator.inventory.movements({ ventureId, itemMasterId: item.id })).some(movement => movement.operationalRecordId === purchaseOrder!.id && movement.movementType === "receipt");
    if (!existingReceipt) {
      await operator.inventory.receivePurchaseOrder({ ventureId, purchaseOrderRecordId: purchaseOrder.id, itemMasterId: item.id, quantity: 1, narrative: "VALIDATION-ONLY recorded receipt evidence", finalReceipt: true });
    }
    purchaseOrder = (await operator.records.list({ ventureId })).find(record => record.id === purchaseOrder!.id)!;
    let settlements = await admin.invoice.settlements({ ventureId });
    let matchedInvoice = settlements.find(item => item.invoice.recordNumber === matchedInvoiceNumber)?.invoice;
    if (!matchedInvoice) matchedInvoice = await operator.invoice.create({ ventureId, invoiceType: "payable_invoice", recordNumber: matchedInvoiceNumber, title: "VALIDATION-ONLY matched supplier payable", counterpartyMasterId: supplier.id, amount: 100, effectiveDate: "2026-08-25", data: { validationOnly: true, noExternalDisbursement: true } });
    if (matchedInvoice.status === "draft") await admin.records.transition({ ventureId, operationalRecordId: matchedInvoice.id, targetStatus: "pending_approval", note: "VALIDATION-ONLY payable approval request before matching" });
    if (matchedInvoice.status === "draft" || matchedInvoice.status === "pending_approval") await expect(admin.records.transition({ ventureId, operationalRecordId: matchedInvoice.id, targetStatus: "approved", note: "VALIDATION-ONLY attempt before three-way match" })).rejects.toThrow("three-way match");
    if (matchedInvoice.status === "draft" || matchedInvoice.status === "pending_approval") await admin.invoice.evaluateThreeWayMatch({ ventureId, payableInvoiceRecordId: matchedInvoice.id, purchaseOrderRecordId: purchaseOrder.id });
    records = await admin.records.list({ ventureId });
    const matchedAfterEvidence = records.find(record => record.id === matchedInvoice!.id)!;
    if (matchedAfterEvidence.status === "pending_approval") await admin.invoice.approveMatchedPayable({ ventureId, payableInvoiceRecordId: matchedAfterEvidence.id, note: "VALIDATION-ONLY approval after successful three-way match" });
    settlements = await admin.invoice.settlements({ ventureId });
    let mismatchedInvoice = settlements.find(item => item.invoice.recordNumber === mismatchedInvoiceNumber)?.invoice;
    if (!mismatchedInvoice) mismatchedInvoice = await operator.invoice.create({ ventureId, invoiceType: "payable_invoice", recordNumber: mismatchedInvoiceNumber, title: "VALIDATION-ONLY mismatched supplier payable", counterpartyMasterId: supplier.id, amount: 101, effectiveDate: "2026-08-25", data: { validationOnly: true, noExternalDisbursement: true } });
    if (mismatchedInvoice.status === "draft" || mismatchedInvoice.status === "pending_approval") await admin.invoice.evaluateThreeWayMatch({ ventureId, payableInvoiceRecordId: mismatchedInvoice.id, purchaseOrderRecordId: purchaseOrder.id });
    records = await admin.records.list({ ventureId });
    const mismatchedAfterEvidence = records.find(record => record.id === mismatchedInvoice!.id)!;
    expect((matchedAfterEvidence.data as { threeWayMatch?: { status?: string; receiptCount?: number; noPaymentExecution?: boolean } }).threeWayMatch).toMatchObject({ status: "matched", receiptCount: 1, noPaymentExecution: true });
    expect(records.find(record => record.id === matchedInvoice!.id)?.status).toBe("approved");
    expect((mismatchedAfterEvidence.data as { threeWayMatch?: { status?: string; reasonCodes?: string[]; noPaymentExecution?: boolean } }).threeWayMatch).toMatchObject({ status: "mismatch", reasonCodes: ["invoice_exceeds_purchase_order"], noPaymentExecution: true });
    if (mismatchedAfterEvidence.status === "draft") await admin.records.transition({ ventureId, operationalRecordId: mismatchedAfterEvidence.id, targetStatus: "pending_approval", note: "VALIDATION-ONLY payable mismatch approval request" });
    const mismatchedForApproval = (await admin.records.list({ ventureId })).find(record => record.id === mismatchedInvoice!.id)!;
    if (mismatchedForApproval.status === "pending_approval") await expect(admin.invoice.approveMatchedPayable({ ventureId, payableInvoiceRecordId: mismatchedForApproval.id, note: "VALIDATION-ONLY blocked mismatch approval" })).rejects.toThrow("three-way match");
    const audits = await admin.audit({ ventureId });
    expect(audits.some(event => event.operationalRecordId === matchedInvoice!.id && event.eventType === "payable_invoice.three_way_match_evaluated")).toBe(true);
    expect(audits.some(event => event.operationalRecordId === mismatchedInvoice!.id && event.eventType === "payable_invoice.three_way_match_evaluated")).toBe(true);
  }, 20_000);

  it("emits an immutable internal procurement-receipt event and generates a finance-reviewed journal proposal without creating a journal", async () => {
    const operator = callerFor(operatorUserId, operatorOpenId); const admin = callerFor(1, "owner");
    const suffix = "20260825";
    const supplierCode = `VALIDATION-E2E-ACCOUNTING-SUPPLIER-${suffix}`;
    const itemCode = `VALIDATION-E2E-ACCOUNTING-ITEM-${suffix}`;
    const debitAccountCode = `VALIDATION-E2E-ACCOUNTING-DEBIT-${suffix}`;
    const creditAccountCode = `VALIDATION-E2E-ACCOUNTING-CREDIT-${suffix}`;
    const periodCode = `VALIDATION-E2E-ACCOUNTING-PERIOD-${suffix}`;
    const purchaseOrderNumber = `VALIDATION-E2E-ACCOUNTING-PO-${suffix}`;
    let masters = await operator.master.list({ ventureId });
    let supplier = masters.find(master => master.domain === "supplier" && master.code === supplierCode);
    if (!supplier) supplier = await operator.master.create({ ventureId, domain: "supplier", code: supplierCode, name: "VALIDATION-ONLY accounting-control supplier", attributes: { validationOnly: true, noExternalSupplierAction: true } });
    let item = masters.find(master => master.domain === "item" && master.code === itemCode);
    if (!item) item = await operator.master.create({ ventureId, domain: "item", code: itemCode, name: "VALIDATION-ONLY accounting-control item", attributes: { validationOnly: true } });
    masters = await operator.master.list({ ventureId });
    let debitAccount = masters.find(master => master.domain === "account" && master.code === debitAccountCode);
    if (!debitAccount) debitAccount = await operator.master.create({ ventureId, domain: "account", code: debitAccountCode, name: "VALIDATION-ONLY inventory receipt debit", attributes: { validationOnly: true } });
    let creditAccount = masters.find(master => master.domain === "account" && master.code === creditAccountCode);
    if (!creditAccount) creditAccount = await operator.master.create({ ventureId, domain: "account", code: creditAccountCode, name: "VALIDATION-ONLY receipt clearing credit", attributes: { validationOnly: true } });
    let period = (await operator.period.list({ ventureId })).find(item => item.code === periodCode);
    if (!period) period = await operator.period.create({ ventureId, code: periodCode, name: "VALIDATION-ONLY accounting control period", startDate: "2026-08-01", endDate: "2026-08-31" });
    const controlBefore = await admin.accountingControl.overview({ ventureId });
    let rule = controlBefore.rules.find(item => item.ruleCode === "VALIDATION-E2E-PROC-RECEIPT");
    if (!rule) await admin.accountingControl.createPostingRuleRevision({ ventureId, ruleCode: "VALIDATION-E2E-PROC-RECEIPT", ruleName: "VALIDATION-ONLY procurement receipt proposal", eventType: "procurement_receipt", effectiveFrom: "2026-08-01", debitAccountMasterId: debitAccount.id, creditAccountMasterId: creditAccount.id, changeRationale: "VALIDATION-ONLY internal proposal mapping" });
    rule = (await admin.accountingControl.overview({ ventureId })).rules.find(item => item.ruleCode === "VALIDATION-E2E-PROC-RECEIPT")!;
    if (rule.status !== "approved") await admin.accountingControl.approvePostingRuleRevision({ ventureId, postingRuleRevisionId: rule.id });
    let purchaseOrder = (await operator.records.list({ ventureId })).find(record => record.recordNumber === purchaseOrderNumber);
    if (!purchaseOrder) purchaseOrder = await operator.records.create({ ventureId, domain: "procurement", recordType: "purchase_order", recordNumber: purchaseOrderNumber, title: "VALIDATION-ONLY accounting-control purchase order", counterpartyMasterId: supplier.id, accountingPeriodId: period.id, amount: 125, effectiveDate: "2026-08-25", data: { validationOnly: true, noSupplierPayment: true, noExternalProcurementAction: true } });
    if (purchaseOrder.status === "draft") await operator.records.transition({ ventureId, operationalRecordId: purchaseOrder.id, targetStatus: "pending_approval", note: "VALIDATION-ONLY accounting-control approval request" });
    purchaseOrder = (await operator.records.list({ ventureId })).find(record => record.id === purchaseOrder!.id)!;
    if (purchaseOrder.status === "pending_approval") await operator.records.transition({ ventureId, operationalRecordId: purchaseOrder.id, targetStatus: "approved", note: "VALIDATION-ONLY accounting-control approved purchase order" });
    const receiptExists = (await operator.inventory.movements({ ventureId, itemMasterId: item.id })).some(movement => movement.operationalRecordId === purchaseOrder!.id && movement.movementType === "receipt");
    const journalCountBefore = (await admin.journal.list({ ventureId })).length;
    if (!receiptExists) await operator.inventory.receivePurchaseOrder({ ventureId, purchaseOrderRecordId: purchaseOrder.id, itemMasterId: item.id, quantity: 1, narrative: "VALIDATION-ONLY accounting-control final receipt", finalReceipt: true });
    const controlAfterReceipt = await admin.accountingControl.overview({ ventureId });
    const event = controlAfterReceipt.events.find(item => item.sourceOperationalRecordId === purchaseOrder!.id)!;
    let proposal = controlAfterReceipt.proposals.find(item => item.accountingEventId === event.id && item.postingRuleRevisionId === rule!.id);
    if (!proposal) await admin.accountingControl.evaluateEvent({ ventureId, accountingEventId: event.id });
    proposal = (await admin.accountingControl.overview({ ventureId })).proposals.find(item => item.accountingEventId === event.id && item.postingRuleRevisionId === rule!.id)!;
    expect(["pending_review", "approved"]).toContain(proposal.status);
    expect(proposal.proposalSnapshot).toMatchObject({ accountingEventId: event.id, ruleCode: "VALIDATION-E2E-PROC-RECEIPT", noJournalCreated: true, noAutomaticPosting: true, noExternalEffect: true, lines: expect.arrayContaining([expect.objectContaining({ entrySide: "debit", amount: 125 }), expect.objectContaining({ entrySide: "credit", amount: 125 })]) });
    if (proposal.status === "pending_review") await admin.accountingControl.reviewProposal({ ventureId, journalProposalId: proposal.id, decision: "approved", note: "VALIDATION-ONLY finance review; retain as proposal only." });
    const calculationEvidence = await admin.accountingControl.createCalculationEvidence({ ventureId, accountingEventId: event.id, postingRuleRevisionId: rule.id, rationale: "VALIDATION-E2E immutable procurement-receipt calculation evidence; no journal creation or posting." });
    const refusedCalculationEvidence = await admin.accountingControl.createCalculationEvidence({ ventureId, accountingEventId: event.id, postingRuleRevisionId: rule.id + 99_999, rationale: "VALIDATION-E2E refused calculation evidence for an unavailable rule; no journal creation or posting." });
    const retainedEvidence = await admin.accountingControl.calculationEvidence({ ventureId });
    const chainVerification = await admin.accountingControl.verifyCalculationEvidenceChain({ ventureId });
    const controlledReport = await admin.financeReporting.controlledEvidence({ ventureId, accountingPeriodId: period.id });
    expect(calculationEvidence).toMatchObject({ status: "completed" });
    expect(refusedCalculationEvidence).toMatchObject({ status: "refused" });
    expect(retainedEvidence.some(item => item.accountingEventId === event.id && item.recordHash.length === 64 && item.inputHash.length === 64 && item.outputHash.length === 64)).toBe(true);
    const refusedRecord = retainedEvidence.find(item => item.status === "refused" && item.accountingEventId === event.id)!;
    const alteredExpectedInputHash = createHash("sha256").update(JSON.stringify({ accountingEventId: refusedRecord.inputSnapshot.accountingEventId, frozenDimensions: refusedRecord.inputSnapshot.frozenDimensions, postingRuleRevisionId: refusedRecord.inputSnapshot.postingRuleRevisionId, rationale: "DELIBERATELY ALTERED INPUT" })).digest("hex");
    expect(alteredExpectedInputHash).not.toBe(refusedRecord.inputHash);
    expect(chainVerification).toMatchObject({ valid: true, noJournalCreated: true, noAutomaticPosting: true, noExternalEffect: true });
    expect(chainVerification.checks.some(check => check.independentInvariantValid && check.inputHashValid && check.outputHashValid && check.recordHashValid)).toBe(true);
    expect(controlledReport).toMatchObject({ source: "immutable_calculation_evidence", reportMode: "evidence_activity_not_posted_gl", chainVerification: { valid: true }, boundary: { noJournalCreated: true, noAutomaticPosting: true, noBalanceMutation: true, noExternalEffect: true } });
    expect(controlledReport.current.trialBalanceActivity.some(item => item.accountMasterId === debitAccount.id && item.currency === "USD" && item.debit >= 125 && item.evidenceIds.includes(calculationEvidence.id))).toBe(true);
    expect(controlledReport.current.generalLedgerActivity.some(item => item.evidenceId === calculationEvidence.id && item.accountingEventId === event.id && item.sourceOperationalRecordId === purchaseOrder!.id && item.postingRuleRevisionId === rule!.id)).toBe(true);
    expect(controlledReport.excludedEvidence.some(item => item.evidenceId === refusedCalculationEvidence.id && item.reasons.includes("evidence_not_completed"))).toBe(true);
    expect((await admin.journal.list({ ventureId })).length).toBe(journalCountBefore);
    const audits = await admin.audit({ ventureId });
    expect(audits.some(item => item.eventType === "accounting_event.procurement_receipt_emitted" && item.operationalRecordId === purchaseOrder!.id)).toBe(true);
    expect(audits.some(item => item.eventType === "journal_proposal.approved" && (item.payload as { noJournalCreated?: boolean }).noJournalCreated === true)).toBe(true);
    expect(audits.some(item => item.eventType === "ledger_calculation_evidence.created" && (item.payload as { noJournalCreated?: boolean; noExternalEffect?: boolean }).noJournalCreated === true && (item.payload as { noExternalEffect?: boolean }).noExternalEffect === true)).toBe(true);
  }, 20_000);

  it("creates governed inventory cost-layer, landed-cost, and valuation-preview evidence without posting, balance mutation, COGS, tax, payroll, payment, or external effects", async () => {
    const operator = callerFor(operatorUserId, operatorOpenId); const admin = callerFor(1, "owner"); const suffix = "20260826";
    const supplierCode = `VALIDATION-E2E-COST-SUPPLIER-${suffix}`; const itemCode = `VALIDATION-E2E-COST-ITEM-${suffix}`; const periodCode = `VALIDATION-E2E-COST-PERIOD-${suffix}`; const purchaseOrderNumber = `VALIDATION-E2E-COST-PO-${suffix}-MEASURE-V2`; const policyCode = `VALIDATION-E2E-COST-POLICY-${suffix}-V5`;
    let masters = await operator.master.list({ ventureId }); let supplier = masters.find(master => master.domain === "supplier" && master.code === supplierCode); if (!supplier) supplier = await operator.master.create({ ventureId, domain: "supplier", code: supplierCode, name: "VALIDATION-ONLY Costing Engine supplier", attributes: { validationOnly: true, noExternalSupplierAction: true } });
    let item = masters.find(master => master.domain === "item" && master.code === itemCode); if (!item) item = await operator.master.create({ ventureId, domain: "item", code: itemCode, name: "VALIDATION-ONLY Costing Engine item", attributes: { validationOnly: true } });
    let period = (await operator.period.list({ ventureId })).find(row => row.code === periodCode); if (!period) period = await operator.period.create({ ventureId, code: periodCode, name: "VALIDATION-ONLY Costing Engine period", startDate: "2026-08-01", endDate: "2026-08-31" });
    let policy = (await admin.costing.overview({ ventureId })).policies.find(row => row.policyCode === policyCode); if (!policy) await admin.costing.createPolicyRevision({ ventureId, policyCode, policyName: "VALIDATION-ONLY FIFO inventory policy", costDomain: "inventory", valuationMethod: "fifo", effectiveFrom: "2026-08-01", policyConfiguration: { engine: "validation_only" }, sourceRequirements: { receiptMovement: true, explicitSourceFacts: true }, rationale: "VALIDATION-ONLY immutable Costing Engine policy" });
    policy = (await admin.costing.overview({ ventureId })).policies.find(row => row.policyCode === policyCode)!; if (policy.status !== "approved") await admin.costing.approvePolicyRevision({ ventureId, costingPolicyRevisionId: policy.id });
    let purchaseOrder = (await operator.records.list({ ventureId })).find(record => record.recordNumber === purchaseOrderNumber); if (!purchaseOrder) purchaseOrder = await operator.records.create({ ventureId, domain: "procurement", recordType: "purchase_order", recordNumber: purchaseOrderNumber, title: "VALIDATION-ONLY Costing Engine purchase order", counterpartyMasterId: supplier.id, accountingPeriodId: period.id, amount: 120, effectiveDate: "2026-08-26", data: { validationOnly: true, noSupplierPayment: true, noExternalProcurementAction: true } });
    if (purchaseOrder.status === "draft") await operator.records.transition({ ventureId, operationalRecordId: purchaseOrder.id, targetStatus: "pending_approval", note: "VALIDATION-ONLY Costing Engine approval" }); purchaseOrder = (await operator.records.list({ ventureId })).find(record => record.id === purchaseOrder!.id)!; if (purchaseOrder.status === "pending_approval") await operator.records.transition({ ventureId, operationalRecordId: purchaseOrder.id, targetStatus: "approved", note: "VALIDATION-ONLY Costing Engine approved" });
    let receipt = (await operator.inventory.movements({ ventureId, itemMasterId: item.id })).find(movement => movement.operationalRecordId === purchaseOrder!.id && movement.movementType === "receipt"); if (!receipt) await operator.inventory.receivePurchaseOrder({ ventureId, purchaseOrderRecordId: purchaseOrder.id, itemMasterId: item.id, quantity: 2, narrative: "VALIDATION-ONLY Costing Engine receipt", sourceFacts: { internalReceiptReference: "COST-GRN-20260826", warehouseCode: "WH-COST", costCenterCode: "CC-COST", profitCenterCode: "PC-COST", internalOrderCode: "IO-COST", projectCode: "PROJECT-COST", evidenceReference: "COST-EVIDENCE-20260826", weight: 125.5, weightUnit: "kg", volume: 1.25, volumeUnit: "m3" }, finalReceipt: false }); receipt = (await operator.inventory.movements({ ventureId, itemMasterId: item.id })).find(movement => movement.operationalRecordId === purchaseOrder!.id && movement.movementType === "receipt")!;
    const journalCountBefore = (await admin.journal.list({ ventureId })).length; let layer = (await admin.costing.overview({ ventureId })).layers.find(row => row.sourceInventoryMovementId === receipt!.id && row.costingPolicyRevisionId === policy!.id); if (!layer) await admin.costing.createReceiptLayer({ ventureId, sourceInventoryMovementId: receipt.id, costingPolicyRevisionId: policy.id, costingDate: "2026-08-26", originalValue: 120, currency: "USD", sourceEvidence: { internalBasis: "VALIDATION-ONLY cost layer" } });
    layer = (await admin.costing.overview({ ventureId })).layers.find(row => row.sourceInventoryMovementId === receipt!.id && row.costingPolicyRevisionId === policy!.id)!;
    const allocation = await admin.costing.allocateLandedCost({ ventureId, costingPolicyRevisionId: policy.id, costingDate: "2026-08-26", landedCostCategory: "freight", allocationDriver: "quantity", totalAmount: 12, currency: "USD", targetCostLayerIds: [layer.id], rationale: "VALIDATION-ONLY deterministic landed-cost allocation" });
    const weightAllocation = await admin.costing.allocateLandedCost({ ventureId, costingPolicyRevisionId: policy.id, costingDate: "2026-08-26", landedCostCategory: "handling", allocationDriver: "weight", totalAmount: 5, currency: "USD", targetCostLayerIds: [layer.id], rationale: "VALIDATION-ONLY explicit-weight allocation" });
    const volumeAllocation = await admin.costing.allocateLandedCost({ ventureId, costingPolicyRevisionId: policy.id, costingDate: "2026-08-26", landedCostCategory: "insurance", allocationDriver: "volume", totalAmount: 4, currency: "USD", targetCostLayerIds: [layer.id], rationale: "VALIDATION-ONLY explicit-volume allocation" });
    const preview = await admin.costing.previewValuation({ ventureId, itemMasterId: item.id, costingPolicyRevisionId: policy.id, costingDate: "2026-08-26", issueQuantity: 1, rationale: "VALIDATION-ONLY read-only FIFO valuation preview" }); const repeatedPreview = await admin.costing.previewValuation({ ventureId, itemMasterId: item.id, costingPolicyRevisionId: policy.id, costingDate: "2026-08-26", issueQuantity: 1, rationale: "VALIDATION-ONLY read-only FIFO valuation preview" });
    const standardPolicyCode = `VALIDATION-E2E-COST-POLICY-${suffix}-V7-STANDARD-REFUSAL`; let standardPolicy = (await admin.costing.overview({ ventureId })).policies.find(row => row.policyCode === standardPolicyCode); if (!standardPolicy) await admin.costing.createPolicyRevision({ ventureId, policyCode: standardPolicyCode, policyName: "VALIDATION-ONLY standard-cost refusal policy", costDomain: "inventory", valuationMethod: "standard_cost", effectiveFrom: "2026-08-01", policyConfiguration: { engine: "validation_only" }, sourceRequirements: { canonicalStandardCostEvidence: true }, rationale: "VALIDATION-ONLY standard-cost foundation refusal" }); standardPolicy = (await admin.costing.overview({ ventureId })).policies.find(row => row.policyCode === standardPolicyCode)!; if (standardPolicy.status !== "approved") await admin.costing.approvePolicyRevision({ ventureId, costingPolicyRevisionId: standardPolicy.id }); let standardLayer = (await admin.costing.overview({ ventureId })).layers.find(row => row.sourceInventoryMovementId === receipt!.id && row.costingPolicyRevisionId === standardPolicy!.id); if (!standardLayer) await admin.costing.createReceiptLayer({ ventureId, sourceInventoryMovementId: receipt.id, costingPolicyRevisionId: standardPolicy.id, costingDate: "2026-08-26", originalValue: 120, currency: "USD", sourceEvidence: { internalBasis: "VALIDATION-ONLY standard-cost refusal layer" } }); standardLayer = (await admin.costing.overview({ ventureId })).layers.find(row => row.sourceInventoryMovementId === receipt!.id && row.costingPolicyRevisionId === standardPolicy!.id)!; const standardPreview = await admin.costing.previewValuation({ ventureId, itemMasterId: item.id, costingPolicyRevisionId: standardPolicy.id, costingDate: "2026-08-26", issueQuantity: 1, rationale: "VALIDATION-ONLY standard-cost preview refusal" });
    const reviewer = callerFor(financeReviewerUserId, financeReviewerOpenId); const correctionKey = `VALIDATION-E2E-COST-CORRECTION-${suffix}`; let correctionRequest = (await admin.costing.correctionControl({ ventureId })).requests.find(request => request.requestKey === correctionKey); if (!correctionRequest) await admin.costing.createCorrectionRequest({ ventureId, requestKey: correctionKey, originalCostingCalculationEvidenceId: preview.id, originalRecordHash: preview.recordHash, originalCostLayerId: layer.id, originalSourceHash: layer.sourceHash, correctionEvidenceReference: "VALIDATION-ONLY immutable remediation evidence reference", rationale: "VALIDATION-ONLY evidence-only correction assertion; no replacement value or reprocessing request." }); correctionRequest = (await admin.costing.correctionControl({ ventureId })).requests.find(request => request.requestKey === correctionKey)!; if (!correctionRequest.reviews.length) { await expect(admin.costing.reviewCorrectionRequest({ ventureId, correctionRequestId: correctionRequest.id, decision: "blocked", reviewNote: "VALIDATION-ONLY requester must not self-review correction evidence." })).rejects.toThrow("distinct from the requesting user"); await reviewer.costing.reviewCorrectionRequest({ ventureId, correctionRequestId: correctionRequest.id, decision: "blocked", reviewNote: "VALIDATION-ONLY independent finance review: blocked pending separately authorized correction/reprocessing policy and successor evidence contract." }); } const correctionControl = await admin.costing.correctionControl({ ventureId }); const validation = await admin.costing.validationReport({ ventureId, costingPolicyRevisionId: policy.id }); const costing = await admin.costing.overview({ ventureId }); const canonicalProjection = await admin.canonicalFinancialObjects.projection({ ventureId }); const semanticReadiness = await admin.semanticReadiness.register({ ventureId }); const audits = await admin.audit({ ventureId });
    expect(layer).toMatchObject({ layerType: "receipt", quantity: "2.000", remainingQuantity: "2.000", originalValue: "120.00", remainingValue: "120.00", currency: "USD", sourceSnapshot: expect.objectContaining({ sourceFacts: expect.objectContaining({ weight: 125.5, weightUnit: "kg", volume: 1.25, volumeUnit: "m3" }) }), attributionSnapshot: expect.objectContaining({ costCenterCode: "CC-COST", profitCenterCode: "PC-COST", internalOrderCode: "IO-COST", noInference: true }) });
    expect(allocation).toMatchObject({ status: "completed" }); expect(weightAllocation).toMatchObject({ status: "completed" }); expect(volumeAllocation).toMatchObject({ status: "completed" }); expect(preview).toMatchObject({ status: "completed" }); expect(repeatedPreview).toMatchObject({ id: preview.id, calculationKey: preview.calculationKey, recordHash: preview.recordHash, status: "completed" }); expect(standardLayer).toMatchObject({ remainingQuantity: "2.000", remainingValue: "120.00" }); expect(standardPreview).toMatchObject({ status: "refused" }); expect(validation).toMatchObject({ valid: true, boundary: { readOnlyValidation: true, noJournalCreated: true, noAutomaticPosting: true, noBalanceMutation: true, noExternalEffect: true } });
    expect(costing.evidence.some(record => record.id === allocation.id && record.calculationType === "landed_cost_allocation" && record.status === "completed")).toBe(true); expect(costing.evidence.some(record => record.id === weightAllocation.id && record.calculationType === "landed_cost_allocation" && record.status === "completed")).toBe(true); expect(costing.evidence.some(record => record.id === volumeAllocation.id && record.calculationType === "landed_cost_allocation" && record.status === "completed")).toBe(true); const previewEvidence = costing.evidence.find(record => record.id === preview.id && record.calculationType === "valuation_preview" && record.status === "completed"); const standardPreviewEvidence = costing.evidence.find(record => record.id === standardPreview.id && record.calculationType === "valuation_preview" && record.status === "refused"); expect(previewEvidence).toBeDefined(); expect(standardPreviewEvidence?.calculationSnapshot).toMatchObject({ refusalReasons: [expect.stringContaining("standard_cost preview requires separately governed canonical standard-cost")] }); expect(previewEvidence?.inputSnapshot).toMatchObject({ calculationVersion: "inventory-valuation-preview-1.1", eligibleLayerEvidence: [expect.objectContaining({ id: layer.id, sourceInventoryMovementId: receipt.id, sourceHash: layer.sourceHash, remainingQuantity: 2, remainingValue: 120, currency: "USD" })] }); expect(previewEvidence?.calculationSnapshot).toMatchObject({ result: expect.objectContaining({ valuationRunId: preview.calculationKey, calculationVersion: "inventory-valuation-preview-1.1", policyMethod: "fifo", sourceLayerEvidence: [expect.objectContaining({ costLayerId: layer.id, sourceHash: layer.sourceHash, remainingQuantity: 2, remainingValue: 120, currency: "USD" })], lines: [expect.objectContaining({ costLayerId: layer.id, consumedQuantity: 1, unitCost: 60, value: 60, remainingQuantity: 1, remainingValue: 60, unitCostDerivation: expect.objectContaining({ numeratorRemainingValue: 120, denominatorRemainingQuantity: 2, roundedUnitCost: 60 }), roundingEvidence: expect.objectContaining({ moneyScale: 2, deterministicResidual: 0 }) })], roundingEvidence: expect.objectContaining({ quantityScale: 3, moneyScale: 2, deterministicResidual: 0 }), invariantVerification: expect.objectContaining({ inventoryQuantityConservation: true, layerIntegrity: true, costConservation: true, valuationReproducibility: true, currencyConsistency: true, deterministicResidualHandling: true, unitOfMeasureCompatibility: "not_modeled_in_receipt_quantity_evidence" }) }), refusalReasons: [] });
    expect(canonicalProjection).toMatchObject({ model: { name: "Canonical Financial Object Model", version: "0.2-read-projection", posture: "bounded_internal_vocabulary_not_an_external_standard_claim" }, boundary: { readOnlyProjection: true, noSourceRewrite: true, noJournalCreated: true, noAutomaticPosting: true, noBalanceMutation: true, noExternalEffect: true } }); expect(canonicalProjection.objects.find(object => object.canonicalId === `CostLayer:${layer.id}`)).toMatchObject({ canonicalType: "cost_layer", sourceEntity: "erp_cost_layers", sourceId: layer.id, currency: "USD", traceability: expect.objectContaining({ sourceInventoryMovementId: receipt.id, sourceHash: layer.sourceHash, remainingQuantity: 2, remainingValue: 120 }) }); expect(canonicalProjection.objects.find(object => object.canonicalId === `CostingCalculationEvidence:${preview.id}`)).toMatchObject({ canonicalType: "calculation_evidence", sourceEntity: "erp_costing_calculation_evidence", sourceId: preview.id, status: "completed", traceability: expect.objectContaining({ evidenceKind: "costing", calculationType: "valuation_preview", costingPolicyRevisionId: policy.id }) }); expect(correctionControl).toMatchObject({ boundary: { evidenceOnlyRequest: true, noSourceMutation: true, noLayerMutation: true, noReprocessingExecuted: true, noValuationPosting: true, noCogsCalculation: true, noJournalCreated: true, noLedgerMutation: true, noExternalEffect: true } }); expect(correctionControl.requests.find(request => request.id === correctionRequest.id)).toMatchObject({ requestKey: correctionKey, originalCostingCalculationEvidenceId: preview.id, originalCostLayerId: layer.id, originalRecordHash: preview.recordHash, originalSourceHash: layer.sourceHash, requestSnapshot: expect.objectContaining({ noReplacementDataAccepted: true, noReprocessingExecuted: true, noLayerMutation: true }), reviews: [expect.objectContaining({ decision: "blocked", reviewedByUserId: financeReviewerUserId, reasonCodes: expect.arrayContaining(["NO_CORRECTION_REPROCESSING_POLICY", "READINESS_REGISTER_HAS_NO_ACTIVATION_ELIGIBLE_OBJECT", "POSTING_READINESS_DISABLED"]), reviewSnapshot: expect.objectContaining({ noSuccessorEvidenceCreated: true, noReprocessingExecuted: true, noJournalCreated: true, noExternalEffect: true }) })] }); expect(semanticReadiness).toMatchObject({ model: { name: "Semantic Evidence-Gap and Readiness Register", posture: "descriptive_governance_not_activation" }, summary: { activationEligibleObjectCount: 0 }, boundary: { readOnlyRegister: true, noStateChange: true, noValuationPosting: true, noJournalCreated: true, noLedgerMutation: true, noExternalEffect: true } }); expect(semanticReadiness.entries.find(entry => entry.object === "cost_layer")).toMatchObject({ lifecycleState: "immutable_receipt_layers_observed", availableEvidence: [expect.stringContaining("immutable projected cost layer")], validationStatus: "pass", traceabilityCompleteness: "complete", blockers: [expect.stringContaining("evidence-only")] }); expect(semanticReadiness.entries.find(entry => entry.object === "valuation_layer")).toMatchObject({ lifecycleState: "read_only_preview_evidence_observed", validationStatus: "pass", dimensions: expect.objectContaining({ deterministicCalculation: "ready", accountingReadiness: "blocked", postingReadiness: "disabled" }) }); expect(semanticReadiness.graph).toEqual(expect.arrayContaining([expect.objectContaining({ from: "calculation_evidence", to: "valuation_layer", state: "present" }), expect.objectContaining({ from: "valuation_layer", to: "journal_proposal", state: "missing" }), expect.objectContaining({ from: "journal_proposal", to: "future_journal", state: "blocked" })])); expect((await admin.journal.list({ ventureId })).length).toBe(journalCountBefore); expect(audits.some(event => event.eventType === "cost_layer.receipt_created" && (event.payload as { noJournalCreated?: boolean; noTaxCalculation?: boolean; noPayrollCalculation?: boolean; noExternalEffect?: boolean }).noJournalCreated === true && (event.payload as { noTaxCalculation?: boolean }).noTaxCalculation === true && (event.payload as { noPayrollCalculation?: boolean }).noPayrollCalculation === true && (event.payload as { noExternalEffect?: boolean }).noExternalEffect === true)).toBe(true); expect(audits.some(event => event.eventType === "costing_correction.requested" && (event.payload as { noReprocessingExecuted?: boolean; noLayerMutation?: boolean; noExternalEffect?: boolean }).noReprocessingExecuted === true && (event.payload as { noLayerMutation?: boolean }).noLayerMutation === true && (event.payload as { noExternalEffect?: boolean }).noExternalEffect === true)).toBe(true); expect(audits.some(event => event.eventType === "costing_correction.review_blocked" && (event.payload as { noSuccessorEvidenceCreated?: boolean; noJournalCreated?: boolean; noExternalEffect?: boolean }).noSuccessorEvidenceCreated === true && (event.payload as { noJournalCreated?: boolean }).noJournalCreated === true && (event.payload as { noExternalEffect?: boolean }).noExternalEffect === true)).toBe(true);
  }, 30_000);

  it("retains refusal evidence and preserves immutable layers when weight allocation targets declare incompatible units", async () => {
    const operator = callerFor(operatorUserId, operatorOpenId); const admin = callerFor(1, "owner"); const suffix = "20260826";
    const supplier = (await operator.master.list({ ventureId })).find(master => master.domain === "supplier" && master.code === `VALIDATION-E2E-COST-SUPPLIER-${suffix}`)!; const item = (await operator.master.list({ ventureId })).find(master => master.domain === "item" && master.code === `VALIDATION-E2E-COST-ITEM-${suffix}`)!; const period = (await operator.period.list({ ventureId })).find(row => row.code === `VALIDATION-E2E-COST-PERIOD-${suffix}`)!; const policyCode = `VALIDATION-E2E-COST-POLICY-${suffix}-V6-UNIT-REFUSAL`;
    let policy = (await admin.costing.overview({ ventureId })).policies.find(row => row.policyCode === policyCode); if (!policy) await admin.costing.createPolicyRevision({ ventureId, policyCode, policyName: "VALIDATION-ONLY unit-compatible FIFO policy", costDomain: "inventory", valuationMethod: "fifo", effectiveFrom: "2026-08-01", policyConfiguration: { engine: "validation_only", noUnitConversion: true }, sourceRequirements: { receiptMovement: true, declaredCompatibleMeasureUnit: true }, rationale: "VALIDATION-ONLY mixed-unit allocation refusal" });
    policy = (await admin.costing.overview({ ventureId })).policies.find(row => row.policyCode === policyCode)!; if (policy.status !== "approved") await admin.costing.approvePolicyRevision({ ventureId, costingPolicyRevisionId: policy.id });
    const receiptFixture = async (suffixPart: string, weight: number, weightUnit: "kg" | "lb", volume: number, volumeUnit: "m3" | "l") => { const recordNumber = `VALIDATION-E2E-COST-PO-${suffix}-UNIT-${suffixPart}-V6`; let purchaseOrder = (await operator.records.list({ ventureId })).find(record => record.recordNumber === recordNumber); if (!purchaseOrder) purchaseOrder = await operator.records.create({ ventureId, domain: "procurement", recordType: "purchase_order", recordNumber, title: "VALIDATION-ONLY Costing Engine unit refusal purchase order", counterpartyMasterId: supplier.id, accountingPeriodId: period.id, amount: 100, effectiveDate: "2026-08-26", data: { validationOnly: true, noSupplierPayment: true, noExternalProcurementAction: true } }); if (purchaseOrder.status === "draft") await operator.records.transition({ ventureId, operationalRecordId: purchaseOrder.id, targetStatus: "pending_approval", note: "VALIDATION-ONLY Costing Engine unit refusal approval" }); purchaseOrder = (await operator.records.list({ ventureId })).find(record => record.id === purchaseOrder!.id)!; if (purchaseOrder.status === "pending_approval") await operator.records.transition({ ventureId, operationalRecordId: purchaseOrder.id, targetStatus: "approved", note: "VALIDATION-ONLY Costing Engine unit refusal approved" }); let receipt = (await operator.inventory.movements({ ventureId, itemMasterId: item.id })).find(movement => movement.operationalRecordId === purchaseOrder!.id && movement.movementType === "receipt"); if (!receipt) await operator.inventory.receivePurchaseOrder({ ventureId, purchaseOrderRecordId: purchaseOrder.id, itemMasterId: item.id, quantity: 1, narrative: "VALIDATION-ONLY Costing Engine incompatible-unit receipt", sourceFacts: { internalReceiptReference: `COST-UNIT-${suffixPart}`, evidenceReference: `COST-UNIT-EVIDENCE-${suffixPart}`, weight, weightUnit, volume, volumeUnit }, finalReceipt: false }); receipt = (await operator.inventory.movements({ ventureId, itemMasterId: item.id })).find(movement => movement.operationalRecordId === purchaseOrder!.id && movement.movementType === "receipt")!; let layer = (await admin.costing.overview({ ventureId })).layers.find(row => row.sourceInventoryMovementId === receipt!.id && row.costingPolicyRevisionId === policy!.id); if (!layer) await admin.costing.createReceiptLayer({ ventureId, sourceInventoryMovementId: receipt.id, costingPolicyRevisionId: policy.id, costingDate: "2026-08-26", originalValue: 100, currency: "USD", sourceEvidence: { internalBasis: "VALIDATION-ONLY incompatible-unit refusal layer" } }); return (await admin.costing.overview({ ventureId })).layers.find(row => row.sourceInventoryMovementId === receipt!.id && row.costingPolicyRevisionId === policy!.id)!; };
    const kilogramLayer = await receiptFixture("KG", 10, "kg", 1, "m3"); const poundLayer = await receiptFixture("LB", 22, "lb", 1_000, "l"); const journalCountBefore = (await admin.journal.list({ ventureId })).length;
    const refusedAllocation = await admin.costing.allocateLandedCost({ ventureId, costingPolicyRevisionId: policy.id, costingDate: "2026-08-26", landedCostCategory: "freight", allocationDriver: "weight", totalAmount: 9, currency: "USD", targetCostLayerIds: [kilogramLayer.id, poundLayer.id], rationale: "VALIDATION-ONLY incompatible declared weight-unit refusal" });
    const costing = await admin.costing.overview({ ventureId }); const refusalEvidence = costing.evidence.find(record => record.id === refusedAllocation.id); const kilogramAfter = costing.layers.find(layer => layer.id === kilogramLayer.id); const poundAfter = costing.layers.find(layer => layer.id === poundLayer.id);
    expect(refusedAllocation).toMatchObject({ status: "refused" }); expect(refusalEvidence).toMatchObject({ calculationType: "landed_cost_allocation", status: "refused", calculationSnapshot: expect.objectContaining({ refusalReasons: [expect.stringContaining("incompatible units")] }), invariantSnapshot: expect.objectContaining({ noRefusalReasons: false, noJournalCreated: true, noBalanceMutation: true, noExternalEffect: true }) }); expect(kilogramAfter).toMatchObject({ originalValue: "100.00", remainingValue: "100.00", sourceSnapshot: expect.objectContaining({ sourceFacts: expect.objectContaining({ weight: 10, weightUnit: "kg" }) }) }); expect(poundAfter).toMatchObject({ originalValue: "100.00", remainingValue: "100.00", sourceSnapshot: expect.objectContaining({ sourceFacts: expect.objectContaining({ weight: 22, weightUnit: "lb" }) }) }); expect((await admin.journal.list({ ventureId })).length).toBe(journalCountBefore);
  }, 30_000);

  it("retains a finance-controlled canonical item-master profile with declared unit evidence without moving inventory, valuing stock, or posting", async () => {
    const operator = callerFor(operatorUserId, operatorOpenId); const admin = callerFor(1, "owner"); const itemCode = "VALIDATION-E2E-CANONICAL-ITEM-PROFILE-20260826"; const incompatibleItemCode = "VALIDATION-E2E-CANONICAL-ITEM-PROFILE-SERVICE-20260826";
    let item = (await operator.master.list({ ventureId })).find(master => master.domain === "item" && master.code === itemCode);
    if (!item) item = await operator.master.create({ ventureId, domain: "item", code: itemCode, name: "VALIDATION-ONLY canonical item profile", attributes: { validationOnly: true } });
    let incompatibleItem = (await operator.master.list({ ventureId })).find(master => master.domain === "item" && master.code === incompatibleItemCode);
    if (!incompatibleItem) incompatibleItem = await operator.master.create({ ventureId, domain: "item", code: incompatibleItemCode, name: "VALIDATION-ONLY incompatible item profile", attributes: { validationOnly: true } });
    const journalCountBefore = (await admin.journal.list({ ventureId })).length; const movementCountBefore = (await admin.inventory.movements({ ventureId, itemMasterId: item.id })).length;
    await expect(operator.master.createItemProfile({ ventureId, itemMasterId: item.id, itemType: "stock_item", inventoryTracked: true, baseUomCode: "EA", unitEvidenceReference: "VALIDATION-ONLY item unit evidence", costingEligibility: "not_assessed", attributes: { validationOnly: true } })).rejects.toThrow();
    await expect(admin.master.createItemProfile({ ventureId, itemMasterId: incompatibleItem.id, itemType: "service", inventoryTracked: true, baseUomCode: "HOUR", unitEvidenceReference: "VALIDATION-ONLY incompatible unit evidence", costingEligibility: "not_assessed", attributes: { validationOnly: true } })).rejects.toThrow("cannot declare inventory tracking");
    let profile = (await admin.master.itemProfiles({ ventureId })).find(row => row.profile.itemMasterId === item!.id)?.profile;
    if (!profile) await admin.master.createItemProfile({ ventureId, itemMasterId: item.id, itemType: "stock_item", inventoryTracked: true, baseUomCode: "EA", unitEvidenceReference: "VALIDATION-ONLY item unit evidence", productFamily: "VALIDATION-ONLY", costingEligibility: "not_assessed", attributes: { validationOnly: true, noUnitConversion: true } });
    profile = (await admin.master.itemProfiles({ ventureId })).find(row => row.profile.itemMasterId === item!.id)!.profile;
    if (profile.status === "draft") await admin.master.activateItemProfile({ ventureId, itemMasterProfileId: profile.id });
    const profiles = await admin.master.itemProfiles({ ventureId }); const retained = profiles.find(row => row.profile.id === profile!.id)!; const audits = await admin.audit({ ventureId }); const projection = await admin.canonicalFinancialObjects.projection({ ventureId }); const readiness = await admin.semanticReadiness.register({ ventureId });
    expect(retained).toMatchObject({ profile: { ventureId, itemMasterId: item.id, itemType: "stock_item", inventoryTracked: true, baseUomCode: "EA", unitEvidenceReference: "VALIDATION-ONLY item unit evidence", costingEligibility: "not_assessed", status: "active" }, master: { id: item.id, domain: "item", code: itemCode } });
    expect((await admin.inventory.movements({ ventureId, itemMasterId: item.id })).length).toBe(movementCountBefore); expect((await admin.journal.list({ ventureId })).length).toBe(journalCountBefore);
    expect(audits.some(event => event.eventType === "item_master_profile.created" && (event.payload as { itemMasterId?: number; noInventoryMovement?: boolean; noValuationCalculation?: boolean; noJournalCreated?: boolean; noExternalEffect?: boolean }).itemMasterId === item!.id && (event.payload as { noInventoryMovement?: boolean }).noInventoryMovement === true && (event.payload as { noValuationCalculation?: boolean }).noValuationCalculation === true && (event.payload as { noJournalCreated?: boolean }).noJournalCreated === true && (event.payload as { noExternalEffect?: boolean }).noExternalEffect === true)).toBe(true);
    expect(audits.some(event => event.eventType === "item_master_profile.activated" && (event.payload as { itemMasterId?: number; baseUomCode?: string; noUnitConversion?: boolean; noInventoryMovement?: boolean; noJournalCreated?: boolean; noExternalEffect?: boolean }).itemMasterId === item!.id && (event.payload as { baseUomCode?: string }).baseUomCode === "EA" && (event.payload as { noUnitConversion?: boolean }).noUnitConversion === true && (event.payload as { noInventoryMovement?: boolean }).noInventoryMovement === true && (event.payload as { noJournalCreated?: boolean }).noJournalCreated === true && (event.payload as { noExternalEffect?: boolean }).noExternalEffect === true)).toBe(true);
    expect(projection.objects.find(object => object.canonicalId === `Resource:${item!.id}`)).toMatchObject({ canonicalType: "resource", sourceEntity: "erp_item_master_profiles", status: "active", traceability: { itemMasterId: item!.id, itemType: "stock_item", inventoryTracked: true, baseUomCode: "EA", unitEvidenceReference: "VALIDATION-ONLY item unit evidence", noUnitConversion: true, noInventoryMutation: true, noValuationCalculation: true, noJournalCreated: true, noExternalEffect: true } });
    expect(readiness.entries.find(entry => entry.object === "resource")).toMatchObject({ lifecycleState: "active_canonical_item_profiles_observed", validationStatus: "pass", traceabilityCompleteness: "complete", dimensions: { evidenceIntegrity: "pass", governanceApproval: "approved", postingReadiness: "disabled" } });
    expect(projection.boundary).toMatchObject({ readOnlyProjection: true, noInventoryMutation: true, noUnitConversion: true, noValuationCalculation: true, noJournalCreated: true, noExternalEffect: true });
  }, 30_000);

  it("projects retained canonical resource evidence without creating a second ledger, changing inventory, or posting", async () => {
    const operator = callerFor(operatorUserId, operatorOpenId); const admin = callerFor(1, "owner"); const item = (await operator.master.list({ ventureId })).find(master => master.domain === "item" && master.code === "VALIDATION-E2E-COST-ITEM-20260826")!;
    let profile = (await admin.master.itemProfiles({ ventureId })).find(row => row.profile.itemMasterId === item.id)?.profile;
    if (!profile) await admin.master.createItemProfile({ ventureId, itemMasterId: item.id, itemType: "stock_item", inventoryTracked: true, baseUomCode: "EA", unitEvidenceReference: "VALIDATION-ONLY CREB declared-unit evidence", productFamily: "VALIDATION-ONLY", costingEligibility: "not_assessed", attributes: { validationOnly: true, noUnitConversion: true } });
    profile = (await admin.master.itemProfiles({ ventureId })).find(row => row.profile.itemMasterId === item.id)!.profile; if (profile.status === "draft") await admin.master.activateItemProfile({ ventureId, itemMasterProfileId: profile.id });
    const movementsBefore = await admin.inventory.movements({ ventureId, itemMasterId: item.id }); const balancesBefore = await admin.inventory.balances({ ventureId }); const journalsBefore = await admin.journal.list({ ventureId });
    const bridge = await admin.canonicalResourceEvidence.bridge({ ventureId }); const resource = bridge.resources.find(row => row.canonicalResourceId === `Resource:${item.id}`)!;
    expect(bridge).toMatchObject({ model: { name: "Canonical Resource Evidence Bridge", version: "0.2-read-only", scope: "inventory_items_initially" }, boundary: { readOnlyProjection: true, noSecondInventoryLedger: true, noInventoryMutation: true, noValuationCalculation: true, noCogsCalculation: true, noJournalCreated: true, noExternalEffect: true } });
    expect(resource).toMatchObject({ canonicalResourceId: `Resource:${item.id}`, ventureId, itemReference: { id: item.id, code: "VALIDATION-E2E-COST-ITEM-20260826" }, declaredUnit: { baseUomCode: "EA", noUnitConversion: true }, reconciliation: { status: "reconciled" }, sourceEvidenceReferences: { operationalDocuments: expect.arrayContaining([expect.objectContaining({ domain: "procurement", recordType: "purchase_order", recordNumber: "VALIDATION-E2E-COST-PO-20260826-MEASURE-V2" })]), declaredLocationReferences: expect.arrayContaining([expect.objectContaining({ key: "warehouseCode", value: "WH-COST" })]), immutableCostLayers: expect.arrayContaining([expect.objectContaining({ sourceInventoryMovementId: expect.any(Number), sourceHash: expect.any(String) })]) }, readiness: { quantityReconciled: true, eligibleForFutureValuation: false, eligibleForFutureCosting: false, eligibleForFutureAccounting: false }, boundary: { readOnlyProjection: true, noSecondInventoryLedger: true, noInventoryMutation: true, noBalanceAdjustment: true, noValuationCalculation: true, noCogsCalculation: true, noJournalProposalChange: true, noPosting: true, noLedgerImpact: true, noExternalEffect: true } });
    expect(await admin.inventory.movements({ ventureId, itemMasterId: item.id })).toEqual(movementsBefore); expect(await admin.inventory.balances({ ventureId })).toEqual(balancesBefore); expect(await admin.journal.list({ ventureId })).toEqual(journalsBefore);
  }, 30_000);

  it("projects retained obligation evidence without changing invoices, payments, commitments, or journals", async () => {
    const admin = callerFor(1, "owner");
    const recordsBefore = await admin.records.list({ ventureId });
    const journalsBefore = await admin.journal.list({ ventureId });
    const matchedInvoice = recordsBefore.find(record => record.recordNumber === "VALIDATION-E2E-THREE-WAY-AP-20260825")!;
    const mismatchedInvoice = recordsBefore.find(record => record.recordNumber === "VALIDATION-E2E-THREE-WAY-AP-MISMATCH-20260825")!;
    const bridge = await admin.canonicalObligationEvidence.bridge({ ventureId });
    const matchedPayable = bridge.obligations.find(obligation => obligation.canonicalObligationId === `Obligation:Invoice:${matchedInvoice.id}`)!;
    const mismatchedPayable = bridge.obligations.find(obligation => obligation.canonicalObligationId === `Obligation:Invoice:${mismatchedInvoice.id}`)!;
    expect(bridge).toMatchObject({ model: { name: "Canonical Obligation Evidence Bridge", version: "0.1-read-only", scope: "payables_receivables_and_purchase_sales_commitments" }, boundary: { readOnlyProjection: true, noObligationSystemOfRecord: true, noInvoiceMutation: true, noPaymentExecution: true, noJournalCreated: true, noPosting: true, noLedgerImpact: true, noValuationCalculation: true, noTaxCalculation: true, noPayrollCalculation: true, noFiling: true, noIntegrationTriggered: true, noExternalEffect: true } });
    expect(matchedPayable).toMatchObject({ obligationType: "accounts_payable", approvalState: "approved", matchingState: { status: "matched", receiptCount: 1 }, sourceEvidenceReferences: { matchedPurchaseOrder: expect.objectContaining({ recordType: "purchase_order" }), receiptMovements: [expect.objectContaining({ operationalRecordId: expect.any(Number), quantity: 1 })] }, reconciliation: { status: "reconciled" }, evidenceCompleteness: "incomplete", readiness: { amountReconciled: true, eligibleForFutureTreasury: false, eligibleForFutureCashForecasting: false, eligibleForFutureAccounting: false, blocked: true }, boundary: { readOnlyProjection: true, noInvoiceMutation: true, noPaymentExecution: true, noJournalCreated: true, noPosting: true, noLedgerImpact: true, noExternalEffect: true } });
    expect(matchedPayable.outstandingEvidenceGaps).toContain("No retained invoice due date exists.");
    expect(mismatchedPayable).toMatchObject({ obligationType: "accounts_payable", matchingState: { status: "mismatch", reasonCodes: ["invoice_exceeds_purchase_order"] }, reconciliation: { status: "exception", exceptions: ["invoice_exceeds_purchase_order"] }, readiness: { amountReconciled: false, blocked: true } });
    expect(bridge.obligations.some(obligation => obligation.obligationType === "purchase_commitment" && obligation.sourceEvidenceReferences.linkedInvoices.some(invoice => invoice.id === matchedPayable.sourceEvidenceReferences.invoiceRecordId))).toBe(true);
    expect(await admin.records.list({ ventureId })).toEqual(recordsBefore);
    expect(await admin.journal.list({ ventureId })).toEqual(journalsBefore);
  }, 20_000);

  it("evaluates a governed metric catalog from retained tenant evidence without persisting metrics or changing operational state", async () => {
    const admin = callerFor(1, "owner");
    const recordsBefore = await admin.records.list({ ventureId });
    const journalsBefore = await admin.journal.list({ ventureId });
    const intelligence = await intelligenceCallerFor(1, "owner").overview({ ventureId });
    expect(intelligence).toMatchObject({ model: { name: "Enterprise Decision Intelligence Layer", version: "0.1-governed-read-only" }, summary: { totalMetrics: expect.any(Number), observedMetricCount: expect.any(Number), evidenceGapMetricCount: expect.any(Number) }, boundary: { readOnlyMetricEvaluation: true, noMetricPersistence: true, noFinancialStatement: true, noValuationCalculation: true, noPaymentExecution: true, noJournalCreated: true, noPosting: true, noTaxCalculation: true, noPayrollCalculation: true, noFiling: true, noIntegrationTriggered: true, noExternalEffect: true } });
    expect(intelligence.summary.totalMetrics).toBeGreaterThanOrEqual(100);
    expect(intelligence.summary.observedMetricCount).toBeGreaterThan(0);
    expect(intelligence.summary.evidenceGapMetricCount).toBeGreaterThan(0);
    expect(intelligence.metrics.find(metric => metric.key === "operations.inventory_movements")).toMatchObject({ status: "observed", value: expect.any(Number), formula: expect.stringContaining("inventory-movement"), readiness: { safeToCompute: true, futureAutomationEligible: false, blocked: false } });
    expect(intelligence.metrics.find(metric => metric.key === "finance.open_payable_invoices")).toMatchObject({ status: "observed", value: expect.any(Number), evidence: expect.arrayContaining([expect.objectContaining({ source: "erp_operational_records payable invoices" })]) });
    expect(intelligence.metrics.find(metric => metric.key === "finance.cash_balance")).toMatchObject({ status: "partially_supported", value: null, readiness: { safeToCompute: false, futureAutomationEligible: false, blocked: true }, collectionRequirement: expect.stringContaining("ledger, cash") });
    expect(intelligence.metrics.find(metric => metric.key === "ai.prompt_success_rate")).toMatchObject({ status: "not_modeled", value: null, missingEvidence: [expect.stringContaining("approved ai product source contract")], readiness: { formulaModeled: false, safeToCompute: false, blocked: true } });
    expect(await admin.records.list({ ventureId })).toEqual(recordsBefore);
    expect(await admin.journal.list({ ventureId })).toEqual(journalsBefore);
  }, 20_000);

  it("attaches an approved effective-dated finance classification to retained immutable evidence without recalculating, rewriting, or posting", async () => {
    const operator = callerFor(operatorUserId, operatorOpenId); const admin = callerFor(1, "owner");
    const debitAccount = (await admin.master.list({ ventureId })).find(master => master.domain === "account" && master.code === "VALIDATION-E2E-ACCOUNTING-DEBIT-20260825");
    const creditAccount = (await admin.master.list({ ventureId })).find(master => master.domain === "account" && master.code === "VALIDATION-E2E-ACCOUNTING-CREDIT-20260825");
    const period = (await admin.period.list({ ventureId })).find(candidate => candidate.code === "VALIDATION-E2E-ACCOUNTING-PERIOD-20260825");
    expect(debitAccount).toBeTruthy(); expect(creditAccount).toBeTruthy(); expect(period).toBeTruthy();
    await expect(operator.accountClassifications.createRevision({ ventureId, accountMasterId: debitAccount!.id, classificationFamily: "asset", statementSection: "current_assets", normalBalance: "debit", effectiveFrom: "2026-08-01", rationale: "VALIDATION-ONLY operator must not control financial presentation." })).rejects.toThrow();
    let revision = (await admin.accountClassifications.list({ ventureId })).find(item => item.accountMasterId === debitAccount!.id && item.effectiveFrom === "2026-08-01" && item.classificationFamily === "asset");
    if (!revision) await admin.accountClassifications.createRevision({ ventureId, accountMasterId: debitAccount!.id, classificationFamily: "asset", statementSection: "current_assets", normalBalance: "debit", effectiveFrom: "2026-08-01", rationale: "VALIDATION-ONLY governed classification coverage for retained evidence." });
    revision = (await admin.accountClassifications.list({ ventureId })).find(item => item.accountMasterId === debitAccount!.id && item.effectiveFrom === "2026-08-01" && item.classificationFamily === "asset")!;
    if (revision.status === "draft") await admin.accountClassifications.approveRevision({ ventureId, accountClassificationRevisionId: revision.id });
    let creditRevision = (await admin.accountClassifications.list({ ventureId })).find(item => item.accountMasterId === creditAccount!.id && item.effectiveFrom === "2026-08-01" && item.classificationFamily === "liability");
    if (!creditRevision) await admin.accountClassifications.createRevision({ ventureId, accountMasterId: creditAccount!.id, classificationFamily: "liability", statementSection: "current_liabilities", normalBalance: "credit", effectiveFrom: "2026-08-01", rationale: "VALIDATION-ONLY governed classification coverage for retained receipt-clearing evidence." });
    creditRevision = (await admin.accountClassifications.list({ ventureId })).find(item => item.accountMasterId === creditAccount!.id && item.effectiveFrom === "2026-08-01" && item.classificationFamily === "liability")!;
    if (creditRevision.status === "draft") await admin.accountClassifications.approveRevision({ ventureId, accountClassificationRevisionId: creditRevision.id });
    const journalCountBefore = (await admin.journal.list({ ventureId })).length;
    const eventCountBefore = (await admin.accountingControl.overview({ ventureId })).events.length;
    const evidenceCountBefore = (await admin.accountingControl.calculationEvidence({ ventureId })).length;
    const report = await admin.financeReporting.controlledEvidence({ ventureId, accountingPeriodId: period!.id, accountMasterId: debitAccount!.id });
    expect(report.classificationCoverage).toMatchObject({ approvedRevisionCount: expect.any(Number), classifiedEvidenceLineCount: expect.any(Number), policy: "effective_dated_finance_owned_read_model_only", noHistoricalRewrite: true });
    expect(report.current.generalLedgerActivity.some(line => line.accountMasterId === debitAccount!.id && line.classificationStatus === "classified" && line.accountClassification?.id === revision!.id && line.accountClassification?.statementSection === "current_assets")).toBe(true);
    expect(report.current.generalLedgerActivity.every(line => line.accountMasterId === debitAccount!.id)).toBe(true);
    expect(report.formalStatements).toMatchObject({ balanceSheet: "not_available_pending_statement_policy_and_frozen_classification_evidence", incomeStatement: "not_available_pending_statement_policy_and_frozen_classification_evidence" });
    expect(report.formalStatementReadiness.find(item => item.statement === "balance_sheet")).toMatchObject({ available: false, gates: expect.arrayContaining([expect.objectContaining({ key: "immutable_evidence_integrity", status: "ready", derivedOnly: true }), expect.objectContaining({ key: "effective_dated_classification_coverage", status: "ready", derivedOnly: true }), expect.objectContaining({ key: "opening_balance_policy", status: "blocked", derivedOnly: false }), expect.objectContaining({ key: "statement_projection_evidence", status: "blocked", derivedOnly: false })]) });
    expect((await admin.journal.list({ ventureId })).length).toBe(journalCountBefore);
    expect((await admin.accountingControl.overview({ ventureId })).events.length).toBe(eventCountBefore);
    expect((await admin.accountingControl.calculationEvidence({ ventureId })).length).toBe(evidenceCountBefore);
    const audits = await admin.audit({ ventureId });
    expect(audits.some(event => event.eventType === "account_classification_revision.created" && (event.payload as { accountMasterId?: number; noPosting?: boolean; noExternalEffect?: boolean }).accountMasterId === debitAccount!.id && (event.payload as { noPosting?: boolean }).noPosting === true && (event.payload as { noExternalEffect?: boolean }).noExternalEffect === true)).toBe(true);
    expect(audits.some(event => event.eventType === "account_classification_revision.approved" && (event.payload as { accountMasterId?: number; noBalanceMutation?: boolean }).accountMasterId === debitAccount!.id && (event.payload as { noBalanceMutation?: boolean }).noBalanceMutation === true)).toBe(true);
  }, 20_000);

  it("retains a supplier invoice reference once per active supplier and venture, rejects a duplicate, and records only internal evidence", async () => {
    const operator = callerFor(operatorUserId, operatorOpenId); const admin = callerFor(1, "owner");
    const supplierCode = "VALIDATION-E2E-SUPPLIER-REFERENCE-SUPPLIER-20260825";
    const invoiceNumber = "VALIDATION-E2E-SUPPLIER-REFERENCE-AP-20260825";
    const duplicateNumber = "VALIDATION-E2E-SUPPLIER-REFERENCE-DUP-20260825";
    const supplierReference = "VALIDATION-E2E-SUPPLIER-REF-20260825";
    const masters = await operator.master.list({ ventureId });
    let supplier = masters.find(master => master.domain === "supplier" && master.code === supplierCode);
    if (!supplier) supplier = await operator.master.create({ ventureId, domain: "supplier", code: supplierCode, name: "VALIDATION-ONLY supplier reference supplier", attributes: { validationOnly: true, noExternalSupplierAction: true } });
    let invoice = (await admin.invoice.settlements({ ventureId })).find(item => item.invoice.recordNumber === invoiceNumber)?.invoice;
    if (!invoice) invoice = await operator.invoice.create({ ventureId, invoiceType: "payable_invoice", recordNumber: invoiceNumber, title: "VALIDATION-ONLY supplier invoice reference", counterpartyMasterId: supplier.id, amount: 25, effectiveDate: "2026-08-25", supplierInvoiceReference: supplierReference, data: { validationOnly: true, noExternalDisbursement: true } });
    await expect(operator.invoice.create({ ventureId, invoiceType: "payable_invoice", recordNumber: duplicateNumber, title: "VALIDATION-ONLY duplicate supplier reference", counterpartyMasterId: supplier.id, amount: 25, effectiveDate: "2026-08-25", supplierInvoiceReference: supplierReference.toLowerCase(), data: { validationOnly: true, noExternalDisbursement: true } })).rejects.toThrow("already exists");
    const db = await getDb(); if (!db) throw new Error("Database is not available.");
    await expect(db.insert(erpOperationalRecords).values({ ventureId, domain: "procurement", recordType: "payable_invoice", recordNumber: "VALIDATION-E2E-SUPPLIER-REFERENCE-DB-UNIQUE-20260825", title: "VALIDATION-ONLY database uniqueness probe", status: "draft", counterpartyMasterId: supplier.id, amount: "25", taxAmount: "0", totalAmount: "25", transactionCurrency: "USD", functionalCurrency: "USD", functionalAmount: "25", effectiveDate: "2026-08-25", supplierInvoiceReferenceNormalized: supplierReference, data: { validationOnly: true, directDatabaseConstraintProbe: true, noExternalDisbursement: true }, createdByUserId: operatorUserId })).rejects.toThrow();
    const records = await admin.records.list({ ventureId }); const audits = await admin.audit({ ventureId });
    const retained = records.find(record => record.id === invoice!.id)!;
    expect(retained.data).toMatchObject({ supplierInvoiceReference: supplierReference, supplierInvoiceReferenceNormalized: supplierReference });
    expect(audits.some(event => event.operationalRecordId === invoice!.id && event.eventType === "payable_invoice.supplier_reference_recorded")).toBe(true);
    const duplicateRejection = audits.find(event => event.eventType === "payable_invoice.duplicate_supplier_reference_rejected" && event.operationalRecordId === invoice!.id);
    expect(duplicateRejection?.payload).toMatchObject({ supplierMasterId: supplier.id, duplicateOperationalRecordId: invoice!.id, attemptedReferencePresent: true, attemptedReferenceRawValueStored: false, noExternalSupplierAction: true, noPaymentExecution: true });
    expect(JSON.stringify(duplicateRejection?.payload)).not.toContain(supplierReference);
  }, 20_000);

  it("returns aging from retained internal invoice evidence without creating a collection, disbursement, or external action", async () => {
    const admin = callerFor(1, "owner");
    const aging = await admin.invoice.aging({ ventureId, asOfDate: "2026-08-25" });
    expect(aging.asOfDate).toBe("2026-08-25");
    expect(aging.invoices.some(item => item.recordNumber === "VALIDATION-E2E-SUPPLIER-REFERENCE-AP-20260825" && item.bucket === "undated")).toBe(true);
    expect(aging.summary.payable_invoice.USD.undated).toBeGreaterThanOrEqual(25);
  }, 20_000);

  it("persists explicit jurisdiction-neutral people, delivery, asset, service, and CRM work controls with approval evidence", async () => {
    const operator = callerFor(operatorUserId, operatorOpenId);
    const workControls = [
      { domain: "people" as const, recordType: "employee_profile", recordNumber: "VALIDATION-E2E-EMPLOYEE-20260824", title: "VALIDATION-ONLY employee profile" },
      { domain: "people" as const, recordType: "compensation_component", recordNumber: "VALIDATION-E2E-COMPONENT-20260824", title: "VALIDATION-ONLY compensation component" },
      { domain: "projects" as const, recordType: "project_plan", recordNumber: "VALIDATION-E2E-PROJECT-20260824", title: "VALIDATION-ONLY project plan" },
      { domain: "projects" as const, recordType: "task", recordNumber: "VALIDATION-E2E-TASK-20260824", title: "VALIDATION-ONLY project task" },
      { domain: "assets" as const, recordType: "asset_register", recordNumber: "VALIDATION-E2E-ASSET-20260824", title: "VALIDATION-ONLY asset register" },
      { domain: "assets" as const, recordType: "maintenance_work_order", recordNumber: "VALIDATION-E2E-MAINTENANCE-20260824", title: "VALIDATION-ONLY maintenance work order" },
      { domain: "service" as const, recordType: "service_request", recordNumber: "VALIDATION-E2E-SERVICE-20260824", title: "VALIDATION-ONLY service request" },
      { domain: "crm" as const, recordType: "opportunity", recordNumber: "VALIDATION-E2E-OPPORTUNITY-20260824", title: "VALIDATION-ONLY CRM opportunity" },
    ];
    let existing = await operator.records.list({ ventureId });
    for (const control of workControls) {
      let record = existing.find(candidate => candidate.recordNumber === control.recordNumber);
      if (!record) {
        record = await operator.records.create({
          ventureId,
          ...control,
          amount: 100,
          effectiveDate: "2026-08-24",
          data: { validationOnly: true, jurisdictionNeutral: true, calculationInput: 100, noStatutoryDetermination: true, noExternalExecution: true },
        });
      }
      if (record.status === "draft") await operator.records.transition({ ventureId, operationalRecordId: record.id, targetStatus: "pending_approval", note: "VALIDATION-ONLY E2E work submission" });
      if (record.status === "draft" || record.status === "pending_approval") await operator.records.transition({ ventureId, operationalRecordId: record.id, targetStatus: "approved", note: "VALIDATION-ONLY E2E work approval" });
    }
    const records = await operator.records.list({ ventureId });
    const audits = await operator.audit({ ventureId });
    for (const control of workControls) {
      const record = records.find(candidate => candidate.recordNumber === control.recordNumber);
      expect(record).toMatchObject({ domain: control.domain, recordType: control.recordType, status: "approved" });
      expect(audits.some(event => event.operationalRecordId === record?.id && event.eventType === "record.transitioned")).toBe(true);
    }
  }, 20_000);

  it("enforces dedicated employee-profile and compensation-component approvals beyond generic work records", async () => {
    const operator = callerFor(operatorUserId, operatorOpenId); const admin = callerFor(1, "owner");
    const employeeCode = "VALIDATION-E2E-EMPLOYEE-MASTER-20260824";
    const employeeNumber = "VALIDATION-E2E-EMPLOYEE-20260824";
    const componentCode = "VALIDATION-E2E-COMPONENT-20260824";
    const masters = await operator.master.list({ ventureId });
    let employeeMaster = masters.find(master => master.domain === "employee" && master.code === employeeCode);
    if (!employeeMaster) employeeMaster = await operator.master.create({ ventureId, domain: "employee", code: employeeCode, name: "VALIDATION-ONLY employee master", attributes: { validationOnly: true } });
    let profile = (await operator.people.profiles({ ventureId })).find(candidate => candidate.employeeNumber === employeeNumber);
    if (!profile) profile = await operator.people.createProfile({ ventureId, employeeMasterId: employeeMaster.id, employeeNumber, department: "Validation", positionTitle: "Validation operator", employmentType: "employee", startDate: "2026-08-24", calculationInputs: { internalInput: 0, jurisdictionNeutral: true, noStatutoryDetermination: true } });
    let component = (await operator.people.components({ ventureId })).find(candidate => candidate.code === componentCode);
    if (!component) component = await operator.people.createComponent({ ventureId, code: componentCode, name: "VALIDATION-ONLY fixed earning", kind: "earning", calculationMethod: "flat_amount", defaultAmount: 100, currency: "USD", effectiveFrom: "2026-08-24", calculationInputs: { internalInput: 100, jurisdictionNeutral: true, noStatutoryDetermination: true } });
    if (profile.status === "draft") await expect(operator.people.transitionProfile({ ventureId, employeeProfileId: profile.id, targetStatus: "active" })).rejects.toThrow();
    if (component.status === "draft") await expect(operator.people.transitionComponent({ ventureId, compensationComponentId: component.id, targetStatus: "active" })).rejects.toThrow();
    if (profile.status === "draft") await admin.people.transitionProfile({ ventureId, employeeProfileId: profile.id, targetStatus: "active" });
    if (component.status === "draft") await admin.people.transitionComponent({ ventureId, compensationComponentId: component.id, targetStatus: "active" });
    const profiles = await admin.people.profiles({ ventureId }); const components = await admin.people.components({ ventureId }); const audits = await admin.audit({ ventureId });
    expect(profiles.find(candidate => candidate.id === profile!.id)?.status).toBe("active");
    expect(components.find(candidate => candidate.id === component!.id)?.status).toBe("active");
    expect(audits.some(event => event.eventType === "people.employee_profile_transitioned")).toBe(true);
    expect(audits.some(event => event.eventType === "people.compensation_component_transitioned")).toBe(true);
  }, 20_000);

  it("enforces dedicated project, task, asset, and maintenance transitions beyond generic work records", async () => {
    const operator = callerFor(operatorUserId, operatorOpenId); const admin = callerFor(1, "owner");
    const masters = await operator.master.list({ ventureId });
    let projectMaster = masters.find(master => master.domain === "project" && master.code === "VALIDATION-E2E-PROJECT-CALC-MASTER-20260824");
    if (!projectMaster) projectMaster = await operator.master.create({ ventureId, domain: "project", code: "VALIDATION-E2E-PROJECT-CALC-MASTER-20260824", name: "VALIDATION-ONLY calculation-input project master", attributes: { validationOnly: true } });
    let assetMaster = masters.find(master => master.domain === "asset" && master.code === "VALIDATION-E2E-ASSET-CALC-MASTER-20260824");
    if (!assetMaster) assetMaster = await operator.master.create({ ventureId, domain: "asset", code: "VALIDATION-E2E-ASSET-CALC-MASTER-20260824", name: "VALIDATION-ONLY calculation-input asset master", attributes: { validationOnly: true } });
    let project = (await operator.deliveryAssets.projects({ ventureId })).find(row => row.projectCode === "VALIDATION-E2E-PROJECT-CALC-20260824");
    if (!project) project = await operator.deliveryAssets.createProject({ ventureId, projectMasterId: projectMaster.id, projectCode: "VALIDATION-E2E-PROJECT-CALC-20260824", name: "VALIDATION-ONLY calculation-input project", startDate: "2026-08-24", calculationInputs: { internalBasis: "100", jurisdictionNeutral: true }, attributes: { validationOnly: true } });
    if (project.status === "draft") await expect(operator.deliveryAssets.transitionProject({ ventureId, projectId: project.id, targetStatus: "active" })).rejects.toThrow();
    if (project.status === "draft") await admin.deliveryAssets.transitionProject({ ventureId, projectId: project.id, targetStatus: "active" });
    let task = (await operator.deliveryAssets.tasks({ ventureId })).find(row => row.taskCode === "VALIDATION-E2E-TASK-CALC-20260824");
    if (!task) task = await operator.deliveryAssets.createTask({ ventureId, projectId: project.id, taskCode: "VALIDATION-E2E-TASK-CALC-20260824", title: "VALIDATION-ONLY calculation-input task", priority: "normal", calculationInputs: { internalBasis: "8", jurisdictionNeutral: true }, attributes: { validationOnly: true } });
    if (task.status === "draft") await operator.deliveryAssets.transitionTask({ ventureId, projectTaskId: task.id, targetStatus: "ready" });
    if (task.status === "draft" || task.status === "ready") await operator.deliveryAssets.transitionTask({ ventureId, projectTaskId: task.id, targetStatus: "in_progress" });
    let asset = (await operator.deliveryAssets.assets({ ventureId })).find(row => row.assetTag === "VALIDATION-E2E-ASSET-CALC-20260824");
    if (!asset) asset = await operator.deliveryAssets.createAsset({ ventureId, assetMasterId: assetMaster.id, assetTag: "VALIDATION-E2E-ASSET-CALC-20260824", name: "VALIDATION-ONLY calculation-input asset", calculationInputs: { internalBasis: "24", jurisdictionNeutral: true }, attributes: { validationOnly: true } });
    if (asset.status === "draft") await admin.deliveryAssets.transitionAsset({ ventureId, assetId: asset.id, targetStatus: "in_service" });
    const sourceFactMasterCode = "VALIDATION-E2E-ASSET-SOURCE-FACT-MASTER-20260826";
    const sourceFactAssetTag = "VALIDATION-E2E-ASSET-SOURCE-FACT-20260826";
    const sourceFacts = { internalAcquisitionReference: "ACQ-INT-VALIDATION-20260826", supplierReference: "SUPPLIER-REF-VALIDATION", warehouseCode: "WH-VALIDATION", costCenterCode: "CC-VALIDATION", projectCode: "PRJ-VALIDATION", evidenceReference: "EVIDENCE-ASSET-ACQUISITION-VALIDATION" };
    let sourceFactMaster = (await operator.master.list({ ventureId })).find(master => master.domain === "asset" && master.code === sourceFactMasterCode);
    if (!sourceFactMaster) sourceFactMaster = await operator.master.create({ ventureId, domain: "asset", code: sourceFactMasterCode, name: "VALIDATION-ONLY asset source-fact master", attributes: { validationOnly: true } });
    let sourceFactAsset = (await operator.deliveryAssets.assets({ ventureId })).find(row => row.assetTag === sourceFactAssetTag);
    if (!sourceFactAsset) sourceFactAsset = await operator.deliveryAssets.createAsset({ ventureId, assetMasterId: sourceFactMaster.id, assetTag: sourceFactAssetTag, name: "VALIDATION-ONLY asset source facts", sourceFacts, calculationInputs: { jurisdictionNeutral: true }, attributes: { validationOnly: true, noCapitalization: true, noDepreciation: true } });
    let maintenance = (await operator.deliveryAssets.maintenance({ ventureId })).find(row => row.workOrderNumber === "VALIDATION-E2E-MAINT-CALC-20260824");
    if (!maintenance) maintenance = await operator.deliveryAssets.createMaintenance({ ventureId, assetId: asset.id, workOrderNumber: "VALIDATION-E2E-MAINT-CALC-20260824", title: "VALIDATION-ONLY calculation-input maintenance", maintenanceType: "inspection", calculationInputs: { internalBasis: "2", jurisdictionNeutral: true }, attributes: { validationOnly: true } });
    if (maintenance.status === "draft") await operator.deliveryAssets.transitionMaintenance({ ventureId, maintenanceWorkOrderId: maintenance.id, targetStatus: "scheduled" });
    const audits = await admin.audit({ ventureId });
    expect((await admin.deliveryAssets.projects({ ventureId })).find(row => row.id === project!.id)?.status).toBe("active");
    expect((await admin.deliveryAssets.projects({ ventureId })).find(row => row.id === project!.id)?.calculationInputs).toMatchObject({ jurisdictionNeutral: true });
    expect((await admin.deliveryAssets.tasks({ ventureId })).find(row => row.id === task!.id)?.calculationInputs).toMatchObject({ jurisdictionNeutral: true });
    expect((await admin.deliveryAssets.assets({ ventureId })).find(row => row.id === asset!.id)?.status).toBe("in_service");
    expect((await admin.deliveryAssets.assets({ ventureId })).find(row => row.id === asset!.id)?.calculationInputs).toMatchObject({ jurisdictionNeutral: true });
    expect((await admin.deliveryAssets.assets({ ventureId })).find(row => row.id === sourceFactAsset!.id)?.sourceFacts).toEqual(sourceFacts);
    expect((await admin.deliveryAssets.maintenance({ ventureId })).find(row => row.id === maintenance!.id)?.calculationInputs).toMatchObject({ jurisdictionNeutral: true });
    expect(audits.some(event => event.eventType === "projects.project_transitioned")).toBe(true);
    expect(audits.some(event => event.eventType === "assets.maintenance_transitioned")).toBe(true);
    expect(audits.some(event => event.eventType === "assets.asset_created" && (event.payload as { assetTag?: string; capturedSourceFactKeys?: string[]; noCapitalization?: boolean; noDepreciationCalculation?: boolean; noValuationCalculation?: boolean; noJournalPosting?: boolean; noExternalEffect?: boolean }).assetTag === sourceFactAssetTag && (event.payload as { capturedSourceFactKeys?: string[] }).capturedSourceFactKeys?.length === 6 && (event.payload as { noCapitalization?: boolean }).noCapitalization === true && (event.payload as { noDepreciationCalculation?: boolean }).noDepreciationCalculation === true && (event.payload as { noValuationCalculation?: boolean }).noValuationCalculation === true && (event.payload as { noJournalPosting?: boolean }).noJournalPosting === true && (event.payload as { noExternalEffect?: boolean }).noExternalEffect === true)).toBe(true);
  }, 20_000);

  it("enforces dedicated service requests and CRM opportunities beyond generic work records", async () => {
    const operator = callerFor(operatorUserId, operatorOpenId); const admin = callerFor(1, "owner");
    const masters = await operator.master.list({ ventureId });
    let customer = masters.find(master => master.domain === "customer" && master.code === "VALIDATION-E2E-SERVICE-CRM-CUSTOMER-20260824");
    if (!customer) customer = await operator.master.create({ ventureId, domain: "customer", code: "VALIDATION-E2E-SERVICE-CRM-CUSTOMER-20260824", name: "VALIDATION-ONLY service and CRM customer", attributes: { validationOnly: true } });
    let request = (await operator.serviceCrm.serviceRequests({ ventureId })).find(row => row.requestNumber === "VALIDATION-E2E-SERVICE-CALC-20260824");
    if (!request) request = await operator.serviceCrm.createServiceRequest({ ventureId, requestNumber: "VALIDATION-E2E-SERVICE-CALC-20260824", customerMasterId: customer.id, title: "VALIDATION-ONLY calculation-input service request", severity: "normal", requestedDate: "2026-08-24", calculationInputs: { internalBasis: "4", jurisdictionNeutral: true }, attributes: { validationOnly: true, noExternalDispatch: true } });
    if (request.status === "draft") await operator.serviceCrm.transitionServiceRequest({ ventureId, serviceRequestId: request.id, targetStatus: "submitted" });
    if (request.status === "draft" || request.status === "submitted") await operator.serviceCrm.transitionServiceRequest({ ventureId, serviceRequestId: request.id, targetStatus: "triaged" });
    let opportunity = (await operator.serviceCrm.opportunities({ ventureId })).find(row => row.opportunityNumber === "VALIDATION-E2E-OPPORTUNITY-CALC-20260824");
    if (!opportunity) opportunity = await operator.serviceCrm.createOpportunity({ ventureId, opportunityNumber: "VALIDATION-E2E-OPPORTUNITY-CALC-20260824", customerMasterId: customer.id, name: "VALIDATION-ONLY calculation-input opportunity", estimatedAmount: 100, currency: "USD", calculationInputs: { internalBasis: "100", jurisdictionNeutral: true }, attributes: { validationOnly: true, noExternalCrmAction: true } });
    if (opportunity.stage === "draft") await expect(operator.serviceCrm.transitionOpportunity({ ventureId, opportunityId: opportunity.id, targetStage: "qualified" })).rejects.toThrow();
    if (opportunity.stage === "draft") await admin.serviceCrm.transitionOpportunity({ ventureId, opportunityId: opportunity.id, targetStage: "qualified" });
    const audits = await admin.audit({ ventureId });
    expect((await admin.serviceCrm.serviceRequests({ ventureId })).find(row => row.id === request!.id)?.status).toBe("triaged");
    expect((await admin.serviceCrm.serviceRequests({ ventureId })).find(row => row.id === request!.id)?.calculationInputs).toMatchObject({ jurisdictionNeutral: true });
    expect((await admin.serviceCrm.opportunities({ ventureId })).find(row => row.id === opportunity!.id)?.stage).toBe("qualified");
    expect((await admin.serviceCrm.opportunities({ ventureId })).find(row => row.id === opportunity!.id)?.calculationInputs).toMatchObject({ jurisdictionNeutral: true });
    expect(audits.some(event => event.eventType === "service.request_transitioned")).toBe(true);
    expect(audits.some(event => event.eventType === "crm.opportunity_transitioned")).toBe(true);
  }, 20_000);
});
