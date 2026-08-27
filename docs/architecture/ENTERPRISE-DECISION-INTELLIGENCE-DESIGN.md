# Enterprise Decision Intelligence Layer

## Purpose

The **Enterprise Decision Intelligence Layer** turns Venture ERP’s retained operational evidence into a governed metric catalog. It is not a generic dashboard, financial-statement engine, valuation tool, data warehouse, or analytics connector. Each metric is a first-class definition with a stable key, version, effective date, owner, formula statement, required evidence, lineage, readiness state, confidence posture, and a concrete collection requirement when that evidence is missing.

> **No invented performance.** A metric value is displayed only when the metric’s current formula can be evaluated from tenant-scoped retained evidence. Every unavailable metric remains visible with its evidence gap and the next capability required to model it safely.

The initial catalog contains **219 metrics** derived from the supplied company-value, growth, sales, customer-success, product, marketplace, SaaS, finance, engineering, AI, marketing, operations, people, security/compliance, and investor frameworks. The catalog is source-code versioned as `0.1`, with an effective date of `2026-08-27`. A later definition change must introduce a new version/effective date and preserve or explicitly retire the prior definition; it must not silently rewrite historical metric meaning.

## Architecture

```mermaid
flowchart LR
  OP[Operational records and domain evidence] --> CF[Canonical evidence and bridges]
  CF --> MC[Governed metric catalog]
  MC --> EV[Request-time retained-evidence evaluator]
  EV --> LC[Lineage, readiness, confidence, gaps]
  LC --> UI[Enterprise Intelligence workspace]
  UI --> DI[Human decision investigation]
```

The active implementation is a request-time, tenant-scoped read projection. It reads retained operational records, inventory movements and balance snapshots, workflow definitions/tasks, audit events, employee/project/asset/service/CRM records, and canonical item/supplier profiles. It makes no new calculation-evidence record, metric snapshot, workflow, journal, payment, or external call.

| Layer | Active behavior | Deliberately absent |
| --- | --- | --- |
| Metric definition catalog | A static, source-controlled catalog with 219 definitions, explicit owner, version, effective date, formula statement, required evidence, and collection path. | User-written definitions, unreviewed formula edits, automatic activation, and a competing source of truth. |
| Retained-evidence evaluator | Computes 18 safe operational counts from active-venture rows and labels every other definition as partially supported or not modeled. | Estimated values, cross-currency aggregation, unapproved formula inference, historical restatement, scheduled refresh, or persistence. |
| Metric lineage | Shows definition → formula → retained evidence/gap → source-contract step for a selected metric. | Fabricated causal graphs or automated root-cause diagnosis. |
| Executive scorecard | Shows observed operational metrics only and links them to their evidence lineage. | ARR, MRR, gross margin, cash, EBITDA, valuation, tax exposure, or forecasts without separate governed evidence. |
| Data-gap register | Retains every unavailable metric in the UI and gives a category-specific collection requirement. | Third-party collection, telemetry, webhook, scraping, connectors, or background jobs. |

## Metric catalog and availability model

The catalog makes the whole scope visible while separating current fact from planned capability.

| Availability state | Meaning | Current examples |
| --- | --- | --- |
| `observed` | The evaluator has an explicit formula and required active-tenant retained evidence. | Open payable/receivable invoice counts, internal payment-evidence count, three-way-match counts, order counts, inventory movements/balances, workflow/task counts, audit events, and domain record counts. |
| `partially_supported` | Some related operational evidence exists, but the approved source contract or formula prerequisites are incomplete. | Cash balance, financial-health measures, CRM/sales metrics, people/retention measures, and operational efficiency metrics. |
| `blocked` | A metric has a modeled formula but currently fails a required evidence, policy, approval, or authority prerequisite. | Reserved for future governed definitions; the initial catalog does not turn missing data into a false blocking computation. |
| `not_modeled` | The required source model and governed formula do not yet exist. | ARR/MRR, product analytics, SaaS economics, engineering reliability, AI, marketing, marketplace, security, and investor metrics. |

For all availability states, `futureAutomationEligible` is `false`. The initial evaluator does not refresh on a schedule, poll, receive webhooks, or communicate with a third party.

## Current safe calculations

The initial formulas are intentionally narrow. Open invoice metrics count retained payable or receivable invoices whose retained total exceeds the sum of same-tenant linked posted internal-payment-evidence records. The result stays a count; it does not sum currencies or represent a bank balance, collection, disbursement, or cash forecast. Matched/mismatched payable metrics count the retained three-way-match status. Inventory metrics are record/snapshot counts only; they do not normalize or aggregate quantities across base UOM declarations.

| Metric family | Retained sources | Formula boundary |
| --- | --- | --- |
| Invoices and internal payment evidence | `erp_operational_records` invoice/payment rows | Uses explicit `invoiceRecordId` only; counts payment evidence in posted/fulfilled/closed internal status; does not execute or validate an external payment. |
| Payable matching | Retained payable `threeWayMatch` snapshot | Counts retained matched/mismatched snapshots; does not approve, repair, or rerun a match. |
| Orders and inventory | Operational records, `erp_inventory_movements`, `erp_inventory_balances` | Counts records/evidence only; does not calculate inventory turnover, valuation, COGS, or cross-unit quantities. |
| Workflow and audit | Workflow definitions/tasks and audit events | Counts active/pending/retained records only; does not assess SLA, deployment reliability, or control compliance. |
| People, projects, assets, service, CRM | Domain-specific tables | Counts bounded lifecycle records only; does not infer retention, productivity, valuation, health, or demographics. |

## Data collection roadmap

Every unavailable metric has a visible collection path. It is a design requirement, not permission to collect data. Any future connector, telemetry, import, webhook, scheduled refresh, or model-based assessment needs separate authorization, a tenant-scope design, source/consent/privacy review, retention policy, formula version, evidence validation, test coverage, and no-effect boundary review before activation.

| Metric domains | Evidence required before safe computation | Collection capability to implement separately |
| --- | --- | --- |
| Company value, growth, SaaS, finance, investor | Approved recurring-revenue/revenue-recognition, cost, cash-flow, debt, capitalization, and policy evidence with fiscal-period alignment. | Finance-owned effective-dated metric definitions and immutable financial calculation evidence. Financial statements, valuation, and investment interpretation remain separate governed capabilities. |
| Sales and customer success | Lead/opportunity stage history, qualified/close dates, contract/renewal/cancellation evidence, support cases, customer satisfaction, and cohort rules. | CRM/customer-success event contracts and approved cohort/attribution policy; never infer a customer relationship from a document title or amount. |
| Product and AI | Privacy-reviewed user event, session, consent, feature, search, AI request/response, cost, latency, feedback, and human-override evidence. | Product/AI telemetry ingestion with consent, minimization, retention, event-schema versioning, and role-based access; no raw prompt collection by default. |
| Marketing and marketplace | Campaign spend, channel attribution, consented traffic, email, listing/order/participant, fee, fulfillment, and return evidence. | Approved read-only marketing/marketplace source connectors or imports with attribution windows and currency basis stated. |
| Engineering and security | CI/CD, deployment, incident, observability, vulnerability, audit, policy, and infrastructure-cost evidence. | Read-only engineering/security ingestion contracts with asset scope, severity taxonomy, incident-state model, and explicit owner approval. |
| Operations and people | SLA policy, supplier-performance, return, recruiting, training, engagement, voluntary-turnover, and workforce event evidence. | Domain-specific lifecycle fields and policy definitions. People data requires jurisdiction-aware privacy/consent and authorized access design. |

## Governance and boundaries

Metric definitions are owned by a named function and must be interpreted with their version/effective date, time grain, required evidence, and formula. A future persisted metric registry may add finance-owned approval states and immutable calculation snapshots, but it must not break the current source-controlled definition contract or fabricate historical values. A metric marked observed is a **data-availability statement**, not a statement of business success, compliance, accounting correctness, causal proof, prediction, or recommendation.

The layer does **not** create or mutate operational records, balances, Resource/Obligation projections, calculation evidence, journals, the general ledger, financial statements, valuation, COGS, tax, payroll, payments, statutory filings, integrations, external transmissions, or autonomous decisions. Indonesian payroll remains draft-only, inactive, unreviewed, unselected, and unavailable for calculation, rehearsal, activation, or production until a qualified Indonesian payroll/tax reviewer provides written, effective-dated authorization covering sources, scope, cadence, limitations, and intended use.
