import { describe, expect, it, vi } from "vitest";

vi.mock("../erp/service", () => ({
  listOperationalRecords: vi.fn(),
  createOperationalRecord: vi.fn(),
  getOperationalDashboard: vi.fn(),
  getAccessiblePortfolioDashboard: vi.fn(),
  listMasterRecords: vi.fn(),
  createMasterRecord: vi.fn(),
  getVentureCurrencyPolicy: vi.fn(),
  setVentureReportingCurrency: vi.fn(),
  listAccountingPeriods: vi.fn(),
  createAccountingPeriod: vi.fn(),
  closeAccountingPeriod: vi.fn(),
  listTaxPolicies: vi.fn(),
  createTaxPolicy: vi.fn(),
  activateTaxPolicy: vi.fn(),
  listBudgetEnvelopes: vi.fn(),
  createBudgetEnvelope: vi.fn(),
  activateBudgetEnvelope: vi.fn(),
  transitionOperationalRecord: vi.fn(),
  createLedgerEntry: vi.fn(),
  listJournals: vi.fn(),
  createJournal: vi.fn(),
  postJournal: vi.fn(),
  listAccountingControl: vi.fn(),
  createPostingRuleRevision: vi.fn(),
  approvePostingRuleRevision: vi.fn(),
  evaluateAccountingEventToProposal: vi.fn(),
  simulateAccountingEvent: vi.fn(),
  createAccountingCalculationEvidence: vi.fn(),
  listAccountingCalculationEvidence: vi.fn(),
  verifyAccountingCalculationEvidenceChain: vi.fn(),
  getControlledFinanceReporting: vi.fn(),
  reviewJournalProposal: vi.fn(),
  listAccountClassificationRevisions: vi.fn(),
  createAccountClassificationRevision: vi.fn(),
  approveAccountClassificationRevision: vi.fn(),
  listFinanceDimensions: vi.fn(),
  createFinanceDimensionDefinition: vi.fn(),
  activateFinanceDimensionDefinition: vi.fn(),
  createFinanceDimensionValue: vi.fn(),
  activateFinanceDimensionValue: vi.fn(),
  listInventoryBalances: vi.fn(),
  listInventoryMovements: vi.fn(),
  recordInventoryMovement: vi.fn(),
  receivePurchaseOrder: vi.fn(),
  convertProcurementRequestToPurchaseOrder: vi.fn(),
  reserveSalesOrderInventory: vi.fn(),
  fulfillSalesOrderInventory: vi.fn(),
  listInvoiceSettlements: vi.fn(),
  listInvoiceAging: vi.fn(),
  createInvoiceRecord: vi.fn(),
  evaluatePayableInvoiceThreeWayMatch: vi.fn(),
  approveMatchedPayableInvoice: vi.fn(),
  createInternalPaymentRecord: vi.fn(),
  listWorkflowDefinitions: vi.fn(),
  createWorkflowDefinition: vi.fn(),
  activateWorkflowDefinition: vi.fn(),
  startWorkflow: vi.fn(),
  listWorkflowInstances: vi.fn(),
  listWorkflowTasks: vi.fn(),
  completeWorkflowTask: vi.fn(),
  listAuditEvents: vi.fn(),
}));
vi.mock("../erp/asia", () => ({
  ASIA_CURRENCY_REFERENCE: [],
  listJurisdictionPacks: vi.fn(),
  createJurisdictionPack: vi.fn(),
  reviewJurisdictionPack: vi.fn(),
  listVentureJurisdictionSelections: vi.fn(),
  selectJurisdictionPack: vi.fn(),
  listCurrencyProfiles: vi.fn(),
  listExchangeRates: vi.fn(),
  createExchangeRate: vi.fn(),
  approveExchangeRate: vi.fn(),
  listBudgetNodes: vi.fn(),
  createBudgetNode: vi.fn(),
  activateBudgetNode: vi.fn(),
  listPayrollCalendars: vi.fn(),
  getPayrollRehearsalPreflight: vi.fn(),
  createPayrollCalendar: vi.fn(),
  activatePayrollCalendar: vi.fn(),
  listPayrollRuns: vi.fn(),
  createPayrollRun: vi.fn(),
  submitPayrollRunForApproval: vi.fn(),
  approvePayrollRun: vi.fn(),
  listIntegrationConnections: vi.fn(),
  createSandboxIntegration: vi.fn(),
  testSandboxIntegration: vi.fn(),
  listIntegrationJobs: vi.fn(),
  queueSandboxIntegrationJob: vi.fn(),
  simulateSandboxIntegrationJob: vi.fn(),
}));
vi.mock("../erp/costing", () => ({
  valuationMethods: ["fifo", "lifo", "moving_average", "weighted_average", "standard_cost", "specific_identification"],
  landedCostCategories: ["freight", "insurance", "customs", "duty", "handling", "miscellaneous"],
  allocationDrivers: ["quantity", "weight", "value", "volume", "manual_finance_approved"],
  listCostingControl: vi.fn(),
  createCostingPolicyRevision: vi.fn(),
  approveCostingPolicyRevision: vi.fn(),
  createReceiptCostLayer: vi.fn(),
  previewInventoryValuation: vi.fn(),
  createLandedCostAllocationEvidence: vi.fn(),
  getCostingValidationReport: vi.fn(),
}));
vi.mock("../platform/tenant", () => ({ requireVentureMembership: vi.fn(), requireVentureRole: vi.fn() }));
vi.mock("../db", () => ({ listVenturesForUser: vi.fn() }));

import * as service from "../erp/service";
import * as asia from "../erp/asia";
import * as costing from "../erp/costing";
import { listVenturesForUser } from "../db";
import { requireVentureMembership, requireVentureRole } from "../platform/tenant";
import type { TrpcContext } from "../_core/context";
import { erpRouter } from "./erp";

function caller() {
  return erpRouter.createCaller({ user: { id: 7, openId: "operator", email: "operator@example.com", name: "Operator", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });
}

describe("operational ERP router", () => {
  it("requires venture membership before returning operational records", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "viewer", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(service.listOperationalRecords).mockResolvedValue([]);
    await expect(caller().records.list({ ventureId: 21 })).resolves.toEqual([]);
    expect(requireVentureMembership).toHaveBeenCalledWith(7, 21);
  });
  it("returns expanded real-record dashboard posture only inside the authorized venture", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "viewer", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(service.getOperationalDashboard).mockResolvedValue({ taxBudget: { activeTaxPolicies: 1 }, peoplePayroll: { activeEmployees: 1 }, delivery: { activeProjects: 1 }, assetsService: { inServiceAssets: 1 }, portfolio: { controlledDomains: 8 } } as never);
    await expect(caller().dashboard({ ventureId: 21 })).resolves.toMatchObject({ taxBudget: { activeTaxPolicies: 1 }, peoplePayroll: { activeEmployees: 1 }, delivery: { activeProjects: 1 }, assetsService: { inServiceAssets: 1 }, portfolio: { controlledDomains: 8 } });
    expect(requireVentureMembership).toHaveBeenCalledWith(7, 21);
    expect(service.getOperationalDashboard).toHaveBeenCalledWith(21);
  });
  it("aggregates portfolio analytics only over ventures accessible to the authenticated caller", async () => {
    vi.mocked(listVenturesForUser).mockResolvedValue([{ id: 21, name: "Allowed one", role: "portfolio_admin" }, { id: 22, name: "Allowed two", role: "viewer" }] as never);
    vi.mocked(service.getAccessiblePortfolioDashboard).mockResolvedValue({ totals: { accessibleVentures: 2, operationalRecords: 3 }, ventures: [{ ventureId: 21 }, { ventureId: 22 }] } as never);
    await expect(caller().portfolioDashboard()).resolves.toMatchObject({ totals: { accessibleVentures: 2 }, ventures: [{ ventureId: 21 }, { ventureId: 22 }] });
    expect(listVenturesForUser).toHaveBeenCalledWith(7);
    expect(service.getAccessiblePortfolioDashboard).toHaveBeenCalledWith([{ id: 21, name: "Allowed one", role: "portfolio_admin" }, { id: 22, name: "Allowed two", role: "viewer" }]);
  });
  it("returns and updates reporting-currency policy only inside the authorized venture", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "finance_lead", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(service.getVentureCurrencyPolicy).mockResolvedValue({ ventureId: 21, baseCurrency: "IDR", reportingCurrency: "USD" } as never);
    vi.mocked(service.setVentureReportingCurrency).mockResolvedValue({ ventureId: 21, baseCurrency: "IDR", reportingCurrency: "USD" } as never);
    await expect(caller().currencyPolicy.get({ ventureId: 21 })).resolves.toMatchObject({ reportingCurrency: "USD" });
    await expect(caller().currencyPolicy.setReportingCurrency({ ventureId: 21, reportingCurrency: "USD" })).resolves.toMatchObject({ reportingCurrency: "USD" });
    expect(service.setVentureReportingCurrency).toHaveBeenCalledWith({ ventureId: 21, reportingCurrency: "USD", actorUserId: 7 });
  });
  it("returns an evidence-only payroll rehearsal preflight after venture membership validation", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "viewer", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(asia.getPayrollRehearsalPreflight).mockResolvedValue({ mode: "non_statutory_readiness_preflight", eligibleForPackDependentRehearsal: false, blockers: ["No effective reviewed pack."], boundaries: { payrollRunCreated: false, payrollCalculated: false, paymentExecuted: false, filingSubmitted: false, complianceClaimed: false } } as never);
    await expect(caller().asia.payroll.rehearsalPreflight({ ventureId: 21, asOfDate: "2026-08-25" })).resolves.toMatchObject({ eligibleForPackDependentRehearsal: false, boundaries: { payrollCalculated: false, paymentExecuted: false, filingSubmitted: false } });
    expect(requireVentureMembership).toHaveBeenCalledWith(7, 21);
    expect(asia.getPayrollRehearsalPreflight).toHaveBeenCalledWith(21, "2026-08-25");
  });
  it("lists workflow instances and forwards a rejected task outcome through tenant-scoped workflow contracts", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "operator", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(service.listWorkflowInstances).mockResolvedValue([{ id: 88, ventureId: 21, workflowDefinitionId: 17, status: "active" }] as never);
    vi.mocked(service.completeWorkflowTask).mockResolvedValue({ id: 99, status: "rejected" } as never);
    await expect(caller().workflow.instances({ ventureId: 21 })).resolves.toMatchObject([{ id: 88, workflowDefinitionId: 17 }]);
    await expect(caller().workflow.completeTask({ ventureId: 21, workflowTaskId: 99, outcome: "rejected" })).resolves.toMatchObject({ status: "rejected" });
    expect(service.listWorkflowInstances).toHaveBeenCalledWith(21);
    expect(service.completeWorkflowTask).toHaveBeenCalledWith({ ventureId: 21, workflowTaskId: 99, outcome: "rejected", actorUserId: 7 });
  });
  it("persists an explicit approved-sales-order event trigger through the governed workflow contract", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "portfolio_admin", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(service.createWorkflowDefinition).mockResolvedValue({ id: 111, status: "draft" } as never);
    await expect(caller().workflow.create({ ventureId: 21, key: "sales_order_approval_trigger", name: "Sales order approval trigger", domain: "sales", definition: { nodes: [{ id: "start", type: "start", title: "Sales order approved" }, { id: "end", type: "end", title: "Evidence complete" }], transitions: [{ from: "start", to: "end" }], trigger: { event: "operational_record.transitioned", domain: "sales", recordType: "sales_order", targetStatus: "approved" } } })).resolves.toMatchObject({ id: 111 });
    expect(service.createWorkflowDefinition).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, createdByUserId: 7, definition: expect.objectContaining({ trigger: { event: "operational_record.transitioned", domain: "sales", recordType: "sales_order", targetStatus: "approved" } }) }));
  });
  it("requires an operational role before creating a transaction", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "viewer", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(requireVentureRole).mockImplementation(() => { throw new Error("FORBIDDEN"); });
    await expect(caller().records.create({ ventureId: 21, domain: "sales", recordType: "sales_order", recordNumber: "SO-1", title: "Test order", amount: 100, effectiveDate: "2026-08-23", data: {} })).rejects.toThrow("FORBIDDEN");
    expect(service.createOperationalRecord).not.toHaveBeenCalled();
  });
  it("forwards cross-border currency and public-budget evidence only after tenant role authorization", async () => {
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "finance_lead", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(service.createOperationalRecord).mockResolvedValue({ id: 33, functionalAmount: 150, status: "draft" } as never);
    await expect(caller().records.create({ ventureId: 21, domain: "finance", recordType: "cross_border_invoice", recordNumber: "CB-1", title: "Cross-border proof", amount: 100, transactionCurrency: "IDR", functionalCurrency: "SGD", exchangeRateId: 44, publicBudgetNodeId: 8, effectiveDate: "2026-08-24", data: { crossBorder: true } })).resolves.toMatchObject({ id: 33, functionalAmount: 150 });
    expect(service.createOperationalRecord).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, transactionCurrency: "IDR", functionalCurrency: "SGD", exchangeRateId: 44, publicBudgetNodeId: 8, createdByUserId: 7 }));
  });
  it("forwards a balanced journal draft only through a finance-authorized tenant route", async () => {
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "finance_lead", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(service.createJournal).mockResolvedValue({ id: 71, status: "draft", debit: 100, credit: 100, lineCount: 2 } as never);
    await expect(caller().journal.create({ ventureId: 21, journalNumber: "JRN-001", accountingPeriodId: 4, currency: "IDR", narrative: "Opening entry", lines: [{ accountMasterId: 10, entrySide: "debit", amount: 100, narrative: "Cash" }, { accountMasterId: 11, entrySide: "credit", amount: 100, narrative: "Capital" }] })).resolves.toMatchObject({ id: 71, status: "draft" });
    expect(service.createJournal).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, accountingPeriodId: 4, currency: "IDR", createdByUserId: 7, lines: expect.arrayContaining([expect.objectContaining({ entrySide: "debit" }), expect.objectContaining({ entrySide: "credit" })]) }));
  });
  it("keeps finance-owned posting rules and journal proposals inside tenant-scoped finance authorization", async () => {
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "finance_lead", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(service.listAccountingControl).mockResolvedValue({ events: [], rules: [{ id: 91, ruleCode: "PROC_RECEIPT", revision: 1, status: "approved", lineConfiguration: [{ entrySide: "debit", accountMasterId: 10, allocationBasisPoints: 10_000, narrative: "Inventory receipt" }, { entrySide: "credit", accountMasterId: 11, allocationBasisPoints: 10_000, narrative: "Receipt clearing" }], requiredDimensions: ["sourceOperationalRecordId"] }], proposals: [] } as never);
    vi.mocked(service.createPostingRuleRevision).mockResolvedValue({ id: 91, revision: 1, status: "draft" } as never);
    vi.mocked(service.approvePostingRuleRevision).mockResolvedValue({ id: 91, status: "approved" } as never);
    vi.mocked(service.createAccountingCalculationEvidence).mockResolvedValue({ id: 93, calculationKey: "CALC-SIM-1", recordHash: "a".repeat(64), status: "completed", simulation: {} } as never);
    vi.mocked(service.listAccountingCalculationEvidence).mockResolvedValue([{ id: 93, calculationKey: "CALC-SIM-1", status: "completed" }] as never);
    vi.mocked(service.verifyAccountingCalculationEvidenceChain).mockResolvedValue({ ventureId: 21, recordCount: 1, valid: true, checks: [], noJournalCreated: true, noAutomaticPosting: true, noExternalEffect: true } as never);
    vi.mocked(service.getControlledFinanceReporting).mockResolvedValue({ ventureId: 21, source: "immutable_calculation_evidence", reportMode: "evidence_activity_not_posted_gl", chainVerification: { valid: true, recordCount: 1 }, current: { trialBalanceActivity: [], generalLedgerActivity: [] }, comparison: null, excludedEvidence: [], formalStatements: { balanceSheet: "not_available_without_governed_account_classification" }, boundary: { noJournalCreated: true, noAutomaticPosting: true, noBalanceMutation: true, noExternalEffect: true } } as never);
    vi.mocked(service.reviewJournalProposal).mockResolvedValue({ id: 92, status: "approved", noJournalCreated: true } as never);
    const overview = await caller().accountingControl.overview({ ventureId: 21 });
    expect(overview.events).toEqual([]);
    const exposedRule = overview.rules[0] as { lineConfiguration: Array<{ allocationBasisPoints: number; entrySide: string }>; requiredDimensions: string[] };
    expect(exposedRule.lineConfiguration[0]).toMatchObject({ entrySide: "debit", allocationBasisPoints: 10_000 });
    expect(exposedRule.requiredDimensions).toEqual(["sourceOperationalRecordId"]);
    await expect(caller().accountingControl.createPostingRuleRevision({ ventureId: 21, ruleCode: "PROC_RECEIPT", ruleName: "Internal procurement receipt", eventType: "procurement_receipt", effectiveFrom: "2026-08-25", debitAccountMasterId: 10, creditAccountMasterId: 11, debitAllocations: [{ accountMasterId: 10, allocationBasisPoints: 6_000, narrative: "Inventory allocation" }, { accountMasterId: 12, allocationBasisPoints: 4_000, narrative: "Receiving allocation" }], changeRationale: "Validation-only controlled mapping" })).resolves.toMatchObject({ id: 91, status: "draft" });
    await expect(caller().accountingControl.approvePostingRuleRevision({ ventureId: 21, postingRuleRevisionId: 91 })).resolves.toMatchObject({ status: "approved" });
    await expect(caller().accountingControl.createCalculationEvidence({ ventureId: 21, accountingEventId: 90, rationale: "Immutable validation evidence only." })).resolves.toMatchObject({ calculationKey: "CALC-SIM-1", status: "completed" });
    await expect(caller().accountingControl.calculationEvidence({ ventureId: 21 })).resolves.toMatchObject([{ calculationKey: "CALC-SIM-1" }]);
    await expect(caller().accountingControl.verifyCalculationEvidenceChain({ ventureId: 21 })).resolves.toMatchObject({ valid: true, noJournalCreated: true, noExternalEffect: true });
    await expect(caller().financeReporting.controlledEvidence({ ventureId: 21, accountingPeriodId: 7, comparisonAccountingPeriodId: 6, accountMasterId: 10 })).resolves.toMatchObject({ source: "immutable_calculation_evidence", reportMode: "evidence_activity_not_posted_gl", boundary: { noJournalCreated: true, noExternalEffect: true } });
    await expect(caller().accountingControl.reviewProposal({ ventureId: 21, journalProposalId: 92, decision: "approved", note: "Internal review only; no journal posting." })).resolves.toMatchObject({ noJournalCreated: true });
    expect(service.createPostingRuleRevision).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, eventType: "procurement_receipt", debitAllocations: [{ accountMasterId: 10, allocationBasisPoints: 6_000, narrative: "Inventory allocation" }, { accountMasterId: 12, allocationBasisPoints: 4_000, narrative: "Receiving allocation" }], createdByUserId: 7 }));
    expect(service.createAccountingCalculationEvidence).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, accountingEventId: 90, actorUserId: 7 }));
    expect(service.listAccountingCalculationEvidence).toHaveBeenCalledWith(21);
    expect(service.verifyAccountingCalculationEvidenceChain).toHaveBeenCalledWith(21);
    expect(service.getControlledFinanceReporting).toHaveBeenCalledWith({ ventureId: 21, accountingPeriodId: 7, comparisonAccountingPeriodId: 6, accountMasterId: 10 });
    expect(service.reviewJournalProposal).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, journalProposalId: 92, decision: "approved", actorUserId: 7 }));
  });
  it("keeps configurable finance dimensions within the active venture and finance authorization", async () => {
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "finance_lead", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(service.listFinanceDimensions).mockResolvedValue([] as never);
    vi.mocked(service.createFinanceDimensionDefinition).mockResolvedValue({ id: 44, status: "draft" } as never);
    vi.mocked(service.activateFinanceDimensionDefinition).mockResolvedValue({ id: 44, status: "active" } as never);
    vi.mocked(service.createFinanceDimensionValue).mockResolvedValue({ id: 45, status: "draft" } as never);
    vi.mocked(service.activateFinanceDimensionValue).mockResolvedValue({ id: 45, status: "active" } as never);
    await expect(caller().financeDimensions.list({ ventureId: 21 })).resolves.toEqual([]);
    await expect(caller().financeDimensions.createDefinition({ ventureId: 21, code: "COST_CENTER", name: "Cost center", requiredForProposal: false })).resolves.toMatchObject({ id: 44 });
    await expect(caller().financeDimensions.activateDefinition({ ventureId: 21, financeDimensionDefinitionId: 44 })).resolves.toMatchObject({ status: "active" });
    await expect(caller().financeDimensions.createValue({ ventureId: 21, financeDimensionDefinitionId: 44, code: "OPS-001", name: "Operations", attributes: {} })).resolves.toMatchObject({ id: 45, status: "draft" });
    await expect(caller().financeDimensions.activateValue({ ventureId: 21, financeDimensionValueId: 45 })).resolves.toMatchObject({ status: "active" });
    expect(service.createFinanceDimensionDefinition).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, code: "COST_CENTER", createdByUserId: 7 }));
    expect(service.createFinanceDimensionValue).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, financeDimensionDefinitionId: 44, code: "OPS-001", createdByUserId: 7 }));
  });
  it("keeps effective-dated account classifications inside finance authorization and forwards no posting instruction", async () => {
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "finance_lead", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(service.listAccountClassificationRevisions).mockResolvedValue([{ id: 61, accountMasterId: 10, classificationFamily: "asset", statementSection: "current_assets", normalBalance: "debit", status: "approved" }] as never);
    vi.mocked(service.createAccountClassificationRevision).mockResolvedValue({ id: 62, revision: 2, status: "draft" } as never);
    vi.mocked(service.approveAccountClassificationRevision).mockResolvedValue({ id: 62, status: "approved" } as never);
    await expect(caller().accountClassifications.list({ ventureId: 21 })).resolves.toMatchObject([{ id: 61, accountMasterId: 10, status: "approved" }]);
    await expect(caller().accountClassifications.createRevision({ ventureId: 21, accountMasterId: 10, classificationFamily: "asset", statementSection: "current_assets", normalBalance: "debit", effectiveFrom: "2026-08-26", rationale: "Classification coverage only" })).resolves.toMatchObject({ id: 62, status: "draft" });
    await expect(caller().accountClassifications.approveRevision({ ventureId: 21, accountClassificationRevisionId: 62 })).resolves.toMatchObject({ status: "approved" });
    expect(service.createAccountClassificationRevision).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, accountMasterId: 10, classificationFamily: "asset", statementSection: "current_assets", normalBalance: "debit", createdByUserId: 7 }));
    expect(service.approveAccountClassificationRevision).toHaveBeenCalledWith({ ventureId: 21, accountClassificationRevisionId: 62, actorUserId: 7 });
  });
  it("allows a finance-authorized actor to request an auditable accounting-period close", async () => {
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "finance_lead", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(service.closeAccountingPeriod).mockResolvedValue({ id: 4, status: "closed" } as never);
    await expect(caller().period.close({ ventureId: 21, accountingPeriodId: 4 })).resolves.toMatchObject({ status: "closed" });
    expect(service.closeAccountingPeriod).toHaveBeenCalledWith({ ventureId: 21, accountingPeriodId: 4, actorUserId: 7 });
  });
  it("forwards an inventory reservation only through the active tenant operational route", async () => {
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "operator", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(service.recordInventoryMovement).mockResolvedValue({ id: 44, movementType: "reserve", availableQuantity: 5 } as never);
    await expect(caller().inventory.recordMovement({ ventureId: 21, itemMasterId: 13, movementType: "reserve", quantity: 2, narrative: "Reserve stock for approved order" })).resolves.toMatchObject({ id: 44, availableQuantity: 5 });
    expect(service.recordInventoryMovement).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, itemMasterId: 13, movementType: "reserve", quantity: 2, createdByUserId: 7 }));
  });
  it("forwards a final approved purchase-order receipt through the tenant operational route", async () => {
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "operator", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(service.receivePurchaseOrder).mockResolvedValue({ purchaseOrderRecordId: 17, inventoryMovementId: 45, status: "fulfilled", finalReceipt: true } as never);
    const sourceFacts = { internalReceiptReference: "VALIDATION-GRN-001", warehouseCode: "WH-JKT-01", costCenterCode: "OPS-001", profitCenterCode: "PC-001", internalOrderCode: "IO-001", projectCode: "PROJ-001", supplierDeliveryReference: "SUP-DEL-001", evidenceReference: "VALIDATION-EVIDENCE-001" };
    await expect(caller().inventory.receivePurchaseOrder({ ventureId: 21, purchaseOrderRecordId: 17, itemMasterId: 13, quantity: 2, narrative: "Final receipt", sourceFacts, finalReceipt: true })).resolves.toMatchObject({ status: "fulfilled", finalReceipt: true });
    expect(service.receivePurchaseOrder).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, purchaseOrderRecordId: 17, itemMasterId: 13, sourceFacts, actorUserId: 7, finalReceipt: true }));
  });
  it("forwards approved procurement-request conversion through the tenant procurement route", async () => {
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "operator", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(service.convertProcurementRequestToPurchaseOrder).mockResolvedValue({ procurementRequestRecordId: 40, purchaseOrderRecordId: 41, purchaseOrderStatus: "draft", requestStatus: "posted" } as never);
    await expect(caller().procurement.convertRequest({ ventureId: 21, procurementRequestRecordId: 40, purchaseOrderNumber: "PO-001", supplierMasterId: 12, title: "Controlled conversion", dueDate: "2026-09-01" })).resolves.toMatchObject({ purchaseOrderRecordId: 41, requestStatus: "posted" });
    expect(service.convertProcurementRequestToPurchaseOrder).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, procurementRequestRecordId: 40, purchaseOrderNumber: "PO-001", supplierMasterId: 12, actorUserId: 7 }));
  });
  it("forwards order-linked inventory reservation and final fulfillment through tenant sales routes", async () => {
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "operator", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(service.reserveSalesOrderInventory).mockResolvedValue({ salesOrderRecordId: 41, inventoryMovementId: 61, availableQuantity: 3 } as never);
    vi.mocked(service.fulfillSalesOrderInventory).mockResolvedValue({ salesOrderRecordId: 41, issueMovementId: 63, status: "fulfilled", finalFulfillment: true } as never);
    await expect(caller().sales.reserveInventory({ ventureId: 21, salesOrderRecordId: 41, itemMasterId: 13, quantity: 2, narrative: "Reserve approved order stock" })).resolves.toMatchObject({ inventoryMovementId: 61 });
    await expect(caller().sales.fulfillInventory({ ventureId: 21, salesOrderRecordId: 41, itemMasterId: 13, quantity: 2, narrative: "Controlled internal fulfillment evidence", sourceFacts: { internalFulfillmentReference: "FUL-INT-001", warehouseCode: "WH-JKT-01", costCenterCode: "OPS-001", projectCode: "PROJ-001", customerDeliveryReference: "CUSTOMER-DEL-01", evidenceReference: "EVID-FUL-01" }, finalFulfillment: true })).resolves.toMatchObject({ status: "fulfilled" });
    expect(service.reserveSalesOrderInventory).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, salesOrderRecordId: 41, itemMasterId: 13, actorUserId: 7 }));
    expect(service.fulfillSalesOrderInventory).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, salesOrderRecordId: 41, itemMasterId: 13, actorUserId: 7, sourceFacts: { internalFulfillmentReference: "FUL-INT-001", warehouseCode: "WH-JKT-01", costCenterCode: "OPS-001", projectCode: "PROJ-001", customerDeliveryReference: "CUSTOMER-DEL-01", evidenceReference: "EVID-FUL-01" }, finalFulfillment: true }));
  });
  it("forwards customer-linked invoice and internal payment evidence through finance-authorized tenant routes", async () => {
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "finance_lead", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(service.createInvoiceRecord).mockResolvedValue({ id: 62, recordType: "receivable_invoice", status: "draft" } as never);
    vi.mocked(service.createInternalPaymentRecord).mockResolvedValue({ id: 63, recordType: "payment_record", status: "draft" } as never);
    await expect(caller().invoice.create({ ventureId: 21, invoiceType: "receivable_invoice", recordNumber: "AR-001", title: "Controlled receivable", counterpartyMasterId: 12, amount: 100, effectiveDate: "2026-08-24", data: {} })).resolves.toMatchObject({ id: 62 });
    await expect(caller().invoice.createPaymentRecord({ ventureId: 21, recordNumber: "PAY-001", title: "Internal payment evidence", invoiceRecordId: 62, amount: 100, effectiveDate: "2026-08-24", data: {} })).resolves.toMatchObject({ id: 63 });
    expect(service.createInvoiceRecord).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, invoiceType: "receivable_invoice", counterpartyMasterId: 12, createdByUserId: 7 }));
    expect(service.createInternalPaymentRecord).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, invoiceRecordId: 62, createdByUserId: 7 }));
  });
  it("returns internal invoice aging only after membership validation and forwards the as-of date", async () => {
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "operator", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(service.listInvoiceAging).mockResolvedValue({ asOfDate: "2026-08-25", invoices: [], summary: {} } as never);
    await expect(caller().invoice.aging({ ventureId: 21, asOfDate: "2026-08-25" })).resolves.toMatchObject({ asOfDate: "2026-08-25" });
    expect(service.listInvoiceAging).toHaveBeenCalledWith(21, "2026-08-25");
  });
  it("forwards a supplier invoice reference only through the tenant-scoped payable invoice contract", async () => {
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "finance_lead", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(service.createInvoiceRecord).mockResolvedValue({ id: 74, recordType: "payable_invoice", status: "draft" } as never);
    await expect(caller().invoice.create({ ventureId: 21, invoiceType: "payable_invoice", recordNumber: "AP-REF-001", title: "Controlled payable reference", counterpartyMasterId: 15, amount: 100, effectiveDate: "2026-08-25", supplierInvoiceReference: "SUP-REF-001", data: {} })).resolves.toMatchObject({ id: 74 });
    expect(service.createInvoiceRecord).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, invoiceType: "payable_invoice", counterpartyMasterId: 15, supplierInvoiceReference: "SUP-REF-001", createdByUserId: 7 }));
  });
  it("forwards internal payable three-way-match evidence only through a finance-authorized tenant route", async () => {
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "finance_lead", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(service.evaluatePayableInvoiceThreeWayMatch).mockResolvedValue({ payableInvoiceRecordId: 72, status: "matched", receiptCount: 1, noPaymentExecution: true } as never);
    await expect(caller().invoice.evaluateThreeWayMatch({ ventureId: 21, payableInvoiceRecordId: 72, purchaseOrderRecordId: 73 })).resolves.toMatchObject({ status: "matched", noPaymentExecution: true });
    expect(service.evaluatePayableInvoiceThreeWayMatch).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, payableInvoiceRecordId: 72, purchaseOrderRecordId: 73, actorUserId: 7 }));
  });
  it("forwards matched-only payable approval through a finance-authorized tenant route", async () => {
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "finance_lead", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(service.approveMatchedPayableInvoice).mockResolvedValue({ id: 72, from: "pending_approval", to: "approved" } as never);
    await expect(caller().invoice.approveMatchedPayable({ ventureId: 21, payableInvoiceRecordId: 72, note: "Matched internal evidence reviewed" })).resolves.toMatchObject({ to: "approved" });
    expect(service.approveMatchedPayableInvoice).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, payableInvoiceRecordId: 72, actorUserId: 7, note: "Matched internal evidence reviewed" }));
  });
  it("forwards finance-authorized Costing Engine policy, valuation preview, and landed-cost allocation inputs without a posting route", async () => {
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "finance_lead", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(costing.createCostingPolicyRevision).mockResolvedValue({ id: 88, revision: 1, status: "draft", noValuationPosting: true } as never);
    vi.mocked(costing.previewInventoryValuation).mockResolvedValue({ id: 89, calculationKey: "COST-VALUATION-TEST", recordHash: "a".repeat(64), status: "completed" } as never);
    vi.mocked(costing.createLandedCostAllocationEvidence).mockResolvedValue({ id: 90, calculationKey: "COST-ALLOC-TEST", recordHash: "b".repeat(64), status: "completed" } as never);
    await expect(caller().costing.createPolicyRevision({ ventureId: 21, policyCode: "INV-VAL", policyName: "Inventory FIFO", costDomain: "inventory", valuationMethod: "fifo", effectiveFrom: "2026-08-26", policyConfiguration: {}, sourceRequirements: {}, rationale: "Validation-only finance policy" })).resolves.toMatchObject({ noValuationPosting: true });
    await caller().costing.previewValuation({ ventureId: 21, itemMasterId: 13, costingPolicyRevisionId: 88, costingDate: "2026-08-26", issueQuantity: 2, rationale: "Validation-only read-only preview" });
    await caller().costing.allocateLandedCost({ ventureId: 21, costingPolicyRevisionId: 88, costingDate: "2026-08-26", landedCostCategory: "freight", allocationDriver: "quantity", totalAmount: 10, currency: "USD", targetCostLayerIds: [101, 102], rationale: "Validation-only deterministic allocation" });
    expect(costing.createCostingPolicyRevision).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, policyCode: "INV-VAL", valuationMethod: "fifo", createdByUserId: 7 }));
    expect(costing.previewInventoryValuation).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, itemMasterId: 13, costingPolicyRevisionId: 88, actorUserId: 7 }));
    expect(costing.createLandedCostAllocationEvidence).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, landedCostCategory: "freight", allocationDriver: "quantity", targetCostLayerIds: [101, 102], actorUserId: 7 }));
  });
  it("forwards a selected public-budget jurisdiction pack only through a finance-authorized venture route", async () => {
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "finance_lead", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(asia.createBudgetNode).mockResolvedValue({ id: 8, jurisdictionPackId: 9, status: "draft" } as never);
    await caller().asia.publicBudget.create({ ventureId: 21, jurisdictionPackId: 9, level: "agency", code: "PUBLIC-TEST", name: "Public budget validation", currency: "IDR", appropriatedAmount: 100, attributes: {} });
    expect(asia.createBudgetNode).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, jurisdictionPackId: 9, createdByUserId: 7 }));
  });
  it("surfaces public-budget pack applicability rejection through the tenant-scoped API", async () => {
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "finance_lead", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(asia.createBudgetNode).mockRejectedValue(new Error("An active public budget jurisdiction-pack selection is required in the active venture."));
    await expect(caller().asia.publicBudget.create({ ventureId: 21, jurisdictionPackId: 99, level: "agency", code: "PUBLIC-DENIED", name: "Denied public budget", currency: "IDR", appropriatedAmount: 100, attributes: {} })).rejects.toThrow("An active public budget jurisdiction-pack selection is required in the active venture.");
  });
  it("surfaces payroll pack applicability rejection through the tenant-scoped API", async () => {
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "finance_lead", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(asia.createPayrollCalendar).mockRejectedValue(new Error("An active payroll jurisdiction-pack selection is required in the active venture."));
    await expect(caller().asia.payroll.createCalendar({ ventureId: 21, jurisdictionPackId: 99, code: "PAYROLL-DENIED", name: "Denied payroll", cadence: "monthly", workerCategory: "employee", currency: "IDR" })).rejects.toThrow("An active payroll jurisdiction-pack selection is required in the active venture.");
  });
  it("refuses a cross-border create request from a caller without an operational venture role", async () => {
    vi.mocked(service.createOperationalRecord).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "viewer", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(requireVentureRole).mockImplementation(() => { throw new Error("FORBIDDEN"); });
    await expect(caller().records.create({ ventureId: 21, domain: "finance", recordType: "cross_border_invoice", recordNumber: "CB-DENIED", title: "Denied cross-border proof", amount: 100, transactionCurrency: "IDR", functionalCurrency: "SGD", exchangeRateId: 44, publicBudgetNodeId: 8, effectiveDate: "2026-08-24", data: { crossBorder: true } })).rejects.toThrow("FORBIDDEN");
    expect(service.createOperationalRecord).not.toHaveBeenCalled();
  });
  it("requires an active venture role before a country pack can be created", async () => {
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "finance_lead", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(asia.createJurisdictionPack).mockResolvedValue({ id: 9, countryCode: "SG", status: "draft" } as never);
    await caller().asia.jurisdiction.create({ ventureId: 21, countryCode: "SG", version: "0.1.0", name: "Singapore draft", effectiveFrom: "2026-01-01", sourceLinks: ["https://www.iras.gov.sg/"], configuration: {}, testEvidence: {} });
    expect(requireVentureMembership).toHaveBeenCalledWith(7, 21);
    expect(asia.createJurisdictionPack).toHaveBeenCalledWith(expect.objectContaining({ countryCode: "SG", createdByUserId: 7 }));
  });
  it("accepts only a declared sandbox adapter request through the governed route", async () => {
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "finance_lead", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(asia.createSandboxIntegration).mockResolvedValue({ id: 4, mode: "sandbox", status: "configured" } as never);
    const result = await caller().asia.integration.configureSandbox({ ventureId: 21, adapterFamily: "banking", provider: "Bank sandbox", contractVersion: "v1", configuration: {} });
    expect(result).toMatchObject({ mode: "sandbox" });
    expect(asia.createSandboxIntegration).toHaveBeenCalledWith(expect.objectContaining({ ventureId: 21, adapterFamily: "banking", createdByUserId: 7 }));
  });
  it("queues a sandbox-only adapter job with an optional BPMN approval reference", async () => {
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "finance_lead", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(asia.queueSandboxIntegrationJob).mockResolvedValue({ id: 14, status: "awaiting_approval", workflowInstanceId: 90, simulated: true } as never);
    const result = await caller().asia.integration.queueJob({ ventureId: 21, integrationConnectionId: 4, workflowDefinitionId: 3, operationalRecordId: 8, requestPayload: { purpose: "banking evidence" } });
    expect(result).toMatchObject({ status: "awaiting_approval", simulated: true });
    expect(asia.queueSandboxIntegrationJob).toHaveBeenCalledWith(expect.objectContaining({ integrationConnectionId: 4, workflowDefinitionId: 3, operationalRecordId: 8, createdByUserId: 7 }));
  });
  it("submits a calculated payroll proposal to the separate-reviewer approval stage", async () => {
    vi.mocked(requireVentureRole).mockReset();
    vi.mocked(requireVentureMembership).mockResolvedValue({ id: 1, userId: 7, ventureId: 21, role: "finance_lead", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(asia.submitPayrollRunForApproval).mockResolvedValue({ payrollRunId: 6, status: "pending_approval" } as never);
    await expect(caller().asia.payroll.submitRun({ ventureId: 21, payrollRunId: 6 })).resolves.toMatchObject({ status: "pending_approval" });
    expect(asia.submitPayrollRunForApproval).toHaveBeenCalledWith({ ventureId: 21, payrollRunId: 6, actorUserId: 7 });
  });
});
