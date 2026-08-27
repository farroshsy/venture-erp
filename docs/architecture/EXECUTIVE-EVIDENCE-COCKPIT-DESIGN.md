# Executive Evidence Cockpit and Metric Ledger

## Intent

The **Executive Evidence Cockpit** is the analytical presentation layer over Venture ERP’s Enterprise Decision Intelligence catalog. It makes the current tenant’s retained evidence, governed metric definitions, coverage gaps, and attention signals easy to investigate. It is not a market terminal, data warehouse, financial ledger, prediction system, causal engine, recommendation engine, or autonomous decision maker.

> A signal in the cockpit means that the system can point a human toward a retained fact or an explicit data gap. It does not say what decision the human should make, what outcome will occur, or how much value an intervention will create.

## Read-only metric evidence ledger

The cockpit exposes a **response-only metric evidence ledger**. There is one ledger row for every catalog metric in the current response. A row includes the metric key/name, source-code definition version, effective date, evaluation timestamp, availability state, confidence, value or explicit unavailable state, retained source counts, missing evidence, and persistence posture.

| Ledger property | Active behavior | Boundary |
| --- | --- | --- |
| Identity | `MetricLedger:{metricKey}:{evaluatedAt}` identifies an evaluation row in the response. | It is not a persisted ledger entry or financial record. |
| Definition governance | The metric catalog is source-controlled at definition version `0.1` with effective date `2026-08-27`. | A definition revision must create an explicit new version/effective date; it must not silently change the meaning of a prior metric. |
| Source evidence | Observed rows identify retained active-tenant source tables/counts. | A source count does not imply an accounting balance, legal fact, external settlement, or data completeness. |
| Missing evidence | Partial/unmodeled rows retain their stated missing source contract. | Missing evidence stays unavailable; it is never estimated or backfilled. |
| Persistence | Rows are assembled per request and marked `response_only_not_persisted`. | The cockpit does not write metric snapshots, calculation evidence, a financial ledger, or an audit event. |

## Dependency and evidence context

The dependency panel visualizes declared links among a focused set of catalog metrics. Examples include ARR → MRR → active subscriptions → onboarding completion → feature adoption → API latency, and payable exception → inventory movement evidence. The panel helps reviewers understand **input/evidence context** and navigate to an underlying metric definition.

These edges are deliberately not causal claims. The active relationship vocabulary is `requires_modeled_input`, `shared_obligation_evidence_context`, `shared_payable_evidence_context`, and `retained_receipt_evidence_context`. No edge establishes that one metric causes another, predicts a future change, computes sensitivity, or simulates an outcome. Causal models and scenario analysis require separately approved evidence, methods, assumptions, validation, and governance.

## Deterministic priority signals

The attention queue derives a small number of human-review signals from retained, explicit facts. The current rules surface retained payable-match mismatches, retained open payable evidence, pending workflow tasks, and categories with no observed metric evidence. Each signal retains a level, reason, linked metric keys, owner, confidence, a route to investigate, and an explicit statement of what it does **not** estimate or perform.

| Signal | Retained trigger | Human review route | Explicit exclusion |
| --- | --- | --- | --- |
| Payable match exception | One or more retained payable invoice match snapshots have `mismatch` status. | Cash Control / COEB | No automatic correction, payment recommendation, or impact estimate. |
| Open payable evidence | A retained payable total exceeds linked posted internal payment-evidence total. | Cash Control / COEB | No cash forecast, disbursement, bank action, or payment recommendation. |
| Pending human tasks | One or more retained workflow tasks have `pending` status. | Automation Workbench | No approval, rejection, completion, escalation, or unattended execution. |
| Evidence coverage gap | A metric category has no observed retained-evidence computation. | Enterprise Intelligence | No inferred business risk, value loss, or implementation priority. |

## Contextual utilization guidance

`RouteGuide` is a shared, collapsible contextual-help panel rendered beneath every active application route. Its route map covers Portfolio, Workspace Guide, Executive Architecture, Architecture Governance, Architecture Assistant, Access Administration, Module Catalog, Operations, Journal Control, Finance Reporting, Costing, Inventory, Procurement, Sales, People, Delivery & Assets, Service & CRM, Work, Cash, Operational Insights, Enterprise Intelligence, Automation, Asia, Cross-border, Decision Governance, and Architecture.

Each guide gives the page purpose, source evidence to read, safe action/navigation, and active boundary. The **Workspace Guide** exposes the same complete route index so a user can navigate directly to a workspace before interacting with a control. The guide tells users what may be pressed only within the existing role, tenant, status, and period guards; it cannot expand authority.

## Active exclusions

The cockpit and route guides do not create/mutate operational records, Resource/Obligation bridges, metric definitions, metric ledger entries, evidence chains, approvals, tasks, inventory, valuations, COGS, journal proposals, journals, the general ledger, financial statements, cash, payments, tax, payroll, filings, integrations, transmissions, recommendations, or autonomous decisions. They do not claim causality, financial impact, forecast accuracy, statutory compliance, SAP parity, or production accounting authority.

Indonesian payroll remains draft-only, inactive, unreviewed, unselected, and unavailable for payroll calculation, rehearsal, activation, or production until a qualified Indonesian payroll/tax reviewer provides written, effective-dated approval covering source versions, worker scope, cadence, limitations, and intended authorization.
