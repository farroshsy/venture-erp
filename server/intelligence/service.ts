import { eq } from "drizzle-orm";
import {
  erpAssets,
  erpAuditEvents,
  erpCrmOpportunities,
  erpEmployeeProfiles,
  erpInventoryBalances,
  erpInventoryMovements,
  erpItemMasterProfiles,
  erpOperationalRecords,
  erpProjects,
  erpServiceRequests,
  erpSupplierMasterProfiles,
  erpWorkflowDefinitions,
  erpWorkflowTasks,
} from "../../drizzle/schema";
import { getDb } from "../db";

export type MetricCategory = "company_value" | "growth" | "sales" | "customer_success" | "product" | "marketplace" | "saas" | "finance" | "engineering" | "ai" | "marketing" | "operations" | "people" | "security_compliance" | "investor";
export type MetricStatus = "observed" | "partially_supported" | "blocked" | "not_modeled";
type MetricValueType = "count" | "currency" | "percentage" | "ratio" | "duration" | "score" | "text";

type MetricDefinition = {
  key: string;
  name: string;
  definitionVersion: string;
  effectiveFrom: string;
  category: MetricCategory;
  owner: string;
  question: string;
  formula: string;
  valueType: MetricValueType;
  timeGrain: string;
  requiredEvidence: string[];
  dependencies: string[];
  collectionRequirement: string;
  preferredStatus: MetricStatus;
  observedKey?: string;
};

const categoryMetadata: Record<MetricCategory, { label: string; owner: string; question: string; collectionRequirement: string }> = {
  company_value: { label: "Company value", owner: "Finance leadership", question: "How valuable is the business?", collectionRequirement: "Add finance-approved revenue recognition, cost, cash-flow, capitalization, and valuation-policy evidence before computing a company-value measure." },
  growth: { label: "Growth", owner: "Executive and finance leadership", question: "How fast is the business changing?", collectionRequirement: "Retain period-aligned, approved recurring-revenue and customer-cohort facts before calculating growth or trend metrics." },
  sales: { label: "Sales", owner: "Sales leadership", question: "Can the venture create repeatable demand?", collectionRequirement: "Capture lead stages, qualified dates, owner, expected value, closed outcomes, and sales-cycle timestamps in a governed CRM source contract." },
  customer_success: { label: "Customer success", owner: "Customer success leadership", question: "Can the venture keep and expand customers?", collectionRequirement: "Add customer contract, renewal, cancellation, support-case, satisfaction, and customer-health evidence with approved cohort rules." },
  product: { label: "Product", owner: "Product leadership", question: "Do users reach and repeat product value?", collectionRequirement: "Add privacy-reviewed product event instrumentation, a session model, identity consent rules, and versioned activation/funnel definitions." },
  marketplace: { label: "Marketplace operations", owner: "Marketplace leadership", question: "Does the marketplace reliably match supply and demand?", collectionRequirement: "Add order, listing, participant-role, fulfillment, return, and marketplace-fee source contracts before computing marketplace metrics." },
  saas: { label: "SaaS economics", owner: "Finance and revenue operations", question: "Is recurring software revenue healthy and efficient?", collectionRequirement: "Add subscription contracts, plan/seat history, billing lifecycle, recurring-revenue policy, and approved revenue/cost evidence." },
  finance: { label: "Finance", owner: "Finance leadership", question: "Is the operating model financially sustainable?", collectionRequirement: "Add separately governed ledger, cash, debt, deferred-revenue, revenue-recognition, and financial-statement evidence before deriving financial health metrics." },
  engineering: { label: "Engineering", owner: "Engineering leadership", question: "Can the product be changed and operated reliably?", collectionRequirement: "Connect approved CI/CD, incident, observability, and infrastructure-cost evidence through a tenant-scoped, read-only ingestion contract." },
  ai: { label: "AI product", owner: "AI product and engineering leadership", question: "Is AI useful, reliable, and economical?", collectionRequirement: "Capture privacy-reviewed AI request, model, latency, cost, outcome, user-feedback, and human-override evidence before computing AI metrics." },
  marketing: { label: "Marketing", owner: "Marketing leadership", question: "Can the venture acquire qualified demand efficiently?", collectionRequirement: "Connect approved campaign, spend, web-attribution, email, search, and brand-measurement evidence with clear attribution and consent rules." },
  operations: { label: "Operations", owner: "Operations leadership", question: "Are internal flows reliable and efficient?", collectionRequirement: "Use retained order, procurement, inventory, workflow, service, and fulfillment evidence; add explicit SLA/return/vendor-performance policy contracts for missing measures." },
  people: { label: "People", owner: "People leadership", question: "Can the venture hire, retain, and develop its workforce?", collectionRequirement: "Add consented HR lifecycle, recruiting, training, engagement, and voluntary-turnover evidence under jurisdiction-aware people-data governance." },
  security_compliance: { label: "Security and compliance", owner: "Security and risk leadership", question: "Is enterprise risk visible and controlled?", collectionRequirement: "Connect approved security, vulnerability, audit, incident, and policy-evidence sources; do not infer compliance from an absent system." },
  investor: { label: "Investor readiness", owner: "Executive leadership", question: "Can investment questions be answered with evidence?", collectionRequirement: "Define market, capitalization, customer concentration, expansion, cash, and defensibility evidence contracts before computing investor metrics." },
};

const rawCatalog: Record<MetricCategory, string[]> = {
  company_value: ["ARR", "MRR", "Revenue", "Gross Profit", "Net Profit", "EBITDA", "Free Cash Flow", "Enterprise Value", "Valuation", "Revenue Multiple", "Profit Multiple", "Price-to-Sales", "Price-to-Earnings"],
  growth: ["Weekly Growth", "Monthly Growth", "Quarterly Growth", "Year-over-Year Growth", "Compound Monthly Growth Rate", "CAGR", "Net New Customers", "Net New ARR", "Net New MRR", "Revenue Growth"],
  sales: ["Pipeline Value", "Qualified Leads", "Sales Qualified Leads", "Opportunities", "Win Rate", "Close Rate", "Average Deal Size", "Sales Cycle", "Proposal Acceptance", "Demo-to-Close Rate", "Revenue per Salesperson", "Quota Attainment", "Active Paying Customers", "Active Subscriptions", "ACV", "TCV"],
  customer_success: ["Logo Churn", "Revenue Churn", "Net Revenue Retention", "Gross Revenue Retention", "Expansion Revenue", "Upsell Rate", "Cross-Sell Rate", "Renewal Rate", "Renewal Timing", "Customer Health Score", "Time to Resolution", "First Response Time", "Customer Satisfaction", "Net Promoter Score", "Subscriber Churn"],
  product: ["Account Creation Rate", "Email Verification Rate", "Onboarding Completion", "Time to First Value", "First Successful Action", "Session Length", "Session Frequency", "Feature Adoption", "Tutorial Completion", "Feature Abandonment", "Daily Feature Usage", "Click-Through Rate", "Task Completion Rate", "Funnel Completion", "Search Success Rate", "Export Rate", "AI Feature Usage", "Power-User Percentage", "Daily Active Users", "Weekly Active Users", "Monthly Active Users", "DAU/MAU Stickiness", "Returning Users", "Push Notification Open Rate"],
  marketplace: ["Marketplace Liquidity", "Fill Rate", "Match Rate", "Take Rate", "Seller Retention", "Buyer Retention", "GMV", "Repeat Purchase Rate", "Inventory Utilization"],
  saas: ["ARPA", "ARPU", "ARPPU", "Seat Expansion", "License Utilization", "Gross Margin", "Contribution Margin", "Rule of 40", "Magic Number", "SaaS Quick Ratio", "CAC Payback", "Burn Multiple", "Free-to-Paid Conversion", "Trial-to-Paid Conversion", "Upgrade Rate", "Downgrade Rate", "Refund Rate", "Payment Success Rate"],
  finance: ["Cash Balance", "Runway", "Burn Rate", "Operating Margin", "Net Margin", "Debt Ratio", "Working Capital", "Current Ratio", "Accounts Receivable Aging", "Deferred Revenue", "Revenue Recognition", "Tax Exposure", "Monthly Expenses", "Revenue Concentration", "Open Payable Invoices", "Open Receivable Invoices", "Internal Payment Evidence", "Payable Match Success", "Payable Match Exceptions"],
  engineering: ["Deployment Frequency", "Lead Time for Changes", "Change Failure Rate", "Mean Time to Recovery", "Crash Rate", "Error Rate", "Latency", "Availability", "Uptime", "API Success Rate", "Infrastructure Cost", "Cost per Request", "Support Tickets", "Support Backlog"],
  ai: ["Cost per Inference", "GPU Utilization", "Prompt Success Rate", "Hallucination Rate", "AI Acceptance Rate", "User Correction Rate", "Token Cost", "Token Revenue", "AI Latency", "Human Override Rate"],
  marketing: ["Website Visitors", "App Store Impressions", "Store Page Conversion Rate", "Install Rate", "Cost Per Click", "Cost Per Install", "Customer Acquisition Cost", "Organic versus Paid Traffic", "Referral Rate", "Virality Coefficient", "Influencer ROI", "Channel Attribution", "CPM", "Cost Per Acquisition", "ROAS", "CTR", "Impression Share", "Email Open Rate", "Email Click Rate", "Organic Traffic", "Keyword Rankings", "Share of Voice", "Brand Search Volume"],
  operations: ["SLA Compliance", "Procurement Cycle Time", "Vendor Performance", "Inventory Turnover", "Order Fulfillment Time", "Return Rate", "Automation Rate", "Purchase Orders", "Sales Orders", "Inventory Movements", "Tracked Inventory Balances", "Active Workflow Definitions", "Pending Workflow Tasks", "Operational Audit Events", "Active Canonical Resources", "Reconciled Canonical Obligations"],
  people: ["Employee Retention", "Voluntary Turnover", "Hiring Velocity", "Offer Acceptance Rate", "Time to Hire", "Diversity Metrics", "Employee Engagement", "Training Completion", "Employee Profiles", "Active Projects", "Active Assets", "Open Service Requests", "Open CRM Opportunities"],
  security_compliance: ["Security Incidents", "Mean Time to Detect", "Mean Time to Respond", "Vulnerability Age", "Patch Compliance", "Audit Findings", "Compliance Coverage", "Risk Score", "Policy Exceptions"],
  investor: ["Growth Efficiency", "Revenue Predictability", "Customer Concentration", "Expansion from Existing Customers", "Cash Needed Before Profitability", "TAM", "SAM", "SOM", "Defensibility", "Enterprise Customers Added"],
};

const observedKeys: Record<string, string> = {
  "Open Payable Invoices": "open_payable_invoices", "Open Receivable Invoices": "open_receivable_invoices", "Internal Payment Evidence": "posted_internal_payment_evidence", "Payable Match Success": "matched_payables", "Payable Match Exceptions": "mismatched_payables", "Purchase Orders": "purchase_orders", "Sales Orders": "sales_orders", "Inventory Movements": "inventory_movements", "Tracked Inventory Balances": "inventory_balances", "Active Workflow Definitions": "active_workflow_definitions", "Pending Workflow Tasks": "pending_workflow_tasks", "Operational Audit Events": "audit_events", "Employee Profiles": "employee_profiles", "Active Projects": "active_projects", "Active Assets": "active_assets", "Open Service Requests": "open_service_requests", "Open CRM Opportunities": "open_crm_opportunities", "Active Canonical Resources": "active_item_profiles",
};

function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""); }
function metricQuestion(category: MetricCategory, name: string) { return `${categoryMetadata[category].question} ${name} provides one governed diagnostic signal.`; }
function defaultFormula(name: string, status: MetricStatus) { return status === "not_modeled" ? `A metric-specific governed formula for ${name} is not yet modeled because its required evidence source contract is unavailable.` : `Derived only from the retained evidence and time window stated in this metric's lineage; no unavailable data is estimated.`; }
function defaultEvidence(category: MetricCategory) { return category === "operations" || category === "finance" ? ["tenant-scoped operational records", "tenant-scoped audit evidence"] : [`approved ${categoryMetadata[category].label.toLowerCase()} source contract`]; }

export const metricCatalog: MetricDefinition[] = Object.entries(rawCatalog).flatMap(([category, names]) => names.map(name => {
  const typedCategory = category as MetricCategory;
  const observedKey = observedKeys[name];
  const preferredStatus: MetricStatus = observedKey ? "observed" : typedCategory === "operations" || typedCategory === "finance" || typedCategory === "sales" || typedCategory === "people" ? "partially_supported" : "not_modeled";
  return { key: `${typedCategory}.${slug(name)}`, name, definitionVersion: "0.1", effectiveFrom: "2026-08-27", category: typedCategory, owner: categoryMetadata[typedCategory].owner, question: metricQuestion(typedCategory, name), formula: defaultFormula(name, preferredStatus), valueType: name.includes("Rate") || name.includes("Margin") || name.includes("Ratio") || name.includes("Retention") || name.includes("Churn") || name.includes("Conversion") ? "percentage" : name.includes("Time") || name.includes("Cycle") || name.includes("Latency") ? "duration" : name.includes("Cost") || name.includes("Revenue") || name.includes("Value") || name.includes("Profit") || name.includes("ARR") || name.includes("MRR") || name.includes("GMV") || name.includes("Cash") || name.includes("Debt") ? "currency" : "count", timeGrain: "Current tenant-scoped retained-evidence view; metric-specific historical grain is shown only when modeled.", requiredEvidence: defaultEvidence(typedCategory), dependencies: [], collectionRequirement: categoryMetadata[typedCategory].collectionRequirement, preferredStatus, observedKey };
}));

type ObservedMetric = { value: number; evidence: Array<{ source: string; recordCount: number }>; formula: string; detail?: string };

export async function getDecisionIntelligenceOverview(ventureId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  const [records, balances, movements, workflowDefinitions, workflowTasks, auditEvents, employeeProfiles, projects, assets, serviceRequests, opportunities, itemProfiles, supplierProfiles] = await Promise.all([
    db.select().from(erpOperationalRecords).where(eq(erpOperationalRecords.ventureId, ventureId)),
    db.select().from(erpInventoryBalances).where(eq(erpInventoryBalances.ventureId, ventureId)),
    db.select().from(erpInventoryMovements).where(eq(erpInventoryMovements.ventureId, ventureId)),
    db.select().from(erpWorkflowDefinitions).where(eq(erpWorkflowDefinitions.ventureId, ventureId)),
    db.select().from(erpWorkflowTasks).where(eq(erpWorkflowTasks.ventureId, ventureId)),
    db.select().from(erpAuditEvents).where(eq(erpAuditEvents.ventureId, ventureId)),
    db.select().from(erpEmployeeProfiles).where(eq(erpEmployeeProfiles.ventureId, ventureId)),
    db.select().from(erpProjects).where(eq(erpProjects.ventureId, ventureId)),
    db.select().from(erpAssets).where(eq(erpAssets.ventureId, ventureId)),
    db.select().from(erpServiceRequests).where(eq(erpServiceRequests.ventureId, ventureId)),
    db.select().from(erpCrmOpportunities).where(eq(erpCrmOpportunities.ventureId, ventureId)),
    db.select().from(erpItemMasterProfiles).where(eq(erpItemMasterProfiles.ventureId, ventureId)),
    db.select().from(erpSupplierMasterProfiles).where(eq(erpSupplierMasterProfiles.ventureId, ventureId)),
  ]);
  const invoices = records.filter(record => record.recordType === "payable_invoice" || record.recordType === "receivable_invoice");
  const postedPayments = records.filter(record => record.recordType === "payment_record" && ["posted", "fulfilled", "closed"].includes(record.status));
  const settlements = invoices.map(invoice => ({ invoice, settledAmount: postedPayments.filter(payment => Number((payment.data as { invoiceRecordId?: unknown }).invoiceRecordId) === invoice.id).reduce((total, payment) => total + Number(payment.totalAmount), 0) }));
  const openPayables = settlements.filter(item => item.invoice.recordType === "payable_invoice" && Number(item.invoice.totalAmount) > item.settledAmount);
  const openReceivables = settlements.filter(item => item.invoice.recordType === "receivable_invoice" && Number(item.invoice.totalAmount) > item.settledAmount);
  const payableInvoices = invoices.filter(invoice => invoice.recordType === "payable_invoice");
  const matchedPayables = payableInvoices.filter(invoice => (invoice.data as { threeWayMatch?: { status?: string } }).threeWayMatch?.status === "matched");
  const mismatchedPayables = payableInvoices.filter(invoice => (invoice.data as { threeWayMatch?: { status?: string } }).threeWayMatch?.status === "mismatch");
  const observed: Record<string, ObservedMetric> = {
    open_payable_invoices: { value: openPayables.length, evidence: [{ source: "erp_operational_records payable invoices", recordCount: openPayables.length }, { source: "posted internal payment evidence", recordCount: postedPayments.length }], formula: "Count retained payable invoices where retained invoice total exceeds the sum of linked posted internal payment-evidence records.", detail: "Amounts remain available only per retained invoice currency; no cross-currency total is computed." },
    open_receivable_invoices: { value: openReceivables.length, evidence: [{ source: "erp_operational_records receivable invoices", recordCount: openReceivables.length }, { source: "posted internal payment evidence", recordCount: postedPayments.length }], formula: "Count retained receivable invoices where retained invoice total exceeds the sum of linked posted internal payment-evidence records.", detail: "Amounts remain available only per retained invoice currency; no cross-currency total is computed." },
    posted_internal_payment_evidence: { value: postedPayments.length, evidence: [{ source: "erp_operational_records payment records", recordCount: postedPayments.length }], formula: "Count retained payment-record evidence in posted, fulfilled, or closed internal status.", detail: "Evidence does not represent a bank transfer or external settlement." },
    matched_payables: { value: matchedPayables.length, evidence: [{ source: "retained payable three-way-match snapshots", recordCount: matchedPayables.length }], formula: "Count payable invoices whose retained three-way-match snapshot has status matched.", detail: "A matched internal control does not execute payment or create a financial posting." },
    mismatched_payables: { value: mismatchedPayables.length, evidence: [{ source: "retained payable three-way-match snapshots", recordCount: mismatchedPayables.length }], formula: "Count payable invoices whose retained three-way-match snapshot has status mismatch.", detail: "Mismatch records remain exceptions; no correction is made." },
    purchase_orders: { value: records.filter(record => record.recordType === "purchase_order").length, evidence: [{ source: "erp_operational_records purchase orders", recordCount: records.filter(record => record.recordType === "purchase_order").length }], formula: "Count tenant-scoped retained purchase-order records." },
    sales_orders: { value: records.filter(record => record.recordType === "sales_order").length, evidence: [{ source: "erp_operational_records sales orders", recordCount: records.filter(record => record.recordType === "sales_order").length }], formula: "Count tenant-scoped retained sales-order records." },
    inventory_movements: { value: movements.length, evidence: [{ source: "erp_inventory_movements", recordCount: movements.length }], formula: "Count tenant-scoped retained inventory-movement evidence." },
    inventory_balances: { value: balances.length, evidence: [{ source: "erp_inventory_balances", recordCount: balances.length }], formula: "Count tenant-scoped retained inventory balance snapshots; quantities are not normalized or aggregated across declared units." },
    active_workflow_definitions: { value: workflowDefinitions.filter(definition => definition.status === "active").length, evidence: [{ source: "erp_workflow_definitions", recordCount: workflowDefinitions.length }], formula: "Count retained workflow definitions in active status." },
    pending_workflow_tasks: { value: workflowTasks.filter(task => task.status === "pending").length, evidence: [{ source: "erp_workflow_tasks", recordCount: workflowTasks.length }], formula: "Count retained workflow tasks in pending status." },
    audit_events: { value: auditEvents.length, evidence: [{ source: "erp_audit_events", recordCount: auditEvents.length }], formula: "Count tenant-scoped retained audit events." },
    employee_profiles: { value: employeeProfiles.length, evidence: [{ source: "erp_employee_profiles", recordCount: employeeProfiles.length }], formula: "Count tenant-scoped retained employee profiles; no workforce demographic or retention inference is made." },
    active_projects: { value: projects.filter(project => ["active", "approved"].includes(project.status)).length, evidence: [{ source: "erp_projects", recordCount: projects.length }], formula: "Count retained projects in active or approved status." },
    active_assets: { value: assets.filter(asset => ["active", "in_service"].includes(asset.status)).length, evidence: [{ source: "erp_assets", recordCount: assets.length }], formula: "Count retained assets in active or in-service status; no asset valuation is computed." },
    open_service_requests: { value: serviceRequests.filter(request => !["closed", "cancelled"].includes(request.status)).length, evidence: [{ source: "erp_service_requests", recordCount: serviceRequests.length }], formula: "Count retained service requests that are not closed or cancelled." },
    open_crm_opportunities: { value: opportunities.filter(opportunity => !["won", "lost", "cancelled"].includes(opportunity.stage)).length, evidence: [{ source: "erp_crm_opportunities", recordCount: opportunities.length }], formula: "Count retained CRM opportunities whose stage is not won, lost, or cancelled; this is not qualified pipeline value." },
    active_item_profiles: { value: itemProfiles.filter(profile => profile.status === "active").length, evidence: [{ source: "erp_item_master_profiles", recordCount: itemProfiles.length }], formula: "Count active retained canonical item-master profiles, the identity gate for initial Resource projections." },
  };
  const metrics = metricCatalog.map(definition => {
    const observation = definition.observedKey ? observed[definition.observedKey] : undefined;
    const status = observation ? "observed" as const : definition.preferredStatus;
    const confidence = status === "observed" ? "high" : status === "partially_supported" ? "limited" : "unavailable";
    const missingEvidence = status === "observed" ? [] : definition.requiredEvidence;
    return { ...definition, status, confidence, value: observation?.value ?? null, valueDisplay: observation ? observation.value.toLocaleString() : "Unavailable — evidence not modeled", formula: observation?.formula ?? definition.formula, evidence: observation?.evidence ?? [], missingEvidence, lineage: [{ stage: "metric_definition", detail: `${definition.key} · owner: ${definition.owner}` }, { stage: "formula", detail: observation?.formula ?? definition.formula }, { stage: "evidence", detail: observation ? observation.evidence.map(item => `${item.source} (${item.recordCount})`).join("; ") : missingEvidence.join("; ") }, { stage: "source_contract", detail: observation ? "Tenant-scoped retained evidence queried at request time." : definition.collectionRequirement }], collectionRequirement: definition.collectionRequirement, detail: observation?.detail ?? null, lastEvaluatedAt: new Date().toISOString(), readiness: { formulaModeled: status !== "not_modeled", requiredEvidenceAvailable: status === "observed", safeToCompute: status === "observed", futureAutomationEligible: false, blocked: status !== "observed" } };
  });
  const statusCounts = metrics.reduce<Record<MetricStatus, number>>((counts, metric) => { counts[metric.status] += 1; return counts; }, { observed: 0, partially_supported: 0, blocked: 0, not_modeled: 0 });
  const categorySummaries = (Object.keys(categoryMetadata) as MetricCategory[]).map(category => ({ category, label: categoryMetadata[category].label, question: categoryMetadata[category].question, owner: categoryMetadata[category].owner, totalMetrics: metrics.filter(metric => metric.category === category).length, observedMetrics: metrics.filter(metric => metric.category === category && metric.status === "observed").length, blockedOrUnmodeledMetrics: metrics.filter(metric => metric.category === category && metric.status !== "observed").length, collectionRequirement: categoryMetadata[category].collectionRequirement }));
  return { model: { name: "Enterprise Decision Intelligence Layer", version: "0.1-governed-read-only", posture: "tenant_scoped_metric_catalog_with_observed_and_explicitly_unavailable_evidence", evaluatedAt: new Date().toISOString() }, executiveScorecard: metrics.filter(metric => metric.status === "observed").slice(0, 10), metrics, categorySummaries, summary: { totalMetrics: metrics.length, statusCounts, observedMetricCount: statusCounts.observed, evidenceGapMetricCount: metrics.length - statusCounts.observed, sourceSummary: { operationalRecordCount: records.length, inventoryMovementCount: movements.length, auditEventCount: auditEvents.length, activeSupplierProfileCount: supplierProfiles.filter(profile => profile.status === "active").length } }, boundary: { readOnlyMetricEvaluation: true as const, noMetricPersistence: true as const, noFinancialStatement: true as const, noValuationCalculation: true as const, noPaymentExecution: true as const, noJournalCreated: true as const, noPosting: true as const, noTaxCalculation: true as const, noPayrollCalculation: true as const, noFiling: true as const, noIntegrationTriggered: true as const, noExternalEffect: true as const } };
}
